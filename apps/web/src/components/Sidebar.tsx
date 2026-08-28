'use client';
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
