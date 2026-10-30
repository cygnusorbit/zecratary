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
      plans = await query('SELECT id, slug, name, monthly_tokens, token_limit, price FROM subscription_plans ORDER BY created_at ASC');
    } catch (_) {}

    let transactions: any[] = [];
    try {
      transactions = await query('SELECT id, user_email as customer_email, amount, balance_after, type, description, created_at FROM token_transactions ORDER BY created_at DESC LIMIT 50');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      settings,
      tokenSettings: settings,
      chefCost: settings.chefCost,
      aiChefCost: settings.chefCost,
      tokenSymbol: settings.tokenSymbol,
      tokenName: settings.tokenName,
      plans,
      transactions,
      currency: 'USD',
      currencySymbol: '$'
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const body = raw.tokenSettings || raw.settings || raw;

    const rawChef = body.aiChefCost ?? body.chefCost ?? (body.featureCosts ? (body.featureCosts['AI Chef Recipe Generation'] ?? body.featureCosts['chef']) : undefined);
    const resolvedChefCost = rawChef !== undefined ? Math.max(0, Number(rawChef)) : 8;

    const updated = await saveTokenSettings({
      tokenName: body.tokenName !== undefined ? String(body.tokenName).trim() : 'Foodie Token',
      tokenSymbol: body.tokenSymbol !== undefined ? String(body.tokenSymbol).trim() : '',
      chefCost: resolvedChefCost,
      aiChefCost: resolvedChefCost,
      importUrlCost: body.importUrlCost !== undefined ? Number(body.importUrlCost) : 5,
      importTextCost: body.importTextCost !== undefined ? Number(body.importTextCost) : 2,
      importPhotoCost: body.importPhotoCost !== undefined ? Number(body.importPhotoCost) : 10,
      mealPlannerCost: body.mealPlannerCost !== undefined ? Number(body.mealPlannerCost) : 5,
      macroAnalysisCost: body.macroAnalysisCost !== undefined ? Number(body.macroAnalysisCost) : 3,
      startingBalance: body.startingBalance !== undefined ? Number(body.startingBalance) : 100,
      packages: Array.isArray(body.packages) ? body.packages : undefined,
      isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : true,
      planAllocations: body.planAllocations || {}
    });

    if (body.planAllocations && typeof body.planAllocations === 'object') {
      for (const [slug, amount] of Object.entries(body.planAllocations)) {
        try {
          await query('UPDATE subscription_plans SET monthly_tokens = $1, token_limit = $1 WHERE slug = $2', [Math.max(0, Number(amount)), slug]);
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token settings successfully persisted to PostgreSQL & MySQL.',
      settings: updated,
      tokenSettings: updated,
      chefCost: updated.chefCost,
      aiChefCost: updated.chefCost,
      tokenSymbol: updated.tokenSymbol
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
