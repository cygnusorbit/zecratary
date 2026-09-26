import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { grantMonthlyPlanTokenReward } from '@/lib/tokenService';

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

async function ensureBillingSchema(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(100) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      subscription_plan VARCHAR(100) DEFAULT 'taster',
      subscription_tier VARCHAR(100) DEFAULT 'taster',
      plan_slug VARCHAR(100) DEFAULT 'taster',
      plan_name VARCHAR(255) DEFAULT 'Taster',
      plan_interval VARCHAR(20) DEFAULT 'MONTH',
      token_balance NUMERIC(14,2) DEFAULT 50000,
      wallet_balance NUMERIC(12,2) DEFAULT 0.00,
      payment_method VARCHAR(50) DEFAULT 'wallet',
      expiry_date TIMESTAMP WITH TIME ZONE,
      plan_expiry_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0.00;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'taster';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(100) DEFAULT 'taster';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_slug VARCHAR(100) DEFAULT 'taster';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) DEFAULT 'Taster';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_interval VARCHAR(20) DEFAULT 'MONTH';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance NUMERIC(14,2) DEFAULT 50000;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'wallet';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id VARCHAR(100) PRIMARY KEY,
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      plan_name VARCHAR(255),
      plan_slug VARCHAR(100),
      amount NUMERIC(10,2) DEFAULT 0.00,
      currency VARCHAR(10) DEFAULT 'USD',
      gateway VARCHAR(50) DEFAULT 'wallet',
      status VARCHAR(50) DEFAULT 'succeeded',
      failure_reason TEXT,
      is_recurring BOOLEAN DEFAULT true,
      recurring_interval VARCHAR(20) DEFAULT 'MONTH',
      auto_renew BOOLEAN DEFAULT true,
      expiry_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(20) DEFAULT 'MONTH';
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100),
      user_email VARCHAR(255),
      type VARCHAR(50) DEFAULT 'purchase',
      amount NUMERIC(12,2) DEFAULT 0.00,
      balance_after NUMERIC(12,2) DEFAULT 0.00,
      gateway VARCHAR(50) DEFAULT 'wallet',
      gateway_tx_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'succeeded',
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id VARCHAR(100) PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      monthly_price_dollars NUMERIC(10,2) DEFAULT 0.00,
      annual_price_dollars NUMERIC(10,2) DEFAULT 0.00,
      token_limit INTEGER DEFAULT 50000,
      monthly_badge VARCHAR(100),
      annual_badge VARCHAR(100),
      trial_badge VARCHAR(100),
      description_monthly TEXT,
      description_annual TEXT,
      features JSONB DEFAULT '[]'::jsonb,
      is_free BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS token_settings (
      id VARCHAR(64) PRIMARY KEY,
      token_name VARCHAR(100) DEFAULT 'Foodie Token',
      token_symbol VARCHAR(20) DEFAULT '🪙',
      token_icon VARCHAR(100) DEFAULT '🪙',
      is_enabled BOOLEAN DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gateway_settings (
      id VARCHAR(100) PRIMARY KEY,
      settings JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wallet_settings (
      id VARCHAR(100) PRIMARY KEY,
      settings JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

export async function GET(req: NextRequest) {
  const client = await getPool().connect();
  try {
    await ensureBillingSchema(client);
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email')?.trim() || '';
    const rawUserId = searchParams.get('userId')?.trim() || '';

    const email = (rawEmail !== 'undefined' && rawEmail !== 'null') ? rawEmail.toLowerCase() : '';
    const userId = (rawUserId !== 'undefined' && rawUserId !== 'null') ? rawUserId : '';

    let user = null;
    if (userId || email) {
      const uRes = await client.query(
        `SELECT id, email, name, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, token_balance, wallet_balance, payment_method, expiry_date, plan_expiry_date, created_at
         FROM users 
         WHERE ($1 != '' AND id::text = $1) 
            OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
         LIMIT 1`,
        [userId, email]
      );
      if (uRes.rows.length > 0) user = uRes.rows[0];
    }

    if (!user && (email || userId)) {
      const createU = await client.query(`
        INSERT INTO users (id, email, name, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, token_balance, wallet_balance, payment_method, created_at, updated_at)
        VALUES ($1, $2, $3, 'taster', 'taster', 'taster', 'Taster', 'MONTH', 50000, 0.00, 'wallet', NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [userId || `usr_${Date.now()}`, email || 'member@example.com', email ? email.split('@')[0] : 'Member']);
      user = createU.rows[0];
    }

    if (!user) {
      const fallbackU = await client.query('SELECT * FROM users ORDER BY created_at ASC LIMIT 1');
      if (fallbackU.rows.length > 0) user = fallbackU.rows[0];
    }

    if (!user) {
      user = {
        id: userId || 'user_default',
        email: email || 'member@example.com',
        name: 'Member',
        subscription_plan: 'taster',
        plan_interval: 'MONTH',
        token_balance: 50000,
        wallet_balance: 0.00,
        payment_method: 'wallet'
      };
    }

    // Live ledger balance query
    let liveWalletBalance = parseFloat(user.wallet_balance || 0);
    try {
      const wtxRes = await client.query(
        `SELECT balance_after FROM wallet_transactions 
         WHERE (user_id::text = $1 AND $1 != '') OR (LOWER(TRIM(user_email)) = LOWER(TRIM($2)) AND $2 != '')
         ORDER BY created_at DESC LIMIT 1`,
        [String(user.id || ''), user.email || '']
      );
      if (wtxRes.rows.length > 0 && typeof wtxRes.rows[0].balance_after !== 'undefined') {
        const ledgerBal = parseFloat(wtxRes.rows[0].balance_after);
        if (!isNaN(ledgerBal)) {
          liveWalletBalance = ledgerBal;
          await client.query(`UPDATE users SET wallet_balance = $1 WHERE id = $2`, [liveWalletBalance, user.id]);
        }
      }
    } catch (_) {}
    user.wallet_balance = liveWalletBalance;

    const txRes = await client.query(
      `SELECT * FROM payment_transactions 
       WHERE ($1 != '' AND LOWER(TRIM(customer_email)) = LOWER(TRIM($1))) 
          OR ($2 != '' AND (customer_email = $2 OR id = $2))
       ORDER BY created_at DESC LIMIT 50`,
      [user.email, user.id]
    );

    // Auto-seed initial transaction if user holds a paid plan without historical records
    if (user.subscription_plan && !['taster', 'free'].includes(user.subscription_plan.toLowerCase()) && txRes.rows.length === 0) {
      const autoTxId = `tx_init_${Date.now()}`;
      const isAnnual = user.subscription_plan.includes('annual') || user.plan_interval === 'YEAR';
      const autoAmount = isAnnual ? 59.99 : 8.99;
      const expiry = new Date();
      if (isAnnual) expiry.setFullYear(expiry.getFullYear() + 1);
      else expiry.setMonth(expiry.getMonth() + 1);

      await client.query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount, currency, gateway, status, is_recurring, recurring_interval, auto_renew, expiry_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'USD', 'wallet', 'succeeded', true, $7, true, $8, NOW(), NOW())
      `, [
        autoTxId,
        user.name || user.email.split('@')[0],
        user.email,
        user.plan_name || 'Nutrition Pro',
        user.subscription_plan,
        autoAmount,
        isAnnual ? 'YEAR' : 'MONTH',
        expiry.toISOString()
      ]);

      const updatedTx = await client.query(
        `SELECT * FROM payment_transactions WHERE LOWER(TRIM(customer_email)) = LOWER(TRIM($1)) ORDER BY created_at DESC LIMIT 50`,
        [user.email]
      );
      txRes.rows = updatedTx.rows;
    }

    // Force amount to be a JS Number to eliminate client-side toFixed string errors
    const sanitizedTransactions = txRes.rows.map((tx: any) => ({
      id: String(tx.id || ''),
      customerName: tx.customer_name || tx.customerName || user.name || '',
      customerEmail: tx.customer_email || tx.customerEmail || user.email || '',
      planName: tx.plan_name || tx.planName || 'Subscription Tier',
      planSlug: tx.plan_slug || tx.planSlug || '',
      amount: typeof tx.amount === 'number' ? tx.amount : (parseFloat(tx.amount || 0) || 0),
      currency: (tx.currency || 'USD').toUpperCase(),
      gateway: tx.gateway || 'wallet',
      status: (tx.status || 'succeeded').toLowerCase(),
      failureReason: tx.failure_reason || tx.failureReason,
      isRecurring: Boolean(tx.is_recurring ?? tx.isRecurring ?? true),
      recurringInterval: (tx.recurring_interval || tx.recurringInterval || 'MONTH').toUpperCase(),
      autoRenew: Boolean(tx.auto_renew ?? tx.autoRenew ?? true),
      expiryDate: tx.expiry_date || tx.expiryDate,
      createdAt: tx.created_at || tx.createdAt || new Date().toISOString()
    }));

    const plansRes = await client.query(`
      SELECT 
        id, 
        slug, 
        name, 
        COALESCE(monthly_price_dollars, 0)::float AS "monthlyPrice", 
        COALESCE(annual_price_dollars, 0)::float AS "annualPrice", 
        COALESCE(token_limit, 50000)::int AS "tokenLimit", 
        COALESCE(monthly_badge, '') AS "monthlyBadge", 
        COALESCE(annual_badge, '') AS "annualBadge", 
        COALESCE(trial_badge, '') AS "trialBadge", 
        COALESCE(description_monthly, '') AS "descriptionMonthly", 
        COALESCE(description_annual, '') AS "descriptionAnnual", 
        COALESCE(description_monthly, description_annual, '') AS "description", 
        features, 
        COALESCE(is_free, false) AS "isFree"
      FROM subscription_plans 
      WHERE slug NOT IN ('foodie-pro', 'master-chef')
      ORDER BY monthly_price_dollars ASC, id ASC
    `);

    let tokenIdentity = {
      tokenName: 'Foodie Token',
      tokenSymbol: '🪙',
      tokenIcon: '🪙'
    };
    try {
      const tsRes = await client.query('SELECT token_name, token_symbol, token_icon FROM token_settings ORDER BY updated_at DESC LIMIT 1');
      if (tsRes.rows.length > 0) {
        const row = tsRes.rows[0];
        tokenIdentity = {
          tokenName: row.token_name || 'Foodie Token',
          tokenSymbol: row.token_symbol || '🪙',
          tokenIcon: row.token_icon || row.token_symbol || '🪙'
        };
      }
    } catch (_) {}

    let gatewayConfig = {
      activeGateway: 'stripe',
      currency: 'USD',
      currencySymbol: '$',
      stripe: { enabled: true },
      paypal: { enabled: true },
      manual: { enabled: true }
    };

    try {
      const gRes = await client.query("SELECT * FROM gateway_settings WHERE id = 'current'");
      if (gRes.rows.length > 0 && gRes.rows[0].settings) {
        gatewayConfig = { ...gatewayConfig, ...gRes.rows[0].settings };
      }
    } catch (_) {}

    let walletConfig = {
      enabled: true,
      walletName: 'Store Wallet',
      allowSubscriptionPayment: true
    };

    try {
      const wRes = await client.query("SELECT * FROM wallet_settings WHERE id = 'current'");
      if (wRes.rows.length > 0 && wRes.rows[0].settings) {
        walletConfig = { ...walletConfig, ...wRes.rows[0].settings };
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      user,
      transactions: sanitizedTransactions,
      plans: plansRes.rows.length > 0 ? plansRes.rows : undefined,
      gatewayConfig,
      walletConfig,
      tokenIdentity
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await getPool().connect();
  try {
    await ensureBillingSchema(client);
    const body = await req.json();
    const action = body.action;

    if (action === 'change_plan') {
      const {
        email,
        userId,
        userName,
        planSlug,
        planName,
        amount,
        interval,
        tokenLimit,
        gateway = 'wallet',
        currency = 'USD',
        autoRenew = true
      } = body;

      const numAmount = parseFloat(amount || 0);
      const isTargetFree = numAmount === 0 || (planSlug && (planSlug.includes('taster') || planSlug === 'free'));
      const planInterval = (interval || 'MONTH').toUpperCase();
      const tokensCredited = parseInt(tokenLimit || (isTargetFree ? 50000 : 500000), 10);

      const targetEmail = (email || '').toLowerCase().trim();
      const targetUserId = String(userId || '').trim();

      if (!targetEmail && !targetUserId) {
        return NextResponse.json({ success: false, error: 'User identifier is required' }, { status: 400 });
      }

      await client.query('BEGIN');
      try {
        const uRes = await client.query(
          `SELECT * FROM users 
           WHERE ($1 != '' AND id::text = $1) 
              OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
           FOR UPDATE`,
          [targetUserId, targetEmail]
        );

        let userRecord = uRes.rows[0];
        if (!userRecord) {
          const createU = await client.query(`
            INSERT INTO users (id, email, name, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, token_balance, wallet_balance, payment_method, updated_at)
            VALUES ($1, $2, $3, 'taster', 'taster', 'taster', 'Taster', 'MONTH', 50000, 0.00, 'wallet', NOW())
            RETURNING *
          `, [targetUserId || `usr_${Date.now()}`, targetEmail || 'member@example.com', userName || 'Member']);
          userRecord = createU.rows[0];
        }

        const currentWalletBalance = parseFloat(userRecord.wallet_balance || 0);

        if (!isTargetFree) {
          if (currentWalletBalance < numAmount) {
            await client.query('ROLLBACK');
            return NextResponse.json({
              success: false,
              error: `Insufficient wallet balance. You have $${currentWalletBalance.toFixed(2)}, but this plan requires $${numAmount.toFixed(2)}.`
            }, { status: 400 });
          }

          const newWalletBalance = currentWalletBalance - numAmount;
          const walletTxId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

          await client.query(`
            INSERT INTO wallet_transactions (
              id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, metadata, created_at
            ) VALUES ($1, $2, $3, 'plan_purchase', $4, $5, 'wallet', $6, 'succeeded', $7, $8, NOW())
          `, [
            walletTxId,
            String(userRecord.id),
            userRecord.email,
            -Math.abs(numAmount),
            newWalletBalance,
            `sub_pay_${Date.now()}`,
            `Subscription Plan: ${planName} (${planInterval})`,
            JSON.stringify({ planSlug, planName, interval: planInterval, source: 'billing_portal' })
          ]);

          userRecord.wallet_balance = newWalletBalance;
        }

        const expiry = new Date();
        if (planInterval === 'YEAR' || planInterval === 'ANNUAL') {
          expiry.setFullYear(expiry.getFullYear() + 1);
        } else {
          expiry.setMonth(expiry.getMonth() + 1);
        }

        await client.query(`
          UPDATE payment_transactions 
          SET status = 'canceled', 
              auto_renew = false, 
              is_recurring = false, 
              updated_at = NOW() 
          WHERE (LOWER(TRIM(customer_email)) = LOWER(TRIM($1)) OR customer_email = $2)
            AND status IN ('active', 'succeeded', 'successful', 'paid')
        `, [userRecord.email, String(userRecord.id)]);

        const baseSlug = planSlug.replace(/^(preset_|plan_)/i, '').replace(/-(monthly|annual|year)$/i, '').trim();
        await client.query(`
          UPDATE users 
          SET subscription_plan = $1,
              subscription_tier = $2,
              plan_slug = $1,
              plan_name = $3,
              plan_interval = $4,
              token_balance = COALESCE(token_balance, 0) + $5,
              wallet_balance = $6,
              payment_method = $7,
              expiry_date = $8,
              plan_expiry_date = $8,
              updated_at = NOW()
          WHERE id::text = $9::text
        `, [
          planSlug,
          baseSlug,
          planName,
          planInterval,
          tokensCredited,
          userRecord.wallet_balance,
          'wallet',
          isTargetFree ? null : expiry.toISOString(),
          userRecord.id
        ]);

        const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(`
          INSERT INTO payment_transactions (
            id, customer_name, customer_email, plan_name, plan_slug, amount, currency, gateway, status, failure_reason, is_recurring, recurring_interval, auto_renew, expiry_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'wallet', 'succeeded', NULL, $8, $9, $10, $11, NOW(), NOW())
        `, [
          txId,
          userRecord.name || userName || userRecord.email?.split('@')[0],
          userRecord.email,
          planName,
          planSlug,
          numAmount,
          currency.toUpperCase(),
          Boolean(autoRenew),
          planInterval,
          Boolean(autoRenew),
          isTargetFree ? null : expiry.toISOString()
        ]);

        await client.query('COMMIT');

        try {
          await grantMonthlyPlanTokenReward(userRecord.email, tokensCredited, { planSlug, planName });
        } catch (_) {}

        return NextResponse.json({
          success: true,
          message: isTargetFree
            ? `Switched to ${planName} successfully.`
            : `Successfully activated ${planName} using Store Wallet!`,
          wallet_balance: userRecord.wallet_balance,
          transactionId: txId
        });
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    if (action === 'cancel_subscription') {
      const { email, transactionId } = body;
      if (transactionId) {
        await client.query(
          "UPDATE payment_transactions SET auto_renew = false, status = 'canceled', updated_at = NOW() WHERE id = $1",
          [transactionId]
        );
      } else if (email) {
        await client.query(
          "UPDATE payment_transactions SET auto_renew = false, status = 'canceled', updated_at = NOW() WHERE LOWER(TRIM(customer_email)) = LOWER(TRIM($1)) AND status IN ('active', 'succeeded')",
          [email.trim()]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Auto-renewal has been cancelled. Active tier remains intact until the expiration date.'
      });
    }

    if (action === 'resume_subscription') {
      const { email, transactionId } = body;
      if (transactionId) {
        await client.query(
          "UPDATE payment_transactions SET auto_renew = true, status = 'succeeded', updated_at = NOW() WHERE id = $1",
          [transactionId]
        );
      } else if (email) {
        await client.query(
          "UPDATE payment_transactions SET auto_renew = true, status = 'succeeded', updated_at = NOW() WHERE LOWER(TRIM(customer_email)) = LOWER(TRIM($1))",
          [email.trim()]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Auto-renewal has been reactivated successfully.'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
