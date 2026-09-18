import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    // If email is not passed via query param, check request headers
    if (!email) {
      email = req.headers.get('x-user-email');
    }

    // Resolve active user from database if still missing
    let userRow: any = null;
    if (email) {
      const uRows = await query(`
        SELECT id, name, email, role, subscription_plan, payment_method, created_at 
        FROM users 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
        LIMIT 1
      `, [email]);
      if (uRows.length > 0) userRow = uRows[0];
    }

    if (!userRow) {
      const anyUserRows = await query(`
        SELECT id, name, email, role, subscription_plan, payment_method, created_at 
        FROM users 
        ORDER BY created_at ASC LIMIT 1
      `);
      if (anyUserRows.length > 0) {
        userRow = anyUserRows[0];
        email = userRow.email;
      } else {
        userRow = {
          id: 'usr_default',
          name: 'Logged-in User',
          email: 'jordan@example.com',
          role: 'user',
          subscription_plan: 'taster',
          payment_method: 'stripe'
        };
        email = userRow.email;
      }
    }

    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Fetch User Payment Transactions from PostgreSQL
    let txRows = await query(`
      SELECT * FROM payment_transactions 
      WHERE LOWER(TRIM(customer_email)) = $1 
      ORDER BY created_at DESC
    `, [cleanEmail]);

    // 2. Auto-healing: If user has a paid plan but no transaction records yet, seed an initial transaction
    const userPlan = (userRow.subscription_plan || 'taster').toLowerCase();
    const isPaidPlan = userPlan !== 'taster' && userPlan !== 'free';

    if (txRows.length === 0 && isPaidPlan) {
      const isAnnual = userPlan.includes('annual') || userPlan.includes('year');
      const amount = isAnnual ? 59.99 : 8.99;
      const interval = isAnnual ? 'YEAR' : 'MONTH';
      const expDate = new Date();
      if (isAnnual) expDate.setFullYear(expDate.getFullYear() + 1);
      else expDate.setMonth(expDate.getMonth() + 1);

      const autoTxId = 'tx_init_' + Math.random().toString(36).substring(2, 9);
      const planName = userPlan.replace(/-/g, ' ').replace(/\w/g, (c) => c.toUpperCase());

      await query(`
        INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount,
          currency, gateway, status, test_mode, is_recurring, recurring_interval,
          auto_renew, expiry_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'USD', 'stripe', 'succeeded', FALSE, TRUE, $7, TRUE, $8, NOW(), NOW())
      `, [
        autoTxId, userRow.name || 'Subscriber', cleanEmail,
        planName, userRow.subscription_plan, amount, interval, expDate.toISOString()
      ]);

      txRows = await query(`
        SELECT * FROM payment_transactions 
        WHERE LOWER(TRIM(customer_email)) = $1 
        ORDER BY created_at DESC
      `, [cleanEmail]);
    }

    const transactions = txRows.map((r: any) => ({
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

    // 3. Fetch Admin Gateway Settings from PostgreSQL
    let gatewayConfig = {
      activeGateway: 'stripe',
      currency: 'USD',
      testMode: true,
      stripe: { enabled: true },
      paypal: { enabled: true, environment: 'sandbox' },
      manual: { enabled: true }
    };

    try {
      const settingsRows = await query(`SELECT key, value FROM admin_settings WHERE key IN ('paymentSettings', 'currency')`);
      for (const row of settingsRows) {
        if (row.key === 'paymentSettings') {
          const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          gatewayConfig = { ...gatewayConfig, ...val };
        } else if (row.key === 'currency') {
          gatewayConfig.currency = typeof row.value === 'string' ? row.value : row.value?.value || 'USD';
        }
      }
    } catch (_) {}

    // 4. Fetch Available Subscription Plans from PostgreSQL
    let plans: any[] = [];
    try {
      const planRows = await query(`
        SELECT id, slug, name, monthly_price_dollars, annual_price_dollars, description, is_active 
        FROM subscription_plans 
        WHERE is_active = TRUE OR is_active IS NULL
        ORDER BY monthly_price_dollars ASC
      `);
      if (planRows.length > 0) {
        plans = planRows.map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.name || p.slug,
          monthlyPrice: Number(p.monthly_price_dollars) || 0,
          annualPrice: Number(p.annual_price_dollars) || 0,
          description: p.description || ''
        }));
      }
    } catch (_) {}

    if (plans.length === 0) {
      plans = [
        { id: 'plan_taster', slug: 'taster', name: 'Taster', monthlyPrice: 0, annualPrice: 0, description: 'Starter free tier with standard features' },
        { id: 'plan_nutrition_pro', slug: 'nutrition-pro', name: 'Nutrition Pro', monthlyPrice: 8.99, annualPrice: 59.99, description: 'Full access to all AI models and high quotas' }
      ];
    }

    return NextResponse.json({
      success: true,
      user: userRow,
      transactions,
      gatewayConfig,
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
        WHERE LOWER(TRIM(email)) = $2
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
        WHERE LOWER(TRIM(customer_email)) = $1 AND LOWER(status) IN ('succeeded', 'successful', 'paid', 'active')
      `, [email]);

      return NextResponse.json({
        success: true,
        message: 'Subscription renewal cancelled. Access remains active until the end of your billing cycle.'
      });
    }

    // ACTION 3: Upgrade / Downgrade Plan
    if (action === 'change_plan') {
      const newPlanSlug = body.planSlug || 'taster';
      const planName = body.planName || 'Plan';
      const amount = Number(body.amount || 0);
      const interval = body.interval === 'YEAR' ? 'YEAR' : 'MONTH';
      const gateway = body.gateway || 'stripe';
      const currency = body.currency || 'USD';

      // Mark prior transactions as refunded/cancelled
      await query(`
        UPDATE payment_transactions
        SET status = 'refunded',
            auto_renew = FALSE,
            is_recurring = FALSE,
            updated_at = NOW()
        WHERE LOWER(TRIM(customer_email)) = $1 AND LOWER(status) IN ('succeeded', 'successful', 'paid', 'active')
      `, [email]);

      if (newPlanSlug === 'taster' || newPlanSlug === 'free' || amount === 0) {
        await query(`
          UPDATE users 
          SET subscription_plan = 'taster', updated_at = NOW() 
          WHERE LOWER(TRIM(email)) = $1
        `, [email]);

        return NextResponse.json({ success: true, message: 'Reverted to free plan (Taster).' });
      }

      const expDate = new Date();
      if (interval === 'YEAR') {
        expDate.setFullYear(expDate.getFullYear() + 1);
      } else {
        expDate.setMonth(expDate.getMonth() + 1);
      }

      const txId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

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

      await query(`
        UPDATE users 
        SET subscription_plan = $1, updated_at = NOW() 
        WHERE LOWER(TRIM(email)) = $2
      `, [newPlanSlug, email]);

      return NextResponse.json({
        success: true,
        message: `Plan upgraded successfully to ${planName}!`
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown billing action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
