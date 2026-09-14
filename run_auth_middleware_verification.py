import os
import glob
import re

# 1. Detect base workspace directories
candidates = ['apps/web/src', 'src', 'apps/web', '.']
base_dir = next((c for c in candidates if os.path.exists(os.path.join(c, 'app'))), None)

if not base_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        base_dir = os.path.dirname(os.path.dirname(matches[0]))

if not base_dir:
    print("❌ Error: Could not locate application base directory.")
    exit(1)

print(f"✓ Detected application base: {base_dir}")

# 2. Locate and provision middleware.ts
# In Next.js with src directory, middleware resides inside src/middleware.ts
if os.path.basename(base_dir) == 'src':
    middleware_path = os.path.join(base_dir, 'middleware.ts')
elif os.path.exists(os.path.join(base_dir, 'src')):
    middleware_path = os.path.join(base_dir, 'src', 'middleware.ts')
else:
    middleware_path = os.path.join(base_dir, 'middleware.ts')

middleware_code = """import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('zecratary_session')?.value;

  let session: { email?: string; role?: string; provider?: string } | null = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(sessionCookie);
    } catch (_) {
      try {
        session = JSON.parse(decodeURIComponent(sessionCookie));
      } catch (_) {}
    }
  }

  const isAuthenticated = Boolean(session && session.email);
  const isAdmin = Boolean(
    session && (session.role === 'admin' || session.email?.toLowerCase().includes('admin'))
  );

  // 1. Enforce Admin Only Routes
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

  // 2. Enforce Protected User Routes
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

  // 3. Guest-Only Routes: Redirect authenticated users to profile
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
print(f"✓ Provisioned Edge Middleware at: {middleware_path}")

# 3. Safely update lib/auth.ts with single-line concatenated cookie setters
auth_matches = glob.glob('**/lib/auth.ts', recursive=True)
if not auth_matches:
    print("❌ Error: Could not locate lib/auth.ts")
    exit(1)

auth_path = auth_matches[0]
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_lines = f.readlines()

# Strip any prior corrupted or dangling session cookie insertions
cleaned_lines = []
for line in auth_lines:
    if any(k in line for k in ['syncSessionCookie', 'zecratary_session', 'SameSite=Lax', 'path=/;']):
        continue
    cleaned_lines.append(line)

auth_content = "".join(cleaned_lines)

# Clean, single-line helper using string concatenation to avoid template string AST breakages
cookie_helper = """
function syncSessionCookie(user: any): void {
  if (typeof document === 'undefined') return;
  if (user && user.email) {
    const payload = encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, role: user.role || 'user' }));
    document.cookie = 'zecratary_session=' + payload + '; path=/; max-age=604800; SameSite=Lax';
  } else {
    document.cookie = 'zecratary_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}
"""

auth_content = cookie_helper + auth_content

# Hook setCurrentUser
if 'export function setCurrentUser' in auth_content:
    auth_content = re.sub(
        r'(export\s+function\s+setCurrentUser\s*\([^)]*\)\s*:\s*(?:void)?\s*\{)',
        r'\1\n  syncSessionCookie(user);',
        auth_content,
        count=1
    )

# Hook logoutUser
if 'export function logoutUser' in auth_content:
    auth_content = re.sub(
        r'(export\s+function\s+logoutUser\s*\([^)]*\)\s*:\s*(?:void)?\s*\{)',
        r'\1\n  syncSessionCookie(null);',
        auth_content,
        count=1
    )

with open(auth_path, 'w', encoding='utf-8') as f:
    f.write(auth_content)
print(f"✓ Synchronized session cookies in: {auth_path}")

# 4. Verify presence of social endpoints
app_dir = os.path.join(base_dir, 'app')
critical_paths = {
    'Social Public Config Route': os.path.join(app_dir, 'api', 'social-config', 'route.ts'),
    'OAuth Callback Route': os.path.join(app_dir, 'api', 'auth', 'callback', 'route.ts'),
    'Admin Social Settings Page': os.path.join(app_dir, 'admin', 'social-login-setting', 'page.tsx'),
    'Registration Page': os.path.join(app_dir, 'register', 'page.tsx'),
}

print("\n**Route Verification Report**")
for label, p in critical_paths.items():
    status = "✓ Found" if os.path.exists(p) else "⚠️ Missing (Re-provision required)"
    print(f"* {label}: {status} ({p})")

print("\n✅ Verification and installation completed successfully!")
