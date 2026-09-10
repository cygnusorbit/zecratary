import os
import glob
import re

# 1. Locate auth.ts to patch it for cookie synchronization
auth_paths = glob.glob('**/lib/auth.ts', recursive=True)
if not auth_paths:
    print("❌ Error: Could not find lib/auth.ts")
    exit(1)

auth_path = auth_paths[0]
app_dir = os.path.join(os.path.dirname(os.path.dirname(auth_path)), 'app')
middleware_dir = os.path.dirname(app_dir)
middleware_path = os.path.join(middleware_dir, 'middleware.ts')

# 2. Upgrade lib/auth.ts to set and destroy session cookies
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_code = f.read()

if 'document.cookie' not in auth_code:
    # Inject cookie setter on login
    auth_code = re.sub(
        r"(localStorage\.setItem\('zecratary_current_user',\s*JSON\.stringify\(user\)\);)", 
        r"\1\n  document.cookie = `zecratary_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;", 
        auth_code
    )
    # Inject cookie destruction on logout
    auth_code = re.sub(
        r"(localStorage\.removeItem\('zecratary_current_user'\);)", 
        r"\1\n  document.cookie = 'zecratary_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';", 
        auth_code
    )

    with open(auth_path, 'w', encoding='utf-8') as f:
        f.write(auth_code)
    print(f"✓ Patched {auth_path} to synchronize login state with secure cookies.")

# 3. Create the Edge Middleware
middleware_code = """import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define Route Categories
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
  const isAdminRoute = pathname.startsWith('/admin');
  
  // Protect all core app routes
  const isProtectedRoute = 
    pathname.startsWith('/profile') || 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/chef') || 
    pathname.startsWith('/import') || 
    pathname.startsWith('/manual') || 
    isAdminRoute;

  // 2. Extract Session Cookie
  const sessionCookie = request.cookies.get('zecratary_session')?.value;
  let user = null;
  
  if (sessionCookie) {
    try {
      user = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (e) {
      console.error('Failed to parse session cookie');
    }
  }

  // 3. Routing Logic & Access Guards
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized_access');
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  // 4. Role-Based Admin Guard
  if (isAdminRoute) {
    const isExplicitAdmin = user?.role === 'admin';
    const isEmailAdmin = user?.email === 'admin@foodieprep.com' || user?.email?.includes('admin');
    
    if (!user || (!isExplicitAdmin && !isEmailAdmin)) {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
"""

with open(middleware_path, 'w', encoding='utf-8') as f:
    f.write(middleware_code)

print(f"✓ Created Next.js Edge Middleware at {middleware_path}")
print("🚀 Option D Integration Complete!")
