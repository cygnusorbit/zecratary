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
