import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');

    let sql = 'SELECT * FROM saved_recipes WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND (user_id = $${params.length} OR user_id = 'usr_admin_1' OR user_id IS NULL OR is_public = TRUE)`;
    }

    if (category && category !== 'all' && category !== 'All Types') {
      params.push(category);
      sql += ` AND (LOWER(recipe_type) = LOWER($${params.length}) OR LOWER(recipe_type) LIKE LOWER($${params.length}))`;
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

      const prepMin = parseInt(String(r.prep_time || '15'), 10) || 15;
      const cookMin = parseInt(String(r.cook_time || '25'), 10) || 25;
      const cleanImg = r.image_url || r.imageUrl || r.image || '/uploads/recipes/default.jpg';
      const cleanTitle = r.title || r.name || 'Untitled Recipe';
      const cleanType = r.recipe_type || r.recipeType || r.category || 'Main Dish';

      return {
        ...r,
        id: r.id,
        userId: r.user_id || r.userId || 'usr_admin_1',
        user_id: r.user_id || r.userId || 'usr_admin_1',
        title: cleanTitle,
        name: cleanTitle,
        description: r.description || '',
        recipeType: cleanType,
        category: cleanType,
        recipe_type: cleanType,
        cuisine: r.cuisine || '',
        prepTime: r.prep_time || `${prepMin} mins`,
        cookTime: r.cook_time || `${cookMin} mins`,
        prepTimeMinutes: prepMin,
        cookTimeMinutes: cookMin,
        servings: parseInt(String(r.servings || '4'), 10) || 4,
        difficulty: r.difficulty || 'Medium',
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        directions: Array.isArray(directions) ? directions : [],
        instructions: Array.isArray(directions) ? directions : [],
        steps: Array.isArray(directions) ? directions : [],
        nutrition: nutrition || {},
        tags: Array.isArray(tags) ? tags : [cleanType],
        imageUrl: cleanImg,
        image: cleanImg,
        image_url: cleanImg,
        sourceUrl: r.source_url || r.sourceUrl || '',
        source_url: r.source_url || r.sourceUrl || '',
        isFavorite: Boolean(r.is_favorite || r.isFavorite),
        isCooked: Boolean(r.is_cooked || r.isCooked),
        rating: Number(r.rating) || 0,
        note: r.note || '',
        bookId: r.book_id || r.bookId || null,
        book_id: r.book_id || r.bookId || null,
        isPublic: Boolean(r.is_public || r.isPublic),
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
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.recipes || [body.recipe || body]);

    for (const item of items) {
      if (!item) continue;
      const rawTitle = item.title || item.name || 'Untitled Recipe';
      const cleanTitle = String(rawTitle).trim().slice(0, 250);
      const id = String(item.id || 'rec_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)).slice(0, 64);

      let targetUserId = item.userId || item.user_id || body.userId || body.user_id || 'usr_admin_1';

      // Verify foreign key integrity against users table
      let validUserId: string | null = null;
      if (targetUserId) {
        const u = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [targetUserId]);
        if (u.length > 0) {
          validUserId = u[0].id;
        } else {
          const adminUser = await query("SELECT id FROM users WHERE id = 'usr_admin_1' OR role = 'admin' LIMIT 1");
          if (adminUser.length > 0) {
            validUserId = adminUser[0].id;
          }
        }
      }

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

      const recipeType = String(item.recipeType || item.category || item.recipe_type || 'Main Dish').slice(0, 64);
      const cuisine = String(item.cuisine || '').slice(0, 64);
      const prepTime = String(item.prepTime || item.prepTimeMinutes || item.prep_time || '15').slice(0, 32);
      const cookTime = String(item.cookTime || item.cookTimeMinutes || item.cook_time || '25').slice(0, 32);
      const servings = String(item.servings || '4').slice(0, 32);
      const difficulty = String(item.difficulty || 'Medium').slice(0, 32);
      const imageUrl = String(item.imageUrl || item.image || item.image_url || '');
      const sourceUrl = String(item.sourceUrl || item.source_url || '');

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, recipe_type, cuisine, prep_time, cook_time,
          servings, difficulty, ingredients, directions, nutrition, tags, image_url, source_url, is_public, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, $17, NOW())
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
          source_url = EXCLUDED.source_url,
          is_public = EXCLUDED.is_public,
          updated_at = NOW();
      `, [
        id,
        validUserId,
        cleanTitle,
        item.description || '',
        recipeType,
        cuisine,
        prepTime,
        cookTime,
        servings,
        difficulty,
        JSON.stringify(ingredients),
        JSON.stringify(directions),
        JSON.stringify(nutrition),
        JSON.stringify(tags),
        imageUrl,
        sourceUrl,
        Boolean(item.isPublic || item.is_public)
      ]);
    }

    return NextResponse.json({ success: true, message: 'Recipe(s) saved to PostgreSQL.' });
  } catch (err: any) {
    console.error('[POST /api/recipes/saved] Error:', err);
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
