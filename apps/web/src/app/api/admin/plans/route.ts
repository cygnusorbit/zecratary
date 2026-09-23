import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Safe, non-blocking migration to add columns if possible without throwing
    await query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `).catch(() => {});

    // 2. Clean up any rogue duplicate plans auto-created with -monthly or -annual suffixes
    await query(`
      DELETE FROM subscription_plans 
      WHERE (slug LIKE '%-monthly' OR slug LIKE '%-annual')
        AND EXISTS (
          SELECT 1 FROM subscription_plans b 
          WHERE b.slug = regexp_replace(subscription_plans.slug, '-(monthly|annual)$', '')
        )
    `).catch(() => {});

    // 3. Query plans from subscription_plans table (Order by monthly_price_dollars and id, NEVER created_at)
    const res = await query(
      `SELECT * FROM subscription_plans ORDER BY monthly_price_dollars ASC, id ASC`
    ).catch(() => ({ rows: [] }));

    let plans = Array.isArray(res) ? res : (res?.rows || []);

    // 4. Ensure default free plan (taster) exists
    if (!plans.some((p: any) => p.slug === 'taster' || p.id === 'preset_taster')) {
      const defaultTaster = {
        id: 'preset_taster',
        name: 'Taster',
        slug: 'taster',
        plan_group_id: 'group_taster',
        monthly_plan_id: 'plan_taster_monthly',
        annual_plan_id: 'plan_taster_annual',
        monthly_price_dollars: 0,
        annual_price_dollars: 0,
        monthly_badge: '',
        annual_badge: '',
        trial_badge: '',
        description_monthly: 'Free tier with standard features',
        description_annual: 'Free tier with standard features',
        features: JSON.stringify([
          'Create up to 5 AI-powered recipes per month',
          'Personal recipe library (25 total recipes)',
          'Smart ingredient repurposing',
          'Automated shopping list creation',
          'Direct online grocery shopping links',
          'Meal planner',
          'Ingredient photo recognition'
        ]),
        token_limit: 50000,
        is_free: true,
        is_default: true
      };

      await query(
        `INSERT INTO subscription_plans (
          id, name, slug, plan_group_id, monthly_plan_id, annual_plan_id,
          monthly_price_dollars, annual_price_dollars, monthly_badge, annual_badge,
          trial_badge, description_monthly, description_annual, features,
          token_limit, is_free, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO NOTHING`,
        [
          defaultTaster.id, defaultTaster.name, defaultTaster.slug, defaultTaster.plan_group_id,
          defaultTaster.monthly_plan_id, defaultTaster.annual_plan_id, defaultTaster.monthly_price_dollars,
          defaultTaster.annual_price_dollars, defaultTaster.monthly_badge, defaultTaster.annual_badge,
          defaultTaster.trial_badge, defaultTaster.description_monthly, defaultTaster.description_annual,
          defaultTaster.features, defaultTaster.token_limit, defaultTaster.is_free, defaultTaster.is_default
        ]
      ).catch(() => {});

      plans.unshift(defaultTaster);
    }

    const configs = plans.map((p: any) => {
      let feats: string[] = [];
      if (Array.isArray(p.features)) {
        feats = p.features;
      } else if (typeof p.features === 'string') {
        try {
          const parsed = JSON.parse(p.features);
          feats = Array.isArray(parsed) ? parsed : [p.features];
        } catch (_) {
          feats = p.features.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
        }
      }

      return {
        id: p.id || p.slug,
        name: p.name,
        slug: p.slug,
        planGroupId: p.plan_group_id || p.planGroupId || `group_${p.slug}`,
        monthlyPlanId: p.monthly_plan_id || p.monthlyPlanId || `plan_${p.slug}_monthly`,
        annualPlanId: p.annual_plan_id || p.annualPlanId || `plan_${p.slug}_annual`,
        monthlyPriceDollars: Number(p.monthly_price_dollars ?? p.monthlyPriceDollars ?? 0),
        annualPriceDollars: Number(p.annual_price_dollars ?? p.annualPriceDollars ?? 0),
        monthlyBadge: p.monthly_badge || p.monthlyBadge || '',
        annualBadge: p.annual_badge || p.annualBadge || '',
        trialBadge: p.trial_badge || p.trialBadge || '',
        descriptionMonthly: p.description_monthly || p.descriptionMonthly || '',
        descriptionAnnual: p.description_annual || p.descriptionAnnual || '',
        features: feats,
        tokenLimit: Number(p.token_limit ?? p.tokenLimit ?? 500),
        isFree: Boolean(p.is_free ?? p.isFree ?? (p.slug === 'taster')),
        isDefault: Boolean(p.is_default ?? p.isDefault ?? (p.slug === 'taster'))
      };
    });

    return NextResponse.json({ success: true, configs, plans: configs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const p = await req.json();
    if (!p.name || !p.slug) {
      return NextResponse.json({ success: false, error: 'Plan name and slug are required' }, { status: 400 });
    }

    const cleanSlug = p.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const planId = p.id || (cleanSlug ? `plan_${cleanSlug}` : `plan_${Date.now()}`);
    const isFree = Boolean(p.isFree || cleanSlug === 'taster');

    const featuresJson = JSON.stringify(Array.isArray(p.features) ? p.features : []);

    await query(
      `INSERT INTO subscription_plans (
        id, name, slug, plan_group_id, monthly_plan_id, annual_plan_id,
        monthly_price_dollars, annual_price_dollars, monthly_badge, annual_badge,
        trial_badge, description_monthly, description_annual, features,
        token_limit, is_free, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        is_free = EXCLUDED.is_free,
        is_default = EXCLUDED.is_default`,
      [
        planId,
        p.name.trim(),
        cleanSlug,
        p.planGroupId || `group_${cleanSlug}`,
        p.monthlyPlanId || `plan_${cleanSlug}_monthly`,
        p.annualPlanId || `plan_${cleanSlug}_annual`,
        isFree ? 0 : Number(p.monthlyPriceDollars || 0),
        isFree ? 0 : Number(p.annualPriceDollars || 0),
        p.monthlyBadge || '',
        p.annualBadge || '',
        p.trialBadge || '',
        p.descriptionMonthly || '',
        p.descriptionAnnual || '',
        featuresJson,
        Number(p.tokenLimit || 0),
        isFree,
        Boolean(p.isDefault || cleanSlug === 'taster')
      ]
    );

    return NextResponse.json({ success: true, message: 'Plan saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');

    const body = await req.json().catch(() => ({}));
    const targetId = id || body.id;
    const targetSlug = slug || body.slug;

    if (!targetId && !targetSlug) {
      return NextResponse.json({ success: false, error: 'Plan identifier required' }, { status: 400 });
    }

    if (targetSlug === 'taster' || targetId === 'preset_taster') {
      return NextResponse.json({ success: false, error: 'Default free plan cannot be deleted' }, { status: 400 });
    }

    await query(
      `DELETE FROM subscription_plans WHERE id = $1 OR slug = $2`,
      [targetId || '', targetSlug || '']
    );

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
