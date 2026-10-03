import { NextRequest, NextResponse } from 'next/server';
import { 
  getTokenSettings, 
  saveTokenSettings,
  getUserTokenBalance, 
  syncUserMonthlyTokens,
  purchaseTokenPackage,
  getPool,
  initTokenTables
} from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let client: any = null;
  try {
    await initTokenTables();
    const pool = getPool();
    client = await pool.connect();

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId')?.trim() || '';
    let email = searchParams.get('email')?.toLowerCase().trim() || '';
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    // Cookie session fallback
    if (!userId && !email) {
      const cookieHeader = req.cookies.get('zecratary_session')?.value || req.cookies.get('currentUser')?.value;
      if (cookieHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieHeader));
          userId = parsed.id || '';
          email = (parsed.email || '').toLowerCase().trim();
        } catch (_) {}
      }
    }

    if (!userId && !email) {
      email = 'admin@zecratary.com';
    }

    if (userId || email) {
      try {
        await syncUserMonthlyTokens(userId, email);
      } catch (_) {}
    }

    const settings = await getTokenSettings();

    let resolvedUser: any = null;
    let balance = 0;
    let walletBalance = 0;

    // Query prioritizing matching by email and largest available funded wallet balance
    const uRes = await client.query(
      `SELECT id, email, token_balance, wallet_balance 
       FROM users 
       WHERE (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '')
          OR (id::text = $2 AND $2 != '')
       ORDER BY 
         CASE WHEN (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') THEN 0 ELSE 1 END,
         COALESCE(wallet_balance, 0) DESC
       LIMIT 1`,
      [email || 'none', userId || 'none']
    );

    if (uRes.rows.length > 0) {
      resolvedUser = uRes.rows[0];
      balance = Number(resolvedUser.token_balance ?? 0);
      walletBalance = parseFloat(resolvedUser.wallet_balance ?? 0);
    } else {
      balance = await getUserTokenBalance(userId, email);
    }

    const userConditions: string[] = [];
    const params: any[] = [];

    if (resolvedUser?.id) {
      params.push(resolvedUser.id);
      userConditions.push(`tt.user_id = $${params.length}`);
    }
    if (resolvedUser?.email) {
      params.push(resolvedUser.email.toLowerCase().trim());
      userConditions.push(`LOWER(TRIM(tt.user_email)) = $${params.length}`);
    }
    if (userId && (!resolvedUser?.id || resolvedUser.id !== userId)) {
      params.push(userId);
      userConditions.push(`tt.user_id = $${params.length}`);
    }
    if (email && (!resolvedUser?.email || resolvedUser.email.toLowerCase().trim() !== email)) {
      params.push(email);
      userConditions.push(`LOWER(TRIM(tt.user_email)) = $${params.length}`);
    }

    if (userConditions.length === 0) {
      params.push(email || 'none');
      userConditions.push(`LOWER(TRIM(tt.user_email)) = $${params.length}`);
    }

    const whereClauses: string[] = [`(${userConditions.join(' OR ')})`];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        LOWER(COALESCE(tt.description, '')) LIKE $${params.length} OR 
        LOWER(COALESCE(tt.type, '')) LIKE $${params.length} OR 
        LOWER(COALESCE(tt.id, '')) LIKE $${params.length}
      )`);
    }

    if (type && type !== 'all') {
      if (type === 'chef') {
        params.push('usage_chef');
        whereClauses.push(`tt.type = $${params.length}`);
      } else if (type === 'import') {
        whereClauses.push(`tt.type LIKE 'usage_import%'`);
      } else if (type === 'purchase' || type === 'package_purchase') {
        whereClauses.push(`(tt.type = 'package_purchase' OR tt.type = 'plan_purchase')`);
      } else if (type === 'plan_purchase') {
        params.push('plan_purchase');
        whereClauses.push(`tt.type = $${params.length}`);
      } else if (type === 'grant') {
        params.push('plan_monthly_grant');
        whereClauses.push(`tt.type = $${params.length}`);
      } else {
        params.push(type);
        whereClauses.push(`tt.type = $${params.length}`);
      }
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await client.query(`SELECT COUNT(*) as count FROM token_transactions tt ${whereSql}`, params);
    const totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataParams = [...params, limit, offset];
    const txRes = await client.query(`
      SELECT 
        tt.id, 
        tt.user_id, 
        tt.user_email, 
        tt.amount, 
        tt.balance_after, 
        tt.type, 
        tt.description, 
        tt.created_at,
        COALESCE(
          (SELECT u.token_balance FROM users u WHERE u.id = tt.user_id OR LOWER(u.email) = LOWER(tt.user_email) LIMIT 1),
          tt.balance_after
        ) AS user_total_tokens
      FROM token_transactions tt
      ${whereSql}
      ORDER BY tt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, dataParams);

    const userBaseWhere = `WHERE ${userConditions.map((c, i) => c.replace(/\$\d+/, `$${i + 1}`)).join(' OR ')}`;
    const baseParams = params.slice(0, userConditions.length);

    const statsRes = await client.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
        COUNT(*) as total_txs
      FROM token_transactions tt
      ${userBaseWhere}
    `, baseParams);

    const statsRow = statsRes.rows[0] || { total_deducted: 0, total_granted: 0, total_txs: 0 };

    return NextResponse.json({
      success: true,
      balance,
      tokenBalance: balance,
      user_total_tokens: balance,
      walletBalance,
      tokenName: settings.tokenName || 'Foodie Token',
      tokenSymbol: settings.tokenSymbol || '🪙',
      costs: {
        chef: settings.chefCost || 1,
        importUrl: settings.importUrlCost || 1,
        importText: settings.importTextCost || 1,
        importPhoto: settings.importPhotoCost || 2
      },
      packages: settings.packages || [],
      isEnabled: settings.isEnabled ?? true,
      transactions: txRes.rows,
      total: totalCount,
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      stats: {
        totalDeducted: Number(statsRow.total_deducted),
        totalGranted: Number(statsRow.total_granted),
        totalEvents: Number(statsRow.total_txs)
      }
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Error loading token data',
      balance: 0,
      tokenBalance: 0,
      walletBalance: 0,
      packages: [],
      transactions: []
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

export async function POST(req: NextRequest) {
  try {
    await initTokenTables();
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json({ success: false, error: 'Malformed JSON payload in request body.' }, { status: 400 });
    }

    const { action, packageId, userId, userEmail, email, tokens, price, packageName, paymentMethod } = body;

    let resolvedUserId = userId || '';
    let resolvedEmail = (userEmail || email || '').toLowerCase().trim();

    if (!resolvedUserId && !resolvedEmail) {
      const cookieHeader = req.cookies.get('zecratary_session')?.value || req.cookies.get('currentUser')?.value;
      if (cookieHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieHeader));
          resolvedUserId = parsed.id || '';
          resolvedEmail = (parsed.email || '').toLowerCase().trim();
        } catch (_) {}
      }
    }

    if (!resolvedUserId && !resolvedEmail) {
      resolvedEmail = 'admin@zecratary.com';
    }

    if (!action || action === 'purchase') {
      const result = await purchaseTokenPackage({
        userId: resolvedUserId,
        userEmail: resolvedEmail,
        email: resolvedEmail,
        packageId,
        tokens,
        price,
        packageName,
        paymentMethod: paymentMethod || 'wallet'
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === 'save_settings' || action === 'save' || action === 'update_settings') {
      const saved = await saveTokenSettings(body.settings || body);
      return NextResponse.json({ success: true, message: 'Token settings saved successfully', settings: saved });
    }

    return NextResponse.json({ success: false, error: `Invalid action '${action}' requested.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error processing purchase.' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
