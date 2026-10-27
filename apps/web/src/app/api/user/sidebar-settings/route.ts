import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_sidebar_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        sections TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS user_sidebar_settings (
          user_id TEXT PRIMARY KEY,
          sections JSONB NOT NULL DEFAULT '{"create": true, "manage": true, "plan": true, "finance": true, "admin": false}'::jsonb,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (_) {}
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('email');
    if (!userId) {
      return NextResponse.json({ success: true, sections: null });
    }
    const res = await query('SELECT sections FROM user_sidebar_settings WHERE user_id = $1 LIMIT 1', [userId]);
    const row = Array.isArray(res) ? res[0] : (res as any)?.rows?.[0];
    let sections = row ? row.sections : null;
    if (typeof sections === 'string') {
      try { sections = JSON.parse(sections); } catch (_) {}
    }
    return NextResponse.json({ success: true, sections });
  } catch (err: any) {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId') || searchParams.get('email');
      const res = await query('SELECT sections FROM user_sidebar_settings WHERE user_id = ? LIMIT 1', [userId]);
      const row = Array.isArray(res) ? res[0] : (res as any)?.rows?.[0];
      let sections = row ? row.sections : null;
      if (typeof sections === 'string') {
        try { sections = JSON.parse(sections); } catch (_) {}
      }
      return NextResponse.json({ success: true, sections });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
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
    const sectionsStr = JSON.stringify(sections);
    
    try {
      await query(`
        INSERT INTO user_sidebar_settings (user_id, sections, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          sections = EXCLUDED.sections,
          updated_at = NOW();
      `, [userId, sectionsStr]);
    } catch (_) {
      await query(`
        INSERT INTO user_sidebar_settings (user_id, sections, updated_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          sections = VALUES(sections),
          updated_at = NOW();
      `, [userId, sectionsStr]);
    }

    return NextResponse.json({ success: true, message: 'Sidebar preferences saved' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
