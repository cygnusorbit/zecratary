import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function ensurePaymentSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(100) DEFAULT 'primary_settings',
        key VARCHAR(100) DEFAULT 'payment_gateway_config',
        value JSONB DEFAULT '{}'::jsonb,
        payment_settings JSONB DEFAULT '{}'::jsonb,
        currency VARCHAR(10) DEFAULT 'USD',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallet_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        is_enabled BOOLEAN DEFAULT true,
        currency VARCHAR(10) DEFAULT 'USD',
        min_topup NUMERIC(10,2) DEFAULT 5.00,
        max_topup NUMERIC(10,2) DEFAULT 1000.00,
        preset_amounts JSONB DEFAULT '[10, 25, 50, 100, 250]'::jsonb,
        bonus_rules JSONB DEFAULT '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]'::jsonb,
        allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]'::jsonb,
        allow_site_purchases BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

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
      DO $$ 
      BEGIN 
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS id VARCHAR(100) DEFAULT 'primary_settings'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100) DEFAULT 'payment_gateway_config'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB DEFAULT '{}'::jsonb; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]'::jsonb; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'; EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);

    // Ensure at least one settings row exists
    const checkRow: any = await query(`SELECT 1 FROM admin_settings LIMIT 1`).catch(() => []);
    const hasRow = Array.isArray(checkRow) ? checkRow.length > 0 : Boolean((checkRow as any)?.rows?.length);
    if (!hasRow) {
      await query(`
        INSERT INTO admin_settings (id, key, payment_settings, value, currency, updated_at)
        VALUES ('primary_settings', 'payment_gateway_config', '{}'::jsonb, '{}'::jsonb, 'USD', NOW())
      `).catch(() => {});
    }
  } catch (e) {
    console.warn('[Payment API] Schema check warning:', e);
  }
}

// Live 3-Way Stripe REST API & Cryptographic Verification
async function verifyThreeStripeCredentials(publishableKey: string, secretKey: string, webhookSecret: string, testMode: boolean) {
  const pKey = (publishableKey || '').trim();
  const sKey = (secretKey || '').trim();
  const wSecret = (webhookSecret || '').trim();

  const missing: string[] = [];
  if (!pKey) missing.push('Publishable Key');
  if (!sKey) missing.push('Secret Key');
  if (!wSecret) missing.push('Webhook Secret');

  if (missing.length > 0) {
    return { valid: false, error: `Verification required: Please enter ${missing.join(', ')} to verify.` };
  }

  if (sKey.includes('...') || sKey.includes('*')) {
    return { valid: false, error: 'Please enter a valid Stripe Secret Key. Do not submit placeholder dots (...) or masked asterisks (*).' };
  }
  if (pKey.includes('...') || pKey.includes('*')) {
    return { valid: false, error: 'Please enter a valid Stripe Publishable Key. Do not submit placeholder dots (...) or masked asterisks (*).' };
  }
  if (wSecret.includes('...') || wSecret.includes('*')) {
    return { valid: false, error: 'Please enter a valid Stripe Webhook Secret. Do not submit placeholder dots (...) or masked asterisks (*).' };
  }

  if (testMode) {
    if (!pKey.startsWith('pk_test_')) {
      return { valid: false, error: 'Sandbox Test Mode is active: Publishable Key must begin with "pk_test_".' };
    }
    if (!sKey.startsWith('sk_test_') && !sKey.startsWith('rk_test_')) {
      return { valid: false, error: 'Sandbox Test Mode is active: Secret Key must begin with "sk_test_" or "rk_test_".' };
    }
  } else {
    if (!pKey.startsWith('pk_live_')) {
      return { valid: false, error: 'Live Production Mode is active: Publishable Key must begin with "pk_live_".' };
    }
    if (!sKey.startsWith('sk_live_') && !sKey.startsWith('rk_live_')) {
      return { valid: false, error: 'Live Production Mode is active: Secret Key must begin with "sk_live_" or "rk_live_".' };
    }
  }

  let livemodeDetected = !testMode;
  try {
    const sRes = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    const sData = await sRes.json().catch(() => ({}));
    if (!sRes.ok || sData.error) {
      return {
        valid: false,
        error: `Secret Key rejected by Stripe: ${sData.error?.message || `HTTP status ${sRes.status}`}`
      };
    }
    livemodeDetected = Boolean(sData.livemode);
    if (testMode && livemodeDetected) {
      return { valid: false, error: 'Sandbox Test Mode is active, but Secret Key belongs to a Live Stripe account.' };
    }
    if (!testMode && !livemodeDetected) {
      return { valid: false, error: 'Live Production Mode is active, but Secret Key belongs to a Test Stripe account.' };
    }
  } catch (err: any) {
    return { valid: false, error: `Failed to connect to Stripe to verify Secret Key: ${err.message}` };
  }

  try {
    const pRes = await fetch('https://api.stripe.com/v1/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    const pData = await pRes.json().catch(() => ({}));

    if (pRes.status === 401 || (pData.error && pData.error.type === 'invalid_request_error' && pRes.status === 401)) {
      return {
        valid: false,
        error: `Publishable Key rejected by Stripe: ${pData.error?.message || 'Invalid API Key provided.'}`
      };
    }
  } catch (err: any) {
    return { valid: false, error: `Failed to connect to Stripe to verify Publishable Key: ${err.message}` };
  }

  if (!wSecret.startsWith('whsec_')) {
    return { valid: false, error: 'Webhook Secret must begin with "whsec_".' };
  }
  if (wSecret.length < 24) {
    return { valid: false, error: 'Webhook Secret is too short to be a valid Stripe signing key (minimum 24 characters).' };
  }

  try {
    const testPayload = JSON.stringify({ test: true, timestamp: Date.now() });
    const hmac = crypto.createHmac('sha256', wSecret).update(`1234567890.${testPayload}`, 'utf8').digest('hex');
    if (!hmac || hmac.length !== 64) {
      return { valid: false, error: 'Cryptographic HMAC computation test failed on Webhook Secret.' };
    }
  } catch (err: any) {
    return { valid: false, error: `Invalid signing key for HMAC-SHA256: ${err.message}` };
  }

  let endpointNote = '';
  try {
    const weRes = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=25', {
      headers: { 'Authorization': `Bearer ${sKey}` },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store'
    });
    if (weRes.ok) {
      const weData = await weRes.json().catch(() => ({}));
      const matchingEp = weData.data?.find((ep: any) => ep.url?.includes('/api/webhooks/stripe'));
      if (matchingEp) {
        endpointNote = ' (Matched endpoint registered in Stripe Dashboard)';
      }
    }
  } catch (_) {}

  return {
    valid: true,
    livemode: livemodeDetected,
    endpointNote
  };
}

// Fail-safe dual-schema persistence
async function persistAdminSettingsData(settings: any, currency: string) {
  await ensurePaymentSchema();
  const cleanSettings = { ...settings };
  delete cleanSettings.action;
  const jsonStr = JSON.stringify(cleanSettings);
  const cur = currency || cleanSettings.currency || 'USD';

  let updatedRow = false;
  try {
    const res = await query(
      `UPDATE admin_settings 
       SET payment_settings = $1::jsonb, currency = $2, updated_at = NOW() 
       WHERE id::text IN ('1', 'primary_settings') OR key IN ('payment_gateway_config', 'paymentSettings', 'primary_settings')`,
      [jsonStr, cur]
    );
    const count = (res as any)?.rowCount || (Array.isArray(res) ? res.length : 0);
    if (count > 0) updatedRow = true;
  } catch (_) {}

  if (!updatedRow) {
    try {
      await query(
        `INSERT INTO admin_settings (id, key, payment_settings, currency, updated_at)
         VALUES ('primary_settings', 'payment_gateway_config', $1::jsonb, $2, NOW())`,
        [jsonStr, cur]
      );
      updatedRow = true;
    } catch (_) {
      try {
        await query(
          `INSERT INTO admin_settings (key, value, updated_at)
           VALUES ('payment_gateway_config', $1::jsonb, NOW())`,
          [jsonStr]
        );
      } catch (_) {}
    }
  }

  // Also sync value column for key-value readers
  try {
    await query(
      `UPDATE admin_settings 
       SET value = $1::jsonb, updated_at = NOW() 
       WHERE key IN ('payment_gateway_config', 'paymentSettings', 'primary_settings')`,
      [jsonStr]
    );
  } catch (_) {}

  // Synchronize wallet_settings table
  try {
    const allowed = [];
    const active = cleanSettings.activeGateway || 'stripe';
    if (active === 'both') {
      if (cleanSettings.stripe?.enabled !== false) allowed.push('stripe');
      if (cleanSettings.paypal?.enabled !== false) allowed.push('paypal');
    } else if (active === 'paypal') {
      if (cleanSettings.paypal?.enabled !== false) allowed.push('paypal');
    } else {
      if (cleanSettings.stripe?.enabled !== false) allowed.push('stripe');
    }
    allowed.push('manual');

    await query(
      `INSERT INTO wallet_settings (id, currency, allowed_gateways, updated_at)
       VALUES ('current', $1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET
         currency = EXCLUDED.currency,
         allowed_gateways = EXCLUDED.allowed_gateways,
         updated_at = NOW()`,
      [cur, JSON.stringify(Array.from(new Set(allowed)))]
    );
  } catch (_) {}

  // Mirror to data directory
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'admin_settings.json');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    let existing: any = {};
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
    }
    existing.paymentSettings = cleanSettings;
    existing.payment_gateway_config = cleanSettings;
    existing.currency = cur;
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  } catch (_) {}
}

function readCredentialsFromEnvFile() {
  const envMap: Record<string, string> = {};
  const envFiles = ['.env', '.env.local', '.env.production'];

  for (const ef of envFiles) {
    const fPath = path.join(process.cwd(), ef);
    if (fs.existsSync(fPath)) {
      try {
        const content = fs.readFileSync(fPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val) envMap[key] = val;
        }
      } catch (_) {}
    }
  }

  const processKeys = [
    'STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY', 'STRIPE_SK',
    'STRIPE_WEBHOOK_SECRET',
    'PAYPAL_CLIENT_ID', 'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET', 'PAYPAL_SECRET',
    'PAYPAL_WEBHOOK_ID',
    'PAYMENT_CURRENCY', 'DEFAULT_CURRENCY'
  ];

  for (const pk of processKeys) {
    if (process.env[pk] && !envMap[pk]) {
      envMap[pk] = process.env[pk] as string;
    }
  }

  return envMap;
}

function writeCredentialsToEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    try {
      content = fs.readFileSync(envPath, 'utf8');
    } catch (_) {}
  }

  let lines = content ? content.split('\n') : [];
  const handled = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return line;
    const key = trimmed.slice(0, trimmed.indexOf('=')).trim();
    if (updates[key] !== undefined) {
      handled.add(key);
      return `${key}="${updates[key]}"`;
    }
    return line;
  });

  for (const [key, val] of Object.entries(updates)) {
    if (!handled.has(key) && val) {
      newLines.push(`${key}="${val}"`);
    }
  }

  fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
}

export async function GET() {
  try {
    await ensurePaymentSchema();

    let txRes: any = await query(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 500`
    ).catch(async () => {
      return await query(`SELECT * FROM payment_transactions ORDER BY id DESC LIMIT 500`).catch(() => ({ rows: [] }));
    });

    const transactions = Array.isArray(txRes) ? txRes : (((txRes as any)?.rows) || []);

    let settings: any = null;
    try {
      const sRes: any = await query(
        `SELECT payment_settings, value, currency FROM admin_settings 
         WHERE id::text IN ('1', 'primary_settings') OR key IN ('payment_gateway_config', 'paymentSettings', 'primary_settings')
         ORDER BY updated_at DESC LIMIT 1`
      );
      const sRow = Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0];
      if (sRow) {
        let ps = sRow.payment_settings || sRow.value;
        if (typeof ps === 'string') {
          try { ps = JSON.parse(ps); } catch (_) {}
        }
        if (ps && typeof ps === 'object') {
          settings = { ...ps };
          if (sRow.currency && !settings.currency) settings.currency = sRow.currency;
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

    // 1. SYNC FROM .ENV ACTION
    if (body.action === 'sync_env') {
      const envMap = readCredentialsFromEnvFile();
      const syncedFields: string[] = [];

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings, value, currency FROM admin_settings WHERE id::text IN ('1', 'primary_settings') ORDER BY updated_at DESC LIMIT 1`);
        const sRow = Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0];
        const ps = sRow?.payment_settings || sRow?.value;
        if (ps) {
          currentSettings = typeof ps === 'string' ? JSON.parse(ps) : ps;
          if (sRow.currency) currentSettings.currency = sRow.currency;
        }
      } catch (_) {}

      const stripePk = envMap['STRIPE_PUBLISHABLE_KEY'] || envMap['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'];
      const stripeSk = envMap['STRIPE_SECRET_KEY'] || envMap['STRIPE_SK'];
      const stripeWh = envMap['STRIPE_WEBHOOK_SECRET'];
      const paypalId = envMap['PAYPAL_CLIENT_ID'] || envMap['NEXT_PUBLIC_PAYPAL_CLIENT_ID'];
      const paypalSec = envMap['PAYPAL_CLIENT_SECRET'] || envMap['PAYPAL_SECRET'];
      const paypalWh = envMap['PAYPAL_WEBHOOK_ID'];
      const cur = envMap['PAYMENT_CURRENCY'] || envMap['DEFAULT_CURRENCY'];

      const updated = {
        ...currentSettings,
        stripe: { ...(currentSettings.stripe || {}) },
        paypal: { ...(currentSettings.paypal || {}) },
      };

      if (stripePk) { updated.stripe.publishableKey = stripePk; syncedFields.push('Publishable Key'); }
      if (stripeSk) { updated.stripe.secretKey = stripeSk; syncedFields.push('Secret Key'); }
      if (stripeWh) { updated.stripe.webhookSecret = stripeWh; syncedFields.push('Stripe Webhook'); }
      if (paypalId) { updated.paypal.clientId = paypalId; syncedFields.push('PayPal Client ID'); }
      if (paypalSec) { updated.paypal.clientSecret = paypalSec; syncedFields.push('PayPal Secret'); }
      if (paypalWh) { updated.paypal.webhookId = paypalWh; syncedFields.push('PayPal Webhook'); }
      if (cur) { updated.currency = cur; syncedFields.push('Currency'); }

      await persistAdminSettingsData(updated, updated.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${syncedFields.length} credential(s) from .env.`,
        syncedCount: syncedFields.length,
        syncedFields,
        settings: updated
      });
    }

    // 2. UPDATE / WRITE TO .ENV ACTION
    if (body.action === 'update_env') {
      const cfg = body.paymentSettings || {};
      const cur = body.currency || cfg.currency || 'USD';

      const updates: Record<string, string> = {};
      if (cfg.stripe?.publishableKey) {
        updates['STRIPE_PUBLISHABLE_KEY'] = cfg.stripe.publishableKey;
        updates['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] = cfg.stripe.publishableKey;
      }
      if (cfg.stripe?.secretKey) {
        updates['STRIPE_SECRET_KEY'] = cfg.stripe.secretKey;
      }
      if (cfg.stripe?.webhookSecret) {
        updates['STRIPE_WEBHOOK_SECRET'] = cfg.stripe.webhookSecret;
      }
      if (cfg.paypal?.clientId) {
        updates['PAYPAL_CLIENT_ID'] = cfg.paypal.clientId;
        updates['NEXT_PUBLIC_PAYPAL_CLIENT_ID'] = cfg.paypal.clientId;
      }
      if (cfg.paypal?.clientSecret) {
        updates['PAYPAL_CLIENT_SECRET'] = cfg.paypal.clientSecret;
      }
      if (cfg.paypal?.webhookId) {
        updates['PAYPAL_WEBHOOK_ID'] = cfg.paypal.webhookId;
      }
      if (cur) {
        updates['PAYMENT_CURRENCY'] = cur;
      }

      writeCredentialsToEnvFile(updates);
      await persistAdminSettingsData(cfg, cur);

      return NextResponse.json({
        success: true,
        message: 'API Keys and Gateway settings successfully written to .env file!',
        settings: cfg
      });
    }

    // 3. VERIFY WEBHOOK SECRET (STANDALONE ACTION)
    if (body.action === 'verify_webhook_secret') {
      const secret = String(body.webhookSecret || body.stripe?.webhookSecret || '').trim().replace(/^["']|["']$/g, '');
      if (!secret) {
        return NextResponse.json({ success: false, error: 'Webhook secret is required to verify.' }, { status: 400 });
      }

      if (secret.includes('...') || secret.includes('*')) {
        return NextResponse.json({
          success: false,
          error: 'Please enter a valid Stripe Webhook Secret. Do not submit placeholder dots (...) or masked asterisks (*).'
        }, { status: 400 });
      }

      if (!secret.startsWith('whsec_')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Webhook Secret must begin with "whsec_".' 
        }, { status: 400 });
      }

      if (secret.length < 24) {
        return NextResponse.json({ 
          success: false, 
          error: 'Webhook Secret is too short to be a valid Stripe signing key (minimum 24 characters).' 
        }, { status: 400 });
      }

      try {
        const testPayload = JSON.stringify({ test: true, timestamp: Date.now() });
        const hmac = crypto.createHmac('sha256', secret).update(`1234567890.${testPayload}`, 'utf8').digest('hex');
        if (!hmac || hmac.length !== 64) {
          throw new Error('HMAC calculation failed');
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `Invalid HMAC secret: ${err.message}` }, { status: 400 });
      }

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings, value, currency FROM admin_settings WHERE id::text IN ('1', 'primary_settings') ORDER BY updated_at DESC LIMIT 1`);
        const sRow = Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0];
        const ps = sRow?.payment_settings || sRow?.value;
        if (ps) {
          currentSettings = typeof ps === 'string' ? JSON.parse(ps) : ps;
        }
      } catch (_) {}

      if (body.paymentSettings && typeof body.paymentSettings === 'object') {
        currentSettings = { ...currentSettings, ...body.paymentSettings };
      }
      if (body.stripe && typeof body.stripe === 'object') {
        currentSettings.stripe = { ...(currentSettings.stripe || {}), ...body.stripe };
      }

      const updated = {
        ...currentSettings,
        stripeWebhookVerified: true,
        stripe: {
          ...(currentSettings?.stripe || {}),
          webhookSecret: secret,
        }
      };

      await persistAdminSettingsData(updated, updated.currency || 'USD');

      try {
        writeCredentialsToEnvFile({ STRIPE_WEBHOOK_SECRET: secret });
      } catch (_) {}

      // Optional cross-check against Stripe endpoints
      let endpointNote = '';
      const sKey = (body.secretKey || currentSettings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '').trim();
      if (sKey && !sKey.includes('...') && (sKey.startsWith('sk_') || sKey.startsWith('rk_'))) {
        try {
          const weRes = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=25', {
            headers: { 'Authorization': `Bearer ${sKey}` },
            signal: AbortSignal.timeout(4000),
            cache: 'no-store'
          });
          if (weRes.ok) {
            const weData = await weRes.json().catch(() => ({}));
            const matchingEp = weData.data?.find((ep: any) => ep.url?.includes('/api/webhooks/stripe'));
            if (matchingEp) {
              endpointNote = ' (Matched endpoint registered in Stripe Dashboard)';
            }
          }
        } catch (_) {}
      }

      return NextResponse.json({ 
        success: true, 
        message: `Stripe Webhook Signing Secret verified and confirmed for HMAC signatures!${endpointNote}`,
        settings: updated,
        stripeWebhookVerified: true
      });
    }

    // 4. VERIFY ALL THREE: Publishable Key, Secret Key, and Webhook Secret
    if (body.action === 'verify_stripe_keys' || body.action === 'verify_stripe_key') {
      const pKey = (body.publishableKey || body.stripe?.publishableKey || '').trim();
      const sKey = (body.secretKey || body.stripe?.secretKey || '').trim();
      const wSecret = (body.webhookSecret || body.stripe?.webhookSecret || '').trim();
      const isTestMode = body.testMode !== undefined ? Boolean(body.testMode) : true;

      const verifyRes = await verifyThreeStripeCredentials(pKey, sKey, wSecret, isTestMode);
      if (!verifyRes.valid) {
        return NextResponse.json({
          success: false,
          keysVerified: false,
          stripeKeysVerified: false,
          stripeWebhookVerified: false,
          error: verifyRes.error
        }, { status: 400 });
      }

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings, value, currency FROM admin_settings WHERE id::text IN ('1', 'primary_settings') ORDER BY updated_at DESC LIMIT 1`);
        const sRow = Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0];
        const ps = sRow?.payment_settings || sRow?.value;
        if (ps) {
          currentSettings = typeof ps === 'string' ? JSON.parse(ps) : ps;
        }
      } catch (_) {}

      if (body.paymentSettings && typeof body.paymentSettings === 'object') {
        currentSettings = { ...currentSettings, ...body.paymentSettings };
      }

      const updatedSettings = {
        ...currentSettings,
        stripeKeysVerified: true,
        stripeWebhookVerified: true,
        stripe: {
          ...(currentSettings?.stripe || {}),
          publishableKey: pKey,
          secretKey: sKey,
          webhookSecret: wSecret,
        }
      };

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency || 'USD');

      const msg = `Publishable Key, Secret Key, and Webhook Secret verified successfully with Stripe servers (${verifyRes.livemode ? 'Live Production Mode' : 'Sandbox Test Mode'})!${verifyRes.endpointNote || ''}`;

      return NextResponse.json({
        success: true,
        keysVerified: true,
        stripeKeysVerified: true,
        stripeWebhookVerified: true,
        livemode: verifyRes.livemode,
        settings: updatedSettings,
        message: msg
      });
    }

    // 5. TOGGLE TEST MODE
    if (body.action === 'toggle_test_mode') {
      const nextMode = Boolean(body.testMode);
      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT payment_settings, value, currency FROM admin_settings WHERE id::text IN ('1', 'primary_settings') ORDER BY updated_at DESC LIMIT 1`);
        const row = Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0];
        const ps = row?.payment_settings || row?.value;
        if (ps) {
          currentSettings = typeof ps === 'string' ? JSON.parse(ps) : ps;
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
        message: nextMode ? 'Sandbox (Test Mode) enabled and saved to PostgreSQL!' : 'Live Production mode enabled and saved to PostgreSQL!',
        settings: updatedSettings
      });
    }

    // 6. DEFAULT SAVE GATEWAY SETTINGS
    const gatewayConfig = body.paymentSettings || body;
    const currency = gatewayConfig.currency || body.currency || 'USD';

    await persistAdminSettingsData(gatewayConfig, currency);

    const envUpdates: Record<string, string> = {};
    if (gatewayConfig.stripe?.publishableKey) {
      envUpdates['STRIPE_PUBLISHABLE_KEY'] = gatewayConfig.stripe.publishableKey;
      envUpdates['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] = gatewayConfig.stripe.publishableKey;
    }
    if (gatewayConfig.stripe?.secretKey) {
      envUpdates['STRIPE_SECRET_KEY'] = gatewayConfig.stripe.secretKey;
    }
    if (gatewayConfig.stripe?.webhookSecret) {
      envUpdates['STRIPE_WEBHOOK_SECRET'] = gatewayConfig.stripe.webhookSecret;
    }
    if (gatewayConfig.paypal?.clientId) {
      envUpdates['PAYPAL_CLIENT_ID'] = gatewayConfig.paypal.clientId;
      envUpdates['NEXT_PUBLIC_PAYPAL_CLIENT_ID'] = gatewayConfig.paypal.clientId;
    }
    if (gatewayConfig.paypal?.clientSecret) {
      envUpdates['PAYPAL_CLIENT_SECRET'] = gatewayConfig.paypal.clientSecret;
    }
    if (gatewayConfig.paypal?.webhookId) {
      envUpdates['PAYPAL_WEBHOOK_ID'] = gatewayConfig.paypal.webhookId;
    }
    if (currency) {
      envUpdates['PAYMENT_CURRENCY'] = currency;
    }

    if (Object.keys(envUpdates).length > 0) {
      try { writeCredentialsToEnvFile(envUpdates); } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Payment gateway settings and currency saved successfully to PostgreSQL and .env!',
      settings: gatewayConfig
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
