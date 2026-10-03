import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
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
      instructions: '',
      requireReference: true,
    }
  };

  try {
    const sRes: any = await query(`SELECT payment_settings, currency FROM admin_settings WHERE id = 1 LIMIT 1`);
    const row: any = parseDbRow(sRes);
    if (row?.payment_settings) {
      const ps = typeof row.payment_settings === 'string' ? JSON.parse(row.payment_settings) : row.payment_settings;
      if (ps && typeof ps === 'object') {
        settings = { ...settings, ...ps };
        if (row.currency) settings.currency = row.currency;
      }
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

        // REQUIREMENT 2: ONLY SUCCEEDED transactions count in totalDeposited
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
      const wRes: any = await query(`SELECT * FROM wallet_settings WHERE id = 1 LIMIT 1`);
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

    if ((gateway === 'stripe' || action === 'create_stripe_session') && !gwData.stripeEnabled) {
      return NextResponse.json({ success: false, error: 'Credit Card (Stripe) is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
    }
    if ((gateway === 'paypal' || action === 'create_paypal_order') && !gwData.paypalEnabled) {
      return NextResponse.json({ success: false, error: 'PayPal digital wallet is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
    }
    if ((gateway === 'manual' || gateway === 'manual_settlement' || action === 'submit_manual_deposit' || action === 'submit_manual_settlement') && !gwData.manualEnabled) {
      return NextResponse.json({ success: false, error: 'Manual Bank Wire settlement is currently disabled by administrator in Payment Gateway.' }, { status: 400 });
    }

    // REQUIREMENT 2: SUBMIT MANUAL SETTLEMENT (STATUS = PENDING, DO NOT CREDIT WALLET BALANCE YET)
    if (action === 'submit_manual_settlement' || action === 'submit_manual_deposit' || gateway === 'manual' || gateway === 'manual_settlement') {
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

      // Read current balance WITHOUT modifying it
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

      // Insert into payment_transactions with status = 'pending'
      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug,
          amount, currency, gateway, status, test_mode, transfer_reference, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, 'Wallet Store Credit Top-Up', 'wallet_topup', $4, $5, 'manual_settlement', 'pending', $6, $7, $8, NOW(), NOW())`,
        [txId, userName, userEmail, amount, gwData.currency, gwData.testMode, ref, notes]
      );

      // Insert into wallet_transactions with status = 'pending', balance_after = current uncredited balance
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
