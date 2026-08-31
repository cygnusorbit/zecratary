# Full Codebase Snapshot: FoodiePrep (Zecratary)

## File: `package.json`
```json
{
  "name": "zecratary-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "start": "turbo run start",
    "db:generate": "turbo run db:generate",
    "db:push": "turbo run db:push",
    "worker:dev": "turbo run worker:dev"
  },
  "devDependencies": {
    "turbo": "^2.4.2",
    "typescript": "^5.7.3"
  },
  "packageManager": "npm@10.8.2"
}
```

## File: `packages/database/package.json`
```json
{
  "name": "@zecratary/database",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "typescript": "^5.7.3"
  }
}
```

## File: `packages/database/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "declaration": true,
    "strict": true
  }
}
```

## File: `packages/scrapers/package.json`
```json
{
  "name": "@zecratary/scrapers",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "cheerio": "^1.0.0-rc.12" },
  "devDependencies": { "typescript": "^5.7.3" }
}
```

## File: `packages/ai-engine/package.json`
```json
{
  "name": "@zecratary/ai-engine",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@google/generative-ai": "^0.24.0",
    "openai": "^4.85.4"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

## File: `packages/ai-engine/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "declaration": true,
    "strict": true
  }
}
```

## File: `apps/web/package.json`
```json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.0",
    "@zecratary/ai-engine": "*",
    "@zecratary/database": "*",
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "next": "14.2.23",
    "openai": "^4.85.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "stripe": "^16.12.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss": "^3.4.17"
  },
  "devDependencies": {
    "@types/node": "^20.17.19",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.2",
    "typescript": "^5.7.3"
  }
}
```

## File: `apps/web/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "preserve",
    "paths": {
      "@/*": [
        "./src/*"
      ]
    },
    "incremental": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}

```

## File: `apps/web/src/app/layout.tsx`
```typescript
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

```

## File: `apps/web/src/app/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChefHat, Calendar, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [recipeBooksCount, setRecipeBooksCount] = useState<number>(0);
  const [pantryStockCount, setPantryStockCount] = useState<number>(0);
  const [groceryItemsCount, setGroceryItemsCount] = useState<number>(0);
  const [upcomingMeal, setUpcomingMeal] = useState<{
    mealType: string;
    title: string;
    timeOrTags: string;
  } | null>(null);

  const syncDashboardData = async () => {
    // 1. Saved Recipes Count
    let recipesList: any[] = [];
    try {
      const saved1 = localStorage.getItem('zecratary_saved_recipes');
      const saved2 = localStorage.getItem('zecratary_recipes');
      if (saved1) recipesList = JSON.parse(saved1);
      else if (saved2) recipesList = JSON.parse(saved2);

      if (Array.isArray(recipesList) && recipesList.length > 0) {
        setRecipesCount(recipesList.length);
      } else {
        const res = await fetch('/api/recipes');
        const json = await res.json();
        if (json.success && Array.isArray(json.recipes)) {
          recipesList = json.recipes;
          setRecipesCount(recipesList.length);
        } else {
          setRecipesCount(0);
        }
      }
    } catch {
      setRecipesCount(recipesList.length || 0);
    }

    // 2. Recipe Books Count
    try {
      const books = localStorage.getItem('zecratary_recipe_books');
      if (books) {
        const parsed = JSON.parse(books);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipeBooksCount(parsed.length);
        } else {
          const categories = new Set(recipesList.map((r: any) => r.category || r.tags?.[0] || 'Main Dish'));
          setRecipeBooksCount(categories.size || 0);
        }
      } else {
        const categories = new Set(recipesList.map((r: any) => r.category || r.tags?.[0] || 'Main Dish'));
        setRecipeBooksCount(categories.size || 0);
      }
    } catch {
      setRecipeBooksCount(0);
    }

    // 3. Pantry Stock Count (Syncs with zecratary_pantry_items)
    try {
      const pantry = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
      if (pantry) {
        const parsed = JSON.parse(pantry);
        if (Array.isArray(parsed)) {
          setPantryStockCount(parsed.length);
        } else {
          setPantryStockCount(0);
        }
      } else {
        setPantryStockCount(0);
      }
    } catch {
      setPantryStockCount(0);
    }

    // 4. Grocery Items Count
    try {
      const list = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_groceries');
      if (list) {
        const parsed = JSON.parse(list);
        if (Array.isArray(parsed)) {
          const unbought = parsed.filter((item: any) => !item.checked);
          setGroceryItemsCount(unbought.length);
        }
      } else {
        setGroceryItemsCount(0);
      }
    } catch {
      setGroceryItemsCount(0);
    }

    // 5. Upcoming Meal
    try {
      const plan = localStorage.getItem('zecratary_meal_plan');
      if (plan) {
        const parsedPlan = JSON.parse(plan);
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          const firstMeal = parsedPlan[0];
          setUpcomingMeal({
            mealType: (firstMeal.mealType || 'Dinner').toUpperCase(),
            title: firstMeal.recipeName || firstMeal.title || 'Authentic Pad Thai Recipe',
            timeOrTags: firstMeal.time ? `${firstMeal.time} • Planned` : '40 mins • High-Protein'
          });
          return;
        }
      }
      setUpcomingMeal({
        mealType: 'DINNER',
        title: recipesList[0]?.title || recipesList[0]?.name || 'Authentic Pad Thai Recipe',
        timeOrTags: '40 mins • High-Protein'
      });
    } catch {
      setUpcomingMeal({
        mealType: 'DINNER',
        title: 'Authentic Pad Thai Recipe',
        timeOrTags: '40 mins • High-Protein'
      });
    }
  };

  useEffect(() => {
    document.title = 'Dashboard - FoodiePrep';
    syncDashboardData();

    const handleUpdate = () => syncDashboardData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('zecratary_recipes_updated', handleUpdate);
    window.addEventListener('zecratary_saved_recipes_updated', handleUpdate);
    window.addEventListener('zecratary_pantry_updated', handleUpdate);
    window.addEventListener('zecratary_shopping_updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('zecratary_recipes_updated', handleUpdate);
      window.removeEventListener('zecratary_saved_recipes_updated', handleUpdate);
      window.removeEventListener('zecratary_pantry_updated', handleUpdate);
      window.removeEventListener('zecratary_shopping_updated', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Autonomous culinary planning and pantry tracking.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/recipes" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Saved Recipes</span>
          <span className="text-3xl font-black text-[#E05638] mt-1 block">{recipesCount}</span>
        </Link>
        <Link href="/books" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Recipe Books</span>
          <span className="text-3xl font-black text-emerald-400 mt-1 block">{recipeBooksCount}</span>
        </Link>
        <Link href="/pantry" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Pantry Stock</span>
          <span className="text-3xl font-black text-white mt-1 block">{pantryStockCount}</span>
        </Link>
        <Link href="/groceries" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Grocery Items</span>
          <span className="text-3xl font-black text-white mt-1 block">{groceryItemsCount}</span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Meal Card */}
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#E05638]" /> Upcoming Meal
          </h2>
          {upcomingMeal ? (
            <div className="p-4 bg-[#0B101D] border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase">Today • {upcomingMeal.mealType}</span>
                <h3 className="font-bold text-white mt-0.5">{upcomingMeal.title}</h3>
                <span className="text-xs text-slate-400">{upcomingMeal.timeOrTags}</span>
              </div>
              <Link href="/planner" className="text-xs text-[#E05638] font-bold hover:underline">View Planner</Link>
            </div>
          ) : (
            <div className="p-4 bg-[#0B101D] border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span>No meals scheduled for today.</span>
              <Link href="/planner" className="text-xs text-[#E05638] font-bold hover:underline">Plan Meal</Link>
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-emerald-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <Link href="/chef" className="p-3 bg-[#0B101D] border border-slate-800 hover:border-slate-700 text-white rounded-xl text-center flex items-center justify-center gap-2 transition">
              <ChefHat className="h-4 w-4 text-emerald-400" /> Ask Chef AI
            </Link>
            <Link href="/import" className="p-3 bg-[#0B101D] border border-slate-800 hover:border-slate-700 text-white rounded-xl text-center flex items-center justify-center gap-2 transition">
              <Sparkles className="h-4 w-4 text-[#E05638]" /> Import Social URL
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/globals.css`
```text
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0B101D;
  color: #F1F5F9;
}

```

## File: `apps/web/src/app/ClientLayout.tsx`
```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, MessageSquare, UploadCloud, Edit3, 
  BookOpen, Book, Package, ShoppingCart, Calendar, 
  LayoutTemplate, Moon, User, Mail, LogOut, ShieldCheck
} from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0b0f19] border-r border-slate-800/80 flex flex-col justify-between p-5 shrink-0 select-none">
        <div className="space-y-6">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="text-[#E05638] text-xl">🥕</div>
            <span className="font-extrabold text-lg tracking-tight">
              <span className="text-white">Zecratary</span>
            </span>
          </div>

          {/* Main Dashboard Link */}
          <nav className="space-y-1">
            <Link
              href="/"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                pathname === '/chef' || pathname === '/'
                  ? 'bg-[#141b2d] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-slate-400" />
              Dashboard
            </Link>

            {/* CREATE SECTION */}
            <div className="pt-4 pb-1 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Create
            </div>
            {[
              { label: 'Chef Foodie AI', href: '/chef', icon: MessageSquare },
              { label: 'Import', href: '/import', icon: UploadCloud },
              { label: 'Manual', href: '/manual', icon: Edit3 },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    active
                      ? 'bg-[#141b2d] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
                  }`}
                >
                  <item.icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}

            {/* MANAGE SECTION */}
            <div className="pt-4 pb-1 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Manage
            </div>
            {[
              { label: 'Saved Recipes', href: '/recipes', icon: BookOpen },
              { label: 'Books', href: '/books', icon: Book },
              { label: 'Pantry', href: '/pantry', icon: Package },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    active
                      ? 'bg-[#141b2d] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
                  }`}
                >
                  <item.icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}

            {/* PLAN SECTION */}
            <div className="pt-4 pb-1 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Plan
            </div>
            {[
              { label: 'Shopping List', href: '/shopping', icon: ShoppingCart },
              { label: 'Planner', href: '/planner', icon: Calendar },
              { label: 'Templates', href: '/templates', icon: LayoutTemplate },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    active
                      ? 'bg-[#1c3a27] text-emerald-300 border border-emerald-500/30 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="space-y-1.5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between px-3.5 py-2 text-slate-400">
            <Moon className="h-4 w-4 text-[#E05638]" />
          </div>

          {[
            { label: 'Profile', href: '/profile', icon: User },
            { label: 'Contact Us', href: '/contacts', icon: Mail },
            { label: 'Admin Setting', href: '/admin', icon: ShieldCheck },
            { label: 'Logout', href: '#', icon: LogOut },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => {
                if (item.label === 'Logout') {
                  e.preventDefault();
                  alert('Logged out successfully.');
                }
              }}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-300 hover:text-white hover:bg-[#141b2d]/50 transition"
            >
              <item.icon className="h-4 w-4 text-slate-400" />
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT VIEW */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}

```

## File: `apps/web/src/app/pantry/page.tsx`
```typescript
'use client';
import { CATEGORIES } from '@/constants/categories';

import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Camera, Search, ArrowUpDown, Check, Edit3, X, Save, ChefHat } from 'lucide-react';

export default function PantryPage() {
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Produce');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [expiryDate, setExpiryDate] = useState('');

  const [editingItem, setEditingItem] = useState<any | null>(null);

  useEffect(() => {
    document.title = 'Pantry Inventory - FoodiePrep';
    const local = localStorage.getItem('zecratary_pantry_items');
    if (local) {
      setPantryItems(JSON.parse(local));
    } else {
      const defaultItems = [
        { id: 'p_1', name: 'eggs', quantity: '4', unit: 'units', category: 'Dairy', expiryDate: '2026-09-02' },
        { id: 'p_2', name: 'Jasmine Rice', quantity: '5', unit: 'kg', category: 'Grains and Pasta', expiryDate: '2026-12-31' },
        { id: 'p_3', name: 'Fish Sauce', quantity: '1', unit: 'bottle', category: 'Condiments and Sauces', expiryDate: '2027-06-15' }
      ];
      setPantryItems(defaultItems);
      localStorage.setItem('zecratary_pantry_items', JSON.stringify(defaultItems));
    }
  }, []);

  const savePantry = (updated: any[]) => {
    setPantryItems(updated);
    localStorage.setItem('zecratary_pantry_items', JSON.stringify(updated));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem = {
      id: 'p_' + Date.now(),
      name: itemName.trim(),
      quantity: itemQuantity || '1',
      unit: itemUnit || 'Unit',
      category: itemCategory,
      expiryDate: expiryDate || ''
    };

    const updated = [newItem, ...pantryItems];
    savePantry(updated);
    setItemName('');
    setItemQuantity('1');
    setExpiryDate('');
    setShowAddModal(false);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    const updated = pantryItems.map(item => item.id === editingItem.id ? editingItem : item);
    savePantry(updated);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    const updated = pantryItems.filter(item => item.id !== id);
    savePantry(updated);
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (!confirm('Are you sure you want to delete selected ingredients?')) return;
    const updated = pantryItems.filter(item => !selectedIds.includes(item.id));
    savePantry(updated);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const calculateDaysLeft = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredItems = pantryItems
    .filter(item => !search.trim() || item.name.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      return sortAsc ? res : -res;
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100 pb-16">
      
      {/* PAGE HEADER & DESCRIPTION */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white tracking-tight">Pantry Inventory</h1>
        <p className="text-xs text-slate-400">Manage available ingredients, track expiry dates, and discover matching recipes instantly.</p>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-emerald-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111726] border border-emerald-950 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => alert('Camera photo scan activated!')}
            className="flex-1 sm:flex-initial bg-[#111726] hover:bg-[#1a2338] border border-emerald-900 text-emerald-400 font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Camera className="h-4 w-4" /> Take Photo
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#E05638]/20"
          >
            <Plus className="h-4 w-4" /> Add Ingredient(s)
          </button>
        </div>
      </div>

      {/* ACTION BANNER */}
      <div className="bg-[#111726] border border-emerald-950 rounded-3xl p-5 space-y-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => alert(`Discovering recipes with ${selectedIds.length} selected ingredients!`)}
            className={`font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-md ${
              selectedIds.length > 0
                ? 'bg-[#E05638] hover:bg-[#c94529] text-white shadow-[#E05638]/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="h-4 w-4" /> Discover Recipes with {selectedIds.length} Selected
          </button>

          <div className="flex items-center gap-6 text-xs font-bold">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
              title="Toggle sorting direction"
            >
              <ArrowUpDown className="h-3.5 w-3.5" /> {sortAsc ? 'A-Z' : 'Z-A'}
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete All
            </button>
            <button
              onClick={toggleSelectAll}
              className="text-slate-300 hover:text-white transition"
            >
              {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* INGREDIENTS LIST */}
        <div className="space-y-3 pt-2">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-[#0B101D] rounded-2xl border border-slate-800">
              <Package className="h-8 w-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No ingredients found</h4>
              <p className="text-xs text-slate-400">Add ingredients to your pantry or adjust your search.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const daysLeft = calculateDaysLeft(item.expiryDate);
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectOne(item.id)}
                  className={`flex items-center justify-between bg-[#0B101D] p-4 rounded-2xl border transition cursor-pointer select-none ${
                    isSelected ? 'border-[#E05638] bg-[#161219]' : 'border-emerald-950/80 hover:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                      isSelected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-white text-sm capitalize">{item.name}</span>
                      {daysLeft !== null && (
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          daysLeft < 0
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : daysLeft <= 3
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? 'Expires Today!' : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-slate-400 font-medium">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-slate-400 hover:text-white transition bg-slate-900 rounded-xl border border-slate-800"
                      title="Edit item"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-slate-900 rounded-xl border border-slate-800"
                      title="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADD INGREDIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E05638]" /> Add Pantry Ingredient(s)
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eggs, Olive Oil..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Quantity</label>
                  <input
                    type="text"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
{CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <div>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-slate-500 outline-none focus:text-slate-200"
                    title="Expiry Date"
                  />
                </div>
                <span className="block text-[10px] text-slate-500 mt-1 pl-1 font-medium">Expiry Date</span>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20"
                >
                  Add Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INGREDIENT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Pantry Ingredient
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Quantity</label>
                  <input
                    type="text"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
{CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editingItem.expiryDate || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: `apps/web/src/app/contact/page.tsx`
```typescript
'use client';
import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Contact Us</h1>
        <p className="text-emerald-400 text-xs mt-1">We'd love to hear from you</p>
      </div>

      <div className="border border-emerald-900/60 bg-[#0B101D] rounded-3xl p-16 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-emerald-700/80 flex items-center justify-center text-[#E05638] mx-auto">
          <Mail className="h-6 w-6 text-[#E05638]" />
        </div>
        <h2 className="text-xl font-bold text-[#E05638]">Get in Touch</h2>
        <p className="text-xs text-emerald-400 max-w-md mx-auto leading-relaxed">
          If you have any questions, feedback or would like to report an issue, please reach out to us at{' '}
          <a href="mailto:info@foodieprep.ai" className="font-bold underline text-emerald-300">info@foodieprep.ai</a>{' '}
          and we will get back to you as soon as we can.
        </p>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/shopping/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, Plus, Trash2, CheckSquare, Square, Star, 
  Copy, Edit3, X, Save, Search, CheckCircle2 
} from 'lucide-react';

export default function ShoppingListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showStaplesOnly, setShowStaplesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states matching ingredient fields
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [itemCategory, setItemCategory] = useState('Produce');

  useEffect(() => {
    document.title = 'Shopping List - FoodiePrep';
    const local = localStorage.getItem('zecratary_shopping_list');
    if (local) {
      let parsed = JSON.parse(local);
      parsed = parsed.filter((i: any) => !i.checked);
      setItems(parsed);
      localStorage.setItem('zecratary_shopping_list', JSON.stringify(parsed));
    } else {
      const defaultItems = [
        { id: 's_1', name: 'cloves garlic', amount: '3', unit: '', category: 'Produce', staple: true, checked: false },
        { id: 's_2', name: 'roughly chopped shallots', amount: '¼', unit: 'cup', category: 'Produce', staple: false, checked: false },
        { id: 's_3', name: 'finely chopped sweet preserved daikon radish', amount: '3', unit: 'tbsp', category: 'Produce', staple: false, checked: false },
        { id: 's_4', name: 'bean sprouts loosely packed', amount: '2½', unit: 'cup', category: 'Produce', staple: false, checked: false },
        { id: 's_5', name: 'dried shrimp medium size roughly chopped', amount: '2', unit: 'tbsp', category: 'Meat and Seafood', staple: true, checked: false },
        { id: 's_6', name: 'pressed tofu', amount: '3', unit: 'oz', category: 'Meat and Seafood', staple: false, checked: false }
      ];
      setItems(defaultItems);
      localStorage.setItem('zecratary_shopping_list', JSON.stringify(defaultItems));
    }
  }, []);

  const saveList = (updated: any[]) => {
    setItems(updated);
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem = {
      id: 's_' + Date.now(),
      name: itemName.trim(),
      amount: itemAmount || '1',
      unit: itemUnit || '',
      category: itemCategory,
      staple: false,
      checked: false
    };

    saveList([newItem, ...items]);
    setItemName('');
    setItemAmount('1');
    setItemUnit('Unit');
    setShowAddModal(false);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    const updated = items.map(i => i.id === editingItem.id ? editingItem : i);
    saveList(updated);
    setEditingItem(null);
  };

  const toggleCheck = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    saveList(updated);
  };

  const toggleStaple = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, staple: !i.staple } : i);
    saveList(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    saveList(updated);
  };

  const handleMarkAllComplete = () => {
    const updated = items.map(i => ({ ...i, checked: true }));
    saveList(updated);
  };

  const handleCopyList = () => {
    const activeList = items.filter(i => !i.checked);
    if (activeList.length === 0) {
      alert('No active items to copy!');
      return;
    }

    const categories = Array.from(new Set(activeList.map(i => i.category || 'Pantry Staples'))).sort();
    
    let textLines: string[] = [];
    categories.forEach(cat => {
      textLines.push(`[${cat}]`);
      const catItems = activeList.filter(i => (i.category || 'Pantry Staples') === cat);
      catItems.forEach(item => {
        textLines.push(`- ${item.name}`);
      });
      textLines.push('');
    });

    const finalText = textLines.join('\n').trim();
    navigator.clipboard.writeText(finalText);
    alert(`Successfully copied ${activeList.length} items to clipboard, sorted by category!`);
  };

  const completedCount = items.filter(i => i.checked).length;

  const filteredItems = items.filter(i => {
    const matchesSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesStaples = !showStaplesOnly || i.staple;
    return matchesSearch && matchesStaples;
  });

  const activeItems = filteredItems.filter(i => !i.checked);
  const completedItems = filteredItems.filter(i => i.checked);

  const categories = Array.from(new Set(activeItems.map(i => i.category || 'Pantry Staples')));

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 pb-16">
      
      {/* PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Shopping List</h1>
        <p className="text-xs text-emerald-400 font-semibold">{completedCount} completed items</p>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <button
          onClick={handleMarkAllComplete}
          className="w-full sm:w-auto bg-[#111726] hover:bg-[#1a2338] border border-emerald-900 text-emerald-400 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          ✓ Mark All Complete
        </button>

        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-emerald-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111726] border border-emerald-950 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleCopyList}
            className="flex-1 sm:flex-initial bg-[#111726] hover:bg-[#1a2338] border border-emerald-900 text-emerald-400 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Copy className="h-4 w-4" /> Copy List
          </button>
          
          <button
            onClick={() => setShowStaplesOnly(!showStaplesOnly)}
            className={`flex-1 sm:flex-initial border font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm ${
              showStaplesOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-[#111726] hover:bg-[#1a2338] border-amber-900/80 text-amber-400'
            }`}
          >
            <Star className={`h-4 w-4 ${showStaplesOnly ? 'fill-amber-400' : ''}`} /> 
            {showStaplesOnly ? 'Show All Items' : 'My Staples'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#E05638]/20"
          >
            <Plus className="h-4 w-4" /> Add Item(s)
          </button>
        </div>
      </div>

      {/* ACTIVE CATEGORY SECTIONS */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const catItems = activeItems.filter(i => (i.category || 'Pantry Staples') === cat);
          if (catItems.length === 0) return null;

          return (
            <div key={cat} className="bg-[#111726] border border-emerald-950 rounded-3xl p-6 space-y-4 shadow-md">
              <h2 className="text-base font-extrabold text-[#E05638] tracking-wide">{cat}</h2>

              <div className="space-y-3">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center justify-between bg-[#0B101D] p-4 rounded-2xl border border-emerald-950/80 hover:border-emerald-800 transition cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center transition">
                        {item.checked && <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm capitalize text-white">
                          {item.name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">
                          {item.amount} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleStaple(item.id)}
                        className="p-2 transition text-slate-600 hover:text-amber-400"
                        title="Mark as Staple"
                      >
                        <Star className={`h-4 w-4 ${item.staple ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-slate-400 hover:text-white transition bg-slate-900 rounded-xl border border-slate-800"
                        title="Edit item"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition bg-slate-900 rounded-xl border border-slate-800"
                        title="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* COMPLETED ITEMS SECTION */}
        {completedItems.length > 0 && (
          <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Items ({completedItems.length})</h2>

            <div className="space-y-3">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="flex items-center justify-between bg-[#0B101D]/60 p-4 rounded-2xl border border-slate-800/80 transition cursor-pointer select-none opacity-60 line-through"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-lg border border-emerald-600 bg-emerald-600 text-white flex items-center justify-center transition">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm capitalize text-slate-400">
                        {item.name}
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.amount} {item.unit} • {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-slate-400 hover:text-white transition bg-slate-900 rounded-xl border border-slate-800"
                      title="Edit item"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-slate-900 rounded-xl border border-slate-800"
                      title="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E05638]" /> Add Shopping Item
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cloves garlic..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Amount / Qty</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 or ¼"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. cup, tbsp, oz"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
                  <option value="Produce">Produce</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Dairy">Dairy</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Shopping Item
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Amount</label>
                  <input
                    type="text"
                    value={editingItem.amount}
                    onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
                  <option value="Produce">Produce</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Dairy">Dairy</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: `apps/web/src/app/planner/page.tsx`
```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Heart, SlidersHorizontal, ChevronDown, 
  ChevronUp, Edit3, Check, CheckSquare
} from 'lucide-react';

// Timezone-safe local date formatting helpers
const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (str: string): Date => {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function PlannerPage() {
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => parseDateKey('2026-08-24'));
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Main Add Meal Modal State
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('2026-08-28');
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  // Copy Day Dropdown State
  const [activeCopyDropdownDate, setActiveCopyDropdownDate] = useState<string | null>(null);
  const [copyCustomDate, setCopyCustomDate] = useState('');

  // Edit Meal Modal State
  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editRecipeObj, setEditRecipeObj] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('2026-08-28');
  const [editMealType, setEditMealType] = useState('Dinner');
  const [editMealTime, setEditMealTime] = useState('');
  const [editIsLeftover, setEditIsLeftover] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // "Select Recipe" Sub-Modal State
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'add' | 'edit'>('add');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('All Books');
  const [activeRecipeTagFilter, setActiveRecipeTagFilter] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // "Select Recipes for Shopping List" Modal State
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [selectedMealIdsForShopping, setSelectedMealIdsForShopping] = useState<string[]>([]);
  const [expandedDayCards, setExpandedDayCards] = useState<{ [key: string]: boolean }>({});

  const loadSavedData = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const uniqueRecipes: any[] = [];
          const seenIds = new Set();

          parsed.forEach((rec: any) => {
            const id = rec.id || rec.title || rec.name;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              uniqueRecipes.push({
                id: rec.id || id,
                name: rec.title || rec.name || 'Untitled Recipe',
                title: rec.title || rec.name || 'Untitled Recipe',
                category: rec.tags?.[0] || rec.recipeType || rec.category || 'Main Dish',
                isFavorite: Boolean(rec.isFavorite),
                bookId: rec.bookId || null,
                ingredients: rec.ingredients || [],
                image: rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
                imageUrl: rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
              });
            }
          });

          setSavedRecipes(uniqueRecipes);
        }
      }

      const rawBooks = localStorage.getItem('zecratary_recipe_books');
      if (rawBooks) {
        const parsedBooks = JSON.parse(rawBooks);
        if (Array.isArray(parsedBooks)) {
          setBooks(parsedBooks);
        }
      } else {
        setBooks([
          { id: 'book_1', title: 'Family Favorites & Weeknight Dinners' },
          { id: 'book_2', title: 'Authentic Asian Cuisine' },
          { id: 'book_3', title: 'Baking & Desserts' }
        ]);
      }
    } catch (e) {
      console.error('Failed to load saved data', e);
    }
  }, []);

  useEffect(() => {
    document.title = 'Meal Planner - FoodiePrep';

    const localPlan = localStorage.getItem('zecratary_meal_plan');
    if (localPlan) {
      try {
        setPlannedMeals(JSON.parse(localPlan));
      } catch (e) {}
    } else {
      const defaultPlan = [
        {
          id: 'p_1',
          date: '2026-08-28',
          recipeName: 'Caesar Salad Recipe',
          image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00',
          isLeftover: false,
          notes: ''
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
    }

    loadSavedData();

    const handleSync = () => loadSavedData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
    };
  }, [loadSavedData]);

  const savePlan = (updated: any[]) => {
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
  };

  const openAddModal = (date: string) => {
    loadSavedData();
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
    setIsLeftover(false);
    setNotes('');
    setRecipeSearch('');
    setSelectedBookFilter('All Books');
    setActiveRecipeTagFilter('All');
    setShowFilterOptions(false);
    setShowRecipePickerModal(false);
    setActiveCopyDropdownDate(null);
    setShowAddMealModal(true);
  };

  const openEditModal = (meal: any) => {
    loadSavedData();
    setEditingMealId(meal.id);
    setEditDate(meal.date || selectedDate);
    setEditMealType(meal.mealType || 'Dinner');
    setEditMealTime(meal.time || '');
    setEditIsLeftover(Boolean(meal.isLeftover));
    setEditNotes(meal.notes || '');

    const found = savedRecipes.find(r => (r.name === meal.recipeName || r.title === meal.recipeName || r.id === meal.recipeId));
    setEditRecipeObj(found || {
      id: meal.recipeId || 'custom',
      name: meal.recipeName,
      title: meal.recipeName,
      image: meal.image,
      imageUrl: meal.image
    });

    setRecipeSearch('');
    setSelectedBookFilter('All Books');
    setActiveRecipeTagFilter('All');
    setShowFilterOptions(false);
    setActiveCopyDropdownDate(null);
    setShowEditMealModal(true);
  };

  const handleCopyDayTo = (sourceDateStr: string, targetDateStr: string) => {
    const sourceDayMeals = plannedMeals.filter(m => m.date === sourceDateStr);
    if (sourceDayMeals.length === 0) {
      alert('No meals scheduled on this date to copy.');
      setActiveCopyDropdownDate(null);
      return;
    }

    const copiedMeals = sourceDayMeals.map((m) => ({
      ...m,
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: targetDateStr
    }));

    const updated = [...plannedMeals, ...copiedMeals];
    savePlan(updated);
    setActiveCopyDropdownDate(null);

    const targetFormatted = parseDateKey(targetDateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    alert(`Copied ${sourceDayMeals.length} meal(s) to ${targetFormatted}!`);
  };

  const handleCopyTomorrow = (sourceDateStr: string) => {
    const d = parseDateKey(sourceDateStr);
    d.setDate(d.getDate() + 1);
    handleCopyDayTo(sourceDateStr, formatDateKey(d));
  };

  const handleCopyNextWeek = (sourceDateStr: string) => {
    const d = parseDateKey(sourceDateStr);
    d.setDate(d.getDate() + 7);
    handleCopyDayTo(sourceDateStr, formatDateKey(d));
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeObj) {
      alert('Please select a recipe by clicking "+ Select Recipe".');
      return;
    }
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: activeDateForAdd,
      recipeId: selectedRecipeObj.id,
      recipeName: selectedRecipeObj.name || selectedRecipeObj.title,
      image: selectedRecipeObj.image || selectedRecipeObj.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      mealType: mealType,
      time: mealTime,
      isLeftover: isLeftover,
      notes: notes
    };
    savePlan([...plannedMeals, newMeal]);
    setShowAddMealModal(false);
  };

  const handleEditMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMealId || !editRecipeObj) return;

    const updated = plannedMeals.map((m) => {
      if (m.id === editingMealId) {
        return {
          ...m,
          date: editDate,
          recipeId: editRecipeObj.id || m.recipeId,
          recipeName: editRecipeObj.name || editRecipeObj.title || m.recipeName,
          image: editRecipeObj.image || editRecipeObj.imageUrl || m.image,
          mealType: editMealType,
          time: editMealTime,
          isLeftover: editIsLeftover,
          notes: editNotes
        };
      }
      return m;
    });

    savePlan(updated);
    setShowEditMealModal(false);
    setEditingMealId(null);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
    if (showEditMealModal && editingMealId === id) {
      setShowEditMealModal(false);
    }
  };

  const openShoppingListSelectModal = () => {
    loadSavedData();
    const allMealIds = plannedMeals.filter(m => !m.isLeftover).map(m => m.id);
    setSelectedMealIdsForShopping(allMealIds);
    setShowShoppingListModal(true);
  };

  const toggleDaySelectionForShopping = (dateStr: string, dayMeals: any[]) => {
    const dayMealIds = dayMeals.map(m => m.id);
    const allSelected = dayMealIds.every(id => selectedMealIdsForShopping.includes(id));

    if (allSelected) {
      setSelectedMealIdsForShopping(selectedMealIdsForShopping.filter(id => !dayMealIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedMealIdsForShopping, ...dayMealIds]));
      setSelectedMealIdsForShopping(merged);
    }
  };

  const toggleSingleMealForShopping = (mealId: string) => {
    if (selectedMealIdsForShopping.includes(mealId)) {
      setSelectedMealIdsForShopping(selectedMealIdsForShopping.filter(id => id !== mealId));
    } else {
      setSelectedMealIdsForShopping([...selectedMealIdsForShopping, mealId]);
    }
  };

  const handleGenerateShoppingList = () => {
    const selectedMeals = plannedMeals.filter(m => selectedMealIdsForShopping.includes(m.id));
    if (selectedMeals.length === 0) {
      alert('Please select at least one recipe day to generate a shopping list.');
      return;
    }

    const localList = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const currentItems = localList ? JSON.parse(localList) : [];
    const newIngredients: any[] = [];

    selectedMeals.forEach((meal) => {
      const fullRecipe = savedRecipes.find(r => (r.name === meal.recipeName || r.title === meal.recipeName || r.id === meal.recipeId));
      if (fullRecipe && Array.isArray(fullRecipe.ingredients) && fullRecipe.ingredients.length > 0) {
        fullRecipe.ingredients.forEach((ing: any, idx: number) => {
          newIngredients.push({
            id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + idx,
            name: typeof ing === 'string' ? ing : (ing.item || ing.name || 'Ingredient'),
            quantity: ing.amount || ing.quantity || '1',
            unit: ing.unit || 'item',
            category: ing.category || 'Pantry Staples',
            checked: false
          });
        });
      } else {
        newIngredients.push({
          id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: meal.recipeName + ' ingredients',
          quantity: '1',
          unit: 'pack',
          category: 'Pantry Staples',
          checked: false
        });
      }
    });

    const merged = [...newIngredients, ...currentItems];
    localStorage.setItem('zecratary_shopping', JSON.stringify(merged));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(merged));
    setShowShoppingListModal(false);
    router.push('/shopping');
  };

  // Safe generation of week dates without UTC offset drift
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
    const dateStr = formatDateKey(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = d.getDate();
    weekDays.push({ dateStr, dayName, dayNum, fullDate: d });
  }

  const todayStr = '2026-08-28';
  const tomorrowDateObj = parseDateKey(todayStr);
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = formatDateKey(tomorrowDateObj); // '2026-08-29'

  const endDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeDateObj = parseDateKey(activeDateForAdd);
  const activeDateFormattedHeader = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const activeDateFieldText = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const datesWithMeals = Array.from(new Set(plannedMeals.map(m => m.date))).sort();

  // 3-Day Sequential Display Feed (Selected Day + Next 2 Days)
  const displayDays = [0, 1, 2].map((offset) => {
    const base = parseDateKey(selectedDate);
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    const dateStr = formatDateKey(d);
    const isToday = dateStr === todayStr;
    const isTomorrow = dateStr === tomorrowStr;
    const titleDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dayMeals = plannedMeals.filter(m => m.date === dateStr);
    return { dateStr, titleDate, isToday, isTomorrow, dayMeals };
  });

  const filteredPickerRecipes = savedRecipes.filter(r => {
    const name = (r.name || r.title || '').toLowerCase();
    const matchesSearch = !recipeSearch.trim() || name.includes(recipeSearch.toLowerCase().trim());

    let matchesBook = true;
    if (selectedBookFilter !== 'All Books') {
      matchesBook = r.bookId === selectedBookFilter;
    }

    let matchesTag = true;
    if (activeRecipeTagFilter !== 'All') {
      if (activeRecipeTagFilter === 'Favorites') {
        matchesTag = Boolean(r.isFavorite);
      } else {
        matchesTag = (r.category === activeRecipeTagFilter || r.tags?.includes(activeRecipeTagFilter));
      }
    }

    return matchesSearch && matchesBook && matchesTag;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-24 px-4">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Planner</h1>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => alert('Plan Week activated!')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <CalendarIcon className="h-4 w-4" /> Plan Week
          </button>
          <button 
            onClick={() => alert('Week copied!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Copy className="h-4 w-4 text-[#E05638]" /> Copy Week
          </button>
          <button
            type="button"
            onClick={openShoppingListSelectModal}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-[#E05638]" /> Shopping List
          </button>
          <button 
            onClick={() => alert('Share link copied!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4 text-[#E05638]" /> Share
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-base font-extrabold text-[#E05638] tracking-wide">{rangeStr}</span>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const next = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 7);
                setCurrentWeekStart(next);
              }}
              className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentWeekStart(parseDateKey('2026-08-24'))}
              className="px-3.5 py-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs rounded-xl transition"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const isToday = d.dateStr === todayStr;
            const hasMeals = plannedMeals.some(m => m.date === d.dateStr);

            return (
              <div
                key={d.dateStr}
                onClick={() => {
                  setSelectedDate(d.dateStr);
                  setActiveCopyDropdownDate(null);
                }}
                className={`p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  isToday 
                    ? 'bg-[#161213] border-[#E05638] shadow-md' 
                    : isSelected 
                    ? 'bg-[#111726] border-emerald-500' 
                    : 'bg-[#070b13] border-emerald-950/80 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{d.dayName}</span>
                <span className={`text-xl font-black mt-1 ${isToday ? 'text-[#E05638]' : 'text-white'}`}>{d.dayNum}</span>
                {isToday && <span className="text-[9px] font-bold text-[#E05638] uppercase mt-0.5">Today</span>}
                {hasMeals && !isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#E05638] mt-1"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Average Banner */}
      <div className="bg-[#070b13] border border-emerald-950 rounded-2xl p-5 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <span className="text-lg">🔥</span> Daily average
          </div>
          <button className="flex items-center gap-1.5 bg-[#161213] border border-emerald-900/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-emerald-950/30 transition">
            <Lock className="h-3.5 w-3.5" /> Upgrade
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-400 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Calories</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">1,234</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Protein</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">120g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Carbs</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">150g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Fat</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">45g</span>
          </div>
        </div>
      </div>

      {/* 3-DAY FEED: SELECTED DAY + ADDITIONAL 2 DAYS OF MEALS */}
      <div className="space-y-6">
        {displayDays.map((day) => {
          const isCopyOpen = activeCopyDropdownDate === day.dateStr;
          const hasMealsInDay = day.dayMeals.length > 0;

          return (
            <div
              key={day.dateStr}
              className="bg-[#070b13] border border-emerald-950 rounded-3xl p-6 space-y-6 shadow-xl"
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-extrabold text-white">{day.titleDate}</h2>
                  
                  {day.isToday && (
                    <span className="bg-[#E05638] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      TODAY
                    </span>
                  )}
                  {day.isTomorrow && !day.isToday && (
                    <span className="bg-[#1f1618] border border-[#E05638]/70 text-[#E05638] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      TOMORROW
                    </span>
                  )}
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-2 relative">
                  {/* Copy Day Popover — Only visible if day contains planned meals */}
                  {hasMealsInDay && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveCopyDropdownDate(isCopyOpen ? null : day.dateStr)}
                        className="bg-[#0b0e14] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Copy className="h-4 w-4 text-slate-400" /> Copy
                      </button>

                      {isCopyOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveCopyDropdownDate(null)} 
                          />
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-2 w-60 bg-[#0b0e14] border border-slate-800/90 rounded-2xl shadow-2xl p-3.5 z-50 space-y-3 text-xs animate-in fade-in"
                          >
                            <h4 className="font-bold text-white text-xs px-1">Copy day to...</h4>
                            
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyTomorrow(day.dateStr)}
                                className="w-full text-left font-bold px-3 py-2 rounded-xl bg-[#07090e] hover:bg-[#141824] border border-slate-800 text-slate-200 hover:text-white transition"
                              >
                                Tomorrow
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyNextWeek(day.dateStr)}
                                className="w-full text-left font-bold px-3 py-2 rounded-xl bg-[#07090e] hover:bg-[#141824] border border-slate-800 text-slate-200 hover:text-white transition"
                              >
                                Same day next week
                              </button>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 px-1">
                              <span className="block text-[11px] font-semibold text-slate-400">Pick a date</span>
                              <input
                                type="date"
                                value={copyCustomDate}
                                onChange={(e) => {
                                  setCopyCustomDate(e.target.value);
                                  if (e.target.value) {
                                    handleCopyDayTo(day.dateStr, e.target.value);
                                    setCopyCustomDate('');
                                  }
                                }}
                                className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#E05638] cursor-pointer"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* + Add Meal Button */}
                  <button
                    onClick={() => openAddModal(day.dateStr)}
                    className="bg-[#0b0e14] hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="h-4 w-4 text-[#E05638]" /> Add Meal
                  </button>
                </div>
              </div>

              {/* Day Meals Content */}
              {!hasMealsInDay ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">Nothing planned yet</p>
                  <button
                    onClick={() => openAddModal(day.dateStr)}
                    className="inline-flex items-center gap-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add a meal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {day.dayMeals.map((meal) => (
                    <div key={meal.id} className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-md gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img 
                          src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                          alt={meal.recipeName}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700/80 shadow-sm shrink-0" 
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#172033] text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                              {meal.mealType}
                            </span>
                            {meal.isLeftover && (
                              <span className="bg-amber-950/60 border border-amber-600/40 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Leftover
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white leading-snug truncate">{meal.recipeName}</h3>
                          {meal.time && <span className="text-[11px] text-slate-400 flex items-center gap-1">⏰ {meal.time}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(meal)}
                          className="p-2.5 text-slate-300 hover:text-white transition bg-[#172033] hover:bg-slate-700 rounded-xl border border-slate-700/60 shadow-sm"
                          title="Edit Planned Meal"
                        >
                          <Edit3 className="h-4 w-4 text-[#E05638]" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="p-2.5 text-slate-400 hover:text-red-400 transition bg-[#172033] hover:bg-red-950/40 rounded-xl border border-slate-700/60 shadow-sm"
                          title="Delete Meal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 1. SELECT RECIPES FOR SHOPPING LIST MODAL */}
      {showShoppingListModal && (
        <div 
          onClick={() => setShowShoppingListModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-lg w-full p-7 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowShoppingListModal(false)} 
              className="absolute top-5 right-5 p-2 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1.5 pr-8">
              <h2 className="text-xl font-bold text-[#E05638] tracking-tight">
                Select Recipes for Shopping List
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose the recipes you want to include in your shopping list. Tap a day to expand and select individual recipes.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-1 text-xs">
              {datesWithMeals.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-[#07090e] rounded-2xl border border-slate-800">
                  No meals currently scheduled in your plan.
                </div>
              ) : (
                datesWithMeals.map((dateStr) => {
                  const dayMeals = plannedMeals.filter(m => m.date === dateStr);
                  const selectedCount = dayMeals.filter(m => selectedMealIdsForShopping.includes(m.id)).length;
                  const isAllDaySelected = selectedCount === dayMeals.length && dayMeals.length > 0;
                  const isPartiallySelected = selectedCount > 0 && selectedCount < dayMeals.length;
                  const isExpanded = Boolean(expandedDayCards[dateStr]);

                  const dObj = parseDateKey(dateStr);
                  const formattedDayTitle = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                  return (
                    <div 
                      key={dateStr}
                      className="border border-[#E05638] bg-[#0c0d11] rounded-2xl transition overflow-hidden shadow-md"
                    >
                      <div 
                        onClick={() => toggleDaySelectionForShopping(dateStr, dayMeals)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5">
                          <div 
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition shrink-0 ${
                              isAllDaySelected || isPartiallySelected
                                ? 'bg-[#E05638] text-white' 
                                : 'border border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isAllDaySelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            {isPartiallySelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-[#E05638]">
                              {formattedDayTitle}
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">
                              {selectedCount}/{dayMeals.length} selected
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDayCards({ ...expandedDayCards, [dateStr]: !isExpanded });
                          }}
                          className="p-1 text-[#E05638] hover:text-white transition"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-800/80 bg-[#07090e]/60">
                          {dayMeals.map((meal) => {
                            const isMealSelected = selectedMealIdsForShopping.includes(meal.id);
                            return (
                              <div
                                key={meal.id}
                                onClick={() => toggleSingleMealForShopping(meal.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                                  isMealSelected 
                                    ? 'bg-[#1a141a] border-[#E05638]/60' 
                                    : 'bg-[#0b0e14] border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                    isMealSelected 
                                      ? 'bg-[#E05638] border-[#E05638] text-white' 
                                      : 'border-slate-700 bg-slate-900'
                                  }`}>
                                    {isMealSelected && <Check className="h-3 w-3" />}
                                  </div>

                                  <img 
                                    src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                                    alt={meal.recipeName}
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                                  />

                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-white truncate">{meal.recipeName}</h4>
                                    <span className="text-[10px] text-slate-400">{meal.mealType}</span>
                                  </div>
                                </div>

                                {meal.isLeftover && (
                                  <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-700/40 px-1.5 py-0.5 rounded">
                                    Leftover
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowShoppingListModal(false)}
                className="py-3 px-4 bg-[#07090e] hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-2xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateShoppingList}
                className="py-3 px-4 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-[#E05638]/20"
              >
                Generate List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN ADD MEAL MODAL */}
      {showAddMealModal && (
        <div 
          onClick={() => setShowAddMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight">
                Add Meal for {activeDateFormattedHeader}
              </h2>
              <p className="text-slate-400 text-xs">
                Plan your meal by selecting a recipe and adding details.
              </p>
            </div>

            <form onSubmit={handleAddMealSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="w-full bg-[#070b13] border-2 border-blue-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200">
                  {activeDateFieldText}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                    placeholder="--:--"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {selectedRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image || selectedRecipeObj.imageUrl} 
                        alt={selectedRecipeObj.name || selectedRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700 shrink-0" 
                      />
                      <span className="text-white font-bold text-xs truncate">
                        {selectedRecipeObj.name || selectedRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setPickerTarget('add');
                        setShowRecipePickerModal(true);
                      }}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('add');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" /> Select Recipe
                  </button>
                )}
              </div>

              <div className="bg-[#070b13] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#E05638]">Leftover</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mark as leftovers from a previous meal — won't be added to shopping lists.
                  </p>
                </div>
                
                <div 
                  onClick={() => setIsLeftover(!isLeftover)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3 ${
                    isLeftover ? 'bg-[#E05638]' : 'bg-[#1e293b]'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    isLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={3}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none placeholder-slate-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT MEAL MODAL */}
      {showEditMealModal && (
        <div 
          onClick={() => setShowEditMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowEditMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Planned Meal
              </h2>
              <p className="text-slate-400 text-xs">
                Update details or swap the recipe for this meal.
              </p>
            </div>

            <form onSubmit={handleEditMealSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative">
                  <select
                    value={editMealType}
                    onChange={(e) => setEditMealType(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={editMealTime}
                    onChange={(e) => setEditMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {editRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={editRecipeObj.image || editRecipeObj.imageUrl} 
                        alt={editRecipeObj.name || editRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700 shrink-0" 
                      />
                      <span className="text-white font-bold text-xs truncate">
                        {editRecipeObj.name || editRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setPickerTarget('edit');
                        setShowRecipePickerModal(true);
                      }}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('edit');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" /> Select Recipe
                  </button>
                )}
              </div>

              <div className="bg-[#070b13] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#E05638]">Leftover</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mark as leftovers from a previous meal — won't be added to shopping lists.
                  </p>
                </div>
                
                <div 
                  onClick={() => setEditIsLeftover(!editIsLeftover)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3 ${
                    editIsLeftover ? 'bg-[#E05638]' : 'bg-[#1e293b]'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    editIsLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={3}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none placeholder-slate-500"
                ></textarea>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingMealId && confirm('Delete this planned meal?')) {
                      handleDeleteMeal(editingMealId);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-900/60 hover:bg-red-950/30 text-red-400 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditMealModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SELECT RECIPE PICKER MODAL */}
      {showRecipePickerModal && (
        <div 
          onClick={() => setShowRecipePickerModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0c10] border border-slate-800/90 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in min-h-[500px] flex flex-col justify-between cursor-default"
          >
            <div className="space-y-4">
              <button 
                onClick={() => setShowRecipePickerModal(false)} 
                className="absolute top-4 right-4 p-2 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-0.5 pr-8">
                <h2 className="text-lg font-black text-[#E05638] tracking-tight">Select Recipe</h2>
                <p className="text-xs text-slate-400">
                  Choose a recipe to add to your meal plan
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="w-full bg-[#07090e] border border-[#E05638] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedBookFilter}
                      onChange={(e) => setSelectedBookFilter(e.target.value)}
                      className="bg-[#07090e] border border-emerald-800 text-[#E05638] font-bold text-xs rounded-xl pl-3 pr-7 py-2 outline-none appearance-none cursor-pointer"
                    >
                      <option value="All Books">All Books</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className="border border-emerald-800 bg-[#07090e] hover:bg-emerald-950/30 text-[#E05638] font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#E05638]" /> Filter
                  </button>
                </div>

                {showFilterOptions && (
                  <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                    {['All', 'Favorites', 'Main Dish', 'Imported'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveRecipeTagFilter(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          activeRecipeTagFilter === tag
                            ? 'bg-[#E05638] text-white border-[#E05638]'
                            : 'bg-[#07090e] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredPickerRecipes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No recipes found matching criteria.
                  </div>
                ) : (
                  filteredPickerRecipes.map((rec) => {
                    const recTitle = rec.name || rec.title || 'Untitled Recipe';
                    const recCategory = rec.category || rec.recipeType || 'Main Dish';
                    const recImage = rec.image || rec.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

                    return (
                      <div
                        key={rec.id || recTitle}
                        className="flex items-center justify-between p-2 rounded-2xl bg-transparent transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={recImage}
                            alt={recTitle}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-extrabold text-[#E05638] text-xs leading-snug truncate">
                              {recTitle}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="bg-[#E05638] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {recCategory}
                              </span>
                              <Heart className="h-3 w-3 fill-[#E05638] text-[#E05638]" />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (pickerTarget === 'edit') {
                              setEditRecipeObj(rec);
                            } else {
                              setSelectedRecipeObj(rec);
                            }
                            setShowRecipePickerModal(false);
                          }}
                          className="px-4 py-1.5 bg-[#07090e] border border-emerald-800/80 hover:bg-emerald-950/30 text-[#E05638] font-bold text-xs rounded-xl transition shrink-0 ml-2"
                        >
                          Select
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="text-center py-2 text-xs font-semibold text-emerald-400">
              Showing {filteredPickerRecipes.length} of {savedRecipes.length} recipes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

## File: `apps/web/src/app/chef/page.tsx`
```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { ChefHat, Send, Sparkles, SlidersHorizontal, HelpCircle, Loader2, X, Plus, Check } from 'lucide-react';

export default function ChefChatPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Preferences Modal State
  const [showPreferences, setShowPreferences] = useState(false);
  const [servings, setServings] = useState(2);
  const [country, setCountry] = useState('Singapore');
  const [selectedDiets, setSelectedDiets] = useState<string[]>(['Vegetarian']);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(['Peanuts']);
  const [ingredientsToAvoid, setIngredientsToAvoid] = useState<string[]>(['Oily']);
  const [newAvoidItem, setNewAvoidItem] = useState('');
  const [tastes, setTastes] = useState<string[]>(['Less Spicy']);
  const [newTasteInput, setNewTasteInput] = useState('');

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('zecratary_recipe_preferences');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.servings) setServings(p.servings);
        if (p.country) setCountry(p.country);
        if (p.diets) setSelectedDiets(p.diets);
        if (p.allergies) setSelectedAllergies(p.allergies);
        if (p.avoid) setIngredientsToAvoid(p.avoid);
        if (p.tastes) setTastes(p.tastes);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const savePreferences = () => {
    const prefs = { servings, country, diets: selectedDiets, allergies: selectedAllergies, avoid: ingredientsToAvoid, tastes };
    localStorage.setItem('zecratary_recipe_preferences', JSON.stringify(prefs));
    setShowPreferences(false);
  };

  const clearAllPreferences = () => {
    setServings(2);
    setCountry('Singapore');
    setSelectedDiets([]);
    setSelectedAllergies([]);
    setIngredientsToAvoid([]);
    setTastes([]);
    localStorage.removeItem('zecratary_recipe_preferences');
  };

  const toggleItem = (list: string[], setList: Function, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addAvoidItem = () => {
    if (!newAvoidItem.trim()) return;
    if (!ingredientsToAvoid.includes(newAvoidItem.trim())) {
      setIngredientsToAvoid([...ingredientsToAvoid, newAvoidItem.trim()]);
    }
    setNewAvoidItem('');
  };

  const addTasteItem = () => {
    if (!newTasteInput.trim()) return;
    if (!tastes.includes(newTasteInput.trim())) {
      setTastes([...tastes, newTasteInput.trim()]);
    }
    setNewTasteInput('');
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    // Build strict preference profile string
    const preferenceContext = `
[STRICT RECIPE PREFERENCES & CONSTRAINTS]:
- Servings: ${servings} people
- Location/Measurement Standard: ${country}
- Dietary Preferences: ${selectedDiets.join(', ') || 'None'}
- Flavor Tastes & Styles: ${tastes.join(', ') || 'None'}
- Allergies (MANDATORY EXCLUSION): ${selectedAllergies.join(', ') || 'None'}
- Ingredients to Avoid: ${ingredientsToAvoid.join(', ') || 'None'}
`;

    try {
      const stored = localStorage.getItem('zecratary_engine_config');
      const engineConfig = stored ? JSON.parse(stored) : undefined;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe',
          prompt: `${textToSend}\n${preferenceContext}`,
          engineConfig,
        }),
      });
      const data = await res.json();
      if (data.success && data.recipe) {
        setMessages(prev => [...prev, { role: 'assistant', recipe: data.recipe }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Here is your customized recipe based on your preferences." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        recipe: {
          title: "Preference-Tailored Dish",
          description: `Customized specifically for ${servings} servings, adhering to your taste and dietary rules.`,
          servings: servings,
          prepTimeMinutes: 15,
          cookTimeMinutes: 20,
          calories: 410,
          proteinGrams: 24,
          carbsGrams: 32,
          fatGrams: 11,
          ingredients: [
            { item: "Fresh Organic Produce", quantity: "300g" },
            { item: "Approved Seasonings", quantity: "To taste" }
          ],
          instructions: [
            "Prepare all ingredients according to your dietary requirements.",
            "Cook over medium heat until tender.",
            "Serve immediately."
          ]
        }
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)] justify-between space-y-4 relative">
      {/* Header & Preference Pills Bar */}
      <div className="space-y-4 border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E05638]/10 flex items-center justify-center text-[#E05638]">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Foodie Chat</h1>
              <p className="text-xs text-slate-400">Ask me anything about recipes and cooking</p>
            </div>
          </div>
          <button
            onClick={() => setShowPreferences(true)}
            className="text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-[#111726] border border-slate-800 flex items-center gap-2 text-xs font-semibold transition hover:border-[#E05638]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#E05638]" /> Preferences
          </button>
        </div>

        {/* Active Preference Chips */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Servings: <strong className="text-white">{servings} people</strong>
          </span>
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Country: <strong className="text-white">{country}</strong>
          </span>
          {selectedDiets.map(d => (
            <span key={d} className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
              Diet: <strong className="text-white">{d}</strong>
            </span>
          ))}
          {tastes.map(t => (
            <span key={t} className="bg-[#3D4A32]/90 border border-emerald-600/50 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium">
              Taste: <strong className="text-white">{t}</strong>
            </span>
          ))}
          {selectedAllergies.map(a => (
            <span key={a} className="bg-red-950/60 border border-red-500/40 text-red-300 text-xs px-3 py-1 rounded-full font-medium">
              Allergy: <strong className="text-white">{a}</strong>
            </span>
          ))}
          {ingredientsToAvoid.map(av => (
            <span key={av} className="bg-orange-950/60 border border-orange-500/40 text-orange-300 text-xs px-3 py-1 rounded-full font-medium">
              Avoid: <strong className="text-white">{av}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Chat Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-center my-auto py-12 space-y-6">
            <div className="w-16 h-16 bg-[#E05638]/10 rounded-3xl flex items-center justify-center text-[#E05638] mx-auto">
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Hey, I'm Chef Foodie!</h2>
              <p className="text-slate-400 text-sm mt-1">What are we cooking today?</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {[
                'Create a meal plan',
                'Create a recipe',
                'Organise my saved recipes',
                "What's in my pantry?",
                'Help me use up my leftovers',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="bg-[#111726] border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-full transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-5 rounded-2xl max-w-2xl ${
                m.role === 'user'
                  ? 'bg-[#E05638] text-white font-medium text-sm'
                  : 'bg-[#111726] border border-slate-800 text-slate-100 space-y-4'
              }`}>
                {m.content && <p className="text-sm leading-relaxed">{m.content}</p>}
                {m.recipe && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[11px] font-bold text-[#E05638] uppercase tracking-wider">AI Recipe Created</span>
                      <h3 className="text-xl font-extrabold text-white mt-0.5">{m.recipe.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{m.recipe.description}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-[#0B101D] p-3 rounded-xl border border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Calories</span>
                        <span className="text-sm font-black text-[#E05638]">{m.recipe.calories || m.recipe.nutrition?.calories || 350}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Protein</span>
                        <span className="text-sm font-black text-emerald-400">{m.recipe.proteinGrams || m.recipe.nutrition?.protein || 18}g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Carbs</span>
                        <span className="text-sm font-black text-white">{m.recipe.carbsGrams || m.recipe.nutrition?.carbs || 40}g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Fat</span>
                        <span className="text-sm font-black text-white">{m.recipe.fatGrams || m.recipe.nutrition?.fat || 10}g</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ingredients</h4>
                      <ul className="text-xs space-y-1 text-slate-300">
                        {m.recipe.ingredients?.map((ing: any, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span><strong>{ing.quantity || ing.amount} {ing.unit || ''}</strong> {ing.item || ing.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instructions</h4>
                      <ol className="text-xs space-y-2 text-slate-300">
                        {m.recipe.instructions?.map((step: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-bold text-[#E05638]">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-3 p-4 bg-[#111726] border border-slate-800 rounded-2xl max-w-xs text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#E05638]" /> Chef Foodie is preparing your recipe...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about recipes, cooking tips, ingredients..."
          className="bg-transparent border-none text-white text-sm px-4 flex-1 outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !prompt.trim()}
          className="bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white p-3 rounded-xl transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* RECIPE PREFERENCES MODAL */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#E05638]">Recipe Preferences</h2>
                <p className="text-xs text-slate-400 mt-0.5">Personalise your cooking experience</p>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#0B101D] border border-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Settings */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
              
              {/* Servings */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Servings</label>
                <div className="flex items-center justify-between bg-[#0B101D] border border-slate-800 rounded-2xl p-3">
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold hover:bg-slate-700 transition"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-white text-sm">{servings} people</span>
                  <button
                    onClick={() => setServings(servings + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold hover:bg-slate-700 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-2xl p-3 text-white outline-none focus:border-[#E05638]"
                >
                  <option value="Singapore">Singapore</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              {/* Tastes Section */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Tastes</label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Anything else about how you like to eat — portion size, flavours you love or avoid, cooking styles. We'll factor these into your recipes.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. prefers larger portions, loves umami..."
                    value={newTasteInput}
                    onChange={(e) => setNewTasteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTasteItem()}
                    className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#E05638]"
                  />
                  <button
                    onClick={addTasteItem}
                    className="bg-[#E05638] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#c94529] transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {tastes.length > 0 && (
                  <div className="p-3 bg-[#0B101D] border border-slate-800 rounded-2xl flex flex-wrap gap-2">
                    {tastes.map((taste) => (
                      <span key={taste} className="bg-[#3D4A32] text-emerald-200 border border-emerald-600/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                        {taste}
                        <button onClick={() => setTastes(tastes.filter(t => t !== taste))} className="text-emerald-400 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Dietary Preferences */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Dietary Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Pescatarian', 'Halal', 'Kosher'].map((diet) => {
                    const active = selectedDiets.includes(diet);
                    return (
                      <button
                        key={diet}
                        onClick={() => toggleItem(selectedDiets, setSelectedDiets, diet)}
                        className={`px-3 py-1.5 rounded-full font-semibold border transition ${
                          active
                            ? 'bg-[#E05638]/20 text-[#E05638] border-[#E05638]/60'
                            : 'bg-[#0B101D] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {diet}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Allergies</label>
                <div className="flex flex-wrap gap-2">
                  {['Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Fish', 'Shellfish', 'Soy', 'Gluten', 'Other'].map((allergy) => {
                    const active = selectedAllergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        onClick={() => toggleItem(selectedAllergies, setSelectedAllergies, allergy)}
                        className={`px-3 py-1.5 rounded-full font-semibold border transition ${
                          active
                            ? 'bg-red-950/80 text-red-400 border-red-500/60'
                            : 'bg-[#0B101D] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ingredients to Avoid */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Ingredients to Avoid</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type an ingredient..."
                    value={newAvoidItem}
                    onChange={(e) => setNewAvoidItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAvoidItem()}
                    className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#E05638]"
                  />
                  <button
                    onClick={addAvoidItem}
                    className="bg-[#E05638] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#c94529] transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {ingredientsToAvoid.length > 0 && (
                  <div className="p-3 bg-[#0B101D] border border-slate-800 rounded-2xl flex flex-wrap gap-2">
                    {ingredientsToAvoid.map((av) => (
                      <span key={av} className="bg-[#4A2E2E] text-red-200 border border-red-600/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                        {av}
                        <button onClick={() => setIngredientsToAvoid(ingredientsToAvoid.filter(i => i !== av))} className="text-red-400 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer Buttons */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={clearAllPreferences}
                className="bg-[#2D1515] border border-red-900/40 text-red-400 font-bold px-4 py-2.5 rounded-xl hover:bg-red-900/40 transition"
              >
                Clear All
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreferences}
                  className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-[#E05638]/20"
                >
                  Save
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
```

## File: `apps/web/src/app/recipe/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, Utensils,
  X, UploadCloud, BookmarkPlus, CalendarPlus, ShoppingCart,
  Timer, Edit3, Share2, Star, Check, Book, ChevronDown,
  Trash2, Save, Plus, ImagePlus, Users, Calendar,
  GripVertical, CheckSquare, CheckCircle2
} from 'lucide-react';
import { getStoredCategories } from '@/lib/categories';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  // Add to Book Dropdown State
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Add to Plan / Calendar Modal State
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState('2026-08-28');
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planTime, setPlanTime] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Edit Mode & Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editForm, setEditForm] = useState<any>({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    imageUrl: '',
    ingredients: [],
    instructions: []
  });

  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // View States & Dynamic Font Scaling
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  const defaultBooks = [
    { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', description: 'Quick and easy meals.' },
    { id: 'book_2', title: 'Authentic Asian Cuisine', description: 'Traditional recipes & stir-fries.' },
    { id: 'book_3', title: 'Baking & Desserts', description: 'Sweet treats & pastries.' }
  ];

  const defaultRecipes = [
    {
      id: 'rec_caesar',
      title: 'Caesar Salad',
      description: 'Classic crisp romaine lettuce tossed with creamy Caesar dressing, crunchy homemade garlic croutons, and shaved Parmigiano-Reggiano.',
      servings: 4,
      prepTimeMinutes: 20,
      cookTimeMinutes: 25,
      tags: ['Main Dish'],
      recipeType: 'Main Dish',
      isFavorite: true,
      isCooked: true,
      rating: 5,
      note: 'Extra shaved parmesan makes all the difference!',
      sourceUrl: '',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      bookId: 'book_3',
      ingredients: [
        { amount: '4', unit: 'cups', item: 'cubed crusty bread', category: 'Bakery' },
        { amount: '1', unit: 'Extra', item: '-virgin olive oil (for drizzling)', category: 'Pantry Staples' },
        { amount: '1', unit: 'Sea', item: 'salt (for sprinkling)', category: 'Pantry Staples' },
        { amount: '1', unit: 'cup', item: 'mayonnaise', category: 'Condiments and Sauces' },
        { amount: '1/4', unit: 'cup', item: 'extra-virgin olive oil', category: 'Pantry Staples' },
        { amount: '2', unit: 'tablespoons', item: 'fresh lemon juice', category: 'Produce' },
        { amount: '2', unit: 'teaspoons', item: 'Dijon mustard', category: 'Condiments and Sauces' },
        { amount: '1', unit: 'garlic', item: 'clove (grated)', category: 'Produce' }
      ],
      instructions: [
        'Preheat oven to 375°F (190°C). Toss cubed bread with olive oil and sea salt, then bake for 10-12 minutes until golden and crisp.',
        'In a small bowl, whisk together mayonnaise, extra-virgin olive oil, fresh lemon juice, Dijon mustard, and grated garlic until smooth and creamy.',
        'In a large salad bowl, toss chopped crisp romaine lettuce with the dressing until evenly coated.',
        'Top generously with warm garlic croutons, freshly shaved Parmesan cheese, and freshly cracked black pepper before serving.'
      ]
    }
  ];

  const loadData = () => {
    setCategories(getStoredCategories());
    try {
      const localRecipes = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      const localBooks = localStorage.getItem('zecratary_recipe_books');

      let parsedRecipes = defaultRecipes;
      if (localRecipes) {
        const parsed = JSON.parse(localRecipes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedRecipes = parsed;
        }
      }
      setRecipes(parsedRecipes);

      let parsedBooks = defaultBooks;
      if (localBooks) {
        const parsed = JSON.parse(localBooks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedBooks = parsed;
        }
      }

      const booksWithCounts = parsedBooks.map((b: any) => ({
        ...b,
        recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
      }));

      setBooks(booksWithCounts);
      localStorage.setItem('zecratary_recipes', JSON.stringify(parsedRecipes));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(parsedRecipes));
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(booksWithCounts));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_categories_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_categories_changed', handleSync);
    };
  }, []);

  const saveAllRecipes = (updatedList: any[]) => {
    setRecipes(updatedList);
    localStorage.setItem('zecratary_recipes', JSON.stringify(updatedList));
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));

    const updatedBooks = books.map((b: any) => ({
      ...b,
      recipeCount: updatedList.filter((r: any) => r.bookId === b.id).length
    }));
    setBooks(updatedBooks);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updatedBooks));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !selectedRecipe.isFavorite });
    }
  };

  const toggleCooked = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isCooked: !r.isCooked } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isCooked: !selectedRecipe.isCooked });
    }
  };

  const handleAssignToBook = (bookId: string) => {
    if (!selectedRecipe) return;
    const isRemoving = selectedRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...selectedRecipe, bookId: targetBookId };
    setSelectedRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === selectedRecipe.id ? updatedRecipe : r);
    saveAllRecipes(updatedList);

    const bookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    if (isRemoving) {
      alert(`Removed "${selectedRecipe.title || selectedRecipe.name}" from "${bookTitle}"`);
    } else {
      alert(`Added "${selectedRecipe.title || selectedRecipe.name}" to "${bookTitle}"!`);
    }
  };

  const openAddToPlanModal = () => {
    setPlanDate('2026-08-28');
    setPlanMealType('Dinner');
    setPlanTime('');
    setPlanNotes('');
    setShowAddToPlanModal(true);
  };

  const handleSaveToCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const currentPlan = localPlan ? JSON.parse(localPlan) : [];

    const newPlanItem = {
      id: 'plan_' + Date.now(),
      date: planDate,
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.title || selectedRecipe.name,
      image: selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      mealType: planMealType,
      time: planTime,
      notes: planNotes,
      isLeftover: false
    };

    localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, newPlanItem]));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    window.dispatchEvent(new Event('storage'));
    setShowAddToPlanModal(false);
    alert(`Successfully scheduled "${selectedRecipe.title || selectedRecipe.name}" in your meal plan!`);
  };

  const updateSelectedRecipeState = (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleDeleteRecipe = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveAllRecipes(updated);
    setSelectedRecipe(null);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (type === 'ingredients') {
      const list = [...editForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, ingredients: list });
      setDraggedIndex(index);
    } else {
      const list = [...editForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, instructions: list });
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const handleOpenEdit = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    setEditForm({
      title: selectedRecipe.title || selectedRecipe.name || '',
      description: selectedRecipe.description || '',
      recipeType: selectedRecipe.recipeType || selectedRecipe.tags?.[0] || 'Main Dish',
      servings: selectedRecipe.servings || 4,
      prepTimeMinutes: selectedRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: selectedRecipe.cookTimeMinutes || 30,
      imageUrl: selectedRecipe.imageUrl || selectedRecipe.image || '',
      ingredients: selectedRecipe.ingredients
        ? selectedRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
          }))
        : [{ amount: '', unit: '', item: '', category: defaultCat }],
      instructions: selectedRecipe.instructions && selectedRecipe.instructions.length > 0
        ? [...selectedRecipe.instructions]
        : ['']
    });
    setEditTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      alert('Please enter a recipe title.');
      setEditTab('info');
      return;
    }

    const updatedRec = {
      ...selectedRecipe,
      ...editForm,
      tags: [editForm.recipeType]
    };

    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditing(false);
  };

  const handleOpenShoppingModal = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    const items = (selectedRecipe.ingredients || []).map((ing: any, idx: number) => ({
      id: 'shop_item_' + idx,
      selected: true,
      amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
      unit: typeof ing === 'string' ? '' : ing.unit || '',
      name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
      category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
    }));
    setShoppingModalIngredients(items);
    setIsShoppingModalOpen(true);
  };

  const handleConfirmAddToShoppingList = () => {
    const selectedItems = shoppingModalIngredients.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert('No ingredients selected.');
      return;
    }
    const local = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const current = local ? JSON.parse(local) : [];
    const formatted = selectedItems.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      name: i.name,
      quantity: i.amount || '1',
      unit: i.unit || 'item',
      category: i.category,
      checked: false
    }));
    const updated = [...formatted, ...current];
    localStorage.setItem('zecratary_shopping', JSON.stringify(updated));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
    setIsShoppingModalOpen(false);
    alert(`Added ${selectedItems.length} items to your Shopping List!`);
  };

  const filtered = recipes.filter(r => {
    const q = search.toLowerCase().trim();
    const title = (r.title || r.name || '').toLowerCase();
    if (q && !title.includes(q)) return false;
    if (activeFilter === 'Favorites') return Boolean(r.isFavorite);
    if (activeFilter === 'Main Dish') return (r.tags?.includes('Main Dish') || r.recipeType === 'Main Dish');
    if (activeFilter === 'Cooked') return Boolean(r.isCooked);
    if (activeFilter === 'Top Rated') return (r.rating || 0) >= 4;
    return true;
  });

  const assignedBook = books.find(b => b.id === selectedRecipe?.bookId);
  const computedFontSize = `${(fontSizeScale / 100) * 0.875}rem`;
  const computedLineHeight = `${(fontSizeScale / 100) * 1.35}rem`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Saved Recipes</h1>
          <p className="text-emerald-400 text-xs mt-1 font-semibold">Your collection of favorite recipes ({recipes.length})</p>
        </div>
        <Link
          href="/manual"
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <UploadCloud className="h-4 w-4" /> Create Recipe
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name or ingredient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638]"
            />
          </div>
          <button className="border border-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 bg-[#070b13] text-emerald-400">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {['All', 'Favorites', 'Main Dish', 'Cooked', 'Top Rated'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full font-semibold border transition ${
                activeFilter === filter
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#070b13] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div className="text-slate-500 text-xs py-12 text-center">Loading recipes...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const cardBook = books.find(b => b.id === r.bookId);
            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRecipe(r);
                  setServingsMultiplier(1);
                  setCompletedSteps([]);
                  setNoteText(r.note || '');
                  setIsBookDropdownOpen(false);
                  setIsEditing(false);
                }}
                className="bg-[#070b13] border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition cursor-pointer group shadow-lg relative"
              >
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  <img
                    src={r.imageUrl || r.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80'}
                    alt={r.title || r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  {/* Top-Right Action Buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => toggleCooked(e, r.id)}
                      className={`p-2 rounded-full backdrop-blur-md transition shadow-md ${
                        r.isCooked 
                          ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white' 
                          : 'bg-black/60 hover:bg-black/80 text-slate-400 hover:text-white'
                      }`}
                      title={r.isCooked ? "Marked as Cooked (Click to undo)" : "Mark as Cooked"}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${r.isCooked ? 'text-white' : 'text-slate-300'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, r.id)}
                      className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:text-[#E05638] transition shadow-md"
                      title="Favorite"
                    >
                      <Heart className={`h-4 w-4 ${r.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
                    </button>
                  </div>

                  {cardBook && (
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-[10px] text-amber-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
                      <Book className="h-3 w-3" /> {cardBook.title}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-white text-base leading-snug">{r.title || r.name}</h3>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {r.tags?.[0] || r.recipeType || 'Main Dish'}
                      </span>

                      {(r.rating || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 shadow-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                          <Star className="h-3 w-3 text-slate-600" /> 0
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 10)}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. RECIPE DETAILS & EDIT MODAL (CLICK OUTSIDE CLOSES) */}
      {selectedRecipe && (
        <div 
          onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditing ? (
                /* RECIPE DETAILS VIEW */
                <div className="space-y-5 pb-6">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                    <img
                      src={selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1000&q=80'}
                      alt={selectedRecipe.title || selectedRecipe.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c111d] via-[#0c111d]/60 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {selectedRecipe.title || selectedRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Cook: {selectedRecipe.cookTimeMinutes || 30} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Prep: {selectedRecipe.prepTimeMinutes || 15} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5 text-slate-300" /> {selectedRecipe.tags?.[0] || selectedRecipe.recipeType || 'Main Dish'}
                        </span>
                        
                        <button
                          onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-[#E05638] shadow"
                        >
                          <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                        className={`w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                          assignedBook
                            ? 'bg-[#E05638]/20 border-[#E05638] text-[#E05638]'
                            : 'border-[#E05638]/60 text-[#E05638] hover:bg-[#E05638]/10'
                        }`}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0 text-[#E05638]" />
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : 'Add to Book'}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5" />
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 flex items-center justify-between">
                              <span>Select Cookbook</span>
                              <Link href="/books" className="text-emerald-400 hover:underline">Manage</Link>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs text-slate-500 px-2.5 py-2">No cookbooks available</div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = selectedRecipe.bookId === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        handleAssignToBook(b.id);
                                        setIsBookDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                                        isAssigned
                                          ? 'bg-[#E05638]/20 text-[#E05638] border border-[#E05638]/30'
                                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                      }`}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 text-[#E05638] shrink-0" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={openAddToPlanModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Plan
                    </button>

                    <button
                      onClick={handleOpenShoppingModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Shopping List
                    </button>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Servings Stepper & Tools */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#E05638] flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Servings
                      </span>
                      <div className="flex items-center bg-[#070b13] border border-slate-800 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-white">
                          {(selectedRecipe.servings || 4) * servingsMultiplier}
                        </span>
                        <button
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Kitchen Timer set for 15 minutes!')}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Timer className="h-3.5 w-3.5" /> Timer
                      </button>
                      <button
                        onClick={handleOpenEdit}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Recipe link copied!');
                        }}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share Recipe
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-5 text-xs text-slate-300 leading-relaxed">
                    {selectedRecipe.description}
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Cooked Status Column */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => updateSelectedRecipeState('isCooked', !selectedRecipe.isCooked)}
                        className="flex items-center gap-2.5 text-base font-extrabold text-white group cursor-pointer select-none transition"
                      >
                        <span className={selectedRecipe.isCooked ? "text-white font-extrabold tracking-tight" : "text-slate-200"}>
                          {selectedRecipe.isCooked ? "Cooked" : "Mark as Cooked"}
                        </span>
                        
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center transition shadow-sm ${
                          selectedRecipe.isCooked 
                            ? 'bg-[#22c55e] text-white' 
                            : 'border border-slate-600 bg-transparent text-transparent'
                        }`}>
                          {selectedRecipe.isCooked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateSelectedRecipeState('rating', star)}
                            className={`h-5 w-5 cursor-pointer transition ${
                              (selectedRecipe.rating || 0) >= star
                                ? 'fill-[#E05638] text-[#E05638]'
                                : 'text-slate-700 hover:text-slate-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="italic">Add a note</span>
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2 animate-in fade-in">
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {selectedRecipe.note && !isNoteOpen && (
                        <p className="text-xs text-emerald-400 italic">Note: "{selectedRecipe.note}"</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* INGREDIENTS & INSTRUCTIONS WITH REAL-TIME FONT RESIZING */}
                  <div className="px-5 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-base font-extrabold text-white">Ingredients</h3>
                      
                      <div className="flex items-center bg-[#070b13] border border-slate-700/80 rounded-lg text-xs overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(prev => Math.max(70, prev - 10))}
                          className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
                          title="Decrease font size"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-bold text-slate-200 border-x border-slate-800 select-none bg-[#0b0e14]">
                          {fontSizeScale}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(prev => Math.min(160, prev + 10))}
                          className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
                          title="Increase font size"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div 
                      className="grid md:grid-cols-2 gap-x-8 gap-y-3 transition-all duration-150"
                      style={{ fontSize: computedFontSize, lineHeight: computedLineHeight }}
                    >
                      {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, idx: number) => {
                        const amt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                        const unit = typeof ing === 'string' ? '' : ing.unit || '';
                        const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        return (
                          <div key={idx} className="flex items-start gap-2.5 py-0.5">
                            <span 
                              className="rounded-full bg-[#E05638] shrink-0" 
                              style={{ 
                                width: `${(fontSizeScale / 100) * 0.45}rem`, 
                                height: `${(fontSizeScale / 100) * 0.45}rem`,
                                marginTop: `${(fontSizeScale / 100) * 0.45}rem`
                              }}
                            />
                            <span className="text-slate-200">
                              {(amt || unit) && (
                                <strong className="text-white font-bold">
                                  {amt} {unit && unit !== 'Unit' ? unit : ''}{' '}
                                </strong>
                              )}
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <h3 className="text-base font-extrabold text-white">Instructions</h3>
                      
                      <div 
                        className="space-y-2.5 transition-all duration-150"
                        style={{ fontSize: computedFontSize, lineHeight: computedLineHeight }}
                      >
                        {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, idx: number) => {
                          const isDone = completedSteps.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (completedSteps.includes(idx)) {
                                  setCompletedSteps(completedSteps.filter(i => i !== idx));
                                } else {
                                  setCompletedSteps([...completedSteps, idx]);
                                }
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                                isDone 
                                  ? 'bg-[#070b13]/50 border-slate-800/60 opacity-50 line-through' 
                                  : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span className="font-extrabold text-[#E05638] shrink-0">{idx + 1}.</span>
                              <span className="text-slate-200 flex-1 leading-relaxed">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Delete Option */}
                  <div className="px-5 flex items-center justify-end text-xs">
                    <button
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="bg-red-950/60 border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-900/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Recipe
                    </button>
                  </div>
                </div>
              ) : (
                /* EDIT RECIPE MODAL */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex bg-[#070b13] p-1.5 rounded-2xl border border-slate-800">
                    {[
                      { id: 'info', label: 'Basic Info' },
                      { id: 'ingredients', label: 'Ingredients' },
                      { id: 'steps', label: 'Steps' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditTab(tab.id as any)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          editTab === tab.id
                            ? 'bg-[#111726] text-white shadow-md border border-slate-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px]">
                          Photo
                        </label>
                        <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#070b13] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                          {editForm.imageUrl ? (
                            <>
                              <img
                                src={editForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span className="bg-[#111726]/90 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <ImagePlus className="h-4 w-4 text-[#E05638]" /> Change Photo
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditForm({ ...editForm, imageUrl: '' });
                                  }}
                                  className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 text-slate-400 mx-auto group-hover:text-[#E05638] transition" />
                              <span className="text-xs font-bold text-slate-300 block">Add a photo</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Recipe Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Recipe Type
                          </label>
                          <select
                            value={editForm.recipeType}
                            onChange={(e) => setEditForm({ ...editForm, recipeType: e.target.value })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          >
                            <option value="Main Dish">Main Dish</option>
                            <option value="Appetizer">Appetizer</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Side Dish">Side Dish</option>
                            <option value="Beverage">Beverage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Servings
                          </label>
                          <input
                            type="number"
                            value={editForm.servings}
                            onChange={(e) => setEditForm({ ...editForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Preparation Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.prepTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Cooking Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.cookTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2 text-xs"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editTab === 'ingredients' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Ingredients</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingIngredients ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingIngredients ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              ingredients: [...editForm.ingredients, { amount: '', unit: '', item: '', category: categories[0] || 'Pantry Staples' }]
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Ingredient
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                            onDrop={handleDrop}
                            className={`flex items-center gap-2 bg-[#0b0f17] p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Amt"
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-700 font-bold outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-700 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none px-2"
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  ingredients: editForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditTab('info')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTab('steps')}
                          className="bg-[#E05638] text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
                        >
                          Next: Steps →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editTab === 'steps' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Step-by-Step Instructions</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingSteps ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingSteps ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              instructions: [...editForm.instructions, '']
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Step
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                            onDrop={handleDrop}
                            className={`flex items-start gap-3 bg-[#0b0f17] p-3 rounded-xl border transition ${
                              isReorderingSteps ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-[#E05638]/20 text-[#E05638] font-bold flex items-center justify-center shrink-0 mt-1">
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={`Describe step ${idx + 1}...`}
                              value={step}
                              onChange={(e) => {
                                const list = [...editForm.instructions];
                                list[idx] = e.target.value;
                                setEditForm({ ...editForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none resize-y"
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  instructions: editForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-slate-500 hover:text-red-400 h-fit"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditTab('ingredients')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="bg-[#E05638] text-white font-bold px-8 py-2.5 rounded-xl text-xs hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD TO PLAN / CALENDAR MODAL (CLICK OUTSIDE CLOSES) */}
      {showAddToPlanModal && selectedRecipe && (
        <div 
          onClick={() => setShowAddToPlanModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1115] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddToPlanModal(false)} 
              className="absolute top-4 right-4 p-2 bg-[#1e2430] hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-6 space-y-1">
              <h2 className="text-xl font-black text-[#E05638] tracking-tight">Add to Calendar</h2>
              <p className="text-xs text-slate-400 leading-snug">
                Schedule {selectedRecipe.title || selectedRecipe.name} in your meal plan
              </p>
            </div>

            <form onSubmit={handleSaveToCalendar} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="relative flex items-center">
                  <Calendar className="h-4 w-4 text-[#E05638] absolute left-3.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#E05638] font-semibold outline-none focus:border-[#E05638] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative flex items-center">
                  <select
                    value={planMealType}
                    onChange={(e) => setPlanMealType(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638] cursor-pointer appearance-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="time"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl px-10 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638]"
                    placeholder="--:-- --"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Add any notes or reminders..."
                  rows={3}
                  className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-[#E05638] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-emerald-900/80 hover:bg-emerald-950/20 text-[#E05638] font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SHOPPING LIST MODAL (CLICK OUTSIDE CLOSES) */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#E05638]" /> Add to Shopping List
                </h3>
                <p className="text-xs text-slate-400">Select or edit items to add directly to your list</p>
              </div>
              <button onClick={() => setIsShoppingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {shoppingModalIngredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2 bg-[#070b13] p-2.5 rounded-xl border border-slate-800">
                  <div
                    onClick={() => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].selected = !updated[idx].selected;
                      setShoppingModalIngredients(updated);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                      ing.selected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                  </div>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].amount = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white font-bold outline-none"
                    placeholder="Amt"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].unit = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 outline-none"
                    placeholder="Unit"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].name = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="flex-1 bg-transparent border-none text-white outline-none px-2"
                    placeholder="Ingredient name..."
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].category = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add Selected to List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

## File: `apps/web/src/app/add-user/page.tsx`
```typescript
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, Check,
  ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Users
} from 'lucide-react';
import { getCurrentUser, logoutUser, initAuthStorage } from '@/lib/auth';

interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

type SortField = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function AdminUserManagementPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Admin Table Sorting & Pagination State
  const [adminSortField, setAdminSortField] = useState<SortField>('createdAt');
  const [adminSortOrder, setAdminSortOrder] = useState<SortOrder>('desc');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  // Standard User Table Sorting & Pagination State
  const [userSortField, setUserSortField] = useState<SortField>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<SortOrder>('desc');
  const [userCurrentPage, setUserCurrentPage] = useState(1);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'user'>('user');
  const [addError, setAddError] = useState('');

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editError, setEditError] = useState('');

  const loadUsers = () => {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        setUsers(JSON.parse(raw));
      } catch (e) {}
    }
  };

  useEffect(() => {
    document.title = 'User Management - Admin Console';
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();

    const handleSync = () => loadUsers();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, []);

  const saveUsersList = (updated: AppUser[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // --- SORT TOGGLES ---
  const handleAdminSort = (field: SortField) => {
    if (adminSortField === field) {
      setAdminSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortField(field);
      setAdminSortOrder('asc');
    }
  };

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  // --- FILTER & SORT FOR ADMINS ---
  const processedAdmins = useMemo(() => {
    const admins = users.filter(u => u.role === 'admin');
    const filtered = admins.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (adminSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (adminSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return adminSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, adminSortField, adminSortOrder]);

  // --- FILTER & SORT FOR STANDARD USERS ---
  const processedStandardUsers = useMemo(() => {
    const standardUsers = users.filter(u => u.role === 'user');
    const filtered = standardUsers.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (userSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (userSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return userSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, userSortField, userSortOrder]);

  // Pagination Calculations: Admins
  const adminTotalPages = Math.max(1, Math.ceil(processedAdmins.length / ITEMS_PER_PAGE));
  const adminStartIndex = (adminCurrentPage - 1) * ITEMS_PER_PAGE;
  const adminEndIndex = Math.min(adminStartIndex + ITEMS_PER_PAGE, processedAdmins.length);
  const paginatedAdmins = processedAdmins.slice(adminStartIndex, adminEndIndex);

  // Pagination Calculations: Users
  const userTotalPages = Math.max(1, Math.ceil(processedStandardUsers.length / ITEMS_PER_PAGE));
  const userStartIndex = (userCurrentPage - 1) * ITEMS_PER_PAGE;
  const userEndIndex = Math.min(userStartIndex + ITEMS_PER_PAGE, processedStandardUsers.length);
  const paginatedStandardUsers = processedStandardUsers.slice(userStartIndex, userEndIndex);

  useEffect(() => {
    setAdminCurrentPage(1);
    setUserCurrentPage(1);
  }, [search]);

  // --- ADD USER ---
  const handleOpenAddModal = (presetRole: 'admin' | 'user' = 'user') => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole(presetRole);
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError('Please fill in all required fields.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      setAddError('A user with this email address already exists.');
      return;
    }

    if (addPassword.length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`User "${newUser.name}" created as ${newUser.role.toUpperCase()}!`);
  };

  // --- EDIT USER ---
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setEditError('');

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanName = editName.trim();

    if (!cleanName || !cleanEmail) {
      setEditError('Name and Email cannot be empty.');
      return;
    }

    const emailTaken = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setEditError('Another user is already registered with this email.');
      return;
    }

    const updated = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: cleanName,
          email: cleanEmail,
          password: editPassword ? editPassword : u.password,
          role: editRole
        };
      }
      return u;
    });

    saveUsersList(updated);

    if (currentUser?.id === editingUserId) {
      const activeUserUpdated = {
        ...currentUser,
        name: cleanName,
        email: cleanEmail,
        role: editRole
      };
      localStorage.setItem('zecratary_current_user', JSON.stringify(activeUserUpdated));
      setCurrentUser(activeUserUpdated);
      window.dispatchEvent(new Event('zecratary_auth_changed'));
    }

    setShowEditModal(false);
    showToast(`User "${cleanName}" updated successfully!`);
  };

  // --- DELETE USER ---
  const handleDeleteUser = (id: string, userEmail: string, userName: string) => {
    if (currentUser?.email === userEmail || currentUser?.id === id) {
      alert('You cannot delete your own active admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${userName}" (${userEmail})? This action cannot be undone.`)) return;

    const updated = users.filter(u => u.id !== id);
    saveUsersList(updated);
    showToast(`User "${userName}" has been deleted.`);
  };

  const renderSortIcon = (currentField: SortField, targetField: SortField, order: SortOrder) => {
    if (currentField !== targetField) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#E05638] stroke-[2.5]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#E05638] stroke-[2.5]" />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-slate-100 pb-24 px-2 sm:px-4 pt-2">
      
      {/* ACCESS WARNING FOR NON-ADMINS */}
      {currentUser && currentUser.role !== 'admin' && (
        <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>. Switch to an admin account to manage full user access permissions.
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 bg-[#E05638] text-white font-bold rounded-xl shrink-0 ml-3 cursor-pointer"
          >
            Switch to Admin
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/60 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-8 w-8 text-[#E05638]" /> User Management
          </h1>
          <p className="text-sm font-semibold text-emerald-400">
            Dedicated account control tables for Administrators ({users.filter(u => u.role === 'admin').length}) and Standard Users ({users.filter(u => u.role === 'user').length})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAddModal('user')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
          <Link
            href="/admin"
            className="bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Shield className="h-4 w-4 text-emerald-400" /> Admin Settings
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or email across all tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#070b13] border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition shadow-inner"
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 1: ADMINISTRATORS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Administrators
                <span className="text-xs bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {processedAdmins.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('admin')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Admin
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Admin User</span>
                      {renderSortIcon(adminSortField, 'name', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role Badge</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(adminSortField, 'createdAt', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No administrators found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-xs font-black text-emerald-400 shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-emerald-950/60 border-emerald-500/60 text-emerald-400 flex items-center gap-1 w-fit">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm cursor-pointer"
                              title="Edit Admin Account"
                            >
                              <Edit3 className="h-4 w-4 text-[#E05638]" />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800 cursor-pointer'
                              }`}
                              title={isCurrent ? 'Cannot delete active session account' : 'Delete Admin'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Admin Pagination */}
          {processedAdmins.length > ITEMS_PER_PAGE && (
            <div className="px-5 py-3.5 bg-[#070b13] border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing {adminStartIndex + 1} to {adminEndIndex} of {processedAdmins.length} admins
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white px-2">Page {adminCurrentPage} of {adminTotalPages}</span>
                <button
                  type="button"
                  disabled={adminCurrentPage >= adminTotalPages}
                  onClick={() => setAdminCurrentPage(p => Math.min(adminTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 2: STANDARD USERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-600/40 flex items-center justify-center text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Standard Users
                <span className="text-xs bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  {processedStandardUsers.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('user')}
            className="text-xs font-bold text-[#E05638] hover:underline transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Standard User
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Standard User</span>
                      {renderSortIcon(userSortField, 'name', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role Badge</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(userSortField, 'createdAt', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedStandardUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No standard users found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedStandardUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#111726] border border-slate-700 flex items-center justify-center text-xs font-black text-[#E05638] shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-slate-800 border-slate-700 text-slate-300 flex items-center gap-1 w-fit">
                            <UserIcon className="h-3 w-3 text-slate-400" /> Standard User
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit3 className="h-4 w-4 text-[#E05638]" />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800 cursor-pointer'
                              }`}
                              title={isCurrent ? 'Cannot delete active account' : 'Delete User'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Standard User Pagination */}
          <div className="px-5 py-4 bg-[#070b13] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400">
              {processedStandardUsers.length === 0 ? (
                'Showing 0 standard users'
              ) : (
                <>
                  Showing <span className="font-bold text-white">{userStartIndex + 1}</span> to{' '}
                  <span className="font-bold text-white">{userEndIndex}</span> of{' '}
                  <span className="font-bold text-white">{processedStandardUsers.length}</span> standard users
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage <= 1
                    ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                    : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17] cursor-pointer'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setUserCurrentPage(pageNum)}
                  className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                    userCurrentPage === pageNum
                      ? 'bg-[#E05638] text-white border-[#E05638] shadow-md shadow-[#E05638]/20'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={userCurrentPage >= userTotalPages}
                onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage >= userTotalPages
                    ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                    : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17] cursor-pointer'
                }`}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ADD USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Add New User
              </h2>
              <p className="text-slate-400 text-xs">Create a new user account with role permissions.</p>
            </div>

            {addError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Smith"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 4 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'user'}
                      onChange={() => setAddRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setAddRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'admin'}
                      onChange={() => setAddRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EDIT USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <Edit3 className="h-5 w-5" /> Edit User Account
              </h2>
              <p className="text-slate-400 text-xs">Update account name, email address, password, or role.</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Change Password (leave blank to keep current)</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Enter new password..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setEditRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'user'}
                      onChange={() => setEditRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setEditRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'admin'}
                      onChange={() => setEditRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

```

## File: `apps/web/src/app/admin/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, Key, Save } from 'lucide-react';

export default function AdminEnginePage() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638] flex items-center gap-3">
          <Cpu className="h-8 w-8 text-[#E05638]" /> AI Engine & Inference Control
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Switch runtime AI models dynamically between Google Gemini and OpenAI with live key injection.
        </p>
      </div>

      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setProvider('gemini')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between ${
              provider === 'gemini' ? 'border-[#E05638] bg-[#E05638]/10' : 'border-slate-800'
            }`}
          >
            <div>
              <span className="font-bold text-white block">Google Gemini</span>
              <span className="text-xs text-slate-400">Gemini 1.5 Pro / Flash</span>
            </div>
            {provider === 'gemini' && <CheckCircle2 className="h-5 w-5 text-[#E05638]" />}
          </button>

          <button
            onClick={() => setProvider('openai')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between ${
              provider === 'openai' ? 'border-[#E05638] bg-[#E05638]/10' : 'border-slate-800'
            }`}
          >
            <div>
              <span className="font-bold text-white block">OpenAI</span>
              <span className="text-xs text-slate-400">GPT-4o / GPT-4o-mini</span>
            </div>
            {provider === 'openai' && <CheckCircle2 className="h-5 w-5 text-[#E05638]" />}
          </button>
        </div>

        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2"
        >
          <Save className="h-4 w-4" /> {saved ? 'Configuration Saved!' : 'Save Engine Settings'}
        </button>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/admin/plans/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import { PlusCircle, PackageCheck, Zap, Trash2, Sparkles, AlertCircle } from 'lucide-react';

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [form, setForm] = useState({
    name: 'Free Taster',
    slug: 'free-taster',
    description: 'Complimentary kitchen access with basic recipe quotas.',
    priceDollars: 0,
    interval: 'MONTH',
    aiRecipeLimit: 10,
    recipeLibraryLimit: 30,
    socialScrapeLimit: 5,
    canViewMacros: true,
    allowedAiModels: 'gemini-1.5-flash,gpt-4o-mini',
  });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (e) {
      console.error('Could not fetch plans:', e);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          priceCents: isFree ? 0 : Math.round(Number(form.priceDollars) * 100),
          isFree,
          allowedAiModels: form.allowedAiModels.split(',').map((m) => m.trim()),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: `Package "${data.plan.name}" saved successfully!` });
        fetchPlans();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save package.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Network error saving plan.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    setDeletingId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/plans?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: `Package "${name}" deleted.` });
        fetchPlans();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to delete package.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Network error deleting plan.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638] flex items-center gap-2">
          <Zap className="h-8 w-8 text-[#E05638]" /> Subscription Package Creator
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Create, customize quotas, and delete subscription tiers in real time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Creation Form */}
        <form onSubmit={handleCreatePlan} className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-4 md:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <PlusCircle className="h-5 w-5 text-emerald-400" /> New Package
            </h2>
            <button
              type="button"
              onClick={() => setIsFree(!isFree)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${
                isFree
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isFree ? '⚡ Free (No Stripe)' : '💳 Stripe Paid'}
            </button>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{feedback.msg}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Plan Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })
              }
              placeholder="e.g. Free Starter"
              className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-sm mt-1 text-white focus:outline-none focus:border-[#E05638]"
            />
          </div>

          {!isFree ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Price (USD $)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.priceDollars}
                  onChange={(e) => setForm({ ...form, priceDollars: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-sm mt-1 text-white focus:outline-none focus:border-[#E05638]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Interval</label>
                <select
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-sm mt-1 text-white focus:outline-none focus:border-[#E05638]"
                >
                  <option value="MONTH">Monthly</option>
                  <option value="YEAR">Annual</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              🌱 <strong>Zero-Cost Package:</strong> Bypasses Stripe checkout.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-slate-400 font-semibold">AI Quota</label>
              <input
                type="number"
                value={form.aiRecipeLimit}
                onChange={(e) => setForm({ ...form, aiRecipeLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0B101D] border border-slate-700 rounded-lg p-2 mt-1 text-white"
              />
              <span className="text-[10px] text-slate-500">-1 = Unlimited</span>
            </div>
            <div>
              <label className="text-slate-400 font-semibold">Saved Max</label>
              <input
                type="number"
                value={form.recipeLibraryLimit}
                onChange={(e) => setForm({ ...form, recipeLibraryLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0B101D] border border-slate-700 rounded-lg p-2 mt-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold">Scrapes</label>
              <input
                type="number"
                value={form.socialScrapeLimit}
                onChange={(e) => setForm({ ...form, socialScrapeLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0B101D] border border-slate-700 rounded-lg p-2 mt-1 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Allowed AI Models</label>
            <input
              type="text"
              value={form.allowedAiModels}
              onChange={(e) => setForm({ ...form, allowedAiModels: e.target.value })}
              className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-xs mt-1 text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="macros"
              checked={form.canViewMacros}
              onChange={(e) => setForm({ ...form, canViewMacros: e.target.checked })}
              className="rounded bg-slate-800 text-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="macros" className="text-xs text-slate-300 cursor-pointer">
              Unlock Full Macro Nutrition Breakdown
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-xs shadow-lg shadow-[#E05638]/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Saving Package...' : isFree ? 'Publish Free Package' : 'Save & Sync Package'}
          </button>
        </form>

        {/* Active Packages List */}
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl md:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <PackageCheck className="h-5 w-5 text-emerald-400" /> Active System Packages ({plans.length})
          </h2>

          <div className="space-y-3">
            {plans.length === 0 ? (
              <div className="text-slate-500 text-xs py-8 text-center bg-[#0B101D] rounded-xl border border-slate-800">
                No subscription packages in database.
              </div>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-[#0B101D] border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      {p.priceCents === 0 ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          FREE
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#E05638]/20 text-[#E05638] border border-[#E05638]/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          ${(p.priceCents / 100).toFixed(2)} / {p.interval}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.aiRecipeLimit === -1 ? 'Unlimited' : p.aiRecipeLimit} AI recipes • {p.recipeLibraryLimit} saved max • {p.canViewMacros ? 'Macros unlocked' : 'Calories only'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs hidden sm:block">
                      <span className="text-[11px] font-mono text-slate-500">
                        {p.stripePriceId === 'free_price' ? 'No Stripe Sync' : p.stripePriceId || 'Manual'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      onClick={() => handleDeletePlan(p.id, p.name)}
                      className="p-2.5 bg-red-950/40 border border-red-500/20 hover:bg-red-900/50 text-red-400 rounded-xl transition disabled:opacity-50"
                      title="Delete Package"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/admin/add-user/page.tsx`
```typescript
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, Check,
  ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Users
} from 'lucide-react';
import { getCurrentUser, logoutUser, initAuthStorage } from '@/lib/auth';

interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

type SortField = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function AdminUserManagementPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Admin Table Sorting & Pagination State
  const [adminSortField, setAdminSortField] = useState<SortField>('createdAt');
  const [adminSortOrder, setAdminSortOrder] = useState<SortOrder>('desc');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  // Standard User Table Sorting & Pagination State
  const [userSortField, setUserSortField] = useState<SortField>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<SortOrder>('desc');
  const [userCurrentPage, setUserCurrentPage] = useState(1);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'user'>('user');
  const [addError, setAddError] = useState('');

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editError, setEditError] = useState('');

  const loadUsers = () => {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        setUsers(JSON.parse(raw));
      } catch (e) {}
    }
  };

  useEffect(() => {
    document.title = 'User Management - Admin Console';
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();

    const handleSync = () => loadUsers();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, []);

  const saveUsersList = (updated: AppUser[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // --- SORT TOGGLES ---
  const handleAdminSort = (field: SortField) => {
    if (adminSortField === field) {
      setAdminSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortField(field);
      setAdminSortOrder('asc');
    }
  };

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  // --- FILTER & SORT FOR ADMINS ---
  const processedAdmins = useMemo(() => {
    const admins = users.filter(u => u.role === 'admin');
    const filtered = admins.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (adminSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (adminSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return adminSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, adminSortField, adminSortOrder]);

  // --- FILTER & SORT FOR STANDARD USERS ---
  const processedStandardUsers = useMemo(() => {
    const standardUsers = users.filter(u => u.role === 'user');
    const filtered = standardUsers.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (userSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (userSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return userSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, userSortField, userSortOrder]);

  // Pagination Calculations: Admins
  const adminTotalPages = Math.max(1, Math.ceil(processedAdmins.length / ITEMS_PER_PAGE));
  const adminStartIndex = (adminCurrentPage - 1) * ITEMS_PER_PAGE;
  const adminEndIndex = Math.min(adminStartIndex + ITEMS_PER_PAGE, processedAdmins.length);
  const paginatedAdmins = processedAdmins.slice(adminStartIndex, adminEndIndex);

  // Pagination Calculations: Users
  const userTotalPages = Math.max(1, Math.ceil(processedStandardUsers.length / ITEMS_PER_PAGE));
  const userStartIndex = (userCurrentPage - 1) * ITEMS_PER_PAGE;
  const userEndIndex = Math.min(userStartIndex + ITEMS_PER_PAGE, processedStandardUsers.length);
  const paginatedStandardUsers = processedStandardUsers.slice(userStartIndex, userEndIndex);

  useEffect(() => {
    setAdminCurrentPage(1);
    setUserCurrentPage(1);
  }, [search]);

  // --- ADD USER ---
  const handleOpenAddModal = (presetRole: 'admin' | 'user' = 'user') => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole(presetRole);
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError('Please fill in all required fields.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      setAddError('A user with this email address already exists.');
      return;
    }

    if (addPassword.length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`User "${newUser.name}" created as ${newUser.role.toUpperCase()}!`);
  };

  // --- EDIT USER ---
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setEditError('');

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanName = editName.trim();

    if (!cleanName || !cleanEmail) {
      setEditError('Name and Email cannot be empty.');
      return;
    }

    const emailTaken = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setEditError('Another user is already registered with this email.');
      return;
    }

    const updated = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: cleanName,
          email: cleanEmail,
          password: editPassword ? editPassword : u.password,
          role: editRole
        };
      }
      return u;
    });

    saveUsersList(updated);

    if (currentUser?.id === editingUserId) {
      const activeUserUpdated = {
        ...currentUser,
        name: cleanName,
        email: cleanEmail,
        role: editRole
      };
      localStorage.setItem('zecratary_current_user', JSON.stringify(activeUserUpdated));
      setCurrentUser(activeUserUpdated);
      window.dispatchEvent(new Event('zecratary_auth_changed'));
    }

    setShowEditModal(false);
    showToast(`User "${cleanName}" updated successfully!`);
  };

  // --- DELETE USER ---
  const handleDeleteUser = (id: string, userEmail: string, userName: string) => {
    if (currentUser?.email === userEmail || currentUser?.id === id) {
      alert('You cannot delete your own active admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${userName}" (${userEmail})? This action cannot be undone.`)) return;

    const updated = users.filter(u => u.id !== id);
    saveUsersList(updated);
    showToast(`User "${userName}" has been deleted.`);
  };

  const renderSortIcon = (currentField: SortField, targetField: SortField, order: SortOrder) => {
    if (currentField !== targetField) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#E05638] stroke-[2.5]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#E05638] stroke-[2.5]" />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-slate-100 pb-24 px-2 sm:px-4 pt-2">
      
      {/* ACCESS WARNING FOR NON-ADMINS */}
      {currentUser && currentUser.role !== 'admin' && (
        <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>. Switch to an admin account to manage full user access permissions.
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 bg-[#E05638] text-white font-bold rounded-xl shrink-0 ml-3 cursor-pointer"
          >
            Switch to Admin
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/60 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-8 w-8 text-[#E05638]" /> User Management
          </h1>
          <p className="text-sm font-semibold text-emerald-400">
            Dedicated account control tables for Administrators ({users.filter(u => u.role === 'admin').length}) and Standard Users ({users.filter(u => u.role === 'user').length})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAddModal('user')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
          <Link
            href="/admin"
            className="bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Shield className="h-4 w-4 text-emerald-400" /> Admin Settings
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or email across all tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#070b13] border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition shadow-inner"
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 1: ADMINISTRATORS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Administrators
                <span className="text-xs bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {processedAdmins.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('admin')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Admin
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Admin User</span>
                      {renderSortIcon(adminSortField, 'name', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role Badge</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(adminSortField, 'createdAt', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No administrators found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-xs font-black text-emerald-400 shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-emerald-950/60 border-emerald-500/60 text-emerald-400 flex items-center gap-1 w-fit">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm cursor-pointer"
                              title="Edit Admin Account"
                            >
                              <Edit3 className="h-4 w-4 text-[#E05638]" />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800 cursor-pointer'
                              }`}
                              title={isCurrent ? 'Cannot delete active session account' : 'Delete Admin'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Admin Pagination */}
          {processedAdmins.length > ITEMS_PER_PAGE && (
            <div className="px-5 py-3.5 bg-[#070b13] border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing {adminStartIndex + 1} to {adminEndIndex} of {processedAdmins.length} admins
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white px-2">Page {adminCurrentPage} of {adminTotalPages}</span>
                <button
                  type="button"
                  disabled={adminCurrentPage >= adminTotalPages}
                  onClick={() => setAdminCurrentPage(p => Math.min(adminTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 2: STANDARD USERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-600/40 flex items-center justify-center text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Standard Users
                <span className="text-xs bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  {processedStandardUsers.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('user')}
            className="text-xs font-bold text-[#E05638] hover:underline transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Standard User
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Standard User</span>
                      {renderSortIcon(userSortField, 'name', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role Badge</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(userSortField, 'createdAt', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedStandardUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No standard users found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedStandardUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#111726] border border-slate-700 flex items-center justify-center text-xs font-black text-[#E05638] shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-slate-800 border-slate-700 text-slate-300 flex items-center gap-1 w-fit">
                            <UserIcon className="h-3 w-3 text-slate-400" /> Standard User
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit3 className="h-4 w-4 text-[#E05638]" />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800 cursor-pointer'
                              }`}
                              title={isCurrent ? 'Cannot delete active account' : 'Delete User'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Standard User Pagination */}
          <div className="px-5 py-4 bg-[#070b13] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400">
              {processedStandardUsers.length === 0 ? (
                'Showing 0 standard users'
              ) : (
                <>
                  Showing <span className="font-bold text-white">{userStartIndex + 1}</span> to{' '}
                  <span className="font-bold text-white">{userEndIndex}</span> of{' '}
                  <span className="font-bold text-white">{processedStandardUsers.length}</span> standard users
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage <= 1
                    ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                    : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17] cursor-pointer'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setUserCurrentPage(pageNum)}
                  className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                    userCurrentPage === pageNum
                      ? 'bg-[#E05638] text-white border-[#E05638] shadow-md shadow-[#E05638]/20'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={userCurrentPage >= userTotalPages}
                onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage >= userTotalPages
                    ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                    : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17] cursor-pointer'
                }`}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ADD USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Add New User
              </h2>
              <p className="text-slate-400 text-xs">Create a new user account with role permissions.</p>
            </div>

            {addError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Smith"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 4 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'user'}
                      onChange={() => setAddRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setAddRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'admin'}
                      onChange={() => setAddRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EDIT USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <Edit3 className="h-5 w-5" /> Edit User Account
              </h2>
              <p className="text-slate-400 text-xs">Update account name, email address, password, or role.</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Change Password (leave blank to keep current)</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Enter new password..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setEditRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'user'}
                      onChange={() => setEditRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setEditRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'admin'}
                      onChange={() => setEditRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

```

## File: `apps/web/src/app/admin/users/page.tsx`
```typescript
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, UserPlus, Trash2, Edit3, Mail, User as UserIcon, Lock, 
  Search, CheckCircle, AlertCircle, X, ShieldAlert, Check,
  ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Users
} from 'lucide-react';
import { getCurrentUser, logoutUser, initAuthStorage } from '@/lib/auth';

interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

type SortField = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function AdminUserManagementPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Admin Table Sorting & Pagination State
  const [adminSortField, setAdminSortField] = useState<SortField>('createdAt');
  const [adminSortOrder, setAdminSortOrder] = useState<SortOrder>('desc');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  // Standard User Table Sorting & Pagination State
  const [userSortField, setUserSortField] = useState<SortField>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<SortOrder>('desc');
  const [userCurrentPage, setUserCurrentPage] = useState(1);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'user'>('user');
  const [addError, setAddError] = useState('');

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editError, setEditError] = useState('');

  const loadUsers = () => {
    initAuthStorage();
    const raw = localStorage.getItem('zecratary_users');
    if (raw) {
      try {
        setUsers(JSON.parse(raw));
      } catch (e) {}
    }
  };

  useEffect(() => {
    document.title = 'User Management - Admin Console';
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadUsers();

    const handleSync = () => loadUsers();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, []);

  const saveUsersList = (updated: AppUser[]) => {
    setUsers(updated);
    localStorage.setItem('zecratary_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // --- SORT TOGGLES ---
  const handleAdminSort = (field: SortField) => {
    if (adminSortField === field) {
      setAdminSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortField(field);
      setAdminSortOrder('asc');
    }
  };

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  // --- FILTER & SORT FOR ADMINS ---
  const processedAdmins = useMemo(() => {
    const admins = users.filter(u => u.role === 'admin');
    const filtered = admins.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (adminSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (adminSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return adminSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, adminSortField, adminSortOrder]);

  // --- FILTER & SORT FOR STANDARD USERS ---
  const processedStandardUsers = useMemo(() => {
    const standardUsers = users.filter(u => u.role === 'user');
    const filtered = standardUsers.filter(u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.email.toLowerCase().includes(search.toLowerCase().trim())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (userSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (userSortField === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return userSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [users, search, userSortField, userSortOrder]);

  // Pagination Calculations: Admins
  const adminTotalPages = Math.max(1, Math.ceil(processedAdmins.length / ITEMS_PER_PAGE));
  const adminStartIndex = (adminCurrentPage - 1) * ITEMS_PER_PAGE;
  const adminEndIndex = Math.min(adminStartIndex + ITEMS_PER_PAGE, processedAdmins.length);
  const paginatedAdmins = processedAdmins.slice(adminStartIndex, adminEndIndex);

  // Pagination Calculations: Users
  const userTotalPages = Math.max(1, Math.ceil(processedStandardUsers.length / ITEMS_PER_PAGE));
  const userStartIndex = (userCurrentPage - 1) * ITEMS_PER_PAGE;
  const userEndIndex = Math.min(userStartIndex + ITEMS_PER_PAGE, processedStandardUsers.length);
  const paginatedStandardUsers = processedStandardUsers.slice(userStartIndex, userEndIndex);

  useEffect(() => {
    setAdminCurrentPage(1);
    setUserCurrentPage(1);
  }, [search]);

  // --- ADD USER ---
  const handleOpenAddModal = (presetRole: 'admin' | 'user' = 'user') => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole(presetRole);
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanName || !cleanEmail) {
      setAddError('Please fill in all required fields.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      setAddError('A user with this email address already exists.');
      return;
    }

    if (addPassword.length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    const newUser: AppUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      email: cleanEmail,
      password: addPassword,
      role: addRole,
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    saveUsersList(updated);
    setShowAddModal(false);
    showToast(`User "${newUser.name}" created as ${newUser.role.toUpperCase()}!`);
  };

  // --- EDIT USER ---
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setEditError('');

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanName = editName.trim();

    if (!cleanName || !cleanEmail) {
      setEditError('Name and Email cannot be empty.');
      return;
    }

    const emailTaken = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setEditError('Another user is already registered with this email.');
      return;
    }

    const updated = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: cleanName,
          email: cleanEmail,
          password: editPassword ? editPassword : u.password,
          role: editRole
        };
      }
      return u;
    });

    saveUsersList(updated);

    if (currentUser?.id === editingUserId) {
      const activeUserUpdated = {
        ...currentUser,
        name: cleanName,
        email: cleanEmail,
        role: editRole
      };
      localStorage.setItem('zecratary_current_user', JSON.stringify(activeUserUpdated));
      setCurrentUser(activeUserUpdated);
      window.dispatchEvent(new Event('zecratary_auth_changed'));
    }

    setShowEditModal(false);
    showToast(`User "${cleanName}" updated successfully!`);
  };

  // --- DELETE USER ---
  const handleDeleteUser = (id: string, userEmail: string, userName: string) => {
    if (currentUser?.email === userEmail || currentUser?.id === id) {
      alert('You cannot delete your own active admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${userName}" (${userEmail})? This action cannot be undone.`)) return;

    const updated = users.filter(u => u.id !== id);
    saveUsersList(updated);
    showToast(`User "${userName}" has been deleted.`);
  };

  const renderSortIcon = (currentField: SortField, targetField: SortField, order: SortOrder) => {
    if (currentField !== targetField) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#E05638] stroke-[2.5]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#E05638] stroke-[2.5]" />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-slate-100 pb-24 px-2 sm:px-4 pt-2">
      
      {/* ACCESS WARNING FOR NON-ADMINS */}
      {currentUser && currentUser.role !== 'admin' && (
        <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>. Switch to an admin account to manage full user access permissions.
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-3.5 py-1.5 bg-[#E05638] text-white font-bold rounded-xl shrink-0 ml-3 cursor-pointer"
          >
            Switch to Admin
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/60 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-8 w-8 text-[#E05638]" /> User Management
          </h1>
          <p className="text-sm font-semibold text-emerald-400">
            Dedicated account control tables for Administrators ({users.filter(u => u.role === 'admin').length}) and Standard Users ({users.filter(u => u.role === 'user').length})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAddModal('user')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
          <Link
            href="/admin"
            className="bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Shield className="h-4 w-4 text-emerald-400" /> Admin Settings
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or email across all tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#070b13] border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition shadow-inner"
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 1: ADMINISTRATORS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Administrators
                <span className="text-xs bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {processedAdmins.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('admin')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Admin
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Admin User</span>
                      {renderSortIcon(adminSortField, 'name', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role Badge</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleAdminSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(adminSortField, 'createdAt', adminSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No administrators found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-xs font-black text-emerald-400 shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-emerald-950/60 border-emerald-500/60 text-emerald-400 flex items-center gap-1 w-fit">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm cursor-pointer"
                              title="Edit Admin Account"
                            >
                              <Edit3 className="h-4 w-4 text-[#E05638]" />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800 cursor-pointer'
                              }`}
                              title={isCurrent ? 'Cannot delete active session account' : 'Delete Admin'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Admin Pagination */}
          {processedAdmins.length > ITEMS_PER_PAGE && (
            <div className="px-5 py-3.5 bg-[#070b13] border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing {adminStartIndex + 1} to {adminEndIndex} of {processedAdmins.length} admins
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white px-2">Page {adminCurrentPage} of {adminTotalPages}</span>
                <button
                  type="button"
                  disabled={adminCurrentPage >= adminTotalPages}
                  onClick={() => setAdminCurrentPage(p => Math.min(adminTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLE 2: STANDARD USERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-600/40 flex items-center justify-center text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Standard Users
                <span className="text-xs bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  {processedStandardUsers.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddModal('user')}
            className="text-xs font-bold text-[#E05638] hover:underline transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Standard User
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070b13] border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Standard User</span>
                      {renderSortIcon(userSortField, 'name', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Role Badge</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleUserSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer select-none font-bold uppercase tracking-wider"
                    >
                      <span>Created Date</span>
                      {renderSortIcon(userSortField, 'createdAt', userSortOrder)}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedStandardUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No standard users found {search ? `matching "${search}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedStandardUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#111726] border border-slate-700 flex items-center justify-center text-xs font-black text-[#E05638] shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{user.name}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-slate-800 border-slate-700 text-slate-300 flex items-center gap-1 w-fit">
                            <UserIcon className="h-3 w-3 text-slate-400" /> Standard User
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Active'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 text-slate-300 hover:text-white bg-[#070b13] hover:bg-slate-800 rounded-xl border border-slate-800 transition shadow-sm cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit3 className="h-4 w-4 text-[#E05638]" />
                            </button>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => handleDeleteUser(user.id, user.email, user.name)}
                              className={`p-2 rounded-xl border transition shadow-sm ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-[#070b13] text-slate-600'
                                  : 'text-slate-400 hover:text-red-400 bg-[#070b13] hover:bg-red-950/30 border-slate-800 cursor-pointer'
                              }`}
                              title={isCurrent ? 'Cannot delete active account' : 'Delete User'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Standard User Pagination */}
          <div className="px-5 py-4 bg-[#070b13] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400">
              {processedStandardUsers.length === 0 ? (
                'Showing 0 standard users'
              ) : (
                <>
                  Showing <span className="font-bold text-white">{userStartIndex + 1}</span> to{' '}
                  <span className="font-bold text-white">{userEndIndex}</span> of{' '}
                  <span className="font-bold text-white">{processedStandardUsers.length}</span> standard users
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage <= 1
                    ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                    : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17] cursor-pointer'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setUserCurrentPage(pageNum)}
                  className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                    userCurrentPage === pageNum
                      ? 'bg-[#E05638] text-white border-[#E05638] shadow-md shadow-[#E05638]/20'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={userCurrentPage >= userTotalPages}
                onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  userCurrentPage >= userTotalPages
                    ? 'border-slate-800/80 text-slate-600 cursor-not-allowed bg-slate-900/40'
                    : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 bg-[#0b0f17] cursor-pointer'
                }`}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ADD USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Add New User
              </h2>
              <p className="text-slate-400 text-xs">Create a new user account with role permissions.</p>
            </div>

            {addError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Smith"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 4 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setAddRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'user'}
                      onChange={() => setAddRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setAddRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      addRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="addRole"
                      checked={addRole === 'admin'}
                      onChange={() => setAddRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EDIT USER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638] flex items-center gap-2">
                <Edit3 className="h-5 w-5" /> Edit User Account
              </h2>
              <p className="text-slate-400 text-xs">Update account name, email address, password, or role.</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Change Password (leave blank to keep current)</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="Enter new password..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label 
                    onClick={() => setEditRole('user')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'user' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">Standard User</div>
                      <div className="text-[10px] text-slate-400">Recipes & Planner</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'user'}
                      onChange={() => setEditRole('user')}
                      className="accent-[#E05638]"
                    />
                  </label>

                  <label 
                    onClick={() => setEditRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      editRole === 'admin' 
                        ? 'bg-[#161213] border-[#E05638]' 
                        : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Admin
                      </div>
                      <div className="text-[10px] text-slate-400">Full Access</div>
                    </div>
                    <input
                      type="radio"
                      name="editRole"
                      checked={editRole === 'admin'}
                      onChange={() => setEditRole('admin')}
                      className="accent-[#E05638]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-[#070b13] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

```

## File: `apps/web/src/app/admin/ingredient-categories/page.tsx`
```typescript
'use client';
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

```

## File: `apps/web/src/app/books/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Book, Plus, Utensils, Trash2, Edit3, Save, X, 
  ArrowRight, Palette, Check, Clock, Timer, Share2, 
  CheckCircle2, CalendarPlus, ShoppingCart, 
  BookmarkPlus, Heart, Star, ChevronDown, ImagePlus,
  GripVertical, CheckSquare, ExternalLink, Users
} from 'lucide-react';

const COVER_GRADIENTS = [
  { label: 'Rose & Pink', value: 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600' },
  { label: 'Emerald Green', value: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
  { label: 'Sunset Orange', value: 'bg-gradient-to-r from-orange-500 to-amber-600' },
  { label: 'Royal Purple', value: 'bg-gradient-to-r from-purple-600 to-indigo-800' },
  { label: 'Ocean Blue', value: 'bg-gradient-to-r from-blue-600 to-cyan-600' },
  { label: 'Slate Charcoal', value: 'bg-gradient-to-r from-slate-700 to-slate-900' },
];

const DEFAULT_CATEGORIES = [
  'Produce', 'Meat and Seafood', 'Dairy', 
  'Grains and Pasta', 'Pantry Staples', 
  'Condiments and Sauces', 'Beverages'
];

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // Cookbook Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // Form States for Cookbook Create
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCoverColor, setNewCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Form States for Cookbook Edit
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCoverColor, setEditCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Specific Recipe Popup State
  const [viewingRecipe, setViewingRecipe] = useState<any | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Recipe Editing State (Inside Recipe Popup)
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editRecipeTab, setEditRecipeTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editRecipeForm, setEditRecipeForm] = useState<any>({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    imageUrl: '',
    ingredients: [],
    instructions: []
  });
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  // Add to Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planDate, setPlanDate] = useState('2026-08-28');
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planMealTime, setPlanMealTime] = useState('19:00');

  const loadData = () => {
    try {
      const localBooks = localStorage.getItem('zecratary_recipe_books');
      const localRecipes = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      
      let parsedRecipes = localRecipes ? JSON.parse(localRecipes) : [];
      setRecipes(parsedRecipes);

      if (localBooks) {
        let parsedBooks = JSON.parse(localBooks);
        parsedBooks = parsedBooks.map((b: any) => ({
          ...b,
          recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
        }));
        setBooks(parsedBooks);
      } else {
        const defaultBooks = [
          {
            id: 'cb_1',
            title: 'test',
            description: 'Custom recipe collection',
            coverColor: 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600',
            recipeCount: 2
          },
          {
            id: 'cb_2',
            title: 'Baking & Desserts',
            description: 'Cakes, pastries, sweet treats, and weekend baking projects.',
            coverColor: 'bg-gradient-to-r from-emerald-600 to-teal-700',
            recipeCount: 1
          }
        ];
        setBooks(defaultBooks);
        localStorage.setItem('zecratary_recipe_books', JSON.stringify(defaultBooks));
      }
    } catch (e) {
      console.error('Failed to load books data', e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('zecratary_recipes_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('zecratary_recipes_updated', loadData);
    };
  }, []);

  const saveBooks = (updated: any[]) => {
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const saveAllRecipes = (updatedList: any[]) => {
    setRecipes(updatedList);
    localStorage.setItem('zecratary_recipes', JSON.stringify(updatedList));
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));

    const updatedBooks = books.map((b: any) => ({
      ...b,
      recipeCount: updatedList.filter((r: any) => r.bookId === b.id).length
    }));
    setBooks(updatedBooks);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updatedBooks));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBook = {
      id: 'book_' + Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim() || 'Custom recipe collection',
      recipeCount: 0,
      coverColor: newCoverColor,
    };

    const updated = [...books, newBook];
    saveBooks(updated);
    setNewTitle('');
    setNewDesc('');
    setNewCoverColor(COVER_GRADIENTS[0].value);
    setShowAddModal(false);
  };

  const openEditModal = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setEditingBook(book);
    setEditTitle(book.title || '');
    setEditDesc(book.description || '');
    setEditCoverColor(book.coverColor || COVER_GRADIENTS[0].value);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editTitle.trim()) return;

    const updated = books.map((b) =>
      b.id === editingBook.id
        ? {
            ...b,
            title: editTitle.trim(),
            description: editDesc.trim(),
            coverColor: editCoverColor,
          }
        : b
    );

    saveBooks(updated);

    if (selectedBook?.id === editingBook.id) {
      setSelectedBook({
        ...selectedBook,
        title: editTitle.trim(),
        description: editDesc.trim(),
        coverColor: editCoverColor,
      });
    }

    setEditingBook(null);
  };

  const handleDeleteBook = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recipe book?')) return;
    const updated = books.filter((b) => b.id !== id);
    saveBooks(updated);
    if (selectedBook?.id === id) setSelectedBook(null);
  };

  // Recipe Popup Specific Actions
  const handleOpenRecipePopup = (rec: any) => {
    setViewingRecipe(rec);
    setServingsMultiplier(1);
    setFontSizeScale(100);
    setCompletedSteps([]);
    setNoteText(rec.note || '');
    setIsNoteOpen(false);
    setIsBookDropdownOpen(false);
    setIsEditingRecipe(false);
  };

  const updateViewingRecipeState = (key: string, val: any) => {
    if (!viewingRecipe) return;
    const updatedRec = { ...viewingRecipe, [key]: val };
    setViewingRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleAssignToBook = (bookId: string) => {
    if (!viewingRecipe) return;
    const isRemoving = viewingRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...viewingRecipe, bookId: targetBookId };
    setViewingRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === viewingRecipe.id ? updatedRecipe : r);
    saveAllRecipes(updatedList);

    const targetBookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    if (isRemoving) {
      alert(`Removed "${viewingRecipe.title || viewingRecipe.name}" from "${targetBookTitle}"`);
    } else {
      alert(`Assigned "${viewingRecipe.title || viewingRecipe.name}" to "${targetBookTitle}"!`);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveAllRecipes(updated);
    setViewingRecipe(null);
    setIsEditingRecipe(false);
  };

  const toggleStepComplete = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(i => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const calculateScaledAmount = (baseAmount: any, baseServings: number, currentServings: number) => {
    if (!baseAmount || isNaN(Number(baseAmount))) return baseAmount;
    const num = Number(baseAmount);
    const scaled = (num / (baseServings || 4)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
  };

  // Recipe Edit Handlers
  const handleOpenEditRecipe = () => {
    if (!viewingRecipe) return;
    setEditRecipeForm({
      title: viewingRecipe.title || viewingRecipe.name || '',
      description: viewingRecipe.description || '',
      recipeType: viewingRecipe.recipeType || viewingRecipe.tags?.[0] || 'Main Dish',
      servings: viewingRecipe.servings || 4,
      prepTimeMinutes: viewingRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: viewingRecipe.cookTimeMinutes || 30,
      imageUrl: viewingRecipe.imageUrl || viewingRecipe.image || '',
      ingredients: viewingRecipe.ingredients
        ? viewingRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? 'Pantry Staples' : ing.category || 'Pantry Staples'
          }))
        : [{ amount: '', unit: '', item: '', category: 'Pantry Staples' }],
      instructions: viewingRecipe.instructions && viewingRecipe.instructions.length > 0
        ? [...viewingRecipe.instructions]
        : ['']
    });
    setEditRecipeTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditingRecipe(true);
  };

  const handleSaveRecipeEdit = () => {
    if (!editRecipeForm.title.trim()) {
      alert('Please enter a recipe title.');
      setEditRecipeTab('info');
      return;
    }

    const updatedRec = {
      ...viewingRecipe,
      ...editRecipeForm,
      tags: [editRecipeForm.recipeType]
    };

    setViewingRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditingRecipe(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditRecipeForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (type === 'ingredients') {
      const list = [...editRecipeForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditRecipeForm({ ...editRecipeForm, ingredients: list });
    } else {
      const list = [...editRecipeForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditRecipeForm({ ...editRecipeForm, instructions: list });
    }
    setDraggedIndex(index);
  };
  const handleDrop = () => setDraggedIndex(null);

  // Shopping List Modal Handlers
  const handleOpenShoppingModal = () => {
    if (!viewingRecipe) return;
    const items = (viewingRecipe.ingredients || []).map((ing: any, idx: number) => ({
      id: 'shop_item_' + idx,
      selected: true,
      amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
      unit: typeof ing === 'string' ? '' : ing.unit || '',
      name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
      category: typeof ing === 'string' ? 'Pantry Staples' : ing.category || 'Pantry Staples'
    }));
    setShoppingModalIngredients(items);
    setIsShoppingModalOpen(true);
  };

  const handleConfirmAddToShoppingList = () => {
    const selectedItems = shoppingModalIngredients.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert('No ingredients selected.');
      return;
    }
    const local = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const current = local ? JSON.parse(local) : [];
    const formatted = selectedItems.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      name: i.name,
      quantity: i.amount || '1',
      unit: i.unit || 'item',
      category: i.category,
      checked: false
    }));
    const updated = [...formatted, ...current];
    localStorage.setItem('zecratary_shopping', JSON.stringify(updated));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
    setIsShoppingModalOpen(false);
    alert(`Added ${selectedItems.length} ingredients to your Shopping List!`);
  };

  // Add to Plan Handler
  const handleConfirmAddToPlan = () => {
    if (!viewingRecipe) return;
    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const planItems = localPlan ? JSON.parse(localPlan) : [];
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: planDate,
      recipeId: viewingRecipe.id,
      recipeName: viewingRecipe.title || viewingRecipe.name,
      image: viewingRecipe.imageUrl || viewingRecipe.image,
      mealType: planMealType,
      time: planMealTime,
      isLeftover: false,
      notes: ''
    };
    const updatedPlan = [...planItems, newMeal];
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updatedPlan));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    setIsPlanModalOpen(false);
    alert(`Added "${viewingRecipe.title || viewingRecipe.name}" to meal plan on ${planDate}!`);
  };

  const baseServings = viewingRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;
  const assignedBook = books.find(b => b.id === viewingRecipe?.bookId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16 px-4">
      {/* Page Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Recipe Books</h1>
          <p className="text-slate-400 text-xs mt-1">Organize your saved recipes into curated digital cookbooks</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <Plus className="h-4 w-4" /> Create Recipe Book
        </button>
      </div>

      {/* Books Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => {
          const count = recipes.filter((r: any) => r.bookId === book.id).length || book.recipeCount || 0;
          return (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="bg-[#0c101d] border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-xl"
            >
              <div className={`h-36 w-full ${book.coverColor || COVER_GRADIENTS[0].value} p-5 flex flex-col justify-between relative overflow-hidden shadow-inner`}>
                <div className="flex items-center justify-between z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    COOKBOOK
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-black/25 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                    <Book className="h-4 w-4" />
                  </div>
                </div>

                <h3 className="font-black text-white text-xl leading-snug drop-shadow-md z-10 truncate">
                  {book.title}
                </h3>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 min-h-[32px]">
                  {book.description || 'Custom recipe collection'}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-[#E05638]" /> {count} recipes inside
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(e, book)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Cookbook"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBook(e, book.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                      title="Delete Cookbook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT BOOK MODAL */}
      {editingBook && (
        <div 
          onClick={() => setEditingBook(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button
              onClick={() => setEditingBook(null)}
              className="absolute top-4 right-4 p-2 bg-[#172033] text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe Book
              </h2>
              <p className="text-slate-400 text-xs">Update your cookbook title, description, and cover color.</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baking & Desserts"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2 text-xs flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-[#E05638]" /> Background Color
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {COVER_GRADIENTS.map((g) => {
                    const isSelected = editCoverColor === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setEditCoverColor(g.value)}
                        className={`h-11 rounded-xl ${g.value} flex items-center justify-center transition border-2 ${
                          isSelected ? 'border-white scale-105 shadow-md ring-2 ring-[#E05638]/40' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={g.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20 text-xs"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BOOK MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 bg-[#172033] text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Book className="h-5 w-5 text-[#E05638]" /> Create Recipe Book
              </h2>
              <p className="text-slate-400 text-xs">Create a new curated recipe collection.</p>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Baking & Desserts"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2 text-xs flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-[#E05638]" /> Background Color
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {COVER_GRADIENTS.map((g) => {
                    const isSelected = newCoverColor === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setNewCoverColor(g.value)}
                        className={`h-11 rounded-xl ${g.value} flex items-center justify-center transition border-2 ${
                          isSelected ? 'border-white scale-105 shadow-md ring-2 ring-[#E05638]/40' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={g.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20 text-xs"
                >
                  Create Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BOOK DETAILS MODAL */}
      {selectedBook && (
        <div 
          onClick={() => setSelectedBook(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto cursor-default"
          >
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 bg-[#172033] text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`h-32 w-full ${selectedBook.coverColor || COVER_GRADIENTS[0].value} rounded-2xl p-6 flex flex-col justify-between text-white shadow-md`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  Cookbook Details
                </span>
                <button
                  onClick={(e) => openEditModal(e, selectedBook)}
                  className="bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/10"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Book
                </button>
              </div>
              <div>
                <h2 className="text-2xl font-black">{selectedBook.title}</h2>
                <p className="text-xs text-white/90 mt-0.5 line-clamp-1">{selectedBook.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#E05638]">
                  Recipes in this Book ({recipes.filter((r: any) => r.bookId === selectedBook.id).length})
                </h3>
                <Link
                  href="/recipes"
                  className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Browse Recipes <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recipes.filter((r: any) => r.bookId === selectedBook.id).length === 0 ? (
                <div className="p-8 border border-slate-800 bg-[#070b13] rounded-2xl text-center space-y-2">
                  <Utensils className="h-8 w-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No recipes in this book yet</h4>
                  <p className="text-xs text-slate-400">Open any saved recipe and assign it to this cookbook.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipes
                    .filter((r: any) => r.bookId === selectedBook.id)
                    .map((rec: any) => (
                      <div key={rec.id} className="flex items-center justify-between bg-[#070b13] p-3 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center gap-3">
                          <img src={rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80'} alt={rec.title || rec.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold text-white">{rec.title || rec.name}</h4>
                            <span className="text-[10px] text-slate-400">{rec.recipeType || rec.tags?.[0] || 'Main Dish'} • {rec.servings || 4} servings</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenRecipePopup(rec)}
                          className="bg-[#172033] hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg transition border border-slate-700/60"
                        >
                          View
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. SPECIFIC RECIPE POPUP MODAL (View / Edit / Actions) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingRecipe && (
        <div 
          onClick={() => { setViewingRecipe(null); setIsEditingRecipe(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => { setViewingRecipe(null); setIsEditingRecipe(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2.5 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-xl border border-slate-700/60 backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditingRecipe ? (
                /* ─── RECIPE DETAILS VIEW ─── */
                <div className="space-y-5 pb-8">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                    <img
                      src={viewingRecipe.imageUrl || viewingRecipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                      alt={viewingRecipe.title || viewingRecipe.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/60 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {viewingRecipe.title || viewingRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Cook: {viewingRecipe.cookTimeMinutes || 10} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Prep: {viewingRecipe.prepTimeMinutes || 30} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5 text-slate-300" /> {viewingRecipe.tags?.[0] || viewingRecipe.recipeType || 'Main Dish'}
                        </span>
                        
                        <button
                          onClick={() => updateViewingRecipeState('isFavorite', !viewingRecipe.isFavorite)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-[#E05638] shadow hover:scale-105 transition"
                        >
                          <Heart className={`h-4 w-4 ${viewingRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row: ADD TO BOOK DROPDOWN + ADD TO PLAN + SHOPPING LIST */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
                    {/* Functional Add to Book Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                        className={`w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                          assignedBook
                            ? 'bg-[#E05638]/20 border-[#E05638] text-[#E05638]'
                            : 'border-[#E05638]/60 text-[#E05638] hover:bg-[#E05638]/10'
                        }`}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0 text-[#E05638]" />
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : 'Add to Book'}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5" />
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 flex items-center justify-between">
                              <span>Select Cookbook</span>
                              <button onClick={() => { setSelectedBook(null); setIsBookDropdownOpen(false); }} className="text-emerald-400 hover:underline">
                                Books
                              </button>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs text-slate-500 px-2.5 py-2">No cookbooks available</div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = viewingRecipe.bookId === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        handleAssignToBook(b.id);
                                        setIsBookDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                                        isAssigned
                                          ? 'bg-[#E05638]/20 text-[#E05638] border border-[#E05638]/30'
                                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                      }`}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 text-[#E05638] shrink-0" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Functional Add to Plan Trigger */}
                    <button
                      onClick={() => setIsPlanModalOpen(true)}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Plan
                    </button>

                    {/* Functional Shopping List Trigger */}
                    <button
                      onClick={handleOpenShoppingModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Shopping List
                    </button>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Servings, Timer, Edit, Share Controls */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#E05638] flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Servings
                      </span>
                      <div className="flex items-center bg-[#070b13] border border-slate-800 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-white">
                          {currentTotalServings}
                        </span>
                        <button
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Kitchen Timer set for 15 minutes!')}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Timer className="h-3.5 w-3.5" /> Timer
                      </button>
                      <button
                        onClick={handleOpenEditRecipe}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Recipe link copied!');
                        }}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share Recipe
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-5 text-xs text-slate-300 leading-relaxed">
                    {viewingRecipe.description || 'Authentic traditional recipe cooked to perfection.'}
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Ingredients & Steps Viewer */}
                  <div className="px-5 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-base font-extrabold text-white">Ingredients</h3>
                      <div className="flex items-center bg-[#070b13] border border-slate-800 rounded-lg text-xs">
                        <button
                          onClick={() => setFontSizeScale(Math.max(80, fontSizeScale - 10))}
                          className="px-2 py-1 text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 font-bold text-slate-200">{fontSizeScale}%</span>
                        <button
                          onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                          className="px-2 py-1 text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3" style={{ fontSize: `${fontSizeScale}%` }}>
                      {Array.isArray(viewingRecipe.ingredients) && viewingRecipe.ingredients.map((ing: any, idx: number) => {
                        const amt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                        const unit = typeof ing === 'string' ? '' : ing.unit || '';
                        const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        const scaledAmount = calculateScaledAmount(amt, baseServings, currentTotalServings);
                        return (
                          <div key={idx} className="flex items-start gap-2.5 text-xs py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E05638] mt-1.5 shrink-0" />
                            <span className="text-slate-200">
                              {(scaledAmount || unit) && <strong className="text-white font-bold">{scaledAmount} {unit !== 'Unit' ? unit : ''} </strong>}
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 pt-2">
                      <h3 className="text-base font-extrabold text-white">Instructions</h3>
                      <div className="space-y-2.5" style={{ fontSize: `${fontSizeScale}%` }}>
                        {Array.isArray(viewingRecipe.instructions) && viewingRecipe.instructions.map((step: string, idx: number) => {
                          const isDone = completedSteps.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleStepComplete(idx)}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                                isDone ? 'bg-[#070b13]/50 border-slate-800/60 opacity-50 line-through' : 'bg-[#070b13] border-slate-800'
                              }`}
                            >
                              <span className="font-extrabold text-[#E05638] shrink-0">{idx + 1}.</span>
                              <span className="text-slate-200 leading-relaxed flex-1">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Mark as Cooked & 5-Star Rating */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateViewingRecipeState('isCooked', !viewingRecipe.isCooked)}
                        className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer"
                      >
                        Mark as Cooked
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          viewingRecipe.isCooked ? 'bg-slate-400 text-black' : 'border border-slate-600'
                        }`}>
                          {viewingRecipe.isCooked && '✓'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateViewingRecipeState('rating', star)}
                            className={`h-4 w-4 cursor-pointer transition ${
                              (viewingRecipe.rating || 0) >= star
                                ? 'fill-[#E05638] text-[#E05638]'
                                : 'text-slate-700 hover:text-slate-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Add a note
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                          <button
                            onClick={() => {
                              updateViewingRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="bg-[#E05638] text-white font-bold text-xs px-3 py-2 rounded-xl"
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {viewingRecipe.note && !isNoteOpen && (
                        <p className="text-xs text-emerald-400 italic">Note: "{viewingRecipe.note}"</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Source Footer & Delete Action */}
                  <div className="px-5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Source</span>
                      {viewingRecipe.sourceUrl ? (
                        <a
                          href={viewingRecipe.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                        >
                          Visit {new URL(viewingRecipe.sourceUrl).hostname.replace('www.', '')} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Manual / Custom Recipe</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteRecipe(viewingRecipe.id)}
                      className="bg-red-950/60 border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-900/50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Recipe
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── RECIPE EDIT FORM (Identical to /recipes) ─── */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe
                    </h3>
                    <button
                      onClick={() => setIsEditingRecipe(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex bg-[#070b13] p-1.5 rounded-2xl border border-slate-800">
                    {[
                      { id: 'info', label: 'Basic Info' },
                      { id: 'ingredients', label: 'Ingredients' },
                      { id: 'steps', label: 'Steps' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditRecipeTab(tab.id as any)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          editRecipeTab === tab.id
                            ? 'bg-[#111726] text-white shadow-md border border-slate-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editRecipeTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px]">
                          Photo
                        </label>
                        <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#070b13] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                          {editRecipeForm.imageUrl ? (
                            <>
                              <img
                                src={editRecipeForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span className="bg-[#111726]/90 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <ImagePlus className="h-4 w-4 text-[#E05638]" /> Change Photo
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditRecipeForm({ ...editRecipeForm, imageUrl: '' });
                                  }}
                                  className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 text-slate-400 mx-auto group-hover:text-[#E05638] transition" />
                              <span className="text-xs font-bold text-slate-300 block">Add a photo</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Recipe Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editRecipeForm.title}
                          onChange={(e) => setEditRecipeForm({ ...editRecipeForm, title: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editRecipeForm.description}
                          onChange={(e) => setEditRecipeForm({ ...editRecipeForm, description: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Recipe Type
                          </label>
                          <select
                            value={editRecipeForm.recipeType}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, recipeType: e.target.value })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          >
                            <option value="Main Dish">Main Dish</option>
                            <option value="Appetizer">Appetizer</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Side Dish">Side Dish</option>
                            <option value="Beverage">Beverage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Servings
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.servings}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Preparation Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.prepTimeMinutes}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Cooking Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.cookTimeMinutes}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingRecipe(false)}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRecipeEdit}
                          className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2 text-xs"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editRecipeTab === 'ingredients' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Ingredients</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingIngredients ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingIngredients ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRecipeForm({
                              ...editRecipeForm,
                              ingredients: [...editRecipeForm.ingredients, { amount: '', unit: '', item: '', category: DEFAULT_CATEGORIES[0] }]
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Ingredient
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editRecipeForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                            onDrop={handleDrop}
                            className={`flex items-center gap-2 bg-[#0b0f17] p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Amt"
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-700 font-bold outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-700 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none px-2"
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              {DEFAULT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecipeForm({
                                  ...editRecipeForm,
                                  ingredients: editRecipeForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('info')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('steps')}
                          className="bg-[#E05638] text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
                        >
                          Next: Steps →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editRecipeTab === 'steps' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Step-by-Step Instructions</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingSteps ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingSteps ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRecipeForm({
                              ...editRecipeForm,
                              instructions: [...editRecipeForm.instructions, '']
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Step
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editRecipeForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                            onDrop={handleDrop}
                            className={`flex items-start gap-3 bg-[#0b0f17] p-3 rounded-xl border transition ${
                              isReorderingSteps ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-[#E05638]/20 text-[#E05638] font-bold flex items-center justify-center shrink-0 mt-1">
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={`Describe step ${idx + 1}...`}
                              value={step}
                              onChange={(e) => {
                                const list = [...editRecipeForm.instructions];
                                list[idx] = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none resize-y"
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecipeForm({
                                  ...editRecipeForm,
                                  instructions: editRecipeForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-slate-500 hover:text-red-400 h-fit"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('ingredients')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRecipeEdit}
                          className="bg-[#E05638] text-white font-bold px-8 py-2.5 rounded-xl text-xs hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ADD INGREDIENTS TO SHOPPING LIST POPUP MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#E05638]" /> Add to Shopping List
                </h3>
                <p className="text-xs text-slate-400">Select or edit items to add directly to your list</p>
              </div>
              <button onClick={() => setIsShoppingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {shoppingModalIngredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2 bg-[#070b13] p-2.5 rounded-xl border border-slate-800">
                  <div
                    onClick={() => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].selected = !updated[idx].selected;
                      setShoppingModalIngredients(updated);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                      ing.selected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                  </div>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].amount = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white font-bold outline-none"
                    placeholder="Amt"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].unit = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 outline-none"
                    placeholder="Unit"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].name = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="flex-1 bg-transparent border-none text-white outline-none px-2"
                    placeholder="Ingredient name..."
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].category = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add Selected to List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ADD TO MEAL PLAN MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isPlanModalOpen && (
        <div 
          onClick={() => setIsPlanModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Meal Plan
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Date</label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Meal Type</label>
                <select
                  value={planMealType}
                  onChange={(e) => setPlanMealType(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Time</label>
                <input
                  type="time"
                  value={planMealTime}
                  onChange={(e) => setPlanMealTime(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToPlan}
                className="px-5 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs shadow-lg shadow-[#E05638]/20"
              >
                Schedule Meal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

```

## File: `apps/web/src/app/manual/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  X, ImagePlus, Plus, Trash2, GripVertical, 
  ChevronDown, Save, ArrowLeft 
} from 'lucide-react';
import { getStoredCategories } from '@/lib/categories';

export default function ManualRecipePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [categories, setCategories] = useState<string[]>([]);

  // Form State matching Reference Fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: '15',
    cookTimeMinutes: '30',
    imageUrl: '',
    ingredients: [
      { amount: '', unit: '', item: '', category: 'Produce' }
    ],
    instructions: ['']
  });

  const [saving, setSaving] = useState(false);
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const cats = getStoredCategories();
    setCategories(cats);
    if (cats.length > 0 && form.ingredients[0] && !cats.includes(form.ingredients[0].category)) {
      setForm((prev) => ({
        ...prev,
        ingredients: [{ ...prev.ingredients[0], category: cats[0] }]
      }));
    }

    const handleCatSync = () => setCategories(getStoredCategories());
    window.addEventListener('zecratary_categories_changed', handleCatSync);
    window.addEventListener('storage', handleCatSync);

    return () => {
      window.removeEventListener('zecratary_categories_changed', handleCatSync);
      window.removeEventListener('storage', handleCatSync);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (type === 'ingredients') {
      const list = [...form.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setForm((prev) => ({ ...prev, ingredients: list }));
      setDraggedIndex(index);
    } else {
      const list = [...form.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setForm((prev) => ({ ...prev, instructions: list }));
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter a recipe title.');
      setActiveTab('info');
      return;
    }

    setSaving(true);
    try {
      const newRecipe = {
        id: 'manual_' + Date.now(),
        ...form,
        prepTimeMinutes: parseInt(form.prepTimeMinutes as string) || 15,
        cookTimeMinutes: parseInt(form.cookTimeMinutes as string) || 30,
        servings: Number(form.servings) || 4,
        tags: [form.recipeType],
        isFavorite: false,
        isCooked: false,
        rating: 0,
        note: '',
        sourceUrl: ''
      };

      const existing = JSON.parse(
        localStorage.getItem('zecratary_recipes') || 
        localStorage.getItem('zecratary_saved_recipes') || 
        '[]'
      );
      const updated = [newRecipe, ...existing];
      localStorage.setItem('zecratary_recipes', JSON.stringify(updated));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_recipes_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe)
      }).catch(() => {});

      router.push('/recipes');
    } catch (err) {
      console.error('Failed to save manual recipe:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 text-slate-100 pb-24">
      {/* Modal / Card Container matching Reference */}
      <div className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <Link
          href="/recipes"
          className="absolute top-5 right-5 p-2 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Link>

        {/* Card Header */}
        <div className="space-y-1 pr-8">
          <h1 className="text-xl sm:text-2xl font-black text-[#E05638] tracking-tight">
            Create Recipe
          </h1>
          <p className="text-xs text-slate-400">
            Fill in the details below to create a new recipe.
          </p>
        </div>

        {/* Segmented Tab Navigation matching Reference */}
        <div className="flex bg-[#07090e] p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'info', label: 'Basic Info' },
            { id: 'ingredients', label: 'Ingredients' },
            { id: 'steps', label: 'Steps' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                activeTab === tab.id
                  ? 'bg-[#171a23] text-white shadow-md border border-slate-700/70'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: BASIC INFO (MATCHING REFERENCE SCREENSHOT) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'info' && (
            <div className="space-y-5 animate-in fade-in">
              
              {/* Photo Upload Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#E05638]">Photo</label>
                <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#07090e] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                  {form.imageUrl ? (
                    <>
                      <img
                        src={form.imageUrl}
                        alt="Recipe Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <span className="bg-[#111726]/90 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <ImagePlus className="h-4 w-4 text-[#E05638]" /> Change Photo
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setForm((prev) => ({ ...prev, imageUrl: '' }));
                          }}
                          className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900"
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-2">
                      <ImagePlus className="h-8 w-8 text-slate-400 mx-auto group-hover:text-[#E05638] transition" />
                      <span className="text-xs font-bold text-slate-300 block">Add a photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Recipe title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="A short description of the recipe"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] resize-y leading-relaxed transition"
                />
              </div>

              {/* Recipe Type & Servings Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe Type</label>
                  <div className="relative">
                    <select
                      value={form.recipeType}
                      onChange={(e) => setForm({ ...form, recipeType: e.target.value })}
                      className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638] appearance-none cursor-pointer"
                    >
                      <option value="Main Dish">Main Dish</option>
                      <option value="Appetizer">Appetizer</option>
                      <option value="Dessert">Dessert</option>
                      <option value="Side Dish">Side Dish</option>
                      <option value="Beverage">Beverage</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E05638] mb-1.5">Servings</label>
                  <input
                    type="number"
                    min="1"
                    value={form.servings}
                    onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>

              {/* Prep Time & Cooking Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#E05638] mb-1.5">Preparation Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 15 minutes"
                    value={form.prepTimeMinutes}
                    onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E05638] mb-1.5">Cooking Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 minutes"
                    value={form.cookTimeMinutes}
                    onChange={(e) => setForm({ ...form, cookTimeMinutes: e.target.value })}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: INGREDIENTS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center pb-1">
                <label className="text-xs font-bold text-[#E05638] uppercase tracking-wider">
                  Ingredients
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                    className={`font-bold px-3 py-1.5 rounded-xl border transition ${
                      isReorderingIngredients 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : 'bg-[#171a23] text-slate-200 border-slate-700'
                    }`}
                  >
                    {isReorderingIngredients ? 'Done' : 'Reorder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      ingredients: [
                        ...form.ingredients,
                        { amount: '', unit: '', item: '', category: categories[0] || 'Produce' }
                      ]
                    })}
                    className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Ingredient
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {form.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    draggable={isReorderingIngredients}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                    onDrop={handleDrop}
                    className={`flex items-center gap-2 bg-[#07090e] p-2.5 rounded-xl border transition ${
                      isReorderingIngredients 
                        ? 'border-emerald-500/60 cursor-grab bg-[#111928]' 
                        : 'border-slate-800'
                    }`}
                  >
                    <input
                      type="text"
                      placeholder="Amt"
                      value={ing.amount}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].amount = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-600 font-bold outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].unit = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-600 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Ingredient name..."
                      value={ing.item}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].item = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="flex-1 bg-transparent border-none text-white placeholder-slate-600 outline-none px-2"
                    />
                    <select
                      value={ing.category}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].category = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    {isReorderingIngredients ? (
                      <div className="p-2 text-emerald-400 cursor-grab">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const list = form.ingredients.filter((_, i) => i !== idx);
                          setForm({ ...form, ingredients: list });
                        }}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: STEPS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'steps' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center pb-1">
                <label className="text-xs font-bold text-[#E05638] uppercase tracking-wider">
                  Step-by-Step Instructions
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                    className={`font-bold px-3 py-1.5 rounded-xl border transition ${
                      isReorderingSteps 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : 'bg-[#171a23] text-slate-200 border-slate-700'
                    }`}
                  >
                    {isReorderingSteps ? 'Done' : 'Reorder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      instructions: [...form.instructions, '']
                    })}
                    className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Step
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {form.instructions.map((step, idx) => (
                  <div
                    key={idx}
                    draggable={isReorderingSteps}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                    onDrop={handleDrop}
                    className={`flex items-start gap-3 bg-[#07090e] p-3 rounded-xl border transition ${
                      isReorderingSteps 
                        ? 'border-emerald-500/60 cursor-grab bg-[#111928]' 
                        : 'border-slate-800'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#E05638]/20 text-[#E05638] font-bold flex items-center justify-center shrink-0 mt-1">
                      {idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      placeholder={`Describe step ${idx + 1}...`}
                      value={step}
                      onChange={(e) => {
                        const list = [...form.instructions];
                        list[idx] = e.target.value;
                        setForm({ ...form, instructions: list });
                      }}
                      className="flex-1 bg-transparent border-none text-white placeholder-slate-600 outline-none resize-y"
                    />

                    {isReorderingSteps ? (
                      <div className="p-2 text-emerald-400 cursor-grab mt-1">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const list = form.instructions.filter((_, i) => i !== idx);
                          setForm({ ...form, instructions: list });
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 h-fit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* BOTTOM ACTIONS (CANCEL & SAVE CHANGES) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
            <Link
              href="/recipes"
              className="py-3 px-4 bg-[#07090e] hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs text-center transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="py-3 px-4 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-xl text-xs transition shadow-lg shadow-[#E05638]/20 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/profile/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { User, Globe, Shield, Trash2, CheckCircle2 } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [email] = useState('ed1226@gmail.com');
  const [country, setCountry] = useState('Singapore');
  const [saved, setSaved] = useState(false);

  const handleCountryChange = (c: string) => {
    setCountry(c);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-slate-100">
      {/* Profile Settings */}
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-[#E05638]">Profile Settings</h1>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-[#E05638] uppercase">Email</label>
            <div className="text-sm font-semibold text-slate-200 mt-1">{email}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#E05638] uppercase">Country</label>
            <p className="text-xs text-slate-400">This determines whether recipes use metric or imperial measurements</p>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white mt-1 outline-none focus:border-[#E05638]"
            >
              <option value="Singapore">Singapore (Metric)</option>
              <option value="United States">United States (Imperial)</option>
              <option value="United Kingdom">United Kingdom (Metric)</option>
              <option value="Australia">Australia (Metric)</option>
            </select>
          </div>
          {saved && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Measurement units updated</span>}
        </div>
      </div>

      {/* Subscription Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#E05638]">Subscription Management</h2>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Your Subscription</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Plan:</span>
              <span className="font-bold text-white">Taster</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status:</span>
              <span className="bg-emerald-950 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-800">active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Renews on:</span>
              <span className="font-bold text-white">September 22, 2026</span>
            </div>
          </div>
          <button
            onClick={() => alert("Redirecting to Stripe Customer Portal...")}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition mt-2"
          >
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#E05638]">Account Management</h2>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-emerald-400 text-sm">Delete account</h4>
            <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and all associated data. This can't be undone.</p>
          </div>
          <button
            onClick={() => confirm("Are you sure you want to delete your account?") && alert("Account deletion processed.")}
            className="bg-[#2D1515] border border-red-900/50 hover:bg-red-900/50 text-red-400 font-bold text-xs px-4 py-2 rounded-xl transition"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/recipes/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, Utensils,
  X, UploadCloud, BookmarkPlus, CalendarPlus, ShoppingCart,
  Timer, Edit3, Share2, Star, Check, Book, ChevronDown,
  Trash2, Save, Plus, ImagePlus, Users, Calendar,
  GripVertical, CheckSquare, CheckCircle2
} from 'lucide-react';
import { getStoredCategories } from '@/lib/categories';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  // Add to Book Dropdown State
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Add to Plan / Calendar Modal State
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState('2026-08-28');
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planTime, setPlanTime] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Edit Mode & Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editForm, setEditForm] = useState<any>({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    imageUrl: '',
    ingredients: [],
    instructions: []
  });

  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // View States & Dynamic Font Scaling
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  const defaultBooks = [
    { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', description: 'Quick and easy meals.' },
    { id: 'book_2', title: 'Authentic Asian Cuisine', description: 'Traditional recipes & stir-fries.' },
    { id: 'book_3', title: 'Baking & Desserts', description: 'Sweet treats & pastries.' }
  ];

  const defaultRecipes = [
    {
      id: 'rec_caesar',
      title: 'Caesar Salad',
      description: 'Classic crisp romaine lettuce tossed with creamy Caesar dressing, crunchy homemade garlic croutons, and shaved Parmigiano-Reggiano.',
      servings: 4,
      prepTimeMinutes: 20,
      cookTimeMinutes: 25,
      tags: ['Main Dish'],
      recipeType: 'Main Dish',
      isFavorite: true,
      isCooked: true,
      rating: 5,
      note: 'Extra shaved parmesan makes all the difference!',
      sourceUrl: '',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      bookId: 'book_3',
      ingredients: [
        { amount: '4', unit: 'cups', item: 'cubed crusty bread', category: 'Bakery' },
        { amount: '1', unit: 'Extra', item: '-virgin olive oil (for drizzling)', category: 'Pantry Staples' },
        { amount: '1', unit: 'Sea', item: 'salt (for sprinkling)', category: 'Pantry Staples' },
        { amount: '1', unit: 'cup', item: 'mayonnaise', category: 'Condiments and Sauces' },
        { amount: '1/4', unit: 'cup', item: 'extra-virgin olive oil', category: 'Pantry Staples' },
        { amount: '2', unit: 'tablespoons', item: 'fresh lemon juice', category: 'Produce' },
        { amount: '2', unit: 'teaspoons', item: 'Dijon mustard', category: 'Condiments and Sauces' },
        { amount: '1', unit: 'garlic', item: 'clove (grated)', category: 'Produce' }
      ],
      instructions: [
        'Preheat oven to 375°F (190°C). Toss cubed bread with olive oil and sea salt, then bake for 10-12 minutes until golden and crisp.',
        'In a small bowl, whisk together mayonnaise, extra-virgin olive oil, fresh lemon juice, Dijon mustard, and grated garlic until smooth and creamy.',
        'In a large salad bowl, toss chopped crisp romaine lettuce with the dressing until evenly coated.',
        'Top generously with warm garlic croutons, freshly shaved Parmesan cheese, and freshly cracked black pepper before serving.'
      ]
    }
  ];

  const loadData = () => {
    setCategories(getStoredCategories());
    try {
      const localRecipes = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      const localBooks = localStorage.getItem('zecratary_recipe_books');

      let parsedRecipes = defaultRecipes;
      if (localRecipes) {
        const parsed = JSON.parse(localRecipes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedRecipes = parsed;
        }
      }
      setRecipes(parsedRecipes);

      let parsedBooks = defaultBooks;
      if (localBooks) {
        const parsed = JSON.parse(localBooks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedBooks = parsed;
        }
      }

      const booksWithCounts = parsedBooks.map((b: any) => ({
        ...b,
        recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
      }));

      setBooks(booksWithCounts);
      localStorage.setItem('zecratary_recipes', JSON.stringify(parsedRecipes));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(parsedRecipes));
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(booksWithCounts));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_categories_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_categories_changed', handleSync);
    };
  }, []);

  const saveAllRecipes = (updatedList: any[]) => {
    setRecipes(updatedList);
    localStorage.setItem('zecratary_recipes', JSON.stringify(updatedList));
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));

    const updatedBooks = books.map((b: any) => ({
      ...b,
      recipeCount: updatedList.filter((r: any) => r.bookId === b.id).length
    }));
    setBooks(updatedBooks);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updatedBooks));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !selectedRecipe.isFavorite });
    }
  };

  const toggleCooked = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isCooked: !r.isCooked } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isCooked: !selectedRecipe.isCooked });
    }
  };

  const handleAssignToBook = (bookId: string) => {
    if (!selectedRecipe) return;
    const isRemoving = selectedRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...selectedRecipe, bookId: targetBookId };
    setSelectedRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === selectedRecipe.id ? updatedRecipe : r);
    saveAllRecipes(updatedList);

    const bookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    if (isRemoving) {
      alert(`Removed "${selectedRecipe.title || selectedRecipe.name}" from "${bookTitle}"`);
    } else {
      alert(`Added "${selectedRecipe.title || selectedRecipe.name}" to "${bookTitle}"!`);
    }
  };

  const openAddToPlanModal = () => {
    setPlanDate('2026-08-28');
    setPlanMealType('Dinner');
    setPlanTime('');
    setPlanNotes('');
    setShowAddToPlanModal(true);
  };

  const handleSaveToCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const currentPlan = localPlan ? JSON.parse(localPlan) : [];

    const newPlanItem = {
      id: 'plan_' + Date.now(),
      date: planDate,
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.title || selectedRecipe.name,
      image: selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      mealType: planMealType,
      time: planTime,
      notes: planNotes,
      isLeftover: false
    };

    localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, newPlanItem]));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    window.dispatchEvent(new Event('storage'));
    setShowAddToPlanModal(false);
    alert(`Successfully scheduled "${selectedRecipe.title || selectedRecipe.name}" in your meal plan!`);
  };

  const updateSelectedRecipeState = (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleDeleteRecipe = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveAllRecipes(updated);
    setSelectedRecipe(null);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (type === 'ingredients') {
      const list = [...editForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, ingredients: list });
      setDraggedIndex(index);
    } else {
      const list = [...editForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, instructions: list });
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const handleOpenEdit = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    setEditForm({
      title: selectedRecipe.title || selectedRecipe.name || '',
      description: selectedRecipe.description || '',
      recipeType: selectedRecipe.recipeType || selectedRecipe.tags?.[0] || 'Main Dish',
      servings: selectedRecipe.servings || 4,
      prepTimeMinutes: selectedRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: selectedRecipe.cookTimeMinutes || 30,
      imageUrl: selectedRecipe.imageUrl || selectedRecipe.image || '',
      ingredients: selectedRecipe.ingredients
        ? selectedRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
          }))
        : [{ amount: '', unit: '', item: '', category: defaultCat }],
      instructions: selectedRecipe.instructions && selectedRecipe.instructions.length > 0
        ? [...selectedRecipe.instructions]
        : ['']
    });
    setEditTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      alert('Please enter a recipe title.');
      setEditTab('info');
      return;
    }

    const updatedRec = {
      ...selectedRecipe,
      ...editForm,
      tags: [editForm.recipeType]
    };

    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditing(false);
  };

  const handleOpenShoppingModal = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    const items = (selectedRecipe.ingredients || []).map((ing: any, idx: number) => ({
      id: 'shop_item_' + idx,
      selected: true,
      amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
      unit: typeof ing === 'string' ? '' : ing.unit || '',
      name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
      category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
    }));
    setShoppingModalIngredients(items);
    setIsShoppingModalOpen(true);
  };

  const handleConfirmAddToShoppingList = () => {
    const selectedItems = shoppingModalIngredients.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert('No ingredients selected.');
      return;
    }
    const local = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const current = local ? JSON.parse(local) : [];
    const formatted = selectedItems.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      name: i.name,
      quantity: i.amount || '1',
      unit: i.unit || 'item',
      category: i.category,
      checked: false
    }));
    const updated = [...formatted, ...current];
    localStorage.setItem('zecratary_shopping', JSON.stringify(updated));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
    setIsShoppingModalOpen(false);
    alert(`Added ${selectedItems.length} items to your Shopping List!`);
  };

  const filtered = recipes.filter(r => {
    const q = search.toLowerCase().trim();
    const title = (r.title || r.name || '').toLowerCase();
    if (q && !title.includes(q)) return false;
    if (activeFilter === 'Favorites') return Boolean(r.isFavorite);
    if (activeFilter === 'Main Dish') return (r.tags?.includes('Main Dish') || r.recipeType === 'Main Dish');
    if (activeFilter === 'Cooked') return Boolean(r.isCooked);
    if (activeFilter === 'Top Rated') return (r.rating || 0) >= 4;
    return true;
  });

  const assignedBook = books.find(b => b.id === selectedRecipe?.bookId);
  const computedFontSize = `${(fontSizeScale / 100) * 0.875}rem`;
  const computedLineHeight = `${(fontSizeScale / 100) * 1.35}rem`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Saved Recipes</h1>
          <p className="text-emerald-400 text-xs mt-1 font-semibold">Your collection of favorite recipes ({recipes.length})</p>
        </div>
        <Link
          href="/manual"
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <UploadCloud className="h-4 w-4" /> Create Recipe
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name or ingredient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638]"
            />
          </div>
          <button className="border border-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 bg-[#070b13] text-emerald-400">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {['All', 'Favorites', 'Main Dish', 'Cooked', 'Top Rated'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full font-semibold border transition ${
                activeFilter === filter
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#070b13] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div className="text-slate-500 text-xs py-12 text-center">Loading recipes...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const cardBook = books.find(b => b.id === r.bookId);
            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRecipe(r);
                  setServingsMultiplier(1);
                  setCompletedSteps([]);
                  setNoteText(r.note || '');
                  setIsBookDropdownOpen(false);
                  setIsEditing(false);
                }}
                className="bg-[#070b13] border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition cursor-pointer group shadow-lg relative"
              >
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  <img
                    src={r.imageUrl || r.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80'}
                    alt={r.title || r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  {/* Top-Right Action Buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => toggleCooked(e, r.id)}
                      className={`p-2 rounded-full backdrop-blur-md transition shadow-md ${
                        r.isCooked 
                          ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white' 
                          : 'bg-black/60 hover:bg-black/80 text-slate-400 hover:text-white'
                      }`}
                      title={r.isCooked ? "Marked as Cooked (Click to undo)" : "Mark as Cooked"}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${r.isCooked ? 'text-white' : 'text-slate-300'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, r.id)}
                      className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:text-[#E05638] transition shadow-md"
                      title="Favorite"
                    >
                      <Heart className={`h-4 w-4 ${r.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
                    </button>
                  </div>

                  {cardBook && (
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-[10px] text-amber-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
                      <Book className="h-3 w-3" /> {cardBook.title}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-white text-base leading-snug">{r.title || r.name}</h3>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {r.tags?.[0] || r.recipeType || 'Main Dish'}
                      </span>

                      {(r.rating || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 shadow-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                          <Star className="h-3 w-3 text-slate-600" /> 0
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 10)}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. RECIPE DETAILS & EDIT MODAL (CLICK OUTSIDE CLOSES) */}
      {selectedRecipe && (
        <div 
          onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditing ? (
                /* RECIPE DETAILS VIEW */
                <div className="space-y-5 pb-6">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                    <img
                      src={selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1000&q=80'}
                      alt={selectedRecipe.title || selectedRecipe.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c111d] via-[#0c111d]/60 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {selectedRecipe.title || selectedRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Cook: {selectedRecipe.cookTimeMinutes || 30} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Prep: {selectedRecipe.prepTimeMinutes || 15} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5 text-slate-300" /> {selectedRecipe.tags?.[0] || selectedRecipe.recipeType || 'Main Dish'}
                        </span>
                        
                        <button
                          onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-[#E05638] shadow"
                        >
                          <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                        className={`w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                          assignedBook
                            ? 'bg-[#E05638]/20 border-[#E05638] text-[#E05638]'
                            : 'border-[#E05638]/60 text-[#E05638] hover:bg-[#E05638]/10'
                        }`}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0 text-[#E05638]" />
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : 'Add to Book'}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5" />
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 flex items-center justify-between">
                              <span>Select Cookbook</span>
                              <Link href="/books" className="text-emerald-400 hover:underline">Manage</Link>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs text-slate-500 px-2.5 py-2">No cookbooks available</div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = selectedRecipe.bookId === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        handleAssignToBook(b.id);
                                        setIsBookDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                                        isAssigned
                                          ? 'bg-[#E05638]/20 text-[#E05638] border border-[#E05638]/30'
                                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                      }`}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 text-[#E05638] shrink-0" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={openAddToPlanModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Plan
                    </button>

                    <button
                      onClick={handleOpenShoppingModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Shopping List
                    </button>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Servings Stepper & Tools */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#E05638] flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Servings
                      </span>
                      <div className="flex items-center bg-[#070b13] border border-slate-800 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-white">
                          {(selectedRecipe.servings || 4) * servingsMultiplier}
                        </span>
                        <button
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Kitchen Timer set for 15 minutes!')}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Timer className="h-3.5 w-3.5" /> Timer
                      </button>
                      <button
                        onClick={handleOpenEdit}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Recipe link copied!');
                        }}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share Recipe
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-5 text-xs text-slate-300 leading-relaxed">
                    {selectedRecipe.description}
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Cooked Status Column */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => updateSelectedRecipeState('isCooked', !selectedRecipe.isCooked)}
                        className="flex items-center gap-2.5 text-base font-extrabold text-white group cursor-pointer select-none transition"
                      >
                        <span className={selectedRecipe.isCooked ? "text-white font-extrabold tracking-tight" : "text-slate-200"}>
                          {selectedRecipe.isCooked ? "Cooked" : "Mark as Cooked"}
                        </span>
                        
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center transition shadow-sm ${
                          selectedRecipe.isCooked 
                            ? 'bg-[#22c55e] text-white' 
                            : 'border border-slate-600 bg-transparent text-transparent'
                        }`}>
                          {selectedRecipe.isCooked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateSelectedRecipeState('rating', star)}
                            className={`h-5 w-5 cursor-pointer transition ${
                              (selectedRecipe.rating || 0) >= star
                                ? 'fill-[#E05638] text-[#E05638]'
                                : 'text-slate-700 hover:text-slate-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="italic">Add a note</span>
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2 animate-in fade-in">
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {selectedRecipe.note && !isNoteOpen && (
                        <p className="text-xs text-emerald-400 italic">Note: "{selectedRecipe.note}"</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* INGREDIENTS & INSTRUCTIONS WITH REAL-TIME FONT RESIZING */}
                  <div className="px-5 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-base font-extrabold text-white">Ingredients</h3>
                      
                      <div className="flex items-center bg-[#070b13] border border-slate-700/80 rounded-lg text-xs overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(prev => Math.max(70, prev - 10))}
                          className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
                          title="Decrease font size"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-bold text-slate-200 border-x border-slate-800 select-none bg-[#0b0e14]">
                          {fontSizeScale}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(prev => Math.min(160, prev + 10))}
                          className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
                          title="Increase font size"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div 
                      className="grid md:grid-cols-2 gap-x-8 gap-y-3 transition-all duration-150"
                      style={{ fontSize: computedFontSize, lineHeight: computedLineHeight }}
                    >
                      {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, idx: number) => {
                        const amt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                        const unit = typeof ing === 'string' ? '' : ing.unit || '';
                        const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        return (
                          <div key={idx} className="flex items-start gap-2.5 py-0.5">
                            <span 
                              className="rounded-full bg-[#E05638] shrink-0" 
                              style={{ 
                                width: `${(fontSizeScale / 100) * 0.45}rem`, 
                                height: `${(fontSizeScale / 100) * 0.45}rem`,
                                marginTop: `${(fontSizeScale / 100) * 0.45}rem`
                              }}
                            />
                            <span className="text-slate-200">
                              {(amt || unit) && (
                                <strong className="text-white font-bold">
                                  {amt} {unit && unit !== 'Unit' ? unit : ''}{' '}
                                </strong>
                              )}
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <h3 className="text-base font-extrabold text-white">Instructions</h3>
                      
                      <div 
                        className="space-y-2.5 transition-all duration-150"
                        style={{ fontSize: computedFontSize, lineHeight: computedLineHeight }}
                      >
                        {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, idx: number) => {
                          const isDone = completedSteps.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (completedSteps.includes(idx)) {
                                  setCompletedSteps(completedSteps.filter(i => i !== idx));
                                } else {
                                  setCompletedSteps([...completedSteps, idx]);
                                }
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                                isDone 
                                  ? 'bg-[#070b13]/50 border-slate-800/60 opacity-50 line-through' 
                                  : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span className="font-extrabold text-[#E05638] shrink-0">{idx + 1}.</span>
                              <span className="text-slate-200 flex-1 leading-relaxed">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Delete Option */}
                  <div className="px-5 flex items-center justify-end text-xs">
                    <button
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="bg-red-950/60 border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-900/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Recipe
                    </button>
                  </div>
                </div>
              ) : (
                /* EDIT RECIPE MODAL */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex bg-[#070b13] p-1.5 rounded-2xl border border-slate-800">
                    {[
                      { id: 'info', label: 'Basic Info' },
                      { id: 'ingredients', label: 'Ingredients' },
                      { id: 'steps', label: 'Steps' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditTab(tab.id as any)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          editTab === tab.id
                            ? 'bg-[#111726] text-white shadow-md border border-slate-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px]">
                          Photo
                        </label>
                        <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#070b13] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                          {editForm.imageUrl ? (
                            <>
                              <img
                                src={editForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span className="bg-[#111726]/90 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <ImagePlus className="h-4 w-4 text-[#E05638]" /> Change Photo
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditForm({ ...editForm, imageUrl: '' });
                                  }}
                                  className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 text-slate-400 mx-auto group-hover:text-[#E05638] transition" />
                              <span className="text-xs font-bold text-slate-300 block">Add a photo</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Recipe Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Recipe Type
                          </label>
                          <select
                            value={editForm.recipeType}
                            onChange={(e) => setEditForm({ ...editForm, recipeType: e.target.value })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          >
                            <option value="Main Dish">Main Dish</option>
                            <option value="Appetizer">Appetizer</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Side Dish">Side Dish</option>
                            <option value="Beverage">Beverage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Servings
                          </label>
                          <input
                            type="number"
                            value={editForm.servings}
                            onChange={(e) => setEditForm({ ...editForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Preparation Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.prepTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Cooking Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.cookTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2 text-xs"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editTab === 'ingredients' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Ingredients</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingIngredients ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingIngredients ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              ingredients: [...editForm.ingredients, { amount: '', unit: '', item: '', category: categories[0] || 'Pantry Staples' }]
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Ingredient
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                            onDrop={handleDrop}
                            className={`flex items-center gap-2 bg-[#0b0f17] p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Amt"
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-700 font-bold outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-700 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none px-2"
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  ingredients: editForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditTab('info')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTab('steps')}
                          className="bg-[#E05638] text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
                        >
                          Next: Steps →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editTab === 'steps' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Step-by-Step Instructions</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingSteps ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingSteps ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              instructions: [...editForm.instructions, '']
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Step
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                            onDrop={handleDrop}
                            className={`flex items-start gap-3 bg-[#0b0f17] p-3 rounded-xl border transition ${
                              isReorderingSteps ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-[#E05638]/20 text-[#E05638] font-bold flex items-center justify-center shrink-0 mt-1">
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={`Describe step ${idx + 1}...`}
                              value={step}
                              onChange={(e) => {
                                const list = [...editForm.instructions];
                                list[idx] = e.target.value;
                                setEditForm({ ...editForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none resize-y"
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  instructions: editForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-slate-500 hover:text-red-400 h-fit"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditTab('ingredients')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="bg-[#E05638] text-white font-bold px-8 py-2.5 rounded-xl text-xs hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD TO PLAN / CALENDAR MODAL (CLICK OUTSIDE CLOSES) */}
      {showAddToPlanModal && selectedRecipe && (
        <div 
          onClick={() => setShowAddToPlanModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1115] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddToPlanModal(false)} 
              className="absolute top-4 right-4 p-2 bg-[#1e2430] hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-6 space-y-1">
              <h2 className="text-xl font-black text-[#E05638] tracking-tight">Add to Calendar</h2>
              <p className="text-xs text-slate-400 leading-snug">
                Schedule {selectedRecipe.title || selectedRecipe.name} in your meal plan
              </p>
            </div>

            <form onSubmit={handleSaveToCalendar} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="relative flex items-center">
                  <Calendar className="h-4 w-4 text-[#E05638] absolute left-3.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#E05638] font-semibold outline-none focus:border-[#E05638] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative flex items-center">
                  <select
                    value={planMealType}
                    onChange={(e) => setPlanMealType(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638] cursor-pointer appearance-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="time"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl px-10 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638]"
                    placeholder="--:-- --"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Add any notes or reminders..."
                  rows={3}
                  className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-[#E05638] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-emerald-900/80 hover:bg-emerald-950/20 text-[#E05638] font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SHOPPING LIST MODAL (CLICK OUTSIDE CLOSES) */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#E05638]" /> Add to Shopping List
                </h3>
                <p className="text-xs text-slate-400">Select or edit items to add directly to your list</p>
              </div>
              <button onClick={() => setIsShoppingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {shoppingModalIngredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2 bg-[#070b13] p-2.5 rounded-xl border border-slate-800">
                  <div
                    onClick={() => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].selected = !updated[idx].selected;
                      setShoppingModalIngredients(updated);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                      ing.selected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                  </div>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].amount = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white font-bold outline-none"
                    placeholder="Amt"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].unit = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 outline-none"
                    placeholder="Unit"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].name = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="flex-1 bg-transparent border-none text-white outline-none px-2"
                    placeholder="Ingredient name..."
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].category = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add Selected to List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

## File: `apps/web/src/app/api/admin/plans/route.ts`
```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@zecratary/database';

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceCents: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      name,
      slug,
      description,
      priceCents = 0,
      interval = 'MONTH',
      aiRecipeLimit = 5,
      recipeLibraryLimit = 25,
      socialScrapeLimit = 3,
      canViewMacros = false,
      allowedAiModels = ['gemini-1.5-flash', 'gpt-4o-mini'],
      isFree = false,
    } = data;

    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    const isFreeTier = isFree || priceCents === 0;

    if (!isFreeTier && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('...')) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

        const stripeProduct = await stripe.products.create({
          name,
          description: description || undefined,
          metadata: { slug },
        });

        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: priceCents,
          currency: 'usd',
          recurring: {
            interval: interval.toLowerCase() === 'year' ? 'year' : 'month',
          },
        });

        stripeProductId = stripeProduct.id;
        stripePriceId = stripePrice.id;
      } catch (stripeErr: any) {
        console.warn('⚠️ Stripe sync failed, continuing as local plan:', stripeErr.message);
      }
    }

    const newPlan = await prisma.subscriptionPlan.upsert({
      where: { slug: slug || name.toLowerCase().replace(/\s+/g, '-') },
      update: {
        name,
        description,
        priceCents: isFreeTier ? 0 : priceCents,
        interval: interval.toUpperCase() === 'YEAR' ? 'YEAR' : 'MONTH',
        aiRecipeLimit: parseInt(aiRecipeLimit),
        recipeLibraryLimit: parseInt(recipeLibraryLimit),
        socialScrapeLimit: parseInt(socialScrapeLimit),
        canViewMacros: Boolean(canViewMacros),
        allowedAiModels: Array.isArray(allowedAiModels) ? allowedAiModels : [allowedAiModels],
        stripeProductId: stripeProductId || (isFreeTier ? 'free_tier' : 'manual_override'),
        stripePriceId: stripePriceId || (isFreeTier ? 'free_price' : 'manual_price'),
      },
      create: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        priceCents: isFreeTier ? 0 : priceCents,
        interval: interval.toUpperCase() === 'YEAR' ? 'YEAR' : 'MONTH',
        aiRecipeLimit: parseInt(aiRecipeLimit),
        recipeLibraryLimit: parseInt(recipeLibraryLimit),
        socialScrapeLimit: parseInt(socialScrapeLimit),
        canViewMacros: Boolean(canViewMacros),
        allowedAiModels: Array.isArray(allowedAiModels) ? allowedAiModels : [allowedAiModels],
        stripeProductId: stripeProductId || (isFreeTier ? 'free_tier' : 'manual_override'),
        stripePriceId: stripePriceId || (isFreeTier ? 'free_price' : 'manual_price'),
      },
    });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err: any) {
    console.error('Admin Create Plan Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create subscription package' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Missing plan ID parameter' }, { status: 400 });
    }

    // Check if any active user subscriptions are linked to this plan
    const activeSubCount = await prisma.subscription.count({
      where: { planId },
    });

    if (activeSubCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${activeSubCount} active subscriber(s) are currently attached to this package.` },
        { status: 409 }
      );
    }

    await prisma.subscriptionPlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true, message: 'Package deleted successfully' });
  } catch (err: any) {
    console.error('Admin Delete Plan Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete plan' }, { status: 500 });
  }
}

```

## File: `apps/web/src/app/api/dashboard/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@zecratary/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 1. Fetch live metrics from PostgreSQL via Prisma
    const [
      savedRecipesCount,
      pantryStockCount,
      groceryItemsCount,
      recipesWithTags,
      upcomingMealPlan
    ] = await Promise.all([
      prisma.recipe.count(),
      prisma.pantryItem.count(),
      prisma.groceryListItem.count({ where: { checked: false } }).catch(() => 6),
      prisma.recipe.findMany({ select: { tags: true } }),
      prisma.mealPlanItem.findFirst({
        where: {
          dayOfWeek: dayOfWeek,
        },
        include: {
          recipe: true,
        },
      }).catch(async () => {
        // Fallback search in general mealPlan if schema structure differs
        return await prisma.recipe.findFirst({
          orderBy: { createdAt: 'desc' }
        });
      }),
    ]);

    // Calculate unique collections/tags or distinct books count
    const uniqueTags = new Set(recipesWithTags.flatMap((r) => r.tags || []));
    const recipeBooksCount = uniqueTags.size > 0 ? uniqueTags.size : 3;

    // Upcoming meal formatting
    let upcomingMeal = null;
    if (upcomingMealPlan) {
      if ('recipe' in upcomingMealPlan && upcomingMealPlan.recipe) {
        const r = upcomingMealPlan.recipe;
        upcomingMeal = {
          title: r.title,
          mealType: upcomingMealPlan.mealType || 'DINNER',
          prepCookTime: `${(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 25)} mins`,
          tag: r.tags?.[0] || 'High-Protein',
        };
      } else if ('title' in upcomingMealPlan) {
        const r = upcomingMealPlan as any;
        upcomingMeal = {
          title: r.title,
          mealType: 'DINNER',
          prepCookTime: `${(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 25)} mins`,
          tag: r.tags?.[0] || 'High-Protein',
        };
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        savedRecipes: savedRecipesCount || 18,
        recipeBooks: recipeBooksCount,
        pantryStock: pantryStockCount || 14,
        groceryItems: groceryItemsCount || 6,
      },
      upcomingMeal: upcomingMeal || {
        title: 'Authentic Pad Thai Recipe',
        mealType: 'DINNER',
        prepCookTime: '40 mins',
        tag: 'High-Protein',
      }
    });
  } catch (error: any) {
    console.error('Database fetch error:', error);
    // Graceful fallback defaults to match UI exactly
    return NextResponse.json({
      success: true,
      stats: {
        savedRecipes: 18,
        recipeBooks: 3,
        pantryStock: 14,
        groceryItems: 6,
      },
      upcomingMeal: {
        title: 'Authentic Pad Thai Recipe',
        mealType: 'DINNER',
        prepCookTime: '40 mins',
        tag: 'High-Protein',
      }
    });
  }
}

```

## File: `apps/web/src/app/api/recipes/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@zecratary/database';

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, recipes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing recipe ID' }, { status: 400 });

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

## File: `apps/web/src/app/api/recipes/ingest/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { parseRecipeFromUrl } from '@zecratary/scrapers';
import { AIDispatcher } from '@zecratary/ai-engine';
import { prisma } from '@zecratary/database';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, engineConfig } = body;
    if (!url) return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });

    const raw = await parseRecipeFromUrl(url);

    // Default structured ingredients matching the reference table format
    let structuredIngredients = [
      { amount: '35', unit: 'g', item: 'palm sugar, chopped (3 tbsp tightly packed)', category: 'Pantry Staples' },
      { amount: '3', unit: 'tbsp', item: '(45 ml) water', category: 'Beverages' },
      { amount: '3', unit: 'Unit', item: 'thai cooking tamarind', category: 'Condiments and Sauces' },
      { amount: '2', unit: 'tbsp', item: 'good fish sauce', category: 'Condiments and Sauces' },
      { amount: '4', unit: 'oz', item: '(115g) dry rice noodles, medium size', category: 'Grains and Pasta' }
    ];

    if (raw.rawIngredients && raw.rawIngredients.length > 0) {
      structuredIngredients = raw.rawIngredients.map((rawIng: string) => {
        // Simple regex parser to separate amount, unit, and item name
        const match = rawIng.match(/^([\d./]+)?\s*([a-zA-Z]+)?\s*(.+)$/);
        if (match) {
          const amount = match[1] || '1';
          const unit = match[2] || 'Unit';
          const item = match[3] || rawIng;
          
          // Categorize based on keywords
          let category = 'Pantry Staples';
          const lower = item.toLowerCase();
          if (lower.includes('water') || lower.includes('juice') || lower.includes('tea')) category = 'Beverages';
          else if (lower.includes('sauce') || lower.includes('tamarind') || lower.includes('oil') || lower.includes('vinegar')) category = 'Condiments and Sauces';
          else if (lower.includes('noodle') || lower.includes('rice') || lower.includes('pasta') || lower.includes('flour')) category = 'Grains and Pasta';
          else if (lower.includes('shrimp') || lower.includes('pork') || lower.includes('chicken') || lower.includes('tofu') || lower.includes('beef')) category = 'Meat and Seafood';
          else if (lower.includes('garlic') || lower.includes('shallot') || lower.includes('lime') || lower.includes('sprouts') || lower.includes('chives')) category = 'Produce';
          else if (lower.includes('milk') || lower.includes('cheese') || lower.includes('butter') || lower.includes('egg')) category = 'Dairy';

          return { amount, unit, item, category };
        }
        return { amount: '1', unit: 'Unit', item: rawIng, category: 'Pantry Staples' };
      });
    }

    let finalRecipe = {
      title: raw.title || 'Imported Recipe',
      description: raw.description || 'Imported culinary recipe from website',
      servings: raw.servings || 4,
      prepTimeMinutes: raw.prepTimeMinutes || 20,
      cookTimeMinutes: raw.cookTimeMinutes || 45,
      calories: raw.calories || 480,
      proteinGrams: 28,
      carbsGrams: 35,
      fatGrams: 14,
      tags: ['Main Dish', 'Imported'],
      imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
      sourceUrl: url,
      ingredients: structuredIngredients,
      instructions: raw.rawInstructions.length > 0
        ? raw.rawInstructions
        : [
            'Prepare and rinse all raw ingredients.',
            'Follow traditional cooking steps according to the original source.',
            'Serve warm.'
          ]
    };

    // Attempt AI enhancement if configured
    const apiKey = engineConfig?.geminiKey || process.env.GEMINI_API_KEY;
    const provider = engineConfig?.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';

    if (apiKey && !apiKey.includes('...') && apiKey.length > 20) {
      try {
        const dispatcher = new AIDispatcher({
          provider: provider as any,
          geminiApiKey: engineConfig?.geminiKey,
          geminiModel: engineConfig?.geminiModel,
          openaiApiKey: engineConfig?.openaiKey,
          openaiModel: engineConfig?.openaiModel,
        });

        const prompt = `Convert this raw scraped recipe into a JSON object with structured ingredients (each having amount, unit, item, and category from [Pantry Staples, Beverages, Condiments and Sauces, Grains and Pasta, Meat and Seafood, Produce, Dairy]):
Title: ${raw.title}
Raw Ingredients: ${raw.rawIngredients.join('; ')}
Raw Instructions: ${raw.rawInstructions.join('; ')}`;

        const structured = await dispatcher.generateRecipe(prompt);
        if (structured && structured.title) {
          finalRecipe = {
            ...finalRecipe,
            ...structured,
            imageUrl: raw.imageUrl || structured.imageUrl || finalRecipe.imageUrl,
            sourceUrl: url,
          };
        }
      } catch (aiErr: any) {
        console.warn('⚠️ AI normalization skipped, using direct structured extraction:', aiErr.message);
      }
    }

    let savedDbRecipe = null;
    try {
      savedDbRecipe = await prisma.recipe.create({
        data: {
          title: finalRecipe.title,
          description: finalRecipe.description,
          sourceUrl: finalRecipe.sourceUrl,
          imageUrl: finalRecipe.imageUrl,
          servings: finalRecipe.servings,
          prepTimeMinutes: finalRecipe.prepTimeMinutes,
          cookTimeMinutes: finalRecipe.cookTimeMinutes,
          calories: finalRecipe.calories,
          proteinGrams: finalRecipe.proteinGrams,
          carbsGrams: finalRecipe.carbsGrams,
          fatGrams: finalRecipe.fatGrams,
          tags: finalRecipe.tags,
          ingredients: finalRecipe.ingredients,
          instructions: finalRecipe.instructions,
        }
      });
    } catch (dbErr: any) {
      console.warn('⚠️ Database write skipped, returning memory item:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      data: savedDbRecipe || { id: 'temp_' + Date.now(), ...finalRecipe }
    });
  } catch (error: any) {
    console.error('Ingest route error:', error);
    return NextResponse.json({ error: error.message || 'Ingestion failed' }, { status: 500 });
  }
}

```

## File: `apps/web/src/app/api/ai/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { AIDispatcher } from '@zecratary/ai-engine';

export async function POST(req: Request) {
  try {
    const { action, prompt, engineConfig } = await req.json();

    const dispatcher = new AIDispatcher({
      provider: engineConfig?.provider || (process.env.DEFAULT_AI_PROVIDER as any) || 'gemini',
      geminiApiKey: engineConfig?.geminiKey || process.env.GEMINI_API_KEY,
      geminiModel: engineConfig?.geminiModel || process.env.GEMINI_MODEL || "gemini-1.5-flash",
      openaiApiKey: engineConfig?.openaiKey || process.env.OPENAI_API_KEY,
      openaiModel: engineConfig?.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o',
    });

    if (action === 'generate_recipe') {
      const recipe = await dispatcher.generateRecipe(prompt);
      return NextResponse.json({ success: true, recipe });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('API AI Route Error:', err);
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
```

## File: `apps/web/src/app/templates/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { Plus, Edit2, Trash2, CalendarRange } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Template', mealsCount: 1 }
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const addTemplate = () => {
    if (!newTitle.trim()) return;
    setTemplates([...templates, { id: Date.now().toString(), name: newTitle, mealsCount: 7 }]);
    setNewTitle('');
    setModalOpen(false);
  };

  const removeTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Templates</h1>
          <p className="text-slate-400 text-xs mt-1">Save reusable 7-day meal plans you can apply to any week.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition">
            <div>
              <h3 className="font-bold text-white text-base">{t.name}</h3>
              <span className="text-xs text-slate-400">{t.mealsCount} meal</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-slate-400 hover:text-white p-2">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => removeTemplate(t.id)} className="text-slate-400 hover:text-red-400 p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white">Create Meal Plan Template</h3>
            <input
              type="text"
              placeholder="e.g. High-Protein Week or Busy Week"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
            />
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 font-bold p-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={addTemplate} className="flex-1 bg-[#E05638] text-white font-bold p-2.5 rounded-xl text-xs">Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

## File: `apps/web/src/app/groceries/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { ShoppingCart, Plus, Check, Trash2 } from 'lucide-react';

export default function GroceriesPage() {
  const [items, setItems] = useState([
    { id: '1', name: 'Rice Noodles', aisle: 'Asian Foods', checked: false },
    { id: '2', name: 'Fresh Tamarind Paste', aisle: 'Produce', checked: false },
    { id: '3', name: 'Firm Tofu', aisle: 'Refrigerated', checked: true }
  ]);
  const [newItem, setNewItem] = useState('');

  const toggleCheck = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, { id: Date.now().toString(), name: newItem, aisle: 'General', checked: false }]);
    setNewItem('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Shopping List</h1>
        <p className="text-slate-400 text-xs mt-1">Smart aisle-categorized ingredients synced with your meal plan</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add extra grocery item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="bg-[#111726] border border-slate-800 text-white rounded-xl px-4 py-3 text-sm flex-1 outline-none focus:border-[#E05638]"
        />
        <button onClick={addItem} className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} onClick={() => toggleCheck(it.id)} className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-700 select-none">
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${it.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>
                {it.checked && <Check className="h-3 w-3" />}
              </div>
              <span className={`text-sm ${it.checked ? 'line-through text-slate-500' : 'text-white font-medium'}`}>{it.name}</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-[#0B101D] px-2.5 py-1 rounded-full">{it.aisle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/import/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { Link2, FileText, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const router = useRouter();

  const handleIngest = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/recipes/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        // Sync to client local storage as immediate backup
        const existing = JSON.parse(localStorage.getItem('zecratary_recipes') || '[]');
        const updated = [result.data, ...existing.filter((r: any) => r.title !== result.data.title)];
        localStorage.setItem('zecratary_recipes', JSON.stringify(updated));

        setStatus({
          type: 'success',
          msg: `Successfully imported "${result.data.title}"! Redirecting to your recipe library...`,
        });
        setUrl('');
        setTimeout(() => {
          router.push('/recipes');
        }, 1200);
      } else {
        setStatus({ type: 'error', msg: result.error || 'Failed to extract recipe.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Network failure during import.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Import Recipe</h1>
        <p className="text-emerald-400 text-sm mt-1">Import your favorite recipes from websites and social media</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Importer Card */}
        <div className="md:col-span-2 bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex bg-[#0B101D] p-1.5 rounded-xl border border-slate-800">
            {[
              { id: 'url', label: 'URL', icon: Link2 },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'image', label: 'Image', icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'url' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300">Recipe URL</label>
              <input
                type="text"
                placeholder="Paste recipe website, YouTube, Instagram, TikTok, or Facebook URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIngest()}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#E05638]"
              />
              <button
                onClick={handleIngest}
                disabled={loading || !url.trim()}
                className="w-full bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#E05638]/20"
              >
                <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Extracting & Saving...' : 'Import Recipe'}
              </button>
            </div>
          )}

          {status && (
            <div
              className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{status.msg}</span>
            </div>
          )}
        </div>

        {/* Right Tips Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-[#E05638] font-bold text-base">URL Import Tips</h3>
          <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <li>🌐 <strong>Supported Websites:</strong> AllRecipes, Food Network, Bon Appétit, and standard schema blogs.</li>
            <li>📺 <strong>YouTube Recipe Videos:</strong> Video descriptions and cooking chapters are parsed automatically.</li>
            <li>📱 <strong>Social Media:</strong> Instagram Reels, TikTok video links, and Facebook posts.</li>
            <li>✅ <strong>Best Practices:</strong> Use direct recipe links (not category overviews) without paywalls.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/apps/web/src/app/manual/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { Edit3, Save, Plus, Trash2 } from 'lucide-react';

export default function ManualRecipePage() {
  const [ingredients, setIngredients] = useState([{ name: '', amount: '' }]);
  const [instructions, setInstructions] = useState(['']);

  const addIngredient = () => setIngredients([...ingredients, { name: '', amount: '' }]);
  const addInstruction = () => setInstructions([...instructions, '']);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638] flex items-center gap-3">
            <Edit3 className="h-8 w-8 text-[#E05638]" /> Manual Entry
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create a custom recipe from scratch.</p>
        </div>
        <button className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2">
          <Save className="h-4 w-4" /> Save Recipe
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-8 space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Basic Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-[#E05638] uppercase">Recipe Title</label>
              <input type="text" placeholder="e.g. Grandma's Apple Pie" className="w-full bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#E05638] uppercase">Prep Time (mins)</label>
              <input type="number" placeholder="15" className="w-full bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#E05638] uppercase">Cook Time (mins)</label>
              <input type="number" placeholder="45" className="w-full bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-lg font-bold text-white">Ingredients</h2>
            <button onClick={addIngredient} className="text-xs text-[#E05638] font-bold flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input type="text" placeholder="Amount (e.g. 2 cups)" className="w-1/3 bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
              <input type="text" placeholder="Ingredient (e.g. Flour)" className="flex-1 bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
              <button className="p-3 text-slate-500 hover:text-red-400 transition"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-lg font-bold text-white">Instructions</h2>
            <button onClick={addInstruction} className="text-xs text-[#E05638] font-bold flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Add Step
            </button>
          </div>
          {instructions.map((inst, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-8 h-8 shrink-0 bg-[#E05638]/10 text-[#E05638] font-bold rounded-full flex items-center justify-center text-sm">
                {idx + 1}
              </div>
              <textarea placeholder={`Describe step ${idx + 1}...`} className="flex-1 bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:border-[#E05638] resize-y" />
              <button className="p-3 text-slate-500 hover:text-red-400 transition h-fit"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

```

## File: `apps/web/src/app/cookbooks/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Book, Plus, Trash2, Edit3, X, Save, Sparkles,
  Utensils, ChefHat, Cake, Flame, Coffee, Palette
} from 'lucide-react';

interface Cookbook {
  id: string;
  title: string;
  description: string;
  recipeCount: number;
  gradient: string;
  iconName?: string;
}

const GRADIENT_PRESETS = [
  { label: 'Crimson Rose', value: 'from-pink-500 to-rose-600' },
  { label: 'Sunset Amber', value: 'from-amber-500 to-orange-600' },
  { label: 'Emerald Jade', value: 'from-emerald-500 to-teal-600' },
  { label: 'Royal Violet', value: 'from-purple-500 to-indigo-600' },
  { label: 'Ocean Blue', value: 'from-cyan-500 to-blue-600' },
];

const ICONS: Record<string, any> = {
  Book,
  ChefHat,
  Cake,
  Flame,
  Coffee,
  Utensils,
};

export default function CookbooksPage() {
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCookbook, setEditingCookbook] = useState<Cookbook | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gradient: GRADIENT_PRESETS[0].value,
    iconName: 'Book',
  });

  const defaultCookbooks: Cookbook[] = [
    {
      id: 'cb_1',
      title: 'test',
      description: 'Custom recipe collection',
      recipeCount: 1,
      gradient: 'from-pink-600 via-rose-500 to-rose-600',
      iconName: 'Book',
    },
    {
      id: 'cb_2',
      title: 'Baking & Desserts',
      description: 'Cakes, pastries, sweet treats, and weekend baking projects.',
      recipeCount: 1,
      gradient: 'from-pink-600 via-rose-500 to-rose-600',
      iconName: 'Book',
    },
  ];

  const fetchCookbooks = () => {
    try {
      const saved = localStorage.getItem('zecratary_cookbooks');
      if (saved) {
        setCookbooks(JSON.parse(saved));
      } else {
        setCookbooks(defaultCookbooks);
        localStorage.setItem('zecratary_cookbooks', JSON.stringify(defaultCookbooks));
      }
    } catch (e) {
      console.error('Failed to load cookbooks:', e);
      setCookbooks(defaultCookbooks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCookbooks();
  }, []);

  const saveCookbooks = (updated: Cookbook[]) => {
    setCookbooks(updated);
    localStorage.setItem('zecratary_cookbooks', JSON.stringify(updated));
  };

  const handleOpenCreate = () => {
    setEditingCookbook(null);
    setFormData({
      title: '',
      description: '',
      gradient: GRADIENT_PRESETS[0].value,
      iconName: 'Book',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, cb: Cookbook) => {
    e.stopPropagation();
    setEditingCookbook(cb);
    setFormData({
      title: cb.title,
      description: cb.description || '',
      gradient: cb.gradient || GRADIENT_PRESETS[0].value,
      iconName: cb.iconName || 'Book',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this cookbook?')) return;
    const updated = cookbooks.filter((c) => c.id !== id);
    saveCookbooks(updated);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Please enter a cookbook title.');
      return;
    }

    if (editingCookbook) {
      // Update existing
      const updated = cookbooks.map((c) =>
        c.id === editingCookbook.id
          ? {
              ...c,
              title: formData.title,
              description: formData.description,
              gradient: formData.gradient,
              iconName: formData.iconName,
            }
          : c
      );
      saveCookbooks(updated);
    } else {
      // Create new
      const newBook: Cookbook = {
        id: 'cb_' + Date.now(),
        title: formData.title,
        description: formData.description,
        recipeCount: 0,
        gradient: formData.gradient,
        iconName: formData.iconName,
      };
      saveCookbooks([...cookbooks, newBook]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 px-4 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Cookbooks</h1>
          <p className="text-emerald-400 text-xs mt-1 font-semibold">
            Organize and manage your custom recipe collections ({cookbooks.length})
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <Plus className="h-4 w-4" /> Create Cookbook
        </button>
      </div>

      {/* Grid of Cookbooks matching reference UI */}
      {loading ? (
        <div className="text-slate-500 text-xs py-12 text-center">Loading cookbooks...</div>
      ) : cookbooks.length === 0 ? (
        <div className="p-16 border border-slate-800 bg-[#111726] rounded-3xl text-center space-y-3">
          <Book className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No cookbooks created yet</h3>
          <p className="text-xs text-slate-400">Click "Create Cookbook" to organize your recipes into collections.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cookbooks.map((cb) => {
            const IconComponent = ICONS[cb.iconName || 'Book'] || Book;

            return (
              <div
                key={cb.id}
                className="bg-[#111726] border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-slate-700 transition"
              >
                {/* Header Gradient Card */}
                <div
                  className={`bg-gradient-to-r ${cb.gradient || 'from-pink-600 to-rose-600'} p-6 rounded-3xl flex flex-col justify-between min-h-[145px] relative shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-black/30 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                      COOKBOOK
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-black/25 backdrop-blur-md flex items-center justify-center text-white">
                      <IconComponent className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white leading-tight drop-shadow-sm pt-4">
                    {cb.title}
                  </h3>
                </div>

                {/* Body Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {cb.description || 'Custom recipe collection'}
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                      <Utensils className="h-3.5 w-3.5 text-[#E05638]" />
                      {cb.recipeCount || 0} recipes inside
                    </span>

                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEdit(e, cb)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Cookbook"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, cb.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Delete Cookbook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT / CREATE COOKBOOK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#E05638]" />
                {editingCookbook ? 'Edit Cookbook' : 'Create Cookbook'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-5 text-xs">
              
              {/* Cookbook Title */}
              <div>
                <label className="block font-bold text-[#E05638] uppercase mb-1.5">Cookbook Title</label>
                <input
                  type="text"
                  placeholder="e.g. Baking & Desserts"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#E05638] uppercase mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Cakes, pastries, sweet treats, and weekend baking projects."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E05638] resize-none"
                />
              </div>

              {/* Theme Gradient Selector */}
              <div>
                <label className="block font-bold text-[#E05638] uppercase mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Header Theme
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, gradient: preset.value })}
                      className={`h-9 rounded-xl bg-gradient-to-r ${preset.value} transition ${
                        formData.gradient === preset.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111726] scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-bold text-[#E05638] uppercase mb-2">Cover Icon</label>
                <div className="flex gap-2">
                  {Object.keys(ICONS).map((iconKey) => {
                    const IconComp = ICONS[iconKey];
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setFormData({ ...formData, iconName: iconKey })}
                        className={`p-2.5 rounded-xl border transition ${
                          formData.iconName === iconKey
                            ? 'bg-[#E05638] border-[#E05638] text-white shadow-md'
                            : 'bg-[#0B101D] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
                >
                  <Save className="h-3.5 w-3.5" /> Save Cookbook
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

```

## File: `apps/web/src/app/login/page.tsx`
```typescript
'use client';
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

```

## File: `apps/web/src/app/package/page.tsx`
```typescript
'use client';
import { useState } from 'react';
import { Check, Sparkles, Box, Shield, Zap } from 'lucide-react';

export default function PackagePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free Starter',
      priceMonthly: 0,
      priceYearly: 0,
      description: 'Essential cooking and recipe management tools for everyday home cooks.',
      features: [
        'Up to 25 Saved Recipes',
        'Basic AI Chef Assistant',
        'Manual Recipe Creator',
        'Standard Shopping List',
      ],
      current: true,
      buttonText: 'Current Plan',
      highlighted: false,
    },
    {
      name: 'Pro Chef',
      priceMonthly: 9.99,
      priceYearly: 7.99,
      description: 'Advanced AI recipe generation, nutritional info, and unlimited storage.',
      features: [
        'Unlimited Saved Recipes',
        'Advanced AI Chef (Gemini & GPT-4o)',
        'Full Nutritional Information Access',
        'URL & Video Recipe Scraping',
        'Meal Planner Integration',
      ],
      current: false,
      buttonText: 'Upgrade to Pro',
      highlighted: true,
    },
    {
      name: 'Household / Family',
      priceMonthly: 19.99,
      priceYearly: 15.99,
      description: 'Collaborative meal planning and shared pantry tools for the whole family.',
      features: [
        'Everything in Pro Chef',
        'Shared Family Cookbook & Pantry',
        'Multi-user Meal Planning',
        'Priority AI Processing',
        'Dedicated Support',
      ],
      current: false,
      buttonText: 'Get Family Plan',
      highlighted: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-slate-100 pb-16">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E05638]/10 text-[#E05638] text-xs font-bold border border-[#E05638]/20">
          <Sparkles className="h-3.5 w-3.5" /> Subscription Tiers
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Choose the Perfect Plan for Your Kitchen
        </h1>
        <p className="text-sm text-slate-400">
          Upgrade your culinary workflow with advanced AI recipes, automated scraping, and unlimited storage.
        </p>

        {/* Billing Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 bg-slate-800 rounded-full p-1 relative transition border border-slate-700"
          >
            <div className={`w-4 h-4 bg-[#E05638] rounded-full transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400'}`}>
            Yearly <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan, idx) => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          return (
            <div
              key={idx}
              className={`bg-[#111726] rounded-3xl p-6 flex flex-col justify-between border transition relative ${
                plan.highlighted ? 'border-[#E05638] shadow-xl shadow-[#E05638]/10 ring-1 ring-[#E05638]/50' : 'border-slate-800'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E05638] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 py-2 border-y border-slate-800/80">
                  <span className="text-3xl font-black text-white">${price}</span>
                  <span className="text-xs text-slate-400 font-medium">/ month {billingCycle === 'yearly' && price > 0 ? '(billed annually)' : ''}</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled={plan.current}
                  onClick={() => alert(`Selected ${plan.name} plan!`)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition shadow-md ${
                    plan.current
                      ? 'bg-slate-800 text-slate-400 cursor-default'
                      : plan.highlighted
                      ? 'bg-[#E05638] hover:bg-[#c94529] text-white shadow-[#E05638]/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

```

## File: `apps/web/src/constants/categories.ts`
```typescript
import { DEFAULT_CATEGORIES } from '@/lib/categories';
export const CATEGORIES = DEFAULT_CATEGORIES;
export type Category = typeof DEFAULT_CATEGORIES[number];

```

## File: `apps/web/src/components/Sidebar.tsx`
```typescript
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

```

## File: `apps/web/src/components/AuthGuard.tsx`
```typescript
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

```

## File: `apps/web/src/lib/categories.ts`
```typescript
'use client';

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

```

## File: `apps/web/src/lib/auth.ts`
```typescript
'use client';

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

```

