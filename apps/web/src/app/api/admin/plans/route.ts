import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Module-scoped row parser: accepts unconstrained any to avoid TS2339 'never' narrowing
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

async function ensureSubscriptionPlansSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        plan_group_id VARCHAR(255),
        monthly_plan_id VARCHAR(255),
        annual_plan_id VARCHAR(255),
        monthly_price_dollars NUMERIC(10,2) DEFAULT 0.00,
        annual_price_dollars NUMERIC(10,2) DEFAULT 0.00,
        monthly_badge VARCHAR(255) DEFAULT '',
        annual_badge VARCHAR(255) DEFAULT '',
        trial_badge VARCHAR(255) DEFAULT '',
        description_monthly TEXT DEFAULT '',
        description_annual TEXT DEFAULT '',
        features TEXT DEFAULT '[]',
        token_limit NUMERIC DEFAULT 500,
        is_free BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await query(`
      DO $$ 
      BEGIN 
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_group_id VARCHAR(255); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_plan_id VARCHAR(255); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_plan_id VARCHAR(255); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_price_dollars NUMERIC(10,2) DEFAULT 0.00; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_price_dollars NUMERIC(10,2) DEFAULT 0.00; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_badge VARCHAR(255) DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_badge VARCHAR(255) DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_badge VARCHAR(255) DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description_monthly TEXT DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description_annual TEXT DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features TEXT DEFAULT '[]'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS token_limit NUMERIC DEFAULT 500; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `).catch(() => {});
  } catch (_) {}
}

async function getExistingColumns(): Promise<Set<string>> {
  try {
    const res: any = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'subscription_plans'`
    );
    const rows = parseDbRows(res);
    return new Set(rows.map((r: any) => String(r.column_name).toLowerCase()));
  } catch (_) {
    return new Set();
  }
}

export async function GET() {
  try {
    await ensureSubscriptionPlansSchema();
    const cols = await getExistingColumns();

    await query(`
      DELETE FROM subscription_plans 
      WHERE (slug LIKE '%-monthly' OR slug LIKE '%-annual')
        AND EXISTS (
          SELECT 1 FROM subscription_plans b 
          WHERE b.slug = regexp_replace(subscription_plans.slug, '-(monthly|annual)$', '')
        )
    `).catch(() => {});

    const orderBy = cols.has('monthly_price_dollars') ? 'ORDER BY monthly_price_dollars ASC, id ASC' : 'ORDER BY id ASC';
    const res: any = await query(`SELECT * FROM subscription_plans ${orderBy}`).catch(() => []);

    let plans = parseDbRows(res);

    if (!plans.some((p: any) => p.slug === 'taster' || p.id === 'preset_taster')) {
      const defaultTasterData: Record<string, any> = {
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

      const insertKeys = Object.keys(defaultTasterData).filter(k => cols.has(k) || cols.size === 0);
      if (insertKeys.length > 0) {
        const colList = insertKeys.join(', ');
        const valPlaceholders = insertKeys.map((_, i) => `$${i + 1}`).join(', ');
        const values = insertKeys.map(k => defaultTasterData[k]);
        await query(
          `INSERT INTO subscription_plans (${colList}) VALUES (${valPlaceholders}) ON CONFLICT (id) DO NOTHING`,
          values
        ).catch(() => {});
      }

      plans.unshift(defaultTasterData);
    }

    const configs = plans.map((p: any) => {
      let feats: string[] = [];
      if (Array.isArray(p.features)) {
        feats = p.features.map(String).filter(Boolean);
      } else if (typeof p.features === 'string') {
        try {
          const parsed = JSON.parse(p.features);
          feats = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [p.features];
        } catch (_) {
          feats = p.features.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const cleanSlug = String(p.slug || p.id || 'plan').toLowerCase().trim();

      return {
        id: String(p.id || cleanSlug),
        name: String(p.name || cleanSlug),
        slug: cleanSlug,
        planGroupId: p.plan_group_id || p.planGroupId || `group_${cleanSlug}`,
        monthlyPlanId: p.monthly_plan_id || p.monthlyPlanId || `plan_${cleanSlug}_monthly`,
        annualPlanId: p.annual_plan_id || p.annualPlanId || `plan_${cleanSlug}_annual`,
        monthlyPriceDollars: Number(p.monthly_price_dollars ?? p.monthlyPriceDollars ?? 0),
        annualPriceDollars: Number(p.annual_price_dollars ?? p.annualPriceDollars ?? 0),
        monthlyBadge: p.monthly_badge || p.monthlyBadge || '',
        annualBadge: p.annual_badge || p.annualBadge || '',
        trialBadge: p.trial_badge || p.trialBadge || '',
        descriptionMonthly: p.description_monthly || p.descriptionMonthly || '',
        descriptionAnnual: p.description_annual || p.descriptionAnnual || '',
        features: feats,
        tokenLimit: Number(p.token_limit ?? p.tokenLimit ?? (cleanSlug === 'taster' ? 50000 : 500)),
        isFree: Boolean(p.is_free ?? p.isFree ?? (cleanSlug === 'taster')),
        isDefault: Boolean(p.is_default ?? p.isDefault ?? (cleanSlug === 'taster' || p.id === 'preset_taster'))
      };
    });

    return NextResponse.json({ success: true, configs, plans: configs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSubscriptionPlansSchema();
    const cols = await getExistingColumns();

    const p = await req.json();
    if (!p.name || !p.slug) {
      return NextResponse.json({ success: false, error: 'Plan name and slug are required' }, { status: 400 });
    }

    const rawSlug = String(p.slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanSlug = rawSlug.replace(/-(monthly|annual)$/, '') || rawSlug;
    const planId = String(p.id || (cleanSlug ? `plan_${cleanSlug}` : `plan_${Date.now()}`)).trim();
    const isFree = Boolean(p.isFree || cleanSlug === 'taster');
    const isDefault = Boolean(p.isDefault || planId === 'preset_taster' || cleanSlug === 'taster');

    let featuresJson = '[]';
    if (Array.isArray(p.features)) {
      featuresJson = JSON.stringify(p.features.map(String).filter(Boolean));
    } else if (typeof p.features === 'string') {
      try {
        const parsed = JSON.parse(p.features);
        featuresJson = JSON.stringify(Array.isArray(parsed) ? parsed : [p.features]);
      } catch (_) {
        featuresJson = JSON.stringify(p.features.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean));
      }
    }

    const planData: Record<string, any> = {
      id: planId,
      name: String(p.name).trim(),
      slug: cleanSlug,
      plan_group_id: String(p.planGroupId || `group_${cleanSlug}`).trim(),
      monthly_plan_id: String(p.monthlyPlanId || `plan_${cleanSlug}_monthly`).trim(),
      annual_plan_id: String(p.annualPlanId || `plan_${cleanSlug}_annual`).trim(),
      monthly_price_dollars: isFree ? 0 : Number(p.monthlyPriceDollars || 0),
      annual_price_dollars: isFree ? 0 : Number(p.annualPriceDollars || 0),
      monthly_badge: String(p.monthlyBadge || '').trim(),
      annual_badge: String(p.annualBadge || '').trim(),
      trial_badge: String(p.trialBadge || '').trim(),
      description_monthly: String(p.descriptionMonthly || '').trim(),
      description_annual: String(p.descriptionAnnual || '').trim(),
      features: featuresJson,
      token_limit: Number(p.tokenLimit || (isFree ? 50000 : 500)),
      is_free: isFree,
      is_default: isDefault
    };

    const existingCheck: any = await query(
      `SELECT id, slug FROM subscription_plans WHERE id = $1 OR slug = $2 LIMIT 1`,
      [planId, cleanSlug]
    ).catch(() => []);
    const existingRows = parseDbRows(existingCheck);

    if (existingRows.length > 0) {
      const targetId = existingRows[0]?.id || planId;
      const updateFields = Object.keys(planData)
        .filter(k => k !== 'id' && (cols.has(k) || cols.size === 0));

      const setClauses = updateFields.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const updateValues = updateFields.map(k => planData[k]);
      updateValues.push(targetId);

      await query(
        `UPDATE subscription_plans SET ${setClauses} WHERE id = $${updateValues.length}`,
        updateValues
      );
    } else {
      const insertFields = Object.keys(planData)
        .filter(k => cols.has(k) || cols.size === 0);

      const colList = insertFields.join(', ');
      const valPlaceholders = insertFields.map((_, i) => `$${i + 1}`).join(', ');
      const insertValues = insertFields.map(k => planData[k]);

      await query(
        `INSERT INTO subscription_plans (${colList}) VALUES (${valPlaceholders})`,
        insertValues
      );
    }

    return NextResponse.json({ success: true, message: 'Plan saved successfully in PostgreSQL' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSubscriptionPlansSchema();
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
      return NextResponse.json({ success: false, error: 'Default free plan (Taster) cannot be deleted' }, { status: 400 });
    }

    await query(
      `DELETE FROM subscription_plans WHERE id = $1 OR slug = $2`,
      [targetId || '', targetSlug || '']
    );

    return NextResponse.json({ success: true, message: 'Plan deleted successfully from PostgreSQL' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
