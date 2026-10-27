import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

let pgPool: Pool | null = null;
function getPgPool(): Pool | null {
  if (pgPool) return pgPool;
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) return null;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cleanConn = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  pgPool = new Pool({ connectionString: cleanConn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  return pgPool;
}

const DEFAULT_GATEWAY_CONFIG = {
  currency: 'USD',
  testMode: true,
  stripeConnected: true,
  stripeKeysVerified: true,
  stripeWebhookVerified: false,
  stripe: {
    enabled: true,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  },
  paypal: {
    enabled: true,
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    environment: 'sandbox'
  },
  manualSettlement: {
    enabled: true,
    bankName: 'Bangkok Bank / Kasikornbank',
    accountName: 'Zecratary Platform Co., Ltd.',
    accountNumber: '123-4-56789-0',
    routingNumber: '002',
    swiftBic: 'BKKBTHBK',
    instructions: 'Please transfer via PromptPay or Bank Wire. Include Reference ID in transfer note.',
    requireApproval: true
  }
};

function readFallbackSettings(): any {
  const paths = [
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'data', 'admin_settings.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      } catch (e) {}
    }
  }
  return {};
}

function writeFallbackSettings(updated: any): void {
  const paths = [
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'data', 'admin_settings.json')
  ];
  for (const p of paths) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf8');
    } catch (e) {}
  }
}

export async function GET() {
  try {
    let currentConfig = { ...DEFAULT_GATEWAY_CONFIG };
    let settlements: any[] = [];
    const pool = getPgPool();

    if (pool) {
      try {
        const res = await pool.query(
          "SELECT payment_settings FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;"
        );
        if (res.rows?.[0]?.payment_settings) {
          const raw = typeof res.rows[0].payment_settings === 'string'
            ? JSON.parse(res.rows[0].payment_settings)
            : res.rows[0].payment_settings;
          currentConfig = {
            ...currentConfig,
            ...raw,
            stripe: { ...currentConfig.stripe, ...(raw.stripe || {}) },
            paypal: { ...currentConfig.paypal, ...(raw.paypal || {}) },
            manualSettlement: { ...currentConfig.manualSettlement, ...(raw.manualSettlement || {}) }
          };
        }

        const settleRes = await pool.query(`
          SELECT 
            id, customer_name, customer_email, plan_name, plan_slug, 
            amount, currency, gateway, status, created_at, transfer_reference, notes
          FROM payment_transactions
          WHERE gateway ILIKE '%manual%' OR gateway ILIKE '%promptpay%' OR gateway ILIKE '%wire%' OR transfer_reference IS NOT NULL
          ORDER BY created_at DESC LIMIT 100;
        `);
        settlements = settleRes.rows || [];
      } catch (err: any) {
        console.warn('GET /api/admin/payment-gateway pg notice:', err.message);
      }
    }

    if (settlements.length === 0) {
      const fileSettings = readFallbackSettings();
      if (fileSettings.payment_settings) {
        currentConfig = {
          ...currentConfig,
          ...fileSettings.payment_settings,
          stripe: { ...currentConfig.stripe, ...(fileSettings.payment_settings.stripe || {}) },
          paypal: { ...currentConfig.paypal, ...(fileSettings.payment_settings.paypal || {}) },
          manualSettlement: { ...currentConfig.manualSettlement, ...(fileSettings.payment_settings.manualSettlement || {}) }
        };
      }
      if (Array.isArray(fileSettings.manual_settlements)) {
        settlements = fileSettings.manual_settlements;
      }
    }

    return NextResponse.json({
      success: true,
      gatewayConfig: currentConfig,
      settlements
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, gatewayConfig, secretKey, id } = body;
    const pool = getPgPool();

    // 1. Verify Stripe credentials
    if (action === 'verify_stripe') {
      const testKey = secretKey || gatewayConfig?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
      if (!testKey) {
        return NextResponse.json({ success: false, verified: false, error: 'No Stripe Secret Key provided.' }, { status: 400 });
      }
      try {
        const verifyRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${testKey.trim()}` }
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok && !verifyData.error) {
          return NextResponse.json({ success: true, verified: true });
        }
        return NextResponse.json({ success: false, verified: false, error: verifyData.error?.message || 'Invalid Stripe Secret Key' }, { status: 400 });
      } catch (err: any) {
        return NextResponse.json({ success: false, verified: false, error: err.message }, { status: 500 });
      }
    }

    // 2. Sync credentials from .env
    if (action === 'sync_env') {
      const synced = {
        stripe: {
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
        },
        paypal: {
          clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
          clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
          webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
        }
      };
      return NextResponse.json({ success: true, gatewayConfig: synced });
    }

    // 3. Save gateway configuration
    if (action === 'save_config') {
      if (!gatewayConfig) {
        return NextResponse.json({ success: false, error: 'Missing gatewayConfig' }, { status: 400 });
      }

      const allowedGateways: string[] = [];
      if (gatewayConfig.stripe?.enabled) allowedGateways.push('stripe');
      if (gatewayConfig.paypal?.enabled) allowedGateways.push('paypal');
      if (gatewayConfig.manualSettlement?.enabled) allowedGateways.push('manual');

      if (pool) {
        try {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_settings (
              id VARCHAR(50) PRIMARY KEY DEFAULT 'primary_settings',
              payment_settings JSONB DEFAULT '{}'::jsonb,
              translations JSONB DEFAULT '{}'::jsonb,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);

          await pool.query(`
            INSERT INTO admin_settings (id, payment_settings, updated_at)
            VALUES ('primary_settings', $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
              payment_settings = EXCLUDED.payment_settings,
              updated_at = NOW();
          `, [JSON.stringify(gatewayConfig)]);

          // Also synchronize wallet_settings.allowed_gateways for /wallet
          await pool.query(`
            CREATE TABLE IF NOT EXISTS wallet_settings (
              id VARCHAR(50) PRIMARY KEY DEFAULT 'primary',
              allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]'::jsonb,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);

          await pool.query(`
            INSERT INTO wallet_settings (id, allowed_gateways, updated_at)
            VALUES ('primary', $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
              allowed_gateways = EXCLUDED.allowed_gateways,
              updated_at = NOW();
          `, [JSON.stringify(allowedGateways)]);
        } catch (err: any) {
          console.warn('POST save_config pg notice:', err.message);
        }
      }

      // Sync local JSON
      const fileSettings = readFallbackSettings();
      fileSettings.payment_settings = gatewayConfig;
      fileSettings.allowed_gateways = allowedGateways;
      writeFallbackSettings(fileSettings);

      return NextResponse.json({ success: true });
    }

    // 4. Approve manual bank settlement (with automatic balance/plan credit)
    if (action === 'approve_settlement' && id) {
      if (pool) {
        try {
          const itemRes = await pool.query(
            "SELECT * FROM payment_transactions WHERE id::text = $1 LIMIT 1;",
            [String(id)]
          );
          const item = itemRes.rows?.[0];
          const email = item?.customer_email;
          const amt = Number(item?.amount || 0);
          const planSlug = item?.plan_slug || '';

          await pool.query(
            "UPDATE payment_transactions SET status = 'succeeded', confirmed_at = NOW() WHERE id::text = $1;",
            [String(id)]
          );

          if (email && amt > 0) {
            if (planSlug === 'wallet_topup') {
              await pool.query(
                "UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE email = $2;",
                [amt, email]
              );
              await pool.query(`
                INSERT INTO wallet_transactions (id, email, type, amount, status, description, created_at)
                VALUES ($1, $2, 'topup', $3, 'succeeded', 'Manual Bank Settlement Approved', NOW())
                ON CONFLICT (id) DO NOTHING;
              `, [`tx_${Date.now()}`, email, amt]);
            } else if (planSlug) {
              await pool.query(
                "UPDATE users SET plan_slug = $1, plan_status = 'active', updated_at = NOW() WHERE email = $2;",
                [planSlug, email]
              );
            }
          }
        } catch (err: any) {
          console.warn('POST approve_settlement pg notice:', err.message);
        }
      }
      return NextResponse.json({ success: true });
    }

    // 5. Reject manual bank settlement
    if (action === 'reject_settlement' && id) {
      if (pool) {
        try {
          await pool.query(
            "UPDATE payment_transactions SET status = 'failed' WHERE id::text = $1;",
            [String(id)]
          );
        } catch (err: any) {
          console.warn('POST reject_settlement pg notice:', err.message);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
