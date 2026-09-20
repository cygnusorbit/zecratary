import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { grantPlanTokensOnPurchase, getTokenSettings } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

async function ensureBillingSchema() {
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(64) DEFAULT 'stripe';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(128) DEFAULT 'taster';
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
    let email = searchParams.get('email');

    // Default to first non-admin user if email is not provided
    if (!email) {
      const uRows = await query(`
        SELECT email FROM users 
        WHERE role != 'admin' 
        ORDER BY created_at ASC LIMIT 1
      `);
      email = uRows.length > 0 ? uRows[0].email : 'user@foodieprep.com';
    }
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Fetch User Record
    const userRows = await query(`
      SELECT id, name, email, role, subscription_plan, payment_method, token_balance, created_at 
      FROM users 
      WHERE LOWER(email) = $1 LIMIT 1
    `, [cleanEmail]);

    const user = userRows.length > 0 ? userRows[0] : {
      id: 'usr_default',
      name: 'Logged-in User',
      email: cleanEmail,
      role: 'user',
      subscription_plan: 'taster',
      payment_method: 'stripe',
      token_balance: 100
    };

    // 2. Fetch User Payment Transactions from PostgreSQL
    const txRows = await query(`
      SELECT * FROM payment_transactions 
      WHERE LOWER(customer_email) = $1 
      ORDER BY created_at DESC
    `, [cleanEmail]);

    const transactions = txRows.map((r: any) => ({
      id: r.id,
      customerName: r.customer_name || user.name,
      customerEmail: r.customer_email || user.email,
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

    // 3. Fetch Admin Gateway & Currency Settings from PostgreSQL
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
      const settingsRows = await query(`SELECT key, value FROM admin_settings WHERE key IN ('paymentSettings', 'currency', 'systemSettings')`);
      for (const row of settingsRows) {
        if (row.key === 'paymentSettings') {
          const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          gatewayConfig = { ...gatewayConfig, ...val };
        } else if (row.key === 'currency') {
          gatewayConfig.currency = typeof row.value === 'string' ? row.value : row.value?.value || 'USD';
        }
      }
    } catch (_) {}

    // Currency symbol mapping
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
      JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
    };
    gatewayConfig.currencySymbol = symbols[gatewayConfig.currency] || '$';

    // 4. Fetch Token Identity
    let tokenIdentity = { tokenName: 'Tokens', tokenSymbol: '🪙' };
    try {
      const tSettings = await getTokenSettings();
      if (tSettings) {
        tokenIdentity.tokenName = tSettings.tokenName || 'Tokens';
        tokenIdentity.tokenSymbol = tSettings.tokenSymbol || '🪙';
      }
    } catch (_) {}

    // 5. Fetch Available Subscription Plans Dynamically from PostgreSQL (subscription_plans)
    let plans: any[] = [];
    try {
      const planRows = await query(`
        SELECT 
          id, name, slug, plan_group_id, monthly_plan_id, annual_plan_id,
          monthly_price_dollars, annual_price_dollars, monthly_badge, annual_badge, trial_badge,
          description_monthly, description_annual, features, token_limit,
          ai_recipe_limit, recipe_library_limit, social_scrape_limit, can_view_macros,
          allowed_ai_models, is_free, is_default
        FROM subscription_plans
        ORDER BY is_free DESC, monthly_price_dollars ASC
      `);

      if (planRows && planRows.length > 0) {
        plans = planRows.map((p: any) => ({
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
          aiRecipeLimit: Number(p.ai_recipe_limit ?? 50),
          recipeLibraryLimit: Number(p.recipe_library_limit ?? 250),
          socialScrapeLimit: Number(p.social_scrape_limit ?? 20),
          canViewMacros: Boolean(p.can_view_macros),
          allowedAiModels: p.allowed_ai_models || 'gemini-1.5-flash,gpt-3.5-turbo',
          isFree: Boolean(p.is_free),
          isDefault: Boolean(p.is_default)
        }));
      }
    } catch (_) {}

    // Dynamic fallback if plans table is currently empty
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
      user,
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

    // ACTION 1: Update Preferred Payment Method
    if (action === 'update_payment_method') {
      const method = body.paymentMethod || 'stripe';
      await query(`
        UPDATE users 
        SET payment_method = $1, updated_at = NOW() 
        WHERE LOWER(email) = $2
      `, [method, email]);
      return NextResponse.json({ success: true, message: 'Payment method successfully updated.' });
    }

    // ACTION 2: Cancel Subscription Renewal
    if (action === 'cancel_subscription') {
      await query(`
        UPDATE payment_transactions
        SET auto_renew = FALSE,
            is_recurring = FALSE,
            status = 'canceled',
            updated_at = NOW()
        WHERE LOWER(customer_email) = $1 AND LOWER(status) IN ('succeeded', 'paid', 'active')
      `, [email]);

      return NextResponse.json({
        success: true,
        message: 'Subscription renewal cancelled. Access remains active until the end of your billing cycle.'
      });
    }

    // ACTION 3: Purchase / Upgrade / Switch Plan
    if (action === 'change_plan') {
      const newPlanSlug = String(body.planSlug || 'taster').toLowerCase().trim();
      const planName = body.planName || 'Plan';
      const amount = Number(body.amount || 0);
      const interval = body.interval === 'YEAR' ? 'YEAR' : 'MONTH';
      const gateway = body.gateway || 'stripe';
      const currency = body.currency || 'USD';
      const customTokens = Number(body.tokenLimit ?? 0);

      // 1. Mark prior active transactions as refunded/cancelled in PostgreSQL
      await query(`
        UPDATE payment_transactions
        SET status = 'refunded',
            auto_renew = FALSE,
            is_recurring = FALSE,
            updated_at = NOW()
        WHERE LOWER(customer_email) = $1 AND LOWER(status) IN ('succeeded', 'paid', 'active')
      `, [email]);

      // 2. Handle Revert to Free Plan
      if (newPlanSlug === 'taster' || newPlanSlug === 'free' || amount === 0) {
        await query(`
          UPDATE users 
          SET subscription_plan = 'taster', updated_at = NOW() 
          WHERE LOWER(email) = $1
        `, [email]);

        // Grant free plan tokens
        try {
          await grantPlanTokensOnPurchase(email, 'taster', {
            planName: 'Taster (Free)',
            customTokens: customTokens || 50
          });
        } catch (_) {}

        return NextResponse.json({ success: true, message: 'Switched to free plan tier (Taster).' });
      }

      // 3. Compute Expiry Date (1 Month or 1 Year)
      const expDate = new Date();
      if (interval === 'YEAR') {
        expDate.setFullYear(expDate.getFullYear() + 1);
      } else {
        expDate.setMonth(expDate.getMonth() + 1);
      }

      const txId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

      // 4. Record Succeeded Payment Transaction in PostgreSQL
      await query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount,
          currency, gateway, status, test_mode, is_recurring, recurring_interval,
          auto_renew, expiry_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'succeeded', FALSE, TRUE, $9, TRUE, $10, NOW(), NOW())
      `, [
        txId, body.userName || 'User', email, planName, newPlanSlug,
        amount, currency, gateway, interval, expDate.toISOString()
      ]);

      // 5. Update users table subscription_plan
      await query(`
        UPDATE users 
        SET subscription_plan = $1, updated_at = NOW() 
        WHERE LOWER(email) = $2
      `, [newPlanSlug, email]);

      // 6. Grant Tokens and Record Audit Ledger Transaction on /admin/token-setting
      let tokenGrantResult = null;
      try {
        tokenGrantResult = await grantPlanTokensOnPurchase(email, newPlanSlug, {
          orderId: txId,
          planName,
          customTokens: customTokens > 0 ? customTokens : undefined
        });
      } catch (tokenErr) {
        console.warn('grantPlanTokensOnPurchase warning:', tokenErr);
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
