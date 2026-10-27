import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { query } from '@/lib/db';

function getJsonStorePath() {
  const p1 = path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json');
  if (fs.existsSync(path.dirname(p1))) return p1;
  return path.join(process.cwd(), 'data', 'admin_settings.json');
}

function readJsonStore() {
  const p = getJsonStorePath();
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeJsonStore(data: any) {
  const p = getJsonStorePath();
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

export async function GET() {
  let settings: any = readJsonStore();

  try {
    // Select authoritative latest settings row regardless of id alias
    const rows = await query(`
      SELECT * FROM admin_settings 
      ORDER BY updated_at DESC LIMIT 1;
    `);

    if (rows && rows.length > 0) {
      const row = rows[0];
      const parsedTheme = typeof row.theme_colors === 'string'
        ? JSON.parse(row.theme_colors)
        : (row.theme_colors || settings.themeColors || {});

      const parsedTrans = typeof row.translations === 'string'
        ? JSON.parse(row.translations)
        : (row.translations || settings.translations || {});

      const resolvedTitlebarImage = row.titlebar_image || settings.titlebarImage || settings.titlebar_image || '';
      const resolvedFaviconImage = row.favicon_image || settings.faviconImage || settings.favicon_image || '';
      const resolvedTitlebarEmoji = row.titlebar_emoji || settings.titlebarEmoji || settings.titlebar_emoji || '👨‍🍳';
      const resolvedFaviconEmoji = row.favicon_emoji || settings.faviconEmoji || settings.favicon_emoji || '👨‍🍳';

      settings = {
        ...settings,
        siteName: row.site_name || settings.siteName || 'Zecratary',
        site_name: row.site_name || settings.site_name || 'Zecratary',
        tagline: row.tagline || settings.tagline || 'Autonomous Culinary Intelligence & Precision Meal Planning',
        siteTagline: row.tagline || settings.siteTagline || 'Autonomous Culinary Intelligence & Precision Meal Planning',
        site_tagline: row.tagline || settings.site_tagline || 'Autonomous Culinary Intelligence & Precision Meal Planning',
        titlebarEmoji: resolvedTitlebarEmoji,
        titlebar_emoji: resolvedTitlebarEmoji,
        titlebarImage: resolvedTitlebarImage,
        titlebar_image: resolvedTitlebarImage,
        faviconEmoji: resolvedFaviconEmoji,
        favicon_emoji: resolvedFaviconEmoji,
        faviconImage: resolvedFaviconImage,
        favicon_image: resolvedFaviconImage,
        siteIcon: resolvedTitlebarImage || resolvedTitlebarEmoji,
        site_icon: resolvedTitlebarImage || resolvedTitlebarEmoji,
        fontFamily: row.font_family || settings.fontFamily || 'Inter, sans-serif',
        font_family: row.font_family || settings.font_family || 'Inter, sans-serif',
        themeColors: parsedTheme,
        theme_colors: parsedTheme,
        metaDescription: row.meta_description || settings.metaDescription || 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
        meta_description: row.meta_description || settings.meta_description || 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
        metaKeywords: row.meta_keywords || settings.metaKeywords || 'culinary ai, recipe generator, meal planner, pantry management',
        meta_keywords: row.meta_keywords || settings.meta_keywords || 'culinary ai, recipe generator, meal planner, pantry management',
        metaAuthor: row.meta_author || settings.metaAuthor || 'Zecratary Culinary Intelligence Inc.',
        meta_author: row.meta_author || settings.meta_author || 'Zecratary Culinary Intelligence Inc.',
        translations: parsedTrans
      };
    }
  } catch (err: any) {
    console.warn('[PostgreSQL] Settings GET notice:', err.message);
  }

  return NextResponse.json({
    success: true,
    settings,
    ...settings
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const existing = readJsonStore();

    const siteName = body.siteName || body.site_name || existing.siteName || 'Zecratary';
    const tagline = body.siteTagline || body.tagline || body.site_tagline || existing.tagline || 'Autonomous Culinary Intelligence & Precision Meal Planning';
    const titlebarEmoji = body.titlebarEmoji || body.titlebar_emoji || existing.titlebarEmoji || '👨‍🍳';
    const titlebarImage = body.titlebarImage !== undefined ? body.titlebarImage : (body.titlebar_image !== undefined ? body.titlebar_image : (existing.titlebarImage || ''));
    const faviconEmoji = body.faviconEmoji || body.favicon_emoji || existing.faviconEmoji || '👨‍🍳';
    const faviconImage = body.faviconImage !== undefined ? body.faviconImage : (body.favicon_image !== undefined ? body.favicon_image : (existing.faviconImage || ''));
    const fontFamily = body.fontFamily || body.font_family || existing.fontFamily || 'Inter, sans-serif';
    const themeColors = body.themeColors || body.theme_colors || existing.themeColors || {};
    const metaDescription = body.metaDescription || body.meta_description || existing.metaDescription || 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.';
    const metaKeywords = body.metaKeywords || body.meta_keywords || existing.metaKeywords || 'culinary ai, recipe generator, meal planner, pantry management';
    const metaAuthor = body.metaAuthor || body.meta_author || existing.metaAuthor || 'Zecratary Culinary Intelligence Inc.';

    const updated = {
      ...existing,
      ...body,
      siteName,
      site_name: siteName,
      tagline,
      siteTagline: tagline,
      site_tagline: tagline,
      titlebarEmoji,
      titlebar_emoji: titlebarEmoji,
      titlebarImage,
      titlebar_image: titlebarImage,
      faviconEmoji,
      favicon_emoji: faviconEmoji,
      faviconImage,
      favicon_image: faviconImage,
      siteIcon: titlebarImage || titlebarEmoji,
      site_icon: titlebarImage || titlebarEmoji,
      fontFamily,
      font_family: fontFamily,
      themeColors,
      theme_colors: themeColors,
      metaDescription,
      meta_description: metaDescription,
      metaKeywords,
      meta_keywords: metaKeywords,
      metaAuthor,
      meta_author: metaAuthor,
      updated_at: new Date().toISOString()
    };

    writeJsonStore(updated);

    try {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(255) PRIMARY KEY,
          site_name VARCHAR(255) DEFAULT 'Zecratary',
          tagline TEXT DEFAULT 'Autonomous Culinary Intelligence & Precision Meal Planning',
          titlebar_emoji VARCHAR(50) DEFAULT '👨‍🍳',
          titlebar_image TEXT DEFAULT '',
          favicon_emoji VARCHAR(50) DEFAULT '👨‍🍳',
          favicon_image TEXT DEFAULT '',
          font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
          theme_colors JSONB DEFAULT '{}'::jsonb,
          meta_description TEXT DEFAULT 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
          meta_keywords TEXT DEFAULT 'culinary ai, recipe generator, meal planner, pantry management',
          meta_author TEXT DEFAULT 'Zecratary Culinary Intelligence Inc.',
          translations JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Determine active singleton id
      const existingRows = await query(`SELECT id FROM admin_settings ORDER BY updated_at DESC LIMIT 1;`);
      const targetId = existingRows && existingRows.length > 0 && existingRows[0]?.id ? existingRows[0].id : 'primary_settings';

      await query(`
        INSERT INTO admin_settings (
          id, site_name, tagline, titlebar_emoji, titlebar_image,
          favicon_emoji, favicon_image, font_family, theme_colors,
          meta_description, meta_keywords, meta_author, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          site_name = EXCLUDED.site_name,
          tagline = EXCLUDED.tagline,
          titlebar_emoji = EXCLUDED.titlebar_emoji,
          titlebar_image = EXCLUDED.titlebar_image,
          favicon_emoji = EXCLUDED.favicon_emoji,
          favicon_image = EXCLUDED.favicon_image,
          font_family = EXCLUDED.font_family,
          theme_colors = EXCLUDED.theme_colors,
          meta_description = EXCLUDED.meta_description,
          meta_keywords = EXCLUDED.meta_keywords,
          meta_author = EXCLUDED.meta_author,
          updated_at = NOW();
      `, [
        targetId,
        siteName,
        tagline,
        titlebarEmoji,
        titlebarImage,
        faviconEmoji,
        faviconImage,
        fontFamily,
        JSON.stringify(themeColors),
        metaDescription,
        metaKeywords,
        metaAuthor
      ]);
    } catch (dbErr: any) {
      console.warn('[PostgreSQL] Settings POST notice:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      settings: updated,
      ...updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
