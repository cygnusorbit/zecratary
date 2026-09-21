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

async function ensureSavedRecipesTable(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_recipes (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        created_by VARCHAR(255),
        creator_name VARCHAR(255),
        creator_email VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        recipe_type VARCHAR(100) DEFAULT 'Main Dish',
        prep_time_minutes INT DEFAULT 15,
        cook_time_minutes INT DEFAULT 20,
        servings INT DEFAULT 2,
        calories INT,
        image_url TEXT,
        ingredients JSONB DEFAULT '[]'::jsonb,
        directions JSONB DEFAULT '[]'::jsonb,
        is_favorite BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS creator_name VARCHAR(255);
      ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS creator_email VARCHAR(255);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const email = (searchParams.get('email') || '').toLowerCase().trim();

    const pool = await getPostgresPool();
    if (pool && (userId || email)) {
      await ensureSavedRecipesTable(pool);
      const res = await pool.query(
        `SELECT id, user_id, created_by, creator_name, creator_email, title, description,
                recipe_type, prep_time_minutes, cook_time_minutes, servings, calories,
                image_url, ingredients, directions, is_favorite, created_at
         FROM saved_recipes
         WHERE user_id = $1 OR created_by = $2 OR creator_email = $2
         ORDER BY created_at DESC LIMIT 50`,
        [userId || 'guest', email || 'guest']
      );
      return NextResponse.json({ success: true, recipes: res.rows });
    }
    return NextResponse.json({ success: true, recipes: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = body.userId || 'guest';
    const email = body.createdBy || body.creatorEmail || body.email || 'guest';
    const name = body.creatorName || email.split('@')[0];
    const title = body.title || body.name || 'Untitled Recipe';
    const description = body.description || '';
    const recipeType = body.recipeType || body.mealType || 'Main Dish';
    const prep = Number(body.prepTimeMinutes || body.prepMinutes || 15);
    const cook = Number(body.cookTimeMinutes || body.cookMinutes || 20);
    const servings = Number(body.servings || 2);
    const calories = Number(body.calories || 0);
    const image = body.imageUrl || body.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const directions = Array.isArray(body.directions || body.instructions) ? (body.directions || body.instructions) : [];

    const pool = await getPostgresPool();
    if (pool) {
      await ensureSavedRecipesTable(pool);
      await pool.query(
        `INSERT INTO saved_recipes (
          id, user_id, created_by, creator_name, creator_email, title, description,
          recipe_type, prep_time_minutes, cook_time_minutes, servings, calories,
          image_url, ingredients, directions, is_favorite, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          recipe_type = EXCLUDED.recipe_type,
          ingredients = EXCLUDED.ingredients,
          directions = EXCLUDED.directions,
          updated_at = NOW();`,
        [id, userId, email, name, email, title, description, recipeType, prep, cook, servings, calories, image, JSON.stringify(ingredients), JSON.stringify(directions)]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recipe saved successfully to PostgreSQL database.',
      recipe: { id, title, recipeType, prep, cook, servings, image }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
