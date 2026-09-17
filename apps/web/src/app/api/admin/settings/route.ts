import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getLocalJsonPath() {
  const candidates = [
    path.join(process.cwd(), 'apps', 'web', 'data', 'admin_settings.json'),
    path.join(process.cwd(), 'data', 'admin_settings.json')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export async function GET() {
  try {
    let pgSettings: any = null;
    try {
      const rows = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['default']);
      if (rows && rows.length > 0) {
        pgSettings = rows[0];
      }
    } catch (_) {}

    let jsonSettings: any = {};
    try {
      const p = getLocalJsonPath();
      if (fs.existsSync(p)) {
        jsonSettings = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (_) {}

    const themeColors = pgSettings?.theme_colors && Object.keys(pgSettings.theme_colors).length > 0
      ? pgSettings.theme_colors
      : (jsonSettings.themeColors || {});

    const chefAiSettings = pgSettings?.chef_ai_settings && Object.keys(pgSettings.chef_ai_settings).length > 0
      ? pgSettings.chef_ai_settings
      : (jsonSettings.chefAiSettings || {});

    const chefQuestionnaire = pgSettings?.chef_questionnaire && pgSettings.chef_questionnaire.length > 0
      ? pgSettings.chef_questionnaire
      : (jsonSettings.chefQuestionnaire || []);

    const themeMode = pgSettings?.theme_mode || jsonSettings.themeMode || 'dark';

    return NextResponse.json({
      success: true,
      themeColors,
      themeMode,
      chefAiSettings,
      chefQuestionnaire,
      ...jsonSettings
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Update PostgreSQL
    try {
      const current = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['default']);
      const curRow = (current && current.length > 0) ? current[0] : {};

      const nextTheme = body.themeColors ? { ...(curRow.theme_colors || {}), ...body.themeColors } : curRow.theme_colors;
      const nextAi = body.chefAiSettings ? { ...(curRow.chef_ai_settings || {}), ...body.chefAiSettings } : curRow.chef_ai_settings;
      const nextQ = body.chefQuestionnaire ? body.chefQuestionnaire : curRow.chef_questionnaire;
      const nextMode = body.themeMode ? body.themeMode : curRow.theme_mode;

      await query(`
        INSERT INTO admin_settings (id, theme_colors, theme_mode, chef_ai_settings, chef_questionnaire, updated_at)
        VALUES ('default', $1::jsonb, $2, $3::jsonb, $4::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          theme_colors = COALESCE(EXCLUDED.theme_colors, admin_settings.theme_colors),
          theme_mode = COALESCE(EXCLUDED.theme_mode, admin_settings.theme_mode),
          chef_ai_settings = COALESCE(EXCLUDED.chef_ai_settings, admin_settings.chef_ai_settings),
          chef_questionnaire = COALESCE(EXCLUDED.chef_questionnaire, admin_settings.chef_questionnaire),
          updated_at = NOW();
      `, [JSON.stringify(nextTheme || {}), nextMode || 'dark', JSON.stringify(nextAi || {}), JSON.stringify(nextQ || [])]);
    } catch (_) {}

    // 2. Update server JSON backup
    try {
      const p = getLocalJsonPath();
      os.makedirs ? undefined : null;
      let existing: any = {};
      if (fs.existsSync(p)) {
        try { existing = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch (_) {}
      }
      const updated = {
        ...existing,
        ...body,
        themeColors: body.themeColors ? { ...(existing.themeColors || {}), ...body.themeColors } : existing.themeColors,
        chefAiSettings: body.chefAiSettings ? { ...(existing.chefAiSettings || {}), ...body.chefAiSettings } : existing.chefAiSettings,
        updatedAt: new Date().toISOString()
      };
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Settings persisted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
