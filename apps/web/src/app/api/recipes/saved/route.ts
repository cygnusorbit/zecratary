import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  saveRecipeJsonFile,
  saveRecipeImageLocally,
  loadAllRecipeJsonFiles,
  updateRecipePublicVisibility,
  deleteRecipeJsonFile
} from '@/lib/recipeFiles';

export const dynamic = 'force-dynamic';

async function ensureColumns() {
  try {
    await query(`
      ALTER TABLE saved_recipes 
      ADD COLUMN IF NOT EXISTS user_id TEXT,
      ADD COLUMN IF NOT EXISTS created_by TEXT,
      ADD COLUMN IF NOT EXISTS creator_name TEXT,
      ADD COLUMN IF NOT EXISTS creator_email TEXT,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_cooked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS book_id TEXT,
      ADD COLUMN IF NOT EXISTS source_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_saved_recipes_public ON saved_recipes(is_public);
      CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_owner ON saved_recipes(user_id, created_by);
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

    let dbRows: any[] = [];
    try {
      let sql = 'SELECT * FROM saved_recipes';
      const params: any[] = [];

      if (isMarketplace) {
        sql += ' WHERE is_public = TRUE';
      } else if (userId || email) {
        const conds: string[] = [];
        if (userId) {
          params.push(userId);
          conds.push(`user_id = $${params.length} OR created_by = $${params.length}`);
        }
        if (email && email !== userId) {
          params.push(email);
          conds.push(`user_id = $${params.length} OR created_by = $${params.length}`);
        }
        sql += ` WHERE (${conds.join(' OR ')})`;
      }

      sql += ' ORDER BY created_at DESC';
      dbRows = await query(sql, params);
    } catch (_) {}

    // Load recipes from disk JSON files in /recipes directory
    const diskRecipes = loadAllRecipeJsonFiles();
    const recipeMap = new Map<string, any>();

    // Index DB records
    dbRows.forEach((r: any) => {
      let ing = r.ingredients;
      if (typeof ing === 'string') {
        try { ing = JSON.parse(ing); } catch (_) { ing = []; }
      }
      let dir = r.directions || r.instructions;
      if (typeof dir === 'string') {
        try { dir = JSON.parse(dir); } catch (_) { dir = []; }
      }

      const rec = {
        ...r,
        id: r.id,
        userId: r.user_id || userId,
        user_id: r.user_id || userId,
        createdBy: r.created_by || r.user_id,
        created_by: r.created_by || r.user_id,
        creatorName: r.creator_name || 'Chef',
        creatorEmail: r.creator_email || '',
        ownerId: r.user_id || userId,
        ownerName: r.creator_name || 'Chef',
        ownerEmail: r.creator_email || '',
        title: r.title || 'Untitled Recipe',
        description: r.description || '',
        recipeType: r.recipe_type || 'Main Dish',
        category: r.recipe_type || 'Main Dish',
        cuisine: r.cuisine || '',
        prepTimeMinutes: Number(r.prep_time) || 15,
        cookTimeMinutes: Number(r.cook_time) || 25,
        servings: Number(r.servings) || 4,
        difficulty: r.difficulty || 'Medium',
        ingredients: Array.isArray(ing) ? ing : [],
        instructions: Array.isArray(dir) ? dir : [],
        directions: Array.isArray(dir) ? dir : [],
        imageUrl: r.image_url || '/recipes/images/default.jpg',
        image: r.image_url || '/recipes/images/default.jpg',
        sourceUrl: r.source_url || '',
        isPublic: Boolean(r.is_public),
        is_public: Boolean(r.is_public),
        isFavorite: Boolean(r.is_favorite),
        isCooked: Boolean(r.is_cooked),
        rating: Number(r.rating) || 0,
        note: r.note || '',
        bookId: r.book_id || null,
        createdAt: r.created_at || new Date().toISOString()
      };
      recipeMap.set(r.id, rec);
    });

    // Merge disk JSON records from directory /recipes
    diskRecipes.forEach(dr => {
      if (isMarketplace && !dr.isPublic) return;
      if (!isMarketplace && userId && dr.userId !== userId && dr.createdBy !== email && dr.createdBy !== userId) {
        // If not marketplace, skip if belongs to another user
        return;
      }
      if (!recipeMap.has(dr.id)) {
        recipeMap.set(dr.id, dr);
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
      const targetUserId = (item.userId || item.user_id || body.userId || 'usr_admin_1').trim();
      const createdBy = (item.createdBy || item.created_by || item.ownerEmail || targetUserId).trim();
      const creatorName = (item.creatorName || item.creator_name || item.ownerName || 'Chef').trim();
      const creatorEmail = (item.creatorEmail || item.creator_email || item.ownerEmail || '').trim();
      const id = item.id || `rcp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Save Image Locally to /recipes/images/
      const localImage = await saveRecipeImageLocally(id, item.imageUrl || item.image || item.image_url);

      // 2. Format and Save Standalone JSON file to directory /recipes/<id>.json
      const recipeRecord = {
        ...item,
        id,
        userId: targetUserId,
        user_id: targetUserId,
        createdBy,
        created_by: createdBy,
        creatorName,
        creator_name: creatorName,
        creatorEmail,
        creator_email: creatorEmail,
        imageUrl: localImage,
        image: localImage,
        image_url: localImage,
        isPublic: Boolean(item.isPublic ?? item.is_public)
      };
      saveRecipeJsonFile(recipeRecord, { userId: targetUserId, createdBy, creatorName, creatorEmail });

      // 3. Persist in Database (PostgreSQL & MySQL)
      let ingredients = item.ingredients;
      if (typeof ingredients === 'string') {
        try { ingredients = JSON.parse(ingredients); } catch (_) { ingredients = [ingredients]; }
      }
      if (!Array.isArray(ingredients)) ingredients = [];

      let directions = item.instructions || item.directions;
      if (typeof directions === 'string') {
        try { directions = JSON.parse(directions); } catch (_) { directions = [directions]; }
      }
      if (!Array.isArray(directions)) directions = [];

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, created_by, creator_name, creator_email, title, description, recipe_type, cuisine, prep_time, cook_time,
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
          creator_email = EXCLUDED.creator_email,
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
          image_url = EXCLUDED.image_url,
          is_public = EXCLUDED.is_public,
          is_favorite = EXCLUDED.is_favorite,
          is_cooked = EXCLUDED.is_cooked,
          rating = EXCLUDED.rating,
          note = EXCLUDED.note,
          book_id = EXCLUDED.book_id,
          source_url = EXCLUDED.source_url,
          updated_at = NOW();
      `, [
        id,
        targetUserId,
        createdBy,
        creatorName,
        creatorEmail,
        item.title || item.name || 'Untitled Recipe',
        item.description || '',
        item.recipeType || item.category || 'Main Dish',
        item.cuisine || '',
        String(item.prepTimeMinutes || item.prepMinutes || 15),
        String(item.cookTimeMinutes || item.cookMinutes || 25),
        String(item.servings || 4),
        item.difficulty || 'Medium',
        JSON.stringify(ingredients),
        JSON.stringify(directions),
        localImage,
        Boolean(item.isPublic ?? item.is_public),
        Boolean(item.isFavorite ?? item.is_favorite),
        Boolean(item.isCooked ?? item.is_cooked),
        Number(item.rating) || 0,
        item.note || '',
        item.bookId || item.book_id || null,
        item.sourceUrl || item.source_url || ''
      ]);
    }

    return NextResponse.json({ success: true, message: 'Saved to /recipes JSON file, /recipes/images, and Database.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureColumns();
    const body = await req.json();
    const { id, isPublic, is_public, isFavorite, is_favorite, isCooked, is_cooked, rating, note, bookId, book_id } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 });

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
    if (isFavorite !== undefined || is_favorite !== undefined) {
      params.push(Boolean(isFavorite !== undefined ? isFavorite : is_favorite));
      updates.push(`is_favorite = $${params.length}`);
    }
    if (isCooked !== undefined || is_cooked !== undefined) {
      params.push(Boolean(isCooked !== undefined ? isCooked : is_cooked));
      updates.push(`is_cooked = $${params.length}`);
    }
    if (rating !== undefined) {
      params.push(Number(rating));
      updates.push(`rating = $${params.length}`);
    }
    if (note !== undefined) {
      params.push(String(note));
      updates.push(`note = $${params.length}`);
    }
    if (bookId !== undefined || book_id !== undefined) {
      params.push(bookId !== undefined ? bookId : book_id);
      updates.push(`book_id = $${params.length}`);
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      await query(`UPDATE saved_recipes SET ${updates.join(', ')} WHERE id = $1`, params);

      try {
        const rows = await query('SELECT * FROM saved_recipes WHERE id = $1', [id]);
        if (rows.length > 0) saveRecipeJsonFile(rows[0]);
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: 'Updated in Database and JSON file.' });
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
    deleteRecipeJsonFile(id.trim());

    return NextResponse.json({ success: true, message: 'Deleted from Database and /recipes JSON file.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
