import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function ensurePaymentSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(255) PRIMARY KEY,
        customer_name TEXT,
        customer_email TEXT,
        plan_name TEXT,
        plan_slug TEXT,
        amount NUMERIC DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        gateway VARCHAR(50) DEFAULT 'stripe',
        status VARCHAR(50) DEFAULT 'succeeded',
        test_mode BOOLEAN DEFAULT false,
        failure_reason TEXT,
        is_recurring BOOLEAN DEFAULT true,
        recurring_interval VARCHAR(20) DEFAULT 'MONTH',
        auto_renew BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expiry_date TIMESTAMPTZ,
        gateway_transaction_id TEXT,
        confirmed_amount NUMERIC,
        confirmed_at TIMESTAMPTZ
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
        payment_settings JSONB,
        currency VARCHAR(10) DEFAULT 'USD',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn('[Payment API] Schema check warning:', e);
  }
}

// Direct Stripe REST API key verification
async function verifyStripeKeyWithApi(secretKey: string) {
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey.trim()}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return {
        valid: false,
        error: data.error?.message || `Stripe authentication failed with status ${res.status}`
      };
    }
    return { valid: true, livemode: Boolean(data.livemode) };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Unable to connect to Stripe verification endpoint.' };
  }
}

async function persistAdminPaymentSettings(settings: any, currency: string) {
  try {
    await query(
      `INSERT INTO admin_settings (id, payment_settings, currency, updated_at)
       VALUES ('primary_settings', $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         payment_settings = EXCLUDED.payment_settings,
         currency = EXCLUDED.currency,
         updated_at = NOW()`,
      [JSON.stringify(settings), currency]
    );
  } catch (_) {
    await query(
      `UPDATE admin_settings 
       SET payment_settings = $1, currency = $2, updated_at = NOW() 
       WHERE id::text IN ('primary_settings', '1')`,
      [JSON.stringify(settings), currency]
    ).catch(() => {});
  }
}

export async function GET() {
  try {
    await ensurePaymentSchema();

    let txRes = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(async () => {
      return await query(`SELECT * FROM payment_transactions ORDER BY id DESC LIMIT 500`).catch(() => ({ rows: [] }));
    });

    const transactions = Array.isArray(txRes) ? txRes : (txRes?.rows || []);

    let settings = null;
    try {
      const sRes = await query(
        `SELECT payment_settings, currency FROM admin_settings 
         WHERE id::text IN ('primary_settings', '1') 
         ORDER BY updated_at DESC LIMIT 1`
      );
      const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
      if (sRow) {
        settings = typeof sRow.payment_settings === 'string' ? JSON.parse(sRow.payment_settings) : sRow.payment_settings;
        if (sRow.currency && typeof settings === 'object') {
          settings.currency = sRow.currency;
        }
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      transactions,
      settings
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensurePaymentSchema();
    const body = await req.json();

    // 1. Stripe Connect Action - Real Stripe API validation before connecting
    if (body.action === 'connect_stripe') {
      let currentSettings: any = {};
      try {
        const sRes = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id::text IN ('primary_settings', '1') ORDER BY updated_at DESC LIMIT 1`);
        const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
        if (sRow?.payment_settings) {
          currentSettings = typeof sRow.payment_settings === 'string' ? JSON.parse(sRow.payment_settings) : sRow.payment_settings;
        }
      } catch (_) {}

      const secretKey = String(body.secretKey || body.stripe?.secretKey || currentSettings?.stripe?.secretKey || '').trim();
      const publishableKey = String(body.publishableKey || body.stripe?.publishableKey || currentSettings?.stripe?.publishableKey || '').trim();
      const webhookSecret = String(body.webhookSecret || body.stripe?.webhookSecret || currentSettings?.stripe?.webhookSecret || '').trim();
      const testMode = body.testMode !== undefined ? Boolean(body.testMode) : Boolean(currentSettings?.testMode);

      if (!secretKey) {
        return NextResponse.json({ success: false, error: 'Stripe Secret Key is required to connect.' }, { status: 400 });
      }

      // Format validation against active environment
      if (testMode && !secretKey.startsWith('sk_test_') && !secretKey.startsWith('rk_test_')) {
        return NextResponse.json({
          success: false,
          error: 'Test Mode is active, but your Secret Key does not start with "sk_test_". Test transactions will fail.'
        }, { status: 400 });
      }

      if (!testMode && (secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_'))) {
        return NextResponse.json({
          success: false,
          error: 'Live Production mode is active, but your Secret Key is a test key ("sk_test_..."). Real charges will fail.'
        }, { status: 400 });
      }

      // Live Stripe verification
      const verifyRes = await verifyStripeKeyWithApi(secretKey);
      if (!verifyRes.valid) {
        return NextResponse.json({
          success: false,
          error: `Stripe API Key Verification Failed: ${verifyRes.error}`
        }, { status: 400 });
      }

      const updatedSettings = {
        ...currentSettings,
        activeGateway: currentSettings?.activeGateway || 'stripe',
        stripeConnected: true,
        testMode,
        stripe: {
          ...(currentSettings?.stripe || {}),
          enabled: true,
          publishableKey,
          secretKey,
          webhookSecret,
        }
      };

      await persistAdminPaymentSettings(updatedSettings, currentSettings?.currency || 'USD');

      return NextResponse.json({
        success: true,
        stripeConnected: true,
        settings: updatedSettings,
        message: `Stripe verified and connected successfully with Stripe API (${verifyRes.livemode ? 'Live' : 'Test Mode'})!`
      });
    }

    // 2. Stripe Verify Keys Diagnostic Action
    if (body.action === 'verify_stripe_keys') {
      const secretKey = String(body.secretKey || '').trim();
      const testMode = Boolean(body.testMode);

      if (!secretKey) {
        return NextResponse.json({ success: false, error: 'Secret Key is empty.' }, { status: 400 });
      }

      if (testMode && !secretKey.startsWith('sk_test_') && !secretKey.startsWith('rk_test_')) {
        return NextResponse.json({
          success: false,
          error: 'Key format warning: Sandbox Test Mode is active, but the key does not start with "sk_test_".'
        }, { status: 400 });
      }

      if (!testMode && (secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_'))) {
        return NextResponse.json({
          success: false,
          error: 'Key format warning: Live Mode is active, but the key is a test key ("sk_test_...").'
        }, { status: 400 });
      }

      const verifyRes = await verifyStripeKeyWithApi(secretKey);
      if (!verifyRes.valid) {
        return NextResponse.json({
          success: false,
          error: `Stripe API Verification Failed: ${verifyRes.error}`
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Stripe API verified successfully with Stripe servers! (${verifyRes.livemode ? 'Live Production Mode' : 'Sandbox Test Mode'})`
      });
    }

    // 3. Stripe Disconnect Action
    if (body.action === 'disconnect_stripe') {
      let currentSettings: any = {};
      try {
        const sRes = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id::text IN ('primary_settings', '1') ORDER BY updated_at DESC LIMIT 1`);
        const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
        if (sRow?.payment_settings) {
          currentSettings = typeof sRow.payment_settings === 'string' ? JSON.parse(sRow.payment_settings) : sRow.payment_settings;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        stripeConnected: false,
        stripe: {
          ...(currentSettings?.stripe || {}),
          enabled: false
        }
      };

      await persistAdminPaymentSettings(updatedSettings, currentSettings?.currency || 'USD');

      return NextResponse.json({
        success: true,
        stripeConnected: false,
        settings: updatedSettings,
        message: 'Stripe account disconnected successfully.'
      });
    }

    // 4. Toggle Test Mode Action
    if (body.action === 'toggle_test_mode') {
      let currentSettings: any = {};
      try {
        const sRes = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id::text IN ('primary_settings', '1') ORDER BY updated_at DESC LIMIT 1`);
        const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
        if (sRow?.payment_settings) {
          currentSettings = typeof sRow.payment_settings === 'string' ? JSON.parse(sRow.payment_settings) : sRow.payment_settings;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        testMode: Boolean(body.testMode)
      };

      await persistAdminPaymentSettings(updatedSettings, currentSettings?.currency || 'USD');
      return NextResponse.json({ success: true, message: 'Test mode updated in PostgreSQL', testMode: updatedSettings.testMode });
    }

    // 5. Add Transaction
    if (body.action === 'add_transaction') {
      const tx = body.transaction;
      if (!tx) {
        return NextResponse.json({ success: false, error: 'Transaction object required' }, { status: 400 });
      }

      const txId = String(tx.id || ('tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)));
      const customerName = String(tx.customerName || 'Customer');
      const customerEmail = String(tx.customerEmail || '').toLowerCase().trim();
      const planName = String(tx.planName || 'Plan');
      const planSlug = String(tx.planSlug || 'taster');
      const amount = Number(tx.amount || 0);
      const currency = String(tx.currency || 'USD');
      const gateway = String(tx.gateway || 'stripe');
      const status = String(tx.status || 'succeeded').toLowerCase();
      const testMode = Boolean(tx.testMode);
      const failureReason = tx.failureReason || null;
      const isRecurring = tx.isRecurring !== undefined ? Boolean(tx.isRecurring) : true;
      const recurringInterval = String(tx.recurringInterval || 'MONTH');
      const autoRenew = tx.autoRenew !== undefined ? Boolean(tx.autoRenew) : true;
      const createdAt = tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString();
      const expiryDate = tx.expiryDate ? new Date(tx.expiryDate).toISOString() : null;
      const gatewayTxId = tx.gatewayTransactionId ? String(tx.gatewayTransactionId).trim() : null;
      const confirmedAmount = tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : (status === 'succeeded' ? amount : null);
      const confirmedAt = tx.confirmedAt ? new Date(tx.confirmedAt).toISOString() : (status === 'succeeded' ? new Date().toISOString() : null);

      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, test_mode, failure_reason,
          is_recurring, recurring_interval, auto_renew, created_at,
          expiry_date, gateway_transaction_id, confirmed_amount, confirmed_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          plan_name = EXCLUDED.plan_name,
          plan_slug = EXCLUDED.plan_slug,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          gateway = EXCLUDED.gateway,
          status = EXCLUDED.status,
          failure_reason = EXCLUDED.failure_reason,
          is_recurring = EXCLUDED.is_recurring,
          recurring_interval = EXCLUDED.recurring_interval,
          auto_renew = EXCLUDED.auto_renew,
          created_at = EXCLUDED.created_at,
          expiry_date = EXCLUDED.expiry_date,
          gateway_transaction_id = EXCLUDED.gateway_transaction_id,
          confirmed_amount = EXCLUDED.confirmed_amount,
          confirmed_at = EXCLUDED.confirmed_at,
          updated_at = NOW()`,
        [
          txId, customerName, customerEmail, planName, planSlug,
          amount, currency, gateway, status, testMode, failureReason,
          isRecurring, recurringInterval, autoRenew, createdAt,
          expiryDate, gatewayTxId, confirmedAmount, confirmedAt
        ]
      );

      return NextResponse.json({ success: true, message: 'Transaction recorded successfully', transaction: tx });
    }

    // 6. Update Transaction
    if (body.action === 'update_transaction') {
      const tx = body.transaction;
      if (!tx || !tx.id) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      await query(
        `UPDATE payment_transactions 
         SET customer_name = $1, customer_email = $2, plan_name = $3, plan_slug = $4,
             amount = $5, currency = $6, gateway = $7, status = $8, failure_reason = $9,
             is_recurring = $10, recurring_interval = $11, auto_renew = $12, created_at = $13,
             expiry_date = $14, gateway_transaction_id = $15, confirmed_amount = $16,
             confirmed_at = $17, updated_at = NOW()
         WHERE id = $18`,
        [
          tx.customerName,
          (tx.customerEmail || '').toLowerCase().trim(),
          tx.planName,
          tx.planSlug,
          Number(tx.amount || 0),
          tx.currency,
          tx.gateway,
          tx.status,
          tx.failureReason || null,
          Boolean(tx.isRecurring),
          tx.recurringInterval || 'MONTH',
          Boolean(tx.autoRenew),
          tx.createdAt,
          tx.expiryDate || null,
          tx.gatewayTransactionId || null,
          tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : null,
          tx.confirmedAt || null,
          tx.id
        ]
      );

      return NextResponse.json({ success: true, message: 'Transaction updated', transaction: tx });
    }

    // 7. Refund / Cancel / Confirm
    if (body.action === 'refund_transaction' || body.action === 'cancel_transaction' || body.action === 'confirm_payment') {
      const tx = body.transaction || {};
      const txId = body.id || tx.id;
      if (!txId) {
        return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
      }

      await query(
        `UPDATE payment_transactions 
         SET status = $1, is_recurring = $2, auto_renew = $3, expiry_date = $4,
             confirmed_amount = $5, confirmed_at = $6, gateway_transaction_id = $7, updated_at = NOW()
         WHERE id = $8`,
        [
          tx.status,
          Boolean(tx.isRecurring),
          Boolean(tx.autoRenew),
          tx.expiryDate || null,
          tx.confirmedAmount !== undefined ? Number(tx.confirmedAmount) : null,
          tx.confirmedAt || null,
          tx.gatewayTransactionId || null,
          txId
        ]
      );

      return NextResponse.json({ 
        success: true, 
        message: body.action === 'refund_transaction' ? 'Transaction refunded' : body.action === 'cancel_transaction' ? 'Transaction cancelled' : 'Payment confirmed',
        transaction: tx 
      });
    }

    // 8. Save Full Gateway Settings into admin_settings
    const gatewayConfig = body.paymentSettings || body;
    const currency = gatewayConfig.currency || body.currency || 'USD';
    await persistAdminPaymentSettings(gatewayConfig, currency);

    return NextResponse.json({ success: true, message: 'Gateway settings saved to PostgreSQL' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensurePaymentSchema();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      await query(`DELETE FROM payment_transactions WHERE id = $1`, [id]);
      return NextResponse.json({ success: true, message: 'Transaction deleted' });
    }

    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await query(`DELETE FROM payment_transactions WHERE id = ANY($1::text[])`, [body.ids]);
      return NextResponse.json({ success: true, message: `${body.ids.length} transactions deleted` });
    }

    return NextResponse.json({ success: false, error: 'Transaction ID(s) required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
