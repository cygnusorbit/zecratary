'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login', '/register'];
const ADMIN_RESTRICTED_PREFIXES = ['/admin', '/add-user'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    initAuthStorage();
    const user = getCurrentUser();
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // 1. Unauthenticated users -> Redirect to /login
    if (!user && !isPublicRoute) {
      setAuthorized(false);
      router.replace('/login');
      return;
    }

    // 2. Already logged in users visiting /login or /register -> Redirect to landing page
    if (user && isPublicRoute) {
      router.replace(user.role === 'admin' ? '/admin' : '/recipes');
      return;
    }

    // 3. Standard Users attempting to access Admin pages -> Block and redirect to /recipes
    const isAdminRoute = ADMIN_RESTRICTED_PREFIXES.some(prefix => 
      pathname === prefix || pathname.startsWith(prefix + '/')
    );

    if (user && isAdminRoute && user.role !== 'admin') {
      alert('Access restricted: Administrator privileges required.');
      router.replace('/recipes');
      return;
    }

    // 4. Admin has full access to all pages; Standard users have full access to non-admin pages
    setAuthorized(true);
  }, [pathname, router]);

  if (!authorized && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E05638] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
