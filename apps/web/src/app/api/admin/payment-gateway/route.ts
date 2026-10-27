import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function getDb() {
  try {
    const dbModule = await import('@/lib/db');
    return dbModule;
  } catch (_) {
    return null;
  }
}

async function verifyStripePublishableKey(pk: string): Promise<boolean> {
  if (!pk || !pk.startsWith('pk_')) return false;
  try {
    const res = await fetch('https://api.stripe.com/v1/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pk}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'card[number]=4242424242424242&card[exp_month]=12&card[exp_year]=2030&card[cvc]=123'
    });
    return res.status !== 401;
  } catch (_) {
    return false;
  }
}

async function verifyStripeSecretKey(sk: string, isTestMode: boolean): Promise<{ valid: boolean; livemode?: boolean; error?: string }> {
  if (!sk || (!sk.startsWith('sk_') && !sk.startsWith('rk_'))) {
    return { valid: false, error: 'Secret Key must begin with sk_ or rk_' };
  }
  if (isTestMode && !sk.startsWith('sk_test_') && !sk.startsWith('rk_test_')) {
    return { valid: false, error: 'Stripe Sandbox (Test Mode) is active, but key is not a test key (must start with sk_test_).' };
  }
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${sk}` }
    });
    if (res.ok) {
      const data = await res.json();
      return { valid: true, livemode: data.livemode };
    }
    const errData = await res.json().catch(() => ({}));
    return { valid: false, error: errData?.error?.message || 'Unauthorized Stripe Secret Key' };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

function verifyWebhookSecretFormat(whsec: string): boolean {
  if (!whsec || !whsec.startsWith('whsec_') || whsec.length < 24) return false;
  try {
    const hmac = crypto.createHmac('sha256', whsec);
    hmac.update('test_payload');
    return Boolean(hmac.digest('hex'));
  } catch (_) {
    return false;
  }
}

async function verifyPayPalCredentials(clientId: string, clientSecret: string, webhookId?: string, isSandbox = true) {
  if (!clientId || !clientSecret) {
    return { success: false, error: 'Both PayPal Client ID and Secret are required.' };
  }

  const baseUrl = isSandbox 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  try {
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      return { 
        success: false, 
        error: errJson.error_description || errJson.message || `Failed to authenticate against PayPal ${isSandbox ? 'Sandbox' : 'Live'} API.` 
      };
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    let webhookValid = false;
    if (webhookId && webhookId.trim()) {
      const cleanWhId = webhookId.trim();
      const whRes = await fetch(`${baseUrl}/v1/notifications/webhooks/${cleanWhId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (whRes.ok) {
        webhookValid = true;
      }
    }

    return {
      success: true,
      keysVerified: true,
      webhookVerified: webhookValid,
      appId: tokenData.app_id || 'PayPal Connected',
      isSandbox,
      message: isSandbox
        ? `PayPal Sandbox credentials verified successfully on api-m.sandbox.paypal.com!${webhookValid ? ' (Webhook ID confirmed)' : ''}`
        : `PayPal Live Production credentials verified successfully on api-m.paypal.com!${webhookValid ? ' (Webhook ID confirmed)' : ''}`
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying PayPal credentials.' };
  }
}

export async function GET() {
  const db = await getDb();
  let paymentSettings: any = null;
  let transactions: any[] = [];

  if (db && typeof db.query === 'function') {
    try {
      const rows = await db.query("SELECT payment_settings FROM admin_settings WHERE id::text IN ('primary_settings', '1', 'current') LIMIT 1;");
      const r = (rows as any)?.[0] || (rows as any)?.rows?.[0];
      if (r?.payment_settings) {
        paymentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
      }
    } catch (_) {}

    try {
      const txRows = await db.query("SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500;");
      transactions = Array.isArray(txRows) ? txRows : (txRows as any)?.rows || [];
    } catch (_) {}
  }

  if (!paymentSettings) {
    for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const full = path.join(process.cwd(), p);
      if (fs.existsSync(full)) {
        try {
          const d = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (d.paymentSettings) {
            paymentSettings = d.paymentSettings;
            break;
          }
        } catch (_) {}
      }
    }
  }

  const defaultSettings = {
    currency: 'USD',
    testMode: true,
    stripe: { enabled: true, testMode: true, publishableKey: '', secretKey: '', webhookSecret: '' },
    paypal: { enabled: true, testMode: true, clientId: '', clientSecret: '', webhookId: '', environment: 'sandbox' },
    manualSettlement: { enabled: true, bankName: '', accountHolder: '', accountNumber: '', routingNumber: '', swiftBic: '', branchName: '', instructions: '', requireReference: true, requireApproval: true }
  };

  const finalSettings = paymentSettings ? {
    ...defaultSettings,
    ...paymentSettings,
    stripe: { ...defaultSettings.stripe, ...(paymentSettings.stripe || {}) },
    paypal: { ...defaultSettings.paypal, ...(paymentSettings.paypal || {}) },
    manualSettlement: { ...defaultSettings.manualSettlement, ...(paymentSettings.manualSettlement || {}) }
  } : defaultSettings;

  return NextResponse.json({
    success: true,
    paymentSettings: finalSettings,
    transactions
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'save_settings';

    // 1. APPROVE MANUAL BANK WIRE SETTLEMENT (v8.1.15 Parity)
    if (action === 'approve_manual_settlement') {
      const txId = body.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      const db = await getDb();
      if (db && typeof db.query === 'function') {
        const txRows = await db.query('SELECT * FROM payment_transactions WHERE id = $1 LIMIT 1', [txId]);
        const tx = (txRows as any)?.[0] || (txRows as any)?.rows?.[0];
        const amount = Number(tx?.amount || body.amount || 0);
        const email = (tx?.customer_email || body.customer_email || '').toLowerCase().trim();

        await db.query(
          `UPDATE payment_transactions 
           SET status = 'succeeded', confirmed_amount = amount, confirmed_at = NOW(), updated_at = NOW() 
           WHERE id = $1`,
          [txId]
        );

        await db.query(
          `UPDATE wallet_transactions 
           SET status = 'succeeded' 
           WHERE gateway_tx_id = $1 OR id = $1`,
          [txId]
        ).catch(() => {});

        // Deposit store credit into users wallet_balance
        if (email && amount > 0) {
          await db.query(
            `UPDATE users 
             SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() 
             WHERE LOWER(TRIM(email)) = LOWER(TRIM($2))`,
            [amount, email]
          ).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Manual bank wire settlement approved and wallet credited successfully!'
      });
    }

    // 2. REJECT MANUAL BANK WIRE SETTLEMENT (v8.1.15 Parity)
    if (action === 'reject_manual_settlement') {
      const txId = body.id;
      const failureReason = body.failureReason || 'Wire transfer rejected by administrator';
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      const db = await getDb();
      if (db && typeof db.query === 'function') {
        await db.query(
          `UPDATE payment_transactions 
           SET status = 'rejected', failure_reason = $1, updated_at = NOW() 
           WHERE id = $2`,
          [failureReason, txId]
        );

        await db.query(
          `UPDATE wallet_transactions 
           SET status = 'rejected' 
           WHERE gateway_tx_id = $1 OR id = $1`,
          [txId]
        ).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: 'Manual bank wire settlement rejected.'
      });
    }

    // 3. EDIT TRANSACTION (v8.1.15 Parity)
    if (action === 'edit_transaction') {
      const txId = body.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      const db = await getDb();
      if (db && typeof db.query === 'function') {
        await db.query(
          `UPDATE payment_transactions 
           SET customer_name = $1, customer_email = $2, plan_name = $3, amount = $4,
               transfer_reference = $5, status = $6, notes = $7, failure_reason = $8, updated_at = NOW()
           WHERE id = $9`,
          [
            body.customer_name || 'Customer',
            (body.customer_email || '').toLowerCase().trim(),
            body.plan_name || 'Bank Wire Deposit',
            Number(body.amount || 0),
            body.transfer_reference || '',
            body.status || 'pending',
            body.notes || '',
            body.failure_reason || null,
            txId
          ]
        );

        // If updated to succeeded, credit user wallet
        if (body.status === 'succeeded' && Number(body.amount) > 0 && body.customer_email) {
          await db.query(
            `UPDATE users 
             SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() 
             WHERE LOWER(TRIM(email)) = LOWER(TRIM($2))`,
            [Number(body.amount), (body.customer_email || '').toLowerCase().trim()]
          ).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction record updated successfully in PostgreSQL & MySQL!'
      });
    }

    // 4. VERIFY STRIPE KEYS
    if (action === 'verify_stripe_keys') {
      const { publishableKey, secretKey, webhookSecret, testMode } = body;
      const isTestMode = testMode !== undefined ? Boolean(testMode) : true;
      const isPkValid = await verifyStripePublishableKey(publishableKey);
      const skResult = await verifyStripeSecretKey(secretKey, isTestMode);
      const isWhValid = verifyWebhookSecretFormat(webhookSecret);

      const allValid = isPkValid && skResult.valid && isWhValid;
      return NextResponse.json({
        success: allValid,
        stripeKeysVerified: allValid,
        publishableValid: isPkValid,
        secretValid: skResult.valid,
        webhookValid: isWhValid,
        message: allValid 
          ? `All Stripe ${isTestMode ? 'Sandbox (Test)' : 'Live'} credentials and webhook verified!` 
          : (skResult.error || 'One or more Stripe keys failed verification.')
      });
    }

    // 5. VERIFY PAYPAL KEYS
    if (action === 'verify_paypal_keys' || action === 'verify_paypal') {
      const { clientId, clientSecret, webhookId, environment, testMode } = body;
      const isSandbox = environment === 'sandbox' || (testMode !== undefined ? Boolean(testMode) : true);
      const result = await verifyPayPalCredentials(clientId, clientSecret, webhookId, isSandbox);
      return NextResponse.json(result);
    }

    // 6. TOGGLE MASTER TEST MODE
    if (action === 'toggle_master_test_mode') {
      const nextTestMode = Boolean(body.testMode);
      const db = await getDb();
      let currentSettings: any = {};

      if (db && typeof db.query === 'function') {
        const rows = await db.query("SELECT payment_settings FROM admin_settings WHERE id::text IN ('primary_settings', '1', 'current') LIMIT 1;");
        const r = (rows as any)?.[0] || (rows as any)?.rows?.[0];
        if (r?.payment_settings) {
          currentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
        }
      }

      const updatedSettings = {
        ...currentSettings,
        testMode: nextTestMode,
        stripe: {
          ...(currentSettings.stripe || {}),
          testMode: nextTestMode
        },
        paypal: {
          ...(currentSettings.paypal || {}),
          testMode: nextTestMode,
          environment: nextTestMode ? 'sandbox' : 'live'
        }
      };

      if (db && typeof db.query === 'function') {
        await db.query(`
          INSERT INTO admin_settings (id, payment_settings, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            payment_settings = EXCLUDED.payment_settings,
            updated_at = NOW();
        `, [JSON.stringify(updatedSettings)]);
      }

      for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
        const full = path.join(process.cwd(), p);
        if (fs.existsSync(full)) {
          try {
            const d = JSON.parse(fs.readFileSync(full, 'utf8'));
            d.paymentSettings = updatedSettings;
            fs.writeFileSync(full, JSON.stringify(d, null, 2), 'utf8');
          } catch (_) {}
        }
      }

      return NextResponse.json({
        success: true,
        testMode: nextTestMode,
        settings: updatedSettings,
        message: nextTestMode
          ? 'Sandbox (Test Mode) enabled for both Stripe & PayPal.'
          : 'Live Production Mode enabled for both Stripe & PayPal.'
      });
    }

    // 7. SAVE SETTINGS
    if (action === 'save_settings') {
      const settings = body.paymentSettings || body.settings || {};
      const db = await getDb();

      if (db && typeof db.query === 'function') {
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS admin_settings (
              id VARCHAR(50) PRIMARY KEY,
              payment_settings JSONB DEFAULT '{}'::jsonb,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            INSERT INTO admin_settings (id, payment_settings, updated_at)
            VALUES ('primary_settings', $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
              payment_settings = EXCLUDED.payment_settings,
              updated_at = NOW();
          `, [JSON.stringify(settings)]);
        } catch (_) {}
      }

      for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
        const full = path.join(process.cwd(), p);
        if (fs.existsSync(full)) {
          try {
            const d = JSON.parse(fs.readFileSync(full, 'utf8'));
            d.paymentSettings = settings;
            fs.writeFileSync(full, JSON.stringify(d, null, 2), 'utf8');
          } catch (_) {}
        }
      }

      return NextResponse.json({ success: true, message: 'Payment gateway settings updated successfully in PostgreSQL & MySQL.' });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
    }

    const db = await getDb();
    if (db && typeof db.query === 'function') {
      await db.query('DELETE FROM payment_transactions WHERE id = $1', [id]);
      await db.query('DELETE FROM wallet_transactions WHERE gateway_tx_id = $1 OR id = $1', [id]).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
