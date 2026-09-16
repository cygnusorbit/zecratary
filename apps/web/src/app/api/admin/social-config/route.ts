import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT social_login FROM admin_settings WHERE id = $1 LIMIT 1', ['primary_settings']);
    const socialLogin = rows[0]?.social_login || {};
    return NextResponse.json({ success: true, socialLogin }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const socialLogin = body.socialLogin || body;

    await query(`
      UPDATE admin_settings SET
        social_login = $1::jsonb,
        updated_at = NOW()
      WHERE id = 'primary_settings'
    `, [JSON.stringify(socialLogin)]);

    return NextResponse.json({ success: true, message: 'Social login settings updated in PostgreSQL.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
