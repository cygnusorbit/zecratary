import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS meal_templates (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(100),
        created_by VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT 'General',
        total_days INT DEFAULT 7,
        meals JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_meal_templates_user ON meal_templates(user_id);
    `);
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  await ensureTable();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || '';

    let sql = 'SELECT * FROM meal_templates';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += ' WHERE user_id = $1 OR created_by = $1 OR user_id = \'usr_admin_1\' OR user_id IS NULL';
    }

    sql += ' ORDER BY created_at DESC';

    const rows: any = await query(sql, params);
    const rawItems = (Array.isArray(rows) ? rows : (((rows as any)?.rows) || []));

    const formatted = rawItems.map((r: any) => ({
      id: r.id,
      userId: r.user_id || 'usr_admin_1',
      createdBy: r.created_by || '',
      title: r.title,
      description: r.description || '',
      category: r.category || 'General',
      totalDays: Number(r.total_days || 7),
      meals: Array.isArray(r.meals) ? r.meals : (typeof r.meals === 'string' ? JSON.parse(r.meals) : []),
      createdAt: r.created_at || new Date().toISOString()
    }));

    return NextResponse.json(
      { success: true, templates: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, templates: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureTable();
  try {
    const body = await req.json();
    const targetUserId = body.userId || body.user_id || 'usr_admin_1';
    const userEmail = body.createdBy || body.created_by || 'admin@zecratary.com';

    const items = Array.isArray(body) ? body : (body.templates || [body.template || body]);

    for (const t of items) {
      if (!t || !t.title) continue;
      const tId = t.id || ('tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));

      await query(`
        INSERT INTO meal_templates (
          id, user_id, created_by, title, description, category, total_days, meals, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          total_days = EXCLUDED.total_days,
          meals = EXCLUDED.meals,
          updated_at = NOW();
      `, [
        tId,
        targetUserId,
        userEmail,
        t.title.trim(),
        t.description || '',
        t.category || 'General',
        Number(t.totalDays || 7),
        JSON.stringify(Array.isArray(t.meals) ? t.meals : [])
      ]);
    }

    return NextResponse.json({ success: true, message: 'Meal template(s) saved in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureTable();
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

    await query('DELETE FROM meal_templates WHERE id = $1', [id.trim()]);
    return NextResponse.json({ success: true, message: 'Template deleted from PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
