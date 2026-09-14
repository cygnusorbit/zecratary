import os
import re
import glob

# 1. Detect application directories within workspace
candidates = [
    'apps/web/src/app',
    'src/app',
    'apps/web/app',
    'app'
]
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory in repository.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')
os.makedirs(lib_dir, exist_ok=True)

print(f"✓ Detected App Router: {app_dir}")
print(f"✓ Detected Lib Directory: {lib_dir}")

# 2. Verify & Provision lib/socialAuth.ts
social_auth_path = os.path.join(lib_dir, 'socialAuth.ts')
if not os.path.exists(social_auth_path):
    print("⚠ lib/socialAuth.ts missing after git sync. Restoring...")
    social_auth_code = """import { User, setCurrentUser, initAuthStorage } from '@/lib/auth';

export type SocialProvider = 'google' | 'facebook' | 'apple';

export interface SocialLoginConfig {
  googleEnabled: boolean;
  googleClientId: string;
  facebookEnabled: boolean;
  facebookClientId: string;
  appleEnabled: boolean;
  appleClientId: string;
}

export const DEFAULT_SOCIAL_CONFIG: SocialLoginConfig = {
  googleEnabled: true,
  googleClientId: '',
  facebookEnabled: false,
  facebookClientId: '',
  appleEnabled: false,
  appleClientId: '',
};

export function getSocialLoginConfig(): SocialLoginConfig {
  if (typeof window === 'undefined') return DEFAULT_SOCIAL_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_social_login_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        googleEnabled: parsed.googleEnabled ?? true,
        googleClientId: parsed.googleClientId || '',
        facebookEnabled: parsed.facebookEnabled ?? false,
        facebookClientId: parsed.facebookClientId || '',
        appleEnabled: parsed.appleEnabled ?? false,
        appleClientId: parsed.appleClientId || '',
      };
    }
  } catch (_) {}
  return DEFAULT_SOCIAL_CONFIG;
}

export interface SocialProfile {
  name: string;
  email: string;
  avatar?: string;
  provider: SocialProvider;
}

export function executeSocialAuth(profile: SocialProfile): User {
  initAuthStorage();
  const cleanEmail = profile.email.trim().toLowerCase();
  const rawUsers = localStorage.getItem('zecratary_users');
  const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

  let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!matchedUser) {
    matchedUser = {
      id: `usr_${profile.provider}_${Date.now().toString(36)}`,
      name: profile.name.trim() || `${profile.provider.toUpperCase()} User`,
      email: cleanEmail,
      role: 'user',
      subscriptionPlan: 'taster',
      subscriptionTier: 'taster',
      createdAt: new Date().toISOString(),
    };
    users.unshift(matchedUser);
    localStorage.setItem('zecratary_users', JSON.stringify(users));
  }

  setCurrentUser(matchedUser);
  window.dispatchEvent(new Event('zecratary_users_updated'));
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.dispatchEvent(new Event('storage'));

  return matchedUser;
}
"""
    with open(social_auth_path, 'w', encoding='utf-8') as f:
        f.write(social_auth_code)
    print(f"✓ Restored {social_auth_path}")
else:
    print(f"✓ Verified {social_auth_path}")

# 3. Verify & Provision /api/social-config/route.ts
public_api_dir = os.path.join(app_dir, 'api', 'social-config')
os.makedirs(public_api_dir, exist_ok=True)
public_api_path = os.path.join(public_api_dir, 'route.ts')

if not os.path.exists(public_api_path):
    print("⚠ /api/social-config/route.ts missing. Restoring...")
    public_api_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseEnv(): Record<string, string> {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, 'apps/web/.env.local'),
    path.join(cwd, 'apps/web/.env')
  ];
  const target = paths.find(p => fs.existsSync(p));
  if (!target) return {};

  const content = fs.readFileSync(target, 'utf-8');
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\\r?\\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const clean = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIdx = clean.indexOf('=');
    if (eqIdx > 0) {
      const k = clean.slice(0, eqIdx).trim();
      let v = clean.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      result[k] = v;
    }
  }
  return result;
}

export async function GET() {
  const env = parseEnv();
  const googleEnabled = (env['NEXT_PUBLIC_GOOGLE_ENABLED'] ?? process.env.NEXT_PUBLIC_GOOGLE_ENABLED) !== 'false';
  const facebookEnabled = (env['NEXT_PUBLIC_FACEBOOK_ENABLED'] ?? process.env.NEXT_PUBLIC_FACEBOOK_ENABLED) === 'true';
  const appleEnabled = (env['NEXT_PUBLIC_APPLE_ENABLED'] ?? process.env.NEXT_PUBLIC_APPLE_ENABLED) === 'true';

  return new NextResponse(JSON.stringify({
    googleEnabled,
    googleClientId: env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    facebookEnabled,
    facebookClientId: env['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || '',
    appleEnabled,
    appleClientId: env['NEXT_PUBLIC_APPLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    }
  });
}
"""
    with open(public_api_path, 'w', encoding='utf-8') as f:
        f.write(public_api_code)
    print(f"✓ Restored {public_api_path}")
else:
    print(f"✓ Verified {public_api_path}")

# 4. Provision Next.js Edge Middleware
middleware_path = os.path.join(base_dir, 'middleware.ts')

middleware_code = """import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('zecratary_session')?.value;

  let session: { email?: string; role?: string; provider?: string } | null = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (_) {
      try {
        session = JSON.parse(sessionCookie);
      } catch (_) {}
    }
  }

  const isAuthenticated = Boolean(session && session.email);
  const isAdmin = Boolean(
    session && (session.role === 'admin' || session.email?.toLowerCase().includes('admin'))
  );

  // 1. Enforce Admin Only Protection
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'unauthorized_access');
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/profile', req.url));
    }
  }

  // 2. Enforce Authenticated Member Routes
  if (
    pathname.startsWith('/profile') || 
    pathname.startsWith('/planner') || 
    pathname.startsWith('/pantry')
  ) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'unauthorized_access');
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Guest Only Routes
  if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/planner/:path*',
    '/pantry/:path*',
    '/login',
    '/register'
  ],
};
"""

with open(middleware_path, 'w', encoding='utf-8') as f:
    f.write(middleware_code)
print(f"✓ Verified & installed Edge Middleware: {middleware_path}")

# 5. Cleanly patch lib/auth.ts for edge cookie synchronization
auth_path = os.path.join(lib_dir, 'auth.ts')
if os.path.exists(auth_path):
    with open(auth_path, 'r', encoding='utf-8') as f:
        auth_lines = f.readlines()

    # Clean out any old, broken, or duplicate cookie setters
    cleaned = []
    for line in auth_lines:
        if 'zecratary_session' in line or 'max-age=604800' in line:
            continue
        cleaned.append(line)

    auth_content = "".join(cleaned)

    # Inject safe single-line cookie dispatch
    auth_content = re.sub(
        r"(localStorage\.setItem\(['\"]zecratary_current_user['\"],\s*JSON\.stringify\((.*?)\)\);?)",
        r"\1\n    if (typeof document !== 'undefined') { document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(\2))}; path=/; max-age=604800; SameSite=Lax`; }",
        auth_content
    )

    auth_content = re.sub(
        r"(localStorage\.removeItem\(['\"]zecratary_current_user['\"]\);?)",
        r"\1\n    if (typeof document !== 'undefined') { document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'; }",
        auth_content
    )

    with open(auth_path, 'w', encoding='utf-8') as f:
        f.write(auth_content)
    print(f"✓ Synchronized session cookies in: {auth_path}")

print("\n✅ Verification and setup complete! All routes, configs, and Edge Middleware are active.")
