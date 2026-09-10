import os
import glob

# 1. Locate active App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate active App Router directory.")
    exit(1)

# 2. Create Recipe Type Admin Page (/admin/recipe-type)
recipe_type_dir = os.path.join(app_dir, 'admin', 'recipe-type')
os.makedirs(recipe_type_dir, exist_ok=True)
recipe_type_path = os.path.join(recipe_type_dir, 'page.tsx')

recipe_type_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Save, X, Utensils, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface RecipeTypeItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  isActive: boolean;
}

const DEFAULT_RECIPE_TYPES: RecipeTypeItem[] = [
  { id: 'typ_1', name: 'Breakfast & Brunch', slug: 'breakfast-brunch', description: 'Morning meals, pastries, eggs, and light dishes', isActive: true },
  { id: 'typ_2', name: 'Main Course', slug: 'main-course', description: 'Heavy hearty entrees, proteins, and dinners', isActive: true },
  { id: 'typ_3', name: 'Healthy & Diet', slug: 'healthy-diet', description: 'Low calorie, keto, vegan, and clean nutrition', isActive: true },
  { id: 'typ_4', name: 'Desserts & Sweets', slug: 'desserts-sweets', description: 'Baking, cakes, chocolates, and sugary treats', isActive: true },
];

export default function RecipeTypeAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);
  const [types, setTypes] = useState<RecipeTypeItem[]>(DEFAULT_RECIPE_TYPES);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active || active.role !== 'admin') {
      router.replace(active ? '/profile' : '/login');
      return;
    }
    setUser(active);

    try {
      const raw = localStorage.getItem('zecratary_recipe_types');
      if (raw) {
        setTypes(JSON.parse(raw));
      } else {
        localStorage.setItem('zecratary_recipe_types', JSON.stringify(DEFAULT_RECIPE_TYPES));
      }
    } catch (_) {}
  }, [router]);

  const saveToStorage = (updated: RecipeTypeItem[]) => {
    setTypes(updated);
    localStorage.setItem('zecratary_recipe_types', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_recipe_types_updated'));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newSlug = nameInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (types.some(t => t.slug === newSlug)) {
      setStatusMsg({ text: 'A recipe type with this name or slug already exists.', type: 'error' });
      return;
    }

    const newItem: RecipeTypeItem = {
      id: 'typ_' + Date.now().toString(36),
      name: nameInput.trim(),
      slug: newSlug,
      description: descInput.trim(),
      isActive: true
    };

    saveToStorage([newItem, ...types]);
    setNameInput('');
    setDescInput('');
    setIsAdding(false);
    setStatusMsg({ text: 'Recipe type created successfully!', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDelete = (id: string) => {
    const updated = types.filter(t => t.id !== id);
    saveToStorage(updated);
    setStatusMsg({ text: 'Recipe type deleted.', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleToggleActive = (id: string) => {
    const updated = types.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
    saveToStorage(updated);
  };

  if (!user) return null;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Recipe Types Taxonomy
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Configure primary recipe categories (e.g., Breakfast, Main Course, Keto) for AI generation filters.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <Plus className="h-4 w-4" /> {isAdding ? 'Cancel' : 'Add New Type'}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
          statusMsg.type === 'success' ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300') : (isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300')
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreate} className="border rounded-3xl p-6 space-y-4 shadow-xl text-xs" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Create New Recipe Type</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Type Name *</label>
              <input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Desserts & Baking" className="w-full border rounded-xl px-3 py-2 outline-none font-bold" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Description</label>
              <input type="text" value={descInput} onChange={(e) => setDescInput(e.target.value)} placeholder="Brief summary of category" className="w-full border rounded-xl px-3 py-2 outline-none" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border rounded-xl font-bold cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>Cancel</button>
            <button type="submit" className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>Save Recipe Type</button>
          </div>
        </form>
      )}

      <div className="border rounded-3xl overflow-hidden shadow-xl" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b font-extrabold uppercase tracking-wider" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#e2e8f0' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <tr>
                <th className="p-4">Name & Slug</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              {types.map((t) => (
                <tr key={t.id} className="transition hover:opacity-95">
                  <td className="p-4">
                    <div className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t.name}</div>
                    <div className="font-mono text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>/{t.slug}</div>
                  </td>
                  <td className="p-4" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t.description || '—'}</td>
                  <td className="p-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => handleToggleActive(t.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border cursor-pointer transition ${
                        t.isActive ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400') : (isDayMode ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-400')
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button type="button" onClick={() => handleDelete(t.id)} className="p-2 border rounded-xl text-red-400 hover:bg-red-500/10 transition cursor-pointer inline-flex items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"""
with open(recipe_type_path, 'w', encoding='utf-8') as f:
    f.write(recipe_type_code)
print(f"✓ Created Recipe Type Taxonomy admin page at {recipe_type_path}")


# 3. Create Ingredient Categories Admin Page (/admin/ingredient-categories)
ing_cat_dir = os.path.join(app_dir, 'admin', 'ingredient-categories')
os.makedirs(ing_cat_dir, exist_ok=True)
ing_cat_path = os.path.join(ing_cat_dir, 'page.tsx')

ing_cat_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Tag as TagIcon 
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface IngredientCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  colorTag: string;
  isActive: boolean;
}

const DEFAULT_INGREDIENT_CATEGORIES: IngredientCategoryItem[] = [
  { id: 'cat_1', name: 'Produce & Greens', slug: 'produce-greens', description: 'Fresh vegetables, fruits, and leafy herbs', colorTag: 'emerald', isActive: true },
  { id: 'cat_2', name: 'Proteins & Meats', slug: 'proteins-meats', description: 'Poultry, beef, pork, seafood, and plant proteins', colorTag: 'orange', isActive: true },
  { id: 'cat_3', name: 'Dairy & Eggs', slug: 'dairy-eggs', description: 'Milk, cheeses, butter, yogurt, and eggs', colorTag: 'blue', isActive: true },
  { id: 'cat_4', name: 'Pantry & Spices', slug: 'pantry-spices', description: 'Grains, oils, vinegars, salts, and seasonings', colorTag: 'purple', isActive: true },
];

export default function IngredientCategoriesAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);
  const [categories, setCategories] = useState<IngredientCategoryItem[]>(DEFAULT_INGREDIENT_CATEGORIES);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [colorInput, setColorInput] = useState('emerald');
  const [isAdding, setIsAdding] = useState(false);

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active || active.role !== 'admin') {
      router.replace(active ? '/profile' : '/login');
      return;
    }
    setUser(active);

    try {
      const raw = localStorage.getItem('zecratary_ingredient_categories');
      if (raw) {
        setCategories(JSON.parse(raw));
      } else {
        localStorage.setItem('zecratary_ingredient_categories', JSON.stringify(DEFAULT_INGREDIENT_CATEGORIES));
      }
    } catch (_) {}
  }, [router]);

  const saveToStorage = (updated: IngredientCategoryItem[]) => {
    setCategories(updated);
    localStorage.setItem('zecratary_ingredient_categories', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newSlug = nameInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (categories.some(c => c.slug === newSlug)) {
      setStatusMsg({ text: 'An ingredient category with this name or slug already exists.', type: 'error' });
      return;
    }

    const newItem: IngredientCategoryItem = {
      id: 'cat_' + Date.now().toString(36),
      name: nameInput.trim(),
      slug: newSlug,
      description: descInput.trim(),
      colorTag: colorInput,
      isActive: true
    };

    saveToStorage([newItem, ...categories]);
    setNameInput('');
    setDescInput('');
    setIsAdding(false);
    setStatusMsg({ text: 'Ingredient category created successfully!', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDelete = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    saveToStorage(updated);
    setStatusMsg({ text: 'Ingredient category deleted.', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleToggleActive = (id: string) => {
    const updated = categories.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
    saveToStorage(updated);
  };

  if (!user) return null;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Ingredient Categories Taxonomy
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Organize pantry items and shopping lists into structured taxonomic groups.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <Plus className="h-4 w-4" /> {isAdding ? 'Cancel' : 'Add Category'}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
          statusMsg.type === 'success' ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300') : (isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300')
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreate} className="border rounded-3xl p-6 space-y-4 shadow-xl text-xs" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Create Ingredient Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Category Name *</label>
              <input type="text" required value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Spices & Seasoning" className="w-full border rounded-xl px-3 py-2 outline-none font-bold" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Description</label>
              <input type="text" value={descInput} onChange={(e) => setDescInput(e.target.value)} placeholder="Brief summary" className="w-full border rounded-xl px-3 py-2 outline-none" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Badge Color</label>
              <select value={colorInput} onChange={(e) => setColorInput(e.target.value)} className="w-full border rounded-xl px-3 py-2 outline-none font-bold cursor-pointer" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <option value="emerald">Emerald (Produce)</option>
                <option value="orange">Orange (Proteins)</option>
                <option value="blue">Blue (Dairy)</option>
                <option value="purple">Purple (Pantry)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border rounded-xl font-bold cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>Cancel</button>
            <button type="submit" className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>Save Category</button>
          </div>
        </form>
      )}

      <div className="border rounded-3xl overflow-hidden shadow-xl" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b font-extrabold uppercase tracking-wider" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#e2e8f0' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <tr>
                <th className="p-4">Category Name & Slug</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-center">Color Tag</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              {categories.map((c) => (
                <tr key={c.id} className="transition hover:opacity-95">
                  <td className="p-4">
                    <div className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{c.name}</div>
                    <div className="font-mono text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>/{c.slug}</div>
                  </td>
                  <td className="p-4" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{c.description || '—'}</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border bg-slate-800/20" style={{ borderColor: isDayMode ? '#cbd5e1' : '#334155', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {c.colorTag}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => handleToggleActive(c.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border cursor-pointer transition ${
                        c.isActive ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400') : (isDayMode ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-400')
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button type="button" onClick={() => handleDelete(c.id)} className="p-2 border rounded-xl text-red-400 hover:bg-red-500/10 transition cursor-pointer inline-flex items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"""
with open(ing_cat_path, 'w', encoding='utf-8') as f:
    f.write(ing_cat_code)
print(f"✓ Created Ingredient Categories admin page at {ing_cat_path}")

print("\n🚀 Option I (Platform Taxonomy Engines) Successfully Installed!")
