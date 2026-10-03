import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

let cachedPool: Pool | null = null;
function getPool(): Pool | null {
  if (cachedPool) return cachedPool;
  const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!conn) return null;
  const ssl = conn.includes('sslmode=require') || conn.includes('neon.tech') || conn.includes('supabase.co');
  cachedPool = new Pool({
    connectionString: conn,
    ssl: ssl ? { rejectUnauthorized: false } : false
  });
  return cachedPool;
}

// Type-safe row extractor preventing TS7006 and TS2339 errors
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.rows)) return res.rows;
  return [];
}

async function ensureTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planned_meals (
      id VARCHAR(120) PRIMARY KEY,
      user_id VARCHAR(100),
      created_by VARCHAR(255),
      date VARCHAR(50) NOT NULL,
      recipe_id VARCHAR(100),
      recipe_name VARCHAR(255) NOT NULL,
      image TEXT,
      meal_type VARCHAR(50) DEFAULT 'Dinner',
      time VARCHAR(20) DEFAULT '',
      is_leftover BOOLEAN DEFAULT FALSE,
      notes TEXT DEFAULT '',
      servings INT DEFAULT 4,
      prep_time_minutes INT DEFAULT 15,
      cook_time_minutes INT DEFAULT 25,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_planned_meals_user_date ON planned_meals(user_id, date);
  `);
}

export async function GET(req: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: true, meals: [] });

  try {
    await ensureTable(pool);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    let query = `
      SELECT 
        id, 
        user_id as "userId", 
        user_id as "user_id",
        created_by as "createdBy", 
        created_by as "created_by",
        date, 
        recipe_id as "recipeId", 
        recipe_id as "recipe_id",
        recipe_name as "recipeName", 
        recipe_name as "title",
        image, 
        image as "imageUrl",
        image as "image_url",
        meal_type as "mealType", 
        meal_type as "meal_type",
        time, 
        is_leftover as "isLeftover", 
        is_leftover as "is_leftover",
        notes,
        servings,
        prep_time_minutes as "prepTimeMinutes",
        cook_time_minutes as "cookTimeMinutes"
      FROM planned_meals
    `;
    const params: any[] = [];

    if (userId && email) {
      query += ` WHERE user_id = $1 OR created_by = $2 OR user_id = 'usr_admin_1' OR user_id IS NULL ORDER BY date ASC, time ASC`;
      params.push(userId, email);
    } else if (userId) {
      query += ` WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL ORDER BY date ASC, time ASC`;
      params.push(userId);
    } else {
      query += ` ORDER BY date ASC, time ASC LIMIT 300`;
    }

    const res = await pool.query(query, params);
    const rows = parseDbRows(res);
    const normalized = rows.map((r: any) => ({
      ...r,
      date: (r.date || '').split('T')[0]
    }));
    return NextResponse.json({ success: true, meals: normalized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, meals: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });

  try {
    await ensureTable(pool);
    const body = await req.json();

    let incomingMeals: any[] = [];
    let isBatchReplace = false;
    let targetUserId = body.userId || body.user_id || null;
    let targetEmail = body.createdBy || body.created_by || null;

    if (Array.isArray(body)) {
      incomingMeals = body;
    } else if (Array.isArray(body.meals)) {
      incomingMeals = body.meals;
      isBatchReplace = true;
    } else if (body && typeof body === 'object' && (body.date || body.recipeName || body.title)) {
      // Single meal item dispatched directly from /saved
      incomingMeals = [body];
    } else {
      return NextResponse.json({ success: false, error: 'Invalid payload structure' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Full batch synchronization from /planner
      if (isBatchReplace && (targetUserId || targetEmail)) {
        const mealIds = incomingMeals.map((m: any) => m.id).filter(Boolean);
        if (mealIds.length > 0) {
          await client.query(
            `DELETE FROM planned_meals WHERE (user_id = $1 OR created_by = $2) AND id != ALL($3::varchar[])`,
            [targetUserId || '', targetEmail || '', mealIds]
          );
        } else {
          await client.query(
            `DELETE FROM planned_meals WHERE user_id = $1 OR created_by = $2`,
            [targetUserId || '', targetEmail || '']
          );
        }
      }

      for (const meal of incomingMeals) {
        const id = meal.id || 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const rawDate = meal.date || new Date().toISOString().split('T')[0];
        const date = String(rawDate).split('T')[0];
        const recipeName = meal.recipeName || meal.title || meal.name || 'Untitled Recipe';
        const recipeId = meal.recipeId || meal.recipe_id || null;
        const image = meal.image || meal.imageUrl || meal.image_url || null;
        const mealType = meal.mealType || meal.meal_type || 'Dinner';
        const time = meal.time || '';
        const isLeftover = Boolean(meal.isLeftover || meal.is_leftover);
        const notes = meal.notes || '';
        const userId = meal.userId || meal.user_id || targetUserId || null;
        const createdBy = meal.createdBy || meal.created_by || targetEmail || null;
        const servings = parseInt(meal.servings) || 4;
        const prepTime = parseInt(meal.prepTimeMinutes || meal.prep_time) || 15;
        const cookTime = parseInt(meal.cookTimeMinutes || meal.cook_time) || 25;

        await client.query(
          `INSERT INTO planned_meals (
             id, user_id, created_by, date, recipe_id, recipe_name, image, meal_type, time, is_leftover, notes, servings, prep_time_minutes, cook_time_minutes, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
             date = EXCLUDED.date,
             recipe_id = EXCLUDED.recipe_id,
             recipe_name = EXCLUDED.recipe_name,
             image = EXCLUDED.image,
             meal_type = EXCLUDED.meal_type,
             time = EXCLUDED.time,
             is_leftover = EXCLUDED.is_leftover,
             notes = EXCLUDED.notes,
             servings = EXCLUDED.servings,
             prep_time_minutes = EXCLUDED.prep_time_minutes,
             cook_time_minutes = EXCLUDED.cook_time_minutes,
             updated_at = CURRENT_TIMESTAMP`,
          [id, userId, createdBy, date, recipeId, recipeName, image, mealType, time, isLeftover, notes, servings, prepTime, cookTime]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, count: incomingMeals.length });
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });

  try {
    await ensureTable(pool);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Meal ID is required' }, { status: 400 });
    }

    if (userId) {
      await pool.query(`DELETE FROM planned_meals WHERE id = $1 AND (user_id = $2 OR user_id = 'usr_admin_1' OR user_id IS NULL)`, [id, userId]);
    } else {
      await pool.query(`DELETE FROM planned_meals WHERE id = $1`, [id]);
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
