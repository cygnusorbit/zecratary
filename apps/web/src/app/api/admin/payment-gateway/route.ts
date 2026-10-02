import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;
  return [];
}

function extractFirstRow(result: any): any | null {
  if (!result) return null;
  if (Array.isArray(result)) return result[0] || null;
  if (Array.isArray(result.rows)) return result.rows[0] || null;
  return null;
}

function isValidStripeSecretKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 25) return false;
  if (trimmed.includes('...') || trimmed.includes('*') || trimmed.includes('placeholder') || trimmed.includes('sample')) {
    return false;
  }
  return (
    trimmed.startsWith('sk_test_') ||
    trimmed.startsWith('sk_live_') ||
    trimmed.startsWith('rk_test_') ||
    trimmed.startsWith('rk_live_')
  );
}

function isValidStripePublishableKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 25) return false;
  if (trimmed.includes('...') || trimmed.includes('*') || trimmed.includes('placeholder') || trimmed.includes('sample')) {
    return false;
  }
  return trimmed.startsWith('pk_test_') || trimmed.startsWith('pk_live_');
}

function getPrimaryEnvFilePath(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, 'apps', 'web', '.env'),
    path.join(cwd, 'apps', 'web', '.env.local'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(cwd, '.env');
}

function parseEnvFile(filePath: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return map;
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.substring(0, idx).trim();
        let v = trimmed.substring(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        map[k] = v;
      }
    }
  } catch (_) {}
  return map;
}

function updateEnvFileBatch(filePath: string, updates: Record<string, string>): boolean {
  let content = '';
  if (fs.existsSync(filePath)) {
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (_) {}
  } else {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }
  }

  let lines = content ? content.split(/\r?\n/) : [];
  const processedKeys = new Set<string>();

  lines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.substring(0, eqIdx).trim();
      if (k in updates) {
        processedKeys.add(k);
        const val = updates[k];
        const safeVal = val.includes(' ') || val.includes('#') ? `"${val}"` : val;
        return `${k}=${safeVal}`;
      }
    }
    return line;
  });

  for (const [k, val] of Object.entries(updates)) {
    if (!processedKeys.has(k)) {
      const safeVal = val.includes(' ') || val.includes('#') ? `"${val}"` : val;
      lines.push(`${k}=${safeVal}`);
    }
  }

  const newContent = lines.join('\n').trim() + '\n';
  if (newContent !== content) {
    try {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return true;
    } catch (e) {
      console.warn('[EnvUpdate] Failed to write env file:', e);
      return false;
    }
  }
  return false;
}

function persistEnvCredentials(settings: any, currency?: string) {
  const targetKeys: Record<string, string> = {};

  if (settings.stripe?.publishableKey !== undefined) {
    const pk = settings.stripe.publishableKey.trim();
    if (isValidStripePublishableKey(pk)) {
      targetKeys['STRIPE_PUBLISHABLE_KEY'] = pk;
      targetKeys['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] = pk;
    }
  }
  if (settings.stripe?.secretKey !== undefined) {
    const sk = settings.stripe.secretKey.trim();
    if (isValidStripeSecretKey(sk)) {
      targetKeys['STRIPE_SECRET_KEY'] = sk;
    }
  }
  if (settings.stripe?.webhookSecret !== undefined) {
    const ws = settings.stripe.webhookSecret.trim();
    if (ws.startsWith('whsec_') && ws.length >= 20 && !ws.includes('...')) {
      targetKeys['STRIPE_WEBHOOK_SECRET'] = ws;
    }
  }

  if (settings.paypal?.clientId !== undefined) {
    targetKeys['PAYPAL_CLIENT_ID'] = settings.paypal.clientId.trim();
    targetKeys['NEXT_PUBLIC_PAYPAL_CLIENT_ID'] = settings.paypal.clientId.trim();
  }
  if (settings.paypal?.clientSecret !== undefined) {
    targetKeys['PAYPAL_CLIENT_SECRET'] = settings.paypal.clientSecret.trim();
  }
  if (settings.paypal?.webhookId !== undefined) {
    targetKeys['PAYPAL_WEBHOOK_ID'] = settings.paypal.webhookId.trim();
  }
  if (settings.paypal?.environment !== undefined) {
    targetKeys['PAYPAL_ENVIRONMENT'] = settings.paypal.environment;
  }

  const cur = currency || settings.currency;
  if (cur) {
    targetKeys['PAYMENT_CURRENCY'] = cur;
  }
  if (settings.activeGateway) {
    targetKeys['PAYMENT_GATEWAY'] = settings.activeGateway;
  }
  if (settings.testMode !== undefined) {
    targetKeys['PAYMENT_TEST_MODE'] = String(settings.testMode);
  }

  const primaryEnv = getPrimaryEnvFilePath();
  updateEnvFileBatch(primaryEnv, targetKeys);

  for (const [key, val] of Object.entries(targetKeys)) {
    process.env[key] = val;
  }

  return { envFile: primaryEnv, updatedKeys: Object.keys(targetKeys) };
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
        key VARCHAR(255) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      DO $$ 
      BEGIN 
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS id INT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(255); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS payment_settings JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS site_name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme_colors JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);
  } catch (e) {
    console.warn('[Payment API] Schema check warning:', e);
  }
}

async function persistAdminSettingsData(settings: any, currency: string) {
  await ensurePaymentSchema();
  const cleanSettings = { ...settings };
  delete cleanSettings.action;
  const jsonStr = JSON.stringify(cleanSettings);
  const cur = currency || cleanSettings.currency || 'USD';

  try {
    await query(
      `INSERT INTO admin_settings (key, value, currency, updated_at)
       VALUES ('payment_gateway_config', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         currency = EXCLUDED.currency,
         updated_at = NOW()`,
      [jsonStr, cur]
    );
  } catch (e1) {
    try {
      await query(
        `UPDATE admin_settings SET value = $1::jsonb, currency = $2, updated_at = NOW() WHERE key = 'payment_gateway_config'`,
        [jsonStr, cur]
      );
    } catch (_) {}
  }

  try {
    await query(
      `INSERT INTO admin_settings (key, value, currency, updated_at)
       VALUES ('paymentSettings', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         currency = EXCLUDED.currency,
         updated_at = NOW()`,
      [jsonStr, cur]
    );
  } catch (_) {}

  try {
    await query(
      `UPDATE admin_settings SET payment_settings = $1::jsonb, currency = $2, updated_at = NOW()
       WHERE key IN ('payment_gateway_config', 'paymentSettings') OR id = 1`,
      [jsonStr, cur]
    );
  } catch (_) {}

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
    existing.payment_gateway_config = cleanSettings;
    existing.currency = cur;
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  } catch (fileErr) {
    console.warn('[Payment API] File mirror error:', fileErr);
  }
}

export async function GET() {
  try {
    await ensurePaymentSchema();

    let txRes: any = null;
    try {
      txRes = await query(`SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`);
    } catch (_) {
      try {
        txRes = await query(`SELECT * FROM payment_transactions ORDER BY id DESC LIMIT 500`);
      } catch (_) {
        txRes = [];
      }
    }

    const transactions = extractRows(txRes);
    let settings: any = null;

    try {
      const sRes: any = await query(
        `SELECT key, value, payment_settings, currency FROM admin_settings 
         WHERE key IN ('payment_gateway_config', 'paymentSettings') OR id = 1 
         ORDER BY updated_at DESC LIMIT 2`
      );
      const rows = extractRows(sRes);
      for (const row of rows) {
        let val = row.value || row.payment_settings;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (_) {}
        }
        if (val && typeof val === 'object') {
          settings = { ...val };
          if (row.currency) settings.currency = row.currency;
          break;
        }
      }
    } catch (_) {}

    if (!settings) {
      try {
        const filePath = path.join(process.cwd(), 'data', 'admin_settings.json');
        if (fs.existsSync(filePath)) {
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (fileData.paymentSettings || fileData.payment_gateway_config) {
            settings = { ...(fileData.paymentSettings || fileData.payment_gateway_config) };
            if (fileData.currency) settings.currency = fileData.currency;
          }
        }
      } catch (_) {}
    }

    const primaryEnv = getPrimaryEnvFilePath();
    const envMap = parseEnvFile(primaryEnv);

    const rawStripePk = envMap['STRIPE_PUBLISHABLE_KEY'] || envMap['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] || process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const rawStripeSk = envMap['STRIPE_SECRET_KEY'] || envMap['STRIPE_SK'] || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
    const rawStripeWh = envMap['STRIPE_WEBHOOK_SECRET'] || envMap['STRIPE_ENDPOINT_SECRET'] || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_ENDPOINT_SECRET || '';

    const stripePk = isValidStripePublishableKey(rawStripePk) ? rawStripePk : '';
    const stripeSk = isValidStripeSecretKey(rawStripeSk) ? rawStripeSk : '';
    const stripeWh = rawStripeWh.startsWith('whsec_') && !rawStripeWh.includes('...') ? rawStripeWh : '';

    const paypalClientId = envMap['PAYPAL_CLIENT_ID'] || envMap['NEXT_PUBLIC_PAYPAL_CLIENT_ID'] || process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const paypalSecret = envMap['PAYPAL_CLIENT_SECRET'] || envMap['PAYPAL_SECRET'] || envMap['PAYPAL_SECRET_KEY'] || process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || '';
    const paypalWebhook = envMap['PAYPAL_WEBHOOK_ID'] || process.env.PAYPAL_WEBHOOK_ID || '';
    const paypalRawEnv = (envMap['PAYPAL_ENVIRONMENT'] || envMap['PAYPAL_MODE'] || process.env.PAYPAL_ENVIRONMENT || process.env.PAYPAL_MODE || '').toLowerCase();
    const paypalEnv: 'sandbox' | 'live' = paypalRawEnv.includes('live') ? 'live' : 'sandbox';
    const currencyFromEnv = envMap['PAYMENT_CURRENCY'] || envMap['DEFAULT_CURRENCY'] || process.env.PAYMENT_CURRENCY || process.env.DEFAULT_CURRENCY || '';

    if (!settings) {
      settings = {
        activeGateway: stripePk ? 'stripe' : (paypalClientId ? 'paypal' : 'stripe'),
        currency: currencyFromEnv || 'USD',
        testMode: stripeSk ? stripeSk.startsWith('sk_test_') : true,
        stripe: {
          enabled: Boolean(stripePk || stripeSk),
          publishableKey: stripePk,
          secretKey: stripeSk,
          webhookSecret: stripeWh,
        },
        paypal: {
          enabled: Boolean(paypalClientId || paypalSecret),
          clientId: paypalClientId,
          clientSecret: paypalSecret,
          webhookId: paypalWebhook,
          environment: paypalEnv,
        },
      };
    } else {
      settings.stripe = {
        enabled: settings.stripe?.enabled ?? Boolean(stripePk || stripeSk),
        publishableKey: isValidStripePublishableKey(settings.stripe?.publishableKey) ? settings.stripe.publishableKey : stripePk,
        secretKey: isValidStripeSecretKey(settings.stripe?.secretKey) ? settings.stripe.secretKey : stripeSk,
        webhookSecret: (settings.stripe?.webhookSecret && !settings.stripe.webhookSecret.includes('...')) ? settings.stripe.webhookSecret : stripeWh,
        ...(settings.stripe || {})
      };
      if (!isValidStripeSecretKey(settings.stripe.secretKey)) {
        settings.stripe.secretKey = '';
      }
      if (!isValidStripePublishableKey(settings.stripe.publishableKey)) {
        settings.stripe.publishableKey = '';
      }

      settings.paypal = {
        enabled: settings.paypal?.enabled ?? Boolean(paypalClientId || paypalSecret),
        clientId: settings.paypal?.clientId || paypalClientId,
        clientSecret: settings.paypal?.clientSecret || paypalSecret,
        webhookId: settings.paypal?.webhookId || paypalWebhook,
        environment: settings.paypal?.environment || paypalEnv,
        ...(settings.paypal || {})
      };
      if (!settings.currency && currencyFromEnv) settings.currency = currencyFromEnv;
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

    // 1. SYNC FROM .ENV FILE DATA
    if (body.action === 'sync_env' || body.action === 'sync_from_env') {
      const primaryEnv = getPrimaryEnvFilePath();
      const envMap = parseEnvFile(primaryEnv);

      const rawStripePk = envMap['STRIPE_PUBLISHABLE_KEY'] || envMap['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] || process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
      const rawStripeSk = envMap['STRIPE_SECRET_KEY'] || envMap['STRIPE_SK'] || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
      const rawStripeWh = envMap['STRIPE_WEBHOOK_SECRET'] || envMap['STRIPE_ENDPOINT_SECRET'] || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_ENDPOINT_SECRET || '';

      const stripePk = isValidStripePublishableKey(rawStripePk) ? rawStripePk : '';
      const stripeSk = isValidStripeSecretKey(rawStripeSk) ? rawStripeSk : '';
      const stripeWh = rawStripeWh.startsWith('whsec_') && !rawStripeWh.includes('...') ? rawStripeWh : '';

      const paypalClientId = envMap['PAYPAL_CLIENT_ID'] || envMap['NEXT_PUBLIC_PAYPAL_CLIENT_ID'] || process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
      const paypalSecret = envMap['PAYPAL_CLIENT_SECRET'] || envMap['PAYPAL_SECRET'] || envMap['PAYPAL_SECRET_KEY'] || process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || '';
      const paypalWebhook = envMap['PAYPAL_WEBHOOK_ID'] || process.env.PAYPAL_WEBHOOK_ID || '';
      const paypalRawEnv = (envMap['PAYPAL_ENVIRONMENT'] || envMap['PAYPAL_MODE'] || process.env.PAYPAL_ENVIRONMENT || process.env.PAYPAL_MODE || '').toLowerCase();
      const paypalEnv: 'sandbox' | 'live' = paypalRawEnv.includes('live') ? 'live' : 'sandbox';
      const currencyFromEnv = envMap['PAYMENT_CURRENCY'] || envMap['DEFAULT_CURRENCY'] || process.env.PAYMENT_CURRENCY || process.env.DEFAULT_CURRENCY || '';

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT value FROM admin_settings WHERE key IN ('payment_gateway_config', 'paymentSettings') LIMIT 1`);
        const sRow = extractFirstRow(sRes);
        if (sRow?.value) {
          currentSettings = typeof sRow.value === 'string' ? JSON.parse(sRow.value) : sRow.value;
        }
      } catch (_) {}

      const syncedFields: string[] = [];
      const updatedConfig = {
        ...currentSettings,
        stripe: {
          enabled: currentSettings.stripe?.enabled ?? true,
          publishableKey: currentSettings.stripe?.publishableKey || '',
          secretKey: currentSettings.stripe?.secretKey || '',
          webhookSecret: currentSettings.stripe?.webhookSecret || '',
          ...(currentSettings.stripe || {})
        },
        paypal: {
          enabled: currentSettings.paypal?.enabled ?? false,
          clientId: currentSettings.paypal?.clientId || '',
          clientSecret: currentSettings.paypal?.clientSecret || '',
          webhookId: currentSettings.paypal?.webhookId || '',
          environment: currentSettings.paypal?.environment || 'sandbox',
          ...(currentSettings.paypal || {})
        }
      };

      if (stripePk) {
        updatedConfig.stripe.publishableKey = stripePk;
        syncedFields.push('Stripe Publishable Key');
      }
      if (stripeSk) {
        updatedConfig.stripe.secretKey = stripeSk;
        syncedFields.push('Stripe Secret Key');
      }
      if (stripeWh) {
        updatedConfig.stripe.webhookSecret = stripeWh;
        syncedFields.push('Stripe Webhook Secret');
      }
      if (paypalClientId) {
        updatedConfig.paypal.clientId = paypalClientId;
        syncedFields.push('PayPal Client ID');
      }
      if (paypalSecret) {
        updatedConfig.paypal.clientSecret = paypalSecret;
        syncedFields.push('PayPal Client Secret');
      }
      if (paypalWebhook) {
        updatedConfig.paypal.webhookId = paypalWebhook;
        syncedFields.push('PayPal Webhook ID');
      }
      if (paypalRawEnv) {
        updatedConfig.paypal.environment = paypalEnv;
      }
      if (currencyFromEnv) {
        updatedConfig.currency = currencyFromEnv;
        syncedFields.push('Processing Currency');
      }

      if (updatedConfig.stripe.secretKey.startsWith('sk_test_')) {
        updatedConfig.testMode = true;
      } else if (updatedConfig.stripe.secretKey.startsWith('sk_live_')) {
        updatedConfig.testMode = false;
      }

      await persistAdminSettingsData(updatedConfig, updatedConfig.currency || 'USD');

      return NextResponse.json({
        success: true,
        settings: updatedConfig,
        syncedFields,
        syncedCount: syncedFields.length,
        message: syncedFields.length > 0 
          ? `Successfully synced ${syncedFields.length} credential(s) from .env: ${syncedFields.join(', ')}`
          : 'Database settings are already up-to-date with your current .env variables.'
      });
    }

    // 2. UPDATE / SAVE EXPLICITLY TO .ENV FILE DATA
    if (body.action === 'update_env' || body.action === 'sync_to_env') {
      const cfg = body.paymentSettings || body;
      const currency = cfg.currency || body.currency || 'USD';

      const envResult = persistEnvCredentials(cfg, currency);
      await persistAdminSettingsData(cfg, currency);

      return NextResponse.json({
        success: true,
        message: `Successfully updated .env file with ${envResult.updatedKeys.length} payment variables!`,
        updatedKeys: envResult.updatedKeys,
        settings: cfg
      });
    }

    if (body.action === 'verify_webhook_secret') {
      const secret = (body.webhookSecret || '').trim();
      if (!secret) {
        return NextResponse.json({ success: false, error: 'Webhook secret is required' }, { status: 400 });
      }
      if (!secret.startsWith('whsec_') || secret.length < 20 || secret.includes('...')) {
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

    if (body.action === 'verify_stripe_keys') {
      const pKey = (body.publishableKey || body.stripe?.publishableKey || '').trim();
      const sKey = (body.secretKey || body.stripe?.secretKey || '').trim();
      const wSecret = (body.webhookSecret || body.stripe?.webhookSecret || '').trim();
      const isTestMode = body.testMode !== undefined ? Boolean(body.testMode) : true;

      if (!isValidStripePublishableKey(pKey)) {
        return NextResponse.json({
          success: false,
          error: 'Publishable Key is invalid or contains placeholder characters (...).'
        }, { status: 400 });
      }

      if (!isValidStripeSecretKey(sKey)) {
        return NextResponse.json({
          success: false,
          error: 'Secret Key is invalid or contains placeholder characters (...).'
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
          return NextResponse.json({
            success: false,
            error: errData?.error?.message || `Stripe authentication rejected key with status ${stripeRes.status}`
          }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Could not connect to Stripe: ${err.message}`
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Publishable Key, Secret Key, and Webhook Secret verified successfully with Stripe servers!'
      });
    }

    if (body.action === 'toggle_test_mode') {
      const nextMode = Boolean(body.testMode);
      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT value FROM admin_settings WHERE key IN ('payment_gateway_config', 'paymentSettings') LIMIT 1`);
        const row = extractFirstRow(sRes);
        if (row?.value) {
          currentSettings = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
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
      persistEnvCredentials(updatedSettings, updatedSettings.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: nextMode ? 'Sandbox (Test Mode) enabled and saved to server & .env!' : 'Live Production mode enabled and saved to server & .env!',
        settings: updatedSettings
      });
    }

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

      let checkRes: any = null;
      try {
        checkRes = await query(`SELECT id FROM payment_transactions WHERE id = $1 LIMIT 1`, [txId]);
      } catch (_) {
        checkRes = [];
      }
      const checkRows = extractRows(checkRes);

      if (checkRows.length > 0) {
        await query(
          `UPDATE payment_transactions 
           SET customer_name = $1, customer_email = $2, plan_name = $3, plan_slug = $4,
               amount = $5, currency = $6, gateway = $7, status = $8, failure_reason = $9,
               is_recurring = $10, recurring_interval = $11, auto_renew = $12, created_at = $13,
               expiry_date = $14, gateway_transaction_id = $15, confirmed_amount = $16,
               confirmed_at = $17, updated_at = NOW()
           WHERE id = $18`,
          [
            customerName, customerEmail, planName, planSlug, amount, currency, gateway,
            status, failureReason, isRecurring, recurringInterval, autoRenew, createdAt,
            expiryDate, gatewayTxId, confirmedAmount, confirmedAt, txId
          ]
        );
      } else {
        await query(
          `INSERT INTO payment_transactions (
            id, customer_name, customer_email, plan_name, plan_slug,
            amount, currency, gateway, status, test_mode, failure_reason,
            is_recurring, recurring_interval, auto_renew, created_at,
            expiry_date, gateway_transaction_id, confirmed_amount, confirmed_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())`,
          [
            txId, customerName, customerEmail, planName, planSlug,
            amount, currency, gateway, status, testMode, failureReason,
            isRecurring, recurringInterval, autoRenew, createdAt,
            expiryDate, gatewayTxId, confirmedAmount, confirmedAt
          ]
        ).catch(async () => {
          await query(
            `INSERT INTO payment_transactions (
              id, customer_name, customer_email, plan_name, plan_slug,
              amount, currency, gateway, status, created_at, expiry_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              txId, customerName, customerEmail, planName, planSlug,
              amount, currency, gateway, status, createdAt, expiryDate
            ]
          );
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction recorded successfully',
        transaction: {
          ...tx,
          id: txId,
          customerName,
          customerEmail,
          planName,
          planSlug,
          amount,
          currency,
          gateway,
          status,
          isRecurring,
          autoRenew,
          createdAt,
          expiryDate
        }
      });
    }

    // Default Save Gateway Settings
    const gatewayConfig = body.paymentSettings || body;
    const currency = gatewayConfig.currency || body.currency || 'USD';

    await persistAdminSettingsData(gatewayConfig, currency);
    const envResult = persistEnvCredentials(gatewayConfig, currency);

    return NextResponse.json({
      success: true,
      message: 'Payment gateway settings and currency saved successfully to PostgreSQL and .env file!',
      settings: gatewayConfig,
      updatedKeys: envResult.updatedKeys
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
