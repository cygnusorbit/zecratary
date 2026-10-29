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

async function ensureTableColumns() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS saved_recipes (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        title TEXT NOT NULL,
        description TEXT,
        recipe_type VARCHAR(100),
        category VARCHAR(100),
        cuisine VARCHAR(100),
        prep_time VARCHAR(50),
        cook_time VARCHAR(50),
        prep_time_minutes INTEGER DEFAULT 15,
        cook_time_minutes INTEGER DEFAULT 10,
        servings VARCHAR(50) DEFAULT '4',
        difficulty VARCHAR(50),
        ingredients JSONB DEFAULT '[]'::jsonb,
        directions JSONB DEFAULT '[]'::jsonb,
        instructions JSONB DEFAULT '[]'::jsonb,
        nutrition JSONB DEFAULT '{}'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        image_url TEXT,
        is_favorite BOOLEAN DEFAULT FALSE,
        is_cooked BOOLEAN DEFAULT FALSE,
        rating INTEGER DEFAULT 0,
        note TEXT DEFAULT '',
        book_id VARCHAR(255),
        book_ids JSONB DEFAULT '[]'::jsonb,
        source_url TEXT DEFAULT '',
        created_by VARCHAR(255),
        creator_name VARCHAR(255),
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_id VARCHAR(255);
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_cooked BOOLEAN DEFAULT FALSE;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS instructions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS directions JSONB DEFAULT '[]'::jsonb;
    `);
  } catch (e) {
    console.warn('[saved_recipes:ensureTable] warning:', e);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTableColumns();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let rows;
    if (userId) {
      rows = await query(
        'SELECT * FROM saved_recipes WHERE user_id = $1 OR user_id = \'usr_admin_1\' OR is_public = TRUE ORDER BY created_at DESC',
        [userId]
      );
    } else {
      rows = await query('SELECT * FROM saved_recipes ORDER BY created_at DESC');
    }

    const formatted = rows.map((r: any) => {
      let bIds = r.book_ids;
      if (typeof bIds === 'string') {
        try { bIds = JSON.parse(bIds); } catch (_) { bIds = []; }
      }
      if (!Array.isArray(bIds)) bIds = r.book_id ? [r.book_id] : [];

      return {
        ...r,
        bookId: r.book_id || (bIds[0] || null),
        book_id: r.book_id || (bIds[0] || null),
        bookIds: bIds,
        book_ids: bIds
      };
    });

    return NextResponse.json(
      { success: true, recipes: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, recipes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTableColumns();
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.recipes || [body.recipe || body]);

    for (const item of items) {
      if (!item) continue;
      const id = item.id || 'rcp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const validUserId = item.userId || item.user_id || 'usr_admin_1';

      const safeIngredients = Array.isArray(item.ingredients) ? item.ingredients : [];
      const safeInstructions = Array.isArray(item.instructions) 
        ? item.instructions 
        : (Array.isArray(item.directions) ? item.directions : []);
      const safeTags = Array.isArray(item.tags) ? item.tags : [];
      const safeNutrition = (item.nutrition && typeof item.nutrition === 'object') ? item.nutrition : {};

      const prepMinutes = Number(item.prepTimeMinutes || item.prep_time_minutes) || (parseInt(item.prepTime) || 15);
      const cookMinutes = Number(item.cookTimeMinutes || item.cook_time_minutes) || (parseInt(item.cookTime) || 10);
      const recipeType = item.recipeType || item.category || 'Main Dish';

      const bookId = item.bookId || item.book_id || null;
      let bookIds = item.bookIds || item.book_ids || (bookId ? [bookId] : []);
      if (!Array.isArray(bookIds)) bookIds = bookId ? [bookId] : [];

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, category, cuisine,
          prep_time, cook_time, prep_time_minutes, cook_time_minutes,
          servings, difficulty, ingredients, directions, instructions,
          nutrition, tags, image_url, is_favorite, is_cooked,
          rating, note, book_id, book_ids, source_url, created_by, creator_name,
          is_public, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14::jsonb, $15::jsonb, $16::jsonb,
          $17::jsonb, $18::jsonb, $19, $20, $21,
          $22, $23, $24, $25::jsonb, $26, $27, $28,
          $29, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          recipe_type = EXCLUDED.recipe_type,
          category = EXCLUDED.category,
          book_id = COALESCE(EXCLUDED.book_id, saved_recipes.book_id),
          book_ids = COALESCE(EXCLUDED.book_ids, saved_recipes.book_ids),
          updated_at = NOW();
      `, [
        id,
        validUserId,
        item.title || item.name || 'Untitled Recipe',
        item.description || '',
        recipeType,
        recipeType,
        item.cuisine || '',
        String(prepMinutes) + 'm',
        String(cookMinutes) + 'm',
        prepMinutes,
        cookMinutes,
        String(item.servings || '4'),
        item.difficulty || '',
        JSON.stringify(safeIngredients),
        JSON.stringify(safeInstructions),
        JSON.stringify(safeInstructions),
        JSON.stringify(safeNutrition),
        JSON.stringify(safeTags),
        item.imageUrl || item.image || item.image_url || '',
        Boolean(item.isFavorite ?? item.is_favorite),
        Boolean(item.isCooked ?? item.is_cooked),
        Number(item.rating) || 0,
        item.note || '',
        bookId,
        JSON.stringify(bookIds),
        item.sourceUrl || item.source_url || '',
        item.createdBy || item.created_by || validUserId,
        item.creatorName || item.creator_name || 'Chef',
        Boolean(item.isPublic ?? item.is_public)
      ]);
    }

    return NextResponse.json({ success: true, message: 'Recipe(s) saved to PostgreSQL.' });
  } catch (err: any) {
    console.error('[saved_recipes:POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureTableColumns();
    const body = await req.json();
    const id = body.id || body.recipeId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.bookId !== undefined || body.book_id !== undefined) {
      const bId = body.bookId !== undefined ? body.bookId : body.book_id;
      values.push(bId || null);
      updates.push(`book_id = $${values.length}`);
    }

    if (body.bookIds !== undefined || body.book_ids !== undefined) {
      const bIds = body.bookIds !== undefined ? body.bookIds : body.book_ids;
      values.push(JSON.stringify(Array.isArray(bIds) ? bIds : []));
      updates.push(`book_ids = $${values.length}::jsonb`);
    }

    if (body.isFavorite !== undefined || body.is_favorite !== undefined) {
      values.push(Boolean(body.isFavorite ?? body.is_favorite));
      updates.push(`is_favorite = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'No updates provided' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);
    await query(`UPDATE saved_recipes SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

    return NextResponse.json({ success: true, message: 'Recipe updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTableColumns();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await query('DELETE FROM saved_recipes WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Recipe deleted.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
