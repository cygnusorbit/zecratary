// @ts-nocheck
import { NextResponse } from 'next/server';
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


function getPantryFilePath() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'pantry_items.json');
}

function readLocalPantry(): any[] {
  try {
    const p = getPantryFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw) || [];
    }
  } catch (_) {}
  return [];
}

function writeLocalPantry(items: any[]) {
  try {
    const p = getPantryFilePath();
    fs.writeFileSync(p, JSON.stringify(items, null, 2), 'utf-8');
  } catch (_) {}
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    // 1. Try PostgreSQL if pool configured
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(`
          CREATE TABLE IF NOT EXISTS pantry_items (
            id VARCHAR(120) PRIMARY KEY,
            user_id VARCHAR(120) NOT NULL,
            created_by VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            quantity VARCHAR(64) DEFAULT '1',
            unit VARCHAR(64) DEFAULT 'Unit',
            category VARCHAR(120) DEFAULT 'Produce',
            expiry_date VARCHAR(64),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_pantry_user ON pantry_items(user_id);
        `);

        const sql = userId
          ? 'SELECT * FROM pantry_items WHERE user_id = $1 ORDER BY name ASC'
          : 'SELECT * FROM pantry_items ORDER BY name ASC';
        const params = userId ? [userId] : [];
        const result = await query(sql, params);

        if (result && Array.isArray(result.rows)) {
          const items = result.rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            createdBy: r.created_by,
            name: r.name,
            quantity: r.quantity,
            unit: r.unit,
            category: r.category,
            expiryDate: r.expiry_date
          }));
          return NextResponse.json({ success: true, items });
        }
      }
    } catch (_) {}

    // 2. Fallback to Local JSON store
    const all = readLocalPantry();
    const filtered = userId ? all.filter(i => !i.userId || i.userId === userId) : all;
    return NextResponse.json({ success: true, items: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, items: [], error: err.message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Items array required' }, { status: 400 });
    }

    // 1. Try PostgreSQL persistence
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function' && userId) {
        await query('DELETE FROM pantry_items WHERE user_id = $1', [userId]);
        for (const it of items) {
          await query(`
            INSERT INTO pantry_items (id, user_id, created_by, name, quantity, unit, category, expiry_date, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              quantity = EXCLUDED.quantity,
              unit = EXCLUDED.unit,
              category = EXCLUDED.category,
              expiry_date = EXCLUDED.expiry_date,
              updated_at = CURRENT_TIMESTAMP
          `, [
            it.id,
            userId,
            it.createdBy || userId,
            it.name,
            String(it.quantity || '1'),
            it.unit || 'Unit',
            it.category || 'Produce',
            it.expiryDate || ''
          ]);
        }
      }
    } catch (_) {}

    // 2. Update local fallback JSON
    const existing = readLocalPantry();
    const retained = userId ? existing.filter(i => i.userId && i.userId !== userId) : [];
    writeLocalPantry([...retained, ...items]);

    return NextResponse.json({ success: true, count: items.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
