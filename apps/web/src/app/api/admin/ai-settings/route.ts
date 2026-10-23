import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows: any = await query('SELECT * FROM admin_settings LIMIT 1;');
    const row = Array.isArray(rows) ? rows[0] : (rows?.rows?.[0] || null);
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
