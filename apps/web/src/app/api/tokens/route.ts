import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenSettings, deductUserTokens, addTokensToUser } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

async function resolveUserFromReq(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let rawUserId = searchParams.get('userId')?.trim() || '';
  let rawEmail = searchParams.get('email')?.trim().toLowerCase() || '';

  if (rawUserId === 'undefined' || rawUserId === 'null') rawUserId = '';
  if (rawEmail === 'undefined' || rawEmail === 'null') rawEmail = '';

  if (!rawUserId && !rawEmail) {
    const authCookies = ['zecratary_session', 'currentUser', 'zecratary_user'];
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
    const tokenSettings = await getTokenSettings();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    let userRow: any = null;
    let tokenBalance = 0;
    let walletBalance = 0;

    if (userId || email) {
      const userRes = await query(
        `SELECT id, email, name, 
                COALESCE(token_balance, 0) as token_balance, 
                COALESCE(wallet_balance, 0) as wallet_balance 
         FROM users 
         WHERE ($1 != '' AND id::text = $1) 
            OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) 
         LIMIT 1`,
        [userId, email]
      );
      if (userRes && userRes.length > 0) {
        userRow = userRes[0];
        tokenBalance = Number(userRow.token_balance || 0);
        walletBalance = parseFloat(userRow.wallet_balance || 0);
      }
    } else {
      // Fallback to active admin/first user if available
      const firstUserRes = await query(
        `SELECT id, email, name, 
                COALESCE(token_balance, 0) as token_balance, 
                COALESCE(wallet_balance, 0) as wallet_balance 
         FROM users 
         ORDER BY created_at ASC LIMIT 1`
      );
      if (firstUserRes && firstUserRes.length > 0) {
        userRow = firstUserRes[0];
        tokenBalance = Number(userRow.token_balance || 0);
        walletBalance = parseFloat(userRow.wallet_balance || 0);
      }
    }

    // Fetch token transactions ledger if available
    let transactions: any[] = [];
    let totalCount = 0;
    let stats = { totalDeducted: 0, totalGranted: 0, totalEvents: 0 };

    try {
      const txWhere: string[] = [];
      const txParams: any[] = [];
      if (userRow?.id) {
        txParams.push(String(userRow.id));
        txWhere.push(`user_id::text = $${txParams.length}`);
      }
      if (userRow?.email) {
        txParams.push(userRow.email.toLowerCase().trim());
        txWhere.push(`LOWER(TRIM(user_email)) = $${txParams.length}`);
      }

      if (txWhere.length > 0) {
        const whereClause = `(${txWhere.join(' OR ')})`;
        const countRes = await query(`SELECT COUNT(*) as count FROM token_transactions WHERE ${whereClause}`, txParams);
        totalCount = parseInt(countRes[0]?.count || '0', 10);

        const pageParams = [...txParams, limit, offset];
        transactions = await query(
          `SELECT * FROM token_transactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
          pageParams
        );

        const statsRes = await query(
          `SELECT 
             COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
             COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
             COUNT(*) as total_events
           FROM token_transactions WHERE ${whereClause}`,
          txParams
        );
        if (statsRes && statsRes.length > 0) {
          stats = {
            totalDeducted: Number(statsRes[0]?.total_deducted || 0),
            totalGranted: Number(statsRes[0]?.total_granted || 0),
            totalEvents: Number(statsRes[0]?.total_events || totalCount)
          };
        }
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      balance: tokenBalance,
      tokenBalance: tokenBalance,
      token_balance: tokenBalance,
      wallet_balance: walletBalance,
      walletBalance: walletBalance,
      tokenSymbol: tokenSettings.tokenSymbol || '🪙',
      tokenName: tokenSettings.tokenName || 'Foodie Token',
      isEnabled: tokenSettings.isEnabled !== false,
      costs: {
        chef: tokenSettings.chefCost || 1,
        importUrl: tokenSettings.importUrlCost || 2,
        importText: tokenSettings.importTextCost || 1,
        importPhoto: tokenSettings.importPhotoCost || 3
      },
      packages: tokenSettings.packages || [],
      user: userRow,
      transactions,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      stats
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
