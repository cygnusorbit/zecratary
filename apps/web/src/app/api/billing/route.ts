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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) DEFAULT 0.00;

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
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureBillingSchema();
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || req.headers.get('x-user-email');
    const showAll = searchParams.get('all') === 'true' || searchParams.get('source') === 'gateway';

    let userRow: any = null;
    if (email) {
      const uRows = await query(
        `SELECT id, name, email, role, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, plan_expiry_date, payment_method, token_balance, wallet_balance, created_at 
         FROM users 
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`,
        [email]
      ).catch(() => []);
      if (Array.isArray(uRows) && uRows.length > 0) userRow = uRows[0];
      else if (uRows?.rows && uRows.rows.length > 0) userRow = uRows.rows[0];
    }

    if (!userRow) {
      const anyUserRows = await query(
        `SELECT id, name, email, role, subscription_plan, subscription_tier, plan_slug, plan_name, plan_interval, plan_expiry_date, payment_method, token_balance, wallet_balance, created_at 
         FROM users 
         ORDER BY CASE WHEN LOWER(role) = 'admin' THEN 1 ELSE 0 END, created_at ASC LIMIT 1`
      ).catch(() => []);
      const rows = Array.isArray(anyUserRows) ? anyUserRows : (anyUserRows?.rows || []);
      if (rows.length > 0) userRow = rows[0];
    }

    // 1. Fetch Payment Transactions (All transactions when requested, or user-filtered)
    let txRows: any[] = [];
    if (showAll || !email) {
      const allRes = await query(`SELECT * FROM payment_transactions ORDER BY created_at DESC`).catch(() => []);
      txRows = Array.isArray(allRes) ? allRes : (allRes?.rows || []);
    } else {
      const filteredRes = await query(
        `SELECT * FROM payment_transactions WHERE LOWER(TRIM(customer_email)) = LOWER(TRIM($1)) ORDER BY created_at DESC`,
        [email]
      ).catch(() => []);
      txRows = Array.isArray(filteredRes) ? filteredRes : (filteredRes?.rows || []);
    }

    const transactions = txRows.map((r: any) => ({
      id: String(r.id || ''),
      customerName: r.customer_name || 'Customer',
      customerEmail: r.customer_email || '',
      planName: r.plan_name || 'Transaction',
      planSlug: r.plan_slug || '',
      amount: Number(r.amount) || 0,
      currency: (r.currency || 'USD').toUpperCase(),
      gateway: r.gateway || 'stripe',
      status: (r.status || 'succeeded').toLowerCase(),
      failureReason: r.failure_reason,
      testMode: Boolean(r.test_mode),
      isRecurring: r.is_recurring !== undefined ? Boolean(r.is_recurring) : true,
      recurringInterval: (r.recurring_interval || (String(r.plan_slug || '').includes('annual') ? 'YEAR' : 'MONTH')).toUpperCase(),
      autoRenew: r.auto_renew !== undefined ? Boolean(r.auto_renew) : true,
      expiryDate: r.expiry_date ? new Date(r.expiry_date).toISOString() : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));

    // 2. Gateway Settings
    let gatewayConfig = {
      activeGateway: 'stripe',
      currency: 'USD',
      currencySymbol: '$',
      testMode: true,
      stripe: { enabled: true },
      paypal: { enabled: true },
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

    // 3. Token Identity
    let tokenIdentity = { tokenName: 'Tokens', tokenSymbol: '🪙' };
    try {
      const tSettings = await getTokenSettings();
      if (tSettings) {
        tokenIdentity.tokenName = tSettings.tokenName || 'Tokens';
        tokenIdentity.tokenSymbol = tSettings.tokenSymbol || '🪙';
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      user: userRow,
      transactions,
      gatewayConfig,
      tokenIdentity
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
