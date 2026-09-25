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

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

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

      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS type VARCHAR(32) DEFAULT 'topup';
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS gateway VARCHAR(32) DEFAULT 'stripe';
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS gateway_tx_id VARCHAR(255);
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'succeeded';
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_gateway_tx_id_uniq 
      ON wallet_transactions (gateway_tx_id) 
      WHERE gateway_tx_id IS NOT NULL AND gateway_tx_id != '';

      INSERT INTO wallet_settings (id, is_enabled, currency, min_topup, max_topup, preset_amounts, bonus_rules, allowed_gateways, allow_site_purchases)
      VALUES ('current', true, 'USD', 5.00, 1000.00, '[10, 25, 50, 100, 250]', '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]', '["stripe", "paypal", "manual"]', true)
      ON CONFLICT (id) DO UPDATE SET min_topup = LEAST(wallet_settings.min_topup, 5.00);
    `);
    isDbInitialized = true;
  } catch (err) {
    console.warn('[Wallet DB init warning]:', err);
  } finally {
    client.release();
  }
}

async function getStripeCredentials(client: any) {
  let secretKey = process.env.STRIPE_SECRET_KEY || '';
  let publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  let currency = 'USD';
  let testMode = true;

  try {
    const checkTable = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'admin_settings' LIMIT 1
    `).catch(() => ({ rows: [] }));

    if (checkTable.rows && checkTable.rows.length > 0) {
      const res = await client.query(`SELECT * FROM admin_settings ORDER BY updated_at DESC LIMIT 1`).catch(() => ({ rows: [] }));
      const row = res.rows?.[0];
      if (row) {
        const rawPs = row.payment_settings || row.paymentSettings || row.settings?.paymentSettings || row.settings?.payment_settings || row.settings;
        let ps = rawPs;
        if (typeof ps === 'string') {
          try { ps = JSON.parse(ps); } catch (_) {}
        }

        if (ps) {
          if (ps.stripe?.secretKey) secretKey = ps.stripe.secretKey;
          else if (ps.secretKey) secretKey = ps.secretKey;

          if (ps.stripe?.publishableKey) publishableKey = ps.stripe.publishableKey;
          else if (ps.publishableKey) publishableKey = ps.publishableKey;

          if (typeof ps.testMode === 'boolean') testMode = ps.testMode;
        }

        if (row.currency) currency = row.currency;
        else if (ps?.currency) currency = ps.currency;
      }
    }
  } catch (e) {
    console.warn('[Stripe credentials lookup warning]:', e);
  }

  if (!secretKey) secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || '';
  if (!publishableKey) publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!currency) currency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'USD';

  return {
    secretKey: secretKey.trim(),
    publishableKey: publishableKey.trim(),
    currency: currency.toUpperCase(),
    testMode
  };
}

async function fetchUserLedger(client: any, user: any, email = '', userId = '', limit = 10, offset = 0, typeFilter = 'all', search = '') {
  const targetEmail = (user?.email || email || '').toLowerCase().trim();
  const dbUserId = user?.id ? String(user.id).trim() : '';
  const passedUserId = userId ? String(userId).trim() : '';

  const conditions: string[] = [];
  const values: any[] = [];

  const identityClauses: string[] = [];
  if (targetEmail) {
    values.push(targetEmail);
    const idx = values.length;
    identityClauses.push(`LOWER(TRIM(user_email)) = LOWER(TRIM($${idx}))`);
    identityClauses.push(`LOWER(TRIM(COALESCE(metadata->>'userEmail', ''))) = LOWER(TRIM($${idx}))`);
  }
  if (dbUserId) {
    values.push(dbUserId);
    const idx = values.length;
    identityClauses.push(`user_id::text = $${idx}`);
    identityClauses.push(`COALESCE(metadata->>'userId', '') = $${idx}`);
  }
  if (passedUserId && passedUserId !== dbUserId) {
    values.push(passedUserId);
    const idx = values.length;
    identityClauses.push(`user_id::text = $${idx}`);
    identityClauses.push(`COALESCE(metadata->>'userId', '') = $${idx}`);
  }

  if (identityClauses.length > 0) {
    conditions.push(`(${identityClauses.join(' OR ')})`);
  } else {
    return { transactions: [], totalCount: 0, stats: { totalDeposited: 0, totalSpent: 0, totalEvents: 0 } };
  }

  if (typeFilter && typeFilter !== 'all') {
    values.push(typeFilter);
    conditions.push(`type = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const sIdx = values.length;
    conditions.push(`(LOWER(description) LIKE $${sIdx} OR LOWER(id) LIKE $${sIdx} OR LOWER(COALESCE(gateway_tx_id, '')) LIKE $${sIdx} OR LOWER(COALESCE(gateway, '')) LIKE $${sIdx})`);
  }

  const whereSql = conditions.join(' AND ');

  const countRes = await client.query(`SELECT COUNT(*) FROM wallet_transactions WHERE ${whereSql}`, values);
  const totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

  const pageValues = [...values, limit, offset];
  const rowsRes = await client.query(
    `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );
  const transactions = rowsRes.rows;

  const statsRes = await client.query(`
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 AND status IN ('succeeded', 'successful', 'completed', 'paid') THEN amount ELSE 0 END), 0) as total_deposited,
      COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
      COUNT(*) as total_events
    FROM wallet_transactions
    WHERE ${whereSql} AND status IN ('succeeded', 'successful', 'completed', 'paid')
  `, values);

  const stats = {
    totalDeposited: parseFloat(statsRes.rows[0]?.total_deposited || 0),
    totalSpent: parseFloat(statsRes.rows[0]?.total_spent || 0),
    totalEvents: parseInt(statsRes.rows[0]?.total_events || 0, 10),
  };

  return { transactions, totalCount, stats };
}

export async function GET(req: NextRequest) {
  try {
    await initWalletDb();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase() || '';
    const userId = searchParams.get('userId')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const typeFilter = searchParams.get('type')?.trim().toLowerCase() || 'all';

    const client = await getPool().connect();
    try {
      const settingsRes = await client.query(`SELECT * FROM wallet_settings WHERE id = $1`, ['current']);
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

      if (userId || email) {
        let userRes = null;
        if (userId && email) {
          userRes = await client.query(
            `SELECT id, email, name, wallet_balance FROM users WHERE id::text = $1 OR LOWER(email) = LOWER($2) LIMIT 1`,
            [userId, email]
          ).catch(() => null);
        } else if (userId) {
          userRes = await client.query(
            `SELECT id, email, name, wallet_balance FROM users WHERE id::text = $1 LIMIT 1`,
            [userId]
          ).catch(() => null);
        } else if (email) {
          userRes = await client.query(
            `SELECT id, email, name, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
            [email]
          ).catch(() => null);
        }

        if (userRes && userRes.rows.length > 0) {
          user = userRes.rows[0];
          walletBalance = parseFloat(user.wallet_balance || 0);
        }
      }

      const { transactions, totalCount, stats } = await fetchUserLedger(
        client, user, email, userId, limit, offset, typeFilter, search
      );

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
    const action = body.action || 'topup';

    const client = await getPool().connect();
    try {
      // -----------------------------------------------------------------------
      // 1. ACTION: Verify Stripe Return Session
      // -----------------------------------------------------------------------
      if (action === 'verify_stripe_session') {
        const sessionId = body.sessionId?.trim();
        if (!sessionId) {
          return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
        }

        const { secretKey } = await getStripeCredentials(client);
        if (!secretKey) {
          return NextResponse.json({ success: false, error: 'Stripe Secret Key is not configured in Admin Settings.' }, { status: 400 });
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent']
        });

        if (!session || session.payment_status !== 'paid') {
          return NextResponse.json({
            success: false,
            error: `Stripe payment status is ${session?.payment_status || 'unpaid'}.`,
          }, { status: 400 });
        }

        const metadata = session.metadata || {};
        const curr = (session.currency || 'USD').toUpperCase();
        const rawAmount = session.amount_total ? (ZERO_DECIMAL_CURRENCIES.has(curr) ? session.amount_total : session.amount_total / 100) : 0;
        const baseAmount = parseFloat(metadata.baseAmount || String(rawAmount));
        const bonusCredit = parseFloat(metadata.bonusCredit || '0');
        const totalAddition = parseFloat(metadata.totalAddition || String(baseAmount + bonusCredit));
        const targetEmail = (metadata.userEmail || body.email || session.customer_details?.email || session.customer_email || '').toLowerCase().trim();
        const targetUserId = metadata.userId || body.userId || session.client_reference_id || '';
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as any)?.id || '';

        await client.query('BEGIN');
        try {
          await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`wallet_topup_${sessionId}`]);

          const existingTx = await client.query(
            `SELECT id, balance_after FROM wallet_transactions 
             WHERE (gateway_tx_id = $1 
                    OR ($2 != '' AND gateway_tx_id = $2)
                    OR metadata->>'stripeSessionId' = $1 
                    OR ($2 != '' AND metadata->>'paymentIntentId' = $2))
               AND status = 'succeeded' 
             LIMIT 1`,
            [sessionId, paymentIntentId]
          );

          if (existingTx.rows.length > 0) {
            await client.query('COMMIT');
            const userCheck = await client.query(
              `SELECT id, email, wallet_balance FROM users WHERE id::text = $1 OR (LOWER(email) = LOWER($2) AND $2 != '') LIMIT 1`,
              [String(targetUserId), targetEmail]
            );
            const verifiedUser = userCheck.rows[0];
            const currentBal = parseFloat(verifiedUser?.wallet_balance || existingTx.rows[0].balance_after || 0);

            const ledgerData = await fetchUserLedger(client, verifiedUser, targetEmail, targetUserId, 10, 0);

            return NextResponse.json({
              success: true,
              verified: true,
              alreadyProcessed: true,
              wallet_balance: currentBal,
              transactions: ledgerData.transactions,
              totalCount: ledgerData.totalCount,
              totalPages: Math.ceil(ledgerData.totalCount / 10) || 1,
              stats: ledgerData.stats,
              message: `Deposit of $${baseAmount.toFixed(2)} is credited to your wallet.`,
            });
          }

          let updateRes = await client.query(
            `UPDATE users 
             SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW()
             WHERE id::text = $2 OR (LOWER(email) = LOWER($3) AND $3 != '')
             RETURNING id, email, name, wallet_balance`,
            [totalAddition, String(targetUserId), targetEmail]
          );

          if (updateRes.rows.length === 0 && targetEmail) {
            updateRes = await client.query(
              `UPDATE users 
               SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW()
               WHERE LOWER(email) = LOWER($2)
               RETURNING id, email, name, wallet_balance`,
              [totalAddition, targetEmail]
            );
          }

          const updatedUser = updateRes.rows[0];
          const newBalance = updatedUser ? parseFloat(updatedUser.wallet_balance || 0) : totalAddition;
          const finalUserId = updatedUser ? String(updatedUser.id) : (targetUserId || 'usr_wallet');
          const finalEmail = updatedUser?.email || targetEmail;

          const wtxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const desc = bonusCredit > 0
            ? `Wallet Top-Up: +$${baseAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} promotional bonus)`
            : `Wallet Top-Up: +$${baseAmount.toFixed(2)}`;

          await client.query(`
            INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
            VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, $8)
            ON CONFLICT (id) DO NOTHING
          `, [
            wtxId,
            finalUserId,
            finalEmail,
            totalAddition,
            newBalance,
            sessionId,
            desc,
            JSON.stringify({ 
              baseAmount, 
              bonusCredit, 
              totalAddition, 
              gateway: 'stripe', 
              stripeSessionId: sessionId,
              paymentIntentId,
              userEmail: finalEmail,
              userId: finalUserId
            }),
          ]);

          await client.query(`
            INSERT INTO payment_transactions (
              id, customer_name, customer_email, plan_name, plan_slug, amount,
              currency, gateway, status, is_recurring, auto_renew, gateway_transaction_id, confirmed_amount, confirmed_at, created_at, updated_at
            ) VALUES ($1, $2, $3, 'Store Wallet Top-Up', 'wallet_topup', $4, $5, 'stripe', 'succeeded', false, false, $6, $4, NOW(), NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              status = 'succeeded',
              confirmed_amount = EXCLUDED.amount,
              confirmed_at = NOW(),
              updated_at = NOW()
          `, [
            sessionId,
            session.customer_details?.name || updatedUser?.name || 'Customer',
            finalEmail,
            baseAmount,
            curr,
            sessionId
          ]).catch(() => {});

          await client.query('COMMIT');

          const ledgerData = await fetchUserLedger(client, updatedUser, finalEmail, finalUserId, 10, 0);

          return NextResponse.json({
            success: true,
            verified: true,
            wallet_balance: newBalance,
            amount: totalAddition,
            transactions: ledgerData.transactions,
            totalCount: ledgerData.totalCount,
            totalPages: Math.ceil(ledgerData.totalCount / 10) || 1,
            stats: ledgerData.stats,
            message: `Stripe Checkout completed! Added +$${baseAmount.toFixed(2)}${bonusCredit > 0 ? ` (+$${bonusCredit.toFixed(2)} bonus)` : ''} to your balance.`,
          });
        } catch (txErr) {
          await client.query('ROLLBACK');
          throw txErr;
        }
      }

      // -----------------------------------------------------------------------
      // 2. ACTION: Reconcile Wallet Sessions with Stripe & PostgreSQL
      // -----------------------------------------------------------------------
      if (action === 'reconcile_wallet') {
        const { email, userId } = body;
        const targetEmail = (email || '').toLowerCase().trim();
        const targetUserId = String(userId || '');

        let reconciledCount = 0;
        const { secretKey } = await getStripeCredentials(client);

        if (secretKey) {
          try {
            const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
            const recentSessions = await stripe.checkout.sessions.list({ limit: 15 });

            for (const s of recentSessions.data) {
              if (s.payment_status !== 'paid') continue;
              const meta = s.metadata || {};
              if (meta.type !== 'wallet_topup') continue;

              const sEmail = (meta.userEmail || s.customer_details?.email || s.customer_email || '').toLowerCase().trim();
              const sUserId = String(meta.userId || s.client_reference_id || '');

              const matchesUser = (targetUserId && sUserId === targetUserId) || (targetEmail && sEmail === targetEmail);
              if (!matchesUser) continue;

              const checkTx = await client.query(
                `SELECT id FROM wallet_transactions WHERE gateway_tx_id = $1 OR metadata->>'stripeSessionId' = $1 LIMIT 1`,
                [s.id]
              );

              if (checkTx.rows.length === 0) {
                const sCurr = (s.currency || 'USD').toUpperCase();
                const rawAmt = s.amount_total ? (ZERO_DECIMAL_CURRENCIES.has(sCurr) ? s.amount_total : s.amount_total / 100) : 0;
                const bAmt = parseFloat(meta.baseAmount || String(rawAmt));
                const bBonus = parseFloat(meta.bonusCredit || '0');
                const bTotal = parseFloat(meta.totalAddition || String(bAmt + bBonus));

                const uRes = await client.query(
                  `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() 
                   WHERE id::text = $2 OR (LOWER(email) = LOWER($3) AND $3 != '') RETURNING id, email, wallet_balance`,
                  [bTotal, sUserId, sEmail]
                );

                const uRow = uRes.rows[0];
                const newBal = uRow ? parseFloat(uRow.wallet_balance || 0) : bTotal;
                const rTxId = `wtx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

                await client.query(`
                  INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
                  VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, $8)
                  ON CONFLICT (id) DO NOTHING
                `, [
                  rTxId,
                  uRow ? String(uRow.id) : (sUserId || 'usr_wallet'),
                  uRow?.email || sEmail,
                  bTotal,
                  newBal,
                  s.id,
                  `Wallet Top-Up (Reconciled): +$${bAmt.toFixed(2)}${bBonus > 0 ? ` (+$${bBonus.toFixed(2)} bonus)` : ''}`,
                  JSON.stringify({ baseAmount: bAmt, bonusCredit: bBonus, totalAddition: bTotal, gateway: 'stripe', stripeSessionId: s.id })
                ]);

                reconciledCount++;
              }
            }
          } catch (recErr) {
            console.warn('[Reconciliation error]:', recErr);
          }
        }

        let userRes = null;
        if (targetUserId || targetEmail) {
          userRes = await client.query(
            `SELECT id, email, name, wallet_balance FROM users WHERE id::text = $1 OR (LOWER(email) = LOWER($2) AND $2 != '') LIMIT 1`,
            [targetUserId, targetEmail]
          ).catch(() => null);
        }

        const user = userRes?.rows?.[0];
        const currentBalance = parseFloat(user?.wallet_balance || 0);
        const ledgerData = await fetchUserLedger(client, user, targetEmail, targetUserId, 10, 0);

        return NextResponse.json({
          success: true,
          reconciledCount,
          wallet_balance: currentBalance,
          transactions: ledgerData.transactions,
          totalCount: ledgerData.totalCount,
          totalPages: Math.ceil(ledgerData.totalCount / 10) || 1,
          stats: ledgerData.stats,
          message: reconciledCount > 0
            ? `Successfully recovered and credited ${reconciledCount} unrecorded Stripe top-up(s)!`
            : 'All Stripe top-ups are synchronized with your wallet ledger.',
        });
      }

      // -----------------------------------------------------------------------
      // 3. ACTION: Standard Deposit / Checkout Dispatch
      // -----------------------------------------------------------------------
      const { email, userId, amount, gateway } = body;
      const cleanAmtStr = String(amount ?? '').replace(/[^0-9.]/g, '');
      const topupAmount = parseFloat(cleanAmtStr);

      if ((!email && !userId) || isNaN(topupAmount) || topupAmount <= 0) {
        return NextResponse.json({
          success: false,
          error: 'A valid user identifier and positive top-up deposit amount are required.',
        }, { status: 400 });
      }

      const settingsRes = await client.query(`SELECT * FROM wallet_settings WHERE id = $1`, ['current']);
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

      let userRes = null;
      if (userId && email) {
        userRes = await client.query(
          `SELECT id, email, name, wallet_balance FROM users WHERE id::text = $1 OR LOWER(email) = LOWER($2) LIMIT 1`,
          [userId, email.trim()]
        ).catch(() => null);
      } else if (userId) {
        userRes = await client.query(
          `SELECT id, email, name, wallet_balance FROM users WHERE id::text = $1 LIMIT 1`,
          [userId]
        ).catch(() => null);
      } else if (email) {
        userRes = await client.query(
          `SELECT id, email, name, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [email.trim()]
        ).catch(() => null);
      }

      if (!userRes || userRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Target user account was not found.' }, { status: 404 });
      }

      const user = userRes.rows[0];
      const currentBalance = parseFloat(user.wallet_balance || 0);

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
      const activeGateway = (gateway || 'stripe').toLowerCase();

      // STRIPE CHECKOUT SESSION PATH
      if (activeGateway === 'stripe') {
        const { secretKey, currency: adminCurrency } = await getStripeCredentials(client);
        if (!secretKey) {
          return NextResponse.json({
            success: false,
            error: 'Stripe Gateway is not configured. Please configure Stripe API keys in Admin Payment Settings.',
          }, { status: 400 });
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
        const currency = (settings.currency || adminCurrency || 'USD').toUpperCase();
        
        let origin = body.origin || req.headers.get('origin');
        if (!origin) {
          const referer = req.headers.get('referer');
          if (referer) {
            try {
              origin = new URL(referer).origin;
            } catch (_) {}
          }
        }
        if (!origin) {
          const host = req.headers.get('host') || 'localhost:3000';
          const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
          origin = `${proto}://${host}`;
        }
        origin = origin.replace(/\/+$/, '');

        const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
        const unitAmount = isZeroDecimal ? Math.round(topupAmount) : Math.round(topupAmount * 100);

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: user.email,
          client_reference_id: String(user.id),
          line_items: [
            {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: {
                  name: `Store Wallet Top-Up (${currency} ${topupAmount.toFixed(2)})`,
                  description: bonusCredit > 0
                    ? `Includes +${currency} ${bonusCredit.toFixed(2)} promotional bonus (Total credit: ${totalAddition.toFixed(2)})`
                    : `Store Credit Deposit for ${user.email}`,
                },
                unit_amount: unitAmount,
              },
              quantity: 1,
            },
          ],
          metadata: {
            type: 'wallet_topup',
            userId: String(user.id),
            userEmail: String(user.email),
            baseAmount: String(topupAmount),
            bonusCredit: String(bonusCredit),
            totalAddition: String(totalAddition),
            currency: currency,
          },
          success_url: `${origin}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/wallet?status=cancelled`,
        });

        return NextResponse.json({
          success: true,
          checkoutUrl: session.url,
          sessionId: session.id,
          message: 'Redirecting to Stripe Checkout...',
        });
      }

      // MANUAL / CUSTOM SETTLEMENT PATH
      const newBalance = currentBalance + totalAddition;
      await client.query(`UPDATE users SET wallet_balance = $1 WHERE id::text = $2`, [newBalance, String(user.id)]);

      const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const desc = bonusCredit > 0
        ? `Wallet Top-Up: +$${topupAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} promotional bonus)`
        : `Wallet Top-Up: +$${topupAmount.toFixed(2)}`;

      await client.query(`
        INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        txId,
        String(user.id),
        user.email,
        'topup',
        totalAddition,
        newBalance,
        activeGateway,
        body.gatewayTxId || `gw_${Date.now()}`,
        'succeeded',
        desc,
        JSON.stringify({ 
          baseAmount: topupAmount, 
          bonusCredit, 
          gateway: activeGateway,
          userEmail: user.email,
          userId: String(user.id)
        }),
      ]);

      await client.query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount,
          currency, gateway, status, is_recurring, auto_renew, gateway_transaction_id, confirmed_amount, confirmed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Store Wallet Top-Up', 'wallet_topup', $4, $5, $6, 'succeeded', false, false, $7, $4, NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          status = 'succeeded',
          confirmed_amount = EXCLUDED.amount,
          confirmed_at = NOW(),
          updated_at = NOW()
      `, [
        txId,
        user.name || user.email?.split('@')[0] || 'Customer',
        user.email,
        topupAmount,
        (settings.currency || 'USD').toUpperCase(),
        activeGateway,
        body.gatewayTxId || txId
      ]).catch(() => {});

      const ledgerData = await fetchUserLedger(client, user, user.email, String(user.id), 10, 0);

      return NextResponse.json({
        success: true,
        message: `Successfully topped up $${topupAmount.toFixed(2)}${bonusCredit > 0 ? ` with an extra $${bonusCredit.toFixed(2)} bonus!` : '!' }`,
        wallet_balance: newBalance,
        transactionId: txId,
        transactions: ledgerData.transactions,
        totalCount: ledgerData.totalCount,
        totalPages: Math.ceil(ledgerData.totalCount / 10) || 1,
        stats: ledgerData.stats,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
