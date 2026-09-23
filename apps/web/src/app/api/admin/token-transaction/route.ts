import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { initTokenTables, deleteTokenTransactionsAndSyncBalance } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initTokenTables();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(200, Math.max(5, parseInt(searchParams.get('limit') || '25', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(LOWER(tt.user_email) LIKE $${params.length} OR LOWER(tt.user_id) LIKE $${params.length} OR LOWER(tt.description) LIKE $${params.length})`);
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

    const countRows = await query(`SELECT COUNT(*) as count FROM token_transactions tt ${whereSql}`, params);
    const totalCount = parseInt(countRows[0]?.count || '0', 10);

    const dataParams = [...params, limit, offset];
    const rows = await query(`
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

    const statsRows = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
        COUNT(DISTINCT user_email) as active_users,
        COUNT(*) as total_txs
      FROM token_transactions
    `);

    const stats = statsRows[0] || {
      total_deducted: 0,
      total_granted: 0,
      active_users: 0,
      total_txs: 0
    };

    return NextResponse.json({
      success: true,
      transactions: rows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      stats: {
        totalDeducted: Number(stats.total_deducted),
        totalGranted: Number(stats.total_granted),
        activeUsers: Number(stats.active_users),
        totalTransactions: Number(stats.total_txs)
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let ids: string[] = [];

    if (id) {
      ids = [id];
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) {
          ids = body.ids.filter(Boolean);
        } else if (body?.id) {
          ids = [body.id];
        }
      } catch (_) {}
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No transaction ID(s) provided for deletion' }, { status: 400 });
    }

    // Atomically delete transactions and adjust user token balance in PostgreSQL
    const result = await deleteTokenTransactionsAndSyncBalance(ids);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to delete transaction(s)' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} transaction record(s). User token balance(s) updated in PostgreSQL.`,
      deletedCount: result.deletedCount,
      affectedUsers: result.affectedUsers
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
