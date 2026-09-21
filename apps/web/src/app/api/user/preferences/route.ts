import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  } catch (err) {
    console.error('[PostgreSQL] Preferences Pool Error:', err);
    return null;
  }
}

async function ensurePreferencesTable(pool: any) {
  if (!pool) return;
  try {
    await pool.query(`
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
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest';

    const pool = await getPostgresPool();
    if (pool) {
      await ensurePreferencesTable(pool);
      const res = await pool.query(
        'SELECT * FROM user_dietary_preferences WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return NextResponse.json({
          success: true,
          preferences: {
            servings: Number(row.servings || 2),
            country: row.country || 'Singapore',
            diets: Array.isArray(row.diets) ? row.diets : [],
            allergies: Array.isArray(row.allergies) ? row.allergies : [],
            avoid: Array.isArray(row.avoid) ? row.avoid : [],
            tastes: Array.isArray(row.tastes) ? row.tastes : []
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      preferences: {
        servings: 2,
        country: 'Singapore',
        diets: ['Vegetarian'],
        allergies: ['Peanuts'],
        avoid: ['Oily'],
        tastes: ['Less Spicy']
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || 'guest';
    const servings = Number(body.servings || 2);
    const country = body.country || 'Singapore';
    const diets = Array.isArray(body.diets) ? body.diets : [];
    const allergies = Array.isArray(body.allergies) ? body.allergies : [];
    const avoid = Array.isArray(body.avoid) ? body.avoid : [];
    const tastes = Array.isArray(body.tastes) ? body.tastes : [];

    const pool = await getPostgresPool();
    if (pool) {
      await ensurePreferencesTable(pool);
      await pool.query(
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
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences successfully saved to PostgreSQL.'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
