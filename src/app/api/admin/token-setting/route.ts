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

  try {
    const sRes: any = await Promise.race([
      query(`
        SELECT * FROM token_settings WHERE id::text = 'primary_settings' OR id::text = '1' LIMIT 1
      `),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    const sRow = (Array.isArray(sRes) ? sRes[0] : (sRes as any)?.rows?.[0]);
    if (sRow) {
      settings = {
        tokenName: sRow.token_name || sRow.tokenName,
        tokenSymbol: sRow.token_symbol, tokenEmoji: sRow.token_symbol, tokenIcon: sRow.token_symbol || sRow.tokenSymbol,
        startingBalance: sRow.starting_balance !== undefined ? sRow.starting_balance : sRow.startingBalance,
        isEnabled: sRow.is_enabled !== undefined ? sRow.is_enabled : sRow.isEnabled,
        importUrlCost: sRow.import_url_cost !== undefined ? sRow.import_url_cost : sRow.importUrlCost,
        importTextCost: sRow.import_text_cost !== undefined ? sRow.import_text_cost : sRow.importTextCost,
        importPhotoCost: sRow.import_photo_cost !== undefined ? sRow.import_photo_cost : sRow.importPhotoCost,
        aiChefCost: sRow.ai_chef_cost !== undefined ? sRow.ai_chef_cost : sRow.aiChefCost,
        mealPlannerCost: sRow.meal_planner_cost !== undefined ? sRow.meal_planner_cost : sRow.mealPlannerCost,
        macroAnalysisCost: sRow.macro_analysis_cost !== undefined ? sRow.macro_analysis_cost : sRow.macroAnalysisCost,
        packages: typeof sRow.packages === 'string' ? JSON.parse(sRow.packages) : sRow.packages
      };
    }

    // Fetch recent audit transactions
    const txRes: any = await Promise.race([
      query(`
        SELECT id, user_email as customer_email, amount, balance_after, type, description, created_at
        FROM token_transactions ORDER BY created_at DESC LIMIT 50
      `),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
    ]).catch(() => null);

    if (txRes) {
      transactions = (Array.isArray(txRes) ? txRes : (((txRes as any)?.rows) || []));
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
    tokenSymbol: finalConfig.tokenSymbol, tokenEmoji: finalConfig.tokenSymbol, tokenIcon: finalConfig.tokenSymbol,
    tokenName: finalConfig.tokenName,
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

    // 1. Persist to PostgreSQL token_settings
    try {
      await query(`
        INSERT INTO token_settings (
          id, token_name, token_symbol, starting_balance, is_enabled,
          import_url_cost, import_text_cost, import_photo_cost,
          ai_chef_cost, meal_planner_cost, macro_analysis_cost,
          packages, updated_at
        )
        VALUES ('primary_settings', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
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
          updated_at = NOW();
      `, [tName, tSymbol, sBalance, isEn, cUrl, cText, cPhoto, cChef, cPlan, cMacro, pkgs]);
    } catch (_) {}

    // 2. Persist to JSON store mirror
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'admin_settings.json');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      let existing: any = {};
      if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
      }
      existing.tokenSettings = tokenSettings;
      existing.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Token system configurations saved successfully!',
      tokenSettings
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
