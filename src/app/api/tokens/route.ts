import { NextRequest, NextResponse } from 'next/server';
import { getTokenSettings, purchaseTokenPackage, initTokenTables } from '@/lib/tokenService';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initTokenTables();
    const settings = await getTokenSettings();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    let balance = 0;
    if (userId || email) {
      const rows = await query('SELECT token_balance FROM users WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1', [userId || '', (email || '').trim()]);
      if (rows && rows.length > 0) balance = Number(rows[0].token_balance || 0);
    }

    return NextResponse.json({
      success: true,
      balance,
      tokenBalance: balance,
      chefCost: settings.chefCost,
      aiChefCost: settings.chefCost,
      tokenSymbol: settings.tokenSymbol,
      tokenName: settings.tokenName,
      isEnabled: settings.isEnabled,
      packages: settings.packages,
      costs: {
        chef: settings.chefCost,
        aiChef: settings.chefCost,
        'AI Chef Recipe Generation': settings.chefCost,
        importUrl: settings.importUrlCost,
        importText: settings.importTextCost,
        importPhoto: settings.importPhotoCost
      },
      settings
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initTokenTables();
    const body = await req.json();
    const { action, packageId, userId, userEmail, tokens, price, packageName, paymentMethod } = body;

    if (action === 'purchase' || packageId) {
      const result = await purchaseTokenPackage({
        userId,
        userEmail,
        packageId,
        tokens,
        price,
        packageName,
        paymentMethod: paymentMethod || 'wallet'
      });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json({ success: false, error: 'Unrecognized token action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
