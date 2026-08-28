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
