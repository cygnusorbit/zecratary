import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { saveRecipeToJsonFile, loadAllRecipeJsonFiles, updateRecipePublicVisibility } from '@/lib/recipeFiles';

export const dynamic = 'force-dynamic';

async function ensureColumns() {
  try {
    await query(`
      ALTER TABLE saved_recipes 
      ADD COLUMN IF NOT EXISTS user_id TEXT,
      ADD COLUMN IF NOT EXISTS created_by TEXT,
      ADD COLUMN IF NOT EXISTS creator_name TEXT,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_cooked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS book_id TEXT,
      ADD COLUMN IF NOT EXISTS source_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_saved_recipes_public ON saved_recipes(is_public);
      CREATE INDEX IF NOT EXISTS idx_saved_recipes_owner ON saved_recipes(user_id, created_by);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    await ensureColumns();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();
    const email = searchParams.get('email')?.trim();
    const tab = searchParams.get('tab')?.trim();
    const isMarketplace = tab === 'marketplace' || searchParams.get('marketplace') === 'true';

    let sql = `SELECT * FROM saved_recipes WHERE `;
    const params: any[] = [];

    if (isMarketplace) {
      // Marketplace tab: Return all public recipes
      sql += `is_public = TRUE`;
    } else if (userId || email) {
      // Personal tab: Return user-owned recipes
      const conds: string[] = [];
      if (userId) {
        params.push(userId);
        conds.push(`user_id = $${params.length} OR created_by = $${params.length}`);
      }
      if (email && email !== userId) {
        params.push(email);
        conds.push(`user_id = $${params.length} OR created_by = $${params.length}`);
      }
      sql += `(${conds.join(' OR ')})`;
    } else {
      sql += `1=1`;
    }

    sql += ' ORDER BY created_at DESC';

    let dbRows: any[] = [];
    try {
      dbRows = await query(sql, params);
    } catch (_) {}

    // Also load filesystem JSON recipes and merge
    const jsonRecipes = loadAllRecipeJsonFiles();
    const recipeMap = new Map<string, any>();

    // Add DB records
    dbRows.forEach((r: any) => {
      let ing = r.ingredients;
      if (typeof ing === 'string') {
        try { ing = JSON.parse(ing); } catch (_) { ing = []; }
      }
      let dir = r.directions || r.instructions;
      if (typeof dir === 'string') {
        try { dir = JSON.parse(dir); } catch (_) { dir = []; }
      }

      recipeMap.set(r.id, {
        id: r.id,
        userId: r.user_id || userId,
        user_id: r.user_id || userId,
        createdBy: r.created_by || r.user_id,
        created_by: r.created_by || r.user_id,
        creatorName: r.creator_name || 'Chef',
        creator_name: r.creator_name || 'Chef',
        ownerId: r.user_id || userId,
        ownerName: r.creator_name || 'Chef',
        ownerEmail: r.created_by || `${r.user_id}@zecratary.local`,
        title: r.title || 'Untitled Recipe',
        description: r.description || '',
        recipeType: r.recipe_type || 'Main Dish',
        cuisine: r.cuisine || '',
        prepMinutes: Number(r.prep_time) || 15,
        cookMinutes: Number(r.cook_time) || 25,
        servings: Number(r.servings) || 4,
        difficulty: r.difficulty || 'Medium',
        ingredients: Array.isArray(ing) ? ing : [],
        instructions: Array.isArray(dir) ? dir : [],
        imageUrl: r.image_url || '/recipes/images/default.jpg',
        image: r.image_url || '/recipes/images/default.jpg',
        sourceUrl: r.source_url || '',
        isPublic: Boolean(r.is_public),
        is_public: Boolean(r.is_public),
        isFavorite: Boolean(r.is_favorite),
        isCooked: Boolean(r.is_cooked),
        rating: Number(r.rating) || 5,
        bookId: r.book_id || null,
        createdAt: r.created_at || new Date().toISOString()
      });
    });

    // Add or merge filesystem JSON records
    jsonRecipes.forEach(jr => {
      if (isMarketplace && !jr.isPublic) return;
      if (!isMarketplace && userId && jr.ownerId !== userId && jr.ownerEmail !== email) return;

      if (!recipeMap.has(jr.id)) {
        recipeMap.set(jr.id, jr);
      }
    });

    return NextResponse.json({
      success: true,
      recipes: Array.from(recipeMap.values())
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureColumns();
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.recipes || [body.recipe || body]);

    for (const item of items) {
      if (!item) continue;
      const targetUserId = (item.userId || item.user_id || body.userId || 'guest').trim();
      const createdBy = (item.createdBy || item.created_by || item.ownerEmail || targetUserId).trim();
      const creatorName = (item.creatorName || item.creator_name || item.ownerName || 'Chef').trim();
      const id = item.id || 'rec_' + Date.now().toString(36);
      const isPublic = Boolean(item.isPublic ?? item.is_public ?? false);

      // 1. Save individual JSON file to /recipes
      saveRecipeToJsonFile(item, { id: targetUserId, name: creatorName, email: createdBy });

      // 2. Persist to PostgreSQL & MySQL
      try {
        const ingredients = Array.isArray(item.ingredients) ? JSON.stringify(item.ingredients) : '[]';
        const directions = Array.isArray(item.instructions || item.directions) 
          ? JSON.stringify(item.instructions || item.directions) : '[]';

        await query(`
          INSERT INTO saved_recipes (
            id, user_id, created_by, creator_name, title, description, recipe_type, cuisine, prep_time, cook_time,
            servings, difficulty, ingredients, directions, image_url, is_public,
            is_favorite, is_cooked, rating, note, book_id, source_url, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13::jsonb, $14::jsonb, $15, $16,
            $17, $18, $19, $20, $21, $22, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            created_by = EXCLUDED.created_by,
            creator_name = EXCLUDED.creator_name,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            recipe_type = EXCLUDED.recipe_type,
            prep_time = EXCLUDED.prep_time,
            cook_time = EXCLUDED.cook_time,
            servings = EXCLUDED.servings,
            ingredients = EXCLUDED.ingredients,
            directions = EXCLUDED.directions,
            image_url = EXCLUDED.image_url,
            is_public = EXCLUDED.is_public,
            is_favorite = EXCLUDED.is_favorite,
            is_cooked = EXCLUDED.is_cooked,
            rating = EXCLUDED.rating,
            updated_at = NOW();
        `, [
          id,
          targetUserId,
          createdBy,
          creatorName,
          item.title || 'Untitled Recipe',
          item.description || '',
          item.recipeType || 'Main Dish',
          item.cuisine || '',
          String(item.prepMinutes || 15),
          String(item.cookMinutes || 25),
          String(item.servings || 4),
          item.difficulty || 'Medium',
          ingredients,
          directions,
          item.imageUrl || item.image || '/recipes/images/default.jpg',
          isPublic,
          Boolean(item.isFavorite ?? item.is_favorite),
          Boolean(item.isCooked ?? item.is_cooked),
          Number(item.rating) || 5,
          item.note || '',
          item.bookId || null,
          item.sourceUrl || ''
        ]);
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: 'Recipe stored in JSON and Database.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureColumns();
    const body = await req.json();
    const { id, isPublic, is_public, isFavorite, isCooked, rating, bookId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recipe ID required' }, { status: 400 });
    }

    const targetPublic = isPublic !== undefined ? isPublic : is_public;
    if (targetPublic !== undefined) {
      updateRecipePublicVisibility(id, Boolean(targetPublic));
    }

    const updates: string[] = [];
    const params: any[] = [id];

    if (targetPublic !== undefined) {
      params.push(Boolean(targetPublic));
      updates.push(`is_public = $${params.length}`);
    }
    if (isFavorite !== undefined) {
      params.push(Boolean(isFavorite));
      updates.push(`is_favorite = $${params.length}`);
    }
    if (isCooked !== undefined) {
      params.push(Boolean(isCooked));
      updates.push(`is_cooked = $${params.length}`);
    }
    if (rating !== undefined) {
      params.push(Number(rating));
      updates.push(`rating = $${params.length}`);
    }
    if (bookId !== undefined) {
      params.push(bookId);
      updates.push(`book_id = $${params.length}`);
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      await query(`UPDATE saved_recipes SET ${updates.join(', ')} WHERE id = $1`, params);
    }

    return NextResponse.json({ success: true, message: 'Updated visibility and settings.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Recipe ID required' }, { status: 400 });

    await query('DELETE FROM saved_recipes WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Deleted recipe.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
