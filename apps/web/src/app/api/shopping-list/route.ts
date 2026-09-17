import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS shopping_items (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        amount VARCHAR(64) DEFAULT '1',
        unit VARCHAR(64) DEFAULT '',
        category VARCHAR(64) DEFAULT 'Produce',
        staple BOOLEAN DEFAULT FALSE,
        checked BOOLEAN DEFAULT FALSE,
        recipe_id VARCHAR(64),
        recipe_title VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let sql = 'SELECT * FROM shopping_items WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND (user_id = $${params.length} OR user_id = 'usr_admin_1' OR user_id IS NULL)`;
    }

    sql += ' ORDER BY created_at ASC';

    const rows = await query(sql, params);

    const formatted = rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id || 'usr_admin_1',
      user_id: r.user_id || 'usr_admin_1',
      name: r.name || '',
      item: r.name || '',
      amount: r.amount || '1',
      unit: r.unit || '',
      category: r.category || 'Produce',
      staple: Boolean(r.staple),
      checked: Boolean(r.checked),
      recipeId: r.recipe_id || null,
      recipeTitle: r.recipe_title || null,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString()
    }));

    return NextResponse.json(
      { success: true, items: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.items || [body.item || body]);

    for (const item of items) {
      if (!item || !item.name) continue;
      const id = String(item.id || 's_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)).slice(0, 64);
      const targetUserId = item.userId || item.user_id || body.userId || body.user_id || 'usr_admin_1';
      const name = String(item.name || item.item || '').trim().slice(0, 255);
      const amount = String(item.amount || item.quantity || '1').slice(0, 64);
      const unit = String(item.unit || '').slice(0, 64);
      const category = String(item.category || 'Produce').slice(0, 64);
      const staple = Boolean(item.staple);
      const checked = Boolean(item.checked || item.completed);
      const recipeId = item.recipeId || item.recipe_id ? String(item.recipeId || item.recipe_id).slice(0, 64) : null;
      const recipeTitle = item.recipeTitle || item.recipe_title ? String(item.recipeTitle || item.recipe_title).slice(0, 255) : null;

      await query(`
        INSERT INTO shopping_items (
          id, user_id, name, amount, unit, category, staple, checked, recipe_id, recipe_title, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, shopping_items.user_id),
          name = EXCLUDED.name,
          amount = EXCLUDED.amount,
          unit = EXCLUDED.unit,
          category = EXCLUDED.category,
          staple = EXCLUDED.staple,
          checked = EXCLUDED.checked,
          recipe_id = EXCLUDED.recipe_id,
          recipe_title = EXCLUDED.recipe_title,
          updated_at = NOW();
      `, [id, targetUserId, name, amount, unit, category, staple, checked, recipeId, recipeTitle]);
    }

    return NextResponse.json({ success: true, message: 'Shopping item(s) saved to PostgreSQL.' });
  } catch (err: any) {
    console.error('[POST /api/shopping] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let action = searchParams.get('action');
    let userId = searchParams.get('userId');

    let bodyIds: string[] = [];
    try {
      const body = await req.json();
      if (body) {
        id = body.id || id;
        action = body.action || action;
        userId = body.userId || userId;
        if (Array.isArray(body.ids)) bodyIds = body.ids;
      }
    } catch (_) {}

    if (action === 'remove_completed') {
      if (bodyIds.length > 0) {
        await query('DELETE FROM shopping_items WHERE id = ANY($1::text[])', [bodyIds]);
        await query('DELETE FROM shopping_list WHERE id = ANY($1::text[])', [bodyIds]).catch(() => {});
      } else {
        const sql = userId
          ? "DELETE FROM shopping_items WHERE checked = TRUE AND (user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL)"
          : "DELETE FROM shopping_items WHERE checked = TRUE";
        const params = userId ? [userId] : [];
        await query(sql, params);
        await query(sql.replace('shopping_items', 'shopping_list'), params).catch(() => {});
      }
      return NextResponse.json({ success: true, message: 'Completed items removed from PostgreSQL.' });
    }

    if (bodyIds.length > 0) {
      await query('DELETE FROM shopping_items WHERE id = ANY($1::text[])', [bodyIds]);
      await query('DELETE FROM shopping_list WHERE id = ANY($1::text[])', [bodyIds]).catch(() => {});
      return NextResponse.json({ success: true, message: 'Shopping items removed from PostgreSQL.' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
    }

    const cleanId = id.trim();
    await query('DELETE FROM shopping_items WHERE id = $1', [cleanId]);
    await query('DELETE FROM shopping_list WHERE id = $1', [cleanId]).catch(() => {});

    return NextResponse.json({ success: true, message: 'Shopping item removed from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
