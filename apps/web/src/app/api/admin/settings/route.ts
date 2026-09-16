import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    let settings: any = {};

    if (rows.length > 0) {
      const r = rows[0];
      settings = {
        id: r.id,
        siteName: r.site_name || 'Zecratary',
        titlebarEmoji: r.titlebar_emoji || '🍳',
        titlebarImage: r.titlebar_image || '',
        faviconEmoji: r.favicon_emoji || '🍳',
        faviconImage: r.favicon_image || '',
        currency: r.currency || 'USD',
        aiProvider: r.ai_provider || 'gemini',
        aiModel: r.ai_model || 'gemini-3.5-flash-lite',
        themeColors: r.theme_colors || {},
        paymentSettings: r.payment_settings || {},
        socialLogin: r.social_login || {},
        chefAiSettings: r.chef_ai_settings || {},
        recipeTypes: r.recipe_types || [],
        ingredientCategories: r.ingredient_categories || [],
        supportedLanguages: r.supported_languages || [],
        updatedAt: r.updated_at
      };
    } else {
      await query(`
        INSERT INTO admin_settings (id, site_name, updated_at)
        VALUES ('primary_settings', 'Zecratary', NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      settings = {
        siteName: 'Zecratary',
        titlebarEmoji: '🍳',
        titlebarImage: '',
        faviconEmoji: '🍳',
        faviconImage: '',
        currency: 'USD',
        aiProvider: 'gemini',
        aiModel: 'gemini-3.5-flash-lite',
        themeColors: {},
        paymentSettings: {},
        socialLogin: {},
        chefAiSettings: {},
        recipeTypes: [],
        ingredientCategories: [],
        supportedLanguages: []
      };
    }

    const plans = await query(`
      SELECT 
        id, name, slug, is_free AS "isFree", is_default AS "isDefault",
        monthly_price_dollars AS "monthlyPriceDollars", annual_price_dollars AS "annualPriceDollars",
        monthly_badge AS "monthlyBadge", annual_badge AS "annualBadge", trial_badge AS "trialBadge",
        description_monthly AS "descriptionMonthly", description_annual AS "descriptionAnnual",
        button_text AS "buttonText", ai_recipe_limit AS "aiRecipeLimit",
        recipe_library_limit AS "recipeLibraryLimit", social_scrape_limit AS "socialScrapeLimit",
        can_view_macros AS "canViewMacros", allowed_ai_models AS "allowedAiModels",
        features, token_limit AS "tokenLimit", token_reimburse_frequency AS "tokenReimburseFrequency"
      FROM subscription_plans
      ORDER BY monthly_price_dollars ASC
    `);

    settings.subscriptionPlans = plans;

    return NextResponse.json(
      { success: true, settings },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.subscriptionPlans)) {
      for (const p of body.subscriptionPlans) {
        if (!p) continue;
        const slug = (p.slug || p.id || p.name || 'plan').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
        const targetId = p.id || slug;

        const exists = await query('SELECT id FROM subscription_plans WHERE slug = $1', [slug]);
        if (exists.length > 0) {
          await query(`
            UPDATE subscription_plans SET
              name = $1, is_free = $2, is_default = $3, monthly_price_dollars = $4, annual_price_dollars = $5,
              monthly_badge = $6, annual_badge = $7, trial_badge = $8, description_monthly = $9, description_annual = $10,
              button_text = $11, ai_recipe_limit = $12, recipe_library_limit = $13, social_scrape_limit = $14,
              can_view_macros = $15, allowed_ai_models = $16, features = $17::jsonb, token_limit = $18,
              token_reimburse_frequency = $19, updated_at = NOW()
            WHERE slug = $20
          `, [
            p.name, Boolean(p.isFree), Boolean(p.isDefault), p.monthlyPriceDollars || p.price || 0,
            p.annualPriceDollars || 0, p.monthlyBadge || '', p.annualBadge || '', p.trialBadge || '',
            p.descriptionMonthly || p.description || '', p.descriptionAnnual || '', p.buttonText || 'Choose Plan',
            p.aiRecipeLimit !== undefined ? p.aiRecipeLimit : 5, p.recipeLibraryLimit !== undefined ? p.recipeLibraryLimit : 25,
            p.socialScrapeLimit !== undefined ? p.socialScrapeLimit : 5, Boolean(p.canViewMacros),
            Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.5-flash-lite'),
            JSON.stringify(p.features || []), p.tokenLimit || 50000, p.tokenReimburseFrequency || 'monthly', slug
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
            targetId, p.name, slug, Boolean(p.isFree), Boolean(p.isDefault), p.monthlyPriceDollars || p.price || 0,
            p.annualPriceDollars || 0, p.monthlyBadge || '', p.annualBadge || '', p.trialBadge || '',
            p.descriptionMonthly || p.description || '', p.descriptionAnnual || '', p.buttonText || 'Choose Plan',
            p.aiRecipeLimit !== undefined ? p.aiRecipeLimit : 5, p.recipeLibraryLimit !== undefined ? p.recipeLibraryLimit : 25,
            p.socialScrapeLimit !== undefined ? p.socialScrapeLimit : 5, Boolean(p.canViewMacros),
            Array.isArray(p.allowedAiModels) ? p.allowedAiModels.join(',') : (p.allowedAiModels || 'gemini-3.5-flash-lite'),
            JSON.stringify(p.features || []), p.tokenLimit || 50000, p.tokenReimburseFrequency || 'monthly'
          ]);
        }
      }
    }

    const currentRows = await query('SELECT * FROM admin_settings WHERE id = $1', ['primary_settings']);
    const current = currentRows[0] || {};

    const siteName = body.siteName !== undefined ? body.siteName : (current.site_name || 'Zecratary');
    const titlebarEmoji = body.titlebarEmoji !== undefined ? body.titlebarEmoji : (current.titlebar_emoji || '🍳');
    const titlebarImage = body.titlebarImage !== undefined ? body.titlebarImage : (current.titlebar_image || '');
    const faviconEmoji = body.faviconEmoji !== undefined ? body.faviconEmoji : (current.favicon_emoji || '🍳');
    const faviconImage = body.faviconImage !== undefined ? body.faviconImage : (current.favicon_image || '');
    const currency = body.currency !== undefined ? body.currency : (current.currency || 'USD');
    const aiProvider = body.aiProvider !== undefined ? body.aiProvider : (current.ai_provider || 'gemini');
    const aiModel = body.aiModel !== undefined ? body.aiModel : (current.ai_model || 'gemini-3.5-flash-lite');

    const themeColors = body.themeColors !== undefined ? body.themeColors : (current.theme_colors || {});
    const paymentSettings = body.paymentSettings !== undefined ? body.paymentSettings : (current.payment_settings || {});
    const socialLogin = body.socialLogin !== undefined ? body.socialLogin : (current.social_login || {});
    const chefAiSettings = body.chefAiSettings !== undefined ? body.chefAiSettings : (current.chef_ai_settings || {});
    const recipeTypes = body.recipeTypes !== undefined ? body.recipeTypes : (current.recipe_types || []);
    const ingredientCategories = body.ingredientCategories !== undefined ? body.ingredientCategories : (current.ingredient_categories || []);
    const supportedLanguages = body.supportedLanguages !== undefined ? body.supportedLanguages : (current.supported_languages || []);

    await query(`
      INSERT INTO admin_settings (
        id, site_name, titlebar_emoji, titlebar_image, favicon_emoji, favicon_image,
        currency, ai_provider, ai_model, theme_colors, payment_settings, social_login,
        chef_ai_settings, recipe_types, ingredient_categories, supported_languages, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        site_name = EXCLUDED.site_name,
        titlebar_emoji = EXCLUDED.titlebar_emoji,
        titlebar_image = EXCLUDED.titlebar_image,
        favicon_emoji = EXCLUDED.favicon_emoji,
        favicon_image = EXCLUDED.favicon_image,
        currency = EXCLUDED.currency,
        ai_provider = EXCLUDED.ai_provider,
        ai_model = EXCLUDED.ai_model,
        theme_colors = EXCLUDED.theme_colors,
        payment_settings = EXCLUDED.payment_settings,
        social_login = EXCLUDED.social_login,
        chef_ai_settings = EXCLUDED.chef_ai_settings,
        recipe_types = EXCLUDED.recipe_types,
        ingredient_categories = EXCLUDED.ingredient_categories,
        supported_languages = EXCLUDED.supported_languages,
        updated_at = NOW();
    `, [
      'primary_settings', siteName, titlebarEmoji, titlebarImage, faviconEmoji, faviconImage,
      currency, aiProvider, aiModel, JSON.stringify(themeColors), JSON.stringify(paymentSettings),
      JSON.stringify(socialLogin), JSON.stringify(chefAiSettings), JSON.stringify(recipeTypes),
      JSON.stringify(ingredientCategories), JSON.stringify(supportedLanguages)
    ]);

    return NextResponse.json({ success: true, message: 'Settings saved directly to PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
