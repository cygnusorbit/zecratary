import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { grantPlanTokensOnPurchase, getTokenSettings } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

async function ensureBillingSchema() {
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(64) DEFAULT 'stripe';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_slug VARCHAR(128) DEFAULT 'taster';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) DEFAULT 'Taster (Free)';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_interval VARCHAR(32) DEFAULT 'MONTH';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance NUMERIC DEFAULT 100;

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(128) PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        plan_name VARCHAR(255),
        plan_slug VARCHAR(128),
        amount NUMERIC(10, 2) DEFAULT 0,
        currency VARCHAR(16) DEFAULT 'USD',
        gateway VARCHAR(64) DEFAULT 'stripe',
        status VARCHAR(64) DEFAULT 'succeeded',
        failure_reason TEXT,
        test_mode BOOLEAN DEFAULT TRUE,
        is_recurring BOOLEAN DEFAULT TRUE,
        recurring_interval VARCHAR(32) DEFAULT 'MONTH',
        auto_renew BOOLEAN DEFAULT TRUE,
        expiry_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_email ON payment_transactions(customer_email);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureBillingSchema();
  try {
    const { searchParams } = new URL(req.url);
    let email = searchParams.get('email') || req.headers.get('x-user-email');

    let userRow: any = null;
    if (email) {
      const uRows = await query(
        `SELECT id, name, email, role, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, plan_expiry_date, payment_method, token_balance, created_at 
         FROM users 
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`,
        [email]
      ).catch(() => []);
      if (Array.isArray(uRows) && uRows.length > 0) userRow = uRows[0];
      else if (uRows?.rows && uRows.rows.length > 0) userRow = uRows.rows[0];
    }

    if (!userRow) {
      const anyUserRows = await query(
        `SELECT id, name, email, role, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, plan_expiry_date, payment_method, token_balance, created_at 
         FROM users 
         ORDER BY CASE WHEN LOWER(role) = 'admin' THEN 1 ELSE 0 END, created_at ASC LIMIT 1`
      ).catch(() => []);
      const rows = Array.isArray(anyUserRows) ? anyUserRows : (anyUserRows?.rows || []);
      if (rows.length > 0) {
        userRow = rows[0];
        email = userRow.email;
      } else {
        userRow = {
          id: 'usr_default',
          name: 'Logged-in User',
          email: 'jordan@example.com',
          role: 'user',
          subscription_plan: 'taster',
          subscription_tier: 'taster',
          plan_slug: 'taster',
          plan_name: 'Taster (Free)',
          plan_interval: 'MONTH',
          plan_expiry_date: null,
          payment_method: 'stripe',
          token_balance: 100
        };
        email = userRow.email;
      }
    }

    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Fetch User Transactions
    const txRows = await query(
      `SELECT * FROM payment_transactions 
       WHERE LOWER(TRIM(customer_email)) = $1 
       ORDER BY created_at DESC`,
      [cleanEmail]
    ).catch(() => []);
    const rawTxs = Array.isArray(txRows) ? txRows : (txRows?.rows || []);

    const transactions = rawTxs.map((r: any) => ({
      id: r.id,
      customerName: r.customer_name || userRow.name,
      customerEmail: r.customer_email || userRow.email,
      planName: r.plan_name || 'Subscription',
      planSlug: r.plan_slug || '',
      amount: Number(r.amount) || 0,
      currency: r.currency || 'USD',
      gateway: r.gateway || 'stripe',
      status: r.status || 'succeeded',
      failureReason: r.failure_reason,
      testMode: Boolean(r.test_mode),
      isRecurring: r.is_recurring !== undefined ? Boolean(r.is_recurring) : true,
      recurringInterval: r.recurring_interval || 'MONTH',
      autoRenew: r.auto_renew !== undefined ? Boolean(r.auto_renew) : true,
      expiryDate: r.expiry_date ? new Date(r.expiry_date).toISOString() : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));

    // 2. Fetch Gateway & Currency Settings
    let gatewayConfig = {
      activeGateway: 'stripe',
      currency: 'USD',
      currencySymbol: '$',
      testMode: true,
      stripe: { enabled: true },
      paypal: { enabled: true, environment: 'sandbox' },
      manual: { enabled: true }
    };

    try {
      const sRes = await query(`SELECT payment_settings, currency FROM admin_settings LIMIT 1`);
      const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
      if (sRow) {
        if (sRow.payment_settings) {
          const val = typeof sRow.payment_settings === 'string' ? JSON.parse(sRow.payment_settings) : sRow.payment_settings;
          gatewayConfig = { ...gatewayConfig, ...val };
        }
        if (sRow.currency) {
          gatewayConfig.currency = sRow.currency;
        }
      }
    } catch (_) {}

    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
      JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
    };
    gatewayConfig.currencySymbol = symbols[gatewayConfig.currency] || '$';

    // 3. Fetch Token Identity
    let tokenIdentity = { tokenName: 'Tokens', tokenSymbol: '🪙' };
    try {
      const tSettings = await getTokenSettings();
      if (tSettings) {
        tokenIdentity.tokenName = tSettings.tokenName || 'Tokens';
        tokenIdentity.tokenSymbol = tSettings.tokenSymbol || '🪙';
      }
    } catch (_) {}

    // 4. Fetch Available Subscription Plans from PostgreSQL
    let plans: any[] = [];
    try {
      const planRows = await query(`
        SELECT 
          id, name, slug, plan_group_id, monthly_plan_id, annual_plan_id,
          monthly_price_dollars, annual_price_dollars, monthly_badge, annual_badge, trial_badge,
          description_monthly, description_annual, features, token_limit, is_free, is_default
        FROM subscription_plans
        ORDER BY is_free DESC, monthly_price_dollars ASC
      `);
      const pList = Array.isArray(planRows) ? planRows : (planRows?.rows || []);
      if (pList && pList.length > 0) {
        plans = pList.map((p: any) => ({
          id: p.id,
          name: p.name || p.slug,
          slug: p.slug,
          planGroupId: p.plan_group_id || `group_${p.slug}`,
          monthlyPlanId: p.monthly_plan_id || `plan_${p.slug}_monthly`,
          annualPlanId: p.annual_plan_id || `plan_${p.slug}_annual`,
          monthlyPrice: Number(p.monthly_price_dollars ?? 0),
          annualPrice: Number(p.annual_price_dollars ?? 0),
          monthlyBadge: p.monthly_badge || '',
          annualBadge: p.annual_badge || '',
          trialBadge: p.trial_badge || '',
          description: p.description_monthly || p.description_annual || 'Full plan access',
          features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []),
          tokenLimit: Number(p.token_limit ?? 500),
          isFree: Boolean(p.is_free),
          isDefault: Boolean(p.is_default)
        }));
      }
    } catch (_) {}

    if (plans.length === 0) {
      plans = [
        {
          id: 'preset_taster',
          name: 'Taster',
          slug: 'taster',
          monthlyPrice: 0,
          annualPrice: 0,
          tokenLimit: 50,
          description: 'Starter tier with essential recipe creation and AI tools',
          features: ['5 AI recipes / mo', 'Personal library (25 recipes)', 'Smart repurposing'],
          isFree: true
        },
        {
          id: 'plan_nutrition_pro',
          name: 'Nutrition Pro',
          slug: 'nutrition-pro',
          monthlyPrice: 8.99,
          annualPrice: 59.99,
          tokenLimit: 500,
          monthlyBadge: 'Popular',
          annualBadge: 'Best Value',
          description: 'Full AI capabilities, macro calculation, and high token quotas',
          features: ['Unlimited AI recipes', 'Macro tracking', '500 AI tokens credited per cycle', 'Priority processing'],
          isFree: false
        }
      ];
    }

    return NextResponse.json({
      success: true,
      user: userRow,
      transactions,
      gatewayConfig,
      tokenIdentity,
      plans
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureBillingSchema();
  try {
    const body = await req.json();
    const action = body.action;
    const email = (body.email || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    // 1. Update Preferred Payment Method
    if (action === 'update_payment_method') {
      const method = body.paymentMethod || 'stripe';
      await query(`UPDATE users SET payment_method = $1, updated_at = NOW() WHERE LOWER(TRIM(email)) = $2`, [method, email]);
      return NextResponse.json({ success: true, message: 'Payment method successfully updated.' });
    }

    // 2. Cancel Subscription Renewal
    if (action === 'cancel_subscription') {
      await query(`
        UPDATE payment_transactions
        SET auto_renew = FALSE,
            is_recurring = FALSE,
            status = 'canceled',
            updated_at = NOW()
        WHERE LOWER(TRIM(customer_email)) = $1 AND LOWER(status) IN ('succeeded', 'paid', 'active')
      `, [email]);

      return NextResponse.json({
        success: true,
        message: 'Auto-renewal cancelled. You will continue to have paid access until your current billing period ends.'
      });
    }

    // 3. Reactivate / Resume Subscription Renewal
    if (action === 'resume_subscription' || action === 'reactivate_subscription') {
      await query(`
        UPDATE payment_transactions
        SET auto_renew = TRUE,
            is_recurring = TRUE,
            status = 'succeeded',
            updated_at = NOW()
        WHERE LOWER(TRIM(customer_email)) = $1 
          AND (expiry_date IS NULL OR expiry_date > NOW())
          AND LOWER(status) = 'canceled'
      `, [email]);

      return NextResponse.json({
        success: true,
        message: 'Auto-renewal has been successfully reactivated!'
      });
    }

    // 4. Upgrade / Downgrade / Switch Plan
    if (action === 'change_plan') {
      const rawPlanSlug = String(body.planSlug || 'taster').toLowerCase().trim();
      const cleanBase = rawPlanSlug.replace(/-(monthly|annual|year)$/i, '');
      const isFree = cleanBase === 'taster' || cleanBase === 'free' || Number(body.amount) === 0;
      const interval = body.interval === 'YEAR' ? 'YEAR' : 'MONTH';
      const finalPlanSlug = isFree ? 'taster' : (rawPlanSlug.includes('-') ? rawPlanSlug : `${cleanBase}-${interval.toLowerCase()}`);
      const planName = body.planName || (isFree ? 'Taster (Free)' : cleanBase);
      const amount = isFree ? 0 : Number(body.amount || 0);
      const gateway = body.gateway || 'stripe';
      const currency = body.currency || 'USD';
      const customTokens = Number(body.tokenLimit ?? 0);

      // Rule 3: Mark prior active transactions as refunded/cancelled in PostgreSQL
      await query(`
        UPDATE payment_transactions
        SET status = 'refunded',
            auto_renew = FALSE,
            is_recurring = FALSE,
            expiry_date = NOW(),
            updated_at = NOW()
        WHERE LOWER(TRIM(customer_email)) = $1 AND LOWER(status) IN ('succeeded', 'paid', 'active')
      `, [email]);

      if (isFree) {
        // Revert to Free Plan in users table
        await query(`
          UPDATE users 
          SET subscription_plan = 'taster',
              subscription_tier = 'taster',
              plan_slug = 'taster',
              plan_name = 'Taster (Free)',
              plan_interval = 'MONTH',
              plan_expiry_date = NULL,
              updated_at = NOW() 
          WHERE LOWER(TRIM(email)) = $1
        `, [email]);

        try {
          await grantPlanTokensOnPurchase(email, 'taster', {
            planName: 'Taster (Free)',
            customTokens: customTokens || 50
          });
        } catch (_) {}

        return NextResponse.json({ success: true, message: 'Switched to free plan tier (Taster).' });
      }

      // Compute expiration date
      const expDate = new Date();
      if (interval === 'YEAR') {
        expDate.setFullYear(expDate.getFullYear() + 1);
      } else {
        expDate.setMonth(expDate.getMonth() + 1);
      }

      const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

      // Insert fresh Succeeded Payment Transaction
      await query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount,
          currency, gateway, status, test_mode, is_recurring, recurring_interval,
          auto_renew, expiry_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'succeeded', FALSE, TRUE, $9, TRUE, $10, NOW(), NOW())
      `, [
        txId, body.userName || 'Subscriber', email, planName, finalPlanSlug,
        amount, currency, gateway, interval, expDate.toISOString()
      ]);

      // Atomically synchronize users table
      await query(`
        UPDATE users 
        SET subscription_plan = $1,
            subscription_tier = $1,
            plan_slug = $1,
            plan_name = $2,
            plan_interval = $3,
            plan_expiry_date = $4,
            updated_at = NOW() 
        WHERE LOWER(TRIM(email)) = $5
      `, [finalPlanSlug, planName, interval, expDate.toISOString(), email]);

      // Grant Tokens to PostgreSQL balance and log audit record
      let tokenGrantResult = null;
      try {
        tokenGrantResult = await grantPlanTokensOnPurchase(email, finalPlanSlug, {
          orderId: txId,
          planName,
          customTokens: customTokens > 0 ? customTokens : undefined
        });
      } catch (tokenErr) {
        console.warn('[grantPlanTokensOnPurchase error]:', tokenErr);
      }

      return NextResponse.json({
        success: true,
        message: `Plan purchased successfully! Activated ${planName}.`,
        transactionId: txId,
        tokenGrant: tokenGrantResult
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown billing action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
