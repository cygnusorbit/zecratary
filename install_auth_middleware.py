import os
import glob

# 1. Locate active project root and app directory
candidates = ['apps/web/src', 'src', 'apps/web', '.']
base_dir = next((c for c in candidates if os.path.exists(os.path.join(c, 'app'))), None)

if not base_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        base_dir = os.path.dirname(os.path.dirname(matches[0]))

if not base_dir:
    print("❌ Error: Could not locate active application base directory.")
    exit(1)

# Middleware is placed alongside src or app root
if os.path.exists(os.path.join(base_dir, 'src')):
    middleware_path = os.path.join(base_dir, 'src', 'middleware.ts')
else:
    middleware_path = os.path.join(base_dir, 'middleware.ts')

# 2. Provision middleware.ts
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

  // 2. Enforce Protected Member Routes
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

  // 3. Guest-Only Routes: Bounce authenticated users away from Login and Register
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
print(f"✓ Provisioned Edge Middleware: {middleware_path}")

# 3. Synchronize Cookie Dispatch in lib/auth.ts
lib_dir = os.path.join(base_dir, 'lib')
auth_path = os.path.join(lib_dir, 'auth.ts')

if not os.path.exists(auth_path):
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    auth_path = matches[0] if matches else None

if auth_path and os.path.exists(auth_path):
    with open(auth_path, 'r', encoding='utf-8') as f:
        auth_content = f.read()

    cookie_helper = """
// Edge Middleware Cookie Synchronization
function syncSessionCookie(user: User | null): void {
  if (typeof document === 'undefined') return;
  if (user) {
    const payload = encodeURIComponent(JSON.stringify({ 
      id: user.id, 
      email: user.email, 
      role: user.role || 'user' 
    }));
    document.cookie = `zecratary_session=${payload}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = 'zecratary_session=; path=/; max-age=0; SameSite=Lax';
  }
}
"""

    if 'syncSessionCookie' not in auth_content:
        auth_content += cookie_helper

        if 'export function setCurrentUser' in auth_content:
            auth_content = auth_content.replace(
                'export function setCurrentUser(user: User): void {',
                'export function setCurrentUser(user: User): void {\n  syncSessionCookie(user);'
            )

        if 'export function logoutUser' in auth_content:
            auth_content = auth_content.replace(
                'export function logoutUser(): void {',
                'export function logoutUser(): void {\n  syncSessionCookie(null);'
            )

        with open(auth_path, 'w', encoding='utf-8') as f:
            f.write(auth_content)
        print(f"✓ Bound session cookies in: {auth_path}")

print("Edge Middleware and session cookie synchronization installed successfully!")
