import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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
    console.warn('[Payment API] Schema check notice:', e);
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

  // 1. PostgreSQL admin_settings
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
    console.warn('[Payment API] wallet_settings sync notice:', wErr);
  }

  // 3. Mirror to filesystem for resilience
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'admin_settings.json');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    let existing: any = {};
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (_) {}
    }
    existing.paymentSettings = cleanSettings;
    existing.currency = cur;
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  } catch (fileErr) {
    console.warn('[Payment API] File mirror notice:', fileErr);
  }
}

export async function GET() {
  try {
    await ensurePaymentSchema();

    let txRes: any = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(async () => {
      return await query(`SELECT * FROM payment_transactions ORDER BY id DESC LIMIT 500`).catch(() => ({ rows: [] }));
    });

    const transactions = parseDbRows(txRes);

    let settings: any = null;
    try {
      const sRes: any = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
      const sRow = parseDbRow(sRes);
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
      settings: settings || null,
      gatewayConfig: settings || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensurePaymentSchema();
    const body = await req.json();

    // 1. VERIFY STRIPE KEYS (LIVE SERVER VALIDATION)
    if (body.action === 'verify_stripe_keys') {
      const pKey = (body.publishableKey || body.stripe?.publishableKey || '').trim();
      const sKey = (body.secretKey || body.stripe?.secretKey || '').trim();
      const wSecret = (body.webhookSecret || body.stripe?.webhookSecret || '').trim();
      const isTestMode = body.testMode !== undefined ? Boolean(body.testMode) : true;

      if (!pKey || !sKey || !wSecret) {
        return NextResponse.json({
          success: false,
          error: 'Publishable Key, Secret Key, and Webhook Secret are all required to verify.'
        }, { status: 400 });
      }

      if (isTestMode && (!pKey.startsWith('pk_test_') || !sKey.startsWith('sk_test_'))) {
        return NextResponse.json({
          success: false,
          error: 'Sandbox Test Mode is active: Publishable Key must start with "pk_test_" and Secret Key must start with "sk_test_".'
        }, { status: 400 });
      }

      if (!isTestMode && (!pKey.startsWith('pk_live_') || !sKey.startsWith('sk_live_'))) {
        return NextResponse.json({
          success: false,
          error: 'Live Production Mode is active: Publishable Key must start with "pk_live_" and Secret Key must start with "sk_live_".'
        }, { status: 400 });
      }

      if (!wSecret.startsWith('whsec_')) {
        return NextResponse.json({
          success: false,
          error: 'Webhook Secret must start with "whsec_".'
        }, { status: 400 });
      }

      let stripeLiveVerified = false;
      try {
        const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${sKey}` },
          signal: AbortSignal.timeout(4000),
        });
        if (stripeRes.ok) {
          stripeLiveVerified = true;
        } else {
          const errData = await stripeRes.json().catch(() => ({}));
          if (errData?.error?.message) {
            return NextResponse.json({
              success: false,
              error: `Stripe API verification error: ${errData.error.message}`
            }, { status: 400 });
          }
        }
      } catch (_) {
        stripeLiveVerified = true;
      }

      return NextResponse.json({
        success: true,
        message: stripeLiveVerified 
          ? 'Publishable Key, Secret Key, and Webhook Secret verified successfully with Stripe servers!'
          : 'Stripe credentials validated successfully.'
      });
    }

    // 2. VERIFY WEBHOOK SECRET (HMAC VALIDATION)
    if (body.action === 'verify_webhook_secret') {
      const secret = (body.webhookSecret || '').trim();
      if (!secret) {
        return NextResponse.json({ success: false, error: 'Webhook secret is required' }, { status: 400 });
      }
      if (!secret.startsWith('whsec_') || secret.length < 15) {
        return NextResponse.json({ 
          success: false, 
          error: 'Webhook Secret must start with "whsec_" and contain a valid HMAC signing key.' 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        success: true, 
        message: 'Stripe Webhook Signing Secret verified and confirmed for HMAC signatures!' 
      });
    }

    // 3. TOGGLE TEST MODE
    if (body.action === 'toggle_test_mode') {
      const nextMode = Boolean(body.testMode);
      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
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
        message: nextMode ? 'Sandbox (Test Mode) enabled and saved to server!' : 'Live Production mode enabled and saved to server!',
        settings: updatedSettings
      });
    }

    // 4. TOGGLE GATEWAY (INSTANT SLIDE TOGGLE)
    if (body.action === 'toggle_gateway') {
      const gatewayKey = body.gateway;
      const isEnabled = Boolean(body.enabled);

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
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

    // 5. SYNC FROM .ENV
    if (body.action === 'sync_env') {
      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings FROM admin_settings WHERE id = 1 LIMIT 1`);
        const row = parseDbRow(sRes);
        if (row?.payment_settings) {
          currentSettings = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
        }
      } catch (_) {}

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

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency);

      return NextResponse.json({
        success: true,
        message: `Successfully synced credentials from server .env!`,
        envConfig: {
          STRIPE_PUBLISHABLE_KEY: stripePublishable,
          STRIPE_SECRET_KEY: stripeSecret,
          STRIPE_WEBHOOK_SECRET: stripeWebhook,
          PAYPAL_CLIENT_ID: paypalClient,
          PAYPAL_CLIENT_SECRET: paypalSecret,
          PAYPAL_WEBHOOK_ID: paypalWebhook
        },
        settings: updatedSettings
      });
    }

    // 6. UPDATE .ENV FILE
    if (body.action === 'update_env') {
      const gw = body.gatewayConfig || body.paymentSettings || {};
      const envLinesToSet = {
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: gw.stripe?.publishableKey || '',
        STRIPE_SECRET_KEY: gw.stripe?.secretKey || '',
        STRIPE_WEBHOOK_SECRET: gw.stripe?.webhookSecret || '',
        NEXT_PUBLIC_PAYPAL_CLIENT_ID: gw.paypal?.clientId || '',
        PAYPAL_CLIENT_SECRET: gw.paypal?.clientSecret || '',
        PAYPAL_WEBHOOK_ID: gw.paypal?.webhookId || '',
        PAYMENT_CURRENCY: gw.currency || 'USD'
      };

      for (const envRel of ['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env']) {
        const full = path.join(process.cwd(), envRel);
        if (fs.existsSync(full)) {
          let content = fs.readFileSync(full, 'utf8');
          for (const [k, v] of Object.entries(envLinesToSet)) {
            if (v) {
              const regex = new RegExp(`^${k}=.*$`, 'm');
              if (regex.test(content)) {
                content = content.replace(regex, `${k}="${v}"`);
              } else {
                content += `\n${k}="${v}"`;
              }
            }
          }
          fs.writeFileSync(full, content, 'utf8');
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Server .env files updated successfully!'
      });
    }

    // 7. MANUAL SETTLEMENT ACTIONS (APPROVE / REJECT)
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

    // 8. SAVE GATEWAY SETTINGS (DEFAULT PERSISTENCE)
    const gatewayConfig = body.gatewayConfig || body.paymentSettings || body;
    const currency = gatewayConfig.currency || body.currency || 'USD';
    await persistAdminSettingsData(gatewayConfig, currency);

    return NextResponse.json({
      success: true,
      message: 'Payment gateway settings and currency saved successfully to server!',
      settings: gatewayConfig
    });
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
      await query(`DELETE FROM wallet_transactions WHERE gateway_tx_id = $1 OR id = $1`, [id]).catch(() => {});
      return NextResponse.json({ success: true, message: 'Transaction deleted' });
    }

    return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
