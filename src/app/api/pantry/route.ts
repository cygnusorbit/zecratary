import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensurePantryTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pantry_items (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(100),
        created_by VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(50) DEFAULT '1',
        unit VARCHAR(50) DEFAULT 'Unit',
        category VARCHAR(100) DEFAULT 'Produce',
        expiry_date VARCHAR(50) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensurePantryTable();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || '';

    let sql = 'SELECT * FROM pantry_items';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ' WHERE user_id = $1 OR created_by = $1 OR user_id = \'usr_admin_1\' OR user_id IS NULL';
    }

    sql += ' ORDER BY created_at DESC';

    const rows: any = await query(sql, params);
    const rawItems = Array.isArray(rows) ? rows : (rows?.rows || []);

    const formatted = rawItems.map((r: any) => ({
      id: r.id,
      userId: r.user_id || 'usr_admin_1',
      user_id: r.user_id || 'usr_admin_1',
      createdBy: r.created_by || '',
      created_by: r.created_by || '',
      name: r.name,
      item: r.name,
      quantity: r.quantity || '1',
      unit: r.unit || 'Unit',
      category: r.category || 'Produce',
      expiryDate: r.expiry_date || '',
      expiry_date: r.expiry_date || '',
      createdAt: r.created_at || new Date().toISOString()
    }));

    return NextResponse.json(
      { success: true, items: formatted, pantry: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: true, items: [], pantry: [] });
  }
}

export async function POST(req: NextRequest) {
  await ensurePantryTable();
  try {
    const body = await req.json();
    const targetUserId = body.userId || body.user_id || 'usr_admin_1';
    const userEmail = body.userEmail || body.createdBy || 'admin@zecratary.com';

    const rawItems = Array.isArray(body) 
      ? body 
      : Array.isArray(body.items) 
        ? body.items 
        : [body.item || body];

    for (const item of rawItems) {
      if (!item || !item.name) continue;
      const itemId = item.id || ('p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));

      await query(`
        INSERT INTO pantry_items (id, user_id, created_by, name, quantity, unit, category, expiry_date, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          quantity = EXCLUDED.quantity,
          unit = EXCLUDED.unit,
          category = EXCLUDED.category,
          expiry_date = EXCLUDED.expiry_date,
          updated_at = NOW();
      `, [
        itemId,
        targetUserId,
        item.createdBy || userEmail,
        item.name.trim(),
        String(item.quantity ?? '1'),
        item.unit || 'Unit',
        item.category || 'Produce',
        item.expiryDate || item.expiry_date || ''
      ]);
    }

    return NextResponse.json({ success: true, message: 'Pantry items updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensurePantryTable();
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        if (Array.isArray(body.ids)) {
          for (const itemToDelete of body.ids) {
            await query('DELETE FROM pantry_items WHERE id = $1', [itemToDelete]);
          }
          return NextResponse.json({ success: true, message: 'Selected pantry items deleted' });
        }
        id = body?.id || id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
    }

    await query('DELETE FROM pantry_items WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Pantry item deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
