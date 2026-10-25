import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenSettings, initTokenTables } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    try { await initTokenTables(); } catch (_) {}

    try {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          wallet_balance NUMERIC DEFAULT 0,
          token_balance NUMERIC DEFAULT 100,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        INSERT INTO users (id, email, name, role, token_balance, wallet_balance, updated_at)
        VALUES ('usr_admin_1', 'admin@zecratary.com', 'Admin Chef', 'admin', 100, 0, NOW())
        ON CONFLICT (id) DO NOTHING;

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
      `);
    } catch (_) {}

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || '';
    const email = searchParams.get('email')?.toLowerCase().trim() || '';

    let settings: any = { 
      tokenSymbol: '🪙', 
      tokenName: 'Foodie Token', 
      costs: { chef: 1, import_url: 1, import_text: 1, import_photo: 1 }, 
      packages: [] 
    };
    try { settings = await getTokenSettings(); } catch (_) {}

    let balance = 100;
    try {
      if (userId) {
        const uRows: any = await query('SELECT id, email, token_balance FROM users WHERE id = $1 LIMIT 1', [userId]);
        const row = Array.isArray(uRows) ? uRows[0] : uRows?.rows?.[0];
        if (row && row.token_balance !== null && row.token_balance !== undefined) balance = Number(row.token_balance);
      } else if (email) {
        const uRows: any = await query('SELECT id, email, token_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        const row = Array.isArray(uRows) ? uRows[0] : uRows?.rows?.[0];
        if (row && row.token_balance !== null && row.token_balance !== undefined) balance = Number(row.token_balance);
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      balance,
      tokenSymbol: settings.tokenSymbol, tokenEmoji: settings.tokenSymbol, tokenIcon: settings.tokenSymbol || '🪙',
      tokenName: settings.tokenName || 'Foodie Token',
      costs: settings.costs || { chef: 1, import_url: 1, import_text: 1, import_photo: 1 },
      packages: settings.packages || [],
      transactions: [],
      totalCount: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      stats: { totalDeducted: 0, totalGranted: 0, totalEvents: 0 }
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      balance: 100,
      tokenSymbol: '🪙',
      tokenName: 'Foodie Token',
      costs: { chef: 1, import_url: 1, import_text: 1, import_photo: 1 },
      packages: [],
      transactions: [],
      totalCount: 0
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    try { await initTokenTables(); } catch (_) {}
    const body = await req.json();
    const { action, packageId, tokens, price, packageName, userEmail, userId, amount, service, description } = body;

    let settings: any = { tokenSymbol: '🪙', tokenName: 'Foodie Token', packages: [] };
    try { settings = await getTokenSettings(); } catch (_) {}

    const symbol = settings.tokenSymbol || '🪙';
    const ident = (userEmail || userId || 'usr_admin_1').trim();

    if (action === 'purchase' || packageId) {
      let tokensToAdd = Number(tokens || 0);
      let resolvedPkgName = packageName || 'Custom Package';

      if (!tokensToAdd || tokensToAdd <= 0) {
        const found = (settings.packages || []).find((p: any) => p.id === packageId);
        tokensToAdd = found ? Number(found.tokens || 100) : 250;
      }

      const updateResult: any = await query(`
        UPDATE users
        SET token_balance = COALESCE(token_balance, 0) + $1, updated_at = NOW()
        WHERE (email IS NOT NULL AND LOWER(email) = LOWER($2)) OR id = $3
        RETURNING id, email, token_balance
      `, [tokensToAdd, userEmail || ident, userId || ident]);

      const userRow = Array.isArray(updateResult) ? updateResult[0] : updateResult?.rows?.[0];
      const newBalance = userRow ? Number(userRow.token_balance) : 100 + tokensToAdd;

      return NextResponse.json({
        success: true,
        balance: newBalance,
        tokensGranted: tokensToAdd,
        message: `Successfully added +${tokensToAdd.toLocaleString()} ${symbol}!`
      });
    }

    if (action === 'deduct') {
      const tokensToDeduct = Math.abs(Number(amount || 1));
      const updateResult: any = await query(`
        UPDATE users
        SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - $1), updated_at = NOW()
        WHERE (email IS NOT NULL AND LOWER(email) = LOWER($2)) OR id = $3
        RETURNING id, email, token_balance
      `, [tokensToDeduct, userEmail || ident, userId || ident]);

      const userRow = Array.isArray(updateResult) ? updateResult[0] : updateResult?.rows?.[0];
      const newBalance = userRow ? Number(userRow.token_balance) : 0;

      return NextResponse.json({ success: true, balance: newBalance });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
