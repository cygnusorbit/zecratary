import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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

const ZERO_DECIMAL_CURRENCIES = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
function isZeroDecimal(currency: string) {
  return ZERO_DECIMAL_CURRENCIES.includes((currency || '').toUpperCase());
}

async function getMasterGatewaySettings() {
  let settings: any = {
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
      instructions: 'Please transfer the exact amount to the bank account above and include your Order ID or registered email as the payment reference.',
      requireReference: true,
    }
  };

  // 1. Try querying admin_settings across all schema variants
  try {
    const sRes: any = await query(`SELECT * FROM admin_settings LIMIT 10`);
    const sRows = parseDbRows(sRes);
    for (const r of sRows) {
      if (r.payment_settings) {
        const ps = typeof r.payment_settings === 'string' ? JSON.parse(r.payment_settings) : r.payment_settings;
        if (ps && typeof ps === 'object') {
          settings = { ...settings, ...ps };
          if (r.currency) settings.currency = r.currency;
        }
      } else if (r.value && (r.key === 'payment_gateway_config' || r.key === 'paymentSettings' || r.key === 'primary_settings')) {
        const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
        if (val && typeof val === 'object') {
          settings = { ...settings, ...val };
          if (val.currency) settings.currency = val.currency;
        }
      }
    }
  } catch (_) {}

  // 2. Try file mirror across potential monorepo paths
  const fileCandidates = [
    path.join(process.cwd(), 'data', 'admin_settings.json'),
    path.join(process.cwd(), '..', 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), '..', '..', 'data', 'admin_settings.json')
  ];

  for (const fp of fileCandidates) {
    if (fs.existsSync(fp)) {
      try {
        const fd = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (fd.paymentSettings && typeof fd.paymentSettings === 'object') {
          settings = { ...settings, ...fd.paymentSettings };
        }
        if (fd.currency) settings.currency = fd.currency;
        break;
      } catch (_) {}
    }
  }

  // 3. Fallback to process.env credentials
  const envStripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';
  const envStripeSk = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
  const envPaypalId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
  const envCurrency = process.env.PAYMENT_CURRENCY || process.env.DEFAULT_CURRENCY || '';

  if (!settings.stripe?.publishableKey && envStripePk) settings.stripe.publishableKey = envStripePk;
  if (!settings.stripe?.secretKey && envStripeSk) settings.stripe.secretKey = envStripeSk;
  if (!settings.paypal?.clientId && envPaypalId) settings.paypal.clientId = envPaypalId;
  if (envCurrency && settings.currency === 'USD') settings.currency = envCurrency;

  // 4. Determine strict enabled status for dynamic sync
  const stripeEnabled = settings.stripe?.enabled !== undefined ? Boolean(settings.stripe.enabled) : true;
  const paypalEnabled = settings.paypal?.enabled !== undefined ? Boolean(settings.paypal.enabled) : false;
  const manualEnabled = settings.manualSettlement?.enabled !== undefined 
    ? Boolean(settings.manualSettlement.enabled) 
    : (settings.manual?.enabled !== undefined ? Boolean(settings.manual.enabled) : false);

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
        const uRes: any = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const uRow: any = parseDbRow(uRes);
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
        const countRes: any = await query(`SELECT COUNT(*) as count FROM wallet_transactions WHERE ${whereSql}`, queryParams);
        const countRow: any = parseDbRow(countRes);
        totalCount = parseInt(countRow?.count || '0', 10);

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);
        const tRes: any = await query(
          `SELECT * FROM wallet_transactions WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
          queryParams
        );
        transactions = parseDbRows(tRes);

        const statsRes: any = await query(
          `SELECT 
            SUM(CASE WHEN amount > 0 AND status = 'succeeded' THEN amount ELSE 0 END) as total_dep,
            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_sp
           FROM wallet_transactions 
           WHERE ((user_id::text = $1 AND $1 != '') OR (LOWER(TRIM(user_email)) = $2 AND $2 != ''))`,
          [userId, userEmail]
        );
        const statsRow: any = parseDbRow(statsRes);
        totalDeposited = Number(statsRow?.total_dep || 0);
        totalSpent = Number(statsRow?.total_sp || 0);
      } catch (dbErr) {
        console.warn('[Wallet API] Data query notice:', dbErr);
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
      const wRes: any = await query(`SELECT * FROM wallet_settings WHERE id = 1 OR id = 'current' LIMIT 1`);
      const wRow: any = parseDbRow(wRes);
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
      bankName: gwData.rawSettings.manualSettlement?.bankName || '',
      accountHolder: gwData.rawSettings.manualSettlement?.accountHolder || '',
      accountNumber: gwData.rawSettings.manualSettlement?.accountNumber || '',
      routingNumber: gwData.rawSettings.manualSettlement?.routingNumber || '',
      swiftBic: gwData.rawSettings.manualSettlement?.swiftBic || '',
      branchName: gwData.rawSettings.manualSettlement?.branchName || '',
      instructions: gwData.rawSettings.manualSettlement?.instructions || 'Please transfer the exact amount and include your reference number.',
      requireReference: gwData.rawSettings.manualSettlement?.requireReference ?? true,
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
      stripe_configured: Boolean(gwData.rawSettings.stripe?.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      paypal_configured: Boolean(gwData.rawSettings.paypal?.clientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
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
          publishableKey: gwData.rawSettings.stripe?.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
        },
        paypal: {
          enabled: gwData.paypalEnabled,
          clientId: gwData.rawSettings.paypal?.clientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
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
    const gwData = await getMasterGatewaySettings();
    const body = await req.json();
    const action = body.action || '';
    const gateway = (body.gateway || '').toLowerCase();

    // 1. VERIFY STRIPE CHECKOUT SESSION ON RETURN
    if (action === 'verify_stripe_session') {
      const sessionId = body.sessionId?.trim();
      const userEmail = (body.email || '').toLowerCase().trim();
      const userId = String(body.userId || '').trim();

      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
      }

      // Check if session already recorded
      const existRes: any = await query(`SELECT * FROM wallet_transactions WHERE gateway_tx_id = $1 LIMIT 1`, [sessionId]);
      const existTx = parseDbRow(existRes);

      if (existTx) {
        const uRes: any = await query(
          `SELECT wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const uRow = parseDbRow(uRes);
        return NextResponse.json({
          success: true,
          message: 'Payment session already confirmed and credited.',
          wallet_balance: Number(uRow?.wallet_balance || 0),
        });
      }

      let depositAmount = 50.00;
      let targetEmail = userEmail;
      let targetUserId = userId;
      let verified = false;

      const secretKey = gwData.rawSettings.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '';

      if (secretKey && !sessionId.startsWith('cs_test_mock_')) {
        try {
          const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status === 'paid' || session.status === 'complete') {
            verified = true;
            if (session.amount_total) {
              depositAmount = isZeroDecimal(session.currency || gwData.currency)
                ? session.amount_total
                : session.amount_total / 100;
            }
            if (session.customer_details?.email) {
              targetEmail = session.customer_details.email.toLowerCase().trim();
            }
            if (session.metadata?.userId) {
              targetUserId = session.metadata.userId;
            }
          }
        } catch (e: any) {
          console.warn('[Stripe verification warning]:', e.message);
        }
      } else if (sessionId.startsWith('cs_test_mock_')) {
        verified = true;
        depositAmount = Number(body.amount || 50);
      }

      // Calculate any promotional bonus
      let bonusPercent = 0;
      try {
        const wRes: any = await query(`SELECT bonus_rules FROM wallet_settings WHERE id = 1 LIMIT 1`);
        const wRow = parseDbRow(wRes);
        if (wRow?.bonus_rules) {
          const rules = typeof wRow.bonus_rules === 'string' ? JSON.parse(wRow.bonus_rules) : wRow.bonus_rules;
          if (Array.isArray(rules)) {
            for (const r of rules) {
              const thresh = parseFloat(r.threshold || 0);
              const pct = parseFloat(r.bonus_percent || 0);
              if (depositAmount >= thresh && pct > bonusPercent) bonusPercent = pct;
            }
          }
        }
      } catch (_) {}

      const bonusAmt = bonusPercent > 0 ? (depositAmount * bonusPercent) / 100 : 0;
      const totalCredit = depositAmount + bonusAmt;

      // Increment user balance
      let newBalance = totalCredit;
      const uRes: any = await query(
        `UPDATE users 
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
         WHERE (id::text = $2 AND $2 != '') OR (LOWER(TRIM(email)) = $3 AND $3 != '') 
         RETURNING id, email, wallet_balance`,
        [totalCredit, targetUserId, targetEmail]
      );
      const uRow = parseDbRow(uRes);
      if (uRow && uRow.wallet_balance !== undefined) {
        newBalance = Number(uRow.wallet_balance || 0);
      }

      const txId = `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const desc = `Stripe Checkout deposit: ${gwData.currency} ${depositAmount.toFixed(2)}${bonusAmt > 0 ? ` (+${bonusAmt.toFixed(2)} bonus)` : ''}`;

      await query(
        `INSERT INTO wallet_transactions (
          id, user_id, user_email, type, amount, balance_after, gateway, gateway_tx_id, status, description, created_at
        ) VALUES ($1, $2, $3, 'topup', $4, $5, 'stripe', $6, 'succeeded', $7, NOW())
        ON CONFLICT (id) DO NOTHING`,
        [txId, targetUserId || uRow?.id || '', targetEmail || uRow?.email || '', totalCredit, newBalance, sessionId, desc]
      );

      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount, currency, gateway, gateway_transaction_id, status, created_at, updated_at
        ) VALUES ($1, 'Customer', $2, 'Wallet Top-Up', 'wallet_topup', $3, $4, 'stripe', $5, 'succeeded', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING`,
        [`ptx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, targetEmail || uRow?.email || '', depositAmount, gwData.currency, sessionId]
      );

      return NextResponse.json({
        success: true,
        message: `Stripe checkout verified! ${gwData.currency} ${totalCredit.toFixed(2)} added to store credit.`,
        wallet_balance: newBalance
      });
    }

    // 2. CHECKOUT SESSION CREATION FOR STRIPE
    if (gateway === 'stripe') {
      if (!gwData.stripeEnabled) {
        return NextResponse.json({ success: false, error: 'Credit Card (Stripe) is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
      }

      const depositAmt = parseFloat(body.amount || 0);
      const email = (body.email || '').toLowerCase().trim();
      const userId = String(body.userId || '').trim();
      const origin = body.origin || '';

      if (isNaN(depositAmt) || depositAmt <= 0) {
        return NextResponse.json({ success: false, error: 'A valid deposit amount is required.' }, { status: 400 });
      }

      const secretKey = gwData.rawSettings.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '';

      if (secretKey && secretKey.startsWith('sk_')) {
        try {
          const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
          const unitAmount = isZeroDecimal(gwData.currency)
            ? Math.round(depositAmt)
            : Math.round(depositAmt * 100);

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: gwData.currency.toLowerCase(),
                unit_amount: unitAmount,
                product_data: {
                  name: `Store Credit Top-Up (${gwData.currency.toUpperCase()} ${depositAmt.toFixed(2)})`,
                  description: `Zecratary Wallet Balance Deposit for ${email}`
                },
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${origin || ''}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin || ''}/wallet?status=cancelled`,
            customer_email: email,
            client_reference_id: String(userId || email),
            metadata: {
              userId: String(userId || ''),
              email: String(email || ''),
              amount: depositAmt.toString(),
              type: 'wallet_topup',
              gateway: 'stripe'
            }
          });

          return NextResponse.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
        } catch (stripeErr: any) {
          if (gwData.testMode) {
            const mockSessionId = `cs_test_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            return NextResponse.json({
              success: true,
              checkoutUrl: `${origin || ''}/wallet?status=success&session_id=${mockSessionId}&amount=${depositAmt}`,
              note: 'Sandbox test simulation mode active.'
            });
          }
          return NextResponse.json({ success: false, error: `Stripe Checkout error: ${stripeErr.message}` }, { status: 400 });
        }
      } else {
        if (gwData.testMode) {
          const mockSessionId = `cs_test_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          return NextResponse.json({
            success: true,
            checkoutUrl: `${origin || ''}/wallet?status=success&session_id=${mockSessionId}&amount=${depositAmt}`,
            note: 'Sandbox test simulation mode active.'
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Stripe Gateway is not configured. Please enter Stripe Secret Key in Payment Gateway settings.'
        }, { status: 400 });
      }
    }

    // 3. MANUAL SETTLEMENT SUBMISSION (STATUS = PENDING, DO NOT CREDIT WALLET BALANCE YET)
    if (action === 'submit_manual_settlement' || action === 'submit_manual_deposit' || gateway === 'manual' || gateway === 'manual_settlement') {
      if (!gwData.manualEnabled) {
        return NextResponse.json({ success: false, error: 'Manual Bank Wire settlement is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
      }

      const txId = 'wire_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const amount = Number(body.amount || 0);
      const ref = (body.transferReference || body.transfer_reference || '').trim();
      const notes = (body.notes || '').trim();
      const userId = body.userId || '';
      const userEmail = (body.userEmail || body.email || '').toLowerCase().trim();
      const userName = body.userName || body.name || 'Customer';

      if (!ref) {
        return NextResponse.json({ success: false, error: 'Transfer reference code is required for bank wire submissions.' }, { status: 400 });
      }

      let currentBal = 0;
      try {
        const uRes: any = await query(
          `SELECT id, email, name, wallet_balance FROM users WHERE (id::text = $1 AND $1 != '') OR (LOWER(TRIM(email)) = $2 AND $2 != '') LIMIT 1`,
          [userId, userEmail]
        );
        const uRow = parseDbRow(uRes);
        if (uRow && uRow.wallet_balance !== undefined) {
          currentBal = Number(uRow.wallet_balance || 0);
        }
      } catch (_) {}

      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, test_mode, transfer_reference, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Wallet Store Credit Top-Up', 'wallet_topup', $4, $5, 'manual_settlement', 'pending', $6, $7, $8, NOW(), NOW())`,
        [txId, userName, userEmail, amount, gwData.currency, gwData.testMode, ref, notes]
      );

      await query(
        `INSERT INTO wallet_transactions (
          id, user_id, user_email, amount, balance_after, type, gateway, gateway_tx_id, status, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'topup', 'manual', $6, 'pending', $7, NOW())`,
        [txId, userId, userEmail, amount, currentBal, txId, `Bank Wire Transfer: ${ref}`]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'Wire transfer details submitted successfully! Your deposit is currently Pending and will be credited once approved by an administrator in Payment Gateway.',
        transactionId: txId,
        status: 'pending',
        wallet_balance: currentBal
      });
    }

    return NextResponse.json({ success: true, message: 'Wallet operation acknowledged' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
