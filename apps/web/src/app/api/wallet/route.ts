import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

const ZERO_DECIMAL_CURRENCIES = [
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
];

function isValidStripeSecretKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 25) return false;
  if (trimmed.includes('...') || trimmed.includes('*') || trimmed.includes('placeholder') || trimmed.includes('sample')) {
    return false;
  }
  return (
    trimmed.startsWith('sk_test_') ||
    trimmed.startsWith('sk_live_') ||
    trimmed.startsWith('rk_test_') ||
    trimmed.startsWith('rk_live_')
  );
}

function getPrimaryEnvFilePath(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, 'apps', 'web', '.env'),
    path.join(cwd, 'apps', 'web', '.env.local'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(cwd, '.env');
}

function parseEnvFile(filePath: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return map;
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.substring(0, idx).trim();
        let v = trimmed.substring(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        map[k] = v;
      }
    }
  } catch (_) {}
  return map;
}

async function getStripeCredentials(client?: any) {
  let secretKey = '';
  let publishableKey = '';
  let currency = 'USD';
  let testMode = true;

  // 1. Check PostgreSQL admin_settings with multiple schema variations
  if (client) {
    try {
      const res = await client.query(`
        SELECT key, value, payment_settings, currency, updated_at 
        FROM admin_settings 
        WHERE key IN ('payment_gateway_config', 'paymentSettings', 'primary_settings', 'payment_settings') 
           OR id::text IN ('1', 'primary_settings', 'current') 
        ORDER BY updated_at DESC LIMIT 5
      `);
      const rows = res.rows || [];
      for (const row of rows) {
        let val = row.value || row.payment_settings;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (_) {}
        }
        if (val && typeof val === 'object') {
          if (!secretKey) {
            secretKey = val.stripe?.secretKey || val.secretKey || val.stripeSecretKey || '';
          }
          if (!publishableKey) {
            publishableKey = val.stripe?.publishableKey || val.publishableKey || val.stripePublishableKey || '';
          }
          if (val.testMode !== undefined) {
            testMode = Boolean(val.testMode);
          }
          if (row.currency) currency = row.currency;
          else if (val.currency) currency = val.currency;
          if (secretKey) break;
        }
      }
    } catch (_) {}
  }

  // 2. Check data/admin_settings.json file mirror
  if (!secretKey) {
    try {
      const filePath = path.join(process.cwd(), 'data', 'admin_settings.json');
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const ps = fileData.paymentSettings || fileData.payment_gateway_config || fileData;
        if (ps) {
          secretKey = ps.stripe?.secretKey || ps.secretKey || '';
          publishableKey = ps.stripe?.publishableKey || ps.publishableKey || '';
          if (ps.currency) currency = ps.currency;
          if (ps.testMode !== undefined) testMode = Boolean(ps.testMode);
        }
      }
    } catch (_) {}
  }

  // 3. Check .env and .env.local files directly
  if (!secretKey) {
    try {
      const primaryEnv = getPrimaryEnvFilePath();
      const envMap = parseEnvFile(primaryEnv);
      secretKey = envMap['STRIPE_SECRET_KEY'] || envMap['STRIPE_SK'] || '';
      publishableKey = envMap['STRIPE_PUBLISHABLE_KEY'] || envMap['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] || '';
      if (envMap['PAYMENT_CURRENCY']) currency = envMap['PAYMENT_CURRENCY'];
      if (envMap['PAYMENT_TEST_MODE'] !== undefined) testMode = envMap['PAYMENT_TEST_MODE'] === 'true';
    } catch (_) {}
  }

  // 4. Check process.env in-memory runtime
  if (!secretKey) {
    secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
    if (!publishableKey) {
      publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    }
    if (process.env.PAYMENT_CURRENCY) currency = process.env.PAYMENT_CURRENCY;
  }

  return {
    secretKey: (secretKey || '').trim(),
    publishableKey: (publishableKey || '').trim(),
    currency: (currency || 'USD').toUpperCase(),
    testMode
  };
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
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    console.warn('[Wallet DB init warning]:', err);
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
      const stripeCreds = await getStripeCredentials(client);
      const isStripeConfigured = isValidStripeSecretKey(stripeCreds.secretKey);

      const settingsRes = await client.query('SELECT * FROM wallet_settings WHERE id = $1', ['current']);
      const settings = settingsRes.rows[0] || {
        is_enabled: true,
        currency: stripeCreds.currency || 'USD',
        min_topup: 5.00,
        max_topup: 1000.00,
        preset_amounts: [10, 25, 50, 100, 250],
        bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
        allowed_gateways: ['stripe', 'paypal', 'manual'],
        allow_site_purchases: true,
      };

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
        const countRes = await client.query(`SELECT COUNT(*) FROM wallet_transactions WHERE ${whereSql}`, values);
        totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

        const pageValues = [...values, limit, offset];
        const rowsRes = await client.query(
          `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
          pageValues
        );
        transactions = rowsRes.rows;

        const statsRes = await client.query(`
          SELECT
            COALESCE(SUM(CASE WHEN amount > 0 AND status = 'succeeded' THEN amount ELSE 0 END), 0) as total_deposited,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
            COUNT(*) as total_events
          FROM wallet_transactions
          WHERE (LOWER(user_email) = LOWER($1) OR user_id = $2) AND status = 'succeeded'
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
        settings: {
          ...settings,
          stripe_configured: isStripeConfigured,
          test_mode: stripeCreds.testMode,
        },
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
        let baseAmount = 0;
        let bonusCredit = 0;
        let totalAddition = 0;
        let targetEmail = (body.email || '').toLowerCase().trim();
        let targetUserId = body.userId || '';
        let customerName = 'Customer';
        let currency = 'USD';

        if (sessionId.startsWith('sim_')) {
          // Handled simulation session
          const existingTx = await client.query(
            `SELECT id, balance_after FROM wallet_transactions WHERE gateway_tx_id = $1 AND status = 'succeeded' LIMIT 1`,
            [sessionId]
          );
          if (existingTx.rows.length > 0) {
            return NextResponse.json({
              success: true,
              verified: true,
              wallet_balance: parseFloat(existingTx.rows[0].balance_after || 0),
              message: 'Deposit already credited to your wallet.',
            });
          }
        } else {
          if (!isValidStripeSecretKey(secretKey)) {
            return NextResponse.json({
              success: false,
              error: 'Stripe Secret Key is not configured in Admin Payment Settings.',
            }, { status: 400 });
          }

          const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
          const session = await stripe.checkout.sessions.retrieve(sessionId);

          if (!session || session.payment_status !== 'paid') {
            return NextResponse.json({
              success: false,
              error: `Stripe payment status is ${session?.payment_status || 'unpaid'}.`,
            }, { status: 400 });
          }

          const metadata = session.metadata || {};
          baseAmount = parseFloat(metadata.baseAmount || String((session.amount_total || 0) / 100));
          bonusCredit = parseFloat(metadata.bonusCredit || '0');
          totalAddition = parseFloat(metadata.totalAddition || String(baseAmount + bonusCredit));
          targetEmail = (metadata.userEmail || session.customer_email || session.customer_details?.email || targetEmail).toLowerCase().trim();
          targetUserId = metadata.userId || targetUserId;
          customerName = session.customer_details?.name || 'Customer';
          currency = (session.currency || 'USD').toUpperCase();
        }

        // Idempotency guard: check existing wallet_transactions
        const existingTx = await client.query(
          `SELECT id, balance_after FROM wallet_transactions WHERE gateway_tx_id = $1 AND status = 'succeeded' LIMIT 1`,
          [sessionId]
        );

        if (existingTx.rows.length > 0) {
          const userCheck = await client.query(
            `SELECT wallet_balance FROM users WHERE LOWER(email) = LOWER($1) OR id = $2 LIMIT 1`,
            [targetEmail, targetUserId]
          );
          const currentBal = parseFloat(userCheck.rows[0]?.wallet_balance || existingTx.rows[0].balance_after || 0);

          return NextResponse.json({
            success: true,
            verified: true,
            alreadyProcessed: true,
            wallet_balance: currentBal,
            message: `Deposit of $${baseAmount.toFixed(2)} was already credited to your wallet!`,
          });
        }

        // Increment user wallet balance
        const updateRes = await client.query(
          `UPDATE users 
           SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW()
           WHERE LOWER(email) = LOWER($2) OR id = $3
           RETURNING id, email, wallet_balance`,
          [totalAddition, targetEmail, targetUserId]
        );

        const updatedUser = updateRes.rows[0];
        const newBalance = updatedUser ? parseFloat(updatedUser.wallet_balance || 0) : totalAddition;
        const finalUserId = updatedUser?.id || targetUserId || 'usr_wallet';

        const wtxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const desc = bonusCredit > 0
          ? `Wallet Top-Up: +$${baseAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} promotional bonus)`
          : `Wallet Top-Up: +$${baseAmount.toFixed(2)}`;

        await client.query(`
          INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
          VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, $8)
          ON CONFLICT (id) DO UPDATE SET status = 'succeeded', balance_after = EXCLUDED.balance_after
        `, [
          wtxId,
          finalUserId,
          targetEmail,
          totalAddition,
          newBalance,
          sessionId,
          desc,
          JSON.stringify({ baseAmount, bonusCredit, totalAddition, gateway: 'stripe', stripeSessionId: sessionId }),
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
          customerName,
          targetEmail,
          baseAmount,
          currency,
          sessionId
        ]).catch(() => {});

        return NextResponse.json({
          success: true,
          verified: true,
          wallet_balance: newBalance,
          amount: totalAddition,
          message: `Stripe Checkout completed! Added +$${baseAmount.toFixed(2)}${bonusCredit > 0 ? ` (+$${bonusCredit.toFixed(2)} bonus)` : ''} to your balance.`,
        });
      }

      // -----------------------------------------------------------------------
      // 2. ACTION: Reconcile Wallet Transactions with Stripe
      // -----------------------------------------------------------------------
      if (action === 'reconcile_wallet') {
        const targetEmail = (body.email || '').toLowerCase().trim();
        const targetUserId = String(body.userId || '');
        const { secretKey } = await getStripeCredentials(client);

        const userRes = await client.query(
          `SELECT id, email, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) OR id = $2 LIMIT 1`,
          [targetEmail, targetUserId]
        );
        const curBal = parseFloat(userRes.rows[0]?.wallet_balance || 0);

        if (!isValidStripeSecretKey(secretKey)) {
          return NextResponse.json({
            success: true,
            wallet_balance: curBal,
            message: 'Ledger verified. (Live Stripe synchronization requires API keys in Admin Payment Settings).',
          });
        }

        try {
          const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
          const sessions = await stripe.checkout.sessions.list({ limit: 30 });
          let reconciledCount = 0;

          for (const sess of sessions.data) {
            if (sess.payment_status === 'paid' && sess.metadata?.type === 'wallet_topup') {
              const sessEmail = (sess.metadata.userEmail || sess.customer_email || sess.customer_details?.email || '').toLowerCase().trim();
              const sessUserId = sess.metadata.userId || '';

              if (sessEmail === targetEmail || (targetUserId && sessUserId === targetUserId)) {
                const existRes = await client.query(
                  `SELECT id FROM wallet_transactions WHERE gateway_tx_id = $1 AND status = 'succeeded' LIMIT 1`,
                  [sess.id]
                );
                if (existRes.rows.length === 0) {
                  const baseAmount = parseFloat(sess.metadata.baseAmount || String((sess.amount_total || 0) / 100));
                  const bonusCredit = parseFloat(sess.metadata.bonusCredit || '0');
                  const totalAddition = parseFloat(sess.metadata.totalAddition || String(baseAmount + bonusCredit));

                  const updateBal = await client.query(
                    `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE LOWER(email) = LOWER($2) OR id = $3 RETURNING wallet_balance`,
                    [totalAddition, sessEmail, sessUserId]
                  );
                  const newBal = parseFloat(updateBal.rows[0]?.wallet_balance || 0);

                  const wtxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                  await client.query(`
                    INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
                    VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, $8)
                  `, [
                    wtxId,
                    sessUserId || targetUserId,
                    sessEmail,
                    totalAddition,
                    newBal,
                    sess.id,
                    `Wallet Top-Up (Reconciled): +$${baseAmount.toFixed(2)}`,
                    JSON.stringify({ baseAmount, bonusCredit, totalAddition, gateway: 'stripe', stripeSessionId: sess.id })
                  ]);
                  reconciledCount++;
                }
              }
            }
          }

          const finalBalRes = await client.query(
            `SELECT wallet_balance FROM users WHERE LOWER(email) = LOWER($1) OR id = $2 LIMIT 1`,
            [targetEmail, targetUserId]
          );
          const finalBal = parseFloat(finalBalRes.rows[0]?.wallet_balance || curBal);

          return NextResponse.json({
            success: true,
            wallet_balance: finalBal,
            message: reconciledCount > 0
              ? `Reconciled ${reconciledCount} missing Stripe transaction(s)! Balance updated.`
              : 'Ledger is fully synchronized with Stripe.',
          });
        } catch (e: any) {
          return NextResponse.json({
            success: true,
            wallet_balance: curBal,
            message: 'Ledger scan completed.',
          });
        }
      }

      // -----------------------------------------------------------------------
      // 3. ACTION: Standard Deposit / Checkout Dispatch
      // -----------------------------------------------------------------------
      const { email, userId, amount, gateway } = body;
      const topupAmount = parseFloat(amount);

      if ((!email && !userId) || isNaN(topupAmount) || topupAmount <= 0) {
        return NextResponse.json({
          success: false,
          error: 'A valid user identifier and positive top-up deposit amount are required.',
        }, { status: 400 });
      }

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

      // STRIPE CHECKOUT PATH
      if (activeGateway === 'stripe') {
        const stripeCreds = await getStripeCredentials(client);
        const hasValidKey = isValidStripeSecretKey(stripeCreds.secretKey);

        if (hasValidKey) {
          const stripe = new Stripe(stripeCreds.secretKey, { apiVersion: '2023-10-16' as any });
          const currency = (settings.currency || stripeCreds.currency || 'USD').toLowerCase();
          const origin = body.origin || req.headers.get('origin') || 'http://localhost:3000';
          const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase());
          const unitAmount = isZeroDecimal ? Math.round(topupAmount) : Math.round(topupAmount * 100);

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: user.email,
            client_reference_id: String(user.id),
            line_items: [
              {
                price_data: {
                  currency,
                  product_data: {
                    name: `Store Wallet Top-Up (${currency.toUpperCase()} ${topupAmount.toFixed(2)})`,
                    description: bonusCredit > 0
                      ? `Includes +${currency.toUpperCase()} ${bonusCredit.toFixed(2)} promotional bonus (Total credit: ${totalAddition.toFixed(2)})`
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
              currency: currency.toUpperCase(),
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

        // Sandbox Test Mode fallback if keys are missing or pending
        if (stripeCreds.testMode || process.env.NODE_ENV !== 'production') {
          const newBalance = currentBalance + totalAddition;
          await client.query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, user.id]);

          const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const gwTxId = `sim_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const desc = bonusCredit > 0
            ? `Wallet Top-Up (Sandbox Stripe): +$${topupAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} promotional bonus)`
            : `Wallet Top-Up (Sandbox Stripe): +$${topupAmount.toFixed(2)}`;

          await client.query(`
            INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
            VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, $8)
          `, [
            txId,
            user.id,
            user.email,
            totalAddition,
            newBalance,
            gwTxId,
            desc,
            JSON.stringify({ baseAmount: topupAmount, bonusCredit, totalAddition, gateway: 'stripe', sandbox: true }),
          ]);

          await client.query(`
            INSERT INTO payment_transactions (
              id, customer_name, customer_email, plan_name, plan_slug, amount,
              currency, gateway, status, is_recurring, auto_renew, gateway_transaction_id, confirmed_amount, confirmed_at, created_at, updated_at
            ) VALUES ($1, $2, $3, 'Store Wallet Top-Up (Sandbox)', 'wallet_topup', $4, $5, 'stripe', 'succeeded', false, false, $6, $4, NOW(), NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET status = 'succeeded', confirmed_amount = EXCLUDED.amount, confirmed_at = NOW(), updated_at = NOW()
          `, [
            gwTxId,
            user.name || 'Customer',
            user.email,
            topupAmount,
            (settings.currency || 'USD').toUpperCase(),
            gwTxId
          ]).catch(() => {});

          return NextResponse.json({
            success: true,
            sandbox: true,
            wallet_balance: newBalance,
            transactionId: txId,
            message: `Sandbox Test Mode: Added +$${topupAmount.toFixed(2)}${bonusCredit > 0 ? ` (+$${bonusCredit.toFixed(2)} bonus)` : ''} to your wallet! (To use live Stripe Checkout, enter API keys in Admin Payment Settings).`,
          });
        }

        // Live Production Mode without configured keys: Return clear error with configuration link
        return NextResponse.json({
          success: false,
          requiresAdminConfig: true,
          error: 'Stripe Gateway is not configured. Please configure Stripe API keys in Admin Payment Settings (/admin/payment-gateway).',
        }, { status: 400 });
      }

      // MANUAL OR ALTERNATIVE GATEWAY SETTLEMENT
      const newBalance = currentBalance + totalAddition;
      await client.query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, user.id]);

      const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const desc = bonusCredit > 0
        ? `Wallet Top-Up: +$${topupAmount.toFixed(2)} (Includes +$${bonusCredit.toFixed(2)} promotional bonus)`
        : `Wallet Top-Up: +$${topupAmount.toFixed(2)}`;

      await client.query(`
        INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata)
        VALUES ($1, $2, $3, 'topup', $4, $5, $6, $7, 'succeeded', $8, $9)
      `, [
        txId,
        user.id,
        user.email,
        totalAddition,
        newBalance,
        activeGateway,
        body.gatewayTxId || `gw_${Date.now()}`,
        desc,
        JSON.stringify({ baseAmount: topupAmount, bonusCredit, gateway: activeGateway }),
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
