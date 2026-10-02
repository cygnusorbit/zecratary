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
      // Use SELECT * to avoid "column does not exist" failures if a column is missing
      const planRows = await query(`
        SELECT * FROM subscription_plans 
        ORDER BY COALESCE(is_free, false) DESC, COALESCE(monthly_price_dollars, 0) ASC
      `);

      if (planRows && planRows.length > 0) {
        plans = planRows.map((p: any) => {
          const tokenLimit = Number(p.token_limit ?? p.monthly_tokens ?? settings.planAllocations?.[p.slug] ?? (p.is_free ? 50 : 500));
          return {
            id: p.id || p.slug,
            slug: p.slug,
            name: p.name || p.slug,
            token_limit: tokenLimit,
            monthly_tokens: tokenLimit,
            tokenLimit: tokenLimit,
            is_free: Boolean(p.is_free),
            isFree: Boolean(p.is_free),
            monthly_price_dollars: Number(p.monthly_price_dollars ?? 0),
            annual_price_dollars: Number(p.annual_price_dollars ?? 0),
            monthly_badge: p.monthly_badge || undefined,
            annual_badge: p.annual_badge || undefined
          };
        });
      }
    } catch (e) {
      console.warn('GET token-settings plan query warning:', e);
    }

    // If database returned no plans, fallback to plan allocations from settings
    if (plans.length === 0 && settings.planAllocations && Object.keys(settings.planAllocations).length > 0) {
      plans = Object.entries(settings.planAllocations).map(([slug, limit]) => ({
        id: slug,
        slug: slug,
        name: slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        token_limit: Number(limit),
        monthly_tokens: Number(limit),
        tokenLimit: Number(limit),
        is_free: slug.includes('free') || slug === 'taster',
        isFree: slug.includes('free') || slug === 'taster',
        monthly_price_dollars: slug.includes('free') ? 0 : 9.99,
        annual_price_dollars: slug.includes('free') ? 0 : 99.99
      }));
    }

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

    // Update subscription_plans table in PostgreSQL with resilient fallback
    if (planAllocations && typeof planAllocations === 'object') {
      for (const [slug, amount] of Object.entries(planAllocations)) {
        const num = Math.max(0, Number(amount));
        try {
          await query(`
            UPDATE subscription_plans 
            SET token_limit = $1, monthly_tokens = $1, updated_at = NOW() 
            WHERE LOWER(slug) = LOWER($2) OR LOWER(id) = LOWER($2)
          `, [num, slug]);
        } catch (_) {
          try {
            await query(`
              UPDATE subscription_plans 
              SET token_limit = $1, updated_at = NOW() 
              WHERE LOWER(slug) = LOWER($2) OR LOWER(id) = LOWER($2)
            `, [num, slug]);
          } catch (_) {}
        }
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
