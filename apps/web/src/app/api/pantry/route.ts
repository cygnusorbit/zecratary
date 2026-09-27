import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getFallbackPath(): string {
  const p1 = path.join(process.cwd(), 'apps', 'web', 'data', 'pantry_items.json');
  const p2 = path.join(process.cwd(), 'data', 'pantry_items.json');
  return fs.existsSync(path.dirname(p1)) ? p1 : p2;
}

function readFallback(userId?: string): any[] {
  try {
    const fPath = getFallbackPath();
    if (!fs.existsSync(fPath)) return [];
    const raw = fs.readFileSync(fPath, 'utf-8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    if (!userId) return items;
    return items.filter((i: any) => i.userId === userId || i.createdBy === userId);
  } catch {
    return [];
  }
}

function writeFallback(items: any[]): void {
  try {
    const fPath = getFallbackPath();
    fs.mkdirSync(path.dirname(fPath), { recursive: true });
    fs.writeFileSync(fPath, JSON.stringify(items, null, 2), 'utf-8');
  } catch {}
}

async function getDbQuery() {
  try {
    const dbMod = await import('@/lib/db');
    if (typeof dbMod.query === 'function') return dbMod.query;
    if (dbMod.default && typeof dbMod.default.query === 'function') return dbMod.default.query.bind(dbMod.default);
    if (dbMod.pool && typeof dbMod.pool.query === 'function') return dbMod.pool.query.bind(dbMod.pool);
  } catch {}
  return null;
}

async function ensureTable(dbQuery: any) {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS pantry_items (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(100),
        unit VARCHAR(100),
        category VARCHAR(100),
        expiry_date VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {}
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || '';
  const dbQuery = await getDbQuery();

  if (dbQuery && userId) {
    try {
      await ensureTable(dbQuery);
      const res = await dbQuery(
        `SELECT 
           id, 
           user_id AS "userId", 
           created_by AS "createdBy", 
           name, 
           quantity, 
           unit, 
           category, 
           expiry_date AS "expiryDate",
           created_at AS "createdAt"
         FROM pantry_items 
         WHERE user_id = $1 OR created_by = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      return NextResponse.json({ success: true, items: res.rows || [] });
    } catch {}
  }

  return NextResponse.json({ success: true, items: readFallback(userId) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId || '';
    const items = Array.isArray(body.items) ? body.items : (body.item ? [body.item] : []);
    const dbQuery = await getDbQuery();

    if (dbQuery && userId) {
      try {
        await ensureTable(dbQuery);
        // Replace user records with updated list
        if (items.length > 0) {
          const itemIds = items.map((i: any) => i.id);
          await dbQuery(
            `DELETE FROM pantry_items WHERE (user_id = $1 OR created_by = $1) AND NOT (id = ANY($2))`,
            [userId, itemIds]
          );

          for (const item of items) {
            await dbQuery(
              `INSERT INTO pantry_items (id, user_id, created_by, name, quantity, unit, category, expiry_date, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 quantity = EXCLUDED.quantity,
                 unit = EXCLUDED.unit,
                 category = EXCLUDED.category,
                 expiry_date = EXCLUDED.expiry_date,
                 updated_at = NOW()`,
              [
                item.id,
                item.userId || userId,
                item.createdBy || userId,
                item.name,
                item.quantity || '1',
                item.unit || 'Unit',
                item.category || 'Produce',
                item.expiryDate || ''
              ]
            );
          }
        } else {
          // If items array is empty, purge user's pantry
          await dbQuery(`DELETE FROM pantry_items WHERE user_id = $1 OR created_by = $1`, [userId]);
        }
      } catch {}
    }

    // Synchronize fallback file
    const existing = readFallback();
    const others = existing.filter((i: any) => i.userId !== userId && i.createdBy !== userId);
    writeFallback([...items, ...others]);

    return NextResponse.json({ success: true, count: items.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id') || '';
    let userId = searchParams.get('userId') || '';
    let ids: string[] = [];

    try {
      const body = await req.json();
      if (body.id) id = body.id;
      if (body.userId) userId = body.userId;
      if (Array.isArray(body.ids)) ids = body.ids;
    } catch {}

    if (id && !ids.includes(id)) {
      ids.push(id);
    }

    const dbQuery = await getDbQuery();
    if (dbQuery && ids.length > 0) {
      try {
        await ensureTable(dbQuery);
        if (userId) {
          await dbQuery(
            `DELETE FROM pantry_items WHERE id = ANY($1) AND (user_id = $2 OR created_by = $2)`,
            [ids, userId]
          );
        } else {
          await dbQuery(`DELETE FROM pantry_items WHERE id = ANY($1)`, [ids]);
        }
      } catch {}
    }

    // Clean fallback file
    const existing = readFallback();
    const remaining = existing.filter((i: any) => !ids.includes(i.id));
    writeFallback(remaining);

    return NextResponse.json({ success: true, deleted: ids });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
