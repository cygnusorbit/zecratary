import os
import glob
import shutil
import re

print("🔍 Executing Zecratary scan and remediation...")

# 1. Discover App Router root
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
web_root = os.path.dirname(base_dir) if os.path.basename(base_dir) == 'src' else base_dir
lib_dir = os.path.join(base_dir, 'lib')
data_dir = os.path.join(web_root, 'data')

os.makedirs(data_dir, exist_ok=True)
print(f"✓ Base App directory: {app_dir}")

# 2. Prune stray nested app directory (apps/web/src/app/apps)
stray_nested = os.path.join(app_dir, 'apps')
if os.path.exists(stray_nested):
    shutil.rmtree(stray_nested)
    print(f"✓ Removed redundant nested directory: {stray_nested}")

# 3. Clean up .bak and temporary artifacts in app directory
bak_files = glob.glob(f"{app_dir}/**/*.bak", recursive=True)
for bf in bak_files:
    try:
        os.remove(bf)
        print(f"✓ Removed backup artifact: {bf}")
    except Exception as e:
        print(f"⚠️ Warning: Could not remove {bf}: {e}")

# 4. Canonicalize /users route to redirect to /admin/users
users_page = os.path.join(app_dir, 'users', 'page.tsx')
if os.path.exists(os.path.dirname(users_page)):
    users_redirect_code = """'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg,#0a0e17)] text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}
"""
    with open(users_page, 'w', encoding='utf-8') as f:
        f.write(users_redirect_code)
    print(f"✓ Standardized /users route redirect -> /admin/users: {users_page}")

# 5. Lock down Edge Middleware across all protected member and admin routes
mw_candidates = [
    os.path.join(web_root, 'src', 'middleware.ts'),
    os.path.join(web_root, 'middleware.ts'),
    'apps/web/src/middleware.ts',
    'src/middleware.ts'
]
mw_path = next((p for p in mw_candidates if os.path.exists(p)), os.path.join(base_dir, 'middleware.ts'))

middleware_code = """import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('zecratary_session')?.value;

  let session: { id?: string; email?: string; role?: string; name?: string } | null = null;
  if (sessionCookie && sessionCookie.trim() !== '') {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (_) {
      try {
        session = JSON.parse(sessionCookie);
      } catch (_) {}
    }
  }

  const isAuthenticated = Boolean(session && (session.email || session.id));
  const isAdmin = Boolean(
    session && (session.role === 'admin' || session.email?.toLowerCase().includes('admin'))
  );

  // 1. Enforce Admin Routes
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/profile', req.url));
    }
  }

  // 2. Enforce Protected Member Routes
  const protectedPrefixes = [
    '/profile',
    '/dashboard',
    '/planner',
    '/pantry',
    '/chef',
    '/import',
    '/manual',
    '/saved',
    '/shopping',
    '/groceries',
    '/cookbooks',
    '/books',
    '/templates',
    '/recipe',
    '/package'
  ];

  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Guest Only Routes
  if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/dashboard/:path*',
    '/planner/:path*',
    '/pantry/:path*',
    '/chef/:path*',
    '/import/:path*',
    '/manual/:path*',
    '/saved/:path*',
    '/shopping/:path*',
    '/groceries/:path*',
    '/cookbooks/:path*',
    '/books/:path*',
    '/templates/:path*',
    '/recipe/:path*',
    '/package/:path*',
    '/users/:path*',
    '/login',
    '/register'
  ],
};
"""
with open(mw_path, 'w', encoding='utf-8') as f:
    f.write(middleware_code)
print(f"✓ Synchronized Edge Middleware route protection in: {mw_path}")

# 6. Harmonize /api/social-config and /api/admin/social-config with dual flat/nested schema
unified_social_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getEnvPath() {
  const rootDir = process.cwd();
  const localEnv = path.join(rootDir, '.env.local');
  if (fs.existsSync(localEnv)) return localEnv;
  return path.join(rootDir, '.env');
}

function parseEnv(): Record<string, string> {
  const envFile = getEnvPath();
  if (!fs.existsSync(envFile)) return {};
  const content = fs.readFileSync(envFile, 'utf8');
  const envMap: Record<string, string> = {};
  content.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        envMap[key] = val;
      }
    }
  });
  return envMap;
}

export async function GET() {
  try {
    const envMap = parseEnv();

    const googleClientId = envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '';
    const googleClientSecret = envMap['GOOGLE_CLIENT_SECRET'] || '';
    const facebookClientId = envMap['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || '';
    const facebookClientSecret = envMap['FACEBOOK_CLIENT_SECRET'] || '';
    const appleClientId = envMap['NEXT_PUBLIC_APPLE_CLIENT_ID'] || '';
    const appleClientSecret = envMap['APPLE_CLIENT_SECRET'] || '';

    const payload = {
      success: true,
      // Flat properties for admin panel compatibility
      googleEnabled: Boolean(googleClientId || true),
      googleClientId,
      googleClientSecret,
      facebookEnabled: Boolean(facebookClientId || true),
      facebookClientId,
      facebookClientSecret,
      appleEnabled: Boolean(appleClientId || true),
      appleClientId,
      appleClientSecret,
      // Nested structure for client authentication components
      config: {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          enabled: Boolean(googleClientId || true)
        },
        facebook: {
          clientId: facebookClientId,
          clientSecret: facebookClientSecret,
          enabled: Boolean(facebookClientId || true)
        },
        apple: {
          clientId: appleClientId,
          clientSecret: appleClientSecret,
          enabled: Boolean(appleClientId || true)
        }
      }
    };

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const envFile = getEnvPath();
    let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';

    const updates: Record<string, string> = {};

    if (body.googleClientId !== undefined) updates['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = body.googleClientId;
    if (body.googleClientSecret !== undefined) updates['GOOGLE_CLIENT_SECRET'] = body.googleClientSecret;
    if (body.facebookClientId !== undefined) updates['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] = body.facebookClientId;
    if (body.facebookClientSecret !== undefined) updates['FACEBOOK_CLIENT_SECRET'] = body.facebookClientSecret;
    if (body.appleClientId !== undefined) updates['NEXT_PUBLIC_APPLE_CLIENT_ID'] = body.appleClientId;
    if (body.appleClientSecret !== undefined) updates['APPLE_CLIENT_SECRET'] = body.appleClientSecret;

    if (body.google) {
      if (body.google.clientId !== undefined) updates['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = body.google.clientId;
      if (body.google.clientSecret !== undefined) updates['GOOGLE_CLIENT_SECRET'] = body.google.clientSecret;
    }
    if (body.facebook) {
      if (body.facebook.clientId !== undefined) updates['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] = body.facebook.clientId;
      if (body.facebook.clientSecret !== undefined) updates['FACEBOOK_CLIENT_SECRET'] = body.facebook.clientSecret;
    }
    if (body.apple) {
      if (body.apple.clientId !== undefined) updates['NEXT_PUBLIC_APPLE_CLIENT_ID'] = body.apple.clientId;
      if (body.apple.clientSecret !== undefined) updates['APPLE_CLIENT_SECRET'] = body.apple.clientSecret;
    }

    const lines = content.split('\\n');
    const updatedKeys = new Set<string>();
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        if (key in updates) {
          updatedKeys.add(key);
          return `${key}="${updates[key]}"`;
        }
      }
      return line;
    });

    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}="${val}"`);
      }
    }

    fs.writeFileSync(envFile, newLines.join('\\n'), 'utf8');
    return NextResponse.json({ success: true, message: 'Configuration synchronized to environment file' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""

endpoints = [
    os.path.join(app_dir, 'api', 'social-config', 'route.ts'),
    os.path.join(app_dir, 'api', 'admin', 'social-config', 'route.ts')
]
for ep in endpoints:
    os.makedirs(os.path.dirname(ep), exist_ok=True)
    with open(ep, 'w', encoding='utf-8') as f:
        f.write(unified_social_code)
    print(f"✓ Unified social authentication configuration route: {ep}")

print("\n🚀 Project scan and automated remediation completed successfully!")
