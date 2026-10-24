import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Module-scoped private constant (not exported to comply with Next.js App Router route signatures)
const DEFAULT_INGREDIENT_CATEGORIES = [
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

function getPgPool(): Pool | null {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) return null;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cleanConn = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  return new Pool({
    connectionString: cleanConn,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
}

function normalizeCategories(rawList: any[]): any[] {
  if (!Array.isArray(rawList)) return DEFAULT_INGREDIENT_CATEGORIES;
  return rawList.map((item, idx) => {
    if (typeof item === 'string') {
      const slug = item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return {
        id: `cat_${slug || idx + 1}`,
        name: item,
        slug: slug || `category-${idx + 1}`,
        icon: '🥬',
        description: '',
        isActive: true,
        order: idx + 1
      };
    }
    const name = item.name || item.title || item.label || 'Untitled';
    const slug = (item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '');
    return {
      id: item.id || `cat_${slug || idx + 1}`,
      name,
      slug: slug || `category-${idx + 1}`,
      icon: item.icon || '🥬',
      description: item.description || '',
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
      order: item.order !== undefined ? Number(item.order) : idx + 1
    };
  });
}

function getLocalFallback(): any[] {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), rel);
    if (fs.existsSync(full)) {
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
        const list = raw.ingredientCategories || raw.ingredient_categories;
        if (Array.isArray(list) && list.length > 0) return normalizeCategories(list);
      } catch (_) {}
    }
  }
  return DEFAULT_INGREDIENT_CATEGORIES;
}

function saveLocalFallback(items: any[]) {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), rel);
    try {
      if (!fs.existsSync(path.dirname(full))) fs.mkdirSync(path.dirname(full), { recursive: true });
      let current: any = {};
      if (fs.existsSync(full)) {
        try { current = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (_) {}
      }
      current.ingredientCategories = items;
      current.ingredient_categories = items;
      fs.writeFileSync(full, JSON.stringify(current, null, 2), 'utf8');
    } catch (_) {}
  }
}

export async function GET() {
  const pool = getPgPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(`
          SELECT ingredient_categories FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;
        `);
        let raw = res.rows?.[0]?.ingredient_categories;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch (_) {}
        }
        if (Array.isArray(raw) && raw.length > 0) {
          const normalized = normalizeCategories(raw);
          return NextResponse.json({
            success: true,
            categories: normalized,
            ingredientCategories: normalized
          });
        }
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err: any) {
      console.warn('PostgreSQL ingredient-categories fetch note:', err.message);
    }
  }

  const fallback = getLocalFallback();
  return NextResponse.json({
    success: true,
    categories: fallback,
    ingredientCategories: fallback
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = (await (await GET()).json())?.categories || DEFAULT_INGREDIENT_CATEGORIES;

    let updated: any[] = [];
    if (body.action === 'reset') {
      updated = DEFAULT_INGREDIENT_CATEGORIES;
    } else if (Array.isArray(body)) {
      updated = normalizeCategories(body);
    } else if (Array.isArray(body.ingredientCategories)) {
      updated = normalizeCategories(body.ingredientCategories);
    } else if (Array.isArray(body.categories)) {
      updated = normalizeCategories(body.categories);
    } else if (body.name) {
      const name = body.name.trim();
      const slug = (body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '');
      const newItem = {
        id: body.id || `cat_${Date.now().toString(36)}`,
        name,
        slug: slug || `cat-${Date.now()}`,
        icon: body.icon || '🥬',
        description: body.description || '',
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        order: current.length + 1
      };
      updated = [...current, newItem];
    }

    saveLocalFallback(updated);

    const pool = getPgPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(`
            INSERT INTO admin_settings (id, ingredient_categories, updated_at)
            VALUES ('primary_settings', $1::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET
              ingredient_categories = EXCLUDED.ingredient_categories,
              updated_at = NOW();
          `, [JSON.stringify(updated)]);
        } finally {
          client.release();
          await pool.end();
        }
      } catch (err: any) {
        console.warn('PostgreSQL ingredient-categories save note:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      categories: updated,
      ingredientCategories: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const name = searchParams.get('name');

    const current = (await (await GET()).json())?.categories || DEFAULT_INGREDIENT_CATEGORIES;
    const filtered = current.filter((item: any) => {
      if (id && item.id === id) return false;
      if (slug && item.slug === slug) return false;
      if (name && item.name.toLowerCase() === name.toLowerCase()) return false;
      return true;
    });

    saveLocalFallback(filtered);

    const pool = getPgPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(`
            UPDATE admin_settings
            SET ingredient_categories = $1::jsonb, updated_at = NOW()
            WHERE id = 'primary_settings';
          `, [JSON.stringify(filtered)]);
        } finally {
          client.release();
          await pool.end();
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      categories: filtered,
      ingredientCategories: filtered
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
