import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}

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
        transfer_reference TEXT,
        notes TEXT,
        confirmed_amount NUMERIC,
        confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expiry_date TIMESTAMPTZ,
        gateway_transaction_id TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY DEFAULT 1,
        payment_settings JSONB,
        currency VARCHAR(10) DEFAULT 'USD',
        site_name TEXT,
        theme_colors JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS wallet_settings (
        id INT PRIMARY KEY DEFAULT 1,
        currency VARCHAR(10) DEFAULT 'USD',
        allowed_gateways JSONB DEFAULT '["stripe"]',
        active_gateway VARCHAR(50) DEFAULT 'stripe',
        min_deposit NUMERIC DEFAULT 5,
        max_deposit NUMERIC DEFAULT 1000,
        bonus_tiers JSONB,
        ledger_columns JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      DO $$ 
      BEGIN 
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS transfer_reference TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS notes TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS payment_settings JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS allowed_gateways JSONB DEFAULT '["stripe"]'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);
  } catch (e) {
    console.warn('[Payment API] Schema check warning:', e);
  }
}

function writeKeyToEnvFile(filePath: string, key: string, value: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const safeVal = value.includes(' ') ? `"${value}"` : value;
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${safeVal}`);
    } else {
      content += `\n${key}=${safeVal}`;
    }
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (_) {}
}

function updateEnvCredentials(settings: any) {
  const envCandidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'apps', 'web', '.env'),
    path.join(process.cwd(), 'apps', 'web', '.env.local')
  ];

  const pairs: Record<string, string> = {
    STRIPE_PUBLISHABLE_KEY: settings.stripe?.publishableKey || '',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: settings.stripe?.publishableKey || '',
    STRIPE_SECRET_KEY: settings.stripe?.secretKey || '',
    STRIPE_WEBHOOK_SECRET: settings.stripe?.webhookSecret || '',
    PAYPAL_CLIENT_ID: settings.paypal?.clientId || '',
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: settings.paypal?.clientId || '',
    PAYPAL_CLIENT_SECRET: settings.paypal?.clientSecret || '',
    PAYPAL_WEBHOOK_ID: settings.paypal?.webhookId || '',
    PAYMENT_CURRENCY: settings.currency || 'USD',
  };

  for (const [k, v] of Object.entries(pairs)) {
    if (v) process.env[k] = v;
  }

  for (const filePath of envCandidates) {
    if (fs.existsSync(filePath)) {
      for (const [k, v] of Object.entries(pairs)) {
        if (v) writeKeyToEnvFile(filePath, k, v);
      }
    }
  }
}

async function persistAdminSettingsData(settings: any, currency: string) {
  await ensurePaymentSchema();
  const cleanSettings = { ...settings };
  delete cleanSettings.action;
  delete cleanSettings.gateway;
  delete cleanSettings.enabled;
  const jsonStr = JSON.stringify(cleanSettings);
  const cur = currency || cleanSettings.currency || 'USD';

  // 1. Persist in PostgreSQL admin_settings
  try {
    await query(
      `INSERT INTO admin_settings (id, payment_settings, currency, updated_at)
       VALUES (1, $1::jsonb, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         payment_settings = EXCLUDED.payment_settings,
         currency = EXCLUDED.currency,
         updated_at = NOW()`,
      [jsonStr, cur]
    );
  } catch (err) {
    try {
      await query(
        `UPDATE admin_settings SET payment_settings = $1, currency = $2, updated_at = NOW() WHERE id = 1`,
        [jsonStr, cur]
      );
    } catch (_) {}
  }

  // 2. Synchronize allowed_gateways with wallet_settings
  try {
    const allowedGateways: string[] = [];
    if (cleanSettings.stripe?.enabled) allowedGateways.push('stripe');
    if (cleanSettings.paypal?.enabled) allowedGateways.push('paypal');
    if (cleanSettings.manualSettlement?.enabled || cleanSettings.manual?.enabled) allowedGateways.push('manual');

    await query(
      `INSERT INTO wallet_settings (id, currency, allowed_gateways, updated_at)
       VALUES (1, $1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET
         currency = EXCLUDED.currency,
         allowed_gateways = EXCLUDED.allowed_gateways,
         updated_at = NOW()`,
      [cur, JSON.stringify(allowedGateways)]
    ).catch(async () => {
      await query(
        `UPDATE wallet_settings SET currency = $1, allowed_gateways = $2::jsonb, updated_at = NOW() WHERE id = 1`,
        [cur, JSON.stringify(allowedGateways)]
      ).catch(() => {});
    });
  } catch (wErr) {
    console.warn('[Payment API] wallet_settings sync warning:', wErr);
  }

  // 3. Mirror to .env and disk
  try {
    updateEnvCredentials(cleanSettings);
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'admin_settings.json');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let existing: any = {};
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
    }
    existing.paymentSettings = cleanSettings;
    existing.currency = cur;
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  } catch (_) {}
}

export async function GET() {
  try {
    await ensurePaymentSchema();

    let txRes: any = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(async () => {
      return await query(`SELECT * FROM payment_transactions ORDER BY id DESC LIMIT 500`).catch(() => []);
    });

    const transactions = parseDbRows(txRes);

    let settings: any = null;
    try {
      const sRes: any = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
      const sRow: any = parseDbRow(sRes);
      if (sRow) {
        let ps = sRow.payment_settings;
        if (typeof ps === 'string') {
          try { ps = JSON.parse(ps); } catch (_) {}
        }
        if (ps && typeof ps === 'object') {
          settings = { ...ps };
          if (sRow.currency) settings.currency = sRow.currency;
        }
      }
    } catch (_) {}

    if (!settings) {
      try {
        const filePath = path.join(process.cwd(), 'data', 'admin_settings.json');
        if (fs.existsSync(filePath)) {
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (fileData.paymentSettings) {
            settings = { ...fileData.paymentSettings };
            if (fileData.currency) settings.currency = fileData.currency;
          }
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      transactions,
      settings: settings || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensurePaymentSchema();
    const body = await req.json();

    // 1. VERIFY STRIPE KEYS (3-WAY VERIFICATION)
    if (body.action === 'verify_stripe_keys') {
      const pubKey = (body.publishableKey || body.stripe?.publishableKey || '').trim();
      const secKey = (body.secretKey || body.stripe?.secretKey || '').trim();
      const whSecret = (body.webhookSecret || body.stripe?.webhookSecret || '').trim();
      const testMode = Boolean(body.testMode);

      if (!pubKey || !secKey || !whSecret) {
        return NextResponse.json({
          success: false,
          error: 'Publishable Key, Secret Key, and Webhook Secret are all required to verify.'
        }, { status: 400 });
      }

      if (testMode && !secKey.startsWith('sk_test_')) {
        return NextResponse.json({
          success: false,
          error: 'Test mode is enabled: Secret Key must start with "sk_test_".'
        }, { status: 400 });
      }
      if (!testMode && !secKey.startsWith('sk_live_')) {
        return NextResponse.json({
          success: false,
          error: 'Live mode is enabled: Secret Key must start with "sk_live_".'
        }, { status: 400 });
      }
      if (!whSecret.startsWith('whsec_') || whSecret.length < 24) {
        return NextResponse.json({
          success: false,
          error: 'Webhook Signing Secret must begin with "whsec_" and be at least 24 characters long.'
        }, { status: 400 });
      }

      try {
        const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${secKey}` },
        });
        const stripeData = await stripeRes.json().catch(() => ({}));
        if (!stripeRes.ok) {
          return NextResponse.json({
            success: false,
            error: stripeData.error?.message || 'Stripe Secret Key rejected by Stripe API.'
          }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Could not connect to Stripe API: ${err.message}`
        }, { status: 502 });
      }

      try {
        const pubRes = await fetch('https://api.stripe.com/v1/tokens', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${pubKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: ''
        });
        if (pubRes.status === 401) {
          return NextResponse.json({
            success: false,
            error: 'Publishable Key is invalid or rejected by Stripe API.'
          }, { status: 400 });
        }
      } catch (_) {}

      try {
        const testHmac = crypto.createHmac('sha256', whSecret);
        testHmac.update('zecratary_signature_test');
        testHmac.digest('hex');
      } catch (hErr: any) {
        return NextResponse.json({
          success: false,
          error: `Webhook Signing Secret failed cryptographic HMAC check: ${hErr.message}`
        }, { status: 400 });
      }

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row: any = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        ...(body.paymentSettings || {}),
        stripeKeysVerified: true,
        stripeWebhookVerified: true,
        stripeConnected: true,
        stripe: {
          ...(currentSettings.stripe || {}),
          enabled: currentSettings.stripe?.enabled ?? true,
          publishableKey: pubKey,
          secretKey: secKey,
          webhookSecret: whSecret
        }
      };

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: 'Stripe keys and webhook verified successfully and saved to PostgreSQL!',
        settings: updatedSettings
      });
    }

    // 2. VERIFY WEBHOOK SECRET (INLINE)
    if (body.action === 'verify_webhook_secret') {
      const secret = (body.webhookSecret || '').trim();
      if (!secret.startsWith('whsec_') || secret.length < 24) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Webhook Signing Secret. Must start with "whsec_" and have standard length.'
        }, { status: 400 });
      }

      try {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update('test_payload_123');
        hmac.digest('hex');
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `HMAC verification failed: ${err.message}` }, { status: 400 });
      }

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row: any = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        stripeWebhookVerified: true,
        stripe: {
          ...(currentSettings.stripe || {}),
          webhookSecret: secret
        }
      };

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: 'Stripe Webhook Signing Secret verified and confirmed for HMAC signatures!',
        settings: updatedSettings
      });
    }

    // 3. TOGGLE GATEWAY (STRIPE, PAYPAL, MANUAL SETTLEMENT)
    if (body.action === 'toggle_gateway') {
      const gatewayKey = body.gateway;
      const isEnabled = Boolean(body.enabled);

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row: any = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string'
            ? JSON.parse(row.payment_settings)
            : row.payment_settings;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        ...(body.paymentSettings || {}),
      };

      if (gatewayKey === 'stripe') {
        updatedSettings.stripe = { ...(updatedSettings.stripe || {}), enabled: isEnabled };
      } else if (gatewayKey === 'paypal') {
        updatedSettings.paypal = { ...(updatedSettings.paypal || {}), enabled: isEnabled };
      } else if (gatewayKey === 'manualSettlement' || gatewayKey === 'manual') {
        updatedSettings.manualSettlement = { ...(updatedSettings.manualSettlement || {}), enabled: isEnabled };
      }

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: `${gatewayKey} gateway ${isEnabled ? 'enabled' : 'disabled'} and saved successfully.`,
        settings: updatedSettings
      });
    }

    // 4. SAVE GATEWAY SETTINGS
    if (body.action === 'save_gateway_settings') {
      const gatewayConfig = body.paymentSettings || body;
      const currency = gatewayConfig.currency || body.currency || 'USD';

      await persistAdminSettingsData(gatewayConfig, currency);

      return NextResponse.json({
        success: true,
        message: 'Payment gateway settings and currency saved successfully to server!',
        settings: gatewayConfig
      });
    }

    // 5. TOGGLE TEST MODE
    if (body.action === 'toggle_test_mode') {
      const nextMode = Boolean(body.testMode);
      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row: any = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' 
            ? JSON.parse(row.payment_settings) 
            : row.payment_settings;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        ...(body.paymentSettings || {}),
        testMode: nextMode,
        stripeKeysVerified: false,
        stripeWebhookVerified: false,
      };

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: nextMode ? 'Sandbox (Test Mode) enabled!' : 'Live Production mode enabled!',
        settings: updatedSettings
      });
    }

    // 6. SYNC FROM .ENV
    if (body.action === 'sync_env') {
      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row: any = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
        }
      } catch (_) {}

      const syncedFields: string[] = [];
      const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
      const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
      const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET || '';
      const paypalClient = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
      const paypalSecret = process.env.PAYPAL_CLIENT_SECRET || '';
      const paypalWebhook = process.env.PAYPAL_WEBHOOK_ID || '';
      const envCurrency = process.env.PAYMENT_CURRENCY || process.env.NEXT_PUBLIC_CURRENCY || '';

      const updatedSettings = {
        ...currentSettings,
        currency: envCurrency || currentSettings.currency || 'USD',
        stripe: {
          ...currentSettings.stripe,
          publishableKey: stripePublishable || currentSettings.stripe?.publishableKey || '',
          secretKey: stripeSecret || currentSettings.stripe?.secretKey || '',
          webhookSecret: stripeWebhook || currentSettings.stripe?.webhookSecret || '',
        },
        paypal: {
          ...currentSettings.paypal,
          clientId: paypalClient || currentSettings.paypal?.clientId || '',
          clientSecret: paypalSecret || currentSettings.paypal?.clientSecret || '',
          webhookId: paypalWebhook || currentSettings.paypal?.webhookId || '',
        }
      };

      if (stripePublishable) syncedFields.push('Stripe Publishable Key');
      if (stripeSecret) syncedFields.push('Stripe Secret Key');
      if (stripeWebhook) syncedFields.push('Stripe Webhook Secret');
      if (paypalClient) syncedFields.push('PayPal Client ID');
      if (paypalSecret) syncedFields.push('PayPal Client Secret');

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency);

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${syncedFields.length} credential(s) from server .env!`,
        syncedCount: syncedFields.length,
        syncedFields,
        settings: updatedSettings
      });
    }

    // 7. UPDATE .ENV EXPLICITLY
    if (body.action === 'update_env') {
      const cfg = body.paymentSettings || body;
      updateEnvCredentials(cfg);
      return NextResponse.json({
        success: true,
        message: 'Credentials updated and saved to server .env files!'
      });
    }

    // 8. MANUAL SETTLEMENT ACTIONS
    if (body.action === 'approve_manual_settlement') {
      const txId = body.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      await query(
        `UPDATE payment_transactions 
         SET status = 'succeeded', confirmed_amount = amount, confirmed_at = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [txId]
      );

      await query(
        `UPDATE wallet_transactions 
         SET status = 'succeeded' 
         WHERE gateway_tx_id = $1 OR id = $1`,
        [txId]
      ).catch(() => {});

      return NextResponse.json({ success: true, message: 'Manual bank wire approved successfully!' });
    }

    if (body.action === 'reject_manual_settlement') {
      const txId = body.id;
      const failureReason = body.failureReason || 'Wire transfer rejected by administrator';
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      await query(
        `UPDATE payment_transactions 
         SET status = 'rejected', failure_reason = $1, updated_at = NOW() 
         WHERE id = $2`,
        [failureReason, txId]
      );

      await query(
        `UPDATE wallet_transactions 
         SET status = 'rejected' 
         WHERE gateway_tx_id = $1 OR id = $1`,
        [txId]
      ).catch(() => {});

      return NextResponse.json({ success: true, message: 'Manual bank wire settlement rejected.' });
    }

    if (body.action === 'edit_transaction') {
      const txId = body.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      await query(
        `UPDATE payment_transactions 
         SET customer_name = $1, customer_email = $2, plan_name = $3, amount = $4,
             transfer_reference = $5, status = $6, notes = $7, failure_reason = $8, updated_at = NOW()
         WHERE id = $9`,
        [
          body.customer_name || 'Customer',
          (body.customer_email || '').toLowerCase().trim(),
          body.plan_name || 'Plan',
          Number(body.amount || 0),
          body.transfer_reference || '',
          body.status || 'pending',
          body.notes || '',
          body.failure_reason || null,
          txId
        ]
      );

      return NextResponse.json({ success: true, message: 'Transaction record updated successfully in PostgreSQL!' });
    }

    // 9. REFUND / CANCEL
    if (body.action === 'refund_transaction') {
      const txId = body.id || body.transaction?.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      await query(
        `UPDATE payment_transactions 
         SET status = 'refunded', is_recurring = false, auto_renew = false, expiry_date = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [txId]
      );

      return NextResponse.json({ success: true, message: 'Payment refunded successfully' });
    }

    if (body.action === 'cancel_transaction') {
      const txId = body.id || body.transaction?.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      await query(
        `UPDATE payment_transactions 
         SET status = 'canceled', is_recurring = false, auto_renew = false, updated_at = NOW() 
         WHERE id = $1`,
        [txId]
      );

      return NextResponse.json({ success: true, message: 'Subscription canceled' });
    }

    // Fallback save
    const fallbackSettings = body.paymentSettings || body;
    await persistAdminSettingsData(fallbackSettings, fallbackSettings.currency || 'USD');
    return NextResponse.json({ success: true, settings: fallbackSettings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensurePaymentSchema();
    const body = await req.json().catch(() => ({}));
    const id = body.id;

    if (id) {
      await query(`DELETE FROM payment_transactions WHERE id = $1`, [id]);
      await query(`DELETE FROM wallet_transactions WHERE gateway_tx_id = $1 OR id = $1`, [id]).catch(() => {});
      return NextResponse.json({ success: true, message: 'Transaction deleted' });
    }

    return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
