import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureTables() {
  try {
    await query(`
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

      CREATE TABLE IF NOT EXISTS planner_meals (
        id VARCHAR(120) PRIMARY KEY,
        user_id VARCHAR(100),
        created_by VARCHAR(255),
        date VARCHAR(50) NOT NULL,
        recipe_id VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        recipe_name VARCHAR(255),
        image TEXT,
        meal_type VARCHAR(50) DEFAULT 'Dinner',
        time VARCHAR(20) DEFAULT '',
        servings INT DEFAULT 4,
        prep_minutes INT DEFAULT 15,
        cook_minutes INT DEFAULT 25,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_planner_meals_user_date ON planner_meals(user_id, date);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureTables();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || '';
    const email = searchParams.get('email')?.toLowerCase().trim() || '';

    let sql = `
      SELECT 
        id, 
        user_id as "userId", 
        user_id as "user_id",
        created_by as "createdBy", 
        date, 
        recipe_id as "recipeId", 
        recipe_id as "recipe_id",
        recipe_name as "recipeName", 
        recipe_name as "title",
        image, 
        image as "imageUrl",
        meal_type as "mealType", 
        meal_type as "meal_type",
        time, 
        is_leftover as "isLeftover", 
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

    const rows: any = await query(sql, params);
    const rawItems = Array.isArray(rows) ? rows : (rows?.rows || []);

    const normalized = rawItems.map((r: any) => ({
      ...r,
      date: (r.date || '').split('T')[0]
    }));

    return NextResponse.json(
      { success: true, meals: normalized },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, meals: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureTables();
  try {
    const body = await req.json();

    let incomingMeals: any[] = [];
    let isBatchReplace = false;
    let targetUserId = body.userId || body.user_id || 'usr_admin_1';
    let targetEmail = body.createdBy || body.created_by || 'admin@zecratary.com';

    if (Array.isArray(body)) {
      incomingMeals = body;
    } else if (Array.isArray(body.meals)) {
      incomingMeals = body.meals;
      isBatchReplace = true;
    } else if (body && typeof body === 'object' && (body.date || body.recipeName || body.title)) {
      incomingMeals = [body];
    } else {
      return NextResponse.json({ success: false, error: 'Invalid payload structure' }, { status: 400 });
    }

    for (const meal of incomingMeals) {
      const id = meal.id || 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const rawDate = meal.date || new Date().toISOString().split('T')[0];
      const date = String(rawDate).split('T')[0];
      const recipeName = meal.recipeName || meal.title || meal.name || 'Untitled Recipe';
      const recipeId = meal.recipeId || meal.recipe_id || null;
      const image = meal.image || meal.imageUrl || meal.image_url || null;
      const mealType = meal.mealType || meal.meal_type || 'Dinner';
      const time = meal.time || '19:00';
      const isLeftover = Boolean(meal.isLeftover || meal.is_leftover);
      const notes = meal.notes || '';
      const userId = meal.userId || meal.user_id || targetUserId;
      const createdBy = meal.createdBy || meal.created_by || targetEmail;
      const servings = parseInt(meal.servings) || 4;
      const prepTime = parseInt(meal.prepTimeMinutes || meal.prep_time_minutes || meal.prep_time) || 15;
      const cookTime = parseInt(meal.cookTimeMinutes || meal.cook_time_minutes || meal.cook_time) || 25;

      // 1. Insert into planned_meals
      await query(`
        INSERT INTO planned_meals (
          id, user_id, created_by, date, recipe_id, recipe_name, image, meal_type, time, is_leftover, notes, servings, prep_time_minutes, cook_time_minutes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
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
          updated_at = NOW();
      `, [id, userId, createdBy, date, recipeId, recipeName, image, mealType, time, isLeftover, notes, servings, prepTime, cookTime]);

      // 2. Mirror into planner_meals for dashboard stats compatibility
      await query(`
        INSERT INTO planner_meals (
          id, user_id, created_by, date, recipe_id, title, recipe_name, image, meal_type, time, servings, prep_minutes, cook_minutes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          recipe_id = EXCLUDED.recipe_id,
          title = EXCLUDED.title,
          recipe_name = EXCLUDED.recipe_name,
          image = EXCLUDED.image,
          meal_type = EXCLUDED.meal_type,
          time = EXCLUDED.time,
          servings = EXCLUDED.servings,
          prep_minutes = EXCLUDED.prep_minutes,
          cook_minutes = EXCLUDED.cook_minutes,
          updated_at = NOW();
      `, [id, userId, createdBy, date, recipeId, recipeName, recipeName, image, mealType, time, servings, prepTime, cookTime]);
    }

    return NextResponse.json({ success: true, count: incomingMeals.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureTables();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const dateRange = searchParams.get('dateRange'); // Format: startDate,endDate
    const userId = searchParams.get('userId');

    if (dateRange) {
      const [start, end] = dateRange.split(',');
      if (start && end) {
        await query(`DELETE FROM planned_meals WHERE date >= $1 AND date <= $2`, [start, end]);
        await query(`DELETE FROM planner_meals WHERE date >= $1 AND date <= $2`, [start, end]);
        return NextResponse.json({ success: true, message: 'Date range meals deleted' });
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Meal ID is required' }, { status: 400 });
    }

    await query(`DELETE FROM planned_meals WHERE id = $1`, [id.trim()]);
    await query(`DELETE FROM planner_meals WHERE id = $1`, [id.trim()]);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
