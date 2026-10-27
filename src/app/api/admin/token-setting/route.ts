import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readServerTokenFallback(): any {
  const candidatePaths = [
    path.join(process.cwd(), 'apps/web/data/admin_settings.json'),
    path.join(process.cwd(), 'data/admin_settings.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.tokenSettings || parsed?.token_settings) {
          return parsed.tokenSettings || parsed.token_settings;
        }
      } catch (_) {}
    }
  }
  return null;
}

export async function GET() {
  let settings: any = readServerTokenFallback();
  let transactions: any[] = [];
  let plans: any[] = [];
  let currency = 'USD';
  let currencySymbol = '$';

  try {
    // 1. Fetch system currency adaptively from admin_settings without strict column locks
    const adminRes: any = await query(`
      SELECT * FROM admin_settings WHERE id::text = 'primary_settings' OR id::text = '1' OR id::text = 'current' LIMIT 1
    `).catch(() => null);

    const adminRow = Array.isArray(adminRes) ? adminRes[0] : (adminRes as any)?.rows?.[0];
    if (adminRow) {
      if (adminRow.currency) currency = adminRow.currency;
      if (adminRow.currency_symbol) currencySymbol = adminRow.currency_symbol;
      
      if (adminRow.settings && typeof adminRow.settings === 'object') {
        if (adminRow.settings.currency) currency = adminRow.settings.currency;
        if (adminRow.settings.currencySymbol) currencySymbol = adminRow.settings.currencySymbol;
      }

      if (adminRow.currencies) {
        try {
          const currList = typeof adminRow.currencies === 'string' ? JSON.parse(adminRow.currencies) : adminRow.currencies;
          if (Array.isArray(currList)) {
            const defCurr = currList.find((c: any) => c.is_default || c.isDefault || c.active);
            if (defCurr) {
              if (defCurr.code) currency = defCurr.code;
              if (defCurr.symbol) currencySymbol = defCurr.symbol;
            }
          }
        } catch (_) {}
      }
    }

    // 2. Fetch token settings
    const sRes: any = await query(`
      SELECT * FROM token_settings WHERE id::text = 'primary_settings' OR id::text = '1' OR id::text = 'current' LIMIT 1
    `).catch(() => null);

    const sRow = Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0];
    if (sRow) {
      settings = {
        tokenName: sRow.token_name || sRow.tokenName || 'Foodie Token',
        tokenSymbol: sRow.token_symbol || sRow.tokenSymbol || '🪙',
        startingBalance: sRow.starting_balance !== undefined ? sRow.starting_balance : (sRow.startingBalance ?? 100),
        isEnabled: sRow.is_enabled !== undefined ? Boolean(sRow.is_enabled) : (sRow.isEnabled !== undefined ? Boolean(sRow.isEnabled) : true),
        importUrlCost: sRow.import_url_cost !== undefined ? sRow.import_url_cost : (sRow.importUrlCost ?? 5),
        importTextCost: sRow.import_text_cost !== undefined ? sRow.import_text_cost : (sRow.importTextCost ?? 2),
        importPhotoCost: sRow.import_photo_cost !== undefined ? sRow.import_photo_cost : (sRow.importPhotoCost ?? 10),
        aiChefCost: sRow.ai_chef_cost !== undefined ? sRow.ai_chef_cost : (sRow.aiChefCost ?? 2),
        mealPlannerCost: sRow.meal_planner_cost !== undefined ? sRow.meal_planner_cost : (sRow.mealPlannerCost ?? 5),
        macroAnalysisCost: sRow.macro_analysis_cost !== undefined ? sRow.macro_analysis_cost : (sRow.macroAnalysisCost ?? 3),
        packages: typeof sRow.packages === 'string' ? JSON.parse(sRow.packages) : (sRow.packages || []),
        planAllocations: typeof sRow.plan_allocations === 'string' ? JSON.parse(sRow.plan_allocations) : (sRow.plan_allocations || {})
      };
    }

    // 3. Fetch subscription plans using SELECT * (immune to missing column errors)
    const pRes: any = await query(`
      SELECT * FROM subscription_plans
    `).catch(() => null);

    if (pRes) {
      const rawPlans = Array.isArray(pRes) ? pRes : ((pRes as any)?.rows || []);
      plans = rawPlans.map((p: any) => ({
        id: p.id || p.slug,
        name: p.name || 'Plan',
        slug: p.slug || p.id,
        price: Number(p.price ?? p.monthly_price_dollars ?? p.price_monthly ?? p.price_dollars ?? 0),
        interval: p.interval || p.billing_cycle || 'month',
        token_limit: Number(p.token_limit ?? p.monthly_tokens ?? settings?.planAllocations?.[p.slug] ?? 500)
      }));

      // Sort plans ascending by price in JavaScript
      plans.sort((a, b) => a.price - b.price);
    }

    // 4. Fetch recent transactions and normalize description emojis
    const txRes: any = await query(`
      SELECT id, user_email as customer_email, amount, balance_after, type, description, created_at
      FROM token_transactions ORDER BY created_at DESC LIMIT 100
    `).catch(() => null);

    if (txRes) {
      const rawTx = Array.isArray(txRes) ? txRes : ((txRes as any)?.rows || []);
      const activeSym = settings?.tokenSymbol || '🪙';
      transactions = rawTx.map((tx: any) => {
        if (!tx.description) return tx;
        let d = String(tx.description).replace(/🪙/g, activeSym);
        d = d.replace(/(\([+-]?[\d,]+(?:\.\d+)?\s*)([^\w\s\)]+)(\))/g, `$1${activeSym}$3`);
        d = d.replace(/(\([+-]?[\d,]+(?:\.\d+)?\))(?!\s*[^\w\s\)])/g, (m: string) => m.slice(0, -1) + ` ${activeSym})`);
        return { ...tx, description: d };
      });
    }
  } catch (err: any) {
    console.warn('[Token API] Fallback to server JSON store:', err?.message || err);
  }

  const defaultTokenSettings = {
    tokenName: 'Foodie Token',
    tokenSymbol: '🪙',
    startingBalance: 100,
    isEnabled: true,
    importUrlCost: 5,
    importTextCost: 2,
    importPhotoCost: 10,
    aiChefCost: 2,
    mealPlannerCost: 5,
    macroAnalysisCost: 3,
    planAllocations: {
      'free': 50,
      'nutrition-pro': 750,
      'vip-chef': 3000
    },
    packages: [
      { id: 'pkg_starter', name: 'Starter Spark', tokenAmount: 250, priceDollars: 4.99, badge: 'Popular', bonusTokens: 0, isPopular: true },
      { id: 'pkg_chef', name: 'Culinary Master', tokenAmount: 1000, priceDollars: 14.99, badge: 'Best Value', bonusTokens: 150, isPopular: false },
      { id: 'pkg_executive', name: 'Kitchen Enterprise', tokenAmount: 5000, priceDollars: 49.99, badge: 'VIP', bonusTokens: 1000, isPopular: false }
    ]
  };

  const finalConfig = settings ? { ...defaultTokenSettings, ...settings } : defaultTokenSettings;

  return NextResponse.json({
    success: true,
    tokenSettings: finalConfig,
    settings: finalConfig,
    currency,
    currencySymbol,
    plans,
    transactions
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tokenSettings = body.tokenSettings || body.settings || body;

    const tName = tokenSettings.tokenName || 'Foodie Token';
    const tSymbol = (tokenSettings.tokenSymbol || '🪙').trim();
    const sBalance = parseInt(tokenSettings.startingBalance, 10) || 100;
    const isEn = tokenSettings.isEnabled !== undefined ? Boolean(tokenSettings.isEnabled) : true;
    const cUrl = parseInt(tokenSettings.importUrlCost, 10) || 5;
    const cText = parseInt(tokenSettings.importTextCost, 10) || 2;
    const cPhoto = parseInt(tokenSettings.importPhotoCost, 10) || 10;
    const cChef = parseInt(tokenSettings.aiChefCost, 10) || 2;
    const cPlan = parseInt(tokenSettings.mealPlannerCost, 10) || 5;
    const cMacro = parseInt(tokenSettings.macroAnalysisCost, 10) || 3;
    const pkgs = JSON.stringify(tokenSettings.packages || []);
    const pAlloc = JSON.stringify(tokenSettings.planAllocations || {});

    // 1. Persist to PostgreSQL token_settings
    try {
      await query(`
        INSERT INTO token_settings (
          id, token_name, token_symbol, starting_balance, is_enabled,
          import_url_cost, import_text_cost, import_photo_cost,
          ai_chef_cost, meal_planner_cost, macro_analysis_cost,
          packages, plan_allocations, updated_at
        )
        VALUES ('primary_settings', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          token_name = EXCLUDED.token_name,
          token_symbol = EXCLUDED.token_symbol,
          starting_balance = EXCLUDED.starting_balance,
          is_enabled = EXCLUDED.is_enabled,
          import_url_cost = EXCLUDED.import_url_cost,
          import_text_cost = EXCLUDED.import_text_cost,
          import_photo_cost = EXCLUDED.import_photo_cost,
          ai_chef_cost = EXCLUDED.ai_chef_cost,
          meal_planner_cost = EXCLUDED.meal_planner_cost,
          macro_analysis_cost = EXCLUDED.macro_analysis_cost,
          packages = EXCLUDED.packages,
          plan_allocations = EXCLUDED.plan_allocations,
          updated_at = NOW();
      `, [tName, tSymbol, sBalance, isEn, cUrl, cText, cPhoto, cChef, cPlan, cMacro, pkgs, pAlloc]);

      // 2. Bidirectional sync with subscription_plans (token_limit and monthly_tokens)
      if (tokenSettings.planAllocations && typeof tokenSettings.planAllocations === 'object') {
        for (const [slug, limit] of Object.entries(tokenSettings.planAllocations)) {
          const numLimit = parseInt(String(limit), 10);
          if (!isNaN(numLimit)) {
            await query(`
              UPDATE subscription_plans
              SET token_limit = $1, monthly_tokens = $1
              WHERE slug = $2 OR id::text = $2;
            `, [numLimit, slug]).catch(() => null);
          }
        }
      }

      // 3. Persist active symbol into historical token_transactions
      if (tSymbol && !tSymbol.startsWith('http')) {
        await query(`
          UPDATE token_transactions 
          SET description = REPLACE(description, '🪙', $1)
          WHERE description LIKE '%🪙%';
        `, [tSymbol]).catch(() => null);
      }
    } catch (dbErr: any) {
      console.warn('[Token API] Database write error:', dbErr?.message || dbErr);
    }

    // 4. Persist to server JSON store fallback
    try {
      for (const relP of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
        const fullP = path.join(process.cwd(), relP);
        if (!fs.existsSync(path.dirname(fullP))) fs.mkdirSync(path.dirname(fullP), { recursive: true });
        let existing: any = {};
        if (fs.existsSync(fullP)) {
          try { existing = JSON.parse(fs.readFileSync(fullP, 'utf8')); } catch (_) {}
        }
        existing.tokenSettings = tokenSettings;
        existing.updatedAt = new Date().toISOString();
        fs.writeFileSync(fullP, JSON.stringify(existing, null, 2), 'utf8');
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Token configurations saved and synchronized successfully!',
      tokenSettings
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await query(`DELETE FROM token_transactions;`).catch(() => null);
    return NextResponse.json({ success: true, message: 'Audit ledger cleared.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
