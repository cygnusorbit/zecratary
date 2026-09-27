import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS planned_meals (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        created_by VARCHAR(255),
        date VARCHAR(64) NOT NULL,
        recipe_id VARCHAR(255),
        recipe_name VARCHAR(255) NOT NULL,
        image TEXT,
        meal_type VARCHAR(64) DEFAULT 'Dinner',
        time VARCHAR(64) DEFAULT '',
        is_leftover BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let sql = 'SELECT * FROM planned_meals WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND (user_id = $${params.length} OR created_by = $${params.length} OR user_id IS NULL)`;
    }

    sql += ' ORDER BY date ASC, time ASC, created_at ASC';
    const rows = await query(sql, params);

    const formatted = rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      createdBy: r.created_by,
      date: r.date,
      recipeId: r.recipe_id,
      recipeName: r.recipe_name,
      image: r.image,
      mealType: r.meal_type || 'Dinner',
      time: r.time || '',
      isLeftover: Boolean(r.is_leftover),
      notes: r.notes || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return NextResponse.json({ success: true, meals: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const userId = body.userId;
    const meals = Array.isArray(body.meals) ? body.meals : (body.meal ? [body.meal] : []);

    if (userId && Array.isArray(body.meals)) {
      const mealIds = meals.map((m: any) => m.id);
      if (mealIds.length > 0) {
        await query(
          'DELETE FROM planned_meals WHERE (user_id = $1 OR created_by = $1) AND NOT (id = ANY($2::text[]))',
          [userId, mealIds]
        );
      } else {
        await query('DELETE FROM planned_meals WHERE user_id = $1 OR created_by = $1', [userId]);
      }
    }

    for (const m of meals) {
      if (!m || !m.recipeName) continue;
      const id = String(m.id || 'plan_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      const targetUserId = m.userId || userId || null;
      const createdBy = m.createdBy || userId || null;

      await query(`
        INSERT INTO planned_meals (
          id, user_id, created_by, date, recipe_id, recipe_name, image, meal_type, time, is_leftover, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, planned_meals.user_id),
          created_by = COALESCE(EXCLUDED.created_by, planned_meals.created_by),
          date = EXCLUDED.date,
          recipe_id = EXCLUDED.recipe_id,
          recipe_name = EXCLUDED.recipe_name,
          image = EXCLUDED.image,
          meal_type = EXCLUDED.meal_type,
          time = EXCLUDED.time,
          is_leftover = EXCLUDED.is_leftover,
          notes = EXCLUDED.notes,
          updated_at = NOW();
      `, [
        id,
        targetUserId,
        createdBy,
        m.date,
        m.recipeId || null,
        m.recipeName,
        m.image || null,
        m.mealType || 'Dinner',
        m.time || '',
        Boolean(m.isLeftover),
        m.notes || ''
      ]);
    }

    return NextResponse.json({ success: true, count: meals.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let userId = searchParams.get('userId');

    try {
      const body = await req.json();
      if (body) {
        id = body.id || id;
        userId = body.userId || userId;
      }
    } catch (_) {}

    if (id) {
      await query('DELETE FROM planned_meals WHERE id = $1', [id]);
    } else if (userId) {
      await query('DELETE FROM planned_meals WHERE user_id = $1 OR created_by = $1', [userId]);
    }

    return NextResponse.json({ success: true, message: 'Meal plan record deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
