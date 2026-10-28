// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_CATEGORIES = [
  { id: 'cat_produce', name: 'Produce', slug: 'produce', icon: '🥬', description: 'Fresh vegetables, fruits, and culinary herbs', isActive: true, order: 1 },
  { id: 'cat_meat', name: 'Meat & Poultry', slug: 'meat-poultry', icon: '🥩', description: 'Fresh meats, cuts, beef, poultry, and bacon', isActive: true, order: 2 },
  { id: 'cat_seafood', name: 'Seafood', slug: 'seafood', icon: '🐟', description: 'Fresh fish, fillets, shrimp, and shellfish', isActive: true, order: 3 },
  { id: 'cat_dairy', name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🧀', description: 'Milk, cheeses, butter, cream, and fresh eggs', isActive: true, order: 4 },
  { id: 'cat_pantry', name: 'Pantry Staples', slug: 'pantry-staples', icon: '🌾', description: 'Flour, rice, grains, pasta, sugar, and legumes', isActive: true, order: 5 },
  { id: 'cat_bakery', name: 'Bakery & Bread', slug: 'bakery-bread', icon: '🍞', description: 'Artisan loaves, tortillas, pitas, and baked goods', isActive: true, order: 6 },
  { id: 'cat_canned', name: 'Canned Goods', slug: 'canned-goods', icon: '🥫', description: 'Canned tomatoes, broths, beans, and preserved foods', isActive: true, order: 7 },
  { id: 'cat_frozen', name: 'Frozen Foods', slug: 'frozen-foods', icon: '🧊', description: 'Frozen veggies, berries, prepared sides, and ice cream', isActive: true, order: 8 },
  { id: 'cat_spices', name: 'Spices & Seasonings', slug: 'spices-seasonings', icon: '🧂', description: 'Dried seasonings, sea salt, pepper, and spice rubs', isActive: true, order: 9 },
  { id: 'cat_oils', name: 'Oils & Vinegars', slug: 'oils-vinegars', icon: '🫒', description: 'Olive oil, toasted sesame, balsamic, and vinegars', isActive: true, order: 10 },
  { id: 'cat_condiments', name: 'Condiments & Sauces', slug: 'condiments-sauces', icon: '🍯', description: 'Mustards, soy sauce, hot sauces, and dressings', isActive: true, order: 11 },
  { id: 'cat_beverages', name: 'Beverages', slug: 'beverages', icon: '🍹', description: 'Juices, soda, sparkling water, tea, and specialty drinks', isActive: true, order: 12 },
  { id: 'cat_snacks', name: 'Snacks & Sweets', slug: 'snacks-sweets', icon: '🍪', description: 'Nuts, dried fruits, crackers, and snacks', isActive: true, order: 13 }
];

function getSettingsFilePaths() {
  const root = process.cwd();
  return [
    path.join(root, 'data', 'admin_settings.json'),
    path.join(root, 'apps', 'web', 'data', 'admin_settings.json')
  ];
}

function readLocalCategories(): any[] {
  for (const fp of getSettingsFilePaths()) {
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.ingredientCategories) && data.ingredientCategories.length > 0) {
          return data.ingredientCategories;
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          return data.categories;
        }
      }
    } catch (_) {}
  }
  return DEFAULT_CATEGORIES;
}

function writeLocalCategories(items: any[]) {
  for (const fp of getSettingsFilePaths()) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let data: any = {};
      if (fs.existsSync(fp)) {
        try {
          data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        } catch (_) {}
      }
      data.ingredientCategories = items;
      data.categories = items;
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

export async function GET() {
  try {
    // 1. Attempt PostgreSQL/MySQL query
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(`
          CREATE TABLE IF NOT EXISTS ingredient_categories (
            id VARCHAR(120) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL,
            icon VARCHAR(64) DEFAULT '🥬',
            description TEXT DEFAULT '',
            is_active BOOLEAN DEFAULT true,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        const res = await query('SELECT * FROM ingredient_categories ORDER BY sort_order ASC, name ASC');
        if (res && Array.isArray(res.rows) && res.rows.length > 0) {
          const mapped = res.rows.map((r: any, idx: number) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            icon: r.icon || '🥬',
            description: r.description || '',
            isActive: r.is_active !== undefined ? Boolean(r.is_active) : true,
            order: r.sort_order !== undefined ? Number(r.sort_order) : idx + 1
          }));
          return NextResponse.json({ success: true, categories: mapped, ingredientCategories: mapped });
        }
      }
    } catch (_) {}

    // 2. Fallback to server JSON store
    const local = readLocalCategories();
    return NextResponse.json({ success: true, categories: local, ingredientCategories: local });
  } catch (err: any) {
    return NextResponse.json({ success: false, categories: DEFAULT_CATEGORIES, error: err.message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let items = Array.isArray(body) 
      ? body 
      : Array.isArray(body?.categories) 
        ? body.categories 
        : Array.isArray(body?.ingredientCategories) 
          ? body.ingredientCategories 
          : null;

    if (body?.action === 'reset') {
      items = DEFAULT_CATEGORIES;
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Categories array required' }, { status: 400 });
    }

    // Normalize items
    const normalized = items.map((it: any, idx: number) => {
      const name = String(it.name || it.title || it.label || 'Untitled').trim();
      const slug = String(it.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '');
      return {
        id: it.id || `cat_${slug || idx + 1}`,
        name,
        slug: slug || `category-${idx + 1}`,
        icon: it.icon || '🥬',
        description: it.description || '',
        isActive: it.isActive !== undefined ? Boolean(it.isActive) : true,
        order: it.order !== undefined ? Number(it.order) : idx + 1
      };
    });

    // 1. Try PostgreSQL/MySQL persistence
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(`
          CREATE TABLE IF NOT EXISTS ingredient_categories (
            id VARCHAR(120) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL,
            icon VARCHAR(64) DEFAULT '🥬',
            description TEXT DEFAULT '',
            is_active BOOLEAN DEFAULT true,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await query('DELETE FROM ingredient_categories');
        for (const cat of normalized) {
          await query(`
            INSERT INTO ingredient_categories (id, name, slug, icon, description, is_active, sort_order, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              slug = EXCLUDED.slug,
              icon = EXCLUDED.icon,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              sort_order = EXCLUDED.sort_order,
              updated_at = CURRENT_TIMESTAMP
          `, [
            cat.id,
            cat.name,
            cat.slug,
            cat.icon,
            cat.description,
            cat.isActive,
            cat.order
          ]);
        }
      }
    } catch (_) {}

    // 2. Persist to server JSON stores
    writeLocalCategories(normalized);

    return NextResponse.json({ success: true, categories: normalized, ingredientCategories: normalized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('id') || '';
    const targetSlug = searchParams.get('slug') || '';
    const targetName = searchParams.get('name') || '';

    if (!targetId && !targetSlug && !targetName) {
      return NextResponse.json({ success: false, error: 'Identifier required for deletion' }, { status: 400 });
    }

    // 1. Delete from DB
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(
          'DELETE FROM ingredient_categories WHERE id = $1 OR slug = $2 OR name = $3',
          [targetId, targetSlug, targetName]
        );
      }
    } catch (_) {}

    // 2. Delete from local JSON files
    const current = readLocalCategories();
    const updated = current.filter(it => 
      it.id !== targetId && it.slug !== targetSlug && it.name !== targetName
    );
    writeLocalCategories(updated);

    return NextResponse.json({ success: true, categories: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
