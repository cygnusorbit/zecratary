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
    // 1. Fetch system settings for dynamic currency
    const sysRes: any = await query(`
      SELECT currency, currency_symbol FROM system_settings LIMIT 1
    `).catch(() => null);
    const sysRow = Array.isArray(sysRes) ? sysRes[0] : sysRes?.rows?.[0];
    if (sysRow?.currency) currency = sysRow.currency;
    if (sysRow?.currency_symbol) currencySymbol = sysRow.currency_symbol;

    // 2. Fetch token settings
    const sRes: any = await query(`
      SELECT * FROM token_settings WHERE id::text = 'primary_settings' OR id::text = '1' OR id::text = 'current' LIMIT 1
    `).catch(() => null);

    const sRow = Array.isArray(sRes) ? sRes[0] : sRes?.rows?.[0];
    if (sRow) {
      settings = {
        tokenName: sRow.token_name || sRow.tokenName,
        tokenSymbol: sRow.token_symbol || sRow.tokenSymbol,
        startingBalance: sRow.starting_balance !== undefined ? sRow.starting_balance : sRow.startingBalance,
        isEnabled: sRow.is_enabled !== undefined ? sRow.is_enabled : sRow.isEnabled,
        importUrlCost: sRow.import_url_cost !== undefined ? sRow.import_url_cost : sRow.importUrlCost,
        importTextCost: sRow.import_text_cost !== undefined ? sRow.import_text_cost : sRow.importTextCost,
        importPhotoCost: sRow.import_photo_cost !== undefined ? sRow.import_photo_cost : sRow.importPhotoCost,
        aiChefCost: sRow.ai_chef_cost !== undefined ? sRow.ai_chef_cost : sRow.aiChefCost,
        mealPlannerCost: sRow.meal_planner_cost !== undefined ? sRow.meal_planner_cost : sRow.mealPlannerCost,
        macroAnalysisCost: sRow.macro_analysis_cost !== undefined ? sRow.macro_analysis_cost : sRow.macroAnalysisCost,
        packages: typeof sRow.packages === 'string' ? JSON.parse(sRow.packages) : sRow.packages,
        planAllocations: typeof sRow.plan_allocations === 'string' ? JSON.parse(sRow.plan_allocations) : (sRow.plan_allocations || {})
      };
    }

    // 3. Fetch subscription plans to synchronize quotas
    const pRes: any = await query(`
      SELECT id, name, slug, price, interval, token_limit
      FROM subscription_plans
      ORDER BY price ASC
    `).catch(() => null);
    if (pRes) {
      plans = Array.isArray(pRes) ? pRes : (pRes.rows || []);
    }

    // 4. Fetch recent transactions
    const txRes: any = await query(`
      SELECT id, user_email as customer_email, amount, balance_after, type, description, created_at
      FROM token_transactions ORDER BY created_at DESC LIMIT 100
    `).catch(() => null);
    if (txRes) {
      transactions = Array.isArray(txRes) ? txRes : (txRes.rows || []);
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
    const tSymbol = tokenSettings.tokenSymbol || '🪙';
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

      // 2. Bidirectional sync with subscription_plans.token_limit
      if (tokenSettings.planAllocations && typeof tokenSettings.planAllocations === 'object') {
        for (const [slug, limit] of Object.entries(tokenSettings.planAllocations)) {
          const numLimit = parseInt(String(limit), 10);
          if (!isNaN(numLimit)) {
            await query(`
              UPDATE subscription_plans
              SET token_limit = $1
              WHERE slug = $2 OR id::text = $2;
            `, [numLimit, slug]).catch(() => null);
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Token API] Database write error:', dbErr);
    }

    // 3. Persist to JSON store fallback
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
