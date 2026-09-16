import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        siteName: 'Zecratary',
        titlebarEmoji: '🍳',
        titlebarImage: '',
        faviconEmoji: '🍳',
        faviconImage: '',
        currency: 'USD',
        themeColors: {},
        supportedLanguages: []
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const r = rows[0];
    return NextResponse.json({
      success: true,
      siteName: r.site_name || 'Zecratary',
      titlebarEmoji: r.titlebar_emoji || '🍳',
      titlebarImage: r.titlebar_image || '',
      faviconEmoji: r.favicon_emoji || '🍳',
      faviconImage: r.favicon_image || '',
      currency: r.currency || 'USD',
      themeColors: r.theme_colors || {},
      supportedLanguages: r.supported_languages || []
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
