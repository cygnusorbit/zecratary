import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT supported_languages FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    const languages = rows[0]?.supported_languages || [];
    return NextResponse.json({ success: true, languages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const languages = body.languages || body;

    await query(`
      UPDATE admin_settings SET
        supported_languages = $1::jsonb,
        updated_at = NOW()
      WHERE id = 'primary_settings'
    `, [JSON.stringify(languages)]);

    return NextResponse.json({ success: true, message: 'Languages updated in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
