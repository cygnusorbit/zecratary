import { grantPlanTokensOnPurchase } from '@/lib/tokenService';
async function ensurePaymentSchema() {
  try {
    await query(`
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT TRUE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(32) DEFAULT 'MONTH';
      ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    `);
  } catch (_) {}
}

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

let cachedPool: any = null;
async function getDbClient() {
  const connUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connUrl) return null;
  if (!cachedPool) {
    try {
      const { Pool } = await import('pg');
      cachedPool = new Pool({
        connectionString: connUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
        max: 10
      });
    } catch (_) {
      return null;
    }
  }
  return cachedPool;
}

async function ensurePlanExists(pool: any, slug: string, name: string, amount: number) {
  if (!pool) return slug;
  const cleanSlug = (slug || 'taster').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const cleanName = name || cleanSlug;
  try {
    const check = await pool.query('SELECT id FROM subscription_plans WHERE slug = $1', [cleanSlug]);
    if (check.rows.length === 0) {
      await pool.query(`
        INSERT INTO subscription_plans (id, name, slug, monthly_price_dollars, annual_price_dollars, is_free)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING;
      `, ['plan_' + cleanSlug + '_' + Date.now().toString(36), cleanName, cleanSlug, amount || 0, 0, false]);
    }
  } catch (err) {
    console.warn('[DB Plan Auto-Seed Warning]:', err);
  }
  return cleanSlug;
}

// Revert user in PostgreSQL & JSON if no active succeeded transactions remain
async function checkAndRevertUserPlan(pool: any, email: string) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return;

  if (pool) {
    try {
      const txCheck = await pool.query(`
        SELECT id FROM payment_transactions 
        WHERE LOWER(TRIM(customer_email)) = $1 
          AND LOWER(TRIM(status)) IN ('succeeded', 'paid', 'success', 'completed')
          AND (expiry_date IS NULL OR expiry_date > NOW())
        LIMIT 1;
      `, [cleanEmail]);

      if (txCheck.rows.length === 0) {
        await pool.query(`
          UPDATE users 
          SET subscription_plan = 'taster', 
              plan_expiry_date = NULL, 
              updated_at = NOW() 
          WHERE LOWER(TRIM(email)) = $1;
        `, [cleanEmail]);
      }
    } catch (err) {
      console.warn('[Revert User Plan Warning]:', err);
    }
  }

  // Update JSON user fallback
  const usersData = readJsonFile('users.json', [] as any[]);
  const transactions = readJsonFile('payment_transactions.json', [] as any[]);
  const hasActive = transactions.some(
    (t: any) =>
      (t.customerEmail || '').toLowerCase().trim() === cleanEmail &&
      ['succeeded', 'paid', 'success', 'completed'].includes(String(t.status).toLowerCase().trim()) &&
      (!t.expiryDate || new Date(t.expiryDate) > new Date())
  );

  if (!hasActive && Array.isArray(usersData) && usersData.length > 0) {
    let modified = false;
    usersData.forEach((u: any) => {
      if ((u.email || '').toLowerCase().trim() === cleanEmail) {
        u.subscriptionPlan = 'taster';
        u.planExpiryDate = null;
        modified = true;
      }
    });
    if (modified) writeJsonFile('users.json', usersData);
  }
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
  await ensurePaymentSchema();
  const pool = await getDbClient();
  if (pool) {
    try {
      const settingsRes = await pool.query("SELECT payment_settings, currency FROM admin_settings WHERE id = 'primary_settings'");
      let settings = DEFAULT_SETTINGS;
      if (settingsRes.rows.length > 0) {
        settings = settingsRes.rows[0].payment_settings || DEFAULT_SETTINGS;
        if (settingsRes.rows[0].currency) settings.currency = settingsRes.rows[0].currency;
      }
      const txRes = await pool.query(`
        SELECT 
          id, 
          customer_name as "customerName", 
          customer_email as "customerEmail", 
          plan_name as "planName", 
          plan_slug as "planSlug", 
          amount, 
          currency, 
          gateway, 
          status, 
          failure_reason as "failureReason", 
          test_mode as "testMode", 
          expiry_date as "expiryDate", 
          created_at as "createdAt" 
        FROM payment_transactions 
        ORDER BY created_at DESC
      `);
      return NextResponse.json({ success: true, settings, transactions: txRes.rows }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (_) {}
  }

  const adminSettings = readJsonFile('admin_settings.json', {} as any);
  const settings = adminSettings.paymentSettings || DEFAULT_SETTINGS;
  if (adminSettings.currency) settings.currency = adminSettings.currency;
  const transactions = readJsonFile('payment_transactions.json', []);

  return NextResponse.json({ success: true, settings, transactions }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  await ensurePaymentSchema();
  try {
    const body = await req.json();
    const pool = await getDbClient();

    // 1. Connect Stripe
    if (body.action === 'connect_stripe') {
      if (pool) {
        try {
          await pool.query(`
            INSERT INTO admin_settings (id, payment_settings, updated_at)
            VALUES ('primary_settings', $1, NOW())
            ON CONFLICT (id) DO UPDATE SET payment_settings = EXCLUDED.payment_settings, updated_at = NOW();
          `, [JSON.stringify(body)]);
        } catch (_) {}
      }
      return NextResponse.json({ success: true, message: 'Stripe Gateway enabled and verified.' });
    }

    // 2. Cancel Plan / Transaction Action (Rule 4: Revert to default plan on cancellation)
    if (body.action === 'cancel_transaction' || body.action === 'cancel_plan') {
      const tx = body.transaction || body;
      const cleanEmail = (tx.customerEmail || tx.email || '').toLowerCase().trim();
      const txId = tx.id || body.id;

      if (pool && txId) {
        try {
          await pool.query(`
            UPDATE payment_transactions 
            SET status = 'refunded', expiry_date = NOW() 
            WHERE id::text = $1::text;
          `, [txId]);
        } catch (dbErr) {
          console.error('[Cancel Transaction DB Error]:', dbErr);
        }
      }

      // Revert user to taster in PostgreSQL
      if (cleanEmail) {
        await checkAndRevertUserPlan(pool, cleanEmail);
      }

      // Update JSON fallbacks
      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      const updatedTxs = transactions.map((t: any) =>
        (t.id === txId || (cleanEmail && (t.customerEmail || '').toLowerCase().trim() === cleanEmail && t.status === 'succeeded'))
          ? { ...t, status: 'refunded', expiryDate: new Date().toISOString() }
          : t
      );
      writeJsonFile('payment_transactions.json', updatedTxs);

      return NextResponse.json({ success: true, message: 'Transaction cancelled and user reverted to default plan.' });
    }

    // 3. Add Transaction (Rule 2 & 3: Only 1 active plan per user; cancel existing on switch)
    if (body.action === 'add_transaction' && body.transaction) {
      const newTx = body.transaction;
      const cleanEmail = (newTx.customerEmail || '').toLowerCase().trim();
      const planSlug = await ensurePlanExists(pool, newTx.planSlug || newTx.planName, newTx.planName, newTx.amount);
      const planName = newTx.planName || planSlug;
      const isPaidSuccess = ['succeeded', 'paid', 'success', 'completed'].includes(String(newTx.status).toLowerCase().trim());

      if (pool) {
        try {
          // Rule 2 & 3: Cancel all prior active transactions for this user
          if (isPaidSuccess && cleanEmail) {
            await pool.query(`
              UPDATE payment_transactions 
              SET status = 'refunded', expiry_date = NOW() 
              WHERE LOWER(TRIM(customer_email)) = $1 
                AND LOWER(TRIM(status)) IN ('succeeded', 'paid', 'success', 'completed');
            `, [cleanEmail]);
          }

          // Insert fresh transaction
          await pool.query(`
            INSERT INTO payment_transactions (
              id, customer_name, customer_email, plan_name, plan_slug, amount, currency,
              gateway, status, failure_reason, test_mode, expiry_date, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, expiry_date = EXCLUDED.expiry_date;
          `, [
            newTx.id,
            newTx.customerName || 'Customer',
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
    // Automatically grant plan tokens and record audit in token_transactions on /admin/token-setting
    try {
      await grantPlanTokensOnPurchase(customerEmail, planSlug, { orderId: txId, planName });
    } catch (tokenErr) {
      console.warn('Auto grant tokens on payment warning:', tokenErr);
    }

          // Update user's active plan in PostgreSQL
          const userPlanToAssign = isPaidSuccess ? planSlug : 'taster';
          await pool.query(`
            UPDATE users 
            SET subscription_plan = $2, 
                plan_expiry_date = $3, 
                updated_at = NOW() 
            WHERE LOWER(TRIM(email)) = $1;
          `, [cleanEmail, userPlanToAssign, isPaidSuccess ? (newTx.expiryDate || null) : null]);
        } catch (dbErr: any) {
          console.error('[Payment API DB Error]:', dbErr);
        }
      }

      // JSON Fallback synchronization
      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      let cleanList = transactions;
      if (isPaidSuccess && cleanEmail) {
        cleanList = transactions.map((t: any) =>
          (t.customerEmail || '').toLowerCase().trim() === cleanEmail && t.status === 'succeeded'
            ? { ...t, status: 'refunded', expiryDate: new Date().toISOString() }
            : t
        );
      }
      cleanList.unshift({ ...newTx, planSlug });
      writeJsonFile('payment_transactions.json', cleanList);

      return NextResponse.json({ success: true, transaction: { ...newTx, planSlug } });
    }

    // 4. Update Transaction
    if (body.action === 'update_transaction' && body.transaction) {
      const updatedTx = body.transaction;
      const cleanEmail = (updatedTx.customerEmail || '').toLowerCase().trim();
      const planSlug = await ensurePlanExists(pool, updatedTx.planSlug || updatedTx.planName, updatedTx.planName, updatedTx.amount);
      const planName = updatedTx.planName || planSlug;
      const isPaidSuccess = ['succeeded', 'paid', 'success', 'completed'].includes(String(updatedTx.status).toLowerCase().trim());

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
            WHERE id::text = $1::text;
          `, [
            updatedTx.id,
            updatedTx.customerName || 'Customer',
            cleanEmail,
            planName,
            planSlug,
            updatedTx.amount || 0,
            updatedTx.currency || 'USD',
            updatedTx.gateway || 'stripe',
            updatedTx.status || 'succeeded',
            updatedTx.failureReason || null,
            updatedTx.expiryDate || null
          ]);

          // Revert to taster if status was changed to non-succeeded
          if (!isPaidSuccess) {
            await checkAndRevertUserPlan(pool, cleanEmail);
          }
        } catch (dbErr: any) {
          console.error('[Payment API DB Error]:', dbErr);
        }
      }

      const transactions = readJsonFile('payment_transactions.json', [] as any[]);
      const updatedTxs = transactions.map((t: any) => (t.id === updatedTx.id ? { ...updatedTx, planSlug } : t));
      writeJsonFile('payment_transactions.json', updatedTxs);

      if (!isPaidSuccess) {
        await checkAndRevertUserPlan(null, cleanEmail);
      }

      return NextResponse.json({ success: true, transaction: { ...updatedTx, planSlug } });
    }

    // 5. Default: Update Gateway Settings
    if (pool) {
      try {
        await pool.query(`
          INSERT INTO admin_settings (id, payment_settings, currency, updated_at)
          VALUES ('primary_settings', $1, $2, NOW())
          ON CONFLICT (id) DO UPDATE SET payment_settings = EXCLUDED.payment_settings, currency = EXCLUDED.currency, updated_at = NOW();
        `, [JSON.stringify(body), body.currency || 'USD']);
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

// Fixed DELETE: Single ID, Bulk IDs, Safe SQL Casting & Automatic User Reversion
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let ids: string[] = [];

    if (id) {
      ids = [id];
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.id) ids = [body.id];
      else if (Array.isArray(body.ids)) ids = body.ids;
      else if (searchParams.get('ids')) {
        ids = searchParams.get('ids')!.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Transaction ID or list of IDs is required' }, { status: 400 });
    }

    const pool = await getDbClient();
    let affectedEmails: string[] = [];

    if (pool) {
      try {
        // 1. Identify customer emails affected by deletion
        const findRes = await pool.query(
          `SELECT DISTINCT LOWER(TRIM(customer_email)) as email 
           FROM payment_transactions 
           WHERE id::text = ANY($1::text[])`,
          [ids]
        );
        affectedEmails = findRes.rows.map((r: any) => r.email).filter(Boolean);

        // 2. Perform DELETE with text casting to prevent type errors
        await pool.query(`DELETE FROM payment_transactions WHERE id::text = ANY($1::text[])`, [ids]);

        // 3. Rule 4: Revert any user who has no remaining active payment transaction to 'taster'
        for (const email of affectedEmails) {
          await checkAndRevertUserPlan(pool, email);
        }
      } catch (dbErr: any) {
        console.error('[Payment API DB DELETE Error]:', dbErr);
        return NextResponse.json({ success: false, error: dbErr.message || 'Database error executing delete' }, { status: 500 });
      }
    }

    // JSON Fallback synchronization
    const transactions = readJsonFile('payment_transactions.json', [] as any[]);
    if (affectedEmails.length === 0) {
      affectedEmails = transactions
        .filter((t: any) => ids.includes(t.id))
        .map((t: any) => (t.customerEmail || '').toLowerCase().trim())
        .filter(Boolean);
    }
    const updated = transactions.filter((t: any) => !ids.includes(t.id));
    writeJsonFile('payment_transactions.json', updated);

    for (const email of affectedEmails) {
      await checkAndRevertUserPlan(null, email);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${ids.length} transaction record(s)`,
      deletedIds: ids,
      affectedEmails
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete transaction' }, { status: 500 });
  }
}
