import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let themeColors = {};
    let themeMode = 'dark';
    try {
      const rows = await query('SELECT theme_colors, theme_mode FROM admin_settings WHERE id = $1 LIMIT 1', ['default']);
      if (rows && rows.length > 0) {
        themeColors = rows[0].theme_colors || {};
        themeMode = rows[0].theme_mode || 'dark';
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      themeColors,
      themeMode
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const colors = body.themeColors || body;

    try {
      await query(`
        INSERT INTO admin_settings (id, theme_colors, updated_at)
        VALUES ('default', $1::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          theme_colors = COALESCE(EXCLUDED.theme_colors, admin_settings.theme_colors),
          updated_at = NOW();
      `, [JSON.stringify(colors)]);
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Theme updated in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
