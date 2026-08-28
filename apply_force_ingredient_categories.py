import os
import shutil

# ----------------------------------------------------------------------
# 1. Global Reactive Category Engine (apps/web/src/lib/categories.ts)
# ----------------------------------------------------------------------
os.makedirs("apps/web/src/lib", exist_ok=True)
categories_lib_code = """'use client';

export const DEFAULT_CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat and Seafood",
  "Bakery",
  "Baking Supplies",
  "Pantry Staples",
  "Frozen Foods",
  "Snacks and Sweets",
  "Beverages",
  "Deli",
  "Condiments and Sauces",
  "Grains and Pasta",
  "Spices and Seasonings",
  "Ready Meals",
  "International Foods",
  "Household Items",
  "Personal Care",
  "Pet Supplies",
  "Baby Products",
  "Miscellaneous"
];

export const getStoredCategories = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem('zecratary_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  localStorage.setItem('zecratary_categories', JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zecratary_categories', JSON.stringify(categories));
  window.dispatchEvent(new Event('zecratary_categories_changed'));
};
"""
with open("apps/web/src/lib/categories.ts", "w", encoding="utf-8") as f:
    f.write(categories_lib_code)

# ----------------------------------------------------------------------
# 2. Shared Constant Export (apps/web/src/constants/categories.ts)
# ----------------------------------------------------------------------
os.makedirs("apps/web/src/constants", exist_ok=True)
constants_code = """import { DEFAULT_CATEGORIES } from '@/lib/categories';
export const CATEGORIES = DEFAULT_CATEGORIES;
export type Category = typeof DEFAULT_CATEGORIES[number];
"""
with open("apps/web/src/constants/categories.ts", "w", encoding="utf-8") as f:
    f.write(constants_code)

# ----------------------------------------------------------------------
# 3. New Dedicated Admin Page (apps/web/src/app/admin/ingredient-categories/page.tsx)
# ----------------------------------------------------------------------
os.makedirs("apps/web/src/app/admin/ingredient-categories", exist_ok=True)
admin_cat_page = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Tags, Plus, Edit3, Trash2, Check, X, RotateCcw, 
  CheckCircle, ArrowLeft, Shield 
} from 'lucide-react';
import { getStoredCategories, saveCategories, DEFAULT_CATEGORIES } from '@/lib/categories';

export default function IngredientCategoryPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadCategories = () => {
    setCategories(getStoredCategories());
  };

  useEffect(() => {
    document.title = 'Ingredient Categories - Admin Console';
    loadCategories();

    const handleSync = () => setCategories(getStoredCategories());
    window.addEventListener('zecratary_categories_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('zecratary_categories_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert('This category already exists.');
      return;
    }

    const updated = [...categories, clean];
    setCategories(updated);
    saveCategories(updated);
    setNewCatName('');
    notify(`Added category "${clean}"`);
  };

  const handleSaveEdit = (index: number) => {
    const clean = editingValue.trim();
    if (!clean) return;

    const duplicate = categories.some(
      (c, i) => i !== index && c.toLowerCase() === clean.toLowerCase()
    );
    if (duplicate) {
      alert('A category with this name already exists.');
      return;
    }

    const updated = [...categories];
    updated[index] = clean;
    setCategories(updated);
    saveCategories(updated);
    setEditingIndex(null);
    setEditingValue('');
    notify(`Updated to "${clean}"`);
  };

  const handleDeleteCategory = (index: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    const updated = categories.filter((_, i) => i !== index);
    setCategories(updated);
    saveCategories(updated);
    notify(`Removed category "${name}"`);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all categories back to system defaults?')) return;
    setCategories(DEFAULT_CATEGORIES);
    saveCategories(DEFAULT_CATEGORIES);
    notify('Categories successfully reset to system defaults');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin
            </Link>
          </div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight flex items-center gap-3">
            <Tags className="h-8 w-8 text-[#E05638]" /> Ingredient Category
          </h1>
          <p className="text-sm font-semibold text-emerald-400 mt-0.5">
            Manage global ingredient categories used across Recipes, Pantry, and Shopping Lists
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="bg-[#111726] border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Reset Defaults
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/60 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#E05638]" /> Add New Ingredient Category
        </h2>
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="e.g. Organic Produce, International Sauces..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
          />
          <button
            type="submit"
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </form>
      </div>

      <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="text-sm font-extrabold text-white">
            Active Categories ({categories.length})
          </span>
          <span className="text-xs text-slate-400">
            Real-time synchronization across all tabs and dropdowns
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat, idx) => {
            const isEditing = editingIndex === idx;

            return (
              <div
                key={`${cat}-${idx}`}
                className="p-3 bg-[#0B101D] border border-slate-800/90 rounded-2xl flex items-center justify-between gap-2 hover:border-slate-700 transition"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(idx);
                        if (e.key === 'Escape') setEditingIndex(null);
                      }}
                      className="w-full bg-[#111726] border border-[#E05638] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      className="p-1.5 bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 rounded-lg hover:bg-emerald-900 transition"
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-200 truncate">{cat}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingValue(cat);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white bg-[#111726] hover:bg-slate-800 rounded-lg border border-slate-800 transition"
                        title="Edit Category"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(idx, cat)}
                        className="p-1.5 text-slate-400 hover:text-red-400 bg-[#111726] hover:bg-red-950/30 rounded-lg border border-slate-800 transition"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
"""
with open("apps/web/src/app/admin/ingredient-categories/page.tsx", "w", encoding="utf-8") as f:
    f.write(admin_cat_page)

# ----------------------------------------------------------------------
# 4. Global Layout + Unified Navigation (apps/web/src/app/layout.tsx)
# ----------------------------------------------------------------------
layout_file = """'use client';
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
"""
with open("apps/web/src/app/layout.tsx", "w", encoding="utf-8") as f:
    f.write(layout_file)

# Also update Sidebar.tsx if it exists
sidebar_path = "apps/web/src/components/Sidebar.tsx"
if os.path.exists(os.path.dirname(sidebar_path)):
    with open(sidebar_path, "w", encoding="utf-8") as f:
        f.write(layout_file.replace("export default function RootLayout({ children }: { children: React.ReactNode }) {", "export default function Sidebar() {"))

# ----------------------------------------------------------------------
# 5. Clear Next.js build cache to force instant browser reload
# ----------------------------------------------------------------------
next_cache = "apps/web/.next"
if os.path.exists(next_cache):
    try:
        shutil.rmtree(next_cache)
        print("🧹 Cleared apps/web/.next build cache")
    except Exception as e:
        pass

print("✅ Applied all changes and injected 'Ingredient Category' directly below 'Admin Setting'!")
