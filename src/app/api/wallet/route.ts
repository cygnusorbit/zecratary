import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
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


export const dynamic = 'force-dynamic';
export const revalidate = 0;

let isDbInitialized = false;

async function initWalletDb() {
  if (isDbInitialized) return;
  try {
    await query(`
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

      CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, user_email);

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
        is_recurring BOOLEAN DEFAULT false,
        recurring_interval VARCHAR(20) DEFAULT 'ONE_TIME',
        auto_renew BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        gateway_transaction_id TEXT,
        confirmed_amount NUMERIC,
        confirmed_at TIMESTAMPTZ
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;

      INSERT INTO wallet_settings (id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases)
      VALUES ('current', true, 'USD', 5.00, 1000.00, '[10, 25, 50, 100, 250]', '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]', '["stripe", "paypal", "manual"]', true)
      ON CONFLICT (id) DO UPDATE SET min_topup = LEAST(wallet_settings.min_topup, 5.00);
    `);
    isDbInitialized = true;
  } catch (err: any) {
    console.warn('[Wallet DB init notice]:', err.message);
    isDbInitialized = true;
  }
}

export async function GET(req: NextRequest) {
  try {
    await initWalletDb();
    const { searchParams } = new URL(req.url);
    const email = String(searchParams.get('email') || '').toLowerCase().trim();
    const userId = String(searchParams.get('userId') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;
    const search = String(searchParams.get('search') || '').toLowerCase().trim();
    const typeFilter = String(searchParams.get('type') || 'all').toLowerCase().trim();

    // 1. Fetch Wallet Settings with explicit string comparisons
    let settings = {
      is_enabled: true,
      currency: 'USD',
      min_topup: 5,
      max_topup: 1000,
      preset_amounts: [10, 25, 50, 100, 250],
      bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
      allowed_gateways: ['stripe', 'paypal', 'manual'],
      allow_site_purchases: true
    };

    try {
      const sRes: any = await query(`
        SELECT * FROM wallet_settings 
        WHERE id::text = 'current' OR id::text = '1'
        LIMIT 1;
      `);
      const sRow = parseDbRow(sRes);
      if (sRow) {
        settings = {
          is_enabled: sRow.is_enabled !== false,
          currency: sRow.currency || 'USD',
          min_topup: Number(sRow.min_topup || 5),
          max_topup: Number(sRow.max_topup || 1000),
          preset_amounts: Array.isArray(sRow.preset_amounts) ? sRow.preset_amounts : (typeof sRow.preset_amounts === 'string' ? JSON.parse(sRow.preset_amounts) : [10, 25, 50, 100, 250]),
          bonus_rules: Array.isArray(sRow.bonus_rules) ? sRow.bonus_rules : (typeof sRow.bonus_rules === 'string' ? JSON.parse(sRow.bonus_rules) : []),
          allowed_gateways: Array.isArray(sRow.allowed_gateways) ? sRow.allowed_gateways : ['stripe', 'paypal', 'manual'],
          allow_site_purchases: sRow.allow_site_purchases !== false
        };
      }
    } catch (_) {}

    // 2. Fetch User & Wallet Balance (Strict type-cast comparison)
    let userRow: any = null;
    let walletBalance = 0.00;

    if (userId || email) {
      try {
        const uRes: any = await query(`
          SELECT id, email, name, wallet_balance, token_balance, role 
          FROM users 
          WHERE (id::text = $1::text AND $1::text != '') 
             OR (email IS NOT NULL AND LOWER(email) = LOWER($2::text) AND $2::text != '')
          LIMIT 1;
        `, [userId, email]);
        userRow = parseDbRow(uRes);
        if (userRow) {
          walletBalance = parseFloat(userRow.wallet_balance || 0);
        }
      } catch (_) {}
    }

    // 3. Query User Transaction Ledger with Type-Safe Conditionals
    const conditions: string[] = [];
    const values: any[] = [];

    const identityClauses: string[] = [];
    if (email) {
      values.push(email);
      identityClauses.push(`LOWER(TRIM(user_email)) = LOWER(TRIM($${values.length}::text))`);
    }
    if (userId) {
      values.push(userId);
      identityClauses.push(`user_id::text = $${values.length}::text`);
    }
    if (userRow?.id && userRow.id !== userId) {
      values.push(String(userRow.id));
      identityClauses.push(`user_id::text = $${values.length}::text`);
    }

    if (identityClauses.length > 0) {
      conditions.push(`(${identityClauses.join(' OR ')})`);
    } else {
      conditions.push(`(user_id::text = 'usr_admin_1' OR user_id IS NULL)`);
    }

    if (typeFilter && typeFilter !== 'all') {
      values.push(typeFilter);
      conditions.push(`type = $${values.length}::text`);
    }

    if (search) {
      values.push(`%${search}%`);
      const sIdx = values.length;
      conditions.push(`(
        LOWER(COALESCE(description, '')) LIKE $${sIdx}::text OR 
        LOWER(COALESCE(id, '')) LIKE $${sIdx}::text OR 
        LOWER(COALESCE(gateway_tx_id, '')) LIKE $${sIdx}::text OR 
        LOWER(COALESCE(gateway, '')) LIKE $${sIdx}::text
      )`);
    }

    const whereSql = conditions.join(' AND ');

    let totalCount = 0;
    try {
      const countRes: any = await query(`SELECT COUNT(*) as count FROM wallet_transactions WHERE ${whereSql}`, values);
      const cRow = parseDbRow(countRes);
      totalCount = parseInt(cRow?.count || '0', 10);
    } catch (_) {}

    const pageValues = [...values, limit, offset];
    let transactions: any[] = [];
    try {
      const rowsRes: any = await query(`
        SELECT * FROM wallet_transactions 
        WHERE ${whereSql} 
        ORDER BY created_at DESC 
        LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}
      `, pageValues);
      transactions = parseDbRows(rowsRes);
    } catch (_) {}

    let stats = { totalDeposited: 0, totalSpent: 0, totalEvents: 0 };
    try {
      const statsRes: any = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN amount > 0 AND status IN ('succeeded', 'successful', 'completed', 'paid') THEN amount ELSE 0 END), 0) as total_deposited,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
          COUNT(*) as total_events
        FROM wallet_transactions 
        WHERE ${whereSql} AND status IN ('succeeded', 'successful', 'completed', 'paid')
      `, values);
      const stRow = parseDbRow(statsRes);
      if (stRow) {
        stats = {
          totalDeposited: parseFloat(stRow.total_deposited || 0),
          totalSpent: parseFloat(stRow.total_spent || 0),
          totalEvents: parseInt(stRow.total_events || 0, 10)
        };
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      balance: walletBalance,
      wallet_balance: walletBalance,
      walletBalance: walletBalance,
      user: userRow ? {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name || 'Chef',
        wallet_balance: walletBalance
      } : null,
      settings,
      transactions,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      page,
      limit,
      stats
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, balance: 0, wallet_balance: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initWalletDb();
    const body = await req.json();
    const { action, amount, bonus, gateway, email, userId, gatewayTxId } = body;

    const depositAmount = parseFloat(amount || 0);
    const bonusAmount = parseFloat(bonus || 0);
    const totalToAdd = depositAmount + bonusAmount;

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid deposit amount' }, { status: 400 });
    }

    const targetEmail = String(email || 'admin@zecratary.com').toLowerCase().trim();
    const targetUserId = String(userId || 'usr_admin_1').trim();

    // 1. Update user balance atomically
    const updateRes: any = await query(`
      UPDATE users 
      SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW()
      WHERE (id::text = $2::text AND $2::text != '') 
         OR (email IS NOT NULL AND LOWER(email) = LOWER($3::text))
      RETURNING id, email, wallet_balance;
    `, [totalToAdd, targetUserId, targetEmail]);

    const userRow = parseDbRow(updateRes);
    const newBalance = userRow ? parseFloat(userRow.wallet_balance) : totalToAdd;

    // 2. Record transaction in ledger
    const txId = 'wtx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const desc = bonusAmount > 0 
      ? `Wallet Deposit ($${depositAmount.toFixed(2)} + $${bonusAmount.toFixed(2)} Bonus)`
      : `Wallet Deposit ($${depositAmount.toFixed(2)})`;

    await query(`
      INSERT INTO wallet_transactions (
        id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, created_at
      ) VALUES ($1::text, $2::text, $3::text, 'topup', $4, $5, $6::text, $7::text, 'succeeded', $8::text, NOW());
    `, [txId, targetUserId, targetEmail, totalToAdd, newBalance, gateway || 'manual', gatewayTxId || txId, desc]);

    return NextResponse.json({
      success: true,
      wallet_balance: newBalance,
      balance: newBalance,
      message: `Successfully deposited $${depositAmount.toFixed(2)} into your wallet!`
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
