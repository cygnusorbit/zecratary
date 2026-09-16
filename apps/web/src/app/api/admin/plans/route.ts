import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query(`
      SELECT 
        id,
        name,
        slug,
        is_free AS "isFree",
        is_default AS "isDefault",
        monthly_price_dollars AS "monthlyPriceDollars",
        annual_price_dollars AS "annualPriceDollars",
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
        updated_at AS "updatedAt"
      FROM subscription_plans
      ORDER BY monthly_price_dollars ASC
    `);

    return NextResponse.json({ success: true, plans: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plans = Array.isArray(body) ? body : (body.plans || [body]);

    for (const p of plans) {
      if (!p) continue;
      const slug = (p.slug || p.id || p.name || 'plan').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
      const targetId = p.id || slug;

      const existing = await query('SELECT id FROM subscription_plans WHERE slug = $1', [slug]);

      if (existing.length > 0) {
        await query(`
          UPDATE subscription_plans SET
            name = $1,
            is_free = $2,
            is_default = $3,
            monthly_price_dollars = $4,
            annual_price_dollars = $5,
            monthly_badge = $6,
            annual_badge = $7,
            trial_badge = $8,
            description_monthly = $9,
            description_annual = $10,
            button_text = $11,
            ai_recipe_limit = $12,
            recipe_library_limit = $13,
            social_scrape_limit = $14,
            can_view_macros = $15,
            allowed_ai_models = $16,
            features = $17::jsonb,
            token_limit = $18,
            token_reimburse_frequency = $19,
            updated_at = NOW()
          WHERE slug = $20
        `, [
          p.name,
          Boolean(p.isFree),
          Boolean(p.isDefault),
          p.monthlyPriceDollars || 0,
          p.annualPriceDollars || 0,
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
          Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.5-flash-lite'),
          JSON.stringify(p.features || []),
          p.tokenLimit || 50000,
          p.tokenReimburseFrequency || 'monthly',
          slug
        ]);
      } else {
        await query(`
          INSERT INTO subscription_plans (
            id, name, slug, is_free, is_default, monthly_price_dollars, annual_price_dollars,
            monthly_badge, annual_badge, trial_badge, description_monthly, description_annual,
            button_text, ai_recipe_limit, recipe_library_limit, social_scrape_limit,
            can_view_macros, allowed_ai_models, features, token_limit, token_reimburse_frequency, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, NOW())
        `, [
          targetId,
          p.name,
          slug,
          Boolean(p.isFree),
          Boolean(p.isDefault),
          p.monthlyPriceDollars || 0,
          p.annualPriceDollars || 0,
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
          Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.5-flash-lite'),
          JSON.stringify(p.features || []),
          p.tokenLimit || 50000,
          p.tokenReimburseFrequency || 'monthly'
        ]);
      }
    }

    return NextResponse.json({ success: true, message: 'Plans synchronized successfully in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
