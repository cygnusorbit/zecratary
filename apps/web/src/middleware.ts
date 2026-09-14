import { NextResponse } from 'next/server';
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
