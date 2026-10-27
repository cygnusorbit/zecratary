import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

let cachedPool: Pool | null = null;

// Strictly typed pool accessor guaranteeing non-null Pool return (Resolves TS2322)
function getPool(): Pool {
  const existing = cachedPool;
  if (existing) {
    return existing;
  }
  const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  const ssl = Boolean(conn && (conn.includes('sslmode=require') || conn.includes('neon.tech') || conn.includes('supabase.co')));
  const instance = new Pool({
    connectionString: conn,
    ssl: ssl ? { rejectUnauthorized: false } : false
  });
  cachedPool = instance;
  return instance;
}

// Module-scoped type-safe database row extractor (Resolves TS7006 and TS2339)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.rows)) return res.rows;
  return [];
}

async function ensureWalletTables(client: any) {
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

    CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_email ON wallet_transactions(user_email);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_gateway_id ON wallet_transactions(gateway_tx_id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INT DEFAULT 100;
  `);
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
  const pool = getPool();
  const client = await pool.connect();

  try {
    await ensureWalletTables(client);
    const { userId, email } = await resolveUserFromReq(req);
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const search = searchParams.get('search') || '';
    const typeFilter = searchParams.get('type') || 'all';

    // 1. Fetch wallet settings
    const settingsRes = await client.query(`SELECT * FROM wallet_settings WHERE id = 'current' LIMIT 1`);
    const settingsRows = parseDbRows(settingsRes);
    let walletSettings = {
      is_enabled: true,
      currency: 'USD',
      min_topup: 5.00,
      max_topup: 1000.00,
      preset_amounts: [10, 25, 50, 100, 250],
      bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
      allowed_gateways: ['stripe', 'paypal', 'manual'],
      allow_site_purchases: true
    };

    if (settingsRows.length > 0) {
      const row = settingsRows[0];
      walletSettings = {
        is_enabled: row.is_enabled !== false,
        currency: row.currency || 'USD',
        min_topup: Number(row.min_topup || 5),
        max_topup: Number(row.max_topup || 1000),
        preset_amounts: Array.isArray(row.preset_amounts) ? row.preset_amounts : [10, 25, 50, 100, 250],
        bonus_rules: Array.isArray(row.bonus_rules) ? row.bonus_rules : [],
        allowed_gateways: Array.isArray(row.allowed_gateways) ? row.allowed_gateways : ['stripe', 'paypal', 'manual'],
        allow_site_purchases: row.allow_site_purchases !== false
      };
    }

    // Harmonize with primary payment_gateways config
    try {
      const pgRes = await client.query("SELECT payment_gateways FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;");
      const pgRows = parseDbRows(pgRes);
      if (pgRows?.[0]?.payment_gateways) {
        const pgConfig = pgRows[0].payment_gateways;
        const harmonized: string[] = [];
        if (pgConfig.stripe?.enabled !== false && walletSettings.allowed_gateways.includes('stripe')) harmonized.push('stripe');
        if (pgConfig.paypal?.enabled !== false && walletSettings.allowed_gateways.includes('paypal')) harmonized.push('paypal');
        if (walletSettings.allowed_gateways.includes('manual')) harmonized.push('manual');
        if (harmonized.length > 0) walletSettings.allowed_gateways = harmonized;
      }
    } catch (_) {}

    // 2. Fetch User Record & Balances
    let user: any = null;
    let walletBalance = 0.00;
    let tokenBalance = 100;

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
      const userRows = parseDbRows(userRes);
      if (userRows.length > 0) {
        user = userRows[0];
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
      const firstUserRows = parseDbRows(firstUserRes);
      if (firstUserRows.length > 0) {
        user = firstUserRows[0];
        walletBalance = parseFloat(user.wallet_balance || 0);
        tokenBalance = Number(user.token_balance || 0);
      }
    }

    const targetEmail = (user?.email || email || '').toLowerCase().trim();

    // 3. Fetch Ledger Statistics
    let stats = { totalDeposited: 0, totalSpent: 0, totalEvents: 0 };
    if (targetEmail) {
      const statsRes = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as deposited,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as spent,
          COUNT(*) as total_events
        FROM wallet_transactions WHERE LOWER(TRIM(user_email)) = $1;
      `, [targetEmail]);
      const statsRows = parseDbRows(statsRes);
      if (statsRows.length > 0) {
        stats = {
          totalDeposited: Number(statsRows[0].deposited || 0),
          totalSpent: Number(statsRows[0].spent || 0),
          totalEvents: Number(statsRows[0].total_events || 0)
        };
      }
    }

    // 4. Query Paginated Transactions
    let transactions: any[] = [];
    let totalCount = 0;

    if (targetEmail) {
      let whereClause = 'WHERE LOWER(TRIM(user_email)) = $1';
      const params: any[] = [targetEmail];
      let pIdx = 2;

      if (typeFilter && typeFilter !== 'all') {
        whereClause += ` AND type = $${pIdx++}`;
        params.push(typeFilter);
      }
      if (search) {
        whereClause += ` AND (description ILIKE $${pIdx} OR gateway_tx_id ILIKE $${pIdx} OR id ILIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      const countRes = await client.query(`SELECT COUNT(*) FROM wallet_transactions ${whereClause};`, params);
      const countRows = parseDbRows(countRes);
      totalCount = parseInt(countRows[0]?.count || '0', 10) || 0;

      const offset = (page - 1) * limit;
      params.push(limit, offset);
      const txRes = await client.query(`
        SELECT * FROM wallet_transactions 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT $${pIdx++} OFFSET $${pIdx++};
      `, params);
      transactions = parseDbRows(txRes);
    }

    const curr = walletSettings.currency || 'USD';
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', THB: '฿', JPY: '¥' };

    return NextResponse.json({
      success: true,
      settings: walletSettings,
      user,
      wallet_balance: walletBalance,
      walletBalance: walletBalance,
      balance: walletBalance,
      token_balance: tokenBalance,
      tokenBalance: tokenBalance,
      currency: curr,
      walletSymbol: symbols[curr.toUpperCase()] || '$',
      transactions,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      stats
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await ensureWalletTables(client);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'topup';

    // --------------------------------------------------------------------------
    // ACTION 1: Verify Stripe Return Session (Atomic Advisory Lock)
    // --------------------------------------------------------------------------
    if (action === 'verify_stripe_session') {
      const sessionId = body.sessionId?.trim() || body.session_id?.trim();
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
      }

      const secretKey = process.env.STRIPE_SECRET_KEY || '';
      if (!secretKey) {
        return NextResponse.json({ success: false, error: 'Stripe Secret Key not configured.' }, { status: 400 });
      }

      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session || (session.payment_status !== 'paid' && session.status !== 'complete')) {
        return NextResponse.json({ success: false, error: 'Payment status is not paid.' }, { status: 400 });
      }

      const meta: Record<string, any> = session.metadata || {};
      const baseAmount = parseFloat(meta.baseAmount || String((session.amount_total || 0) / 100));
      const bonusCredit = parseFloat(meta.bonusCredit || '0');
      const totalAddition = parseFloat(meta.totalAddition || String(baseAmount + bonusCredit));

      const rawEmail = meta.userEmail || body.email || session.customer_email || session.customer_details?.email || '';
      const targetEmail = rawEmail.toLowerCase().trim();
      const rawUserId = String(meta.userId || body.userId || session.client_reference_id || '').trim();

      await client.query('BEGIN');
      try {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [`wallet_topup_${sessionId}`]);

        const existingTxRes = await client.query(
          `SELECT id, balance_after FROM wallet_transactions WHERE gateway_tx_id = $1 AND status = 'succeeded' LIMIT 1`,
          [sessionId]
        );
        const existingTx = parseDbRows(existingTxRes);

        if (existingTx.length > 0) {
          await client.query('COMMIT');
          return NextResponse.json({
            success: true,
            verified: true,
            wallet_balance: parseFloat(existingTx[0].balance_after),
            walletBalance: parseFloat(existingTx[0].balance_after)
          });
        }

        const updateRes = await client.query(
          `UPDATE users 
           SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW()
           WHERE ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
              OR ($3 != '' AND id::text = $3)
           RETURNING id, email, wallet_balance`,
          [totalAddition, targetEmail, rawUserId]
        );
        const updatedUsers = parseDbRows(updateRes);
        const updatedUser = updatedUsers[0];
        const newBal = updatedUser ? parseFloat(updatedUser.wallet_balance) : totalAddition;
        const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        await client.query(
          `INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description)
           VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7)`,
          [txId, updatedUser ? updatedUser.id : rawUserId, targetEmail, totalAddition, newBal, sessionId, `Wallet Top-Up: +$${baseAmount.toFixed(2)}`]
        );

        await client.query('COMMIT');
        return NextResponse.json({
          success: true,
          verified: true,
          wallet_balance: newBal,
          walletBalance: newBal,
          balance: newBal,
          amount: totalAddition
        });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }

    // --------------------------------------------------------------------------
    // ACTION 2: Manual / On-Demand Reconciliation
    // --------------------------------------------------------------------------
    if (action === 'reconcile_wallet') {
      const email = (body.email || '').toLowerCase().trim();
      const userId = String(body.userId || 'usr_admin_1').trim();

      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required for reconciliation' }, { status: 400 });
      }

      await client.query('BEGIN');
      try {
        const syncRes = await client.query(`
          INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, created_at)
          SELECT 
            'tx_rec_' || pt.id,
            COALESCE(pt.user_id, $1),
            pt.user_email,
            'topup',
            pt.amount,
            COALESCE((SELECT wallet_balance FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(pt.user_email)) LIMIT 1), 0) + pt.amount,
            COALESCE(pt.gateway, 'stripe'),
            pt.stripe_session_id,
            'succeeded',
            'Manual reconciliation sync',
            pt.created_at
          FROM payment_transactions pt
          WHERE pt.status = 'succeeded'
            AND LOWER(TRIM(pt.user_email)) = $2
            AND NOT EXISTS (
              SELECT 1 FROM wallet_transactions wt 
              WHERE wt.gateway_tx_id = pt.stripe_session_id OR wt.id = 'tx_rec_' || pt.id
            )
          RETURNING amount;
        `, [userId, email]);

        let creditedAmount = 0;
        // EXPLICIT (r: any) TYPING - RESOLVES TS7006
        parseDbRows(syncRes).forEach((r: any) => { 
          creditedAmount += Number(r.amount || 0); 
        });

        if (creditedAmount > 0) {
          await client.query(`
            UPDATE users 
            SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
            WHERE LOWER(TRIM(email)) = $2;
          `, [creditedAmount, email]);
        }

        const balRes = await client.query('SELECT wallet_balance FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1;', [email]);
        const balRows = parseDbRows(balRes);
        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          reconciledCount: syncRes.rowCount || 0,
          wallet_balance: Number(balRows[0]?.wallet_balance || 0),
          message: `Reconciled ${syncRes.rowCount || 0} payment(s)`
        });
      } catch (e: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    // --------------------------------------------------------------------------
    // ACTION 3: Standard Top-Up Deposit
    // --------------------------------------------------------------------------
    const { email, userId, amount, bonus = 0, gateway = 'stripe' } = body;
    const topupAmt = parseFloat(String(amount || 0));
    const bonusAmt = parseFloat(String(bonus || 0));
    const totalCredit = topupAmt + bonusAmt;

    if (isNaN(topupAmt) || topupAmt <= 0) {
      return NextResponse.json({ success: false, error: 'Positive deposit amount required.' }, { status: 400 });
    }

    const activeGateway = (gateway || 'stripe').toLowerCase();
    const targetEmail = String(email || '').trim().toLowerCase();
    const targetUserId = String(userId || '').trim();

    const userRes = await client.query(
      `SELECT id, email, wallet_balance FROM users 
       WHERE ($1 != '' AND id::text = $1) 
          OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
       LIMIT 1`,
      [targetUserId, targetEmail]
    );
    const targetUsers = parseDbRows(userRes);

    if (targetUsers.length === 0) {
      return NextResponse.json({ success: false, error: 'Target user not found.' }, { status: 404 });
    }

    const targetUser = targetUsers[0];
    const newBalance = parseFloat(targetUser.wallet_balance || 0) + totalCredit;

    await client.query(
      `UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, targetUser.id]
    );

    const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const desc = bonusAmt > 0
      ? `Top-Up Deposit: +$${topupAmt.toFixed(2)} (Bonus: +$${bonusAmt.toFixed(2)})`
      : `Top-Up Deposit: +$${topupAmt.toFixed(2)}`;

    await client.query(
      `INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, status, description, metadata)
       VALUES ($1, $2, $3, 'topup', $4, $5, $6, 'succeeded', $7, $8)`,
      [txId, targetUser.id, targetUser.email, totalCredit, newBalance, activeGateway, desc, JSON.stringify({ depositAmount: topupAmt, bonusAmount: bonusAmt })]
    );

    return NextResponse.json({
      success: true,
      wallet_balance: newBalance,
      walletBalance: newBalance,
      balance: newBalance,
      amount: totalCredit,
      transactionId: txId
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
