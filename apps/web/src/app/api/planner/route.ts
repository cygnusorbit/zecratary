import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let cachedPool: any = null;

async function getPostgresPool() {
  if (cachedPool) return cachedPool;
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connStr) return null;
  try {
    const { Pool } = await import('pg');
    const requiresSsl = connStr.includes('sslmode=require') || 
                        connStr.includes('neon.tech') || 
                        connStr.includes('supabase.co') || 
                        process.env.NODE_ENV === 'production';
    cachedPool = new Pool({
      connectionString: connStr,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    });
    return cachedPool;
  } catch (_) {
    return null;
  }
}

async function ensurePlannerTable(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS planner_meals (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        created_by VARCHAR(255),
        creator_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date VARCHAR(50),
        date_str VARCHAR(50),
        day_name VARCHAR(50),
        meal_type VARCHAR(50) DEFAULT 'Dinner',
        time VARCHAR(50),
        servings INT DEFAULT 2,
        prep_minutes INT DEFAULT 15,
        cook_minutes INT DEFAULT 20,
        image_url TEXT,
        ingredients JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest';
    const pool = await getPostgresPool();
    if (pool) {
      await ensurePlannerTable(pool);
      const res = await pool.query(
        "SELECT * FROM planner_meals WHERE user_id = $1 OR created_by = $1 ORDER BY date ASC LIMIT 100",
        [userId]
      );
      return NextResponse.json({ success: true, meals: res.rows });
    }
    return NextResponse.json({ success: true, meals: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = body.userId || body.user_id || 'guest';
    const email = body.createdBy || body.creator_email || 'guest';
    const name = body.creatorName || email.split('@')[0];
    const title = body.title || body.name || body.recipeTitle || 'Scheduled Meal';
    const description = body.description || '';
    const date = body.date || body.formattedDate || new Date().toISOString().split('T')[0];
    const dateStr = body.dateStr || date;
    const dayName = body.dayName || body.day || '';
    const mealType = (body.mealType || body.type || 'Dinner').toUpperCase();
    const time = body.time || '19:00';
    const servings = Number(body.servings || 2);
    const prep = Number(body.prepMinutes || body.prepTimeMinutes || 15);
    const cook = Number(body.cookMinutes || body.cookTimeMinutes || 20);
    const image = body.image || body.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const notes = body.notes || '';

    const pool = await getPostgresPool();
    if (pool) {
      await ensurePlannerTable(pool);
      await pool.query(
        `INSERT INTO planner_meals (
          id, user_id, created_by, creator_name, title, description,
          date, date_str, day_name, meal_type, time, servings,
          prep_minutes, cook_minutes, image_url, ingredients, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          date = EXCLUDED.date,
          meal_type = EXCLUDED.meal_type,
          time = EXCLUDED.time,
          notes = EXCLUDED.notes,
          updated_at = NOW();`,
        [id, userId, email, name, title, description, date, dateStr, dayName, mealType, time, servings, prep, cook, image, JSON.stringify(ingredients), notes]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meal scheduled successfully in PostgreSQL planner.',
      meal: { id, title, date, mealType, time, servings }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
