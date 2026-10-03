import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

let isSchemaEnsured = false;

// Module-scoped, non-exported helper to safely unwrap PostgreSQL query results without TS2339 'never' narrowing
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}

async function ensureWalletSchema() {
  if (isSchemaEnsured) return;
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
        wallet_balance NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id TEXT,
        user_email TEXT,
        amount NUMERIC DEFAULT 0,
        balance_after NUMERIC DEFAULT 0,
        type VARCHAR(50) DEFAULT 'topup',
        gateway VARCHAR(50) DEFAULT 'stripe',
        gateway_tx_id TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        description TEXT,
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
        amount NUMERIC DEFAULT 0,
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
        BEGIN ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS transfer_reference TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS notes TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);

    isSchemaEnsured = true;
  } catch (err) {
    console.warn('[Wallet API] Schema check warning:', err);
  }
}

async function getMasterGatewaySettings() {
  await ensureWalletSchema();

  let settings: any = {
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
      requireApproval: true,
    }
  };

  try {
    const sRes = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
    const row = parseDbRow(sRes);
    if (row?.payment_settings) {
      const ps = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
      if (ps && typeof ps === 'object') {
        settings = { ...settings, ...ps };
      }
    }
    if (row?.currency) {
      settings.currency = row.currency;
    }
  } catch (_) {}

  try {
    const fp = path.join(process.cwd(), 'data', 'admin_settings.json');
    if (fs.existsSync(fp)) {
      const fd = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (fd.paymentSettings && typeof fd.paymentSettings === 'object') {
        settings = { ...settings, ...fd.paymentSettings };
      }
      if (fd.currency) settings.currency = fd.currency;
    }
  } catch (_) {}

  if (!settings.stripe.publishableKey) {
    settings.stripe.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  }
  if (!settings.stripe.secretKey) {
    settings.stripe.secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
  }
  if (!settings.stripe.webhookSecret) {
    settings.stripe.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_ENDPOINT_SECRET || '';
  }
  if (!settings.paypal.clientId) {
    settings.paypal.clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  }
  if (!settings.paypal.clientSecret) {
    settings.paypal.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  }

  const activeGateway = (settings.activeGateway || 'stripe').toLowerCase();
  const stripeConfiguredEnabled = settings.stripe?.enabled !== undefined ? Boolean(settings.stripe.enabled) : true;
  const paypalConfiguredEnabled = settings.paypal?.enabled !== undefined ? Boolean(settings.paypal.enabled) : false;

  const stripeEnabled = stripeConfiguredEnabled && (activeGateway === 'stripe' || activeGateway === 'both' || !settings.activeGateway);
  const paypalEnabled = paypalConfiguredEnabled && (activeGateway === 'paypal' || activeGateway === 'both');
  const manualEnabled = Boolean(settings.manualSettlement?.enabled ?? settings.manual?.enabled ?? false);

  const allowedGateways: string[] = [];
  if (stripeEnabled) allowedGateways.push('stripe');
  if (paypalEnabled) allowedGateways.push('paypal');
  if (manualEnabled) allowedGateways.push('manual');

  return {
    rawSettings: settings,
    allowedGateways,
    stripeEnabled,
    paypalEnabled,
    manualEnabled,
    currency: settings.currency || 'USD',
    testMode: Boolean(settings.testMode),
  };
}

export async function GET(req: Request) {
  try {
    const gwData = await getMasterGatewaySettings();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '';
    const userEmail = (url.searchParams.get('email') || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10));
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
        const uRow = parseDbRow(uRes);
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
        const countRow = parseDbRow(countRes);
        totalCount = parseInt(countRow?.count || '0', 10);

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);
        const tRes = await query(
          `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
          queryParams
        );
        transactions = parseDbRows(tRes);

        const statsRes = await query(
          `SELECT 
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_dep,
            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_sp
           FROM wallet_transactions 
           WHERE ((user_id::text = $1 AND $1 != '') OR (LOWER(TRIM(user_email)) = $2 AND $2 != ''))`,
          [userId, userEmail]
        );
        const statsRow = parseDbRow(statsRes);
        totalDeposited = Number(statsRow?.total_dep || 0);
        totalSpent = Number(statsRow?.total_sp || 0);
      } catch (dbErr) {
        console.warn('[Wallet API] Query notice:', dbErr);
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
      const wRow = parseDbRow(wRes);
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
      bankName: gwData.rawSettings.manualSettlement?.bankName || gwData.rawSettings.manual?.bankName || '',
      accountHolder: gwData.rawSettings.manualSettlement?.accountHolder || gwData.rawSettings.manualSettlement?.accountName || gwData.rawSettings.manual?.accountHolder || '',
      accountNumber: gwData.rawSettings.manualSettlement?.accountNumber || gwData.rawSettings.manual?.accountNumber || '',
      routingNumber: gwData.rawSettings.manualSettlement?.routingNumber || gwData.rawSettings.manual?.routingNumber || '',
      swiftBic: gwData.rawSettings.manualSettlement?.swiftBic || gwData.rawSettings.manual?.swiftBic || '',
      branchName: gwData.rawSettings.manualSettlement?.branchName || gwData.rawSettings.manual?.branchName || '',
      instructions: gwData.rawSettings.manualSettlement?.instructions || gwData.rawSettings.manual?.instructions || 'Please transfer the exact amount and include your reference number.',
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
      stripe_configured: Boolean(gwData.rawSettings.stripe?.publishableKey),
      paypal_configured: Boolean(gwData.rawSettings.paypal?.clientId),
      test_mode: gwData.testMode,
      manual_details: manualDetails,
    };

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
        wallet_balance: balance,
      },
      balance,
      wallet_balance: balance,
      walletBalance: balance,
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
          publishableKey: gwData.rawSettings.stripe?.publishableKey || ''
        },
        paypal: {
          enabled: gwData.paypalEnabled,
          clientId: gwData.rawSettings.paypal?.clientId || '',
          environment: gwData.rawSettings.paypal?.environment || 'sandbox'
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
    const gwData = await getMasterGatewaySettings();
    const body = await req.json();
    const action = body.action || '';
    const gateway = (body.gateway || '').toLowerCase();
    const userId = String(body.userId || '');
    const userEmail = (body.email || body.userEmail || '').toLowerCase().trim();
    const depositAmt = parseFloat(String(body.amount || 0));

    // 1. Verify Stripe Checkout Session
    if (action === 'verify_stripe_session') {
      const sessionId = body.sessionId;
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
      }

      const existingTx = await query(
        `SELECT id, balance_after FROM wallet_transactions WHERE gateway_tx_id = $1 LIMIT 1`,
        [sessionId]
      );
      const existingRow = parseDbRow(existingTx);
      if (existingRow) {
        const uRes = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const uRow = parseDbRow(uRes);
        const curBal = Number(uRow?.wallet_balance || 0);
        return NextResponse.json({
          success: true,
          message: 'Payment session already verified and credited to your wallet.',
          wallet_balance: curBal,
        });
      }

      let totalAddition = depositAmt;
      let stripeSecret = gwData.rawSettings.stripe?.secretKey;

      if (stripeSecret) {
        try {
          const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${stripeSecret}` },
          });
          const sessionData = await sRes.json();
          if (sessionData && sessionData.id) {
            const metaTotal = parseFloat(sessionData.metadata?.totalAddition || '0');
            if (metaTotal > 0) totalAddition = metaTotal;
          }
        } catch (e) {
          console.warn('[Wallet API] Stripe verification warning:', e);
        }
      }

      if (totalAddition <= 0) totalAddition = 50;

      await query(
        `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
         WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
        [totalAddition, userId, userEmail]
      );

      const balRes = await query(
        `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
        [userId, userEmail]
      );
      const updatedBalance = Number(parseDbRow(balRes)?.wallet_balance || 0);

      const txId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      await query(
        `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at)
         VALUES ($1, $2, $3, $4, $5, 'topup', 'stripe', $6, 'completed', $7, NOW())`,
        [txId, userId, userEmail, totalAddition, updatedBalance, sessionId, `Deposit Top-Up via Stripe Checkout (${gwData.currency} ${totalAddition.toFixed(2)})`]
      );

      return NextResponse.json({
        success: true,
        message: 'Top-up confirmed! Store credit added to your account.',
        wallet_balance: updatedBalance,
      });
    }

    // 2. Submit Manual Bank Wire Settlement
    if (action === 'submit_manual_settlement' || action === 'submit_manual_deposit' || gateway === 'manual') {
      if (!gwData.manualEnabled) {
        return NextResponse.json({ success: false, error: 'Bank Wire / Manual settlement is currently disabled in Payment Gateway.' }, { status: 400 });
      }

      const txId = 'wire_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const ref = body.transferReference || body.transfer_reference || '';
      const notes = body.notes || '';
      const userName = body.userName || body.name || 'Customer';

      if (!ref.trim()) {
        return NextResponse.json({ success: false, error: 'Transfer reference code is required for bank wire submissions.' }, { status: 400 });
      }

      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, transfer_reference, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Wallet Top-Up', 'wallet_topup', $4, $5, 'manual_settlement', 'pending', $6, $7, NOW(), NOW())`,
        [txId, userName, userEmail, depositAmt, gwData.currency, ref, notes]
      );

      await query(
        `INSERT INTO wallet_transactions (
          id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at
        ) VALUES ($1, $2, $3, $4, 0, 'topup', 'manual', $5, 'pending', $6, NOW())`,
        [txId, userId, userEmail, depositAmt, txId, `Bank Wire Transfer: ${ref}`]
      );

      return NextResponse.json({
        success: true,
        message: 'Bank wire transfer submitted! Your deposit will be credited once verified by administrators.',
        transactionId: txId,
      });
    }

    // 3. Reconcile unrecorded payments on demand
    if (action === 'reconcile_wallet') {
      const pendingSucceeded = await query(
        `SELECT id, amount FROM payment_transactions 
         WHERE (LOWER(TRIM(customer_email)) = $1 OR customer_email = $1)
           AND status = 'succeeded'
           AND id NOT IN (SELECT COALESCE(gateway_tx_id, '') FROM wallet_transactions WHERE user_email = $1)`,
        [userEmail]
      );
      const rows = parseDbRows(pendingSucceeded);

      let creditedCount = 0;
      for (const r of rows) {
        const amt = Number(r.amount || 0);
        if (amt > 0) {
          await query(
            `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE LOWER(TRIM(email)) = $2`,
            [amt, userEmail]
          );
          const uRes = await query(`SELECT wallet_balance FROM users WHERE LOWER(TRIM(email)) = $1`, [userEmail]);
          const curBal = Number(parseDbRow(uRes)?.wallet_balance || 0);
          await query(
            `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at)
             VALUES ($1, $2, $3, $4, $5, 'topup', 'reconciled', $6, 'completed', 'Reconciled external deposit', NOW())`,
            ['rec_' + Date.now().toString(36), userId, userEmail, amt, curBal, r.id]
          );
          creditedCount++;
        }
      }

      const balRes = await query(`SELECT wallet_balance FROM users WHERE LOWER(TRIM(email)) = $1`, [userEmail]);
      const finalBal = Number(parseDbRow(balRes)?.wallet_balance || 0);

      return NextResponse.json({
        success: true,
        message: creditedCount > 0 ? `Reconciled ${creditedCount} unrecorded payment(s).` : 'Wallet is fully synchronized.',
        wallet_balance: finalBal,
      });
    }

    // 4. Stripe Checkout Session Creation
    if (gateway === 'stripe') {
      if (!gwData.stripeEnabled) {
        return NextResponse.json({ success: false, error: 'Credit Card (Stripe) is currently disabled in Payment Gateway.' }, { status: 400 });
      }

      const secretKey = gwData.rawSettings.stripe?.secretKey;
      const origin = body.origin || (typeof process.env.NEXTAUTH_URL === 'string' ? process.env.NEXTAUTH_URL : 'http://localhost:3000');

      let bonusPercent = 0;
      let bonusRules = [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }];
      try {
        const wRes = await query(`SELECT bonus_rules FROM wallet_settings WHERE id = 'current' OR id = '1' LIMIT 1`);
        const wRow = parseDbRow(wRes);
        if (wRow?.bonus_rules) {
          bonusRules = typeof wRow.bonus_rules === 'string' ? JSON.parse(wRow.bonus_rules) : wRow.bonus_rules;
        }
      } catch (_) {}

      for (const rule of bonusRules) {
        if (depositAmt >= parseFloat((rule.threshold as any) || 0) && parseFloat((rule.bonus_percent as any) || 0) > bonusPercent) {
          bonusPercent = parseFloat((rule.bonus_percent as any) || 0);
        }
      }

      const bonusCredit = bonusPercent > 0 ? depositAmt * (bonusPercent / 100) : 0;
      const totalAddition = depositAmt + bonusCredit;

      if (secretKey) {
        try {
          const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
          const isZeroDecimal = zeroDecimalCurrencies.includes(gwData.currency.toLowerCase());
          const unitAmount = isZeroDecimal ? Math.round(depositAmt) : Math.round(depositAmt * 100);

          const params = new URLSearchParams();
          params.append('payment_method_types[0]', 'card');
          params.append('mode', 'payment');
          params.append('success_url', `${origin}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`);
          params.append('cancel_url', `${origin}/wallet?status=cancelled`);
          if (userEmail) params.append('customer_email', userEmail);
          params.append('line_items[0][price_data][currency]', gwData.currency.toLowerCase());
          params.append('line_items[0][price_data][product_data][name]', `Store Credit Deposit (${gwData.currency} ${depositAmt.toFixed(2)})`);
          params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
          params.append('line_items[0][quantity]', '1');
          params.append('metadata[type]', 'wallet_topup');
          params.append('metadata[userId]', userId);
          params.append('metadata[userEmail]', userEmail);
          params.append('metadata[totalAddition]', String(totalAddition));
          params.append('metadata[currency]', gwData.currency);

          const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          });

          const session = await stripeRes.json();
          if (session.url) {
            return NextResponse.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
          } else {
            throw new Error(session.error?.message || 'Failed to create Stripe Checkout session');
          }
        } catch (stripeErr: any) {
          if (!gwData.testMode) {
            return NextResponse.json({ success: false, error: stripeErr.message || 'Stripe gateway error.' }, { status: 500 });
          }
        }
      }

      if (gwData.testMode) {
        await query(
          `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
           WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
          [totalAddition, userId, userEmail]
        );

        const balRes = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const newBal = Number(parseDbRow(balRes)?.wallet_balance || 0);

        const mockId = 'sbx_' + Date.now().toString(36);
        await query(
          `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at)
           VALUES ($1, $2, $3, $4, $5, 'topup', 'stripe', $6, 'completed', $7, NOW())`,
          [mockId, userId, userEmail, totalAddition, newBal, mockId, `Sandbox Test Deposit (${gwData.currency} ${totalAddition.toFixed(2)})`]
        );

        return NextResponse.json({
          success: true,
          simulated: true,
          wallet_balance: newBal,
          message: `Sandbox Test: ${gwData.currency} ${totalAddition.toFixed(2)} credited to your wallet balance.`,
        });
      }

      return NextResponse.json({ success: false, error: 'Stripe API keys are not configured in Payment Gateway.' }, { status: 400 });
    }

    // 5. PayPal Checkout Simulation
    if (gateway === 'paypal') {
      if (!gwData.paypalEnabled) {
        return NextResponse.json({ success: false, error: 'PayPal is currently disabled in Payment Gateway.' }, { status: 400 });
      }

      if (gwData.testMode) {
        const bonusCredit = depositAmt >= 100 ? depositAmt * 0.1 : (depositAmt >= 50 ? depositAmt * 0.05 : 0);
        const totalAddition = depositAmt + bonusCredit;

        await query(
          `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
           WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
          [totalAddition, userId, userEmail]
        );

        const balRes = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const newBal = Number(parseDbRow(balRes)?.wallet_balance || 0);

        const mockId = 'sbx_pp_' + Date.now().toString(36);
        await query(
          `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at)
           VALUES ($1, $2, $3, $4, $5, 'topup', 'paypal', $6, 'completed', $7, NOW())`,
          [mockId, userId, userEmail, totalAddition, newBal, mockId, `Sandbox PayPal Deposit (${gwData.currency} ${totalAddition.toFixed(2)})`]
        );

        return NextResponse.json({
          success: true,
          simulated: true,
          wallet_balance: newBal,
          message: `Sandbox Test: ${gwData.currency} ${totalAddition.toFixed(2)} credited via PayPal test wallet.`,
        });
      }

      return NextResponse.json({ success: false, error: 'Live PayPal integration is awaiting credentials in /admin/payment-gateway.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Operation acknowledged.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
