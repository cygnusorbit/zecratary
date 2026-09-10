import os
import re

base_web_dirs = ['apps/web/src', 'src']
base_dir = next((d for d in base_web_dirs if os.path.exists(d)), None)

if not base_dir:
    print("Error: Could not locate 'src' or 'apps/web/src' directory.")
    exit(1)

components_dir = os.path.join(base_dir, 'components')
os.makedirs(components_dir, exist_ok=True)
auth_guard_path = os.path.join(components_dir, 'AuthGuard.tsx')

# 1. Create AuthGuard component
auth_guard_code = """'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    initAuthStorage();

    const verifyAuth = () => {
      const isPublic = PUBLIC_ROUTES.some((route) =>
        pathname === route || pathname.startsWith(`${route}/`)
      );

      const user = getCurrentUser();

      if (!user && !isPublic) {
        setIsAuthenticated(false);
        router.replace('/login');
      } else if (user && isPublic) {
        // Redirect authenticated users away from login/register
        setIsAuthenticated(true);
        router.replace('/profile');
      } else {
        setIsAuthenticated(true);
      }
    };

    verifyAuth();

    window.addEventListener('storage', verifyAuth);
    window.addEventListener('zecratary_auth_changed', verifyAuth);

    return () => {
      window.removeEventListener('storage', verifyAuth);
      window.removeEventListener('zecratary_auth_changed', verifyAuth);
    };
  }, [pathname, router]);

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // During evaluation, don't flash protected content
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#070b13]">
        <div
          className="w-9 h-9 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Prevent rendering protected page tree if unauthenticated
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
"""

with open(auth_guard_path, 'w', encoding='utf-8') as f:
    f.write(auth_guard_code)
print(f"Created AuthGuard component at: {auth_guard_path}")

# 2. Patch Root Layout to wrap app with AuthGuard
layout_path = os.path.join(base_dir, 'app', 'layout.tsx')

if os.path.exists(layout_path):
    with open(layout_path, 'r', encoding='utf-8') as f:
        layout_content = f.read()

    if 'AuthGuard' not in layout_content:
        # Add import
        layout_content = "import AuthGuard from '@/components/AuthGuard';\n" + layout_content

        # Wrap children with AuthGuard
        if '{children}' in layout_content:
            layout_content = layout_content.replace('{children}', '<AuthGuard>{children}</AuthGuard>')
            with open(layout_path, 'w', encoding='utf-8') as f:
                f.write(layout_content)
            print(f"Successfully integrated AuthGuard into {layout_path}")
        else:
            print("Warning: Could not find '{children}' token in layout.tsx. Please manually wrap '{children}' with '<AuthGuard>{children}</AuthGuard>'.")
    else:
        print(f"AuthGuard is already imported in {layout_path}.")
else:
    print(f"Error: Could not locate root layout at {layout_path}")
