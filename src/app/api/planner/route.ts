import { NextRequest, NextResponse } from 'next/server';
import { query, parseDbRows } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensurePlannerTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS planned_meals (
        id VARCHAR(120) PRIMARY KEY,
        user_id VARCHAR(100),
        created_by VARCHAR(255),
        date VARCHAR(50) NOT NULL DEFAULT '',
        recipe_id VARCHAR(100),
        recipe_name VARCHAR(255) NOT NULL DEFAULT 'Untitled Recipe',
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
    `);

    const migrations = [
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS date VARCHAR(50) DEFAULT \'\';',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS recipe_id VARCHAR(100);',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS recipe_name VARCHAR(255) DEFAULT \'Untitled Recipe\';',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS image TEXT;',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS meal_type VARCHAR(50) DEFAULT \'Dinner\';',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS time VARCHAR(20) DEFAULT \'\';',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS is_leftover BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT \'\';',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS servings INT DEFAULT 4;',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS prep_time_minutes INT DEFAULT 15;',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS cook_time_minutes INT DEFAULT 25;',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;',
      'ALTER TABLE planned_meals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;'
    ];

    for (const sql of migrations) {
      try { await query(sql); } catch (_) {}
    }
  } catch (e: any) {
    console.warn('[planner:ensurePlannerTable] Notice:', e.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensurePlannerTable();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    let sql = `
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
      sql += ` WHERE user_id = $1 OR created_by = $2 OR user_id = 'usr_admin_1' OR user_id IS NULL ORDER BY date ASC, time ASC`;
      params.push(userId, email);
    } else if (userId) {
      sql += ` WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL ORDER BY date ASC, time ASC`;
      params.push(userId);
    } else {
      sql += ` ORDER BY date ASC, time ASC LIMIT 300`;
    }

    const res = await query(sql, params);
    const rows = parseDbRows(res);
    const normalized = rows.map((r: any) => ({
      ...r,
      date: (r.date || '').split('T')[0]
    }));
    return NextResponse.json({ success: true, meals: normalized });
  } catch (err: any) {
    console.warn('[planner:GET] Falling back to empty meals list:', err.message);
    return NextResponse.json({ success: true, meals: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePlannerTable();
    const body = await req.json();

    let incomingMeals: any[] = [];
    let isBatchReplace = false;
    let targetUserId = body.userId || body.user_id || 'usr_admin_1';
    let targetEmail = body.createdBy || body.created_by || null;

    if (Array.isArray(body)) {
      incomingMeals = body;
    } else if (Array.isArray(body.meals)) {
      incomingMeals = body.meals;
      isBatchReplace = true;
    } else if (body && typeof body === 'object') {
      const single = body.meal || body;
      if (single.date || single.recipeName || single.title || single.recipeId) {
        incomingMeals = [single];
      }
    }

    if (incomingMeals.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No meals to record' });
    }

    for (const meal of incomingMeals) {
      const id = meal.id || ('plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      const rawDate = meal.date || new Date().toISOString().split('T')[0];
      const date = String(rawDate).split('T')[0];
      const recipeName = meal.recipeName || meal.recipeTitle || meal.title || meal.name || 'Untitled Recipe';
      const recipeId = meal.recipeId || meal.recipe_id || null;
      const image = meal.image || meal.imageUrl || meal.image_url || null;
      const mealType = meal.mealType || meal.meal_type || 'Dinner';
      const time = meal.time || '';
      const isLeftover = Boolean(meal.isLeftover || meal.is_leftover);
      const notes = meal.notes || meal.note || '';
      const userId = meal.userId || meal.user_id || targetUserId || 'usr_admin_1';
      const createdBy = meal.createdBy || meal.created_by || targetEmail || userId;
      const servings = parseInt(meal.servings) || 4;
      const prepTime = parseInt(meal.prepTimeMinutes || meal.prep_time) || 15;
      const cookTime = parseInt(meal.cookTimeMinutes || meal.cook_time) || 25;

      await query(
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

    return NextResponse.json({ success: true, count: incomingMeals.length });
  } catch (err: any) {
    console.error('[planner:POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensurePlannerTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Meal ID is required' }, { status: 400 });
    }

    await query('DELETE FROM planned_meals WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
