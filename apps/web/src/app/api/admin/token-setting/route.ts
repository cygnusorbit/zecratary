import { NextRequest, NextResponse } from 'next/server';
import { getTokenSettings, saveTokenSettings, initTokenTables } from '@/lib/tokenService';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initTokenTables();
    const settings = await getTokenSettings();

    let plans: any[] = [];
    try {
      plans = await query('SELECT id, slug, name, monthly_tokens, token_limit FROM subscription_plans ORDER BY created_at ASC');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      settings,
      plans
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenName, tokenSymbol, chefCost, importUrlCost, importTextCost, importPhotoCost, packages, isEnabled, planAllocations } = body;

    const updated = await saveTokenSettings({
      tokenName: tokenName?.trim() || 'Foodie Token',
      tokenSymbol: tokenSymbol?.trim() || '🪙',
      chefCost: Math.max(0, parseInt(chefCost ?? 1, 10)),
      importUrlCost: Math.max(0, parseInt(importUrlCost ?? 2, 10)),
      importTextCost: Math.max(0, parseInt(importTextCost ?? 1, 10)),
      importPhotoCost: Math.max(0, parseInt(importPhotoCost ?? 3, 10)),
      packages: Array.isArray(packages) ? packages : undefined,
      isEnabled: Boolean(isEnabled),
      planAllocations: planAllocations || {}
    });

    if (planAllocations && typeof planAllocations === 'object') {
      for (const [slug, amount] of Object.entries(planAllocations)) {
        await query('UPDATE subscription_plans SET monthly_tokens = $1, token_limit = $1 WHERE slug = $2', [Math.max(0, Number(amount)), slug]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token settings successfully persisted to PostgreSQL.',
      settings: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
