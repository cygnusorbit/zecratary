import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DEFAULT_RECIPE_TYPES } from '@/lib/recipe-types';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY,
        settings JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (_) {}
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await query('SELECT settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    if (rows && rows.length > 0 && rows[0].settings) {
      const types = rows[0].settings.recipeTypes || rows[0].settings.types;
      if (Array.isArray(types) && types.length > 0) {
        return NextResponse.json({ success: true, recipeTypes: types });
      }
    }
    return NextResponse.json({ success: true, recipeTypes: DEFAULT_RECIPE_TYPES });
  } catch (err: any) {
    return NextResponse.json({ success: true, recipeTypes: DEFAULT_RECIPE_TYPES });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const recipeTypes = Array.isArray(body) ? body : (body.recipeTypes || body.types || []);

    const existingRows = await query('SELECT settings FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    let currentSettings: any = {};
    if (existingRows && existingRows.length > 0 && existingRows[0].settings) {
      currentSettings = existingRows[0].settings;
    }

    currentSettings.recipeTypes = recipeTypes;

    await query(`
      INSERT INTO admin_settings (id, settings, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET
        settings = EXCLUDED.settings,
        updated_at = NOW();
    `, ['primary_settings', JSON.stringify(currentSettings)]);

    return NextResponse.json({ success: true, recipeTypes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
