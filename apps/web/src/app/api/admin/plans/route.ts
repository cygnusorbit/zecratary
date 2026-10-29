import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


// Helper to query PostgreSQL safely if available
async function getPgClient() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) return null;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const cleanConn = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: cleanConn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
    return await pool.connect();
  } catch (_) {
    return null;
  }
}

// Ensure schema self-healing non-blocking DDL
async function ensureSchema(client: any) {
  if (!client) return;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        badge VARCHAR(100) DEFAULT '',
        monthly_price NUMERIC(10, 2) DEFAULT 0,
        annual_price NUMERIC(10, 2) DEFAULT 0,
        monthly_price_dollars NUMERIC(10, 2) DEFAULT 0,
        annual_price_dollars NUMERIC(10, 2) DEFAULT 0,
        description_monthly TEXT DEFAULT '',
        description_annual TEXT DEFAULT '',
        tokens_monthly INT DEFAULT 0,
        tokens_annual INT DEFAULT 0,
        token_limit INT DEFAULT 0,
        max_saved_recipes INT DEFAULT 50,
        allowed_models JSONB DEFAULT '[]'::jsonb,
        features JSONB DEFAULT '[]'::jsonb,
        can_view_macros BOOLEAN DEFAULT FALSE,
        is_free BOOLEAN DEFAULT FALSE,
        is_default BOOLEAN DEFAULT FALSE,
        plan_group_id VARCHAR(100) DEFAULT '',
        monthly_plan_id VARCHAR(100) DEFAULT '',
        annual_plan_id VARCHAR(100) DEFAULT '',
        monthly_badge VARCHAR(100) DEFAULT '',
        annual_badge VARCHAR(100) DEFAULT '',
        trial_badge VARCHAR(100) DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_group_id VARCHAR(100) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_plan_id VARCHAR(100) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_plan_id VARCHAR(100) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_price_dollars NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_price_dollars NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_badge VARCHAR(100) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_badge VARCHAR(100) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_badge VARCHAR(100) DEFAULT '';
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS can_view_macros BOOLEAN DEFAULT FALSE;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS token_limit INT DEFAULT 0;
    `);
  } catch (err: any) {
    console.warn('Notice ensuring subscription_plans schema:', err.message);
  }
}

const DEFAULT_PLANS = [
  {
    id: 'preset_taster',
    name: 'Taster',
    slug: 'taster',
    badge: 'Free Tier',
    monthlyPriceDollars: 0,
    annualPriceDollars: 0,
    descriptionMonthly: 'Essential culinary companion for exploring AI recipes.',
    descriptionAnnual: 'Essential culinary companion for exploring AI recipes.',
    tokensMonthly: 25000,
    tokensAnnual: 25000,
    tokenLimit: 25000,
    maxSavedRecipes: 15,
    allowedModels: ['gemini-2.5-flash'],
    features: ['Basic AI Recipe Generation', 'Pantry Spoilage Alerts', 'Community Cookbooks Access'],
    canViewMacros: false,
    isFree: true,
    isDefault: true
  },
  {
    id: 'preset_nutrition_pro',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro',
    badge: 'Most Popular',
    monthlyPriceDollars: 8.99,
    annualPriceDollars: 59.99,
    descriptionMonthly: 'Advanced meal planning with macro telemetry and custom diets.',
    descriptionAnnual: 'Ultimate savings on personalized culinary formulation.',
    tokensMonthly: 250000,
    tokensAnnual: 3000000,
    tokenLimit: 250000,
    maxSavedRecipes: 250,
    allowedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-4o'],
    features: [
      'Everything in Taster',
      'Full Macronutrient Tracking (Macros)',
      'Automated Aisle Grocery Consolidation',
      'AI Smart Sub-Recipe Formulator'
    ],
    canViewMacros: true,
    isFree: false
  },
  {
    id: 'preset_executive_chef',
    name: 'Executive Chef',
    slug: 'executive-chef',
    badge: 'Best Value',
    monthlyPriceDollars: 19.99,
    annualPriceDollars: 149.99,
    descriptionMonthly: 'Unrestricted culinary power for chefs and nutritionists.',
    descriptionAnnual: 'VIP annual pass with maximum token allowances.',
    tokensMonthly: 1000000,
    tokensAnnual: 12000000,
    tokenLimit: 1000000,
    maxSavedRecipes: -1,
    allowedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-4o', 'claude-3-7-sonnet', 'deepseek-r1'],
    features: [
      'Everything in Nutrition Pro',
      'Unlimited Saved Recipes',
      'Priority High-Tier Model Access',
      'Custom Dietary Export to PDF & CSV',
      'Direct Concierge Culinary Advice'
    ],
    canViewMacros: true,
    isFree: false
  }
];

export async function GET() {
  const client = await getPgClient();
  try {
    if (client) {
      await ensureSchema(client);
      const res = await client.query('SELECT * FROM subscription_plans ORDER BY monthly_price_dollars ASC, monthly_price ASC');
      if (res.rows && res.rows.length > 0) {
        const plans = res.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          badge: r.badge || r.monthly_badge || '',
          monthlyPriceDollars: Number(r.monthly_price_dollars ?? r.monthly_price ?? 0),
          annualPriceDollars: Number(r.annual_price_dollars ?? r.annual_price ?? 0),
          descriptionMonthly: r.description_monthly || '',
          descriptionAnnual: r.description_annual || '',
          tokensMonthly: Number(r.tokens_monthly ?? r.token_limit ?? 0),
          tokensAnnual: Number(r.tokens_annual ?? (Number(r.tokens_monthly || 0) * 12)),
          tokenLimit: Number(r.tokens_monthly ?? r.token_limit ?? 0),
          maxSavedRecipes: Number(r.maxSaved_recipes ?? r.max_saved_recipes ?? 50),
          allowedModels: Array.isArray(r.allowed_models) ? r.allowed_models : (typeof r.allowed_models === 'string' ? JSON.parse(r.allowed_models) : ['gemini-2.5-flash']),
          features: Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? JSON.parse(r.features) : []),
          canViewMacros: Boolean(r.can_view_macros),
          isFree: Boolean(r.is_free || r.slug === 'taster'),
          isDefault: Boolean(r.is_default || r.slug === 'taster')
        }));
        return NextResponse.json({ success: true, plans, configs: plans });
      }
    }
  } catch (err: any) {
    console.warn('Notice reading subscription_plans from DB:', err.message);
  } finally {
    if (client) client.release();
  }

  // Fallback to JSON file or seeded default plans
  for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), p);
    if (fs.existsSync(full)) {
      try {
        const d = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (Array.isArray(d.subscriptionPlans) && d.subscriptionPlans.length > 0) {
          return NextResponse.json({ success: true, plans: d.subscriptionPlans, configs: d.subscriptionPlans });
        }
      } catch (_) {}
    }
  }

  return NextResponse.json({ success: true, plans: DEFAULT_PLANS, configs: DEFAULT_PLANS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'save_plan';
    const targetPlan = body.plan;
    const allPlans = body.plans || (targetPlan ? [targetPlan] : DEFAULT_PLANS);

    const client = await getPgClient();
    try {
      if (client) {
        await ensureSchema(client);
        for (const p of allPlans) {
          const cleanSlug = (p.slug || p.name || 'plan').toLowerCase().replace(/[^a-z0-9-]/g, '');
          const mPrice = Number(p.monthlyPriceDollars ?? p.monthly_price ?? 0);
          const aPrice = Number(p.annualPriceDollars ?? p.annual_price ?? 0);
          const tMonthly = Number(p.tokensMonthly ?? p.tokens_monthly ?? p.tokenLimit ?? 0);
          const tAnnual = Number(p.tokensAnnual ?? p.tokens_annual ?? (tMonthly * 12));
          const maxSaved = Number(p.maxSavedRecipes ?? p.max_saved_recipes ?? 50);
          const allowedModels = JSON.stringify(p.allowedModels || ['gemini-2.5-flash']);
          const features = JSON.stringify(p.features || []);
          const canViewMacros = Boolean(p.canViewMacros ?? p.can_view_macros);
          const isFree = Boolean(p.isFree ?? p.is_free ?? cleanSlug === 'taster');
          const isDefault = Boolean(p.isDefault ?? cleanSlug === 'taster');

          await client.query(`
            INSERT INTO subscription_plans (
              id, name, slug, badge, monthly_price, annual_price, monthly_price_dollars, annual_price_dollars,
              description_monthly, description_annual, tokens_monthly, tokens_annual, token_limit,
              max_saved_recipes, allowed_models, features, can_view_macros, is_free, is_default, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $5, $6, $7, $8, $9, $10, $9, $11, $12::jsonb, $13::jsonb, $14, $15, $16, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              slug = EXCLUDED.slug,
              badge = EXCLUDED.badge,
              monthly_price = EXCLUDED.monthly_price,
              annual_price = EXCLUDED.annual_price,
              monthly_price_dollars = EXCLUDED.monthly_price_dollars,
              annual_price_dollars = EXCLUDED.annual_price_dollars,
              description_monthly = EXCLUDED.description_monthly,
              description_annual = EXCLUDED.description_annual,
              tokens_monthly = EXCLUDED.tokens_monthly,
              tokens_annual = EXCLUDED.tokens_annual,
              token_limit = EXCLUDED.token_limit,
              max_saved_recipes = EXCLUDED.max_saved_recipes,
              allowed_models = EXCLUDED.allowed_models,
              features = EXCLUDED.features,
              can_view_macros = EXCLUDED.can_view_macros,
              is_free = EXCLUDED.is_free,
              is_default = EXCLUDED.is_default,
              updated_at = NOW();
          `, [
            p.id || ('plan_' + cleanSlug),
            p.name,
            cleanSlug,
            p.badge || '',
            mPrice,
            aPrice,
            p.descriptionMonthly || p.description_monthly || '',
            p.descriptionAnnual || p.description_annual || '',
            tMonthly,
            tAnnual,
            maxSaved,
            allowedModels,
            features,
            canViewMacros,
            isFree,
            isDefault
          ]);
        }
      }
    } finally {
      if (client) client.release();
    }

    // Persist to server JSON store
    for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const full = path.join(process.cwd(), p);
      if (fs.existsSync(full)) {
        try {
          const d = JSON.parse(fs.readFileSync(full, 'utf8'));
          d.subscriptionPlans = allPlans;
          fs.writeFileSync(full, JSON.stringify(d, null, 2), 'utf8');
        } catch (_) {}
      }
    }

    return NextResponse.json({ success: true, message: 'Plans synchronized successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!id && !slug) {
      return NextResponse.json({ success: false, error: 'Plan identifier is required.' }, { status: 400 });
    }

    if (slug === 'taster' || id === 'preset_taster') {
      return NextResponse.json({ success: false, error: 'Default free plan (taster) cannot be deleted.' }, { status: 400 });
    }

    const client = await getPgClient();
    try {
      if (client) {
        await ensureSchema(client);

        // 1. Reassign any active users on this plan to 'taster' to prevent FK / auth breaks
        if (slug) {
          await client.query("UPDATE users SET subscription_plan = 'taster' WHERE subscription_plan = $1", [slug]).catch(() => {});
          await client.query("UPDATE payment_transactions SET plan_slug = 'taster' WHERE plan_slug = $1", [slug]).catch(() => {});
        }

        // 2. Safely delete the subscription_plans record
        await client.query("DELETE FROM subscription_plans WHERE id = $1 OR slug = $2", [id || '', slug || '']);
      }
    } finally {
      if (client) client.release();
    }

    // 3. Clean from JSON stores to prevent resurrecting deleted plans
    for (const p of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
      const full = path.join(process.cwd(), p);
      if (fs.existsSync(full)) {
        try {
          const d = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (Array.isArray(d.subscriptionPlans)) {
            d.subscriptionPlans = d.subscriptionPlans.filter((x: any) => x.id !== id && x.slug !== slug);
            fs.writeFileSync(full, JSON.stringify(d, null, 2), 'utf8');
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({ success: true, message: 'Plan deleted and synchronized across database.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
