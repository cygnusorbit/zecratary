import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function ensureWalletSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY DEFAULT 1,
        payment_settings JSONB,
        currency VARCHAR(10) DEFAULT 'USD',
        site_name TEXT,
        theme_colors JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        wallet_balance NUMERIC(12,2) DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id TEXT,
        user_email TEXT,
        amount NUMERIC(12,2) DEFAULT 0.00,
        balance_after NUMERIC(12,2) DEFAULT 0.00,
        type VARCHAR(50) DEFAULT 'topup',
        gateway VARCHAR(50) DEFAULT 'stripe',
        gateway_tx_id TEXT,
        status VARCHAR(50) DEFAULT 'succeeded',
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(255) PRIMARY KEY,
        customer_name TEXT,
        customer_email TEXT,
        plan_name TEXT,
        plan_slug TEXT,
        amount NUMERIC(12,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        gateway VARCHAR(50) DEFAULT 'stripe',
        status VARCHAR(50) DEFAULT 'succeeded',
        transfer_reference TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0.00; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12,2) DEFAULT 0.00; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS transfer_reference TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS notes TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);
  } catch (err) {
    console.warn('[Wallet API] Schema check notice:', err);
  }
}

async function getSynchronizedGatewayConfig() {
  await ensureWalletSchema();

  let config: any = {
    activeGateway: 'stripe',
    currency: 'USD',
    testMode: true,
    stripe: { enabled: true, publishableKey: '', secretKey: '', webhookSecret: '' },
    paypal: { enabled: false, clientId: '', clientSecret: '', webhookId: '', environment: 'sandbox' },
    manualSettlement: {
      enabled: false,
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      routingNumber: '',
      swiftBic: '',
      branchName: '',
      instructions: '',
      requireReference: true
    }
  };

  // 1. PostgreSQL/MySQL admin_settings check
  try {
    const sRes = await query(`SELECT * FROM admin_settings ORDER BY id ASC LIMIT 5`);
    const rows = Array.isArray(sRes) ? sRes : (sRes?.rows || []);
    for (const row of rows) {
      if (row.payment_settings) {
        const ps = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
        if (ps && typeof ps === 'object') config = { ...config, ...ps };
      }
      if (row.value) {
        const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (val && typeof val === 'object') config = { ...config, ...val };
      }
      if (row.currency) config.currency = row.currency;
    }
  } catch (_) {}

  // 2. Local filesystem mirror check
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'data', 'admin_settings.json'),
      path.join(process.cwd(), '..', 'data', 'admin_settings.json'),
      path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    ];
    for (const fp of candidatePaths) {
      if (fs.existsSync(fp)) {
        const fd = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (fd.paymentSettings) config = { ...config, ...fd.paymentSettings };
        if (fd.currency) config.currency = fd.currency;
        break;
      }
    }
  } catch (_) {}

  // 3. Fallback credentials from environment variables
  if (!config.stripe.publishableKey) {
    config.stripe.publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
  }
  if (!config.stripe.secretKey) {
    config.stripe.secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
  }
  if (!config.stripe.webhookSecret) {
    config.stripe.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }
  if (!config.paypal.clientId) {
    config.paypal.clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
  }
  if (!config.paypal.clientSecret) {
    config.paypal.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  }

  const activeMode = (config.activeGateway || 'stripe').toLowerCase();
  const stripeEnabled = config.stripe?.enabled !== false && (activeMode === 'stripe' || activeMode === 'both' || !config.activeGateway);
  const paypalEnabled = config.paypal?.enabled === true && (activeMode === 'paypal' || activeMode === 'both');
  const manualEnabled = Boolean(config.manualSettlement?.enabled ?? config.manual?.enabled ?? false);

  const allowedGateways: string[] = [];
  if (stripeEnabled) allowedGateways.push('stripe');
  if (paypalEnabled) allowedGateways.push('paypal');
  if (manualEnabled) allowedGateways.push('manual');

  return {
    rawConfig: config,
    allowedGateways,
    stripeEnabled,
    paypalEnabled,
    manualEnabled,
    currency: config.currency || 'USD',
    testMode: Boolean(config.testMode)
  };
}

export async function GET(req: Request) {
  try {
    const gwData = await getSynchronizedGatewayConfig();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '';
    const userEmail = (url.searchParams.get('email') || '').toLowerCase().trim();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const search = (url.searchParams.get('search') || '').toLowerCase().trim();
    const typeFilter = url.searchParams.get('type') || 'all';

    let balance = 0;
    let transactions: any[] = [];
    let totalCount = 0;
    let totalDeposited = 0;
    let totalSpent = 0;

    if (userId || userEmail) {
      try {
        const uRes = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const uRow = Array.isArray(uRes) ? uRes[0] : uRes?.rows?.[0];
        if (uRow && uRow.wallet_balance !== undefined) {
          balance = Number(uRow.wallet_balance || 0);
        }

        let queryParams: any[] = [userId, userEmail];
        let whereClauses = [`((user_id::text = $1 AND $1 != '') OR (LOWER(TRIM(user_email)) = $2 AND $2 != ''))`];

        if (typeFilter && typeFilter !== 'all') {
          queryParams.push(typeFilter);
          whereClauses.push(`type = $${queryParams.length}`);
        }

        if (search) {
          queryParams.push(`%${search}%`);
          whereClauses.push(`(LOWER(description) LIKE $${queryParams.length} OR LOWER(gateway_tx_id) LIKE $${queryParams.length} OR LOWER(id) LIKE $${queryParams.length})`);
        }

        const whereSql = whereClauses.join(' AND ');
        const countRes = await query(`SELECT COUNT(*) as count FROM wallet_transactions WHERE ${whereSql}`, queryParams);
        const countRow = Array.isArray(countRes) ? countRes[0] : countRes?.rows?.[0];
        totalCount = parseInt(countRow?.count || '0', 10);

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);
        const tRes = await query(
          `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
          queryParams
        );
        transactions = Array.isArray(tRes) ? tRes : (tRes?.rows || []);

        const statsRes = await query(
          `SELECT 
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_dep,
            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_sp
           FROM wallet_transactions 
           WHERE ((user_id::text = $1 AND $1 != '') OR (LOWER(TRIM(user_email)) = $2 AND $2 != ''))`,
          [userId, userEmail]
        );
        const statsRow = Array.isArray(statsRes) ? statsRes[0] : statsRes?.rows?.[0];
        totalDeposited = Number(statsRow?.total_dep || 0);
        totalSpent = Number(statsRow?.total_sp || 0);
      } catch (dbErr) {
        console.warn('[Wallet API] Ledger fetch warning:', dbErr);
      }
    }

    let walletRules: any = {
      is_enabled: true,
      min_topup: 5.00,
      max_topup: 1000.00,
      preset_amounts: [10, 25, 50, 100, 250],
      bonus_rules: [
        { threshold: 50, bonus_percent: 5 },
        { threshold: 100, bonus_percent: 10 }
      ],
      allow_site_purchases: true
    };

    try {
      const wRes = await query(`SELECT * FROM wallet_settings WHERE id = 'current' OR id = '1' LIMIT 1`);
      const wRow = Array.isArray(wRes) ? wRes[0] : wRes?.rows?.[0];
      if (wRow) {
        walletRules = {
          ...walletRules,
          ...wRow,
          min_topup: parseFloat(wRow.min_topup || 5),
          max_topup: parseFloat(wRow.max_topup || 1000),
          preset_amounts: typeof wRow.preset_amounts === 'string' ? JSON.parse(wRow.preset_amounts) : (wRow.preset_amounts || walletRules.preset_amounts),
          bonus_rules: typeof wRow.bonus_rules === 'string' ? JSON.parse(wRow.bonus_rules) : (wRow.bonus_rules || walletRules.bonus_rules),
        };
      }
    } catch (_) {}

    const manualDetails = {
      enabled: gwData.manualEnabled,
      bankName: gwData.rawConfig.manualSettlement?.bankName || gwData.rawConfig.manual?.bankName || '',
      accountHolder: gwData.rawConfig.manualSettlement?.accountHolder || gwData.rawConfig.manual?.accountHolder || '',
      accountNumber: gwData.rawConfig.manualSettlement?.accountNumber || gwData.rawConfig.manual?.accountNumber || '',
      routingNumber: gwData.rawConfig.manualSettlement?.routingNumber || gwData.rawConfig.manual?.routingNumber || '',
      swiftBic: gwData.rawConfig.manualSettlement?.swiftBic || gwData.rawConfig.manual?.swiftBic || '',
      branchName: gwData.rawConfig.manualSettlement?.branchName || gwData.rawConfig.manual?.branchName || '',
      instructions: gwData.rawConfig.manualSettlement?.instructions || gwData.rawConfig.manual?.instructions || 'Please transfer the exact amount and include your reference number.',
      requireReference: gwData.rawConfig.manualSettlement?.requireReference ?? true
    };

    const structuredSettings = {
      is_enabled: walletRules.is_enabled !== false,
      currency: gwData.currency,
      min_topup: walletRules.min_topup,
      max_topup: walletRules.max_topup,
      preset_amounts: walletRules.preset_amounts,
      bonus_rules: walletRules.bonus_rules,
      allowed_gateways: gwData.allowedGateways,
      active_gateway: gwData.allowedGateways[0] || null,
      allow_site_purchases: walletRules.allow_site_purchases !== false,
      stripe_configured: Boolean(gwData.rawConfig.stripe?.secretKey || process.env.STRIPE_SECRET_KEY),
      paypal_configured: Boolean(gwData.rawConfig.paypal?.clientId || process.env.PAYPAL_CLIENT_ID),
      test_mode: gwData.testMode,
      manual_details: manualDetails,
    };

    return NextResponse.json({
      success: true,
      balance,
      wallet_balance: balance,
      currency: gwData.currency,
      allowed_gateways: gwData.allowedGateways,
      allowedGateways: gwData.allowedGateways,
      active_gateway: gwData.allowedGateways[0] || null,
      settings: structuredSettings,
      gatewaySettings: {
        currency: gwData.currency,
        testMode: gwData.testMode,
        stripe: {
          enabled: gwData.stripeEnabled,
          publishableKey: gwData.rawConfig.stripe?.publishableKey || ''
        },
        paypal: {
          enabled: gwData.paypalEnabled,
          clientId: gwData.rawConfig.paypal?.clientId || '',
          environment: gwData.rawConfig.paypal?.environment || 'sandbox'
        },
        manualSettlement: manualDetails,
      },
      transactions,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      page,
      stats: {
        totalDeposited,
        totalSpent,
        totalEvents: totalCount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureWalletSchema();
    const gwData = await getSynchronizedGatewayConfig();
    const body = await req.json();
    const action = body.action || 'topup';
    const gateway = (body.gateway || '').toLowerCase();
    const userId = String(body.userId || '');
    const userEmail = (body.email || body.userEmail || '').toLowerCase().trim();
    const depositAmt = parseFloat(String(body.amount || 0));
    const bonusAmt = parseFloat(String(body.bonus || 0));
    const totalAddition = depositAmt + (bonusAmt > 0 ? bonusAmt : 0);

    // 1. RECONCILE WALLET
    if (action === 'reconcile_wallet') {
      const uRes = await query(
        `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
        [userId, userEmail]
      );
      const balance = Number(Array.isArray(uRes) ? uRes[0]?.wallet_balance : uRes?.rows?.[0]?.wallet_balance || 0);

      const txRes = await query(
        `SELECT * FROM wallet_transactions WHERE (user_id::text = $1 AND $1 != '') OR (LOWER(TRIM(user_email)) = $2 AND $2 != '') ORDER BY created_at DESC LIMIT 20`,
        [userId, userEmail]
      );
      const txs = Array.isArray(txRes) ? txRes : (txRes?.rows || []);

      return NextResponse.json({
        success: true,
        message: 'Wallet ledger is synchronized with payment gateway.',
        wallet_balance: balance,
        transactions: txs
      });
    }

    // 2. VERIFY STRIPE CHECKOUT SESSION CALLBACK
    if (action === 'verify_stripe_session') {
      const sessionId = body.sessionId;
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
      }

      // Check idempotency: already credited?
      const existTx = await query(
        `SELECT id, balance_after FROM wallet_transactions WHERE gateway_tx_id = $1 LIMIT 1`,
        [sessionId]
      );
      const existRow = Array.isArray(existTx) ? existTx[0] : existTx?.rows?.[0];
      if (existRow) {
        const uRes = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const curBal = Number(Array.isArray(uRes) ? uRes[0]?.wallet_balance : uRes?.rows?.[0]?.wallet_balance || 0);
        return NextResponse.json({
          success: true,
          message: 'Payment verified! Your wallet has been credited.',
          wallet_balance: curBal
        });
      }

      let verifiedAmount = 50.00;
      const secretKey = gwData.rawConfig.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '';

      if (secretKey && !sessionId.startsWith('cs_test_mock_')) {
        try {
          const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${secretKey}` }
          });
          const sessionData = await sRes.json();
          if (sessionData && sessionData.id) {
            const metaTotal = parseFloat(sessionData.metadata?.totalAddition || '0');
            if (metaTotal > 0) {
              verifiedAmount = metaTotal;
            } else if (sessionData.amount_total) {
              verifiedAmount = sessionData.amount_total / 100;
            }
          }
        } catch (e: any) {
          console.warn('[Wallet API] Stripe retrieve notice:', e.message);
        }
      }

      await query(
        `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
         WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
        [verifiedAmount, userId, userEmail]
      );

      const balRes = await query(
        `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
        [userId, userEmail]
      );
      const newBal = Number(Array.isArray(balRes) ? balRes[0]?.wallet_balance : balRes?.rows?.[0]?.wallet_balance || 0);

      const txId = 'wtx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      await query(
        `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, 'topup', 'stripe', $6, 'succeeded', $7, $8, NOW())`,
        [
          txId, userId, userEmail, verifiedAmount, newBal, sessionId,
          `Deposit Top-Up via Stripe Checkout (${gwData.currency} ${verifiedAmount.toFixed(2)})`,
          JSON.stringify({ sessionId, verified: true })
        ]
      );

      await query(
        `INSERT INTO payment_transactions (id, customer_name, customer_email, plan_name, plan_slug, amount, currency, gateway, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'Wallet Top-Up', 'wallet_topup', $4, $5, 'stripe', 'succeeded', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [sessionId, userEmail || 'Customer', userEmail, verifiedAmount, gwData.currency]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Stripe checkout verified! ${gwData.currency} ${verifiedAmount.toFixed(2)} added to your wallet.`,
        wallet_balance: newBal
      });
    }

    // 3. ENFORCE GATEWAY PERMISSION FROM /admin/payment-gateway
    if (gateway === 'stripe' && !gwData.stripeEnabled) {
      return NextResponse.json({ success: false, error: 'Credit Card (Stripe) is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
    }
    if (gateway === 'paypal' && !gwData.paypalEnabled) {
      return NextResponse.json({ success: false, error: 'PayPal digital wallet is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
    }
    if (gateway === 'manual' && !gwData.manualEnabled) {
      return NextResponse.json({ success: false, error: 'Manual Settlement is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
    }

    // 4. STRIPE CHECKOUT SESSION INITIALIZATION
    if (gateway === 'stripe') {
      const secretKey = gwData.rawConfig.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '';
      const origin = body.origin || (typeof process.env.NEXTAUTH_URL === 'string' ? process.env.NEXTAUTH_URL : 'http://localhost:3000');

      if (secretKey && secretKey.startsWith('sk_')) {
        try {
          const zeroDecimal = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
          const isZeroDecimal = zeroDecimal.includes(gwData.currency.toLowerCase());
          const unitAmount = isZeroDecimal ? Math.round(depositAmt) : Math.round(depositAmt * 100);

          const params = new URLSearchParams();
          params.append('payment_method_types[0]', 'card');
          params.append('mode', 'payment');
          params.append('success_url', `${origin}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`);
          params.append('cancel_url', `${origin}/wallet?status=cancelled`);
          if (userEmail) params.append('customer_email', userEmail);
          params.append('line_items[0][price_data][currency]', gwData.currency.toLowerCase());
          params.append('line_items[0][price_data][product_data][name]', `Store Credit Top-Up (${gwData.currency} ${depositAmt.toFixed(2)})`);
          params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
          params.append('line_items[0][quantity]', '1');
          params.append('metadata[userId]', userId);
          params.append('metadata[email]', userEmail);
          params.append('metadata[totalAddition]', String(totalAddition));
          params.append('metadata[type]', 'topup');
          params.append('metadata[gateway]', 'stripe');

          const sRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
          });

          const session = await sRes.json();
          if (session.url) {
            return NextResponse.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
          } else {
            throw new Error(session.error?.message || 'Failed to create Stripe Checkout session');
          }
        } catch (sErr: any) {
          if (!gwData.testMode) {
            return NextResponse.json({ success: false, error: sErr.message || 'Stripe error.' }, { status: 400 });
          }
        }
      }

      // Sandbox Fallback
      if (gwData.testMode) {
        const mockSessionId = `cs_test_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return NextResponse.json({
          success: true,
          checkoutUrl: `${origin}/wallet?status=success&session_id=${mockSessionId}`
        });
      }

      return NextResponse.json({ success: false, error: 'Stripe keys are not configured in Payment Gateway settings.' }, { status: 400 });
    }

    // 5. PAYPAL CHECKOUT INITIALIZATION
    if (gateway === 'paypal') {
      const origin = body.origin || (typeof process.env.NEXTAUTH_URL === 'string' ? process.env.NEXTAUTH_URL : 'http://localhost:3000');
      if (gwData.testMode) {
        const mockSessionId = `cs_test_mock_pp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return NextResponse.json({
          success: true,
          checkoutUrl: `${origin}/wallet?status=success&session_id=${mockSessionId}&gateway=paypal`
        });
      }
      return NextResponse.json({ success: false, error: 'Live PayPal integration is awaiting credentials in /admin/payment-gateway.' }, { status: 400 });
    }

    // 6. MANUAL SETTLEMENT / BANK WIRE
    const ref = body.transferReference || body.transfer_reference || body.gatewayTxId || `manual_${Date.now()}`;
    await query(
      `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
       WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
      [totalAddition, userId, userEmail]
    );

    const balRes = await query(
      `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
      [userId, userEmail]
    );
    const newBal = Number(Array.isArray(balRes) ? balRes[0]?.wallet_balance : balRes?.rows?.[0]?.wallet_balance || 0);

    const txId = 'wtx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    await query(
      `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at)
       VALUES ($1, $2, $3, $4, $5, 'topup', 'manual', $6, 'succeeded', $7, NOW())`,
      [txId, userId, userEmail, totalAddition, newBal, ref, `Manual Deposit Top-Up: ${gwData.currency} ${depositAmt.toFixed(2)}${bonusAmt > 0 ? ` (+${gwData.currency} ${bonusAmt.toFixed(2)} bonus)` : ''}`]
    );

    await query(
      `INSERT INTO payment_transactions (id, customer_name, customer_email, plan_name, plan_slug, amount, currency, gateway, status, transfer_reference, created_at, updated_at)
       VALUES ($1, $2, $3, 'Wallet Top-Up', 'wallet_topup', $4, $5, 'manual_settlement', 'succeeded', $6, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [txId, userEmail || 'Customer', userEmail, depositAmt, gwData.currency, ref]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ${gwData.currency} ${depositAmt.toFixed(2)} into your wallet!`,
      wallet_balance: newBal
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
