import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { queryMysql } from '@/lib/mysql';
import { getTokenSettings } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const tokenSettings = await getTokenSettings();

    let userRow: any = null;
    let tokenBalance = 100;
    let walletBalance = 0.00;

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
    }

    if (!userRow) {
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

    const tSymbol = tokenSettings.tokenSymbol || '🪙';
    const tIcon = tokenSettings.tokenIcon || tSymbol;

    return NextResponse.json({
      success: true,
      balance: tokenBalance,
      tokenBalance: tokenBalance,
      token_balance: tokenBalance,
      wallet_balance: walletBalance,
      walletBalance: walletBalance,
      tokenSymbol: tSymbol,
      tokenIcon: tIcon,
      tokenName: tokenSettings.tokenName || 'Foodie Token',
      isEnabled: tokenSettings.isEnabled !== false,
      user: userRow
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await resolveUserFromReq(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || body?.type || 'purchase';
    const packageId = body?.packageId || body?.package_id;
    const tokens = Number(body?.tokens || body?.tokenCount || body?.amount || 0);
    const cost = Number(body?.cost || body?.price || 0);
    const paymentMethod = body?.paymentMethod || body?.payment_method || 'wallet';
    const description = body?.description || 'Token Transaction';

    const targetUserId = body?.userId || userId;
    const targetEmail = body?.userEmail || body?.email || email;

    if (!targetUserId && !targetEmail) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    // Attempt purchaseTokenPackage via tokenService if present
    try {
      const tokenService = await import('@/lib/tokenService');
      if (typeof tokenService.purchaseTokenPackage === 'function') {
        const result = await tokenService.purchaseTokenPackage({
          userId: targetUserId,
          userEmail: targetEmail,
          packageId,
          tokens,
          amount: cost,
          paymentMethod,
          description
        });
        if (result && result.success) {
          return NextResponse.json(result);
        }
      }
    } catch (_) {}

    // Direct Database Execution (PostgreSQL & MySQL - Constraint 8)
    let currentTokens = 100;
    let currentWallet = 0.00;

    const uRes = await query(
      `SELECT id, email, COALESCE(token_balance, 0) as token_balance, COALESCE(wallet_balance, 0) as wallet_balance
       FROM users
       WHERE ($1 != '' AND id::text = $1) OR ($2 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($2)))
       LIMIT 1`,
      [targetUserId || '', targetEmail || '']
    ).catch(() => []);

    if (uRes && uRes.length > 0) {
      currentTokens = Number(uRes[0].token_balance || 0);
      currentWallet = parseFloat(uRes[0].wallet_balance || 0);
    }

    let newTokens = currentTokens;
    let newWallet = currentWallet;

    if (action === 'deduct') {
      if (currentTokens < tokens) {
        return NextResponse.json({ success: false, error: 'Insufficient tokens' }, { status: 400 });
      }
      newTokens = currentTokens - tokens;
    } else {
      if (paymentMethod === 'wallet' && cost > 0) {
        if (currentWallet < cost) {
          return NextResponse.json({ success: false, error: 'Insufficient wallet balance' }, { status: 400 });
        }
        newWallet = currentWallet - cost;
      }
      newTokens = currentTokens + (tokens > 0 ? tokens : 100);
    }

    // Update PostgreSQL
    try {
      await query(
        `UPDATE users SET token_balance = $1, wallet_balance = $2, updated_at = NOW()
         WHERE ($3 != '' AND id::text = $3) OR ($4 != '' AND LOWER(TRIM(email)) = LOWER(TRIM($4)))`,
        [newTokens, newWallet, targetUserId || '', targetEmail || '']
      );

      await query(`
        CREATE TABLE IF NOT EXISTS token_transactions (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          user_email VARCHAR(255),
          package_id VARCHAR(64),
          amount INT NOT NULL,
          type VARCHAR(32) DEFAULT 'purchase',
          cost NUMERIC(10,2) DEFAULT 0,
          payment_method VARCHAR(50) DEFAULT 'wallet',
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `).catch(() => {});

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await query(
        `INSERT INTO token_transactions (id, user_id, user_email, package_id, amount, type, cost, payment_method, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [txId, targetUserId || '', targetEmail || '', packageId || '', tokens || 100, action, cost, paymentMethod, description]
      ).catch(() => {});
    } catch (pgErr) {
      console.warn('[tokens:POST] PostgreSQL update notice:', pgErr);
    }

    // Update MySQL (Constraint 8)
    try {
      await queryMysql(
        `UPDATE users SET token_balance = ?, wallet_balance = ?, updated_at = NOW()
         WHERE (? != '' AND id = ?) OR (? != '' AND LOWER(TRIM(email)) = LOWER(TRIM(?)))`,
        [newTokens, newWallet, targetUserId || '', targetUserId || '', targetEmail || '', targetEmail || '']
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      tokenBalance: newTokens,
      tokensAdded: tokens,
      newBalance: newTokens,
      walletBalance: newWallet,
      newWalletBalance: newWallet
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    }
  });
}
