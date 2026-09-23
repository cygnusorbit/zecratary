import { NextRequest, NextResponse } from 'next/server';
import { getTokenSettings, purchaseTokenPackage, initTokenTables } from '@/lib/tokenService';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initTokenTables();
    const settings = await getTokenSettings();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;
    const typeFilter = searchParams.get('type') || 'all';
    const searchQuery = (searchParams.get('search') || '').trim();
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    let userBalance = 0;
    let walletBalance: number | null = null;
    let userRow: any = null;

    if (userId || email) {
      let uRows: any[] = [];
      if (userId) {
        uRows = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
      }
      if ((!uRows || uRows.length === 0) && email) {
        uRows = await query('SELECT id, email, token_balance, wallet_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.trim()]);
      }
      if (uRows && uRows.length > 0) {
        userRow = uRows[0];
        userBalance = Number(userRow.token_balance ?? 0);
        if (userRow.wallet_balance !== null && userRow.wallet_balance !== undefined) {
          walletBalance = Number(userRow.wallet_balance);
        }
      }
    }

    // Transactions query
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (userRow) {
      conditions.push(`(user_id = $${idx} OR LOWER(user_email) = LOWER($${idx + 1}))`);
      values.push(userRow.id, userRow.email || '');
      idx += 2;
    }

    if (typeFilter && typeFilter !== 'all') {
      conditions.push(`type ILIKE $${idx}`);
      values.push(`%${typeFilter}%`);
      idx++;
    }

    if (searchQuery) {
      conditions.push(`(description ILIKE $${idx} OR type ILIKE $${idx})`);
      values.push(`%${searchQuery}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) as count FROM token_transactions ${whereClause}`, values);
    const total = parseInt(countRes[0]?.count || '0', 10);

    const txRes = await query(`
      SELECT id, amount, balance_after, type, description, created_at
      FROM token_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    // Aggregate stats
    const statsWhere = userRow 
      ? `WHERE user_id = '${userRow.id}' OR LOWER(user_email) = LOWER('${userRow.email || ''}')` 
      : '';
    const statsRes = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_deducted,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_granted,
        COUNT(*) as total_events
      FROM token_transactions
      ${statsWhere}
    `);

    const stats = {
      totalDeducted: Number(statsRes[0]?.total_deducted ?? 0),
      totalGranted: Number(statsRes[0]?.total_granted ?? 0),
      totalEvents: Number(statsRes[0]?.total_events ?? total)
    };

    return NextResponse.json({
      success: true,
      balance: userBalance,
      walletBalance,
      tokenSymbol: settings.tokenSymbol,
      tokenName: settings.tokenName,
      packages: settings.packages,
      transactions: txRes,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      stats
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, packageId, userId, userEmail, paymentMethod } = body;

    if (action === 'purchase') {
      if (!packageId) {
        return NextResponse.json({ success: false, error: 'packageId is required' }, { status: 400 });
      }

      const result = await purchaseTokenPackage({
        packageId,
        userId,
        userEmail,
        paymentMethod: paymentMethod || 'wallet'
      });

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
