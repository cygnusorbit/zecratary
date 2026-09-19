import { NextRequest, NextResponse } from 'next/server';
import { syncUserToPostgres } from '@/lib/postgresUser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profile = body.profile;
    const requestedCallback = body.callbackUrl;

    if (!profile || !profile.email) {
      return NextResponse.json({ error: 'Missing profile email' }, { status: 400 });
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || profile.given_name || email.split('@')[0];
    const picture = profile.picture || '';
    const googleId = profile.sub || profile.id || Date.now().toString();

    const isEmailAdmin = email.includes('admin') || email === 'cygnusorbit@gmail.com' || email.startsWith('admin@');

    const candidateUser = {
      id: `usr_g_${googleId}`,
      name,
      email,
      role: isEmailAdmin ? 'admin' : 'user',
      subscriptionPlan: isEmailAdmin ? 'nutrition-pro-annual' : 'taster',
      picture,
      avatar: picture,
      createdAt: new Date().toISOString()
    };

    const finalUser = await syncUserToPostgres(candidateUser);

    let targetUrl = (requestedCallback || '').trim();
    if (
      !targetUrl || 
      targetUrl === '/login' || 
      targetUrl.startsWith('/login?') || 
      targetUrl.startsWith('/login/') ||
      targetUrl === '/register'
    ) {
      targetUrl = finalUser.role === 'admin' ? '/admin' : '/profile';
    }

    const response = NextResponse.json({
      success: true,
      user: finalUser,
      redirectUrl: targetUrl
    });

    const serializedUser = JSON.stringify(finalUser);
    const cookieNames = [
      'zecratary_session',
      'zecratary_current_user',
      'zecratary_auth_session',
      'currentUser'
    ];

    for (const cname of cookieNames) {
      response.cookies.set(cname, serializedUser, {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 7
      });
    }

    return response;
  } catch (err: any) {
    console.error('[google-session] Error:', err);
    return NextResponse.json({ error: err.message || 'Session creation failed' }, { status: 500 });
  }
}
