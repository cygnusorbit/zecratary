import os

# ----------------------------------------------------------------------
# 1. Central Auth Helper & Storage Manager (apps/web/src/lib/auth.ts)
# ----------------------------------------------------------------------
os.makedirs("apps/web/src/lib", exist_ok=True)
auth_lib_code = """'use client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  password?: string;
  createdAt: string;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'System Admin',
    email: 'admin@zecratary.com',
    password: 'admin',
    role: 'admin',
    createdAt: '2026-08-24T00:00:00.000Z'
  },
  {
    id: 'usr_demo_1',
    name: 'Demo User',
    email: 'user@zecratary.com',
    password: 'user123',
    role: 'user',
    createdAt: '2026-08-25T00:00:00.000Z'
  }
];

export const initAuthStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    const existing = localStorage.getItem('zecratary_users');
    if (!existing) {
      localStorage.setItem('zecratary_users', JSON.stringify(DEFAULT_USERS));
    }
  } catch (e) {
    console.error('Failed to initialize auth storage', e);
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('zecratary_current_user', JSON.stringify(user));
    localStorage.setItem('zecratary_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('zecratary_current_user');
    localStorage.removeItem('zecratary_user');
  }
  window.dispatchEvent(new Event('zecratary_auth_changed'));
};

export const logoutUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('zecratary_current_user');
  localStorage.removeItem('zecratary_user');
  window.dispatchEvent(new Event('zecratary_auth_changed'));
  window.location.href = '/login';
};
"""

with open("apps/web/src/lib/auth.ts", "w", encoding="utf-8") as f:
    f.write(auth_lib_code)

# ----------------------------------------------------------------------
# 2. Global Role-Based Route Guard (apps/web/src/components/AuthGuard.tsx)
# ----------------------------------------------------------------------
os.makedirs("apps/web/src/components", exist_ok=True)
auth_guard_code = """'use client';
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
"""

with open("apps/web/src/components/AuthGuard.tsx", "w", encoding="utf-8") as f:
    f.write(auth_guard_code)

# ----------------------------------------------------------------------
# 3. Dynamic Sidebar Navigation (apps/web/src/components/Sidebar.tsx)
# ----------------------------------------------------------------------
sidebar_code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, MessageSquare, Upload, SquarePen, 
  Bookmark, BookMarked, Carrot, ShoppingCart, 
  Calendar, CalendarDays, Moon, Settings, 
  Mail, LogOut, Shield, UserPlus, Tags 
} from 'lucide-react';
import { getCurrentUser, logoutUser, User } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());

    const handleAuthChange = () => setUser(getCurrentUser());
    window.addEventListener('zecratary_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('zecratary_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname]);

  if (!user || pathname === '/login' || pathname === '/register') {
    return null;
  }

  const isLinkActive = (href: string) => {
    if (href === '/recipes' && (pathname === '/' || pathname === '/recipes')) return true;
    if (href !== '/recipes' && pathname.startsWith(href)) return true;
    return false;
  };

  const linkClass = (href: string) => `
    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition select-none
    ${isLinkActive(href)
      ? 'bg-[#1b4329] text-white border border-emerald-600/40 shadow-sm font-bold'
      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
    }
  `;

  return (
    <aside className="w-64 bg-[#080C17] border-r border-slate-800/80 min-h-screen flex flex-col justify-between shrink-0 select-none">
      
      {/* TOP SECTION */}
      <div className="p-5 space-y-6 overflow-y-auto">
        
        {/* BRAND LOGO */}
        <Link href="/recipes" className="flex items-center gap-2.5 px-1 group">
          <span className="text-2xl">🥕</span>
          <div className="text-xl font-black tracking-tight">
            <span className="text-[#E05638]">Foodie</span>
            <span className="text-[#10B981]">Prep</span>
          </div>
        </Link>

        {/* DASHBOARD LINK */}
        <div>
          <Link href="/recipes" className={linkClass('/recipes')}>
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        {/* GROUP: CREATE */}
        <div className="space-y-1.5">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3">
            Create
          </span>
          <Link href="/recipes?action=ai" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition">
            <MessageSquare className="h-4 w-4 text-[#E05638]" />
            Chef Foodie AI
          </Link>
          <Link href="/recipes?action=import" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition">
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <Link href="/recipes?action=manual" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition">
            <SquarePen className="h-4 w-4" />
            Manual
          </Link>
        </div>

        {/* GROUP: MANAGE */}
        <div className="space-y-1.5">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3">
            Manage
          </span>
          <Link href="/recipes" className={linkClass('/recipes')}>
            <Bookmark className="h-4 w-4" />
            Saved Recipes
          </Link>
          <Link href="/books" className={linkClass('/books')}>
            <BookMarked className="h-4 w-4" />
            Books
          </Link>
          <Link href="/pantry" className={linkClass('/pantry')}>
            <Carrot className="h-4 w-4 text-emerald-400" />
            Pantry
          </Link>
        </div>

        {/* GROUP: PLAN */}
        <div className="space-y-1.5">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3">
            Plan
          </span>
          <Link href="/shopping" className={linkClass('/shopping')}>
            <ShoppingCart className="h-4 w-4" />
            Shopping List
          </Link>
          <Link href="/planner" className={linkClass('/planner')}>
            <Calendar className="h-4 w-4 text-emerald-400" />
            Planner
          </Link>
          <Link href="/templates" className={linkClass('/templates')}>
            <CalendarDays className="h-4 w-4" />
            Templates
          </Link>
        </div>

        {/* GROUP: ADMIN EXCLUSIVE ACCESS (VISIBLE ONLY TO ADMINS) */}
        {user.role === 'admin' && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#E05638] px-3">
              Admin Access
            </span>
            <Link href="/admin/add-user" className={linkClass('/admin/add-user')}>
              <UserPlus className="h-4 w-4 text-[#E05638]" />
              Add User
            </Link>
            <Link href="/admin" className={linkClass('/admin')}>
              <Shield className="h-4 w-4 text-emerald-400" />
              Admin Setting
            </Link>
            <Link href="/admin/ingredient-categories" className={linkClass('/admin/ingredient-categories')}>
              <Tags className="h-4 w-4 text-[#E05638]" />
              Ingredient Category
            </Link>
          </div>
        )}

      </div>

      {/* BOTTOM SECTION */}
      <div className="p-4 border-t border-emerald-900/60 space-y-2">
        <Link href="/profile" className={linkClass('/profile')}>
          <Settings className="h-4 w-4" />
          Profile
        </Link>
        <button
          onClick={logoutUser}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-red-400 hover:bg-red-950/20 transition text-left cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

    </aside>
  );
}
"""

with open("apps/web/src/components/Sidebar.tsx", "w", encoding="utf-8") as f:
    f.write(sidebar_code)

# ----------------------------------------------------------------------
# 4. Login Page with Role Routing (apps/web/src/app/login/page.tsx)
# ----------------------------------------------------------------------
os.makedirs("apps/web/src/app/login", exist_ok=True)
login_page_code = """'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ChefHat, ArrowRight, Shield, User as UserIcon } from 'lucide-react';
import { initAuthStorage, setCurrentUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    initAuthStorage();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawUsers = localStorage.getItem('zecratary_users');
    const users = rawUsers ? JSON.parse(rawUsers) : [];

    const matched = users.find(
      (u: any) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (matched) {
      const userSession = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        createdAt: matched.createdAt || new Date().toISOString()
      };
      setCurrentUser(userSession);

      if (matched.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/recipes');
      }
    } else {
      setError('Invalid email address or password.');
    }
  };

  const handleQuickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#0b0f17] border border-slate-800/90 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 text-[#E05638] flex items-center justify-center mx-auto shadow-md">
            <ChefHat className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-[#E05638] tracking-tight">Sign In to FoodiePrep</h1>
          <p className="text-xs font-semibold text-slate-400">Access recipes, meal plans, and account settings</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#E05638] hover:bg-[#c94529] text-white font-extrabold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            Sign In <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* DEMO LOGINS */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Quick Logins
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@zecratary.com', 'admin')}
              className="p-2 bg-[#070b13] hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition flex items-center gap-2 cursor-pointer"
            >
              <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-white leading-tight">Admin</div>
                <div className="text-[10px] text-slate-500">Full Access</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('user@zecratary.com', 'user123')}
              className="p-2 bg-[#070b13] hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition flex items-center gap-2 cursor-pointer"
            >
              <UserIcon className="h-4 w-4 text-[#E05638] shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-white leading-tight">User</div>
                <div className="text-[10px] text-slate-500">Standard Access</div>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link href="/register" className="font-bold text-[#E05638] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
"""

with open("apps/web/src/app/login/page.tsx", "w", encoding="utf-8") as f:
    f.write(login_page_code)

print("✅ Authentication, Admin Full Access, and Standard User Route Guards successfully configured!")
