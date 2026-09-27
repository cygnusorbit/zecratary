import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS meal_plan_templates (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        created_by VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        days JSONB DEFAULT '[]',
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

    let sql = 'SELECT * FROM meal_plan_templates WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ` AND (user_id = $${params.length} OR created_by = $${params.length} OR user_id = 'usr_admin_1' OR user_id IS NULL)`;
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);

    const formatted = rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      createdBy: r.created_by,
      title: r.title,
      description: r.description || '',
      days: Array.isArray(r.days) ? r.days : (typeof r.days === 'string' ? JSON.parse(r.days || '[]') : []),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return NextResponse.json({ success: true, templates: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const templatesList = Array.isArray(body) ? body : (Array.isArray(body.templates) ? body.templates : [body]);

    for (const t of templatesList) {
      if (!t || !t.title) continue;
      const id = String(t.id || 'tpl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      const userId = t.userId || 'usr_admin_1';
      const createdBy = t.createdBy || 'admin@zecratary.com';
      const title = String(t.title || 'Untitled Template').trim();
      const description = String(t.description || '').trim();
      const days = Array.isArray(t.days) ? t.days : [];

      await query(`
        INSERT INTO meal_plan_templates (
          id, user_id, created_by, title, description, days, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          created_by = EXCLUDED.created_by,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          days = EXCLUDED.days,
          updated_at = NOW();
      `, [id, userId, createdBy, title, description, JSON.stringify(days)]);
    }

    return NextResponse.json({ success: true, count: templatesList.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    try {
      const body = await req.json();
      if (body?.id) id = body.id;
    } catch (_) {}

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    await query('DELETE FROM meal_plan_templates WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Template deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
