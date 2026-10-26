import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_sidebar_settings (
        user_id TEXT PRIMARY KEY,
        sections JSONB NOT NULL DEFAULT '{"create": true, "manage": true, "plan": true, "admin": true}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('email');
    if (!userId) {
      return NextResponse.json({ success: true, sections: null });
    }
    const rows = await query('SELECT sections FROM user_sidebar_settings WHERE user_id = $1 LIMIT 1;', [userId]);
    const row = Array.isArray(rows) ? rows[0] : (rows as any)?.rows?.[0];
    return NextResponse.json({ success: true, sections: row ? row.sections : null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const userId = body.userId || body.email;
    const sections = body.sections;
    if (!userId || !sections) {
      return NextResponse.json({ success: false, error: 'userId and sections are required' }, { status: 400 });
    }
    await query(`
      INSERT INTO user_sidebar_settings (user_id, sections, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        sections = EXCLUDED.sections,
        updated_at = NOW();
    `, [userId, JSON.stringify(sections)]);

    return NextResponse.json({ success: true, message: 'Sidebar preferences saved' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
