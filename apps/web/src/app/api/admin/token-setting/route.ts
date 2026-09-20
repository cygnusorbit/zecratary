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
      const planRows = await query(`
        SELECT id, slug, name, token_limit, monthly_tokens, is_free, monthly_price_dollars, annual_price_dollars, monthly_badge, annual_badge 
        FROM subscription_plans 
        ORDER BY is_free DESC, monthly_price_dollars ASC
      `);

      plans = planRows.map((p: any) => {
        const tokenLimit = Number(p.token_limit ?? p.monthly_tokens ?? settings.planAllocations?.[p.slug] ?? (p.is_free ? 50 : 500));
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          token_limit: tokenLimit,
          monthly_tokens: tokenLimit,
          tokenLimit: tokenLimit,
          is_free: Boolean(p.is_free),
          isFree: Boolean(p.is_free),
          monthly_price_dollars: Number(p.monthly_price_dollars ?? 0),
          annual_price_dollars: Number(p.annual_price_dollars ?? 0)
        };
      });
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

    // Update subscription_plans table in PostgreSQL for each plan slug
    if (planAllocations && typeof planAllocations === 'object') {
      for (const [slug, amount] of Object.entries(planAllocations)) {
        const num = Math.max(0, Number(amount));
        await query(`
          UPDATE subscription_plans 
          SET token_limit = $1, monthly_tokens = $1, updated_at = NOW() 
          WHERE LOWER(slug) = LOWER($2) OR LOWER(id) = LOWER($2)
        `, [num, slug]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token settings and plan allocations synchronized with PostgreSQL.',
      settings: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
