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
import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodiePrep - AI Culinary Assistant & Meal Planner',
  description: 'Organize recipes, manage pantry inventory, and plan meals with AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f19] text-slate-100 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

```

## File: `apps/web/src/app/page.tsx`
```typescript
import Link from 'next/link';
import { ChefHat, Calendar, ShoppingCart, Carrot, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Autonomous culinary planning and pantry tracking.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Saved Recipes</span>
          <span className="text-3xl font-black text-[#E05638] mt-1 block">18</span>
        </div>
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Recipe Books</span>
          <span className="text-3xl font-black text-emerald-400 mt-1 block">3</span>
        </div>
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Pantry Stock</span>
          <span className="text-3xl font-black text-white mt-1 block">14</span>
        </div>
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Grocery Items</span>
          <span className="text-3xl font-black text-white mt-1 block">6</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#E05638]" /> Upcoming Meal
          </h2>
          <div className="p-4 bg-[#0B101D] border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase">Today • Dinner</span>
              <h3 className="font-bold text-white mt-0.5">Authentic Pad Thai Recipe</h3>
              <span className="text-xs text-slate-400">40 mins • High-Protein</span>
            </div>
            <Link href="/planner" className="text-xs text-[#E05638] font-bold hover:underline">View Planner</Link>
          </div>
        </div>

        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-emerald-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <Link href="/chef" className="p-3 bg-[#0B101D] border border-slate-800 rounded-xl hover:border-slate-700 text-center">
              Ask Chef AI
            </Link>
            <Link href="/recipes" className="p-3 bg-[#0B101D] border border-slate-800 rounded-xl hover:border-slate-700 text-center">
              Import Social URL
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
              <span className="text-[#E05638]">Foodie</span>
              <span className="text-emerald-500">Prep</span>
            </span>
          </div>

          {/* Main Dashboard Link */}
          <nav className="space-y-1">
            <Link
              href="/chef"
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
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Check, Utensils
} from 'lucide-react';

export default function PlannerPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-08-24'));
  const [selectedDate, setSelectedDate] = useState('2026-08-27');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);

  // Main Add Meal Modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('2026-08-27');
  
  // Modal Form states
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  // Sub-modal for selecting recipe
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');

  const loadSavedRecipes = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const keys = ['zecratary_recipes', 'saved_recipes', 'recipes', 'foodieprep_recipes'];
      let loaded: any[] = [];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((rec) => {
              if (rec && rec.name && !loaded.some(l => l.id === rec.id || l.name.toLowerCase() === rec.name.toLowerCase())) {
                loaded.push({
                  ...rec,
                  image: rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
                  category: rec.category || 'Main Dish'
                });
              }
            });
          }
        }
      }

      if (loaded.length === 0) {
        loaded = [
          {
            id: 'rec_1',
            name: 'Authentic Pad Thai Recipe',
            category: 'Main Dish',
            image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'rec_2',
            name: 'Simple Green Salad',
            category: 'Main Dish',
            image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
          }
        ];
        localStorage.setItem('zecratary_recipes', JSON.stringify(loaded));
      }

      setSavedRecipes(loaded);
    } catch (e) {
      console.error('Failed to load recipes', e);
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
          date: '2026-08-27',
          recipeName: 'Simple Green Salad',
          image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00',
          isLeftover: false,
          notes: ''
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
    }

    loadSavedRecipes();
  }, [loadSavedRecipes]);

  const openAddModal = (date: string) => {
    loadSavedRecipes();
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
    setIsLeftover(false);
    setNotes('');
    setShowRecipePicker(false);
    setShowAddMealModal(true);
  };

  const savePlan = (updated: any[]) => {
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeObj) {
      alert('Please select a recipe by clicking "+ Select Recipe".');
      return;
    }
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: activeDateForAdd || selectedDate,
      recipeId: selectedRecipeObj.id,
      recipeName: selectedRecipeObj.name,
      image: selectedRecipeObj.image,
      mealType: mealType,
      time: mealTime,
      isLeftover: isLeftover,
      notes: notes
    };
    savePlan([...plannedMeals, newMeal]);
    setShowAddMealModal(false);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = d.getDate();
    weekDays.push({ dateStr, dayName, dayNum, fullDate: d });
  }

  const todayStr = '2026-08-27';
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeDateObj = new Date(activeDateForAdd);
  const activeDateFormattedHeader = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const activeDateFieldText = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const filteredSavedRecipes = savedRecipes.filter(r => 
    !recipeSearch.trim() || r.name?.toLowerCase().includes(recipeSearch.toLowerCase().trim())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-24 px-4">
      
      {/* HEADER & ACTIONS */}
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
            onClick={() => window.location.href = '/shopping'}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
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

      {/* WEEK STRIP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
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
                const next = new Date(currentWeekStart);
                next.setDate(next.getDate() + 7);
                setCurrentWeekStart(next);
              }}
              className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentWeekStart(new Date('2026-08-24'))}
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
                onClick={() => setSelectedDate(d.dateStr)}
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

      {/* DAILY AVERAGE BANNER */}
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

      {/* SELECTED DATE MEALS */}
      {(() => {
        const dObj = new Date(selectedDate);
        const titleDate = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const isToday = selectedDate === todayStr;
        const dayMeals = plannedMeals.filter(m => m.date === selectedDate);

        return (
          <div className="bg-[#070b13] border border-emerald-950 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white">{titleDate}</h2>
                {isToday && (
                  <span className="bg-[#E05638] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    TODAY
                  </span>
                )}
              </div>
              <button
                onClick={() => openAddModal(selectedDate)}
                className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" /> Add Meal
              </button>
            </div>

            {dayMeals.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <ChefHat className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Nothing planned yet</p>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="inline-flex items-center gap-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add a meal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md gap-4">
                    <div className="flex items-center gap-3.5">
                      <img 
                        src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                        alt={meal.recipeName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0" 
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                            {meal.mealType}
                          </span>
                          {meal.isLeftover && (
                            <span className="bg-amber-950/60 border border-amber-600/40 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Leftover
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug">{meal.recipeName}</h3>
                        {meal.time && <span className="text-[11px] text-slate-400 flex items-center gap-1">⏰ {meal.time}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-[#070b13] rounded-xl border border-slate-800 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* EXACT REFERENCE MATCHING ADD MEAL POPUP */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs">
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* HEADER */}
            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight">
                Add Meal for {activeDateFormattedHeader}
              </h2>
              <p className="text-slate-400 text-xs">
                Plan your meal by selecting a recipe and adding details.
              </p>
            </div>

            <form onSubmit={handleAddMealSubmit} className="space-y-3.5 pt-1">
              
              {/* DATE FIELD */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="w-full bg-[#070b13] border-2 border-blue-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200">
                  {activeDateFieldText}
                </div>
              </div>

              {/* MEAL TYPE DROPDOWN */}
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
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                  </div>
                </div>
              </div>

              {/* TIME FIELD */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-3.5 w-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                    placeholder="--:-- --"
                  />
                  <Clock className="h-3.5 w-3.5 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* RECIPE SELECTION */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {selectedRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image} 
                        alt={selectedRecipeObj.name}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700" 
                      />
                      <span className="text-white font-bold text-xs truncate">{selectedRecipeObj.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowRecipePicker(true)}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRecipePicker(true)}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Select Recipe
                  </button>
                )}
              </div>

              {/* LEFTOVER TOGGLE SWITCH */}
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

              {/* NOTES */}
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

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2 rounded-lg border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECIPE PICKER SUB-MODAL */}
      {showRecipePicker && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-xs">
            <button 
              onClick={() => setShowRecipePicker(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-[#E05638]" /> Choose a Saved Recipe
            </h3>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search recipe..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {filteredSavedRecipes.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">No recipes found.</div>
              ) : (
                filteredSavedRecipes.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setSelectedRecipeObj(rec);
                      setShowRecipePicker(false);
                    }}
                    className="flex items-center gap-3 p-2.5 bg-[#070b13] hover:bg-[#111726] border border-slate-800 hover:border-[#E05638] rounded-xl cursor-pointer transition"
                  >
                    <img 
                      src={rec.image} 
                      alt={rec.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" 
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-xs truncate">{rec.name}</h4>
                      <span className="text-[10px] text-emerald-400">{rec.category || 'Main Dish'}</span>
                    </div>
                  </div>
                ))
              )}
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

## File: `apps/web/src/app/books/page.tsx`
```typescript
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Book, Plus, Utensils, Trash2, Heart, ExternalLink, ArrowRight, X, 
  Clock, Timer, Edit3, Share2, CheckSquare, Square, Star, CheckCircle2, Type, Lock, CalendarPlus, ShoppingCart, BookmarkPlus, Check
} from 'lucide-react';

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [selectedCoverColor, setSelectedCoverColor] = useState('from-orange-500 to-amber-600');
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  
  // Specific Recipe Popup State
  const [viewingRecipe, setViewingRecipe] = useState<any | null>(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [noteText, setNoteText] = useState('');
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const colorOptions = [
    { label: 'Orange', value: 'from-orange-500 to-amber-600', bgClass: 'bg-gradient-to-br from-orange-500 to-amber-600' },
    { label: 'Emerald', value: 'from-emerald-600 to-teal-800', bgClass: 'bg-gradient-to-br from-emerald-600 to-teal-800' },
    { label: 'Rose', value: 'from-rose-500 to-pink-700', bgClass: 'bg-gradient-to-br from-rose-500 to-pink-700' },
    { label: 'Purple', value: 'from-purple-600 to-indigo-800', bgClass: 'bg-gradient-to-br from-purple-600 to-indigo-800' },
    { label: 'Blue', value: 'from-blue-600 to-cyan-700', bgClass: 'bg-gradient-to-br from-blue-600 to-cyan-700' },
  ];

  const loadData = () => {
    const localBooks = localStorage.getItem('zecratary_recipe_books');
    const localRecipes = localStorage.getItem('zecratary_saved_recipes');
    
    let parsedRecipes = localRecipes ? JSON.parse(localRecipes) : [];
    setRecipes(parsedRecipes);

    if (localBooks) {
      let parsedBooks = JSON.parse(localBooks);
      parsedBooks = parsedBooks.map((b: any) => {
        const count = parsedRecipes.filter((r: any) => r.bookId === b.id).length;
        return { ...b, recipeCount: count };
      });
      setBooks(parsedBooks);
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(parsedBooks));
    } else {
      const defaultBooks = [
        {
          id: 'book_1',
          title: 'Family Favorites & Weeknight Dinners',
          description: 'Quick and easy meals loved by the entire family.',
          coverColor: 'from-orange-500 to-amber-600',
        },
        {
          id: 'book_2',
          title: 'Authentic Asian Cuisine',
          description: 'Traditional recipes, homemade curries, stir-fries, and noodles.',
          coverColor: 'from-emerald-600 to-teal-800',
        },
        {
          id: 'book_3',
          title: 'Baking & Desserts',
          description: 'Cakes, pastries, sweet treats, and weekend baking projects.',
          coverColor: 'from-rose-500 to-pink-700',
        },
      ];
      const withCounts = defaultBooks.map(b => ({
        ...b,
        recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
      }));
      setBooks(withCounts);
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(withCounts));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const newBook = {
      id: 'book_' + Date.now(),
      title: newBookTitle,
      description: newBookDesc || 'Custom recipe collection',
      recipeCount: 0,
      coverColor: selectedCoverColor,
    };

    const updated = [newBook, ...books];
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    setNewBookTitle('');
    setNewBookDesc('');
    setSelectedCoverColor('from-orange-500 to-amber-600');
    setShowAddModal(false);
  };

  const handleDeleteBook = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe book?')) return;
    const updated = books.filter(b => b.id !== id);
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    if (selectedBook?.id === id) setSelectedBook(null);
  };

  const updateViewingRecipeState = (key: string, val: any) => {
    if (!viewingRecipe) return;
    const updatedRec = { ...viewingRecipe, [key]: val };
    setViewingRecipe(updatedRec);
    const updatedRecipes = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    setRecipes(updatedRecipes);
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedRecipes));
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

  const baseServings = viewingRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Recipe Books</h1>
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
          const count = recipes.filter((r: any) => r.bookId === book.id).length;
          return (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="bg-[#111726] border border-slate-800 hover:border-[#E05638]/50 rounded-2xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div className={`h-32 w-full bg-gradient-to-br ${book.coverColor || 'from-orange-500 to-amber-600'} p-6 flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute right-3 top-3 bg-black/30 backdrop-blur-md p-2 rounded-xl text-white">
                  <Book className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 bg-black/20 px-2.5 py-1 rounded-full">
                    Cookbook
                  </span>
                </div>
                <h3 className="font-black text-white text-lg leading-snug drop-shadow-md">
                  {book.title}
                </h3>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {book.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-[#E05638]" /> {count} recipes inside
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBook(book.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition"
                    title="Delete Book"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Book Modal with Background Color Selection */}
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
              <Book className="h-5 w-5 text-[#E05638]" /> Create Recipe Book
            </h2>

            <form onSubmit={handleCreateBook} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Baking & Desserts"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={newBookDesc}
                  onChange={(e) => setNewBookDesc(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638] resize-y"
                />
              </div>

              {/* Background Color Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Background Color</label>
                <div className="flex items-center gap-3">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedCoverColor(c.value)}
                      className={`w-9 h-9 rounded-full ${c.bgClass} flex items-center justify-center transition transform hover:scale-110 ${
                        selectedCoverColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111726]' : 'opacity-80'
                      }`}
                      title={c.label}
                    >
                      {selectedCoverColor === c.value && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
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
                  Create Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Book Details Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`h-28 w-full bg-gradient-to-br ${selectedBook.coverColor || 'from-orange-500 to-amber-600'} rounded-2xl p-6 flex flex-col justify-end text-white shadow-md`}>
              <h2 className="text-2xl font-black">{selectedBook.title}</h2>
              <p className="text-xs text-white/80 mt-1">{selectedBook.description}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">
                  Recipes in this Book ({recipes.filter((r: any) => r.bookId === selectedBook.id).length})
                </h3>
                <Link
                  href="/recipes"
                  className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Add recipes from Saved <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recipes.filter((r: any) => r.bookId === selectedBook.id).length === 0 ? (
                <div className="p-8 border border-slate-800 bg-[#0B101D] rounded-2xl text-center space-y-2">
                  <Utensils className="h-8 w-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No recipes added yet</h4>
                  <p className="text-xs text-slate-400">Browse your saved recipes and assign them to this cookbook.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipes.filter((r: any) => r.bookId === selectedBook.id).map((rec: any) => (
                    <div key={rec.id} className="flex items-center justify-between bg-[#0B101D] p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={rec.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=300&q=80'} alt={rec.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="font-bold text-white">{rec.title}</h4>
                          <span className="text-[10px] text-slate-400">{rec.recipeType || 'Main Dish'} • {rec.servings || 4} servings</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setViewingRecipe(rec);
                          setServingsMultiplier(1);
                          setNoteText(rec.note || '');
                          setCompletedSteps([]);
                          setFontSizeScale(100);
                        }}
                        className="bg-[#141b2d] hover:bg-[#1c263f] text-white font-bold px-4 py-2 rounded-xl transition border border-slate-700"
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

      {/* SPECIFIC RECIPE POPUP MODAL */}
      {viewingRecipe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            <button
              onClick={() => setViewingRecipe(null)}
              className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-black text-white rounded-full backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1 space-y-6">
              
              <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-6">
                <img
                  src={viewingRecipe.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                  alt={viewingRecipe.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111726] via-[#111726]/40 to-transparent" />

                <div className="relative z-10 space-y-3">
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">{viewingRecipe.title}</h2>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#E05638]" /> Cook: {viewingRecipe.cookTimeMinutes || 10} minutes
                    </span>
                    <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" /> Prep: {viewingRecipe.prepTimeMinutes || 30} minutes
                    </span>
                    <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-orange-400" /> {viewingRecipe.tags?.[0] || viewingRecipe.recipeType || 'Main Dish'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => alert(`Added "${viewingRecipe.title}" to Book!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <BookmarkPlus className="h-4 w-4 text-[#E05638]" /> Add to Book
                </button>
                <button
                  onClick={() => alert(`Scheduled "${viewingRecipe.title}" into Meal Planner!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4 text-emerald-400" /> Add to Plan
                </button>
                <button
                  onClick={() => alert(`Added ingredients for "${viewingRecipe.title}" to Shopping List!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                </button>
              </div>

              <div className="border-t border-slate-800 mx-6" />

              <div className="px-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Utensils className="h-4 w-4 text-[#E05638]" /> Servings
                  </span>
                  <div className="flex items-center bg-[#0B101D] border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                      className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-black text-white">
                      {currentTotalServings}
                    </span>
                    <button
                      onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Kitchen Timer activated for 15 minutes!')}
                    className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Timer className="h-3.5 w-3.5 text-emerald-400" /> Timer
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Recipe link copied to clipboard!');
                    }}
                    className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Share2 className="h-3.5 w-3.5 text-blue-400" /> Share
                  </button>
                </div>
              </div>

              <div className="px-6 text-sm text-slate-300 leading-relaxed">
                {viewingRecipe.description}
              </div>

              <div className="border-t border-slate-800 mx-6" />

              <div className="px-6 space-y-8 pb-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xl font-black text-white tracking-wide">Ingredients</h3>
                  
                  <div className="flex items-center bg-[#080C17] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                    <button
                      onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                      className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                    >
                      <Type className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setFontSizeScale(Math.max(80, fontSizeScale - 10))}
                      className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold border-l border-slate-800"
                    >
                      -
                    </button>
                    <span className="px-3 py-1.5 text-xs font-bold text-white border-l border-slate-800 bg-[#0B101D]">
                      {fontSizeScale}%
                    </span>
                    <button
                      onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                      className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold border-l border-slate-800"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  className="grid md:grid-cols-2 gap-x-8 gap-y-3.5"
                  style={{ fontSize: `${fontSizeScale}%` }}
                >
                  {Array.isArray(viewingRecipe.ingredients) && viewingRecipe.ingredients.map((ing: any, i: number) => {
                    const ingText = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                    const rawAmount = ing.amount || ing.quantity || '';
                    const scaledAmount = calculateScaledAmount(rawAmount, viewingRecipe.servings || 4, currentTotalServings);
                    const unitText = typeof ing === 'string' ? '' : ing.unit || '';
                    return (
                      <div key={i} className="flex items-start gap-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-[#E05638] shrink-0 mt-1.5" />
                        <span className="text-slate-200 leading-snug">
                          {scaledAmount !== '' && (
                            <strong className="text-white font-semibold">
                              {scaledAmount} {unitText !== 'Unit' ? unitText : ''}{' '}
                            </strong>
                          )}
                          {ingText}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <h3 className="text-xl font-black text-white tracking-wide">Instructions</h3>
                  
                  <div className="space-y-4" style={{ fontSize: `${fontSizeScale}%` }}>
                    {Array.isArray(viewingRecipe.instructions) && viewingRecipe.instructions.map((step: string, i: number) => {
                      const isDone = completedSteps.includes(i);
                      return (
                        <div
                          key={i}
                          onClick={() => toggleStepComplete(i)}
                          className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer select-none ${
                            isDone ? 'bg-[#0B101D]/60 border-slate-800/80 opacity-50 line-through' : 'bg-[#0B101D] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                            isDone ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-600 bg-transparent'
                          }`}>
                            {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>

                          <div className="flex gap-3 flex-1">
                            <span className="font-extrabold text-[#E05638] shrink-0">{i + 1}.</span>
                            <span className={`leading-relaxed ${isDone ? 'text-slate-500' : 'text-slate-200'}`}>
                              {step}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

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
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Utensils, Clock, Flame, BookOpen, ArrowLeft, ImagePlus, GripVertical, Check } from 'lucide-react';
import Link from 'next/link';

export default function ManualRecipePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    imageUrl: '',
    ingredients: [
      { amount: '', unit: '', item: '', category: 'Pantry Staples' }
    ],
    instructions: [
      ''
    ]
  });

  const [saving, setSaving] = useState(false);
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, imageUrl: reader.result as string });
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
      setForm({ ...form, ingredients: list });
      setDraggedIndex(index);
    } else {
      const list = [...form.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setForm({ ...form, instructions: list });
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
        tags: [form.recipeType],
        isFavorite: false,
        isCooked: false,
        rating: 0,
        note: '',
        sourceUrl: ''
      };

      const existing = JSON.parse(localStorage.getItem('zecratary_saved_recipes') || '[]');
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify([newRecipe, ...existing]));

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
    <div className="max-w-3xl mx-auto space-y-6 text-slate-100 pb-16">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/recipes" className="p-2 bg-[#111726] border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#E05638]">Create Recipe</h1>
            <p className="text-xs text-slate-400">Fill in the details below to create a new recipe.</p>
          </div>
        </div>
      </div>

      <div className="flex bg-[#0B101D] p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: 'info', label: 'Basic Info' },
          { id: 'ingredients', label: 'Ingredients' },
          { id: 'steps', label: 'Steps' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition ${
              activeTab === tab.id
                ? 'bg-[#111726] text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#E05638]">Photo</label>
              <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#111726] rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Recipe Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-2">
                    <ImagePlus className="h-8 w-8 text-slate-400 mx-auto group-hover:text-[#E05638] transition" />
                    <span className="text-xs font-bold text-slate-300 block">Add a photo</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Recipe Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Authentic Pad Thai"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of the dish..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638] resize-y"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Recipe Type</label>
                  <select
                    value={form.recipeType}
                    onChange={(e) => setForm({ ...form, recipeType: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="Main Dish">Main Dish</option>
                    <option value="Appetizer">Appetizer</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Side Dish">Side Dish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Servings</label>
                  <input
                    type="number"
                    value={form.servings}
                    onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Prep Time (m)</label>
                  <input
                    type="number"
                    value={form.prepTimeMinutes}
                    onChange={(e) => setForm({ ...form, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Cook Time (m)</label>
                  <input
                    type="number"
                    value={form.cookTimeMinutes}
                    onChange={(e) => setForm({ ...form, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('ingredients')}
                className="bg-[#E05638] text-white font-bold px-6 py-3 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
              >
                Next: Ingredients →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Ingredients</h2>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                  className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                    isReorderingIngredients ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1B2436] text-slate-200 border-slate-700'
                  }`}
                >
                  {isReorderingIngredients ? 'Done' : 'Reorder'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { amount: '', unit: '', item: '', category: 'Pantry Staples' }] })}
                  className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Ingredient
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs max-h-[400px] overflow-y-auto pr-1">
              {form.ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  draggable={isReorderingIngredients}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                  onDrop={handleDrop}
                  className={`flex items-center gap-2 bg-[#0B101D] p-2.5 rounded-xl border transition ${
                    isReorderingIngredients ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
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
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-700 font-bold outline-none"
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
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-700 outline-none"
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
                    className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none px-2"
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const list = [...form.ingredients];
                      list[idx].category = e.target.value;
                      setForm({ ...form, ingredients: list });
                    }}
                    className="w-32 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none"
                  >
                    <option value="Pantry Staples">Pantry Staples</option>
                    <option value="Produce">Produce</option>
                    <option value="Meat and Seafood">Meat and Seafood</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Grains and Pasta">Grains and Pasta</option>
                    <option value="Condiments and Sauces">Condiments & Sauces</option>
                  </select>

                  {isReorderingIngredients ? (
                    <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) })}
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
                onClick={() => setActiveTab('info')}
                className="bg-slate-800 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-slate-700 transition"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                className="bg-[#E05638] text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
              >
                Next: Steps →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Step-by-Step Instructions</h2>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                  className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                    isReorderingSteps ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1B2436] text-slate-200 border-slate-700'
                  }`}
                >
                  {isReorderingSteps ? 'Done' : 'Reorder'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, instructions: [...form.instructions, ''] })}
                  className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Step
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs max-h-[400px] overflow-y-auto pr-1">
              {form.instructions.map((step, idx) => (
                <div
                  key={idx}
                  draggable={isReorderingSteps}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                  onDrop={handleDrop}
                  className={`flex items-start gap-3 bg-[#0B101D] p-3 rounded-xl border transition ${
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
                      const list = [...form.instructions];
                      list[idx] = e.target.value;
                      setForm({ ...form, instructions: list });
                    }}
                    className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none resize-y"
                  />

                  {isReorderingSteps ? (
                    <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, instructions: form.instructions.filter((_, i) => i !== idx) })}
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
                onClick={() => setActiveTab('ingredients')}
                className="bg-slate-800 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-slate-700 transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#E05638] text-white font-bold px-8 py-3 rounded-xl text-xs hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving Recipe...' : 'Save Recipe'}
              </button>
            </div>
          </div>
        )}

      </form>
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
  Search, SlidersHorizontal, Heart, Clock,
  X, UploadCloud, Utensils, BookmarkPlus, CalendarPlus,
  ShoppingCart, Timer, Edit3, Share2, CheckSquare, Square, Star, ExternalLink, Trash2, Save, Plus, CheckCircle2, Type, Lock, GripVertical, Check, Book
} from 'lucide-react';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');

  // Reorder Mode Toggle States
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);
  // Shopping List Modal States
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  const handleAddSelectedToShoppingList = () => {
    const selected = shoppingModalIngredients.filter(i => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one ingredient to add.');
      return;
    }

    const existingList = JSON.parse(localStorage.getItem('zecratary_shopping_list') || '[]');
    const newEntries = selected.map((item, idx) => ({
      id: 's_added_' + Date.now() + '_' + idx,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      category: item.category || 'Pantry Staples',
      staple: false,
      checked: false
    }));

    const combined = [...newEntries, ...existingList];
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(combined));
    setShowShoppingModal(false);
    alert(`Successfully added ${selected.length} items to your Shopping List!`);
  };


  // Reference UI States: Font Size Scale & Checked Steps Tracking
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const fetchRecipesAndBooks = async () => {
    try {
      const localRecipes = localStorage.getItem('zecratary_saved_recipes');
      if (localRecipes) {
        setRecipes(JSON.parse(localRecipes));
        setLoading(false);
      }

      const localBooks = localStorage.getItem('zecratary_recipe_books');
      if (localBooks) {
        setBooks(JSON.parse(localBooks));
      } else {
        const defaultBooks = [
          { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', description: 'Quick and easy meals.' },
          { id: 'book_2', title: 'Authentic Asian Cuisine', description: 'Traditional recipes.' }
        ];
        setBooks(defaultBooks);
        localStorage.setItem('zecratary_recipe_books', JSON.stringify(defaultBooks));
      }

      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (data.success && data.recipes?.length > 0) {
        if (!localRecipes) {
          setRecipes(data.recipes);
          localStorage.setItem('zecratary_saved_recipes', JSON.stringify(data.recipes));
        }
      } else if (!localRecipes) {
        const defaultRecipes = [
          {
            id: 'initial_1',
            title: 'Authentic Pad Thai Recipe',
            description: 'This pad thai recipe is the real deal. Fully loaded with all the classic ingredients an authentic pad thai should have.',
            servings: 4,
            prepTimeMinutes: 30,
            cookTimeMinutes: 10,
            calories: 480,
            proteinGrams: 24,
            carbsGrams: 55,
            fatGrams: 15,
            tags: ['Main Dish', 'Imported'],
            recipeType: 'Main Dish',
            isFavorite: true,
            isCooked: false,
            rating: 5,
            note: 'Delicious family favourite!',
            sourceUrl: 'https://hot-thai-kitchen.com',
            imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
            ingredients: [
              { amount: '35', unit: 'g', item: 'palm sugar, chopped', category: 'Pantry Staples' },
              { amount: '3', unit: 'tbsp', item: 'water', category: 'Beverages' }
            ],
            instructions: [
              'Add palm sugar to a small pot and melt over medium heat.'
            ],
            bookId: 'book_2'
          }
        ];
        setRecipes(defaultRecipes);
        localStorage.setItem('zecratary_saved_recipes', JSON.stringify(defaultRecipes));
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipesAndBooks();
  }, []);

  const saveAllRecipes = (updatedList: any[]) => {
    setRecipes(updatedList);
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !selectedRecipe.isFavorite });
    }
  };

  const handleDeleteRecipe = async (e: React.MouseEvent | null, id: string) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to remove this recipe from your collection?')) return;

    try {
      if (!id.startsWith('initial_') && !id.startsWith('temp_')) {
        await fetch(`/api/recipes?id=${id}`, { method: 'DELETE' });
      }
      const updated = recipes.filter(r => r.id !== id);
      saveAllRecipes(updated);
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  };

  const updateRecipeState = (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleAssignToBook = (bookId: string) => {
    if (!selectedRecipe) return;
    updateRecipeState('bookId', bookId);
    const bookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    alert(`Successfully added "${selectedRecipe.title}" to "${bookTitle}"!`);
  };

  const handleSaveEdit = () => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, ...editForm };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditing(false);
  };

  const toggleStepComplete = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(i => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    if (type === 'ingredients') {
      const list = [...(editForm.ingredients || [])];
      const draggedItem = list[draggedItemIndex];
      list.splice(draggedItemIndex, 1);
      list.splice(index, 0, draggedItem);
      setEditForm({ ...editForm, ingredients: list });
      setDraggedItemIndex(index);
    } else {
      const list = [...(editForm.instructions || [])];
      const draggedItem = list[draggedItemIndex];
      list.splice(draggedItemIndex, 1);
      list.splice(index, 0, draggedItem);
      setEditForm({ ...editForm, instructions: list });
      setDraggedItemIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedItemIndex(null);
  };

  const calculateScaledAmount = (baseAmount: any, baseServings: number, currentServings: number) => {
    if (!baseAmount || isNaN(Number(baseAmount))) return baseAmount;
    const num = Number(baseAmount);
    const scaled = (num / (baseServings || 4)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
  };

  const filtered = recipes.filter(r => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      (Array.isArray(r.ingredients) && r.ingredients.some((ing: any) =>
        (typeof ing === 'string' ? ing : (ing.item || ing.name || '')).toLowerCase().includes(q)
      ));

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Favorites') return Boolean(r.isFavorite);
    if (activeFilter === 'Main Dish') return r.tags?.includes('Main Dish') || r.recipeType === 'Main Dish';
    if (activeFilter === 'Cooked') return Boolean(r.isCooked);
    if (activeFilter === 'Rating') return (r.rating || 0) >= 4;
    if (activeFilter === 'Under 30m') return ((r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0)) <= 30;
    return true;
  });

  const baseServings = selectedRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Saved Recipes</h1>
          <p className="text-emerald-400 text-xs mt-1">Your collection of favorite recipes ({recipes.length})</p>
        </div>
        <Link
          href="/import"
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <UploadCloud className="h-4 w-4" /> Import New Recipe
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name or ingredient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111726] border border-emerald-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638]"
            />
          </div>
          <button
            onClick={() => setActiveFilter(activeFilter === 'All' ? 'Favorites' : 'All')}
            className="border border-emerald-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 bg-[#111726] text-emerald-400"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filter {activeFilter !== 'All' ? `(${activeFilter})` : ''}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: 'All', id: 'All' },
            { label: '♡ Favorites', id: 'Favorites' },
            { label: '🍲 Main Dish', id: 'Main Dish' },
            { label: '✓ Cooked', id: 'Cooked' },
            { label: '⭐ Top Rated', id: 'Rating' },
            { label: '⏱ Under 30m', id: 'Under 30m' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full font-semibold border transition ${
                activeFilter === f.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-[#111726] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-xs py-12 text-center">Loading recipes...</div>
      ) : filtered.length === 0 ? (
        <div className="p-16 border border-slate-800 bg-[#111726] rounded-3xl text-center space-y-3">
          <Utensils className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No recipes found</h3>
          <p className="text-xs text-slate-400">Try adjusting your search keywords or active filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const assignedBook = books.find(b => b.id === r.bookId);
            return (
              <div
                key={r.id}
                onClick={() => { setSelectedRecipe(r); setServingsMultiplier(1); setNoteText(r.note || ''); setCompletedSteps([]); setIsEditing(false); }}
                className="bg-[#111726] border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-sm relative"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                    <img
                      src={r.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80'}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {r.isCooked && (
                        <div className="p-2 bg-emerald-600/90 backdrop-blur-md rounded-full text-white" title="Cooked">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, r.id)}
                        className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-[#E05638] transition"
                        title="Favorite"
                      >
                        <Heart className={`h-4 w-4 ${r.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteRecipe(e, r.id)}
                        className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-red-400 transition"
                        title="Delete Recipe"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {assignedBook && (
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-[10px] text-amber-400 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
                        <Book className="h-3 w-3" /> {assignedBook.title}
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#E05638] transition">
                      {r.title}
                    </h3>
                    <div className="flex items-center justify-between pt-1">
                      <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {r.tags?.[0] || r.recipeType || 'Main Dish'}
                      </span>
                      {r.rating > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                          <Star className="h-3 w-3 fill-amber-400" /> {r.rating}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 20)}m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECIPE DETAILS & FULL EDIT MODAL */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => { setSelectedRecipe(null); setIsEditing(false); }}
              className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-black text-white rounded-full backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-6">
              
              {!isEditing ? (
                <>
                  {/* Hero Image & Metadata Banner */}
                  <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-6">
                    <img
                      src={selectedRecipe.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                      alt={selectedRecipe.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111726] via-[#111726]/40 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">{selectedRecipe.title}</h2>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                        <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#E05638]" /> Cook: {selectedRecipe.cookTimeMinutes || 10} minutes
                        </span>
                        <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-emerald-400" /> Prep: {selectedRecipe.prepTimeMinutes || 30} minutes
                        </span>
                        <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5 text-orange-400" /> {selectedRecipe.tags?.[0] || selectedRecipe.recipeType || 'Main Dish'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Bar Buttons: Add to Book Dropdown */}
                  <div className="px-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="relative">
                      <select
                        value={selectedRecipe.bookId || ''}
                        onChange={(e) => handleAssignToBook(e.target.value)}
                        className="w-full bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/85 text-white font-bold text-xs py-3 px-4 rounded-xl transition outline-none cursor-pointer appearance-none"
                      >
                        <option value="" disabled>📚 Add to Book...</option>
                        {books.map(b => (
                          <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => alert(`Scheduled "${selectedRecipe.title}" into Meal Planner!`)}
                      className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <CalendarPlus className="h-4 w-4 text-emerald-400" /> Add to Plan
                    </button>
                    <button
                      onClick={() => {
                        const defaultIngs = (selectedRecipe.ingredients || []).map((ing: any, idx: number) => ({
                          id: 'ing_' + idx,
                          name: typeof ing === 'string' ? ing : (ing.item || ing.name || ''),
                          amount: ing.amount || ing.quantity || '1',
                          unit: ing.unit || '',
                          category: ing.category || 'Pantry Staples',
                          selected: true,
                          matchedWithPantry: (ing.item || ing.name || '').toLowerCase().includes('fish') || (ing.item || ing.name || '').toLowerCase().includes('shrimp')
                        }));
                        setShoppingModalIngredients(defaultIngs);
                        setShowShoppingModal(true);
                      }}
                      className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                    </button>
                    <button
                      onClick={() => {
                        setEditForm({
                          ...selectedRecipe,
                          ingredients: selectedRecipe.ingredients ? [...selectedRecipe.ingredients] : [],
                          instructions: selectedRecipe.instructions ? [...selectedRecipe.instructions] : []
                        });
                        setEditTab('info');
                        setIsReorderingIngredients(false);
                        setIsReorderingSteps(false);
                        setIsEditing(true);
                      }}
                      className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Edit3 className="h-4 w-4" /> Edit Recipe
                    </button>
                  </div>

                  <div className="border-t border-slate-800 mx-6" />

                  {/* Secondary Controls Bar: Servings, Timer, Share */}
                  <div className="px-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                        <Utensils className="h-4 w-4 text-[#E05638]" /> Servings
                      </span>
                      <div className="flex items-center bg-[#0B101D] border border-slate-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
                        >
                          -
                        </button>
                        <span className="px-4 py-1.5 text-xs font-black text-white">
                          {currentTotalServings}
                        </span>
                        <button
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Kitchen Timer activated for 15 minutes!')}
                        className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Timer className="h-3.5 w-3.5 text-emerald-400" /> Timer
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Recipe link copied to clipboard!');
                        }}
                        className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Share2 className="h-3.5 w-3.5 text-blue-400" /> Share
                      </button>
                    </div>
                  </div>

                  {/* Description Body */}
                  <div className="px-6 text-sm text-slate-300 leading-relaxed">
                    {selectedRecipe.description}
                  </div>

                  <div className="border-t border-slate-800 mx-6" />

                  {/* INGREDIENTS & INSTRUCTIONS SECTION WITH MULTIPLIED SCALING */}
                  <div className="px-6 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-xl font-black text-white tracking-wide">Ingredients</h3>
                      
                      <div className="flex items-center bg-[#080C17] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                        <button
                          onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                          className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                          title="Enlarge Font"
                        >
                          <Type className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setFontSizeScale(Math.max(80, fontSizeScale - 10))}
                          className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold border-l border-slate-800"
                          title="Decrease Font"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-white border-l border-slate-800 bg-[#0B101D]">
                          {fontSizeScale}%
                        </span>
                        <button
                          onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                          className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold border-l border-slate-800"
                          title="Increase Font"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div
                      className="grid md:grid-cols-2 gap-x-8 gap-y-3.5"
                      style={{ fontSize: `${fontSizeScale}%` }}
                    >
                      {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, i: number) => {
                        const ingText = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        const rawAmount = ing.amount || ing.quantity || '';
                        const scaledAmount = calculateScaledAmount(rawAmount, selectedRecipe.servings || 4, currentTotalServings);
                        const unitText = typeof ing === 'string' ? '' : ing.unit || '';
                        return (
                          <div key={i} className="flex items-start gap-3 py-1">
                            <span className="w-2 h-2 rounded-full bg-[#E05638] shrink-0 mt-1.5" />
                            <span className="text-slate-200 leading-snug">
                              {scaledAmount !== '' && (
                                <strong className="text-white font-semibold">
                                  {scaledAmount} {unitText !== 'Unit' ? unitText : ''}{' '}
                                </strong>
                              )}
                              {ingText}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-800">
                      <h3 className="text-xl font-black text-white tracking-wide">Instructions</h3>
                      
                      <div className="space-y-4" style={{ fontSize: `${fontSizeScale}%` }}>
                        {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, i: number) => {
                          const isDone = completedSteps.includes(i);
                          return (
                            <div
                              key={i}
                              onClick={() => toggleStepComplete(i)}
                              className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer select-none ${
                                isDone ? 'bg-[#0B101D]/60 border-slate-800/80 opacity-50 line-through' : 'bg-[#0B101D] border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                isDone ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-600 bg-transparent'
                              }`}>
                                {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                              </div>

                              <div className="flex gap-3 flex-1">
                                <span className="font-extrabold text-[#E05638] shrink-0">{i + 1}.</span>
                                <span className={`leading-relaxed ${isDone ? 'text-slate-500' : 'text-slate-200'}`}>
                                  {step}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  <div className="border-t border-slate-800 mx-6" />

                  {/* Mark as Cooked, Notes & Star Rating */}
                  <div className="px-6 space-y-4 pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0B101D] p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateRecipeState('isCooked', !selectedRecipe.isCooked)}
                          className="flex items-center gap-2 text-sm font-bold text-white group cursor-pointer"
                        >
                          {selectedRecipe.isCooked ? (
                            <CheckSquare className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-500 group-hover:text-slate-300" />
                          )}
                          Mark as Cooked
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateRecipeState('rating', star)}
                            className={`h-5 w-5 cursor-pointer transition ${
                              (selectedRecipe.rating || 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Edit3 className="h-3.5 w-3.5 text-[#E05638]" /> Add a note
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Added extra garlic, cooked 2 minutes less..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-700 outline-none focus:border-[#E05638]"
                        />
                        <button
                          onClick={() => updateRecipeState('note', noteText)}
                          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                        >
                          <Save className="h-3.5 w-3.5" /> Save Note
                        </button>
                      </div>
                      {selectedRecipe.note && (
                        <div className="text-[11px] text-emerald-400 font-medium pt-1">
                          Saved note: "{selectedRecipe.note}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 mx-6" />

                  {/* NUTRITIONAL INFORMATION SECTION */}
                  <div className="px-6 space-y-3">
                    <h3 className="text-lg font-extrabold text-[#E05638] flex items-center gap-2">
                      Nutritional Information <Lock className="h-4 w-4 text-[#E05638]" />
                    </h3>

                    <div className="bg-[#0B101D] border border-emerald-600/60 rounded-2xl p-5 space-y-3 shadow-md">
                      <span className="text-xs font-bold text-[#E05638] uppercase tracking-wider block mb-2">Per Serving</span>

                      <div className="space-y-2 text-xs">
                        {[
                          { label: 'Calories', val: '480 kcal' },
                          { label: 'Protein', val: '24 g' },
                          { label: 'Saturated Fats', val: '4.5 g' },
                          { label: 'Unsaturated Fats', val: '8.2 g' },
                          { label: 'Fiber', val: '3.1 g' },
                          { label: 'Sugar', val: '12 g' },
                          { label: 'Sodium', val: '640 mg' },
                          { label: 'Cholesterol', val: '85 mg' },
                          { label: 'Carbohydrates', val: '55 g' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/60">
                            <span className="text-[#E05638] font-semibold">{item.label}:</span>
                            <span className="text-slate-400 filter blur-sm select-none font-mono tracking-widest">{item.val}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-emerald-600/40 pt-3 mt-3 flex items-center gap-2 text-xs text-[#E05638] font-semibold">
                        <Lock className="h-3.5 w-3.5" /> Upgrade to see nutritional information
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 mx-6" />

                  {/* Source Footer Attribution with Delete Option */}
                  <div className="px-6 pb-6 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Source</span>
                      {selectedRecipe.sourceUrl ? (
                        <a
                          href={selectedRecipe.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                        >
                          Visit {new URL(selectedRecipe.sourceUrl).hostname.replace('www.', '')} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Manual / AI Generated</span>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteRecipe(e, selectedRecipe.id)}
                      className="bg-red-950/60 border border-red-500/30 hover:bg-red-900/50 text-red-400 font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Recipe
                    </button>
                  </div>
                </>
              ) : (
                /* FULL EDIT FORM */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="flex bg-[#0B101D] p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'info', label: 'Basic Info' },
                      { id: 'ingredients', label: 'Ingredients' },
                      { id: 'steps', label: 'Steps' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setEditTab(tab.id as any)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                          editTab === tab.id
                            ? 'bg-[#111726] text-white shadow-sm border border-slate-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {editTab === 'info' && (
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-[#E05638] uppercase mb-1">Recipe Title</label>
                        <input
                          type="text"
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638] resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase mb-1">Recipe Type</label>
                          <select
                            value={editForm.recipeType || editForm.tags?.[0] || 'Main Dish'}
                            onChange={(e) => setEditForm({ ...editForm, recipeType: e.target.value, tags: [e.target.value] })}
                            className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                          >
                            <option value="Main Dish">Main Dish</option>
                            <option value="Appetizer">Appetizer</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Side Dish">Side Dish</option>
                            <option value="Beverage">Beverage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase mb-1">Servings</label>
                          <input
                            type="number"
                            value={editForm.servings || 4}
                            onChange={(e) => setEditForm({ ...editForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase mb-1">Preparation Time (mins)</label>
                          <input
                            type="number"
                            value={editForm.prepTimeMinutes || 15}
                            onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase mb-1">Cooking Time (mins)</label>
                          <input
                            type="number"
                            value={editForm.cookTimeMinutes || 30}
                            onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editTab === 'ingredients' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-[#E05638] uppercase">Ingredients</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingIngredients ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1B2436] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingIngredients ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            onClick={() => {
                              const list = editForm.ingredients ? [...editForm.ingredients] : [];
                              list.push({ amount: '', unit: 'g', item: '', category: 'Pantry Staples' });
                              setEditForm({ ...editForm, ingredients: list });
                            }}
                            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Ingredient
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {Array.isArray(editForm.ingredients) && editForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                            onDrop={handleDrop}
                            className={`flex items-center gap-2 bg-[#0B101D] p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="35"
                              value={ing.amount || ing.quantity || ''}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx] = { ...list[idx], amount: e.target.value };
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white text-center placeholder-slate-700 font-bold outline-none"
                            />
                            <input
                              type="text"
                              placeholder="g"
                              value={ing.unit || 'g'}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx] = { ...list[idx], unit: e.target.value };
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 text-center placeholder-slate-700 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="item name..."
                              value={ing.item || ing.name || ''}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx] = { ...list[idx], item: e.target.value };
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white text-xs placeholder-slate-700 outline-none px-2"
                            />
                            <select
                              value={ing.category || 'Pantry Staples'}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx] = { ...list[idx], category: e.target.value };
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none"
                            >
                              <option value="Pantry Staples">Pantry Staples</option>
                              <option value="Beverages">Beverages</option>
                              <option value="Condiments and Sauces">Condiments and Sauces</option>
                              <option value="Grains and Pasta">Grains and Pasta</option>
                              <option value="Meat and Seafood">Meat and Seafood</option>
                              <option value="Produce">Produce</option>
                              <option value="Dairy">Dairy</option>
                            </select>
                            
                            {isReorderingIngredients ? (
                              <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                onClick={() => {
                                  const list = editForm.ingredients.filter((_: any, i: number) => i !== idx);
                                  setEditForm({ ...editForm, ingredients: list });
                                }}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editTab === 'steps' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-[#E05638] uppercase">Step-by-Step Instructions</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingSteps ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1B2436] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingSteps ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            onClick={() => {
                              const steps = editForm.instructions ? [...editForm.instructions] : [];
                              steps.push('');
                              setEditForm({ ...editForm, instructions: steps });
                            }}
                            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Step
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {Array.isArray(editForm.instructions) && editForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                            onDrop={handleDrop}
                            className={`flex items-start gap-3 bg-[#0B101D] p-3 rounded-xl border transition ${
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
                                const steps = [...editForm.instructions];
                                steps[idx] = e.target.value;
                                setEditForm({ ...editForm, instructions: steps });
                              }}
                              className="flex-1 bg-transparent border-none text-white text-xs placeholder-slate-700 outline-none resize-y"
                            />
                            
                            {isReorderingSteps ? (
                              <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                onClick={() => {
                                  const steps = editForm.instructions.filter((_: any, i: number) => i !== idx);
                                  setEditForm({ ...editForm, instructions: steps });
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

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20 text-xs"
                    >
                      <Save className="h-4 w-4" /> Save Changes
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ADD INGREDIENTS TO SHOPPING LIST REFERENCE MODAL */}
      {showShoppingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowShoppingModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638]">Add Ingredients to Shopping List</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Review and select the ingredients you need to buy. <span className="text-emerald-400 font-bold">Green items with checkmarks are potential matched ingredients from your pantry.</span>
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-6 pr-1">
              {Array.from(new Set(shoppingModalIngredients.map(i => i.category || 'Pantry Staples'))).map(cat => {
                const catIngs = shoppingModalIngredients.filter(i => (i.category || 'Pantry Staples') === cat);
                if (catIngs.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2.5">
                    <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">{cat}</h3>
                    <div className="space-y-3">
                      {catIngs.map((ing) => (
                        <div
                          key={ing.id}
                          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl border transition ${
                            ing.matchedWithPantry 
                              ? 'bg-emerald-950/40 border-emerald-600/70' 
                              : 'bg-[#0B101D] border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              onClick={() => {
                                const updated = shoppingModalIngredients.map(item => item.id === ing.id ? { ...item, selected: !item.selected } : item);
                                setShoppingModalIngredients(updated);
                              }}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                ing.selected 
                                  ? (ing.matchedWithPantry ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-[#E05638] border-[#E05638] text-white') 
                                  : 'border-slate-700 bg-slate-900'
                              }`}
                            >
                              {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                            </div>

                            <input
                              type="text"
                              value={ing.amount}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, amount: val } : i));
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-xs text-white text-center font-bold outline-none focus:border-[#E05638]"
                              placeholder="Qty"
                            />

                            <input
                              type="text"
                              value={ing.unit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, unit: val } : i));
                              }}
                              className="w-24 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-xs text-slate-300 text-center outline-none focus:border-[#E05638]"
                              placeholder="Unit"
                            />

                            <input
                              type="text"
                              value={ing.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, name: val } : i));
                              }}
                              className="flex-1 bg-transparent border-none text-xs text-white outline-none px-1 font-medium"
                              placeholder="Ingredient name..."
                            />
                          </div>

                          <div className="flex items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            <select
                              value={ing.category || 'Pantry Staples'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, category: val } : i));
                              }}
                              className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-2.5 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              <option value="Produce">Produce</option>
                              <option value="Meat and Seafood">Meat and Seafood</option>
                              <option value="Pantry Staples">Pantry Staples</option>
                              <option value="Condiments and Sauces">Condiments and Sauces</option>
                              <option value="Grains and Pasta">Grains and Pasta</option>
                              <option value="Dairy">Dairy</option>
                            </select>

                            <button
                              onClick={() => {
                                setShoppingModalIngredients(shoppingModalIngredients.filter(i => i.id !== ing.id));
                              }}
                              className="p-2 text-slate-500 hover:text-red-400 transition rounded-xl bg-slate-900 border border-slate-800"
                              title="Delete ingredient"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowShoppingModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedToShoppingList}
                className="px-6 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition text-xs shadow-lg shadow-[#E05638]/20"
              >
                Add to Shopping List
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
        const existing = JSON.parse(localStorage.getItem('zecratary_saved_recipes') || '[]');
        const updated = [result.data, ...existing.filter((r: any) => r.title !== result.data.title)];
        localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));

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
export const CATEGORIES = [
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

```

