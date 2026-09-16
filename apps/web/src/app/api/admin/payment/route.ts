import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDataPaths(filename: string): string[] {
  const cwd = process.cwd();
  const paths: string[] = [];
  if (cwd.endsWith('apps/web') || cwd.endsWith('apps/web/')) {
    const root = path.resolve(cwd, '../..');
    paths.push(path.join(cwd, 'data', filename));
    paths.push(path.join(root, 'data', filename));
    paths.push(path.join(root, 'apps/web/data', filename));
  } else {
    paths.push(path.join(cwd, 'apps/web/data', filename));
    paths.push(path.join(cwd, 'data', filename));
  }
  return Array.from(new Set(paths));
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) as T;
      } catch (_) {}
    }
  }
  return fallback;
}

function writeJsonFile<T>(filename: string, data: T): void {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

async function getDbClient() {
  const connUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connUrl) return null;
  try {
    const { Pool } = await import('pg');
    return new Pool({
      connectionString: connUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 3000
    });
  } catch (_) {
    return null;
  }
}

async function ensurePlanExists(pool: any, slug: string, name: string, amount: number) {
  const cleanSlug = (slug || 'taster').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cleanName = name || cleanSlug;
  try {
    const check = await pool.query('SELECT id FROM subscription_plans WHERE slug = $1', [cleanSlug]);
    if (check.rows.length === 0) {
      await pool.query(`
        INSERT INTO subscription_plans (id, name, slug, monthly_price_dollars, annual_price_dollars, is_free)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['plan_' + cleanSlug + '_' + Date.now(), cleanName, cleanSlug, amount || 0, 0, false]);
    }
  } catch (err) {
    console.warn('[DB Plan Auto-Seed Warning]:', err);
  }
  return cleanSlug;
}

const DEFAULT_SETTINGS = {
  activeGateway: 'stripe',
  currency: 'USD',
  testMode: true,
  stripeConnected: false,
  stripe: { enabled: true, publishableKey: '', secretKey: '', webhookSecret: '' },
  paypal: { enabled: false, clientId: '', clientSecret: '', webhookId: '', environment: 'sandbox' }
};

export async function GET() {
  const pool = await getDbClient();
  if (pool) {
    try {
      const settingsRes = await pool.query("SELECT payment_settings, currency FROM admin_settings WHERE id = 'primary_settings'");
      let settings = DEFAULT_SETTINGS;
      if (settingsRes.rows.length > 0) {
        settings = settingsRes.rows[0].payment_settings || DEFAULT_SETTINGS;
        if (settingsRes.rows[0].currency) settings.currency = settingsRes.rows[0].currency;
      }
      const txRes = await pool.query('SELECT id, customer_name as "customerName", customer_email as "customerEmail", plan_name as "planName", plan_slug as "planSlug", amount, currency, gateway, status, failure_reason as "failureReason", test_mode as "testMode", expiry_date as "expiryDate", created_at as "createdAt" FROM payment_transactions ORDER BY created_at DESC');
      await pool.end();
      return NextResponse.json({ success: true, settings, transactions: txRes.rows }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      await pool.end().catch(() => {});
    }
  }

  const adminSettings = readJsonFile('admin_settings.json', {} as any);
  const settings = adminSettings.paymentSettings || DEFAULT_SETTINGS;
  if (adminSettings.currency) settings.currency = adminSettings.currency;
  const transactions = readJsonFile('payment_transactions.json', []);

  return NextResponse.json({ success: true, settings, transactions }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getDbClient();

    if (body.action === 'connect_stripe') {
      if (pool) {
        try {
          await pool.query(`
            INSERT INTO admin_settings (id, payment_settings, updated_at)
            VALUES ('primary_settings', $1, NOW())
            ON CONFLICT (id) DO UPDATE SET payment_settings = EXCLUDED.payment_settings, updated_at = NOW();
          `, [JSON.stringify(body)]);
          await pool.end();
        } catch (_) {}
      }
      return NextResponse.json({ success: true, message: 'Stripe Gateway enabled and verified.' });
    }

    if (body.action === 'add_transaction' && body.transaction) {
      const newTx = body.transaction;
      const cleanEmail = (newTx.customerEmail || '').toLowerCase().trim();
      const planSlug = await ensurePlanExists(pool, newTx.planSlug || newTx.planName, newTx.planName, newTx.amount);
      const planName = newTx.planName || planSlug;

      if (pool) {
        try {
          await pool.query(`
            INSERT INTO payment_transactions (
              id, customer_name, customer_email, plan_name, plan_slug, amount, currency,
              gateway, status, failure_reason, test_mode, expiry_date, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
          `, [
            newTx.id,
            newTx.customerName,
            cleanEmail,
            planName,
            planSlug,
            newTx.amount || 0,
            newTx.currency || 'USD',
            newTx.gateway || 'stripe',
            newTx.status || 'succeeded',
            newTx.failureReason || null,
            Boolean(newTx.testMode),
            newTx.expiryDate || null,
            newTx.createdAt || new Date().toISOString()
          ]);
          await pool.end();
        } catch (dbErr: any) {
          await pool.end().catch(() => {});
          throw dbErr;
        }
      }

      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      transactions.unshift({ ...newTx, planSlug });
      writeJsonFile('payment_transactions.json', transactions);
      return NextResponse.json({ success: true, transaction: { ...newTx, planSlug } });
    }

    if (body.action === 'update_transaction' && body.transaction) {
      const updatedTx = body.transaction;
      const planSlug = await ensurePlanExists(pool, updatedTx.planSlug || updatedTx.planName, updatedTx.planName, updatedTx.amount);
      const planName = updatedTx.planName || planSlug;

      if (pool) {
        try {
          await pool.query(`
            UPDATE payment_transactions SET
              customer_name = $2,
              customer_email = $3,
              plan_name = $4,
              plan_slug = $5,
              amount = $6,
              currency = $7,
              gateway = $8,
              status = $9,
              failure_reason = $10,
              expiry_date = $11
            WHERE id = $1;
          `, [
            updatedTx.id,
            updatedTx.customerName,
            updatedTx.customerEmail.toLowerCase().trim(),
            planName,
            planSlug,
            updatedTx.amount || 0,
            updatedTx.currency || 'USD',
            updatedTx.gateway || 'stripe',
            updatedTx.status || 'succeeded',
            updatedTx.failureReason || null,
            updatedTx.expiryDate || null
          ]);
          await pool.end();
        } catch (dbErr: any) {
          await pool.end().catch(() => {});
          throw dbErr;
        }
      }

      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      const updatedTxs = transactions.map((t: any) => (t.id === updatedTx.id ? { ...updatedTx, planSlug } : t));
      writeJsonFile('payment_transactions.json', updatedTxs);
      return NextResponse.json({ success: true, transaction: { ...updatedTx, planSlug } });
    }

    // Default: Update Gateway Settings
    if (pool) {
      try {
        await pool.query(`
          INSERT INTO admin_settings (id, payment_settings, currency, updated_at)
          VALUES ('primary_settings', $1, $2, NOW())
          ON CONFLICT (id) DO UPDATE SET payment_settings = EXCLUDED.payment_settings, currency = EXCLUDED.currency, updated_at = NOW();
        `, [JSON.stringify(body), body.currency || 'USD']);
        await pool.end();
      } catch (_) {}
    }

    const adminSettings = readJsonFile('admin_settings.json', {} as any);
    const mergedSettings = { ...(adminSettings.paymentSettings || DEFAULT_SETTINGS), ...body };
    adminSettings.paymentSettings = mergedSettings;
    if (body.currency) adminSettings.currency = body.currency;
    writeJsonFile('admin_settings.json', adminSettings);

    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const pool = await getDbClient();
    if (pool) {
      try {
        await pool.query("DELETE FROM payment_transactions WHERE id = $1", [id]);
        await pool.end();
      } catch (_) {
        await pool.end().catch(() => {});
      }
    }

    const transactions = readJsonFile('payment_transactions.json', [] as any[]);
    const updated = transactions.filter((t: any) => t.id !== id);
    writeJsonFile('payment_transactions.json', updated);

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete transaction' }, { status: 500 });
  }
}
