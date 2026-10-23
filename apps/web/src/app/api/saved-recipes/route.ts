import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || url.searchParams.get('user_id');

  try {
    let sql = `
      SELECT * FROM saved_recipes 
      ORDER BY created_at DESC;
    `;
    let params: any[] = [];

    // If a specific userId is requested, include their recipes AND admin/seeded recipes
    if (userId && userId !== 'all') {
      sql = `
        SELECT * FROM saved_recipes 
        WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL OR user_id = ''
        ORDER BY created_at DESC;
      `;
      params = [userId];
    }

    const rows: any = await query(sql, params);
    const list = Array.isArray(rows) ? rows : (rows?.rows || []);

    const sanitized = list.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      user_id: r.user_id,
      title: r.title,
      description: r.description || '',
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : (typeof r.ingredients === 'string' ? JSON.parse(r.ingredients || '[]') : []),
      instructions: Array.isArray(r.directions) ? r.directions : (Array.isArray(r.instructions) ? r.instructions : (typeof r.instructions === 'string' ? JSON.parse(r.instructions || '[]') : [])),
      directions: Array.isArray(r.directions) ? r.directions : (Array.isArray(r.instructions) ? r.instructions : []),
      prep_time: r.prep_time || '15m',
      cook_time: r.cook_time || '20m',
      servings: r.servings || '4',
      image: r.image || r.image_url || '',
      imageUrl: r.image || r.image_url || '',
      is_favorite: Boolean(r.is_favorite),
      isFavorite: Boolean(r.is_favorite),
      is_cooked: Boolean(r.is_cooked),
      isCooked: Boolean(r.is_cooked),
      tags: Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : []),
      source_url: r.source_url || '',
      sourceUrl: r.source_url || '',
      created_at: r.created_at,
    }));

    return NextResponse.json(
      { success: true, recipes: sanitized },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Error in GET /api/recipes/saved:', err.message);
    return NextResponse.json(
      { success: true, recipes: [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    for (const r of items) {
      const recId = r.id || ('rec_' + Date.now().toString(36));
      const userId = r.userId || r.user_id || 'usr_admin_1';
      const title = r.title || 'Untitled Recipe';
      const desc = r.description || '';
      const ingredients = JSON.stringify(Array.isArray(r.ingredients) ? r.ingredients : []);
      const directions = JSON.stringify(Array.isArray(r.directions) ? r.directions : (Array.isArray(r.instructions) ? r.instructions : []));
      const prepTime = r.prep_time || r.prepTime || '15m';
      const cookTime = r.cook_time || r.cookTime || '20m';
      const servings = String(r.servings || '4');
      const img = r.image || r.imageUrl || r.image_url || '';
      const isFav = Boolean(r.is_favorite ?? r.isFavorite);
      const isCooked = Boolean(r.is_cooked ?? r.isCooked);
      const tags = JSON.stringify(Array.isArray(r.tags) ? r.tags : []);
      const sourceUrl = r.source_url || r.sourceUrl || '';

      await query(`
        INSERT INTO saved_recipes (
          id, user_id, title, description, ingredients, instructions, directions,
          prep_time, cook_time, servings, image, image_url, is_favorite, is_cooked,
          tags, source_url, updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          ingredients = EXCLUDED.ingredients,
          instructions = EXCLUDED.instructions,
          directions = EXCLUDED.directions,
          prep_time = EXCLUDED.prep_time,
          cook_time = EXCLUDED.cook_time,
          servings = EXCLUDED.servings,
          image = EXCLUDED.image,
          image_url = EXCLUDED.image_url,
          is_favorite = EXCLUDED.is_favorite,
          tags = EXCLUDED.tags,
          updated_at = NOW();
      `, [
        recId, userId, title, desc, ingredients, directions, directions,
        prepTime, cookTime, servings, img, img, isFav, isCooked, tags, sourceUrl
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in POST /api/recipes/saved:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
