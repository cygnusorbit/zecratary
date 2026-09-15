import { NextResponse } from 'next/server';
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
