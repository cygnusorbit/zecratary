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
