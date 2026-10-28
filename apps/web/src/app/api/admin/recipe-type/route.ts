import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TYPES = [
  { id: 'rt_1', name: 'Breakfast', slug: 'breakfast', icon: '🍳', description: 'Morning meals, smoothies, eggs, and breakfast bowls', isActive: true, order: 1 },
  { id: 'rt_2', name: 'Lunch', slug: 'lunch', icon: '🥪', description: 'Midday plates, wraps, light meals, and express bowls', isActive: true, order: 2 },
  { id: 'rt_3', name: 'Dinner', slug: 'dinner', icon: '🍽️', description: 'Substantial evening entrees, roasts, and hearty dishes', isActive: true, order: 3 },
  { id: 'rt_4', name: 'Main Dish', slug: 'main-dish', icon: '🥩', description: 'Culinary centerpieces and hero protein plates', isActive: true, order: 4 },
  { id: 'rt_5', name: 'Appetizer', slug: 'appetizer', icon: '🥟', description: 'Finger foods, starters, tapas, and hors d’oeuvres', isActive: true, order: 5 },
  { id: 'rt_6', name: 'Side Dish', slug: 'side-dish', icon: '🥔', description: 'Vegetables, grains, rice, and accompanying sides', isActive: true, order: 6 },
  { id: 'rt_7', name: 'Salad', slug: 'salad', icon: '🥗', description: 'Fresh leafy bowls, grain salads, and vinaigrettes', isActive: true, order: 7 },
  { id: 'rt_8', name: 'Soup', slug: 'soup', icon: '🍲', description: 'Warm broths, chowders, stews, and bisques', isActive: true, order: 8 },
  { id: 'rt_9', name: 'Dessert', slug: 'dessert', icon: '🍰', description: 'Pastries, cakes, puddings, sweets, and confections', isActive: true, order: 9 },
  { id: 'rt_10', name: 'Snacks', slug: 'snacks', icon: '🥨', description: 'Quick bites, chips, dips, and energy fuel', isActive: true, order: 10 },
  { id: 'rt_11', name: 'Beverages', slug: 'beverages', icon: '🍹', description: 'Cocktails, mocktails, juices, teas, and specialty drinks', isActive: true, order: 11 }
];

async function executeQuery(queryText: string, params: any[] = []): Promise<any> {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) return null;

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cleanConn = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');

  // Attempt 1: SSL mode
  try {
    const poolSsl = new Pool({
      connectionString: cleanConn,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000
    });
    const client = await poolSsl.connect();
    try {
      return await client.query(queryText, params);
    } finally {
      client.release();
      await poolSsl.end();
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('does not support SSL') || err.message.includes('SSL connection'))) {
      // Attempt 2: Non-SSL fallback for local instances
      try {
        const poolNoSsl = new Pool({
          connectionString: cleanConn,
          ssl: false,
          connectionTimeoutMillis: 4000
        });
        const client = await poolNoSsl.connect();
        try {
          return await client.query(queryText, params);
        } finally {
          client.release();
          await poolNoSsl.end();
        }
      } catch (e: any) {
        console.warn('PostgreSQL non-ssl retry note:', e.message);
      }
    }
    console.warn('PostgreSQL query note:', err.message);
    return null;
  }
}

function getLocalFallback(): any[] {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), rel);
    if (fs.existsSync(full)) {
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (Array.isArray(raw.recipeTypes) && raw.recipeTypes.length > 0) return raw.recipeTypes;
        if (Array.isArray(raw.recipe_types) && raw.recipe_types.length > 0) return raw.recipe_types;
      } catch (_) {}
    }
  }
  return DEFAULT_TYPES;
}

function saveLocalFallback(items: any[]) {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    const full = path.join(process.cwd(), rel);
    try {
      const dir = path.dirname(full);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let current: any = {};
      if (fs.existsSync(full)) {
        try { current = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (_) {}
      }
      current.recipeTypes = items;
      current.recipe_types = items;
      fs.writeFileSync(full, JSON.stringify(current, null, 2), 'utf8');
    } catch (_) {}
  }
}

export async function GET() {
  const res = await executeQuery(`
    SELECT recipe_types FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;
  `);

  if (res && res.rows?.[0]?.recipe_types) {
    let raw = res.rows[0].recipe_types;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (_) {}
    }
    if (Array.isArray(raw) && raw.length > 0) {
      return NextResponse.json({ success: true, types: raw, recipeTypes: raw });
    }
  }

  const fallback = getLocalFallback();
  return NextResponse.json({ success: true, types: fallback, recipeTypes: fallback });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = (await (await GET()).json())?.types || DEFAULT_TYPES;
    
    let updated: any[] = [];
    if (Array.isArray(body)) {
      updated = body;
    } else if (Array.isArray(body.recipeTypes)) {
      updated = body.recipeTypes;
    } else if (Array.isArray(body.types)) {
      updated = body.types;
    } else if (body.name) {
      const newItem = {
        id: body.id || `rt_${Date.now().toString(36)}`,
        name: body.name.trim(),
        slug: (body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, ''),
        icon: body.icon || '🍽️',
        description: body.description || '',
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        order: current.length + 1
      };
      updated = [...current, newItem];
    }

    saveLocalFallback(updated);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY,
        recipe_types JSONB,
        translations JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS recipe_types JSONB;
      INSERT INTO admin_settings (id, recipe_types, updated_at)
      VALUES ('primary_settings', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        recipe_types = EXCLUDED.recipe_types,
        updated_at = NOW();
    `, [JSON.stringify(updated)]);

    return NextResponse.json({ success: true, types: updated, recipeTypes: updated });
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

    const current = (await (await GET()).json())?.types || DEFAULT_TYPES;
    const filtered = current.filter((item: any) => {
      if (id && item.id === id) return false;
      if (slug && item.slug === slug) return false;
      return true;
    });

    saveLocalFallback(filtered);

    await executeQuery(`
      UPDATE admin_settings
      SET recipe_types = $1::jsonb, updated_at = NOW()
      WHERE id = 'primary_settings';
    `, [JSON.stringify(filtered)]);

    return NextResponse.json({ success: true, types: filtered, recipeTypes: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
