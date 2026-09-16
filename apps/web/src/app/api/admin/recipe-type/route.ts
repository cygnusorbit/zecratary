import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_RECIPE_TYPES: string[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert',
  'Beverage',
  'Appetizer',
  'Salad',
  'Soup',
  'Side Dish',
  'Baking'
];

export async function GET() {
  try {
    const rows = await query('SELECT recipe_types FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    let list = rows[0]?.recipe_types;

    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) {}
    }

    if (!Array.isArray(list) || list.length === 0) {
      list = DEFAULT_RECIPE_TYPES;
    }

    return NextResponse.json(
      { success: true, recipeTypes: list, types: list },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let types = body.recipeTypes || body.types || body.settings?.recipeTypes || body;

    if (typeof types === 'string') {
      try { types = JSON.parse(types); } catch (_) {}
    }

    if (!Array.isArray(types)) {
      return NextResponse.json({ success: false, error: 'recipeTypes must be an array of strings' }, { status: 400 });
    }

    const cleanTypes = types.map((t: any) => String(t).trim()).filter(Boolean);

    // 1. Direct PostgreSQL Update
    await query(`
      INSERT INTO admin_settings (id, recipe_types, updated_at)
      VALUES ('primary_settings', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        recipe_types = EXCLUDED.recipe_types,
        updated_at = NOW();
    `, [JSON.stringify(cleanTypes)]);

    // 2. Synchronize disk stores for legacy fallback readers
    const dataDirs = [
      path.join(process.cwd(), 'apps/web/data', 'admin_settings.json'),
      path.join(process.cwd(), 'apps/web/apps/web/data', 'admin_settings.json'),
      path.join(process.cwd(), 'data', 'admin_settings.json')
    ];

    for (const fpath of dataDirs) {
      if (fs.existsSync(fpath)) {
        try {
          const raw = fs.readFileSync(fpath, 'utf-8');
          const parsed = JSON.parse(raw);
          parsed.recipeTypes = cleanTypes;
          fs.writeFileSync(fpath, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      recipeTypes: cleanTypes,
      message: 'Recipe types saved successfully in PostgreSQL.'
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
