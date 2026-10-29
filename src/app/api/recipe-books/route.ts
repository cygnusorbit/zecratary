import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';


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

async function ensureBooksTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS recipe_books (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT 'usr_admin_1',
        created_by VARCHAR(255) DEFAULT 'admin@zecratary.com',
        creator_name VARCHAR(255) DEFAULT 'Chef',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_color VARCHAR(255) DEFAULT 'bg-gradient-to-r from-emerald-600 to-teal-600',
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cookbooks (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'usr_admin_1',
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        cover_color VARCHAR(255) DEFAULT 'bg-gradient-to-r from-emerald-600 to-teal-600',
        recipe_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE recipe_books ADD COLUMN IF NOT EXISTS cover_color VARCHAR(255) DEFAULT 'bg-gradient-to-r from-emerald-600 to-teal-600';
      ALTER TABLE cookbooks ADD COLUMN IF NOT EXISTS cover_color VARCHAR(255) DEFAULT 'bg-gradient-to-r from-emerald-600 to-teal-600';
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_id VARCHAR(128);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureBooksTable();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');

    let sql = 'SELECT * FROM recipe_books';
    const params: any[] = [];

    if (userId && userId !== 'all') {
      sql += ' WHERE user_id = $1 OR created_by = $1 OR user_id = \'usr_admin_1\' OR user_id IS NULL OR user_id = \'\'';
      params.push(userId);
    }
    sql += ' ORDER BY created_at ASC;';

    const books = await query(sql, params);

    // Compute live recipe counts dynamically from saved_recipes
    const countMap: Record<string, number> = {};
    try {
      const countRows = await query(`
        SELECT book_id, COUNT(*) as count 
        FROM saved_recipes 
        WHERE book_id IS NOT NULL AND book_id != ''
        GROUP BY book_id;
      `);
      countRows.forEach((r: any) => {
        countMap[r.book_id] = Number(r.count) || 0;
      });
    } catch (_) {}

    const formatted = books.map((b: any) => {
      const recipeIdsArray = Array.isArray(b.recipe_ids)
        ? b.recipe_ids
        : (typeof b.recipe_ids === 'string' ? JSON.parse(b.recipe_ids || '[]') : []);

      const actualCount = countMap[b.id] !== undefined ? countMap[b.id] : recipeIdsArray.length;

      return {
        id: b.id,
        userId: b.user_id || 'usr_admin_1',
        user_id: b.user_id || 'usr_admin_1',
        createdBy: b.created_by || '',
        creatorName: b.creator_name || 'Chef',
        title: b.title || 'Untitled Cookbook',
        name: b.title || 'Untitled Cookbook',
        description: b.description || '',
        coverColor: b.cover_color || 'bg-gradient-to-r from-emerald-600 to-teal-600',
        cover_color: b.cover_color || 'bg-gradient-to-r from-emerald-600 to-teal-600',
        recipeIds: recipeIdsArray,
        recipe_ids: recipeIdsArray,
        recipeCount: actualCount,
        recipes_count: actualCount,
        created_at: b.created_at,
        updated_at: b.updated_at,
      };
    });

    return NextResponse.json(
      { success: true, books: formatted, cookbooks: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Error in GET /api/books:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureBooksTable();
  try {
    const body = await req.json();
    const action = body.action;

    // Toggle recipe in book
    if (action === 'toggle_recipe' || action === 'add_recipe' || action === 'remove_recipe') {
      const bookId = body.bookId || body.book_id || body.id;
      const recipeId = body.recipeId || body.recipe_id;

      if (!bookId || !recipeId) {
        return NextResponse.json({ success: false, error: 'bookId and recipeId required' }, { status: 400 });
      }

      const bookRows: any = await query('SELECT recipe_ids FROM recipe_books WHERE id = $1;', [bookId]);
      const currentBook = (Array.isArray(bookRows) ? bookRows[0] : (bookRows as any)?.rows?.[0]);

      if (!currentBook) {
        return NextResponse.json({ success: false, error: 'Cookbook not found' }, { status: 404 });
      }

      let rList: string[] = Array.isArray(currentBook.recipe_ids)
        ? currentBook.recipe_ids
        : (typeof currentBook.recipe_ids === 'string' ? JSON.parse(currentBook.recipe_ids || '[]') : []);

      if (action === 'remove_recipe' || rList.includes(recipeId)) {
        rList = rList.filter((id: string) => id !== recipeId);
        await query('UPDATE saved_recipes SET book_id = NULL WHERE id = $1;', [recipeId]);
      } else {
        rList.push(recipeId);
        await query('UPDATE saved_recipes SET book_id = $1 WHERE id = $2;', [bookId, recipeId]);
      }

      const updatedJson = JSON.stringify(rList);
      await query('UPDATE recipe_books SET recipe_ids = $1::jsonb, updated_at = NOW() WHERE id = $2;', [updatedJson, bookId]);
      await query('UPDATE cookbooks SET recipe_ids = $1::jsonb, updated_at = NOW() WHERE id = $2;', [updatedJson, bookId]).catch(() => {});

      return NextResponse.json({ success: true, recipe_ids: rList, recipes_count: rList.length });
    }

    // Standard Create or Update (Isolated Single-Statement Queries)
    const items = Array.isArray(body) ? body : (body.books || [body.book || body]);

    for (const b of items) {
      if (!b || !b.id || !b.title) continue;
      const targetUserId = b.userId || b.user_id || 'usr_admin_1';
      const title = b.title.trim();
      const desc = b.description || '';
      const color = b.coverColor || b.cover_color || 'bg-gradient-to-r from-emerald-600 to-teal-600';
      const recipeIds = JSON.stringify(Array.isArray(b.recipeIds) ? b.recipeIds : (Array.isArray(b.recipe_ids) ? b.recipe_ids : []));

      // 1. Single statement for recipe_books
      await query(`
        INSERT INTO recipe_books (
          id, user_id, created_by, creator_name, title, description, cover_color, recipe_ids, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_color = EXCLUDED.cover_color,
          recipe_ids = EXCLUDED.recipe_ids,
          updated_at = NOW();
      `, [
        b.id,
        targetUserId,
        b.createdBy || b.created_by || 'admin@zecratary.com',
        b.creatorName || b.creator_name || 'Chef',
        title,
        desc,
        color,
        recipeIds
      ]);

      // 2. Single statement for cookbooks
      await query(`
        INSERT INTO cookbooks (
          id, user_id, title, description, cover_color, recipe_ids, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cover_color = EXCLUDED.cover_color,
          recipe_ids = EXCLUDED.recipe_ids,
          updated_at = NOW();
      `, [
        b.id,
        targetUserId,
        title,
        desc,
        color,
        recipeIds
      ]);
    }

    return NextResponse.json({ success: true, message: 'Cookbook saved in PostgreSQL' });
  } catch (err: any) {
    console.error('Error in POST /api/books:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureBooksTable();
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id') || searchParams.get('bookId');

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
    await query('DELETE FROM recipe_books WHERE id = $1;', [cleanId]);
    await query('DELETE FROM cookbooks WHERE id = $1;', [cleanId]).catch(() => {});
    await query('UPDATE saved_recipes SET book_id = NULL WHERE book_id = $1;', [cleanId]);

    return NextResponse.json({ success: true, message: 'Cookbook deleted from PostgreSQL' });
  } catch (err: any) {
    console.error('Error in DELETE /api/books:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
