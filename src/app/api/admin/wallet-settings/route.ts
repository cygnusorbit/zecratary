import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readServerWalletFallback(): any {
  const candidatePaths = [
    path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
    path.join(process.cwd(), 'data/admin_settings.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.walletSettings || parsed?.wallet_settings) {
          return parsed.walletSettings || parsed.wallet_settings;
        }
      } catch (_) {}
    }
  }
  return null;
}

export async function GET() {
  let settings: any = readServerWalletFallback();
  let transactions: any[] = [];
  let users: any[] = [];

  try {
    // 1. Fetch wallet settings
    const sRes: any = await Promise.race([
      query(`SELECT * FROM wallet_settings WHERE id::text = 'primary_settings' OR id::text = '1' LIMIT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    const sRow = (Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0]);
    if (sRow) {
      settings = {
        currency: sRow.currency || 'USD',
        isEnabled: sRow.is_enabled !== undefined ? Boolean(sRow.is_enabled) : true,
        allowPurchases: sRow.allow_site_purchases !== undefined ? Boolean(sRow.allow_site_purchases) : true,
        minTopup: Number(sRow.min_topup || 5),
        maxTopup: Number(sRow.max_topup || 1000),
        presetAmounts: typeof sRow.preset_amounts === 'string' ? JSON.parse(sRow.preset_amounts) : (sRow.preset_amounts || [10, 25, 50, 100, 250]),
        bonusRules: typeof sRow.bonus_rules === 'string' ? JSON.parse(sRow.bonus_rules) : (sRow.bonus_rules || [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }]),
        ledgerColumns: typeof sRow.ledger_columns === 'string' ? JSON.parse(sRow.ledger_columns) : sRow.ledger_columns
      };
    }

    // 2. Fetch users for manual adjustment dropdown
    const uRes: any = await Promise.race([
      query(`SELECT id, name, email, wallet_balance FROM users ORDER BY name ASC LIMIT 300`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    if (uRes) {
      users = (Array.isArray(uRes) ? uRes : (((uRes as any)?.rows) || []));
    }

    // 3. Fetch recent wallet transactions
    const txRes: any = await Promise.race([
      query(`
        SELECT wt.id, wt.amount, wt.balance_after, wt.type, wt.gateway, wt.gateway_tx_id, wt.status, wt.description, wt.created_at,
               COALESCE(u.email, wt.user_id::text) as customer_email,
               COALESCE(u.name, 'Customer') as customer_name
        FROM wallet_transactions wt
        LEFT JOIN users u ON u.id::text = wt.user_id::text OR LOWER(u.email) = LOWER(wt.user_id::text)
        ORDER BY wt.created_at DESC LIMIT 300
      `),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    if (txRes) {
      transactions = (Array.isArray(txRes) ? txRes : (((txRes as any)?.rows) || []));
    }
  } catch (err: any) {
    console.warn('[Wallet Settings API] Fallback to server JSON store:', err?.message || err);
  }

  const defaultSettings = {
    currency: 'USD',
    isEnabled: true,
    allowPurchases: true,
    minTopup: 5,
    maxTopup: 1000,
    presetAmounts: [10, 25, 50, 100, 250],
    bonusRules: [
      { threshold: 50, bonus_percent: 5 },
      { threshold: 100, bonus_percent: 10 }
    ],
    ledgerColumns: {
      customer: true,
      type: true,
      amount: true,
      balanceAfter: true,
      gateway: true,
      description: true,
      date: true,
      actions: true
    }
  };

  const finalConfig = settings ? { ...defaultSettings, ...settings } : defaultSettings;

  return NextResponse.json({
    success: true,
    walletSettings: finalConfig,
    settings: finalConfig,
    users,
    transactions
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. MANUAL BALANCE ADJUSTMENT
    if (body.action === 'manual_adjustment') {
      const email = (body.email || '').toLowerCase().trim();
      const amount = parseFloat(body.amount);
      const isDebit = body.isDebit === true || body.type === 'debit';
      const reason = body.reason?.trim() || 'Administrative balance adjustment';

      if (!email || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Valid customer email and positive amount are required.' }, { status: 400 });
      }

      const delta = isDebit ? -amount : amount;
      const txType = isDebit ? 'debit' : 'adjustment';

      // Update user wallet balance
      const userRes: any = await query(
        `UPDATE users 
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() 
         WHERE LOWER(TRIM(email)) = $2 
         RETURNING id, name, email, wallet_balance`,
        [delta, email]
      );

      const userRow = (Array.isArray(userRes) ? userRes[0] : (userRes as any)?.rows?.[0]);
      const newBalance = userRow ? Number(userRow.wallet_balance) : 0;
      const txId = 'wtx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      // Insert audit record into wallet_transactions
      await query(
        `INSERT INTO wallet_transactions (
          id, user_id, amount, balance_after, type, gateway, status, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'manual', 'succeeded', $6, NOW())`,
        [txId, userRow?.id || email, delta, newBalance, txType, reason]
      );

      // Mirror to payment_transactions for ledger consistency
      await query(
        `INSERT INTO payment_transactions (
          id, customer_name, customer_email, plan_name, plan_slug, amount, currency, gateway, status, notes, created_at
        ) VALUES ($1, $2, $3, 'Store Wallet Adjustment', 'wallet-adjustment', $4, 'USD', 'manual', 'succeeded', $5, NOW())`,
        [txId, userRow?.name || email.split('@')[0], email, delta, reason]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Successfully adjusted balance for ${email} by ${delta > 0 ? '+' : ''}${delta}. New balance: ${newBalance}.`,
        balanceAfter: newBalance,
        transactionId: txId
      });
    }

    // 2. SAVE CONFIGURATIONS
    const walletSettings = body.walletSettings || body.settings || body;
    const cur = walletSettings.currency || 'USD';
    const isEn = walletSettings.isEnabled !== undefined ? Boolean(walletSettings.isEnabled) : true;
    const allowP = walletSettings.allowPurchases !== undefined ? Boolean(walletSettings.allowPurchases) : true;
    const minTop = Number(walletSettings.minTopup || 5);
    const maxTop = Number(walletSettings.maxTopup || 1000);
    const presets = JSON.stringify(walletSettings.presetAmounts || [10, 25, 50, 100, 250]);
    const bonus = JSON.stringify(walletSettings.bonusRules || []);
    const columns = JSON.stringify(walletSettings.ledgerColumns || {});

    // Persist to PostgreSQL wallet_settings
    try {
      await query(
        `INSERT INTO wallet_settings (
          id, currency, is_enabled, allow_site_purchases, min_topup, max_topup, preset_amounts, bonus_rules, ledger_columns, updated_at
        ) VALUES ('primary_settings', $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          currency = EXCLUDED.currency,
          is_enabled = EXCLUDED.is_enabled,
          allow_site_purchases = EXCLUDED.allow_site_purchases,
          min_topup = EXCLUDED.min_topup,
          max_topup = EXCLUDED.max_topup,
          preset_amounts = EXCLUDED.preset_amounts,
          bonus_rules = EXCLUDED.bonus_rules,
          ledger_columns = EXCLUDED.ledger_columns,
          updated_at = NOW()`,
        [cur, isEn, allowP, minTop, maxTop, presets, bonus, columns]
      );
    } catch (_) {}

    // Persist to JSON store mirror
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'admin_settings.json');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      let existing: any = {};
      if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
      }
      existing.walletSettings = walletSettings;
      existing.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Wallet configurations saved successfully!',
      walletSettings
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const idsToDelete: string[] = body.ids || (id ? [id] : []);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'No transaction ID(s) provided for deletion.' }, { status: 400 });
    }

    await query(
      `DELETE FROM wallet_transactions WHERE id = ANY($1::text[])`,
      [idsToDelete]
    );

    await query(
      `DELETE FROM payment_transactions WHERE id = ANY($1::text[])`,
      [idsToDelete]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${idsToDelete.length} transaction record(s).`,
      deletedCount: idsToDelete.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
