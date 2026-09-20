import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { initTokenTables } from '@/lib/tokenService';

export const dynamic = 'force-dynamic';

async function initPlansTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        plan_group_id VARCHAR(100),
        monthly_plan_id VARCHAR(100),
        annual_plan_id VARCHAR(100),
        monthly_price_dollars NUMERIC(10, 2) DEFAULT 0,
        annual_price_dollars NUMERIC(10, 2) DEFAULT 0,
        monthly_badge VARCHAR(100) DEFAULT '',
        annual_badge VARCHAR(100) DEFAULT '',
        trial_badge VARCHAR(100) DEFAULT '',
        description_monthly TEXT,
        description_annual TEXT,
        features JSONB DEFAULT '[]'::jsonb,
        token_limit INTEGER DEFAULT 500,
        ai_recipe_limit INTEGER DEFAULT 50,
        recipe_library_limit INTEGER DEFAULT 250,
        social_scrape_limit INTEGER DEFAULT 20,
        can_view_macros BOOLEAN DEFAULT true,
        allowed_ai_models VARCHAR(255) DEFAULT 'gemini-1.5-flash,gpt-3.5-turbo',
        is_free BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS token_limit INTEGER DEFAULT 500;`);
  } catch (err) {
    console.warn('initPlansTable warning:', err);
  }
}

export async function GET() {
  try {
    await initPlansTable();
    try { await initTokenTables(); } catch (_) {}

    const rows = await query(`SELECT * FROM subscription_plans ORDER BY is_free DESC, monthly_price_dollars ASC`);
    const mapped = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      planGroupId: r.plan_group_id || `group_${r.slug}`,
      monthlyPlanId: r.monthly_plan_id || `plan_${r.slug}_monthly`,
      annualPlanId: r.annual_plan_id || `plan_${r.slug}_annual`,
      monthlyPriceDollars: Number(r.monthly_price_dollars ?? 0),
      annualPriceDollars: Number(r.annual_price_dollars ?? 0),
      monthlyBadge: r.monthly_badge || '',
      annualBadge: r.annual_badge || '',
      trialBadge: r.trial_badge || '',
      descriptionMonthly: r.description_monthly || '',
      descriptionAnnual: r.description_annual || '',
      features: Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? JSON.parse(r.features) : []),
      tokenLimit: Number(r.token_limit ?? 500),
      aiRecipeLimit: Number(r.ai_recipe_limit ?? 50),
      recipeLibraryLimit: Number(r.recipe_library_limit ?? 250),
      socialScrapeLimit: Number(r.social_scrape_limit ?? 20),
      canViewMacros: Boolean(r.can_view_macros),
      allowedAiModels: r.allowed_ai_models || 'gemini-1.5-flash,gpt-3.5-turbo',
      isFree: Boolean(r.is_free),
      isDefault: Boolean(r.is_default)
    }));

    return NextResponse.json({ success: true, configs: mapped }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initPlansTable();
    try { await initTokenTables(); } catch (_) {}
    const body = await req.json();

    const id = String(body.id || body.slug || `plan_${Date.now()}`).trim();
    const name = String(body.name || 'Custom Plan').trim();
    const slug = String(body.slug || id).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    const planGroupId = String(body.planGroupId || `group_${slug}`).trim();
    const monthlyPlanId = String(body.monthlyPlanId || `plan_${slug}_monthly`).trim();
    const annualPlanId = String(body.annualPlanId || `plan_${slug}_annual`).trim();

    const monthlyPrice = Number(body.monthlyPriceDollars || 0);
    const annualPrice = Number(body.annualPriceDollars || 0);
    const tokenLimit = Number(body.tokenLimit ?? 500);

    const isFree = Boolean(body.isFree || (monthlyPrice === 0 && annualPrice === 0));
    const features = JSON.stringify(Array.isArray(body.features) ? body.features : []);

    await query(`
      INSERT INTO subscription_plans (
        id, name, slug, plan_group_id, monthly_plan_id, annual_plan_id,
        monthly_price_dollars, annual_price_dollars, monthly_badge, annual_badge, trial_badge,
        description_monthly, description_annual, features, token_limit,
        ai_recipe_limit, recipe_library_limit, social_scrape_limit, can_view_macros,
        allowed_ai_models, is_free, is_default, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        plan_group_id = EXCLUDED.plan_group_id,
        monthly_plan_id = EXCLUDED.monthly_plan_id,
        annual_plan_id = EXCLUDED.annual_plan_id,
        monthly_price_dollars = EXCLUDED.monthly_price_dollars,
        annual_price_dollars = EXCLUDED.annual_price_dollars,
        monthly_badge = EXCLUDED.monthly_badge,
        annual_badge = EXCLUDED.annual_badge,
        trial_badge = EXCLUDED.trial_badge,
        description_monthly = EXCLUDED.description_monthly,
        description_annual = EXCLUDED.description_annual,
        features = EXCLUDED.features,
        token_limit = EXCLUDED.token_limit,
        ai_recipe_limit = EXCLUDED.ai_recipe_limit,
        recipe_library_limit = EXCLUDED.recipe_library_limit,
        social_scrape_limit = EXCLUDED.social_scrape_limit,
        can_view_macros = EXCLUDED.can_view_macros,
        allowed_ai_models = EXCLUDED.allowed_ai_models,
        is_free = EXCLUDED.is_free,
        is_default = EXCLUDED.is_default,
        updated_at = NOW();
    `, [
      id, name, slug, planGroupId, monthlyPlanId, annualPlanId,
      monthlyPrice, annualPrice, body.monthlyBadge || '', body.annualBadge || '', body.trialBadge || '',
      body.descriptionMonthly || '', body.descriptionAnnual || '', features, tokenLimit,
      body.aiRecipeLimit || 50, body.recipeLibraryLimit || 250, body.socialScrapeLimit || 20,
      Boolean(body.canViewMacros), body.allowedAiModels || 'gemini-1.5-flash,gpt-3.5-turbo',
      isFree, Boolean(body.isDefault)
    ]);

    // Synchronize plan allocation in token_settings
    try {
      await query(`
        UPDATE token_settings
        SET plan_allocations = jsonb_set(
          COALESCE(plan_allocations, '{}'::jsonb),
          ARRAY[$1],
          to_jsonb($2::int)
        )
        WHERE id = 'default_settings';
      `, [slug, tokenLimit]);
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Plan saved and synchronized successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initPlansTable();
    try { await initTokenTables(); } catch (_) {}

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

    // Guard against deleting the default Taster tier
    if (targetSlug === 'taster' || targetId === 'preset_taster' || targetId === 'taster') {
      return NextResponse.json({ success: false, error: 'Cannot delete the system default Taster plan.' }, { status: 400 });
    }

    // 1. Relational Safety: Reassign existing users to 'taster'
    if (targetSlug) {
      await query("UPDATE users SET subscription_plan = 'taster' WHERE subscription_plan = $1 OR subscription_plan LIKE $2", [targetSlug, `${targetSlug}-%`]);
      await query("UPDATE payment_transactions SET plan_slug = NULL WHERE plan_slug = $1 OR plan_slug LIKE $2", [targetSlug, `${targetSlug}-%`]);
    }
    if (targetId && targetId !== targetSlug) {
      await query("UPDATE users SET subscription_plan = 'taster' WHERE subscription_plan = $1", [targetId]);
      await query("UPDATE payment_transactions SET plan_slug = NULL WHERE plan_slug = $1", [targetId]);
    }

    // 2. Remove plan allocation from token_settings
    try {
      if (targetSlug) {
        await query(`
          UPDATE token_settings
          SET plan_allocations = plan_allocations - $1
          WHERE id = 'default_settings';
        `, [targetSlug]);
      }
    } catch (_) {}

    // 3. Delete row from subscription_plans in PostgreSQL
    await query(`
      DELETE FROM subscription_plans 
      WHERE id = $1 OR slug = $2 OR id = $3 OR slug = $4
    `, [targetId, targetSlug, targetSlug, targetId]);

    // 4. Return remaining plans directly from PostgreSQL
    const rows = await query(`SELECT * FROM subscription_plans ORDER BY is_free DESC, monthly_price_dollars ASC`);
    const mapped = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      planGroupId: r.plan_group_id || `group_${r.slug}`,
      monthlyPlanId: r.monthly_plan_id || `plan_${r.slug}_monthly`,
      annualPlanId: r.annual_plan_id || `plan_${r.slug}_annual`,
      monthlyPriceDollars: Number(r.monthly_price_dollars ?? 0),
      annualPriceDollars: Number(r.annual_price_dollars ?? 0),
      monthlyBadge: r.monthly_badge || '',
      annualBadge: r.annual_badge || '',
      trialBadge: r.trial_badge || '',
      descriptionMonthly: r.description_monthly || '',
      descriptionAnnual: r.description_annual || '',
      features: Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? JSON.parse(r.features) : []),
      tokenLimit: Number(r.token_limit ?? 500),
      aiRecipeLimit: Number(r.ai_recipe_limit ?? 50),
      recipeLibraryLimit: Number(r.recipe_library_limit ?? 250),
      socialScrapeLimit: Number(r.social_scrape_limit ?? 20),
      canViewMacros: Boolean(r.can_view_macros),
      allowedAiModels: r.allowed_ai_models || 'gemini-1.5-flash,gpt-3.5-turbo',
      isFree: Boolean(r.is_free),
      isDefault: Boolean(r.is_default)
    }));

    return NextResponse.json({
      success: true,
      message: 'Plan deleted successfully from PostgreSQL.',
      configs: mapped
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
