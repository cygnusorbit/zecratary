import { NextRequest, NextResponse } from 'next/server';
import { getPostgresPool } from '@/lib/postgresUser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let userEmail: string | null = null;
    let userId: string | null = null;

    // 1. Extract user identification from payload if provided
    try {
      const body = await req.json().catch(() => ({}));
      if (body && body.email) userEmail = body.email;
      if (body && body.id) userId = body.id;
    } catch (_) {}

    // 2. Extract user identification from session cookies
    if (!userEmail && !userId) {
      const userCookie = 
        req.cookies.get('zecratary_current_user')?.value ||
        req.cookies.get('zecratary_auth_session')?.value ||
        req.cookies.get('zecratary_session')?.value ||
        req.cookies.get('currentUser')?.value;

      if (userCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(userCookie));
          if (parsed.email) userEmail = parsed.email;
          if (parsed.id) userId = parsed.id;
        } catch (_) {}
      }
    }

    // 3. Persist logout event to PostgreSQL
    const pool = getPostgresPool();
    if (pool && (userEmail || userId)) {
      try {
        await pool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP WITH TIME ZONE;
        `);

        if (userId) {
          await pool.query(
            `UPDATE users SET last_logout_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [userId]
          );
        } else if (userEmail) {
          await pool.query(
            `UPDATE users SET last_logout_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER($1)`,
            [userEmail.toLowerCase().trim()]
          );
        }
      } catch (dbErr) {
        console.error('[PostgreSQL] Failed to log user sign-out:', dbErr);
      }
    }

    // 4. Invalidate all auth cookies across root path
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      redirectUrl: '/'
    });

    const cookiesToClear = [
      'zecratary_session',
      'zecratary_current_user',
      'zecratary_auth_session',
      'currentUser'
    ];

    for (const name of cookiesToClear) {
      response.cookies.set(name, '', {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        expires: new Date(0)
      });
    }

    return response;
  } catch (err: any) {
    console.error('[logout] Error processing logout:', err);
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', req.url));
  const cookiesToClear = [
    'zecratary_session',
    'zecratary_current_user',
    'zecratary_auth_session',
    'currentUser'
  ];

  for (const name of cookiesToClear) {
    response.cookies.set(name, '', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0)
    });
  }

  return response;
}
