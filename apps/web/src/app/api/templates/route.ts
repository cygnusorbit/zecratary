import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';


// Module-scoped type-safe database row extractors (unexported to prevent Next.js TS2344)
function parseDbRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && Array.isArray((res as any).rows)) return (res as any).rows;
  return [];
}

function parseDbRow<T = any>(res: any): T | null {
  const rows = parseDbRows<T>(res);
  return rows.length > 0 ? rows[0] : null;
}


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'usr_admin_1';

    let templates: any[] = [];
    try {
      const res: any = await query(`
        SELECT id, user_id, title, description, duration_days, is_public, days_json, created_at, updated_at
        FROM meal_templates
        WHERE user_id = $1 OR is_public = true
        ORDER BY created_at DESC;
      `, [userId]);

      const rows = parseDbRows(res);
      templates = rows.map((r: any) => {
        let parsedDays: any[] = [];
        try {
          parsedDays = typeof r.days_json === 'string' ? JSON.parse(r.days_json) : (r.days_json || []);
        } catch (_) {
          parsedDays = [];
        }
        if (!Array.isArray(parsedDays)) parsedDays = [];

        return {
          id: r.id,
          userId: r.user_id,
          title: r.title,
          description: r.description,
          durationDays: Number(r.duration_days) || (parsedDays.length > 0 ? parsedDays.length : 7),
          isPublic: Boolean(r.is_public),
          days: parsedDays,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      });
    } catch (_) {}

    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, title, description, durationDays, isPublic, days } = body;

    const safeId = id || `tmpl_${Date.now()}`;
    const safeUserId = userId || 'usr_admin_1';
    const safeDaysJson = JSON.stringify(Array.isArray(days) ? days : []);

    try {
      await query(`
        CREATE TABLE IF NOT EXISTS meal_templates (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          duration_days INT DEFAULT 7,
          is_public BOOLEAN DEFAULT false,
          days_json TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        INSERT INTO meal_templates (id, user_id, title, description, duration_days, is_public, days_json, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          duration_days = EXCLUDED.duration_days,
          is_public = EXCLUDED.is_public,
          days_json = EXCLUDED.days_json,
          updated_at = NOW();
      `, [safeId, safeUserId, title, description || '', durationDays || 7, Boolean(isPublic), safeDaysJson]);
    } catch (dbErr: any) {
      console.warn('[api/templates] DB commit notice:', dbErr.message);
    }

    return NextResponse.json({ success: true, id: safeId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
