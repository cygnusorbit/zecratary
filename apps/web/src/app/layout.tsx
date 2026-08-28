'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, MessageSquare, Upload, SquarePen, 
  Bookmark, BookMarked, Carrot, ShoppingCart, 
  Calendar, CalendarDays, Settings, 
  Mail, LogOut, Shield, UserPlus, Tags 
} from 'lucide-react';
import './globals.css';
import { getCurrentUser, logoutUser, User } from '@/lib/auth';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    const handleAuth = () => setUser(getCurrentUser());
    window.addEventListener('zecratary_auth_changed', handleAuth);
    window.addEventListener('storage', handleAuth);
    return () => {
      window.removeEventListener('zecratary_auth_changed', handleAuth);
      window.removeEventListener('storage', handleAuth);
    };
  }, [pathname]);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  const isLinkActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B101D] text-slate-100 min-h-screen flex antialiased">
        {!isAuthPage && (
          <aside className="w-64 bg-[#080C17] border-r border-slate-800/80 min-h-screen flex flex-col justify-between shrink-0 select-none sticky top-0 h-screen">
            <div className="p-5 space-y-6 overflow-y-auto">
              
              {/* BRAND LOGO */}
              <Link href="/" className="flex items-center gap-2.5 px-1 group">
                <span className="text-2xl">🥕</span>
                <div className="text-xl font-black tracking-tight">
                  <span className="text-[#E05638]">Zecratary</span>
                </div>
              </Link>

              {/* DASHBOARD LINK */}
              <div className="space-y-1">
                <Link
                  href="/"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${
                    pathname === '/' 
                      ? 'bg-[#1b4329] text-white border border-emerald-600/40 shadow-sm' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </div>

              {/* CREATE SECTION */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3">
                  Create
                </span>
                <Link
                  href="/chef"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/chef') ? 'bg-[#1b4329] text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-[#E05638]" />
                  Chef AI
                </Link>
                <Link
                  href="/import"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/import') ? 'bg-[#1b4329] text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Import
                </Link>
                <Link
                  href="/manual"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/manual') ? 'bg-[#1b4329] text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <SquarePen className="h-4 w-4" />
                  Manual
                </Link>
              </div>

              {/* MANAGE SECTION */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3">
                  Manage
                </span>
                <Link
                  href="/recipes"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/recipes') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  Saved Recipes
                </Link>
                <Link
                  href="/books"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/books') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <BookMarked className="h-4 w-4" />
                  Books
                </Link>
                <Link
                  href="/pantry"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/pantry') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Carrot className="h-4 w-4 text-emerald-400" />
                  Pantry
                </Link>
              </div>

              {/* PLAN SECTION */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3">
                  Plan
                </span>
                <Link
                  href="/shopping"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/shopping') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Shopping List
                </Link>
                <Link
                  href="/planner"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/planner') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  Planner
                </Link>
                <Link
                  href="/templates"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isLinkActive('/templates') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Templates
                </Link>
              </div>

              {/* ADMIN ACCESS SECTION */}
              {(!user || user.role === 'admin') && (
                <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#E05638] px-3">
                    Admin Access
                  </span>
                  <Link
                    href="/admin/add-user"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      isLinkActive('/admin/add-user') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <UserPlus className="h-4 w-4 text-[#E05638]" />
                    Add User
                  </Link>
                  <Link
                    href="/admin"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      pathname === '/admin' ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-emerald-400" />
                    Admin Setting
                  </Link>
                  {/* INGREDIENT CATEGORY MENU DIRECTLY BELOW ADMIN SETTING */}
                  <Link
                    href="/admin/ingredient-categories"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      isLinkActive('/admin/ingredient-categories') ? 'bg-[#1b4329] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Tags className="h-4 w-4 text-[#E05638]" />
                    Ingredient Category
                  </Link>
                </div>
              )}

            </div>

            {/* BOTTOM SHORTCUTS */}
            <div className="p-4 border-t border-emerald-900/60 space-y-1.5">
              <Link
                href="/profile"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
              >
                <Settings className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/contact"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </Link>
              <button
                onClick={logoutUser}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-red-400 hover:bg-red-950/20 transition text-left"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </body>
    </html>
  );
}
