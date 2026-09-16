import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function syncUserToStore(user: any): any {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, 'apps/web/data/users.json'),
    path.join(cwd, 'data/users.json')
  ];

  let resolvedUser = user;

  for (const p of paths) {
    try {
      let usersList: any[] = [];
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        usersList = JSON.parse(raw);
        if (!Array.isArray(usersList)) usersList = [];
      } else {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      }

      const existingIndex = usersList.findIndex(
        (u) => u && u.email && u.email.toLowerCase() === user.email.toLowerCase()
      );

      if (existingIndex >= 0) {
        usersList[existingIndex] = {
          ...usersList[existingIndex],
          name: user.name || usersList[existingIndex].name,
          picture: user.picture || usersList[existingIndex].picture,
          avatar: user.picture || usersList[existingIndex].avatar
        };
        resolvedUser = usersList[existingIndex];
      } else {
        usersList.unshift(user);
      }

      fs.writeFileSync(p, JSON.stringify(usersList, null, 2), 'utf-8');
    } catch (err) {
      console.error('[google-session] Error syncing user to store:', p, err);
    }
  }

  return resolvedUser;
}

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

    const finalUser = syncUserToStore(candidateUser);

    // Prevent circular redirects to /login
    let targetUrl = requestedCallback;
    if (!targetUrl || targetUrl === '/login' || targetUrl.startsWith('/login?')) {
      targetUrl = finalUser.role === 'admin' ? '/admin' : '/profile';
    }

    const response = NextResponse.json({
      success: true,
      user: finalUser,
      redirectUrl: targetUrl
    });

    const serializedUser = JSON.stringify(finalUser);
    response.cookies.set('zecratary_current_user', serializedUser, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7
    });

    response.cookies.set('zecratary_auth_session', serializedUser, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7
    });

    return response;
  } catch (err: any) {
    console.error('[google-session] Error:', err);
    return NextResponse.json({ error: err.message || 'Session creation failed' }, { status: 500 });
  }
}
