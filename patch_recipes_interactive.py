import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, MoreVertical,
  X, ChefHat, UploadCloud, Flame, CheckCircle, Star, Utensils
} from 'lucide-react';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (data.success && data.recipes?.length > 0) {
        setRecipes(data.recipes);
      } else {
        const local = localStorage.getItem('zecratary_saved_recipes');
        if (local) {
          setRecipes(JSON.parse(local));
        } else {
          setRecipes([
            {
              id: 'initial_1',
              title: 'Authentic Pad Thai Recipe',
              description: 'Classic Thai stir-fried noodles with a balanced sweet, savory, and tangy tamarind profile.',
              servings: 4,
              prepTimeMinutes: 15,
              cookTimeMinutes: 25,
              calories: 450,
              proteinGrams: 22,
              carbsGrams: 58,
              fatGrams: 14,
              tags: ['Main Dish', 'Noodles'],
              recipeType: 'Main Dish',
              isFavorite: true,
              isCooked: true,
              rating: 5,
              imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
              ingredients: [
                { item: 'Rice noodles', quantity: '250g' },
                { item: 'Shrimp / Tofu', quantity: '200g' },
                { item: 'Tamarind paste', quantity: '2 tbsp' },
                { item: 'Fish sauce', quantity: '2 tbsp' },
                { item: 'Palm sugar', quantity: '1.5 tbsp' },
                { item: 'Bean sprouts & Peanuts', quantity: '1 cup' }
              ],
              instructions: [
                'Soak rice noodles in warm water for 20 minutes until pliable.',
                'Sear shrimp or tofu in a hot wok with 1 tbsp oil until golden.',
                'Push protein to the side, scramble eggs, then toss in drained noodles.',
                'Pour in tamarind sauce blend and toss vigorously on high heat.',
                'Fold in fresh bean sprouts, crushed peanuts, and fresh lime wedges.'
              ]
            }
          ]);
        }
      }
    } catch (e) {
      console.error('Failed to load recipes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    setRecipes(updated);
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));
  };

  // 1. Search Bar Logic (Title + Ingredients)
  // 2. Filter Button Logic
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
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

      {/* Search Bar & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name or ingredient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111726] border border-emerald-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638]"
            />
          </div>
          <button
            onClick={() => setActiveFilter(activeFilter === 'All' ? 'Favorites' : 'All')}
            className={`border font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition ${
              activeFilter !== 'All'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-[#111726] border-emerald-950 text-emerald-400'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filter {activeFilter !== 'All' ? `(${activeFilter})` : ''}
          </button>
        </div>

        {/* Filter Pills matching the FoodiePrep UI */}
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

      {/* Recipe Grid */}
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
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelectedRecipe(r); setActiveModalTab('info'); }}
              className="bg-[#111726] border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  <img
                    src={r.imageUrl || 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80'}
                    alt={r.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => toggleFavorite(e, r.id)}
                      className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-[#E05638] transition"
                    >
                      <Heart className={`h-4 w-4 ${r.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
                    </button>
                    <div className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white">
                      <MoreVertical className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#E05638] transition">
                    {r.title}
                  </h3>
                  <div className="flex items-center justify-between pt-1">
                    <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {r.tags?.[0] || r.recipeType || 'Main Dish'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 20)}m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Interactive Recipe Details View Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-[#E05638]">{selectedRecipe.title}</h2>
                <p className="text-xs text-slate-400 mt-1">Recipe Details & Nutritional Matrix</p>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#0B101D] border border-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Segmented Tabs */}
            <div className="flex bg-[#0B101D] mx-6 mt-4 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'info', label: 'Basic Info' },
                { id: 'ingredients', label: 'Ingredients' },
                { id: 'steps', label: 'Steps' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    activeModalTab === tab.id
                      ? 'bg-[#111726] text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {activeModalTab === 'info' && (
                <div className="space-y-5">
                  {selectedRecipe.imageUrl && (
                    <img
                      src={selectedRecipe.imageUrl}
                      alt={selectedRecipe.title}
                      className="w-full h-48 object-cover rounded-2xl border border-slate-800"
                    />
                  )}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedRecipe.description || 'Nutritionally balanced culinary preparation.'}
                  </p>

                  <div className="grid grid-cols-4 gap-2 bg-[#0B101D] p-4 rounded-2xl border border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Calories</span>
                      <span className="text-sm font-black text-[#E05638]">{selectedRecipe.calories || 450} kcal</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Protein</span>
                      <span className="text-sm font-black text-emerald-400">{selectedRecipe.proteinGrams || 24}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Carbs</span>
                      <span className="text-sm font-black text-white">{selectedRecipe.carbsGrams || 45}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Fat</span>
                      <span className="text-sm font-black text-white">{selectedRecipe.fatGrams || 12}g</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#0B101D] p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block">Preparation Time</span>
                      <span className="font-bold text-white mt-0.5 block">{selectedRecipe.prepTimeMinutes || 15} minutes</span>
                    </div>
                    <div className="bg-[#0B101D] p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block">Cooking Time</span>
                      <span className="font-bold text-white mt-0.5 block">{selectedRecipe.cookTimeMinutes || 25} minutes</span>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'ingredients' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#E05638] uppercase tracking-wider">Required Ingredients</h4>
                  <ul className="space-y-2">
                    {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, i: number) => {
                      const itemText = typeof ing === 'string' ? ing : ing.item || ing.name;
                      const qtyText = typeof ing === 'string' ? '' : ing.quantity || ing.amount || '';
                      return (
                        <li key={i} className="flex justify-between items-center p-3 bg-[#0B101D] rounded-xl border border-slate-800 text-xs">
                          <span className="text-white font-medium">{itemText}</span>
                          {qtyText && <span className="bg-[#111726] px-2.5 py-1 rounded-lg text-emerald-400 font-bold border border-slate-800">{qtyText}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {activeModalTab === 'steps' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#E05638] uppercase tracking-wider">Step-by-Step Instructions</h4>
                  <ol className="space-y-3">
                    {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, i: number) => (
                      <li key={i} className="flex gap-3.5 p-3.5 bg-[#0B101D] rounded-xl border border-slate-800 text-xs leading-relaxed text-slate-200">
                        <span className="w-6 h-6 rounded-full bg-[#E05638]/10 text-[#E05638] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open("apps/web/src/app/recipes/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Saved Recipes search, filters, and interactive details modal successfully installed!")
