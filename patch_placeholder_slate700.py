import os

files = {}

# -------------------------------------------------------------
# 1. Update Import Page Placeholders to slate-700
# -------------------------------------------------------------
files["apps/web/src/app/import/page.tsx"] = """'use client';
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

    let engineConfig = null;
    try {
      const stored = localStorage.getItem('zecratary_engine_config') || localStorage.getItem('zecratary_admin_config');
      if (stored) engineConfig = JSON.parse(stored);
    } catch (e) {}

    try {
      const res = await fetch('/api/recipes/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, engineConfig }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        const existing = JSON.parse(localStorage.getItem('zecratary_saved_recipes') || '[]');
        const updated = [result.data, ...existing.filter((r: any) => r.title !== result.data.title)];
        localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));

        setStatus({
          type: 'success',
          msg: `Successfully imported "${result.data.title}"! Redirecting to Saved Recipes...`,
        });
        setUrl('');
        setTimeout(() => {
          router.push('/recipes');
        }, 1200);
      } else {
        setStatus({ type: 'error', msg: result.error || 'Failed to extract recipe content.' });
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
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-[#E05638]"
              />
              <button
                onClick={handleIngest}
                disabled={loading || !url.trim()}
                className="w-full bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#E05638]/20"
              >
                <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Extracting & Parsing Recipe Content...' : 'Import Recipe'}
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

        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-[#E05638] font-bold text-base">URL Import Tips</h3>
          <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <li>🌐 <strong>Supported Websites:</strong> AllRecipes, Food Network, Bon Appétit, Roti & Rice, and standard schema blogs.</li>
            <li>📺 <strong>YouTube Recipe Videos:</strong> Video descriptions and cooking chapters are parsed automatically.</li>
            <li>📱 <strong>Social Media:</strong> Instagram Reels, TikTok video links, and Facebook posts.</li>
            <li>✅ <strong>Best Practices:</strong> Use direct recipe links without paywalls.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
"""

# -------------------------------------------------------------
# 2. Update Manual Recipe Page Placeholders to slate-700
# -------------------------------------------------------------
files["apps/web/src/app/manual/page.tsx"] = """'use client';
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
    calories: 450,
    proteinGrams: 25,
    carbsGrams: 40,
    fatGrams: 15,
    imageUrl: '',
    ingredients: [
      { amount: '35', unit: 'g', item: 'palm sugar, chopped', category: 'Pantry Staples' }
    ],
    instructions: [
      'Add ingredients to a pan and cook over medium heat.'
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
                  onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { amount: '', unit: 'g', item: '', category: 'Pantry Staples' }] })}
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
"""

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("✅ Placeholders updated to slate-700 across import & manual pages!")
