import os
import glob
import json
import re

print("🚀 Starting Google OAuth session synchronization & client bridge fix...")

# -------------------------------------------------------------
# 1. Locate App Router and Library Directories
# -------------------------------------------------------------
candidates = [
    'apps/web/src/app',
    'src/app',
    'apps/web/app',
    'app'
]
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/social-login-setting/page.tsx', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(matches[0])))
    else:
        app_dir = 'apps/web/src/app'

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib') if os.path.exists(os.path.join(base_dir, 'lib')) else os.path.join(os.getcwd(), 'lib')
if not os.path.exists(lib_dir):
    matches_lib = glob.glob('**/lib/auth.ts', recursive=True)
    if matches_lib:
        lib_dir = os.path.dirname(matches_lib[0])

print(f"✓ Target App Router Path: {app_dir}")
print(f"✓ Target Lib Path: {lib_dir}")

# -------------------------------------------------------------
# 2. Provision Dual-Path Persistent Server Users Store
# -------------------------------------------------------------
data_dirs = [
    os.path.join(os.getcwd(), 'apps/web/data'),
    os.path.join(os.getcwd(), 'data')
]

default_users = [
    {
        "id": "usr_admin_1",
        "name": "System Administrator",
        "email": "admin@zecratary.com",
        "role": "admin",
        "subscriptionPlan": "nutrition-pro-annual",
        "createdAt": "2026-01-01T00:00:00.000Z"
    }
]

for d in data_dirs:
    os.makedirs(d, exist_ok=True)
    u_file = os.path.join(d, 'users.json')
    if not os.path.exists(u_file):
        with open(u_file, 'w', encoding='utf-8') as f:
            json.dump(default_users, f, indent=2)
        print(f"✓ Provisioned default users store: {u_file}")

# -------------------------------------------------------------
# 3. Patch lib/auth.ts to Support Cookie & Storage Session Fallback
# -------------------------------------------------------------
auth_file = os.path.join(lib_dir, 'auth.ts')
if os.path.exists(auth_file):
    try:
        with open(auth_file, 'r', encoding='utf-8') as f:
            auth_content = f.read()

        # Ensure getCurrentUser checks both localStorage and document.cookie
        cookie_helper = """
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}
"""
        if 'function getCookie(' not in auth_content:
            auth_content = cookie_helper + auth_content

        # Update getCurrentUser to recover from cookie if localStorage is empty
        pattern = r'export function getCurrentUser\(\)[^{]+\{(?:[^{}]*|\{[^{}]*\})*\}'
        replacement = """export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('zecratary_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
  } catch (_) {}

  // Fallback: Recover session from cookie
  try {
    const cookieRaw = getCookie('zecratary_current_user') || getCookie('zecratary_auth_session');
    if (cookieRaw) {
      const parsed = JSON.parse(cookieRaw);
      if (parsed && parsed.email) {
        try {
          localStorage.setItem('zecratary_current_user', JSON.stringify(parsed));
        } catch (_) {}
        return parsed;
      }
    }
  } catch (_) {}

  return null;
}"""
        auth_content = re.sub(pattern, replacement, auth_content)

        with open(auth_file, 'w', encoding='utf-8') as f:
            f.write(auth_content)
        print(f"✓ Enhanced {auth_file} with dual-layer cookie & storage session resolution")
    except Exception as e:
        print(f"⚠️ Warning updating auth.ts: {e}")

# -------------------------------------------------------------
# 4. Deploy /api/auth/login/google/route.ts
# -------------------------------------------------------------
login_google_dir = os.path.join(app_dir, 'api', 'auth', 'login', 'google')
os.makedirs(login_google_dir, exist_ok=True)
login_google_file = os.path.join(login_google_dir, 'route.ts')

login_google_code = """import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/profile';
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

  if (!clientId) {
    const errorUrl = new URL('/login', req.url);
    errorUrl.searchParams.set('error', 'missing_google_client_id');
    return NextResponse.redirect(errorUrl);
  }

  if (!clientSecret) {
    const errorUrl = new URL('/login', req.url);
    errorUrl.searchParams.set('error', 'missing_google_client_secret');
    return NextResponse.redirect(errorUrl);
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;

  const statePayload = JSON.stringify({
    callbackUrl,
    provider: 'google',
    nonce: Math.random().toString(36).substring(2, 12),
    timestamp: Date.now()
  });
  const state = Buffer.from(statePayload).toString('base64url');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('include_granted_scopes', 'true');
  googleAuthUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(googleAuthUrl.toString(), 307);
  res.cookies.set('zecratary_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600
  });

  return res;
}
"""

with open(login_google_file, 'w', encoding='utf-8') as f:
    f.write(login_google_code)
print(f"✓ Provisioned Google Login Route: {login_google_file}")

# -------------------------------------------------------------
# 5. Deploy Complete OAuth Callback Handler with HTML Bridge
# -------------------------------------------------------------
callback_google_dir = os.path.join(app_dir, 'api', 'auth', 'callback', 'google')
os.makedirs(callback_google_dir, exist_ok=True)
callback_google_file = os.path.join(callback_google_dir, 'route.ts')

callback_google_code = """import { NextRequest, NextResponse } from 'next/server';
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
        fs.mkdirSync(path.dirname(p), { recursive: true });
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

  let callbackUrl = '/profile';
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

  if (!clientId || !clientSecret) {
    const errUrl = new URL('/login', req.url);
    errUrl.searchParams.set('error', 'missing_google_client_secret');
    return NextResponse.redirect(errUrl);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/callback/google`;
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
      errUrl.searchParams.set(
        'error', 
        tokenData.error_description || tokenData.error || 'token_exchange_failed'
      );
      return NextResponse.redirect(errUrl);
    }

    // Extract user profile claims from Google id_token
    let profile: any = {};
    if (tokenData.id_token) {
      try {
        const payloadBase64 = tokenData.id_token.split('.')[1];
        profile = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      } catch (_) {}
    }

    // Secondary fallback: Google UserInfo endpoint
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

    // Determine initial role
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
    const finalRedirectTarget = callbackUrl || (finalUser.role === 'admin' ? '/admin' : '/profile');

    // Instant HTML Bridge: Writes session to client auth and redirects
    const htmlBridge = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authenticating...</title>
  <script>
    (function() {
      try {
        const user = ${JSON.stringify(finalUser)};
        localStorage.setItem('zecratary_current_user', JSON.stringify(user));
        
        try {
          const raw = localStorage.getItem('zecratary_users');
          let list = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];
          const idx = list.findIndex(function(u) { return u && u.email && u.email.toLowerCase() === user.email.toLowerCase(); });
          if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], user);
          } else {
            list.unshift(user);
          }
          localStorage.setItem('zecratary_users', JSON.stringify(list));
        } catch (_) {}

        window.dispatchEvent(new Event('zecratary_auth_changed'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Session bridge error:', err);
      }
      window.location.replace(${JSON.stringify(finalRedirectTarget)});
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
    console.error('[OAuth Callback Exception]:', err);
    const errUrl = new URL('/login', req.url);
    errUrl.searchParams.set('error', err.message || 'oauth_handshake_error');
    return NextResponse.redirect(errUrl);
  }
}
"""

with open(callback_google_file, 'w', encoding='utf-8') as f:
    f.write(callback_google_code)
print(f"✓ Deployed Client Session Bridge Callback Handler: {callback_google_file}")

# -------------------------------------------------------------
# 6. Update /login/page.tsx with Explicit Error Diagnostics
# -------------------------------------------------------------
login_path = os.path.join(app_dir, 'login', 'page.tsx')
if os.path.exists(login_path):
    try:
        with open(login_path, 'r', encoding='utf-8') as f:
            l_code = f.read()

        # Update error resolution block for Google secret guidance
        if 'missing_google_client_secret' not in l_code:
            l_code = l_code.replace(
                "if (err === 'missing_google_client_id') {",
                "if (err === 'missing_google_client_id') {\n        setErrorMsg(t('missingGoogleClientId') || 'Google Client ID is not configured. Please add it in /admin/social-login-setting.');\n      } else if (err === 'missing_google_client_secret') {\n        setErrorMsg(t('missingGoogleClientSecret') || 'Google Client Secret is not configured. Please add it in /admin/social-login-setting.');"
            )
            with open(login_path, 'w', encoding='utf-8') as f:
                f.write(l_code)
            print(f"✓ Added missing client secret diagnostics to {login_path}")
    except Exception as e:
        print(f"⚠️ Warning updating login page: {e}")

print("\n✨ Google OAuth login session bridge deployed successfully!")
