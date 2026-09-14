import os
import glob
import shutil

print("🔍 Scanning Zecratary project...")

# 1. Detect App Router root
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate apps/web/src/app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
web_root = os.path.dirname(base_dir) if os.path.basename(base_dir) == 'src' else base_dir

print(f"✓ Target App directory: {app_dir}")

# 2. Remove stray nested app directory (apps/web/src/app/apps)
stray_nested = os.path.join(app_dir, 'apps')
if os.path.exists(stray_nested):
    shutil.rmtree(stray_nested)
    print(f"✓ Removed stray nested directory: {stray_nested}")
else:
    print("✓ No stray nested app directory found.")

# 3. Clean up .bak files in app router
bak_files = glob.glob(f"{app_dir}/**/*.bak", recursive=True)
for bf in bak_files:
    try:
        os.remove(bf)
        print(f"✓ Removed redundant backup file: {bf}")
    except Exception as e:
        print(f"⚠️ Could not remove {bf}: {e}")

# 4. Standardize Edge Middleware to guard all application pages
middleware_candidates = [
    os.path.join(web_root, 'src', 'middleware.ts'),
    os.path.join(web_root, 'middleware.ts'),
    'apps/web/src/middleware.ts',
    'src/middleware.ts',
    'middleware.ts'
]
mw_path = next((p for p in middleware_candidates if os.path.exists(p)), None)
if not mw_path:
    mw_path = os.path.join(base_dir, 'middleware.ts')

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

  // 2. Enforce Protected Application Routes (Members only)
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
    '/users'
  ];

  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Guest Only Routes (Redirect authenticated users away from auth forms)
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
    '/users/:path*',
    '/login',
    '/register'
  ],
};
"""

with open(mw_path, 'w', encoding='utf-8') as f:
    f.write(middleware_code)
print(f"✓ Synchronized Edge Middleware route protection in: {mw_path}")

# 5. Ensure /api/admin/social-config exists and mirrors /api/social-config
admin_social_dir = os.path.join(app_dir, 'api', 'admin', 'social-config')
os.makedirs(admin_social_dir, exist_ok=True)
admin_social_file = os.path.join(admin_social_dir, 'route.ts')

admin_social_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getEnvPath() {
  const rootDir = process.cwd();
  const localEnv = path.join(rootDir, '.env.local');
  if (fs.existsSync(localEnv)) return localEnv;
  return path.join(rootDir, '.env');
}

export async function GET() {
  try {
    const envFile = getEnvPath();
    let content = '';
    if (fs.existsSync(envFile)) {
      content = fs.readFileSync(envFile, 'utf8');
    }

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

    return NextResponse.json({
      success: true,
      config: {
        google: {
          clientId: envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '',
          clientSecret: envMap['GOOGLE_CLIENT_SECRET'] || '',
          enabled: Boolean(envMap['NEXT_PUBLIC_GOOGLE_CLIENT_ID'])
        },
        github: {
          clientId: envMap['NEXT_PUBLIC_GITHUB_CLIENT_ID'] || '',
          clientSecret: envMap['GITHUB_CLIENT_SECRET'] || '',
          enabled: Boolean(envMap['NEXT_PUBLIC_GITHUB_CLIENT_ID'])
        },
        apple: {
          clientId: envMap['NEXT_PUBLIC_APPLE_CLIENT_ID'] || '',
          clientSecret: envMap['APPLE_CLIENT_SECRET'] || '',
          enabled: Boolean(envMap['NEXT_PUBLIC_APPLE_CLIENT_ID'])
        },
        facebook: {
          clientId: envMap['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || '',
          clientSecret: envMap['FACEBOOK_CLIENT_SECRET'] || '',
          enabled: Boolean(envMap['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'])
        }
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
    let content = '';
    if (fs.existsSync(envFile)) {
      content = fs.readFileSync(envFile, 'utf8');
    }

    const lines = content.split('\\n');
    const updates: Record<string, string> = {};

    if (body.google) {
      if (body.google.clientId !== undefined) updates['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = body.google.clientId;
      if (body.google.clientSecret !== undefined) updates['GOOGLE_CLIENT_SECRET'] = body.google.clientSecret;
    }
    if (body.github) {
      if (body.github.clientId !== undefined) updates['NEXT_PUBLIC_GITHUB_CLIENT_ID'] = body.github.clientId;
      if (body.github.clientSecret !== undefined) updates['GITHUB_CLIENT_SECRET'] = body.github.clientSecret;
    }
    if (body.apple) {
      if (body.apple.clientId !== undefined) updates['NEXT_PUBLIC_APPLE_CLIENT_ID'] = body.apple.clientId;
      if (body.apple.clientSecret !== undefined) updates['APPLE_CLIENT_SECRET'] = body.apple.clientSecret;
    }
    if (body.facebook) {
      if (body.facebook.clientId !== undefined) updates['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] = body.facebook.clientId;
      if (body.facebook.clientSecret !== undefined) updates['FACEBOOK_CLIENT_SECRET'] = body.facebook.clientSecret;
    }

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
    return NextResponse.json({ success: true, message: 'Updated .env file successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""

with open(admin_social_file, 'w', encoding='utf-8') as f:
    f.write(admin_social_code)
print(f"✓ Provisioned /api/admin/social-config route handler at: {admin_social_file}")

# 6. Also ensure /api/social-config route points to the same logic
social_config_dir = os.path.join(app_dir, 'api', 'social-config')
os.makedirs(social_config_dir, exist_ok=True)
social_config_file = os.path.join(social_config_dir, 'route.ts')
with open(social_config_file, 'w', encoding='utf-8') as f:
    f.write(admin_social_code)
print(f"✓ Synchronized /api/social-config endpoint at: {social_config_file}")

print("\n🚀 Full project scan and cleanup completed successfully!")
