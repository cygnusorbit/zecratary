import { NextResponse } from 'next/server';
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
