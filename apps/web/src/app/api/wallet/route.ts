import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

async function initWalletDb() {
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

      INSERT INTO wallet_settings (id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases)
      VALUES ('current', true, 'USD', 5.00, 1000.00, '[10, 25, 50, 100, 250]', '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]', '["stripe", "paypal", "manual"]', true)
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    console.error('Wallet DB init error:', err);
  } finally {
    client.release();
  }
}

export async function GET(req: NextRequest) {
  try {
    await initWalletDb();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const userId = searchParams.get('userId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const typeFilter = searchParams.get('type')?.trim().toLowerCase() || 'all';

    const client = await getPool().connect();
    try {
      // 1. Fetch Wallet Settings
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

      // 2. Fetch User Record
      let user = null;
      let walletBalance = 0;
      if (email || userId) {
        let userRes;
        if (userId) {
          userRes = await client.query('SELECT id, email, name, wallet_balance FROM users WHERE id = $1', [userId]);
        }
        if ((!userRes || userRes.rows.length === 0) && email) {
          userRes = await client.query('SELECT id, email, name, wallet_balance FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        }
        if (userRes && userRes.rows.length > 0) {
          user = userRes.rows[0];
          walletBalance = parseFloat(user.wallet_balance || 0);
        }
      }

      // 3. Query User Wallet Transactions
      let transactions: any[] = [];
      let totalCount = 0;
      let stats = { totalDeposited: 0, totalSpent: 0, totalEvents: 0 };

      if (user || email) {
        const targetEmail = user?.email || email;
        const conditions: string[] = ['(LOWER(user_email) = LOWER($1) OR user_id = $2)'];
        const values: any[] = [targetEmail, user?.id || ''];

        if (typeFilter && typeFilter !== 'all') {
          values.push(typeFilter);
          conditions.push(`type = $${values.length}`);
        }

        if (search) {
          values.push(`%${search}%`);
          const sIdx = values.length;
          conditions.push(`(LOWER(description) LIKE $${sIdx} OR LOWER(id) LIKE $${sIdx} OR LOWER(gateway_tx_id) LIKE $${sIdx} OR LOWER(gateway) LIKE $${sIdx})`);
        }

        const whereSql = conditions.join(' AND ');

        // Total count
        const countRes = await client.query(`SELECT COUNT(*) FROM wallet_transactions WHERE ${whereSql}`, values);
        totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

        // Paginated rows
        const pageValues = [...values, limit, offset];
        const rowsRes = await client.query(
          `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
          pageValues
        );
        transactions = rowsRes.rows;

        // KPI Aggregate Stats
        const statsRes = await client.query(`
          SELECT
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_deposited,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
            COUNT(*) as total_events
          FROM wallet_transactions
          WHERE LOWER(user_email) = LOWER($1) OR user_id = $2
        `, [targetEmail, user?.id || '']);

        if (statsRes.rows.length > 0) {
          stats = {
            totalDeposited: parseFloat(statsRes.rows[0].total_deposited || 0),
            totalSpent: parseFloat(statsRes.rows[0].total_spent || 0),
            totalEvents: parseInt(statsRes.rows[0].total_events || 0, 10),
          };
        }
      }

      return NextResponse.json({
        success: true,
        settings,
        user,
        wallet_balance: walletBalance,
        transactions,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        page,
        limit,
        stats,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initWalletDb();
    const body = await req.json();
    const { email, userId, amount, gateway, gatewayTxId } = body;

    const topupAmount = parseFloat(amount);
    if ((!email && !userId) || isNaN(topupAmount) || topupAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'A valid user identifier and positive top-up deposit amount are required.',
      }, { status: 400 });
    }

    const client = await getPool().connect();
    try {
      const settingsRes = await client.query('SELECT * FROM wallet_settings WHERE id = $1', ['current']);
      const settings = settingsRes.rows[0] || {
        is_enabled: true,
        currency: 'USD',
        min_topup: 5.00,
        max_topup: 1000.00,
        bonus_rules: [],
      };

      if (settings.is_enabled === false) {
        return NextResponse.json({
          success: false,
          error: 'The wallet deposit engine is currently disabled by administrator.',
        }, { status: 403 });
      }

      const minAllowed = parseFloat(settings.min_topup || 5);
      const maxAllowed = parseFloat(settings.max_topup || 1000);

      if (topupAmount < minAllowed) {
        return NextResponse.json({
          success: false,
          error: `Minimum top-up deposit is $${minAllowed.toFixed(2)}.`,
        }, { status: 400 });
      }

      if (topupAmount > maxAllowed) {
        return NextResponse.json({
          success: false,
          error: `Maximum single top-up cap is $${maxAllowed.toFixed(2)}.`,
        }, { status: 400 });
      }

      // Locate user
      let userRes;
      if (userId) {
        userRes = await client.query('SELECT id, email, name, wallet_balance FROM users WHERE id = $1', [userId]);
      }
      if ((!userRes || userRes.rows.length === 0) && email) {
        userRes = await client.query('SELECT id, email, name, wallet_balance FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      }

      if (!userRes || userRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Target user account was not found.' }, { status: 404 });
      }

      const user = userRes.rows[0];
      const currentBalance = parseFloat(user.wallet_balance || 0);

      // Calculate promotional bonuses
      let bonusCredit = 0;
      const rules = Array.isArray(settings.bonus_rules) ? settings.bonus_rules : [];
      for (const rule of rules) {
        const threshold = parseFloat(rule.threshold || 0);
        const percent = parseFloat(rule.bonus_percent || 0);
        if (topupAmount >= threshold && percent > 0) {
          const calculatedBonus = topupAmount * (percent / 100);
          if (calculatedBonus > bonusCredit) {
            bonusCredit = calculatedBonus;
          }
        }
      }

      const totalAddition = topupAmount + bonusCredit;
      const newBalance = currentBalance + totalAddition;

      // Update user wallet balance
      await client.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [newBalance, user.id]);

      // Record transaction
      const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const desc = bonusCredit > 0
        ? `Wallet Top-Up: +$${topupAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} promotional bonus)`
        : `Wallet Top-Up: +$${topupAmount.toFixed(2)}`;

      await client.query(`
        INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        txId,
        user.id,
        user.email,
        'topup',
        totalAddition,
        newBalance,
        gateway || 'stripe',
        gatewayTxId || `gw_${Date.now()}`,
        'succeeded',
        desc,
        JSON.stringify({ baseAmount: topupAmount, bonusCredit, gateway: gateway || 'stripe' }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Successfully topped up $${topupAmount.toFixed(2)}${bonusCredit > 0 ? ` with an extra $${bonusCredit.toFixed(2)} bonus!` : '!' }`,
        wallet_balance: newBalance,
        transactionId: txId,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
