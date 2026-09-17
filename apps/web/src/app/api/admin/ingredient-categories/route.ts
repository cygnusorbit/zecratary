import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORIES: string[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Poultry',
  'Seafood',
  'Bakery',
  'Pantry & Dry Goods',
  'Canned Goods',
  'Baking & Cooking',
  'Spices & Seasonings',
  'Snacks',
  'Beverages',
  'Frozen Foods',
  'Condiments & Sauces',
  'Oils & Vinegars'
];

export async function GET() {
  try {
    const rows = await query('SELECT ingredient_categories FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    let list = rows[0]?.ingredient_categories;

    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) {}
    }

    if (!Array.isArray(list) || list.length === 0) {
      list = DEFAULT_CATEGORIES;
    }

    return NextResponse.json(
      { success: true, ingredientCategories: list, categories: list },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let categories = body.ingredientCategories || body.categories || body.settings?.ingredientCategories || body;

    if (typeof categories === 'string') {
      try { categories = JSON.parse(categories); } catch (_) {}
    }

    if (!Array.isArray(categories)) {
      return NextResponse.json({ success: false, error: 'ingredientCategories must be an array of strings' }, { status: 400 });
    }

    const cleanCategories = categories.map((c: any) => String(c).trim()).filter(Boolean);

    // 1. Direct PostgreSQL Update
    await query(`
      INSERT INTO admin_settings (id, ingredient_categories, updated_at)
      VALUES ('primary_settings', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ingredient_categories = EXCLUDED.ingredient_categories,
        updated_at = NOW();
    `, [JSON.stringify(cleanCategories)]);

    // 2. Synchronize legacy file stores if present
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
          parsed.ingredientCategories = cleanCategories;
          fs.writeFileSync(fpath, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      ingredientCategories: cleanCategories,
      message: 'Ingredient categories saved successfully in PostgreSQL.'
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
