import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') || '').trim();
    const email = String(searchParams.get('email') || '').toLowerCase().trim();

    let tokenBalance = 500;
    let userRow: any = null;

    if (userId || email) {
      try {
        const uRes: any = await query(`
          SELECT id, email, name, token_balance, wallet_balance, role
          FROM users
          WHERE (id::text = $1::text AND $1::text != '')
             OR (email IS NOT NULL AND LOWER(email) = LOWER($2::text) AND $2::text != '')
          LIMIT 1;
        `, [userId, email]);
        userRow = Array.isArray(uRes) ? uRes[0] : uRes?.rows?.[0];
        if (userRow) {
          tokenBalance = parseInt(userRow.token_balance ?? 500, 10);
        }
      } catch (_) {}
    }

    let settings = {
      is_enabled: true,
      default_free_tokens: 500,
      tokens_per_request: 1,
      cost_per_1k_tokens: 0.002,
    };

    try {
      const sRes: any = await query(`
        SELECT * FROM token_settings 
        WHERE id::text = 'current' OR id::text = '1' 
        LIMIT 1;
      `);
      const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
      if (sRow) {
        settings = {
          is_enabled: sRow.is_enabled !== false,
          default_free_tokens: Number(sRow.default_free_tokens ?? 500),
          tokens_per_request: Number(sRow.tokens_per_request ?? 1),
          cost_per_1k_tokens: Number(sRow.cost_per_1k_tokens ?? 0.002),
        };
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      tokens: tokenBalance,
      token_balance: tokenBalance,
      balance: tokenBalance,
      user: userRow ? {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name || 'Chef',
        token_balance: tokenBalance,
      } : null,
      settings,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, tokens: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, amount, action = 'deduct' } = body;
    const delta = parseInt(amount || '1', 10);

    const targetUserId = String(userId || '').trim();
    const targetEmail = String(email || '').toLowerCase().trim();
    const sign = action === 'deduct' ? -1 : 1;

    const updateRes: any = await query(`
      UPDATE users
      SET token_balance = GREATEST(0, COALESCE(token_balance, 500) + $1),
          updated_at = NOW()
      WHERE (id::text = $2::text AND $2::text != '')
         OR (email IS NOT NULL AND LOWER(email) = LOWER($3::text) AND $3::text != '')
      RETURNING id, email, token_balance;
    `, [delta * sign, targetUserId, targetEmail]);

    const updated = Array.isArray(updateRes) ? updateRes[0] : updateRes?.rows?.[0];
    const newBal = updated ? parseInt(updated.token_balance, 10) : 500;

    return NextResponse.json({
      success: true,
      tokens: newBal,
      token_balance: newBal,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
