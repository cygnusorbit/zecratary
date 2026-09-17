import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureIntervalIdColumns() {
  try {
    await query(`
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_group_id VARCHAR(120);
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_plan_id VARCHAR(120);
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_plan_id VARCHAR(120);
    `);
  } catch (_) {}
}

function getCanonicalSlug(rawSlug: string): string {
  if (!rawSlug) return 'taster';
  const clean = rawSlug.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
  return clean.replace(/-(monthly|annual)$/, '');
}

export async function GET() {
  try {
    await ensureIntervalIdColumns();

    const rows = await query(`
      SELECT 
        id,
        name,
        slug,
        is_free AS "isFree",
        is_default AS "isDefault",
        COALESCE(monthly_price_dollars, 0)::float AS "monthlyPriceDollars",
        COALESCE(annual_price_dollars, 0)::float AS "annualPriceDollars",
        monthly_badge AS "monthlyBadge",
        annual_badge AS "annualBadge",
        trial_badge AS "trialBadge",
        description_monthly AS "descriptionMonthly",
        description_annual AS "descriptionAnnual",
        button_text AS "buttonText",
        ai_recipe_limit AS "aiRecipeLimit",
        recipe_library_limit AS "recipeLibraryLimit",
        social_scrape_limit AS "socialScrapeLimit",
        can_view_macros AS "canViewMacros",
        allowed_ai_models AS "allowedAiModels",
        features,
        token_limit AS "tokenLimit",
        token_reimburse_frequency AS "tokenReimburseFrequency",
        COALESCE(plan_group_id, 'group_' || slug, id) AS "planGroupId",
        COALESCE(monthly_plan_id, id || '_monthly', slug || '_monthly') AS "monthlyPlanId",
        COALESCE(annual_plan_id, id || '_annual', slug || '_annual') AS "annualPlanId",
        updated_at AS "updatedAt"
      FROM subscription_plans
      WHERE slug NOT LIKE '%-monthly' AND slug NOT LIKE '%-annual'
      ORDER BY monthly_price_dollars ASC
    `);

    return NextResponse.json(
      { success: true, plans: rows, packages: rows, configs: rows },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIntervalIdColumns();
    const body = await req.json();
    const plans = Array.isArray(body) ? body : (body.plans || body.packages || [body]);

    for (const p of plans) {
      if (!p) continue;
      const rawSlug = (p.slug || p.id || p.name || 'plan').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
      const canonicalSlug = getCanonicalSlug(rawSlug);
      const targetId = p.id || canonicalSlug;
      const isDefault = canonicalSlug === 'taster' || targetId === 'preset_taster';

      const planGroupId = p.planGroupId || ('group_' + canonicalSlug);
      const monthlyPlanId = p.monthlyPlanId || (p.isFree ? targetId : `${targetId}_monthly`);
      const annualPlanId = p.annualPlanId || (p.isFree ? targetId : `${targetId}_annual`);

      const existing = await query(
        'SELECT id, slug FROM subscription_plans WHERE id = $1 OR slug = $2 OR slug = $3 LIMIT 1',
        [targetId, canonicalSlug, rawSlug]
      );

      if (existing.length > 0) {
        const rowId = existing[0].id;
        await query(`
          UPDATE subscription_plans SET
            name = $1,
            slug = $2,
            is_free = $3,
            is_default = $4,
            monthly_price_dollars = $5,
            annual_price_dollars = $6,
            monthly_badge = $7,
            annual_badge = $8,
            trial_badge = $9,
            description_monthly = $10,
            description_annual = $11,
            button_text = $12,
            ai_recipe_limit = $13,
            recipe_library_limit = $14,
            social_scrape_limit = $15,
            can_view_macros = $16,
            allowed_ai_models = $17,
            features = $18::jsonb,
            token_limit = $19,
            token_reimburse_frequency = $20,
            plan_group_id = $21,
            monthly_plan_id = $22,
            annual_plan_id = $23,
            updated_at = NOW()
          WHERE id = $24
        `, [
          p.name,
          canonicalSlug,
          Boolean(p.isFree),
          isDefault,
          Number(p.monthlyPriceDollars) || 0,
          Number(p.annualPriceDollars) || 0,
          p.monthlyBadge || '',
          p.annualBadge || '',
          p.trialBadge || '',
          p.descriptionMonthly || '',
          p.descriptionAnnual || '',
          p.buttonText || 'Choose Plan',
          p.aiRecipeLimit !== undefined ? p.aiRecipeLimit : 5,
          p.recipeLibraryLimit !== undefined ? p.recipeLibraryLimit : 25,
          p.socialScrapeLimit !== undefined ? p.socialScrapeLimit : 5,
          Boolean(p.canViewMacros),
          Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.6-flash'),
          JSON.stringify(p.features || []),
          Number(p.tokenLimit) || 50000,
          p.tokenReimburseFrequency || 'monthly',
          planGroupId,
          monthlyPlanId,
          annualPlanId,
          rowId
        ]);
      } else {
        await query(`
          INSERT INTO subscription_plans (
            id, name, slug, is_free, is_default, monthly_price_dollars, annual_price_dollars,
            monthly_badge, annual_badge, trial_badge, description_monthly, description_annual,
            button_text, ai_recipe_limit, recipe_library_limit, social_scrape_limit,
            can_view_macros, allowed_ai_models, features, token_limit, token_reimburse_frequency,
            plan_group_id, monthly_plan_id, annual_plan_id, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24, NOW())
        `, [
          targetId,
          p.name,
          canonicalSlug,
          Boolean(p.isFree),
          isDefault,
          Number(p.monthlyPriceDollars) || 0,
          Number(p.annualPriceDollars) || 0,
          p.monthlyBadge || '',
          p.annualBadge || '',
          p.trialBadge || '',
          p.descriptionMonthly || '',
          p.descriptionAnnual || '',
          p.buttonText || 'Choose Plan',
          p.aiRecipeLimit !== undefined ? p.aiRecipeLimit : 5,
          p.recipeLibraryLimit !== undefined ? p.recipeLibraryLimit : 25,
          p.socialScrapeLimit !== undefined ? p.socialScrapeLimit : 5,
          Boolean(p.canViewMacros),
          Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.6-flash'),
          JSON.stringify(p.features || []),
          Number(p.tokenLimit) || 50000,
          p.tokenReimburseFrequency || 'monthly',
          planGroupId,
          monthlyPlanId,
          annualPlanId
        ]);
      }
    }

    return NextResponse.json({ success: true, message: 'Plan groups and interval IDs synchronized successfully in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let slug = searchParams.get('slug');

    if (!id && !slug) {
      try {
        const body = await req.json();
        id = body?.id;
        slug = body?.slug;
      } catch (_) {}
    }

    if (!id && !slug) {
      return NextResponse.json({ success: false, error: 'Plan ID or Slug is required' }, { status: 400 });
    }

    const targetSlug = (slug || '').toLowerCase().trim();
    const targetId = (id || '').trim();

    if (targetSlug === 'taster' || targetId === 'preset_taster' || targetId === 'taster') {
      return NextResponse.json({ success: false, error: 'Cannot delete the system default Taster plan.' }, { status: 400 });
    }

    await query(`
      DELETE FROM subscription_plans 
      WHERE id = $1 OR slug = $2 OR id = $3 OR slug = $4
    `, [targetId, targetSlug, targetSlug, targetId]);

    return NextResponse.json({ success: true, message: 'Plan permanently deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
