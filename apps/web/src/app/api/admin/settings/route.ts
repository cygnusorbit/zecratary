import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getLocalSettingsPath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), '..', 'data', 'admin_settings.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  const defaultPath = path.join(process.cwd(), 'data', 'admin_settings.json');
  fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
  return defaultPath;
}

function readLocalSettings(): any {
  try {
    const p = getLocalSettingsPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {};
}

function writeLocalSettings(data: any): void {
  try {
    const p = getLocalSettingsPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) {}
}

async function ensureAdminSettingsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(100) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await query(`
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS chef_ai_settings JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50);
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme_colors JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS value JSONB;
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
  } catch (err) {
    console.warn('[PostgreSQL] admin_settings table setup warning:', err);
  }
}

export async function GET() {
  await ensureAdminSettingsTable();
  const diskData = readLocalSettings();

  try {
    const rows = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    if (rows.length > 0) {
      const row = rows[0];
      let chefAiSettings = row.chef_ai_settings;
      if (typeof chefAiSettings === 'string') {
        try { chefAiSettings = JSON.parse(chefAiSettings); } catch (_) { chefAiSettings = {}; }
      } else if (!chefAiSettings && row.value) {
        chefAiSettings = typeof row.value === 'string' ? JSON.parse(row.value).chefAiSettings || {} : row.value.chefAiSettings || {};
      }
      chefAiSettings = chefAiSettings || {};

      let recUrls: string[] = [];
      if (Array.isArray(chefAiSettings.recommendedRecipeUrls)) {
        recUrls = chefAiSettings.recommendedRecipeUrls.filter(Boolean);
      } else if (Array.isArray(chefAiSettings.recommendedRecipesUrls)) {
        recUrls = chefAiSettings.recommendedRecipesUrls.filter(Boolean);
      } else if (Array.isArray(diskData.recommendedRecipeUrls)) {
        recUrls = diskData.recommendedRecipeUrls.filter(Boolean);
      }

      // Extract and preserve themeColors
      let themeColors: any = null;
      if (row.theme_colors) {
        try {
          themeColors = typeof row.theme_colors === 'string' ? JSON.parse(row.theme_colors) : row.theme_colors;
        } catch (_) {}
      }
      if (!themeColors && row.value) {
        const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        themeColors = val?.themeColors || val?.theme_colors || null;
      }
      if (!themeColors && diskData.themeColors) {
        themeColors = diskData.themeColors;
      }
      if (!themeColors && diskData.settings?.themeColors) {
        themeColors = diskData.settings.themeColors;
      }

      const settingsPayload = row.value || diskData.settings || {};

      return NextResponse.json({
        success: true,
        themeColors: themeColors || null,
        theme_colors: themeColors || null,
        aiProvider: row.ai_provider || chefAiSettings.provider || diskData.aiProvider || 'gemini',
        aiModel: row.ai_model || chefAiSettings.model || diskData.aiModel || 'gemini-2.5-flash',
        chefAiSettings: {
          ...diskData.chefAiSettings,
          ...chefAiSettings,
          recommendedRecipeUrls: recUrls
        },
        recommendedRecipeUrls: recUrls,
        settings: {
          ...settingsPayload,
          themeColors: themeColors || settingsPayload.themeColors || null
        }
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (dbErr) {
    console.warn('[PostgreSQL] GET fallback to filesystem:', dbErr);
  }

  // Filesystem fallback
  const recUrls = Array.isArray(diskData.recommendedRecipeUrls) 
    ? diskData.recommendedRecipeUrls.filter(Boolean) 
    : (diskData.chefAiSettings?.recommendedRecipeUrls || []);

  const diskTheme = diskData.themeColors || diskData.settings?.themeColors || null;

  return NextResponse.json({
    success: true,
    themeColors: diskTheme,
    theme_colors: diskTheme,
    aiProvider: diskData.aiProvider || diskData.chefAiSettings?.provider || 'gemini',
    aiModel: diskData.aiModel || diskData.chefAiSettings?.model || 'gemini-2.5-flash',
    chefAiSettings: {
      ...(diskData.chefAiSettings || {}),
      recommendedRecipeUrls: recUrls
    },
    recommendedRecipeUrls: recUrls,
    settings: {
      ...(diskData.settings || {}),
      themeColors: diskTheme
    }
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  return handleSaveSettings(req);
}

export async function PUT(req: NextRequest) {
  return handleSaveSettings(req);
}

async function handleSaveSettings(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { aiProvider, aiModel, chefAiSettings, recommendedRecipeUrls, themeColors, theme_colors } = body;

    await ensureAdminSettingsTable();
    const diskData = readLocalSettings();

    let existingChefSettings: any = diskData.chefAiSettings || {};
    let existingValue: any = diskData.value || diskData.settings || {};
    let existingThemeColors: any = diskData.themeColors || diskData.settings?.themeColors || null;

    try {
      const existingRows = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
      if (existingRows.length > 0) {
        const row = existingRows[0];
        if (row.theme_colors) {
          try {
            existingThemeColors = typeof row.theme_colors === 'string' ? JSON.parse(row.theme_colors) : row.theme_colors;
          } catch (_) {}
        }
        if (typeof row.chef_ai_settings === 'string') {
          try { existingChefSettings = JSON.parse(row.chef_ai_settings); } catch (_) {}
        } else if (row.chef_ai_settings) {
          existingChefSettings = row.chef_ai_settings;
        }

        if (typeof row.value === 'string') {
          try { existingValue = JSON.parse(row.value); } catch (_) {}
        } else if (row.value) {
          existingValue = row.value;
        }
      }
    } catch (_) {}

    const resolvedThemeColors = themeColors || theme_colors || existingThemeColors || existingValue.themeColors || existingValue.theme_colors || null;

    const mergedChefSettings = {
      ...existingChefSettings,
      ...(chefAiSettings || {})
    };

    if (Array.isArray(recommendedRecipeUrls)) {
      mergedChefSettings.recommendedRecipeUrls = recommendedRecipeUrls.filter(Boolean);
    } else if (Array.isArray(chefAiSettings?.recommendedRecipeUrls)) {
      mergedChefSettings.recommendedRecipeUrls = chefAiSettings.recommendedRecipeUrls.filter(Boolean);
    }

    const providerToSave = aiProvider || chefAiSettings?.provider || existingChefSettings.provider || 'gemini';
    const modelToSave = aiModel || chefAiSettings?.model || existingChefSettings.model || 'gemini-2.5-flash';

    const mergedValue = {
      ...existingValue,
      ...body,
      themeColors: resolvedThemeColors,
      theme_colors: resolvedThemeColors,
      chefAiSettings: mergedChefSettings,
      recommendedRecipeUrls: mergedChefSettings.recommendedRecipeUrls || []
    };

    // 1. Dual-mirror to filesystem
    writeLocalSettings({
      aiProvider: providerToSave,
      aiModel: modelToSave,
      themeColors: resolvedThemeColors,
      theme_colors: resolvedThemeColors,
      chefAiSettings: mergedChefSettings,
      recommendedRecipeUrls: mergedChefSettings.recommendedRecipeUrls || [],
      value: mergedValue,
      settings: mergedValue,
      updatedAt: new Date().toISOString()
    });

    // 2. Persist to PostgreSQL (COALESCE preserves theme_colors if omitted)
    try {
      await query(`
        INSERT INTO admin_settings (id, chef_ai_settings, ai_model, ai_provider, value, theme_colors, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          chef_ai_settings = EXCLUDED.chef_ai_settings,
          ai_model = EXCLUDED.ai_model,
          ai_provider = EXCLUDED.ai_provider,
          value = EXCLUDED.value,
          theme_colors = COALESCE(EXCLUDED.theme_colors, admin_settings.theme_colors),
          updated_at = NOW()
      `, [
        'primary_settings',
        JSON.stringify(mergedChefSettings),
        modelToSave,
        providerToSave,
        JSON.stringify(mergedValue),
        resolvedThemeColors ? JSON.stringify(resolvedThemeColors) : null
      ]);
    } catch (pgErr) {
      console.warn('[PostgreSQL] Save warning, filesystem fallback active:', pgErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin settings persisted successfully',
      themeColors: resolvedThemeColors,
      theme_colors: resolvedThemeColors,
      chefAiSettings: mergedChefSettings,
      recommendedRecipeUrls: mergedChefSettings.recommendedRecipeUrls || []
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
