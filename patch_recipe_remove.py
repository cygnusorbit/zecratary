import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, MoreVertical,
  X, UploadCloud, Utensils, BookmarkPlus, CalendarPlus,
  ShoppingCart, Timer, Edit3, Share2, CheckSquare, Square, Star, ExternalLink, Trash2
} from 'lucide-react';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [noteText, setNoteText] = useState('');
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
              description: 'This pad thai recipe is the real deal. Fully loaded with all the classic ingredients an authentic pad thai should have. Perfectly balanced flavour that is complex and not overly sweet.',
              servings: 4,
              prepTimeMinutes: 30,
              cookTimeMinutes: 10,
              calories: 480,
              proteinGrams: 24,
              carbsGrams: 55,
              fatGrams: 15,
              tags: ['Main Dish'],
              recipeType: 'Main Dish',
              isFavorite: true,
              isCooked: false,
              rating: 0,
              note: '',
              sourceUrl: 'https://hot-thai-kitchen.com',
              imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
              ingredients: [
                { item: 'Rice noodles', quantity: '250g' },
                { item: 'Shrimp or Tofu', quantity: '200g' },
                { item: 'Tamarind paste', quantity: '2 tbsp' },
                { item: 'Fish sauce', quantity: '2 tbsp' },
                { item: 'Palm sugar', quantity: '1.5 tbsp' },
                { item: 'Bean sprouts & Peanuts', quantity: '1 cup' }
              ],
              instructions: [
                'Soak dried rice noodles in warm water until soft and pliable, then drain.',
                'Mix tamarind paste, fish sauce, and palm sugar together in a small bowl for the sauce.',
                'Heat oil in a wok over high heat, cook your protein of choice until done.',
                'Add drained noodles and sauce directly into the wok, tossing continuously until absorbed.',
                'Push noodles to one side, scramble eggs in the empty space, then toss everything together with bean sprouts.'
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
      setRecipes(updated);
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updated));
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
      }
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  };

  const updateRecipeState = (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    setRecipes(updatedList);
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));
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
              className="w-full bg-[#111726] border border-emerald-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638]"
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
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelectedRecipe(r); setServingsMultiplier(1); setNoteText(r.note || ''); setActiveModalTab('info'); }}
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

      {/* RECIPE DETAILS POPUP MODAL WITH REMOVE BUTTON */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-black text-white rounded-full backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-6">
              
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
                      <Utensils className="h-3.5 w-3.5 text-orange-400" /> {selectedRecipe.tags?.[0] || 'Main Dish'}
                    </span>
                    
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                        className="p-2 bg-[#1B2436]/90 border border-slate-700/80 rounded-full text-white hover:text-[#E05638] transition"
                        title="Favorite"
                      >
                        <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteRecipe(e, selectedRecipe.id)}
                        className="p-2 bg-red-950/80 border border-red-900/50 rounded-full text-red-400 hover:bg-red-900 transition"
                        title="Delete Recipe"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Action Bar Buttons */}
              <div className="px-6 grid grid-cols-3 gap-3">
                <button
                  onClick={() => alert(`Added "${selectedRecipe.title}" to Book!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <BookmarkPlus className="h-4 w-4 text-[#E05638]" /> Add to Book
                </button>
                <button
                  onClick={() => alert(`Scheduled "${selectedRecipe.title}" into Meal Planner!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4 text-emerald-400" /> Add to Plan
                </button>
                <button
                  onClick={() => alert(`Added ingredients for "${selectedRecipe.title}" to Shopping List!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                </button>
              </div>

              <div className="border-t border-slate-800 mx-6" />

              {/* Secondary Controls Bar: Servings, Timer, Edit, Share */}
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
                      {(selectedRecipe.servings || 4) * servingsMultiplier}
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
                    onClick={() => alert('Opening Recipe Editor...')}
                    className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-[#E05638]" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Recipe link copied to clipboard!');
                    }}
                    className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Share2 className="h-3.5 w-3.5 text-blue-400" /> Share Recipe
                  </button>
                </div>
              </div>

              {/* Description Body */}
              <div className="px-6 text-sm text-slate-300 leading-relaxed">
                {selectedRecipe.description}
              </div>

              <div className="border-t border-slate-800 mx-6" />

              {/* Ingredients & Steps Sections */}
              <div className="px-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[#E05638]">Ingredients</h3>
                    <ul className="space-y-2 text-xs">
                      {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, i: number) => (
                        <li key={i} className="flex justify-between items-center p-2.5 bg-[#0B101D] rounded-xl border border-slate-800">
                          <span className="text-slate-200 font-medium">{typeof ing === 'string' ? ing : ing.item || ing.name}</span>
                          <span className="text-emerald-400 font-bold">
                            {typeof ing === 'string' ? '' : ing.quantity || ing.amount || ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[#E05638]">Instructions</h3>
                    <ol className="space-y-3 text-xs">
                      {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, i: number) => (
                        <li key={i} className="flex gap-3 p-3 bg-[#0B101D] rounded-xl border border-slate-800 text-slate-200 leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-[#E05638]/20 text-[#E05638] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
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
                  <input
                    type="text"
                    placeholder="e.g. Added extra garlic, cooked 2 minutes less..."
                    value={noteText}
                    onChange={(e) => {
                      setNoteText(e.target.value);
                      updateRecipeState('note', e.target.value);
                    }}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#E05638]"
                  />
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

print("✅ Delete/Remove button added successfully to both recipe cards and recipe popup modal!")
