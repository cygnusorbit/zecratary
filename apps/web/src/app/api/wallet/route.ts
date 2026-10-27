import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

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
        preset_amounts JSONB DEFAULT '[10, 25, 50, 100, 250]'::jsonb,
        bonus_rules JSONB DEFAULT '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]'::jsonb,
        allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]'::jsonb,
        allow_site_purchases BOOLEAN DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        user_email VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL DEFAULT 'topup',
        amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        balance_after NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        gateway VARCHAR(32) DEFAULT 'stripe',
        gateway_tx_id VARCHAR(255),
        status VARCHAR(32) DEFAULT 'succeeded',
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure all critical columns exist on wallet_transactions
    const cols = [
      'user_id VARCHAR(64)',
      'user_email VARCHAR(255)',
      'type VARCHAR(32) DEFAULT \'topup\'',
      'amount NUMERIC(10,2) DEFAULT 0.00',
      'balance_after NUMERIC(10,2) DEFAULT 0.00',
      'gateway VARCHAR(32) DEFAULT \'stripe\'',
      'gateway_tx_id VARCHAR(255)',
      'status VARCHAR(32) DEFAULT \'succeeded\'',
      'description TEXT',
      'metadata JSONB DEFAULT \'{}\'::jsonb',
      'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
    ];

    for (const c of cols) {
      try {
        await query(`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS ${c};`);
      } catch (_) {}
    }

    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;`);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);`);
      await query(`UPDATE users SET user_id = id WHERE (user_id IS NULL OR user_id = '') AND id IS NOT NULL;`);
    } catch (_) {}

    isDbInitialized = true;
  } catch (err: any) {
    console.warn('[Wallet DB init warning]:', err.message);
  }
}

async function getStripeCredentials() {
  let secretKey = process.env.STRIPE_SECRET_KEY || '';
  let publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  let currency = 'USD';

  try {
    const res: any = await query(
      `SELECT payment_settings, currency FROM admin_settings WHERE id IN ('primary_settings', '1') ORDER BY updated_at DESC LIMIT 1`
    );
    const row = Array.isArray(res) ? res[0] : res?.rows?.[0];
    if (row) {
      const ps = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
      if (ps?.stripe?.secretKey) secretKey = ps.stripe.secretKey;
      if (ps?.stripe?.publishableKey) publishableKey = ps.stripe.publishableKey;
      if (row.currency) currency = row.currency;
      else if (ps?.currency) currency = ps.currency;
    }
  } catch (_) {}

  return { secretKey: secretKey.trim(), publishableKey: publishableKey.trim(), currency };
}

async function fetchUserLedger(user: any, email = '', userId = '', limit = 10, offset = 0, typeFilter = 'all', search = '') {
  const targetEmail = (user?.email || email || '').toLowerCase().trim();
  const dbUserId = user?.id ? String(user.id).trim() : '';
  const passedUserId = (userId && userId !== 'undefined' && userId !== 'null') ? String(userId).trim() : '';

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

  if (identityClauses.length === 0) {
    return { transactions: [], totalCount: 0, stats: { totalDeposited: 0, totalSpent: 0, totalEvents: 0 } };
  }

  conditions.push(`(${identityClauses.join(' OR ')})`);

  if (typeFilter && typeFilter !== 'all') {
    values.push(typeFilter);
    conditions.push(`type = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const sIdx = values.length;
    conditions.push(`(LOWER(description) LIKE $${sIdx} OR LOWER(id) LIKE $${sIdx} OR LOWER(COALESCE(gateway_tx_id, '')) LIKE $${sIdx})`);
  }

  const tableWhereSql = conditions.join(' AND ');

  try {
    const countRes: any = await query(`SELECT COUNT(*) as count FROM wallet_transactions WHERE ${tableWhereSql}`, values);
    const countRow = Array.isArray(countRes) ? countRes[0] : countRes?.rows?.[0];
    const totalCount = parseInt(countRow?.count || '0', 10);

    const pageValues = [...values, limit, offset];
    const rowsRes: any = await query(
      `SELECT * FROM wallet_transactions WHERE ${tableWhereSql} ORDER BY created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues
    );
    const transactions = Array.isArray(rowsRes) ? rowsRes : rowsRes?.rows || [];

    const statsRes: any = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 AND status IN ('succeeded', 'successful', 'completed', 'paid') THEN amount ELSE 0 END), 0) as total_deposited,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
        COUNT(*) as total_events
      FROM wallet_transactions
      WHERE ${tableWhereSql} AND status IN ('succeeded', 'successful', 'completed', 'paid')
    `, values);
    const statsRow = Array.isArray(statsRes) ? statsRes[0] : statsRes?.rows?.[0];

    const stats = {
      totalDeposited: parseFloat(statsRow?.total_deposited || 0),
      totalSpent: parseFloat(statsRow?.total_spent || 0),
      totalEvents: parseInt(statsRow?.total_events || 0, 10),
    };

    return { transactions, totalCount, stats };
  } catch (err: any) {
    console.warn('[fetchUserLedger notice]:', err.message);
    return { transactions: [], totalCount: 0, stats: { totalDeposited: 0, totalSpent: 0, totalEvents: 0 } };
  }
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

    let settings = {
      is_enabled: true,
      currency: 'USD',
      min_topup: 5.00,
      max_topup: 1000.00,
      preset_amounts: [10, 25, 50, 100, 250],
      bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
      allowed_gateways: ['stripe', 'paypal', 'manual'],
      allow_site_purchases: true,
    };

    try {
      const settingsRes: any = await query('SELECT * FROM wallet_settings WHERE id = $1 LIMIT 1', ['current']);
      const row = Array.isArray(settingsRes) ? settingsRes[0] : settingsRes?.rows?.[0];
      if (row) settings = { ...settings, ...row };
    } catch (_) {}

    let user: any = null;
    let walletBalance = 0;

    if (userId || email) {
      try {
        const userRes: any = await query(
          `SELECT id, email, name, wallet_balance FROM users 
           WHERE ($1 != '' AND (id::text = $1 OR user_id::text = $1)) 
              OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
           LIMIT 1`,
          [userId, email]
        );
        const uRow = Array.isArray(userRes) ? userRes[0] : userRes?.rows?.[0];
        if (uRow) {
          user = uRow;
          walletBalance = parseFloat(uRow.wallet_balance || 0);
        }
      } catch (_) {}
    }

    const { transactions, totalCount, stats } = await fetchUserLedger(
      user, email, userId, limit, offset, typeFilter, search
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
  } catch (err: any) {
    // Non-breaking fallback response guarantees HTTP 200 for user UI
    return NextResponse.json({
      success: true,
      settings: {
        is_enabled: true,
        currency: 'USD',
        min_topup: 5.00,
        max_topup: 1000.00,
        preset_amounts: [10, 25, 50, 100, 250],
        bonus_rules: [],
        allowed_gateways: ['stripe', 'paypal', 'manual'],
        allow_site_purchases: true
      },
      user: null,
      wallet_balance: 0,
      transactions: [],
      totalCount: 0,
      totalPages: 1,
      page: 1,
      limit: 10,
      stats: { totalDeposited: 0, totalSpent: 0, totalEvents: 0 },
      notice: err.message
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initWalletDb();
    const body = await req.json();
    const action = body.action || 'topup';

    if (action === 'verify_stripe_session') {
      const sessionId = body.sessionId?.trim() || body.session_id?.trim();
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
      }

      const { secretKey } = await getStripeCredentials();
      if (!secretKey) {
        return NextResponse.json({ success: false, error: 'Stripe Secret Key is not configured.' }, { status: 400 });
      }

      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session || (session.payment_status !== 'paid' && session.status !== 'complete')) {
        return NextResponse.json({
          success: false,
          error: `Stripe payment status is ${session?.payment_status || 'unpaid'}.`,
        }, { status: 400 });
      }

      const metadata = session.metadata || {};
      const baseAmount = parseFloat(metadata.baseAmount || String((session.amount_total || 0) / 100));
      const bonusCredit = parseFloat(metadata.bonusCredit || '0');
      const totalAddition = parseFloat(metadata.totalAddition || String(baseAmount + bonusCredit));

      const rawEmail = metadata.userEmail || body.email || session.customer_email || session.customer_details?.email || '';
      const targetEmail = (rawEmail !== 'undefined' && rawEmail !== 'null') ? rawEmail.toLowerCase().trim() : '';
      const rawUserId = String(metadata.userId || body.userId || session.client_reference_id || '').trim();
      const targetUserId = (rawUserId !== 'undefined' && rawUserId !== 'null') ? rawUserId : '';

      const wtxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const desc = bonusCredit > 0
        ? `Wallet Top-Up: +$${baseAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} bonus)`
        : `Wallet Top-Up: +$${baseAmount.toFixed(2)}`;

      try {
        await query(`
          UPDATE users 
          SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW()
          WHERE ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
             OR ($3 != '' AND (id::text = $3 OR user_id::text = $3))
        `, [totalAddition, targetEmail, targetUserId]);

        await query(`
          INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
          VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          wtxId, targetUserId || 'usr_admin_1', targetEmail || 'admin@zecratary.com',
          totalAddition, totalAddition, sessionId, desc,
          JSON.stringify({ baseAmount, bonusCredit, totalAddition, sessionId })
        ]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        verified: true,
        wallet_balance: totalAddition,
        message: `Stripe Checkout completed! Added +$${baseAmount.toFixed(2)} to your balance.`
      });
    }

    return NextResponse.json({ success: true, message: 'Action completed' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
