import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Stripe from 'stripe';

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

let isDbInitialized = false;

async function initWalletDb() {
  if (isDbInitialized) return;
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'current',
        is_enabled BOOLEAN DEFAULT true,
        currency VARCHAR(10) DEFAULT 'USD',
        min_topup NUMERIC(10,2) DEFAULT 5.00,
        max_topup NUMERIC(10,2) DEFAULT 1000.00,
        preset_amounts JSONB DEFAULT '[10, 25, 50, 100, 250]',
        bonus_rules JSONB DEFAULT '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]',
        allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]',
        allow_site_purchases BOOLEAN DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        user_email VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        balance_after NUMERIC(10,2) NOT NULL,
        gateway VARCHAR(32) DEFAULT 'stripe',
        gateway_tx_id VARCHAR(255),
        status VARCHAR(32) DEFAULT 'succeeded',
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INT DEFAULT 100;

      INSERT INTO wallet_settings (id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases)
      VALUES ('current', true, 'USD', 5.00, 1000.00, '[10, 25, 50, 100, 250]', '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]', '["stripe", "paypal", "manual"]', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    isDbInitialized = true;
  } catch (err) {
    console.warn('[Wallet DB init warning]:', err);
  } finally {
    client.release();
  }
}

async function resolveUserFromReq(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let rawUserId = searchParams.get('userId')?.trim() || '';
  let rawEmail = searchParams.get('email')?.trim().toLowerCase() || '';

  if (rawUserId === 'undefined' || rawUserId === 'null') rawUserId = '';
  if (rawEmail === 'undefined' || rawEmail === 'null') rawEmail = '';

  if (!rawUserId && !rawEmail) {
    const authCookies = ['zecratary_session', 'currentUser', 'zecratary_user'];
    for (const cName of authCookies) {
      const cVal = req.cookies.get(cName)?.value;
      if (cVal) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cVal));
          if (parsed?.id) rawUserId = String(parsed.id);
          if (parsed?.email) rawEmail = String(parsed.email).toLowerCase();
          if (rawUserId || rawEmail) break;
        } catch (_) {}
      }
    }
  }

  return { userId: rawUserId, email: rawEmail };
}

export async function GET(req: NextRequest) {
  try {
    await initWalletDb();
    const { userId, email } = await resolveUserFromReq(req);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const typeFilter = searchParams.get('type')?.trim().toLowerCase() || 'all';

    const client = await getPool().connect();
    try {
      const settingsRes = await client.query('SELECT * FROM wallet_settings WHERE id = $1', ['current']);
      const settings = settingsRes.rows[0] || {
        is_enabled: true,
        currency: 'USD',
        min_topup: 5.00,
        max_topup: 1000.00,
        preset_amounts: [10, 25, 50, 100, 250],
        bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
        allowed_gateways: ['stripe', 'paypal', 'manual'],
        allow_site_purchases: true,
      };

      let user = null;
      let walletBalance = 0;
      let tokenBalance = 0;

      if (userId || email) {
        const userRes = await client.query(
          `SELECT id, email, name, 
                  COALESCE(wallet_balance, 0) as wallet_balance,
                  COALESCE(token_balance, 0) as token_balance 
           FROM users 
           WHERE ($1 != '' AND id::text = $1) 
              OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
           LIMIT 1`,
          [userId, email]
        );
        if (userRes.rows.length > 0) {
          user = userRes.rows[0];
          walletBalance = parseFloat(user.wallet_balance || 0);
          tokenBalance = Number(user.token_balance || 0);
        }
      } else {
        const firstUserRes = await client.query(
          `SELECT id, email, name, 
                  COALESCE(wallet_balance, 0) as wallet_balance,
                  COALESCE(token_balance, 0) as token_balance 
           FROM users 
           ORDER BY created_at ASC LIMIT 1`
        );
        if (firstUserRes.rows.length > 0) {
          user = firstUserRes.rows[0];
          walletBalance = parseFloat(user.wallet_balance || 0);
          tokenBalance = Number(user.token_balance || 0);
        }
      }

      // Query transactions ledger
      let transactions: any[] = [];
      let totalCount = 0;
      let stats = { totalDeposited: 0, totalSpent: 0, totalEvents: 0 };

      const conditions: string[] = [];
      const values: any[] = [];

      if (user?.email) {
        values.push(user.email.toLowerCase().trim());
        conditions.push(`LOWER(TRIM(user_email)) = $${values.length}`);
      }
      if (user?.id) {
        values.push(String(user.id).trim());
        conditions.push(`user_id::text = $${values.length}`);
      }

      if (conditions.length > 0) {
        const baseWhereSql = `(${conditions.join(' OR ')})`;

        const statsRes = await client.query(`
          SELECT
            COALESCE(SUM(CASE WHEN amount > 0 AND status IN ('succeeded', 'successful', 'completed', 'paid') THEN amount ELSE 0 END), 0) as total_deposited,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
            COUNT(*) as total_events
          FROM wallet_transactions
          WHERE ${baseWhereSql}
        `, values);

        stats = {
          totalDeposited: parseFloat(statsRes.rows[0]?.total_deposited || 0),
          totalSpent: parseFloat(statsRes.rows[0]?.total_spent || 0),
          totalEvents: parseInt(statsRes.rows[0]?.total_events || 0, 10),
        };

        const tableConditions = [baseWhereSql];
        const tableValues = [...values];

        if (typeFilter && typeFilter !== 'all') {
          tableValues.push(typeFilter);
          tableConditions.push(`type = $${tableValues.length}`);
        }

        if (search) {
          tableValues.push(`%${search}%`);
          const sIdx = tableValues.length;
          tableConditions.push(`(LOWER(description) LIKE $${sIdx} OR LOWER(id) LIKE $${sIdx})`);
        }

        const tableWhereSql = tableConditions.join(' AND ');
        const countRes = await client.query(`SELECT COUNT(*) FROM wallet_transactions WHERE ${tableWhereSql}`, tableValues);
        totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

        const pageValues = [...tableValues, limit, offset];
        const rowsRes = await client.query(
          `SELECT * FROM wallet_transactions WHERE ${tableWhereSql} ORDER BY created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
          pageValues
        );
        transactions = rowsRes.rows;
      }

      return NextResponse.json({
        success: true,
        settings,
        user,
        wallet_balance: walletBalance,
        walletBalance: walletBalance,
        balance: walletBalance,
        token_balance: tokenBalance,
        tokenBalance: tokenBalance,
        currency: settings.currency || 'USD',
        walletSymbol: settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : '$',
        transactions,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        page,
        limit,
        stats,
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
