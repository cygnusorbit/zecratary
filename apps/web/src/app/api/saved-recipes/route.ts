import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureColumns() {
  try {
    await query(`
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS book_id VARCHAR(128);
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS is_cooked BOOLEAN DEFAULT FALSE;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureColumns();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const bookId = searchParams.get('bookId');

    let sql = `SELECT * FROM saved_recipes WHERE 1=1`;
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND (user_id = $${params.length} OR user_id = 'usr_admin_1' OR user_id IS NULL OR is_public = TRUE)`;
    }

    if (category && category !== 'all' && category !== 'All Types') {
      params.push(category);
      sql += ` AND LOWER(recipe_type) = LOWER($${params.length})`;
    }

    if (bookId) {
      params.push(bookId);
      sql += ` AND book_id = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);

    const formatted = rows.map((r: any) => {
      let ingredients = r.ingredients;
      if (typeof ingredients === 'string') {
        try { ingredients = JSON.parse(ingredients); } catch (_) { ingredients = []; }
      }

      let directions = r.directions;
      if (typeof directions === 'string') {
        try { directions = JSON.parse(directions); } catch (_) { directions = []; }
      }

      let nutrition = r.nutrition;
      if (typeof nutrition === 'string') {
        try { nutrition = JSON.parse(nutrition); } catch (_) { nutrition = {}; }
      }

      let tags = r.tags;
      if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch (_) { tags = []; }
      }

      const activeBookId = r.book_id || r.bookId || null;

      return {
        ...r,
        id: r.id,
        userId: r.user_id || r.userId || 'usr_admin_1',
        user_id: r.user_id || r.userId || 'usr_admin_1',
        title: r.title || r.name || 'Untitled Recipe',
        name: r.title || r.name || 'Untitled Recipe',
        description: r.description || '',
        recipeType: r.recipe_type || 'Main Dish',
        category: r.recipe_type || 'Main Dish',
        recipe_type: r.recipe_type || 'Main Dish',
        cuisine: r.cuisine || '',
        prepTime: r.prep_time || '15',
        cookTime: r.cook_time || '25',
        prepTimeMinutes: Number(r.prep_time) || 15,
        cookTimeMinutes: Number(r.cook_time) || 25,
        servings: Number(r.servings) || 4,
        difficulty: r.difficulty || 'Medium',
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        directions: Array.isArray(directions) ? directions : [],
        instructions: Array.isArray(directions) ? directions : [],
        steps: Array.isArray(directions) ? directions : [],
        nutrition: nutrition || {},
        tags: Array.isArray(tags) ? tags : [],
        imageUrl: r.image_url || r.imageUrl || r.image || '',
        image: r.image_url || r.imageUrl || r.image || '',
        image_url: r.image_url || r.imageUrl || r.image || '',
        isPublic: Boolean(r.is_public),
        is_public: Boolean(r.is_public),
        bookId: activeBookId,
        book_id: activeBookId,
        isFavorite: Boolean(r.is_favorite),
        isCooked: Boolean(r.is_cooked),
        rating: Number(r.rating) || 0,
        note: r.note || '',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
      };
    });

    return NextResponse.json(
      { success: true, recipes: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureColumns();
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.recipes || [body.recipe || body]);

    for (const item of items) {
      if (!item) continue;
      const id = item.id || 'rcp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const targetUserId = item.userId || item.user_id || body.userId || body.user_id || 'usr_admin_1';

      try {
        const userCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [targetUserId]);
        if (userCheck.length === 0) {
          await query(`
            INSERT INTO users (id, name, email, role, subscription_plan)
            VALUES ($1, 'User', $2, 'user', 'taster')
            ON CONFLICT (id) DO NOTHING;
          `, [targetUserId, targetUserId.includes('@') ? targetUserId : `${targetUserId}@zecratary.local`]);
        }
      } catch (_) {}

      let ingredients = item.ingredients;
      if (typeof ingredients === 'string') {
        try { ingredients = JSON.parse(ingredients); } catch (_) { ingredients = [ingredients]; }
      }
      if (!Array.isArray(ingredients)) ingredients = [];

      let directions = item.directions || item.instructions || item.steps;
      if (typeof directions === 'string') {
        try { directions = JSON.parse(directions); } catch (_) { directions = [directions]; }
      }
      if (!Array.isArray(directions)) directions = [];

      let tags = item.tags;
      if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch (_) { tags = [tags]; }
      }
      if (!Array.isArray(tags)) tags = [];

      let nutrition = item.nutrition || item.macros || {};
      if (typeof nutrition === 'string') {
        try { nutrition = JSON.parse(nutrition); } catch (_) { nutrition = {}; }
      }

      const bookId = item.bookId !== undefined ? item.bookId : (item.book_id !== undefined ? item.book_id : null);

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public,
          book_id, is_favorite, is_cooked, rating, note, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, $17, $18, $19, $20, $21, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, saved_recipes.user_id),
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          recipe_type = EXCLUDED.recipe_type,
          cuisine = EXCLUDED.cuisine,
          prep_time = EXCLUDED.prep_time,
          cook_time = EXCLUDED.cook_time,
          servings = EXCLUDED.servings,
          difficulty = EXCLUDED.difficulty,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          nutrition = EXCLUDED.nutrition,
          tags = EXCLUDED.tags,
          image_url = EXCLUDED.image_url,
          is_public = EXCLUDED.is_public,
          book_id = EXCLUDED.book_id,
          is_favorite = COALESCE(EXCLUDED.is_favorite, saved_recipes.is_favorite),
          is_cooked = COALESCE(EXCLUDED.is_cooked, saved_recipes.is_cooked),
          rating = COALESCE(EXCLUDED.rating, saved_recipes.rating),
          note = COALESCE(EXCLUDED.note, saved_recipes.note),
          updated_at = NOW();
      `, [
        id,
        targetUserId,
        item.title || item.name || 'Untitled Recipe',
        item.description || '',
        item.recipeType || item.category || item.recipe_type || 'Main Dish',
        item.cuisine || '',
        String(item.prepTime || item.prepTimeMinutes || item.prep_time || '15'),
        String(item.cookTime || item.cookTimeMinutes || item.cook_time || '25'),
        String(item.servings || '4'),
        item.difficulty || 'Medium',
        JSON.stringify(ingredients),
        JSON.stringify(directions),
        JSON.stringify(nutrition),
        JSON.stringify(tags),
        item.imageUrl || item.image || item.image_url || '',
        Boolean(item.isPublic || item.is_public),
        bookId,
        Boolean(item.isFavorite || item.is_favorite),
        Boolean(item.isCooked || item.is_cooked),
        Number(item.rating) || 0,
        item.note || ''
      ]);
    }

    return NextResponse.json({ success: true, message: 'Recipe(s) saved to PostgreSQL.' });
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
      return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 });
    }

    await query('DELETE FROM saved_recipes WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Recipe removed from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
