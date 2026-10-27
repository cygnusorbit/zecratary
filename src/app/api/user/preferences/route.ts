import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensurePreferencesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_dietary_preferences (
        user_id VARCHAR(100) PRIMARY KEY,
        servings INT DEFAULT 2,
        country VARCHAR(100) DEFAULT 'Singapore',
        diets JSONB DEFAULT '["Vegetarian"]'::jsonb,
        allergies JSONB DEFAULT '["Peanuts"]'::jsonb,
        avoid JSONB DEFAULT '["Oily"]'::jsonb,
        tastes JSONB DEFAULT '["Less Spicy"]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.warn('[PostgreSQL] Preferences table init notice:', e);
  }
}

export async function GET(req: NextRequest) {
  const defaultPrefs = {
    servings: 2,
    country: 'Singapore',
    diets: ['Vegetarian'],
    allergies: ['Peanuts'],
    avoid: ['Oily'],
    tastes: ['Less Spicy']
  };

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'usr_admin_1';

    await ensurePreferencesTable();
    const res: any = await query(
      'SELECT * FROM user_dietary_preferences WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const row = (Array.isArray(res) ? res[0] : (res as any)?.rows?.[0]);

    if (row) {
      return NextResponse.json({
        success: true,
        preferences: {
          servings: Number(row.servings || 2),
          country: row.country || 'Singapore',
          diets: Array.isArray(row.diets) ? row.diets : (typeof row.diets === 'string' ? JSON.parse(row.diets) : []),
          allergies: Array.isArray(row.allergies) ? row.allergies : (typeof row.allergies === 'string' ? JSON.parse(row.allergies) : []),
          avoid: Array.isArray(row.avoid) ? row.avoid : (typeof row.avoid === 'string' ? JSON.parse(row.avoid) : []),
          tastes: Array.isArray(row.tastes) ? row.tastes : (typeof row.tastes === 'string' ? JSON.parse(row.tastes) : [])
        }
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    }

    return NextResponse.json({ success: true, preferences: defaultPrefs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: true, preferences: defaultPrefs });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePreferencesTable();
    const body = await req.json();
    const userId = body.userId || 'usr_admin_1';
    const servings = Number(body.servings || 2);
    const country = body.country || 'Singapore';
    const diets = Array.isArray(body.diets) ? body.diets : [];
    const allergies = Array.isArray(body.allergies) ? body.allergies : [];
    const avoid = Array.isArray(body.avoid) ? body.avoid : [];
    const tastes = Array.isArray(body.tastes) ? body.tastes : [];

    await query(
      `INSERT INTO user_dietary_preferences (user_id, servings, country, diets, allergies, avoid, tastes, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         servings = EXCLUDED.servings,
         country = EXCLUDED.country,
         diets = EXCLUDED.diets,
         allergies = EXCLUDED.allergies,
         avoid = EXCLUDED.avoid,
         tastes = EXCLUDED.tastes,
         updated_at = NOW();`,
      [userId, servings, country, JSON.stringify(diets), JSON.stringify(allergies), JSON.stringify(avoid), JSON.stringify(tastes)]
    );

    return NextResponse.json({ success: true, message: 'Preferences saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
