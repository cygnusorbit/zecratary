import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let rows;
    if (userId) {
      rows = await query(
        'SELECT * FROM saved_recipes WHERE user_id = $1 OR is_public = TRUE ORDER BY created_at DESC',
        [userId]
      );
    } else {
      rows = await query('SELECT * FROM saved_recipes ORDER BY created_at DESC');
    }

    return NextResponse.json(
      { success: true, recipes: rows },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || 'rcp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    let validUserId = null;
    if (body.userId) {
      const userCheck = await query('SELECT 1 FROM users WHERE id = $1', [body.userId]);
      if (userCheck.length > 0) validUserId = body.userId;
    }

    await query(`
      INSERT INTO saved_recipes (
        id, user_id, title, description, recipe_type, cuisine, prep_time, cook_time,
        servings, difficulty, ingredients, directions, nutrition, tags, image_url, is_public, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, NOW())
      ON CONFLICT (id) DO UPDATE SET
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
        updated_at = NOW();
    `, [
      id,
      validUserId,
      body.title || 'Untitled Recipe',
      body.description || '',
      body.recipeType || body.category || 'General',
      body.cuisine || '',
      body.prepTime || '',
      body.cookTime || '',
      body.servings || '',
      body.difficulty || '',
      JSON.stringify(body.ingredients || []),
      JSON.stringify(body.directions || body.instructions || []),
      JSON.stringify(body.nutrition || body.macros || {}),
      JSON.stringify(body.tags || []),
      body.imageUrl || body.image || '',
      Boolean(body.isPublic)
    ]);

    return NextResponse.json({ success: true, id, message: 'Recipe saved to PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 });
    }

    await query('DELETE FROM saved_recipes WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Recipe removed from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
