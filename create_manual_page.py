import os

code = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Utensils, Clock, Flame, BookOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ManualRecipePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    calories: 450,
    proteinGrams: 25,
    carbsGrams: 40,
    fatGrams: 15,
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { amount: '1', unit: 'cup', item: 'Fresh ingredients', category: 'Produce' }
    ],
    instructions: [
      'Prepare and chop all ingredients.',
      'Cook over medium heat until tender.',
      'Serve warm.'
    ]
  });

  const [saving, setSaving] = useState(false);

  const handleAddIngredient = () => {
    setForm({
      ...form,
      ingredients: [...form.ingredients, { amount: '', unit: 'g', item: '', category: 'Pantry Staples' }]
    });
  };

  const handleAddStep = () => {
    setForm({
      ...form,
      instructions: [...form.instructions, '']
    });
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

      // Save to client storage cache
      const existing = JSON.parse(localStorage.getItem('zecratary_saved_recipes') || '[]');
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify([newRecipe, ...existing]));

      // Also persist to API if active
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
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 pb-12">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/recipes" className="p-2 bg-[#111726] border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#E05638]">Create Recipe Manually</h1>
            <p className="text-xs text-slate-400">Build custom culinary recipes from scratch</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Basic Information</h2>
          
          <div className="space-y-3 text-xs">
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

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Cover Image URL</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Ingredients Builder Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Ingredients</h2>
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
                  className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none"
                >
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Produce">Produce</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
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
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Step-by-Step Instructions</h2>
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
"""

os.makedirs("apps/web/src/app/manual", exist_ok=True)
with open("apps/web/src/app/manual/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Manual Recipe page created successfully at http://localhost:3000/manual!")
