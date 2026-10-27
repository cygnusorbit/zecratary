import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let queryDb: any = null;
try {
  const dbModule = require('@/lib/db');
  queryDb = dbModule.query || dbModule.default?.query || dbModule.pool?.query;
} catch (_) {}

const DATA_DIR = path.join(process.cwd(), 'data');
const MEALS_FILE = path.join(DATA_DIR, 'planned_meals.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(MEALS_FILE)) {
    fs.writeFileSync(MEALS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

async function ensureDatabaseTable() {
  if (!queryDb) return false;
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS planned_meals (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        date VARCHAR(32) NOT NULL,
        meal_type VARCHAR(64) NOT NULL,
        recipe_id VARCHAR(255),
        recipe_name VARCHAR(255) NOT NULL,
        time VARCHAR(32),
        servings INT DEFAULT 2,
        notes TEXT,
        is_leftover BOOLEAN DEFAULT FALSE,
        calories INT DEFAULT 0,
        protein INT DEFAULT 0,
        carbs INT DEFAULT 0,
        fat INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return true;
  } catch (err) {
    console.warn('Planner DB table creation notice:', err);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('email') || 'usr_admin_1';

    const dbReady = await ensureDatabaseTable();
    if (dbReady && queryDb) {
      try {
        const rows = await queryDb(
          'SELECT * FROM planned_meals WHERE user_id = $1 OR user_id = $2 ORDER BY date ASC, time ASC',
          [userId, 'usr_admin_1']
        );
        const list = Array.isArray(rows) ? rows : (rows?.rows || []);
        const formatted = list.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          date: r.date,
          mealType: r.meal_type,
          recipeId: r.recipe_id,
          recipeName: r.recipe_name,
          time: r.time || '12:00',
          servings: Number(r.servings) || 2,
          notes: r.notes || '',
          isLeftover: Boolean(r.is_leftover),
          calories: Number(r.calories) || 0,
          protein: Number(r.protein) || 0,
          carbs: Number(r.carbs) || 0,
          fat: Number(r.fat) || 0
        }));
        return NextResponse.json({ success: true, meals: formatted });
      } catch (_) {}
    }

    ensureDataFile();
    const raw = fs.readFileSync(MEALS_FILE, 'utf-8');
    const all = raw ? JSON.parse(raw) : [];
    const userMeals = Array.isArray(all) 
      ? all.filter((m: any) => m.userId === userId || m.user_id === userId || m.userId === 'usr_admin_1')
      : [];
    return NextResponse.json({ success: true, meals: userMeals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId || body.user_id || 'usr_admin_1';
    const mealsToPersist = Array.isArray(body.meals) ? body.meals : (body.meal ? [body.meal] : []);

    const dbReady = await ensureDatabaseTable();
    if (dbReady && queryDb) {
      try {
        for (const m of mealsToPersist) {
          const id = m.id || ('meal_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
          await queryDb(`
            INSERT INTO planned_meals (
              id, user_id, date, meal_type, recipe_id, recipe_name, time, servings, notes, is_leftover, calories, protein, carbs, fat, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (id) DO UPDATE SET
              date = EXCLUDED.date,
              meal_type = EXCLUDED.meal_type,
              recipe_id = EXCLUDED.recipe_id,
              recipe_name = EXCLUDED.recipe_name,
              time = EXCLUDED.time,
              servings = EXCLUDED.servings,
              notes = EXCLUDED.notes,
              is_leftover = EXCLUDED.is_leftover,
              calories = EXCLUDED.calories,
              protein = EXCLUDED.protein,
              carbs = EXCLUDED.carbs,
              fat = EXCLUDED.fat,
              updated_at = NOW();
          `, [
            id,
            userId,
            m.date,
            m.mealType || m.meal_type || 'Dinner',
            m.recipeId || m.recipe_id || null,
            m.recipeName || m.recipe_name || 'Chef Special',
            m.time || '12:00',
            Number(m.servings) || 2,
            m.notes || '',
            Boolean(m.isLeftover || m.is_leftover),
            Number(m.calories) || 0,
            Number(m.protein) || 0,
            Number(m.carbs) || 0,
            Number(m.fat) || 0
          ]);
        }
      } catch (dbErr) {
        console.warn('Planner DB upsert notice:', dbErr);
      }
    }

    ensureDataFile();
    const raw = fs.readFileSync(MEALS_FILE, 'utf-8');
    let all = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(all)) all = [];

    mealsToPersist.forEach((newM: any) => {
      const idx = all.findIndex((ex: any) => ex.id === newM.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...newM, userId };
      } else {
        all.push({ ...newM, userId });
      }
    });

    fs.writeFileSync(MEALS_FILE, JSON.stringify(all, null, 2), 'utf-8');
    return NextResponse.json({ success: true, count: mealsToPersist.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mealId = searchParams.get('id');
    const date = searchParams.get('date');
    const clearAll = searchParams.get('clearAll') === 'true';
    const userId = searchParams.get('userId') || 'usr_admin_1';

    const dbReady = await ensureDatabaseTable();
    if (dbReady && queryDb) {
      try {
        if (clearAll) {
          await queryDb('DELETE FROM planned_meals WHERE user_id = $1', [userId]);
        } else if (mealId) {
          await queryDb('DELETE FROM planned_meals WHERE id = $1', [mealId]);
        } else if (date) {
          await queryDb('DELETE FROM planned_meals WHERE user_id = $1 AND date = $2', [userId, date]);
        }
      } catch (_) {}
    }

    ensureDataFile();
    const raw = fs.readFileSync(MEALS_FILE, 'utf-8');
    let all = raw ? JSON.parse(raw) : [];
    if (Array.isArray(all)) {
      if (clearAll) {
        all = all.filter((m: any) => m.userId !== userId && m.user_id !== userId);
      } else if (mealId) {
        all = all.filter((m: any) => m.id !== mealId);
      } else if (date) {
        all = all.filter((m: any) => !((m.userId === userId || m.user_id === userId) && m.date === date));
      }
      fs.writeFileSync(MEALS_FILE, JSON.stringify(all, null, 2), 'utf-8');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
