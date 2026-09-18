import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getStorePaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];
}

let cachedPool: any = null;

async function getPostgresPool() {
  if (cachedPool) return cachedPool;
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connStr) return null;
  try {
    const { Pool } = await import('pg');
    const requiresSsl = connStr.includes('sslmode=require') || 
                        connStr.includes('neon.tech') || 
                        connStr.includes('supabase.co') || 
                        process.env.NODE_ENV === 'production';
    cachedPool = new Pool({
      connectionString: connStr,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    });
    return cachedPool;
  } catch (err) {
    console.error('[PostgreSQL] Failed to initialize connection pool:', err);
    return null;
  }
}

async function initPostgresTables(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS site_name VARCHAR(255);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS titlebar_emoji VARCHAR(50);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS titlebar_image TEXT;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS favicon_emoji VARCHAR(50);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS favicon_image TEXT;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme_colors JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS recipe_types JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ingredient_categories JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS social_login JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS subscription_plans JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS user_theme (
        user_id VARCHAR(100) PRIMARY KEY,
        theme_colors JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE user_theme ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
      ALTER TABLE user_theme ADD COLUMN IF NOT EXISTS theme_colors JSONB;
      ALTER TABLE user_theme ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
  } catch (err) {
    console.error('[PostgreSQL] Table alteration error:', err);
  }
}

async function readFromPostgres(pool: any): Promise<Record<string, any> | null> {
  if (!pool) return null;
  try {
    await initPostgresTables(pool);

    // Query with SELECT * so undefined column errors can never occur
    const res = await pool.query(`
      SELECT * FROM admin_settings 
      ORDER BY CASE WHEN key = 'current' THEN 0 ELSE 1 END, updated_at DESC NULLS LAST 
      LIMIT 1;
    `);

    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      let settings: Record<string, any> = {};

      if (row.value) {
        settings = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      } else if (row.settings) {
        settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
      } else if (row.data) {
        settings = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      }

      // Merge discrete columns if value JSON was partial or empty
      if (row.theme_colors && !settings.themeColors) {
        settings.themeColors = typeof row.theme_colors === 'string' ? JSON.parse(row.theme_colors) : row.theme_colors;
      }
      if (row.themeColors && !settings.themeColors) {
        settings.themeColors = typeof row.themeColors === 'string' ? JSON.parse(row.themeColors) : row.themeColors;
      }
      if (row.site_name && !settings.siteName) settings.siteName = row.site_name;
      if (row.siteName && !settings.siteName) settings.siteName = row.siteName;
      if (row.titlebar_emoji && !settings.titlebarEmoji) settings.titlebarEmoji = row.titlebar_emoji;
      if (row.titlebar_image && !settings.titlebarImage) settings.titlebarImage = row.titlebar_image;
      if (row.favicon_emoji && !settings.faviconEmoji) settings.faviconEmoji = row.favicon_emoji;
      if (row.favicon_image && !settings.faviconImage) settings.faviconImage = row.favicon_image;
      if (row.recipe_types && !settings.recipeTypes) settings.recipeTypes = row.recipe_types;
      if (row.ingredient_categories && !settings.ingredientCategories) settings.ingredientCategories = row.ingredient_categories;
      if (row.supported_languages && !settings.supportedLanguages) settings.supportedLanguages = row.supported_languages;
      if (row.social_login && !settings.socialLogin) settings.socialLogin = row.social_login;
      if (row.subscription_plans && !settings.subscriptionPlans) settings.subscriptionPlans = row.subscription_plans;

      if (Object.keys(settings).length > 0) {
        return settings;
      }
    }
  } catch (err) {
    console.error('[PostgreSQL] Read error:', err);
  }
  return null;
}

async function saveToPostgres(pool: any, data: Record<string, any>): Promise<boolean> {
  if (!pool) return false;
  try {
    await initPostgresTables(pool);
    const jsonStr = JSON.stringify(data);
    const themeJson = data.themeColors ? JSON.stringify(data.themeColors) : null;
    const siteName = data.siteName || null;
    const titlebarEmoji = data.titlebarEmoji || null;
    const titlebarImage = data.titlebarImage || null;
    const faviconEmoji = data.faviconEmoji || null;
    const faviconImage = data.faviconImage || null;

    const existing = await pool.query("SELECT * FROM admin_settings LIMIT 1;");

    if (existing.rows && existing.rows.length > 0) {
      const firstRow = existing.rows[0];
      const matchKey = firstRow.key !== undefined && firstRow.key !== null;
      const whereCond = matchKey ? "key = COALESCE(key, 'current')" : `id = ${firstRow.id || 1}`;

      await pool.query(
        `UPDATE admin_settings 
         SET value = $1::jsonb,
             key = COALESCE(key, 'current'),
             theme_colors = COALESCE($2::jsonb, theme_colors),
             site_name = COALESCE($3, site_name),
             titlebar_emoji = COALESCE($4, titlebar_emoji),
             titlebar_image = COALESCE($5, titlebar_image),
             favicon_emoji = COALESCE($6, favicon_emoji),
             favicon_image = COALESCE($7, favicon_image),
             updated_at = NOW()
         WHERE ${whereCond};`,
        [jsonStr, themeJson, siteName, titlebarEmoji, titlebarImage, faviconEmoji, faviconImage]
      );
    } else {
      await pool.query(
        `INSERT INTO admin_settings (key, value, theme_colors, site_name, titlebar_emoji, titlebar_image, favicon_emoji, favicon_image, updated_at)
         VALUES ('current', $1::jsonb, $2::jsonb, $3, $4, $5, $6, $7, NOW());`,
        [jsonStr, themeJson, siteName, titlebarEmoji, titlebarImage, faviconEmoji, faviconImage]
      );
    }

    if (data.themeColors) {
      const checkUserTheme = await pool.query("SELECT user_id FROM user_theme WHERE user_id = 'default' LIMIT 1;");
      if (checkUserTheme.rows && checkUserTheme.rows.length > 0) {
        await pool.query(
          "UPDATE user_theme SET theme_colors = $1::jsonb, updated_at = NOW() WHERE user_id = 'default';",
          [themeJson]
        );
      } else {
        await pool.query(
          "INSERT INTO user_theme (user_id, theme_colors, updated_at) VALUES ('default', $1::jsonb, NOW());",
          [themeJson]
        );
      }
    }
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Save error:', err);
    return false;
  }
}

function readServerSettings(): Record<string, any> {
  const filePaths = getStorePaths();
  for (const fp of filePaths) {
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return {};
}

function writeServerSettings(data: Record<string, any>): boolean {
  const filePaths = getStorePaths();
  let wrote = false;
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  for (const fp of filePaths) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf-8');
      wrote = true;
    } catch (_) {}
  }
  return wrote;
}

export async function GET() {
  try {
    const pool = await getPostgresPool();
    const pgData = await readFromPostgres(pool);
    const diskData = readServerSettings();
    const settings = { ...diskData, ...(pgData || {}) };

    return NextResponse.json(
      { success: true, settings, themeColors: settings.themeColors },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getPostgresPool();
    const pgData = await readFromPostgres(pool);
    const current = { ...readServerSettings(), ...(pgData || {}) };

    const merged = {
      ...current,
      ...body,
      themeColors: {
        ...(current.themeColors || {}),
        ...(body.themeColors || {})
      },
      socialLogin: {
        ...(current.socialLogin || {}),
        ...(body.socialLogin || {})
      },
      subscriptionPlans: body.subscriptionPlans || current.subscriptionPlans || []
    };

    const pgSaved = await saveToPostgres(pool, merged);
    const diskSaved = writeServerSettings(merged);

    if (!pgSaved && !diskSaved) {
      return NextResponse.json({ error: 'Failed to write settings to storage' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, settings: merged, themeColors: merged.themeColors },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to persist settings' }, { status: 500 });
  }
}
