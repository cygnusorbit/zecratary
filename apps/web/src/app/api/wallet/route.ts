import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { queryMysql } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

async function resolveUserFromReq(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let rawUserId = searchParams.get('userId')?.trim() || '';
  let rawEmail = searchParams.get('email')?.trim().toLowerCase() || '';

  if (rawUserId === 'undefined' || rawUserId === 'null') rawUserId = '';
  if (rawEmail === 'undefined' || rawEmail === 'null') rawEmail = '';

  if (!rawUserId && !rawEmail) {
    const authCookies = ['zecratary_session', 'currentUser', 'zecratary_user', 'zecratary_current_user'];
    for (const cName of authCookies) {
      const cVal = req.cookies.get(cName)?.value;
      if (cVal) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cVal));
          if (parsed?.id) rawUserId = String(parsed.id);
          if (parsed?.email) rawEmail = String(parsed.email).toLowerCase();
          if (rawUserId || rawEmail) break;
        } catch (_) {}
      }
    }
  }

  return { userId: rawUserId, email: rawEmail };
}

export async function GET(req: NextRequest) {
  try {
    const { userId, email } = await resolveUserFromReq(req);

    try {
      await query(`
        CREATE TABLE IF NOT EXISTS wallet_settings (
          id VARCHAR(64) PRIMARY KEY DEFAULT 'current',
          is_enabled BOOLEAN DEFAULT true,
          currency VARCHAR(10) DEFAULT 'USD',
          min_topup NUMERIC(10,2) DEFAULT 5.00,
          max_topup NUMERIC(10,2) DEFAULT 1000.00,
          preset_amounts JSONB DEFAULT '[10, 25, 50, 100, 250]',
          bonus_rules JSONB DEFAULT '[{"threshold": 50, "bonus_percent": 5}, {"threshold": 100, "bonus_percent": 10}]',
          allowed_gateways JSONB DEFAULT '["stripe", "paypal", "manual"]',
          allow_site_purchases BOOLEAN DEFAULT true,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INT DEFAULT 100;
      `);
    } catch (_) {}

    const settingsRows = await query(`SELECT * FROM wallet_settings WHERE id = 'current' LIMIT 1`).catch(() => []);
    const settings = settingsRows[0] || {
      is_enabled: true,
      currency: 'USD',
      min_topup: 5.00,
      max_topup: 1000.00
    };

    let user: any = null;
    let walletBalance = 0.00;
    let tokenBalance = 100;

    if (userId || email) {
      const userRes = await query(
        `SELECT id, email, name, 
                COALESCE(wallet_balance, 0) as wallet_balance,
                COALESCE(token_balance, 0) as token_balance 
         FROM users 
         WHERE ($1 != '' AND id::text = $1) 
            OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
         LIMIT 1`,
        [userId, email]
      );
      if (userRes && userRes.length > 0) {
        user = userRes[0];
        walletBalance = parseFloat(user.wallet_balance || 0);
        tokenBalance = Number(user.token_balance || 0);
      }
    }

    if (!user) {
      const firstUserRes = await query(
        `SELECT id, email, name, 
                COALESCE(wallet_balance, 0) as wallet_balance,
                COALESCE(token_balance, 0) as token_balance 
         FROM users 
         ORDER BY created_at ASC LIMIT 1`
      ).catch(() => []);
      if (firstUserRes && firstUserRes.length > 0) {
        user = firstUserRes[0];
        walletBalance = parseFloat(user.wallet_balance || 0);
        tokenBalance = Number(user.token_balance || 0);
      }
    }

    const curr = settings.currency || 'USD';
    const symbols: Record<string, string> = { 
      USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', THB: '฿', JPY: '¥', SGD: 'S$' 
    };

    return NextResponse.json({
      success: true,
      settings,
      user,
      wallet_balance: walletBalance,
      walletBalance: walletBalance,
      balance: walletBalance,
      token_balance: tokenBalance,
      tokenBalance: tokenBalance,
      currency: curr,
      walletSymbol: symbols[curr.toUpperCase()] || '$'
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
