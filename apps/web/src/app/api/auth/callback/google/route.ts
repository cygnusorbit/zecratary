import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getAdminSettings(): any {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, 'apps/web/data/admin_settings.json'),
    path.join(cwd, 'data/admin_settings.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return {};
}

function getRedirectUri(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
  const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
  return `${proto}://${host}/api/auth/callback/google`;
}

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
      console.error('[OAuth Callback] Error syncing user to store:', p, err);
    }
  }

  return resolvedUser;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    const errUrl = new URL('/login', req.url);
    errUrl.searchParams.set('error', error === 'access_denied' ? 'google_access_denied' : error);
    return NextResponse.redirect(errUrl);
  }

  if (!code) {
    const errUrl = new URL('/login', req.url);
    errUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(errUrl);
  }

  let callbackUrl = '';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      if (decoded.callbackUrl) callbackUrl = decoded.callbackUrl;
    } catch (_) {}
  }

  const settings = getAdminSettings();
  const social = settings?.socialLogin || {};
  const clientId = (
    social.googleClientId || 
    process.env.GOOGLE_CLIENT_ID || 
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
    ''
  ).trim();

  const clientSecret = (
    social.googleClientSecret || 
    process.env.GOOGLE_CLIENT_SECRET || 
    process.env.GOOGLE_SECRET || 
    ''
  ).trim();

  const redirectUri = getRedirectUri(req);

  if (!clientId || !clientSecret) {
    const errUrl = new URL('/login', req.url);
    errUrl.searchParams.set('error', 'missing_google_client_secret');
    return NextResponse.redirect(errUrl);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || (!tokenData.access_token && !tokenData.id_token)) {
      console.error('[OAuth Callback] Token Exchange Failure:', tokenData);
      const errUrl = new URL('/login', req.url);
      errUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(errUrl);
    }

    let profile: any = {};
    if (tokenData.id_token) {
      try {
        const payloadBase64 = tokenData.id_token.split('.')[1];
        profile = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      } catch (_) {}
    }

    if (!profile.email && tokenData.access_token) {
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userRes.ok) {
          const uData = await userRes.json();
          profile = { ...profile, ...uData };
        }
      } catch (_) {}
    }

    if (!profile.email) {
      const errUrl = new URL('/login', req.url);
      errUrl.searchParams.set('error', 'no_email_returned');
      return NextResponse.redirect(errUrl);
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || profile.given_name || email.split('@')[0];
    const picture = profile.picture || '';
    const googleId = profile.sub || Date.now().toString();

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

    let destination = callbackUrl;
    if (!destination || destination === '/login' || destination.startsWith('/login?')) {
      destination = finalUser.role === 'admin' ? '/admin' : '/profile';
    }

    const serializedUser = JSON.stringify(finalUser);

    const htmlBridge = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Signing In...</title>
  <script>
    (function() {
      try {
        var user = ${serializedUser};
        localStorage.setItem('zecratary_current_user', JSON.stringify(user));
        document.cookie = 'zecratary_current_user=' + encodeURIComponent(JSON.stringify(user)) + '; path=/; max-age=604800; SameSite=Lax';
        
        try {
          var raw = localStorage.getItem('zecratary_users');
          var list = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];
          var idx = list.findIndex(function(u) { return u && u.email && u.email.toLowerCase() === user.email.toLowerCase(); });
          if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], user);
          } else {
            list.unshift(user);
          }
          localStorage.setItem('zecratary_users', JSON.stringify(list));
        } catch (_) {}

        window.dispatchEvent(new Event('zecratary_auth_changed'));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Session bridge error:', err);
      }
      window.location.replace(${JSON.stringify(destination)});
    })();
  </script>
</head>
<body style="background:#0b0f17;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;">
    <div style="width:40px;height:40px;border:3px solid #E05638;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
    <div style="font-weight:700;font-size:16px;margin-bottom:6px;">Signed in as ${name}</div>
    <div style="font-size:12px;color:#94a3b8;">Redirecting to your dashboard...</div>
  </div>
  <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
</body>
</html>`;

    const response = new NextResponse(htmlBridge, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });

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
    console.error('[OAuth Callback Exception]:', err);
    const errUrl = new URL('/login', req.url);
    errUrl.searchParams.set('error', err.message || 'oauth_handshake_error');
    return NextResponse.redirect(errUrl);
  }
}
