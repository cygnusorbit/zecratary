// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getTemplatesFilePath() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'meal_templates.json');
}

function readLocalTemplates(): any[] {
  try {
    const p = getTemplatesFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw) || [];
    }
  } catch (_) {}
  return [];
}

function writeLocalTemplates(items: any[]) {
  try {
    const p = getTemplatesFilePath();
    fs.writeFileSync(p, JSON.stringify(items, null, 2), 'utf-8');
  } catch (_) {}
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    // 1. Try PostgreSQL if pool configured
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query(`
          CREATE TABLE IF NOT EXISTS meal_templates (
            id VARCHAR(120) PRIMARY KEY,
            user_id VARCHAR(120) NOT NULL,
            created_by VARCHAR(255),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(120) DEFAULT 'General',
            total_days INT DEFAULT 7,
            meals JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_meal_templates_user ON meal_templates(user_id);
        `);

        const sql = userId
          ? 'SELECT * FROM meal_templates WHERE user_id = $1 ORDER BY created_at DESC'
          : 'SELECT * FROM meal_templates ORDER BY created_at DESC';
        const params = userId ? [userId] : [];
        const result = await query(sql, params);

        if (result && Array.isArray(result.rows)) {
          const templates = result.rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            createdBy: r.created_by,
            title: r.title,
            description: r.description,
            category: r.category,
            totalDays: r.total_days || 7,
            meals: typeof r.meals === 'string' ? JSON.parse(r.meals) : (r.meals || [])
          }));
          return NextResponse.json({ success: true, templates });
        }
      }
    } catch (_) {}

    // 2. Fallback to Local JSON store
    const all = readLocalTemplates();
    const filtered = userId ? all.filter(t => !t.userId || t.userId === userId) : all;
    return NextResponse.json({ success: true, templates: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, templates: [], error: err.message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, createdBy, templates } = body;

    if (!Array.isArray(templates)) {
      return NextResponse.json({ success: false, error: 'Templates array required' }, { status: 400 });
    }

    // 1. Try PostgreSQL persistence
    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function' && userId) {
        await query('DELETE FROM meal_templates WHERE user_id = $1', [userId]);
        for (const t of templates) {
          await query(`
            INSERT INTO meal_templates (id, user_id, created_by, title, description, category, total_days, meals, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              category = EXCLUDED.category,
              total_days = EXCLUDED.total_days,
              meals = EXCLUDED.meals,
              updated_at = CURRENT_TIMESTAMP
          `, [
            t.id,
            userId,
            createdBy || userId,
            t.title,
            t.description || '',
            t.category || 'General',
            Number(t.totalDays || 7),
            JSON.stringify(t.meals || [])
          ]);
        }
      }
    } catch (_) {}

    // 2. Update local fallback JSON
    const existing = readLocalTemplates();
    const retained = userId ? existing.filter(i => i.userId && i.userId !== userId) : [];
    writeLocalTemplates([...retained, ...templates]);

    return NextResponse.json({ success: true, count: templates.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

    try {
      const { query } = await import('@/lib/db').catch(() => ({ query: null }));
      if (typeof query === 'function') {
        await query('DELETE FROM meal_templates WHERE id = $1', [id]);
      }
    } catch (_) {}

    const existing = readLocalTemplates();
    writeLocalTemplates(existing.filter(t => t.id !== id));

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
