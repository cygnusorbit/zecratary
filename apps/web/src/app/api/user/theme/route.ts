import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT theme_colors FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    const themeColors = rows.length > 0 ? rows[0].theme_colors : {};
    return NextResponse.json({ success: true, themeColors }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const colors = body.colors || body.themeColors || body;

    await query(`
      UPDATE admin_settings SET
        theme_colors = $1::jsonb,
        updated_at = NOW()
      WHERE id = 'primary_settings'
    `, [JSON.stringify(colors)]);

    return NextResponse.json({ success: true, message: 'Theme colors updated in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
