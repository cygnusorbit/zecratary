import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTemplatesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS meal_plan_templates (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64),
        created_by VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        days JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_meal_plan_templates_user_id ON meal_plan_templates(user_id);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureTemplatesTable();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let sql = 'SELECT * FROM meal_plan_templates';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ' WHERE user_id = $1 OR user_id = \'usr_admin_1\' OR user_id IS NULL';
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);

    const formatted = rows.map((r: any) => {
      let days = r.days;
      if (typeof days === 'string') {
        try { days = JSON.parse(days); } catch (_) { days = []; }
      }
      return {
        id: r.id,
        userId: r.user_id || 'usr_admin_1',
        createdBy: r.created_by || '',
        title: r.title || 'Untitled Template',
        description: r.description || '',
        days: Array.isArray(days) ? days : [],
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
      };
    });

    return NextResponse.json(
      { success: true, templates: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureTemplatesTable();
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : (body.templates || [body.template || body]);

    for (const t of items) {
      if (!t || !t.id || !t.title) continue;
      const targetUserId = t.userId || t.user_id || 'usr_admin_1';

      let days = t.days;
      if (typeof days === 'string') {
        try { days = JSON.parse(days); } catch (_) { days = []; }
      }
      if (!Array.isArray(days)) days = [];

      await query(`
        INSERT INTO meal_plan_templates (
          id, user_id, created_by, title, description, days, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          days = EXCLUDED.days,
          updated_at = NOW();
      `, [
        t.id,
        targetUserId,
        t.createdBy || '',
        t.title.trim(),
        t.description || '',
        JSON.stringify(days)
      ]);
    }

    return NextResponse.json({ success: true, message: 'Template(s) saved in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    const cleanId = id.trim();
    await query('DELETE FROM meal_plan_templates WHERE id = $1', [cleanId]);

    return NextResponse.json({ success: true, message: 'Template deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
