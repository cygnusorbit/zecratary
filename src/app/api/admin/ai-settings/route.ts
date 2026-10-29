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

export async function GET() {
  try {
    const rows: any = await query('SELECT * FROM admin_settings LIMIT 1;');
    const row = parseDbRow(rows);
    if (row) {
      return NextResponse.json({ success: true, settings: row });
    }
  } catch (_) {}

  return NextResponse.json({
    success: true,
    settings: {
      site_name: 'Zecratary',
      ai_provider: 'gemini',
      ai_model: 'gemini-3.5-flash-lite',
      currency: 'USD',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, settings: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
