import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenSettings, initTokenTables } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initTokenTables();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || '';
    const email = searchParams.get('email')?.toLowerCase().trim() || '';
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    // 1. Fetch user token balance from users table
    let balance = 0;
    let resolvedUser: any = null;
    if (userId) {
      const uRows = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (uRows.length > 0) resolvedUser = uRows[0];
    }
    if (!resolvedUser && email) {
      const uRows = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      if (uRows.length > 0) resolvedUser = uRows[0];
    }

    if (resolvedUser) {
      balance = Number(resolvedUser.token_balance ?? 0);
    }

    // 2. Fetch Token Identity
    const settings = await getTokenSettings();

    // 3. Build where clauses isolated strictly to this user
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (resolvedUser?.id && resolvedUser?.email) {
      params.push(resolvedUser.id);
      params.push(resolvedUser.email.toLowerCase());
      whereClauses.push(`(tt.user_id = $1 OR LOWER(tt.user_email) = $2)`);
    } else if (userId) {
      params.push(userId);
      whereClauses.push(`tt.user_id = $1`);
    } else {
      params.push(email);
      whereClauses.push(`LOWER(tt.user_email) = $1`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(LOWER(tt.description) LIKE $${params.length} OR LOWER(tt.type) LIKE $${params.length} OR LOWER(tt.id) LIKE $${params.length})`);
    }

    if (type && type !== 'all') {
      if (type === 'chef') {
        params.push('usage_chef');
        whereClauses.push(`tt.type = $${params.length}`);
      } else if (type === 'import') {
        whereClauses.push(`tt.type LIKE 'usage_import%'`);
      } else if (type === 'purchase') {
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

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 4. Count total matching user transactions
    const countRows = await query(`SELECT COUNT(*) as count FROM token_transactions tt ${whereSql}`, params);
    const totalCount = parseInt(countRows[0]?.count || '0', 10);

    // 5. Fetch paginated slice of user transactions
    const dataParams = [...params, limit, offset];
    const txRows = await query(`
      SELECT 
        tt.id, 
        tt.user_id, 
        tt.user_email, 
        tt.amount, 
        tt.balance_after, 
        tt.type, 
        tt.description, 
        tt.created_at
      FROM token_transactions tt
      ${whereSql}
      ORDER BY tt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, dataParams);

    // 6. Calculate user lifetime stats
    let userBaseParams: any[] = [];
    let userBaseWhere = '';
    if (resolvedUser?.id && resolvedUser?.email) {
      userBaseParams = [resolvedUser.id, resolvedUser.email.toLowerCase()];
      userBaseWhere = `WHERE user_id = $1 OR LOWER(user_email) = $2`;
    } else if (userId) {
      userBaseParams = [userId];
      userBaseWhere = `WHERE user_id = $1`;
    } else {
      userBaseParams = [email];
      userBaseWhere = `WHERE LOWER(user_email) = $1`;
    }

    const statsRows = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
        COUNT(*) as total_txs
      FROM token_transactions
      ${userBaseWhere}
    `, userBaseParams);

    const stats = statsRows[0] || { total_deducted: 0, total_granted: 0, total_txs: 0 };

    return NextResponse.json({
      success: true,
      balance,
      tokenName: settings.tokenName || 'Foodie Token',
      tokenSymbol: settings.tokenSymbol || '🪙',
      transactions: txRows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      stats: {
        totalDeducted: Number(stats.total_deducted),
        totalGranted: Number(stats.total_granted),
        totalEvents: Number(stats.total_txs)
      }
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
