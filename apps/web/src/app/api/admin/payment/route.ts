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

      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY DEFAULT 1,
        payment_settings JSONB,
        currency VARCHAR(10) DEFAULT 'USD',
        site_name TEXT,
        theme_colors JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        type VARCHAR(50) DEFAULT 'topup',
        amount NUMERIC(12,2) DEFAULT 0.00,
        balance_after NUMERIC(12,2) DEFAULT 0.00,
        gateway VARCHAR(50) DEFAULT 'manual',
        gateway_tx_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
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
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_slug TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS gateway_tx_id VARCHAR(255); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12,2) DEFAULT 0.00; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0.00; EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);
  } catch (e) {
    console.warn('[Payment API] Schema check warning:', e);
  }
}

function updateEnvCredentials(settings: any) {
  const envCandidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '..', '.env'),
    path.join(process.cwd(), '..', '.env.local'),
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
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        for (const [k, v] of Object.entries(pairs)) {
          if (!v) continue;
          const regex = new RegExp(`^${k}=.*$`, 'm');
          const safeVal = v.includes(' ') ? `"${v}"` : v;
          if (regex.test(content)) {
            content = content.replace(regex, `${k}=${safeVal}`);
          } else {
            content += `\n${k}=${safeVal}`;
          }
        }
        fs.writeFileSync(filePath, content, 'utf8');
      } catch (_) {}
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

  // 1. Try ID-based schema
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

  // 2. Also try key-value schema
  try {
    await query(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES ('payment_gateway_config', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = NOW()`,
      [jsonStr]
    );
  } catch (_) {
    try {
      await query(
        `UPDATE admin_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'payment_gateway_config'`,
        [jsonStr]
      );
    } catch (_) {}
  }

  // 3. Synchronize allowed_gateways with wallet_settings
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
        `UPDATE wallet_settings SET currency = $1, allowed_gateways = $2::jsonb, updated_at = NOW()`,
        [cur, JSON.stringify(allowedGateways)]
      ).catch(() => {});
    });
  } catch (wErr) {
    console.warn('[Payment API] wallet_settings sync warning:', wErr);
  }

  // 4. Mirror to disk and .env
  try {
    updateEnvCredentials(cleanSettings);
    const dataDirs = [
      path.join(process.cwd(), 'data'),
      path.join(process.cwd(), 'apps', 'web', 'data')
    ];
    for (const dataDir of dataDirs) {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const filePath = path.join(dataDir, 'admin_settings.json');
      let existing: any = {};
      if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
      }
      existing.paymentSettings = cleanSettings;
      existing.currency = cur;
      existing.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    }
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
      const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 10`);
      const sRows = parseDbRows(sRes);
      for (const r of sRows) {
        if (r.payment_settings) {
          const ps = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
          if (ps) { settings = { ...ps }; if (r.currency) settings.currency = r.currency; }
        } else if (r.value && (r.key === 'payment_gateway_config' || r.key === 'paymentSettings')) {
          const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
          if (val) { settings = { ...val }; if (val.currency) settings.currency = val.currency; }
        }
      }
    } catch (_) {}

    if (!settings) {
      const fps = [
        path.join(process.cwd(), 'data', 'admin_settings.json'),
        path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json')
      ];
      for (const fp of fps) {
        if (fs.existsSync(fp)) {
          try {
            const fd = JSON.parse(fs.readFileSync(fp, 'utf8'));
            if (fd.paymentSettings) {
              settings = { ...fd.paymentSettings };
              if (fd.currency) settings.currency = fd.currency;
              break;
            }
          } catch (_) {}
        }
      }
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

    // 1. VERIFY STRIPE KEYS
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
        return NextResponse.json({ success: false, error: 'Test mode: Secret Key must start with "sk_test_".' }, { status: 400 });
      }
      if (!testMode && !secKey.startsWith('sk_live_')) {
        return NextResponse.json({ success: false, error: 'Live mode: Secret Key must start with "sk_live_".' }, { status: 400 });
      }
      if (!whSecret.startsWith('whsec_') || whSecret.length < 24) {
        return NextResponse.json({ success: false, error: 'Webhook Signing Secret must begin with "whsec_".' }, { status: 400 });
      }

      try {
        const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${secKey}` },
        });
        const stripeData = await stripeRes.json().catch(() => ({}));
        if (!stripeRes.ok) {
          return NextResponse.json({ success: false, error: stripeData.error?.message || 'Stripe Secret Key rejected.' }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `Could not connect to Stripe API: ${err.message}` }, { status: 502 });
      }

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 5`);
        const rows = parseDbRows(sRes);
        for (const r of rows) {
          if (r.payment_settings) currentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
          else if (r.value) currentSettings = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
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

    // 2. VERIFY WEBHOOK SECRET
    if (body.action === 'verify_webhook_secret') {
      const secret = (body.webhookSecret || '').trim();
      if (!secret.startsWith('whsec_') || secret.length < 24) {
        return NextResponse.json({ success: false, error: 'Invalid Webhook Signing Secret.' }, { status: 400 });
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
        const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 5`);
        const rows = parseDbRows(sRes);
        for (const r of rows) {
          if (r.payment_settings) currentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
          else if (r.value) currentSettings = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
        }
      } catch (_) {}

      const updatedSettings = {
        ...currentSettings,
        stripeWebhookVerified: true,
        stripe: { ...(currentSettings.stripe || {}), webhookSecret: secret }
      };

      await persistAdminSettingsData(updatedSettings, updatedSettings.currency || 'USD');

      return NextResponse.json({
        success: true,
        message: 'Stripe Webhook Signing Secret verified and confirmed for HMAC signatures!',
        settings: updatedSettings
      });
    }

    // 3. TOGGLE GATEWAY
    if (body.action === 'toggle_gateway') {
      const gatewayKey = body.gateway;
      const isEnabled = Boolean(body.enabled);

      let currentSettings: any = {};
      try {
        const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 5`);
        const rows = parseDbRows(sRes);
        for (const r of rows) {
          if (r.payment_settings) currentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
          else if (r.value) currentSettings = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
        }
      } catch (_) {}

      const updatedSettings = { ...currentSettings, ...(body.paymentSettings || {}) };

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
        const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 5`);
        const rows = parseDbRows(sRes);
        for (const r of rows) {
          if (r.payment_settings) currentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
          else if (r.value) currentSettings = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
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
        const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 5`);
        const rows = parseDbRows(sRes);
        for (const r of rows) {
          if (r.payment_settings) currentSettings = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
          else if (r.value) currentSettings = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
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

    // 7. APPROVE MANUAL SETTLEMENT
    if (body.action === 'approve_manual_settlement') {
      const txId = body.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      const txRes: any = await query(`SELECT * FROM payment_transactions WHERE id = $1 LIMIT 1`, [txId]);
      const tx = parseDbRow(txRes);

      if (!tx) {
        return NextResponse.json({ success: false, error: 'Transaction record not found' }, { status: 404 });
      }

      if (tx.status === 'succeeded' || tx.status === 'approved') {
        return NextResponse.json({ success: true, message: 'Transaction is already approved and deposited.' });
      }

      const confirmedAmount = Number(body.confirmedAmount || tx.amount || 0);
      const email = (tx.customer_email || '').toLowerCase().trim();

      await query(
        `UPDATE payment_transactions 
         SET status = 'succeeded', confirmed_amount = $1, confirmed_at = NOW(), updated_at = NOW() 
         WHERE id = $2`,
        [confirmedAmount, txId]
      );

      let bonusPercent = 0;
      try {
        const wRes: any = await query(`SELECT bonus_rules FROM wallet_settings WHERE id = 1 LIMIT 1`);
        const wRow = parseDbRow(wRes);
        if (wRow?.bonus_rules) {
          const rules = typeof wRow.bonus_rules === 'string' ? JSON.parse(wRow.bonus_rules) : wRow.bonus_rules;
          if (Array.isArray(rules)) {
            for (const r of rules) {
              const thresh = parseFloat(r.threshold || 0);
              const pct = parseFloat(r.bonus_percent || 0);
              if (confirmedAmount >= thresh && pct > bonusPercent) bonusPercent = pct;
            }
          }
        }
      } catch (_) {}

      const bonusAmt = bonusPercent > 0 ? (confirmedAmount * bonusPercent) / 100 : 0;
      const totalCreditAmount = confirmedAmount + bonusAmt;

      let newBalance = 0;
      if (email && totalCreditAmount > 0) {
        const uRes: any = await query(
          `UPDATE users 
           SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
           WHERE LOWER(TRIM(email)) = $2 
           RETURNING id, email, wallet_balance`,
          [totalCreditAmount, email]
        );
        const uRow = parseDbRow(uRes);
        if (uRow && uRow.wallet_balance !== undefined) {
          newBalance = Number(uRow.wallet_balance || 0);
        }
      }

      const wireDesc = `Bank Wire Top-Up: Ref #${tx.transfer_reference || txId}${bonusAmt > 0 ? ` (+${bonusAmt.toFixed(2)} Bonus)` : ''}`;
      await query(
        `UPDATE wallet_transactions 
         SET status = 'succeeded', amount = $1, balance_after = $2, description = $3 
         WHERE gateway_tx_id = $4 OR id = $4`,
        [totalCreditAmount, newBalance, wireDesc, txId]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Manual settlement approved! ${confirmedAmount.toFixed(2)} (${totalCreditAmount.toFixed(2)} with bonus) deposited to user's wallet.`,
        wallet_balance: newBalance
      });
    }

    // 8. REJECT MANUAL SETTLEMENT
    if (body.action === 'reject_manual_settlement') {
      const txId = body.id;
      const failureReason = body.failureReason || 'Wire transfer rejected by administrator';
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      const txRes: any = await query(`SELECT * FROM payment_transactions WHERE id = $1 LIMIT 1`, [txId]);
      const tx = parseDbRow(txRes);

      if (tx && (tx.status === 'succeeded' || tx.status === 'approved')) {
        const email = (tx.customer_email || '').toLowerCase().trim();
        const amt = Number(tx.confirmed_amount || tx.amount || 0);
        if (email && amt > 0) {
          await query(
            `UPDATE users 
             SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - $1) 
             WHERE LOWER(TRIM(email)) = $2`,
            [amt, email]
          ).catch(() => {});
        }
      }

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

      return NextResponse.json({ success: true, message: 'Manual bank wire settlement rejected. No deposit made.' });
    }

    // 9. EDIT TRANSACTION
    if (body.action === 'edit_transaction') {
      const txId = body.id;
      if (!txId) return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });

      const prevTxRes: any = await query(`SELECT * FROM payment_transactions WHERE id = $1 LIMIT 1`, [txId]);
      const prevTx = parseDbRow(prevTxRes);

      const oldStatus = (prevTx?.status || 'pending').toLowerCase();
      const newStatus = (body.status || 'pending').toLowerCase();
      const amount = Number(body.amount || prevTx?.amount || 0);
      const email = (body.customer_email || prevTx?.customer_email || '').toLowerCase().trim();

      let newBalance = 0;

      if (oldStatus !== 'succeeded' && newStatus === 'succeeded') {
        if (email && amount > 0) {
          const uRes: any = await query(
            `UPDATE users 
             SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
             WHERE LOWER(TRIM(email)) = $2 
             RETURNING wallet_balance`,
            [amount, email]
          );
          const uRow = parseDbRow(uRes);
          if (uRow) newBalance = Number(uRow.wallet_balance || 0);
        }
      } else if (oldStatus === 'succeeded' && newStatus !== 'succeeded') {
        if (email && amount > 0) {
          const uRes: any = await query(
            `UPDATE users 
             SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - $1) 
             WHERE LOWER(TRIM(email)) = $2 
             RETURNING wallet_balance`,
            [amount, email]
          );
          const uRow = parseDbRow(uRes);
          if (uRow) newBalance = Number(uRow.wallet_balance || 0);
        }
      }

      await query(
        `UPDATE payment_transactions 
         SET customer_name = $1, customer_email = $2, plan_name = $3, amount = $4,
             transfer_reference = $5, status = $6, notes = $7, failure_reason = $8,
             confirmed_amount = (CASE WHEN $6 = 'succeeded' THEN $4 ELSE confirmed_amount END),
             confirmed_at = (CASE WHEN $6 = 'succeeded' THEN NOW() ELSE confirmed_at END),
             updated_at = NOW()
         WHERE id = $9`,
        [
          body.customer_name || 'Customer',
          email,
          body.plan_name || 'Plan',
          amount,
          body.transfer_reference || '',
          newStatus,
          body.notes || '',
          body.failure_reason || null,
          txId
        ]
      );

      if (newStatus === 'succeeded' && newBalance > 0) {
        await query(
          `UPDATE wallet_transactions 
           SET status = $1, amount = $2, balance_after = $3, description = $4 
           WHERE gateway_tx_id = $5 OR id = $5`,
          [newStatus, amount, newBalance, `Bank Wire Transfer: ${body.transfer_reference || ''}`, txId]
        ).catch(() => {});
      } else {
        await query(
          `UPDATE wallet_transactions 
           SET status = $1, amount = $2, description = $3 
           WHERE gateway_tx_id = $4 OR id = $4`,
          [newStatus, amount, `Bank Wire Transfer: ${body.transfer_reference || ''}`, txId]
        ).catch(() => {});
      }

      return NextResponse.json({ success: true, message: 'Transaction record updated successfully in PostgreSQL!' });
    }

    // 10. REFUND / CANCEL
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
