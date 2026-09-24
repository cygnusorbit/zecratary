import { NextRequest, NextResponse } from 'next/server';
import * as dbModule from '@/lib/db';

const db: any = (dbModule as any).default || dbModule;

async function executeQuery(text: string, params: any[] = []) {
  if (typeof db?.query === 'function') {
    return await db.query(text, params);
  }
  if (typeof db?.pool?.query === 'function') {
    return await db.pool.query(text, params);
  }
  if (typeof db === 'function') {
    return await db(text, params);
  }
  throw new Error('Database query handler not available');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email parameter is required' }, { status: 400 });
    }

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_sidebar_settings (
        email VARCHAR(255) PRIMARY KEY,
        sections JSONB NOT NULL DEFAULT '{"create":true,"manage":true,"plan":true,"admin":true}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await executeQuery('SELECT sections FROM user_sidebar_settings WHERE email = $1', [email]);
    if (res.rows && res.rows.length > 0) {
      return NextResponse.json({ success: true, sections: res.rows[0].sections });
    }

    return NextResponse.json({ success: true, sections: null });
  } catch (err: any) {
    console.error('Error fetching sidebar preferences from PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, sections } = body;
    if (!email || !sections) {
      return NextResponse.json({ success: false, error: 'Email and sections payload required' }, { status: 400 });
    }

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_sidebar_settings (
        email VARCHAR(255) PRIMARY KEY,
        sections JSONB NOT NULL DEFAULT '{"create":true,"manage":true,"plan":true,"admin":true}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      INSERT INTO user_sidebar_settings (email, sections, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (email)
      DO UPDATE SET sections = EXCLUDED.sections, updated_at = CURRENT_TIMESTAMP;
    `, [email, JSON.stringify(sections)]);

    return NextResponse.json({ success: true, message: 'Sidebar preferences stored in PostgreSQL' });
  } catch (err: any) {
    console.error('Error saving sidebar preferences to PostgreSQL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
