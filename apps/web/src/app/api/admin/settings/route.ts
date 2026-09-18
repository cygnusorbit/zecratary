import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function ensureAdminSettingsSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
        site_name VARCHAR(255) DEFAULT 'Zecratary',
        titlebar_emoji VARCHAR(32) DEFAULT '🍳',
        titlebar_image TEXT DEFAULT '',
        favicon_emoji VARCHAR(32) DEFAULT '🍳',
        favicon_image TEXT DEFAULT '',
        currency VARCHAR(10) DEFAULT 'USD',
        ai_provider VARCHAR(64) DEFAULT 'gemini',
        ai_model VARCHAR(128) DEFAULT 'gemini-3.5-flash-lite',
        theme_colors JSONB DEFAULT '{}'::jsonb,
        font_family VARCHAR(255) DEFAULT 'Inter',
        font_size VARCHAR(50) DEFAULT '16px',
        letter_spacing VARCHAR(50) DEFAULT '0em',
        payment_settings JSONB DEFAULT '{}'::jsonb,
        social_login JSONB DEFAULT '{}'::jsonb,
        chef_ai_settings JSONB DEFAULT '{}'::jsonb,
        recipe_types JSONB DEFAULT '[]'::jsonb,
        ingredient_categories JSONB DEFAULT '[]'::jsonb,
        supported_languages JSONB DEFAULT '[]'::jsonb,
        subscription_plans JSONB DEFAULT '[]'::jsonb,
        value JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS titlebar_image TEXT DEFAULT '';`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS favicon_image TEXT DEFAULT '';`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme_colors JSONB DEFAULT '{}'::jsonb;`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS font_family VARCHAR(255) DEFAULT 'Inter';`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS font_size VARCHAR(50) DEFAULT '16px';`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS letter_spacing VARCHAR(50) DEFAULT '0em';`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS subscription_plans JSONB DEFAULT '[]'::jsonb;`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB DEFAULT '{}'::jsonb;`);
    await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100);`);

    const existing = await query(`SELECT id FROM admin_settings LIMIT 1;`);
    if (existing.length === 0) {
      await query(`
        INSERT INTO admin_settings (id, site_name, titlebar_emoji, favicon_emoji, font_family, font_size, letter_spacing)
        VALUES ('primary_settings', 'Zecratary', '🍳', '🍳', 'Inter', '16px', '0em')
        ON CONFLICT DO NOTHING;
      `);
    }
  } catch (err) {
    console.error('[AdminSettings API] Error ensuring schema:', err);
  }
}

export async function GET() {
  try {
    await ensureAdminSettingsSchema();
    const rows = await query('SELECT * FROM admin_settings LIMIT 1');
    const data = rows[0] || {};
    const themeColors = data.theme_colors || {};

    const settings = {
      siteName: data.site_name || 'Zecratary',
      titlebarEmoji: data.titlebar_emoji || '🍳',
      titlebarImage: data.titlebar_image || '',
      faviconEmoji: data.favicon_emoji || '🍳',
      faviconImage: data.favicon_image || '',
      themeColors: themeColors,
      theme_colors: themeColors,
      fontFamily: data.font_family || 'Inter',
      font_family: data.font_family || 'Inter',
      fontSize: data.font_size || '16px',
      font_size: data.font_size || '16px',
      fontLetterSpacing: data.letter_spacing || '0em',
      letter_spacing: data.letter_spacing || '0em',
      currency: data.currency || 'USD',
      aiProvider: data.ai_provider || 'gemini',
      aiModel: data.ai_model || 'gemini-3.5-flash-lite',
      chefAiSettings: data.chef_ai_settings || {},
      recipeTypes: data.recipe_types || [],
      ingredientCategories: data.ingredient_categories || [],
      supportedLanguages: data.supported_languages || [],
      subscriptionPlans: data.subscription_plans || [],
      updatedAt: data.updated_at
    };

    return NextResponse.json({
      success: true,
      settings,
      ...settings
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[AdminSettings API GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureAdminSettingsSchema();

    const body = await req.json();
    const existing = await query('SELECT * FROM admin_settings LIMIT 1');
    const targetId = existing.length > 0 && existing[0].id !== undefined ? existing[0].id : 'primary_settings';
    const current = existing[0] || {};

    const siteName = body.siteName !== undefined ? body.siteName : (current.site_name || 'Zecratary');
    const titlebarEmoji = body.titlebarEmoji !== undefined ? body.titlebarEmoji : (current.titlebar_emoji || '🍳');
    const titlebarImage = body.titlebarImage !== undefined ? body.titlebarImage : (current.titlebar_image || '');
    const faviconEmoji = body.faviconEmoji !== undefined ? body.faviconEmoji : (current.favicon_emoji || '🍳');
    const faviconImage = body.faviconImage !== undefined ? body.faviconImage : (current.favicon_image || '');
    
    const themeColors = body.themeColors || body.theme_colors || current.theme_colors || {};
    const fontFamily = body.fontFamily || body.font_family || current.font_family || 'Inter';
    const fontSize = body.fontSize || body.font_size || current.font_size || '16px';
    const letterSpacing = body.fontLetterSpacing || body.letter_spacing || current.letter_spacing || '0em';

    const updateRes = await query(`
      UPDATE admin_settings SET
        site_name = $1,
        titlebar_emoji = $2,
        titlebar_image = $3,
        favicon_emoji = $4,
        favicon_image = $5,
        theme_colors = $6::jsonb,
        font_family = $7,
        font_size = $8,
        letter_spacing = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `, [
      siteName,
      titlebarEmoji,
      titlebarImage,
      faviconEmoji,
      faviconImage,
      JSON.stringify(themeColors),
      fontFamily,
      fontSize,
      letterSpacing,
      targetId
    ]);

    let updatedRow = updateRes[0];

    if (!updatedRow) {
      const insertRes = await query(`
        INSERT INTO admin_settings (
          id, site_name, titlebar_emoji, titlebar_image, favicon_emoji, favicon_image,
          theme_colors, font_family, font_size, letter_spacing, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, CURRENT_TIMESTAMP
        )
        RETURNING *;
      `, [
        targetId,
        siteName,
        titlebarEmoji,
        titlebarImage,
        faviconEmoji,
        faviconImage,
        JSON.stringify(themeColors),
        fontFamily,
        fontSize,
        letterSpacing
      ]);
      updatedRow = insertRes[0] || {};
    }

    const responsePayload = {
      siteName: updatedRow.site_name,
      titlebarEmoji: updatedRow.titlebar_emoji,
      titlebarImage: updatedRow.titlebar_image,
      faviconEmoji: updatedRow.favicon_emoji,
      faviconImage: updatedRow.favicon_image,
      themeColors: updatedRow.theme_colors,
      fontFamily: updatedRow.font_family,
      fontSize: updatedRow.font_size,
      fontLetterSpacing: updatedRow.letter_spacing,
      updatedAt: updatedRow.updated_at
    };

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully to PostgreSQL',
      settings: responsePayload,
      data: responsePayload
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[AdminSettings API POST] Error saving settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
