import { NextResponse } from 'next/server';
import { query, isPostgres } from '@/lib/db';
import fs from 'fs';
import path from 'path';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


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

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  try {
    if (isPostgres()) {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(64) PRIMARY KEY,
          recipe_types JSONB DEFAULT '[]'::jsonb,
          translations JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS recipe_types JSONB DEFAULT '[]'::jsonb;`);
      await query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;`);
      await query(`
        CREATE TABLE IF NOT EXISTS recipe_types (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          slug VARCHAR(255) NOT NULL UNIQUE,
          icon VARCHAR(64) DEFAULT '🍽️',
          description TEXT DEFAULT '',
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(64) PRIMARY KEY,
          recipe_types JSON,
          translations JSON,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS recipe_types (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          slug VARCHAR(255) NOT NULL UNIQUE,
          icon VARCHAR(64) DEFAULT '🍽️',
          description TEXT DEFAULT '',
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    schemaEnsured = true;
  } catch (err) {
    // Non-blocking schema note
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
  await ensureSchema();

  try {
    // Defensive SELECT * prevents "column recipe_types does not exist" errors
    const rows = await query(`SELECT * FROM admin_settings WHERE id = 'primary_settings' LIMIT 1;`);
    if (rows && rows.length > 0) {
      const row = rows[0];
      let raw = row.recipe_types || row.recipeTypes;
      if (!raw && row.value && typeof row.value === 'object') {
        raw = row.value.recipe_types || row.value.recipeTypes;
      }
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (_) {}
      }
      if (Array.isArray(raw) && raw.length > 0) {
        return NextResponse.json({ success: true, types: raw, recipeTypes: raw });
      }
    }

    // Try standalone recipe_types table
    const tableRows = await query(`SELECT * FROM recipe_types ORDER BY sort_order ASC, created_at ASC;`);
    if (Array.isArray(tableRows) && tableRows.length > 0) {
      const normalized = tableRows.map((r: any, idx: number) => ({
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        icon: r.icon || '🍽️',
        description: r.description || '',
        order: Number(r.sort_order ?? idx + 1),
        isActive: Boolean(r.is_active !== false && r.is_active !== 0)
      }));
      return NextResponse.json({ success: true, types: normalized, recipeTypes: normalized });
    }
  } catch (err: any) {
    // Fallback to disk on database read error
  }

  const fallback = getLocalFallback();
  return NextResponse.json({ success: true, types: fallback, recipeTypes: fallback });
}

export async function POST(req: Request) {
  await ensureSchema();

  try {
    const body = await req.json();
    const currentRes = await GET();
    const current = (await currentRes.json())?.types || DEFAULT_TYPES;

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

    // Persist to local JSON fallback
    saveLocalFallback(updated);

    // Persist to admin_settings
    try {
      if (isPostgres()) {
        await query(`
          INSERT INTO admin_settings (id, recipe_types, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            recipe_types = EXCLUDED.recipe_types,
            updated_at = NOW();
        `, [JSON.stringify(updated)]);
      } else {
        await query(`
          INSERT INTO admin_settings (id, recipe_types, updated_at)
          VALUES ('primary_settings', ?, NOW())
          ON DUPLICATE KEY UPDATE
            recipe_types = VALUES(recipe_types),
            updated_at = NOW();
        `, [JSON.stringify(updated)]);
      }
    } catch (_) {}

    return NextResponse.json({ success: true, types: updated, recipeTypes: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  await ensureSchema();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    const currentRes = await GET();
    const current = (await currentRes.json())?.types || DEFAULT_TYPES;
    const filtered = current.filter((item: any) => {
      if (id && item.id === id) return false;
      if (slug && item.slug === slug) return false;
      return true;
    });

    saveLocalFallback(filtered);

    try {
      if (isPostgres()) {
        await query(`
          UPDATE admin_settings
          SET recipe_types = $1::jsonb, updated_at = NOW()
          WHERE id = 'primary_settings';
        `, [JSON.stringify(filtered)]);
        if (id) await query(`DELETE FROM recipe_types WHERE id = $1;`, [id]);
      } else {
        await query(`
          UPDATE admin_settings
          SET recipe_types = ?, updated_at = NOW()
          WHERE id = 'primary_settings';
        `, [JSON.stringify(filtered)]);
        if (id) await query(`DELETE FROM recipe_types WHERE id = ?;`, [id]);
      }
    } catch (_) {}

    return NextResponse.json({ success: true, types: filtered, recipeTypes: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
