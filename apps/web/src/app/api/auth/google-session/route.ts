import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('zecratary_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (_) {
      parsed = JSON.parse(sessionCookie);
    }

    if (!parsed?.email) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const rows = await query('SELECT id, name, email, role, subscription_plan AS "subscriptionPlan" FROM users WHERE email = $1 LIMIT 1', [parsed.email.toLowerCase().trim()]);
    if (rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: rows[0]
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
