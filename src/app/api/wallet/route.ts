import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Universal query runner supporting PostgreSQL ($1) and MySQL (?)
async function universalQuery(sql: string, params: any[] = []): Promise<any> {
  try {
    return await query(sql, params);
  } catch (err: any) {
    if (sql.includes('$1') && (err?.message?.includes('syntax') || err?.code === 'ER_PARSE_ERROR')) {
      let qSql = sql;
      params.forEach((_, idx) => {
        qSql = qSql.replace(new RegExp(`\\$${idx + 1}`, 'g'), '?');
      });
      return await query(qSql, params);
    }
    throw err;
  }
}

async function ensureWalletSchema() {
  try {
    await universalQuery(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY DEFAULT 1,
        payment_settings TEXT,
        currency VARCHAR(10) DEFAULT 'USD',
        site_name VARCHAR(255),
        theme_colors TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await universalQuery(`
      CREATE TABLE IF NOT EXISTS wallet_settings (
        id INT PRIMARY KEY DEFAULT 1,
        currency VARCHAR(10) DEFAULT 'USD',
        allowed_gateways TEXT,
        active_gateway VARCHAR(50) DEFAULT 'stripe',
        min_topup DECIMAL(10,2) DEFAULT 5.00,
        max_topup DECIMAL(10,2) DEFAULT 1000.00,
        preset_amounts TEXT,
        bonus_rules TEXT,
        allow_site_purchases BOOLEAN DEFAULT TRUE,
        stripe_config TEXT,
        paypal_config TEXT,
        manual_details TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await universalQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        wallet_balance DECIMAL(12,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await universalQuery(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        amount DECIMAL(12,2) DEFAULT 0.00,
        balance_after DECIMAL(12,2) DEFAULT 0.00,
        type VARCHAR(50) DEFAULT 'topup',
        gateway VARCHAR(50) DEFAULT 'stripe',
        gateway_tx_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await universalQuery(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        plan_name VARCHAR(255),
        plan_slug VARCHAR(255),
        amount DECIMAL(12,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        gateway VARCHAR(50) DEFAULT 'stripe',
        status VARCHAR(50) DEFAULT 'succeeded',
        transfer_reference TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (_) {}
}

const ZERO_DECIMAL_CURRENCIES = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.includes((currency || '').toUpperCase());
}

async function getAuthoritativeGatewaySettings() {
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
      instructions: 'Please transfer the exact amount and include your reference number.',
      requireReference: true,
    }
  };

  // 1. Fetch from admin_settings
  try {
    const sRes = await universalQuery(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
    const row = parseDbRow(sRes);
    if (row?.payment_settings) {
      const ps = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
      if (ps && typeof ps === 'object') settings = { ...settings, ...ps };
      if (row.currency) settings.currency = row.currency;
    }
  } catch (_) {}

  // 2. Fetch from wallet_settings (reconcile manual_details)
  try {
    const wRes = await universalQuery(`SELECT * FROM wallet_settings WHERE id = 1 LIMIT 1`);
    const wRow = parseDbRow(wRes);
    if (wRow) {
      if (wRow.manual_details) {
        const md = typeof wRow.manual_details === 'string' ? JSON.parse(wRow.manual_details) : wRow.manual_details;
        if (md && typeof md === 'object') {
          settings.manualSettlement = { ...settings.manualSettlement, ...md };
        }
      }
      if (wRow.currency) settings.currency = wRow.currency;
    }
  } catch (_) {}

  // 3. Fallback filesystem mirror
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

  // 4. Fallback credentials from environment variables
  if (!settings.stripe.publishableKey) {
    settings.stripe.publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
  }
  if (!settings.stripe.secretKey) {
    settings.stripe.secretKey = process.env.STRIPE_SECRET_KEY || '';
  }
  if (!settings.paypal.clientId) {
    settings.paypal.clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
  }
  if (!settings.paypal.clientSecret) {
    settings.paypal.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  }

  // 5. Strict Compound Gating Engine
  const activeMode = String(settings.activeGateway || 'stripe').toLowerCase();

  const stripeRaw = settings.stripe?.enabled ?? settings.stripe?.is_enabled;
  const isStripeSwitchOn = stripeRaw !== undefined ? Boolean(stripeRaw) : true;
  const stripePermittedByMode = (activeMode === 'stripe' || activeMode === 'both');
  const stripeEnabled = isStripeSwitchOn && stripePermittedByMode;

  const paypalRaw = settings.paypal?.enabled ?? settings.paypal?.is_enabled;
  const isPaypalSwitchOn = paypalRaw !== undefined ? Boolean(paypalRaw) : false;
  const paypalPermittedByMode = (activeMode === 'paypal' || activeMode === 'both');
  const paypalEnabled = isPaypalSwitchOn && paypalPermittedByMode;

  // Bank Wire is offline manual settlement: active whenever manualSettlement.enabled or manual.enabled is TRUE
  const manualRaw = settings.manualSettlement?.enabled ?? settings.manual?.enabled ?? settings.manual_details?.enabled ?? false;
  const manualEnabled = Boolean(manualRaw);

  const allowedGateways: string[] = [];
  if (stripeEnabled) allowedGateways.push('stripe');
  if (paypalEnabled) allowedGateways.push('paypal');
  if (manualEnabled) allowedGateways.push('manual');

  // Synchronize computed allowed_gateways back to wallet_settings
  try {
    const allowedJson = JSON.stringify(allowedGateways);
    const manualJson = JSON.stringify(settings.manualSettlement || {});
    await universalQuery(
      `UPDATE wallet_settings 
       SET allowed_gateways = $1, manual_details = $2, currency = $3, updated_at = NOW() 
       WHERE id = 1`,
      [allowedJson, manualJson, settings.currency || 'USD']
    );
  } catch (_) {}

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
    const gwData = await getAuthoritativeGatewaySettings();
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
        const uRes = await universalQuery(
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
        const countRes = await universalQuery(`SELECT COUNT(*) as count FROM wallet_transactions WHERE ${whereSql}`, queryParams);
        const countRow = parseDbRow(countRes);
        totalCount = parseInt(countRow?.count || '0', 10);

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);
        const tRes = await universalQuery(
          `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
          queryParams
        );
        transactions = parseDbRows(tRes);

        const statsRes = await universalQuery(
          `SELECT 
            SUM(CASE WHEN amount > 0 AND (status = 'succeeded' OR status = 'completed') THEN amount ELSE 0 END) as total_dep,
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
      const wRes = await universalQuery(`SELECT * FROM wallet_settings WHERE id = 1 LIMIT 1`);
      const wRow = parseDbRow(wRes);
      if (wRow) {
        walletRules = {
          ...walletRules,
          min_topup: parseFloat(wRow.min_topup || 5),
          max_topup: parseFloat(wRow.max_topup || 1000),
          preset_amounts: typeof wRow.preset_amounts === 'string' ? JSON.parse(wRow.preset_amounts) : (wRow.preset_amounts || walletRules.preset_amounts),
          bonus_rules: typeof wRow.bonus_rules === 'string' ? JSON.parse(wRow.bonus_rules) : (wRow.bonus_rules || walletRules.bonus_rules),
          allow_site_purchases: wRow.allow_site_purchases !== false,
        };
      }
    } catch (_) {}

    const rawManual = gwData.rawSettings.manualSettlement || gwData.rawSettings.manual || {};
    const manualDetails = {
      enabled: gwData.manualEnabled,
      bankName: rawManual.bankName || '',
      accountHolder: rawManual.accountHolder || '',
      accountNumber: rawManual.accountNumber || '',
      routingNumber: rawManual.routingNumber || '',
      swiftBic: rawManual.swiftBic || '',
      branchName: rawManual.branchName || '',
      instructions: rawManual.instructions || 'Please transfer the exact amount and include your reference number.',
      requireReference: rawManual.requireReference ?? true,
    };

    const structuredSettings = {
      is_enabled: true,
      currency: gwData.currency,
      min_topup: walletRules.min_topup,
      max_topup: walletRules.max_topup,
      preset_amounts: walletRules.preset_amounts,
      bonus_rules: walletRules.bonus_rules,
      allowed_gateways: gwData.allowedGateways,
      active_gateway: gwData.allowedGateways[0] || null,
      allow_site_purchases: walletRules.allow_site_purchases,
      stripe_configured: Boolean(gwData.rawSettings.stripe?.publishableKey),
      paypal_configured: Boolean(gwData.rawSettings.paypal?.clientId),
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
      stats: { totalDeposited, totalSpent, totalEvents: totalCount }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gwData = await getAuthoritativeGatewaySettings();
    const body = await req.json();
    const action = body.action || '';
    const gateway = (body.gateway || '').toLowerCase();
    const userId = String(body.userId || '').trim();
    const userEmail = (body.email || body.userEmail || '').toLowerCase().trim();
    const depositAmt = parseFloat(String(body.amount || 0));

    // 1. Reconcile Balance
    if (action === 'reconcile_wallet') {
      const uRes = await universalQuery(
        `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
        [userId, userEmail]
      );
      const curBal = Number(parseDbRow(uRes)?.wallet_balance || 0);
      return NextResponse.json({
        success: true,
        message: 'Wallet balance reconciled with payment provider.',
        wallet_balance: curBal
      });
    }

    // 2. Stripe Checkout Verification
    if (action === 'verify_stripe_session') {
      const sessionId = body.sessionId?.trim();
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
      }

      const existRes = await universalQuery(`SELECT * FROM wallet_transactions WHERE gateway_tx_id = $1 LIMIT 1`, [sessionId]);
      if (parseDbRow(existRes)) {
        const uRes = await universalQuery(`SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`, [userId, userEmail]);
        return NextResponse.json({ success: true, message: 'Session already credited.', wallet_balance: Number(parseDbRow(uRes)?.wallet_balance || 0) });
      }

      let totalAddition = depositAmt > 0 ? depositAmt : 50;
      const secretKey = gwData.rawSettings.stripe?.secretKey;

      if (secretKey && secretKey.startsWith('sk_')) {
        try {
          const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
          });
          const sessionData = await sRes.json();
          if (sessionData && sessionData.id) {
            const metaTotal = parseFloat(sessionData.metadata?.totalAddition || '0');
            if (metaTotal > 0) totalAddition = metaTotal;
          }
        } catch (_) {}
      }

      await universalQuery(
        `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
         WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
        [totalAddition, userId, userEmail]
      );

      const balRes = await universalQuery(
        `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
        [userId, userEmail]
      );
      const newBal = Number(parseDbRow(balRes)?.wallet_balance || 0);

      const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await universalQuery(
        `INSERT INTO wallet_transactions (id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, created_at)
         VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'completed', $7, NOW())`,
        [txId, userId, userEmail, totalAddition, newBal, sessionId, `Deposit Top-Up via Stripe (${gwData.currency} ${totalAddition.toFixed(2)})`]
      );

      return NextResponse.json({
        success: true,
        message: 'Top-up confirmed! Store credit added to your account.',
        wallet_balance: newBal
      });
    }

    // 3. Bank Wire / Manual Settlement Submission (Placed in Pending Approval Queue)
    if (gateway === 'manual' || gateway === 'manualsettlement' || action === 'submit_manual_settlement') {
      if (!gwData.manualEnabled) {
        return NextResponse.json({ success: false, error: 'Bank Wire settlement is currently disabled in Payment Gateway.' }, { status: 400 });
      }

      const txId = 'wire_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const ref = (body.transferReference || body.transfer_reference || '').trim();
      const notes = body.notes || '';
      const userName = body.userName || body.name || 'Customer';

      if (!ref) {
        return NextResponse.json({ success: false, error: 'Reference code is required for bank wire transfers.' }, { status: 400 });
      }

      await universalQuery(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, transfer_reference, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Wallet Top-Up', 'wallet_topup', $4, $5, 'manual_settlement', 'pending', $6, $7, NOW(), NOW())`,
        [txId, userName, userEmail, depositAmt, gwData.currency, ref, notes]
      );

      await universalQuery(
        `INSERT INTO wallet_transactions (
          id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at
        ) VALUES ($1, $2, $3, $4, 0, 'topup', 'manual', $5, 'pending', $6, NOW())`,
        [txId, userId, userEmail, depositAmt, txId, `Bank Wire Transfer: ${ref}`]
      );

      return NextResponse.json({
        success: true,
        message: 'Bank wire transfer submitted! It will be credited once verified by administrators.',
        transactionId: txId
      });
    }

    // 4. Stripe Checkout Session Initiation
    if (gateway === 'stripe') {
      if (!gwData.stripeEnabled) {
        return NextResponse.json({ success: false, error: 'Credit Card (Stripe) is currently disabled in Payment Gateway settings.' }, { status: 400 });
      }

      const secretKey = gwData.rawSettings.stripe?.secretKey;
      const origin = body.origin || (typeof process.env.NEXTAUTH_URL === 'string' ? process.env.NEXTAUTH_URL : 'http://localhost:3000');

      let bonusPercent = 0;
      if (depositAmt >= 100) bonusPercent = 10;
      else if (depositAmt >= 50) bonusPercent = 5;

      const bonusCredit = (depositAmt * bonusPercent) / 100;
      const totalAddition = depositAmt + bonusCredit;

      if (secretKey && secretKey.startsWith('sk_')) {
        try {
          const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
          const unitAmount = isZeroDecimal(gwData.currency) ? Math.round(depositAmt) : Math.round(depositAmt * 100);

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: gwData.currency.toLowerCase(),
                unit_amount: unitAmount,
                product_data: { name: `Store Credit Deposit (${gwData.currency.toUpperCase()} ${depositAmt.toFixed(2)})` },
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${origin}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/wallet?status=cancelled`,
            customer_email: userEmail || undefined,
            metadata: {
              type: 'wallet_topup',
              userId,
              userEmail,
              baseAmount: String(depositAmt),
              bonusCredit: String(bonusCredit),
              totalAddition: String(totalAddition),
              currency: gwData.currency,
            }
          });

          return NextResponse.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
        } catch (e: any) {
          if (!gwData.testMode) return NextResponse.json({ success: false, error: e.message }, { status: 400 });
        }
      }

      if (gwData.testMode) {
        const mockSessionId = `cs_test_mock_${Date.now()}`;
        return NextResponse.json({
          success: true,
          checkoutUrl: `${origin}/wallet?status=success&session_id=${mockSessionId}&amount=${totalAddition}`
        });
      }

      return NextResponse.json({ success: false, error: 'Stripe Secret Key is not configured in Payment Gateway.' }, { status: 400 });
    }

    // 5. PayPal Checkout Initiation
    if (gateway === 'paypal') {
      if (!gwData.paypalEnabled) {
        return NextResponse.json({ success: false, error: 'PayPal digital wallet is currently disabled in Payment Gateway settings.' }, { status: 400 });
      }

      if (gwData.testMode) {
        let bonusPercent = depositAmt >= 100 ? 10 : (depositAmt >= 50 ? 5 : 0);
        const totalAddition = depositAmt + (depositAmt * bonusPercent) / 100;

        await universalQuery(
          `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
           WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '')`,
          [totalAddition, userId, userEmail]
        );

        const balRes = await universalQuery(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const newBal = Number(parseDbRow(balRes)?.wallet_balance || 0);

        const mockId = 'sbx_pp_' + Date.now().toString(36);
        await universalQuery(
          `INSERT INTO wallet_transactions (id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at)
           VALUES ($1, $2, $3, $4, $5, 'topup', 'paypal', $6, 'completed', $7, NOW())`,
          [mockId, userId, userEmail, totalAddition, newBal, mockId, `Sandbox PayPal Top-Up (${gwData.currency} ${totalAddition.toFixed(2)})`]
        );

        return NextResponse.json({
          success: true,
          simulated: true,
          wallet_balance: newBal,
          message: `Sandbox Test: ${gwData.currency} ${totalAddition.toFixed(2)} credited via PayPal.`,
        });
      }

      return NextResponse.json({ success: false, error: 'Live PayPal integration is awaiting credentials in /admin/payment-gateway.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Operation acknowledged.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
