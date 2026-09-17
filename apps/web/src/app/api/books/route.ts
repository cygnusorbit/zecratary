import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureBooksTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS recipe_books (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64),
        created_by VARCHAR(255),
        creator_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_color VARCHAR(255) DEFAULT '',
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_recipe_books_user_id ON recipe_books(user_id);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureBooksTable();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let sql = 'SELECT * FROM recipe_books';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ' WHERE user_id = $1 OR user_id = \'usr_admin_1\' OR user_id IS NULL';
    }

    sql += ' ORDER BY created_at ASC';

    const books = await query(sql, params);

    // Dynamic count calculation from saved_recipes
    const countRows = await query(`
      SELECT book_id, COUNT(*) as count 
      FROM saved_recipes 
      WHERE book_id IS NOT NULL 
      GROUP BY book_id
    `);
    const countMap: Record<string, number> = {};
    countRows.forEach((r: any) => {
      countMap[r.book_id] = Number(r.count) || 0;
    });

    const formatted = books.map((b: any) => ({
      id: b.id,
      userId: b.user_id || 'usr_admin_1',
      createdBy: b.created_by || '',
      creatorName: b.creator_name || 'Chef',
      title: b.title || 'Untitled Cookbook',
      description: b.description || '',
      coverColor: b.cover_color || 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600',
      recipeCount: countMap[b.id] !== undefined ? countMap[b.id] : (Array.isArray(b.recipe_ids) ? b.recipe_ids.length : 0),
      createdAt: b.created_at || new Date().toISOString()
    }));

    return NextResponse.json(
      { success: true, books: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureBooksTable();
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.books || [body.book || body]);

    for (const b of items) {
      if (!b || !b.id || !b.title) continue;
      const targetUserId = b.userId || b.user_id || 'usr_admin_1';

      await query(`
        INSERT INTO recipe_books (
          id, user_id, created_by, creator_name, title, description, cover_color, recipe_ids, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_color = EXCLUDED.cover_color,
          recipe_ids = COALESCE(EXCLUDED.recipe_ids, recipe_books.recipe_ids),
          updated_at = NOW();
      `, [
        b.id,
        targetUserId,
        b.createdBy || '',
        b.creatorName || '',
        b.title.trim(),
        b.description || '',
        b.coverColor || '',
        JSON.stringify(b.recipeIds || b.recipe_ids || [])
      ]);
    }

    return NextResponse.json({ success: true, message: 'Cookbook(s) saved in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Book ID is required' }, { status: 400 });
    }

    const cleanId = id.trim();
    await query('DELETE FROM recipe_books WHERE id = $1', [cleanId]);
    await query('UPDATE saved_recipes SET book_id = NULL WHERE book_id = $1', [cleanId]);

    return NextResponse.json({ success: true, message: 'Book deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
