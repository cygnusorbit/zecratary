import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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
        updated_at AS "updatedAt"
      FROM subscription_plans
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
    const body = await req.json();
    const plans = Array.isArray(body) ? body : (body.plans || body.packages || [body]);

    for (const p of plans) {
      if (!p) continue;
      const slug = (p.slug || p.id || p.name || 'plan').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
      const targetId = p.id || slug;
      const isDefault = slug === 'taster' || targetId === 'preset_taster';

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
          p.tokenReimburseFrequency || 'monthly'
        ]);
      }
    }

    return NextResponse.json({ success: true, message: 'Plans synchronized successfully in PostgreSQL.' });
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

    if (targetSlug) {
      await query('UPDATE payment_transactions SET plan_slug = NULL WHERE plan_slug = $1', [targetSlug]);
      await query("UPDATE users SET subscription_plan = 'taster' WHERE subscription_plan = $1", [targetSlug]);
    }
    if (targetId && targetId !== targetSlug) {
      await query('UPDATE payment_transactions SET plan_slug = NULL WHERE plan_slug = $1', [targetId]);
      await query("UPDATE users SET subscription_plan = 'taster' WHERE subscription_plan = $1", [targetId]);
    }

    await query(`
      DELETE FROM subscription_plans 
      WHERE id = $1 OR slug = $2 OR id = $3 OR slug = $4
    `, [targetId, targetSlug, targetSlug, targetId]);

    const dataPaths = [
      path.join(process.cwd(), 'apps/web/data', 'subscription_plans.json'),
      path.join(process.cwd(), 'apps/web/apps/web/data', 'subscription_plans.json'),
      path.join(process.cwd(), 'data', 'subscription_plans.json'),
      path.join(process.cwd(), 'apps/web/data', 'admin_settings.json'),
      path.join(process.cwd(), 'data', 'admin_settings.json')
    ];

    for (const p of dataPaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((item: any) => 
              item.id !== targetId && item.slug !== targetSlug && item.id !== targetSlug && item.slug !== targetId
            );
            fs.writeFileSync(p, JSON.stringify(filtered, null, 2), 'utf-8');
          } else if (parsed && Array.isArray(parsed.subscriptionPlans)) {
            parsed.subscriptionPlans = parsed.subscriptionPlans.filter((item: any) => 
              item.id !== targetId && item.slug !== targetSlug && item.id !== targetSlug && item.slug !== targetId
            );
            fs.writeFileSync(p, JSON.stringify(parsed, null, 2), 'utf-8');
          }
        } catch (_) {}
      }
    }

    const remaining = await query(`
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
        updated_at AS "updatedAt"
      FROM subscription_plans
      ORDER BY monthly_price_dollars ASC
    `);

    return NextResponse.json({
      success: true,
      message: 'Plan permanently deleted from PostgreSQL.',
      plans: remaining,
      packages: remaining
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
