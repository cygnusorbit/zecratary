'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import { getStoredCategories } from '@/lib/categories';

export default function ManualRecipePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    imageUrl: '',
    ingredients: [
      { amount: '', unit: '', item: '', category: 'Produce' }
    ],
    instructions: ['']
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cats = getStoredCategories();
    setCategories(cats);
    if (cats.length > 0 && form.ingredients[0] && !cats.includes(form.ingredients[0].category)) {
      setForm(prev => ({
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

  const handleAddIngredient = () => {
    setForm(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { amount: '', unit: '', item: '', category: categories[0] || 'Pantry Staples' }
      ]
    }));
  };

  const handleAddStep = () => {
    setForm(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter a recipe title.');
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

      const existing = JSON.parse(localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes') || '[]');
      const updated = [newRecipe, ...existing];
      localStorage.setItem('zecratary_recipes', JSON.stringify(updated));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));

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
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 pb-16">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/recipes" className="p-2 bg-[#111726] border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#E05638] tracking-tight">Create Recipe Manually</h1>
            <p className="text-xs text-slate-400">Build custom culinary recipes from scratch</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#E05638] uppercase tracking-wider">Basic Information</h2>
          
          <div className="space-y-4 text-xs">
            {/* Photo Upload Box */}
            <div className="space-y-1.5">
              <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px]">
                Photo
              </label>
              <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#070b13] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                {form.imageUrl ? (
                  <>
                    <img
                      src={form.imageUrl}
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
                          setForm(prev => ({ ...prev, imageUrl: '' }));
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
              <label className="block text-slate-400 font-semibold mb-1">Recipe Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Homemade Tuscan Garlic Chicken"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Description</label>
              <textarea
                rows={3}
                placeholder="Short summary of the dish..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638] resize-y"
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
                  <option value="Beverage">Beverage</option>
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
        </div>

        {/* Ingredients Builder Card with Dynamic Global Categories */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#E05638] uppercase tracking-wider">Ingredients</h2>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 hover:bg-[#c94529] transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Ingredient
            </button>
          </div>

          <div className="space-y-2.5">
            {form.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-[#0B101D] p-2.5 rounded-xl border border-slate-800 text-xs">
                <input
                  type="text"
                  placeholder="Amount"
                  value={ing.amount}
                  onChange={(e) => {
                    const list = [...form.ingredients];
                    list[idx].amount = e.target.value;
                    setForm({ ...form, ingredients: list });
                  }}
                  className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white font-bold outline-none"
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
                  className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 outline-none"
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
                  className="flex-1 bg-transparent border-none text-white outline-none px-2"
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
              </div>
            ))}
          </div>
        </div>

        {/* Steps Builder Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#E05638] uppercase tracking-wider">Step-by-Step Instructions</h2>
            <button
              type="button"
              onClick={handleAddStep}
              className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 hover:bg-[#c94529] transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Step
            </button>
          </div>

          <div className="space-y-3">
            {form.instructions.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-[#0B101D] p-3 rounded-xl border border-slate-800 text-xs">
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
                  className="flex-1 bg-transparent border-none text-white outline-none resize-y"
                />
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
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/recipes"
            className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-[#E05638] text-white font-bold text-xs hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving Recipe...' : 'Save Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
