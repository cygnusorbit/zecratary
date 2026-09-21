import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenSettings, initTokenTables } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initTokenTables();

    // Ensure token_transactions table exists in PostgreSQL
    await query(`
      CREATE TABLE IF NOT EXISTS token_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_email TEXT,
        amount NUMERIC DEFAULT 0,
        balance_after NUMERIC DEFAULT 0,
        type TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_id, user_email);
      CREATE INDEX IF NOT EXISTS idx_token_tx_created ON token_transactions(created_at DESC);
    `);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || '';
    const email = searchParams.get('email')?.toLowerCase().trim() || '';
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    const settings = await getTokenSettings();

    let balance = 100;
    let resolvedUser: any = null;

    if (userId) {
      const uRows = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (uRows && uRows.length > 0) resolvedUser = uRows[0];
    }
    if (!resolvedUser && email) {
      const uRows = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      if (uRows && uRows.length > 0) resolvedUser = uRows[0];
    }

    if (resolvedUser) {
      balance = Number(resolvedUser.token_balance ?? 100);
    }

    // Build user-isolated conditions
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
      // Return basic settings if no user provided
      return NextResponse.json({
        success: true,
        balance,
        tokenSymbol: settings.tokenSymbol || '🪙',
        tokenName: settings.tokenName || 'Foodie Token',
        transactions: [],
        totalCount: 0,
        page: 1,
        limit,
        totalPages: 1,
        stats: { totalDeducted: 0, totalGranted: 0, totalEvents: 0 }
      }, { headers: { 'Cache-Control': 'no-store' } });
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

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Check count of user transactions
    const countRows = await query(`SELECT COUNT(*) as count FROM token_transactions tt ${whereSql}`, params);
    let totalCount = parseInt(countRows[0]?.count || '0', 10);

    // Auto-seed initial grant if ledger is empty and balance > 0
    if (totalCount === 0 && !search && type === 'all' && balance > 0) {
      const uId = resolvedUser?.id || userId || 'usr_seed';
      const uEmail = resolvedUser?.email || email || 'user@foodieprep.com';
      const initTxId = 'tx_init_' + Math.random().toString(36).substring(2, 9);
      
      await query(`
        INSERT INTO token_transactions 
        (id, user_id, user_email, amount, balance_after, type, description, created_at)
        VALUES ($1, $2, $3, $4, $5, 'plan_monthly_grant', 'Initial Token Allowance Grant', NOW())
        ON CONFLICT (id) DO NOTHING
      `, [initTxId, uId, uEmail, balance, balance]);

      totalCount = 1;
    }

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

    // Lifetime user stats query
    const userBaseWhere = `WHERE ${userConditions.map((c, i) => c.replace(/\$\d+/, `$${i + 1}`)).join(' OR ')}`;
    const baseParams = params.slice(0, userConditions.length);

    const statsRows = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
        COUNT(*) as total_txs
      FROM token_transactions tt
      ${userBaseWhere}
    `, baseParams);

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
    return NextResponse.json({ success: false, balance: 100, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initTokenTables();
    const body = await req.json();
    const { action, packageId, tokens, price, packageName, userEmail, userId, amount, service, description } = body;

    const settings = await getTokenSettings();
    const symbol = settings.tokenSymbol || '🪙';
    const ident = (userEmail || userId || '').trim();

    if (!ident) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    if (action === 'purchase' || packageId) {
      let tokensToAdd = Number(tokens || 0);
      let resolvedPkgName = packageName || 'Custom Package';

      if (!tokensToAdd || tokensToAdd <= 0) {
        const found = settings.packages.find((p: any) => p.id === packageId);
        if (found) {
          tokensToAdd = Number(found.tokens || 100);
          resolvedPkgName = found.name || resolvedPkgName;
        } else {
          tokensToAdd = 250;
        }
      }

      const updateResult = await query(`
        UPDATE users
        SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW()
        WHERE (email IS NOT NULL AND LOWER(email) = LOWER($2)) OR id = $3
        RETURNING id, email, token_balance
      `, [tokensToAdd, userEmail || ident, userId || ident]);

      if (!updateResult || updateResult.length === 0) {
        return NextResponse.json({ success: false, error: 'User not found in database' }, { status: 404 });
      }

      const userRow = updateResult[0];
      const newBalance = Number(userRow.token_balance);

      const txId = 'tx_topup_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const desc = `Top Up: ${resolvedPkgName} (+${tokensToAdd.toLocaleString()} ${symbol})${price ? ` - $${Number(price).toFixed(2)}` : ''}`;

      await query(`
        INSERT INTO token_transactions 
        (id, user_id, user_email, amount, balance_after, type, description, created_at)
        VALUES ($1, $2, $3, $4, $5, 'package_purchase', $6, NOW())
      `, [txId, userRow.id, userRow.email, tokensToAdd, newBalance, desc]);

      return NextResponse.json({
        success: true,
        balance: newBalance,
        tokensGranted: tokensToAdd,
        message: `Successfully added +${tokensToAdd.toLocaleString()} ${symbol}!`
      });
    }

    if (action === 'deduct') {
      const tokensToDeduct = Math.abs(Number(amount || 1));
      const updateResult = await query(`
        UPDATE users
        SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - $1), updated_at = NOW()
        WHERE (email IS NOT NULL AND LOWER(email) = LOWER($2)) OR id = $3
        RETURNING id, email, token_balance
      `, [tokensToDeduct, userEmail || ident, userId || ident]);

      if (!updateResult || updateResult.length === 0) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const userRow = updateResult[0];
      const newBalance = Number(userRow.token_balance);
      const txId = 'tx_use_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

      await query(`
        INSERT INTO token_transactions 
        (id, user_id, user_email, amount, balance_after, type, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [txId, userRow.id, userRow.email, -tokensToDeduct, newBalance, service || 'usage_chef', description || 'AI Token Usage']);

      return NextResponse.json({ success: true, balance: newBalance });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
