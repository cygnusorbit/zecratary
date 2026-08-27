import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, MoreVertical,
  X, UploadCloud, Utensils, BookmarkPlus, CalendarPlus,
  ShoppingCart, Timer, Edit3, Share2, CheckSquare, Square, Star, ExternalLink, Trash2, Save, Plus, CheckCircle2, Type, Lock, ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');

  // Reorder Mode States
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);

  const [activeModalTab, setActiveModalTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);

  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const fetchRecipes = async () => {
    try {
      const local = localStorage.getItem('zecratary_saved_recipes');
      if (local) {
        setRecipes(JSON.parse(local));
        setLoading(false);
      }

      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (data.success && data.recipes?.length > 0) {
        if (!local) {
          setRecipes(data.recipes);
          localStorage.setItem('zecratary_saved_recipes', JSON.stringify(data.recipes));
        }
      } else if (!local) {
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
              { amount: '35', unit: 'g', item: 'palm sugar, chopped (3 tbsp tightly packed)', category: 'Pantry Staples' },
              { amount: '3', unit: 'tbsp', item: '(45 ml) water', category: 'Beverages' },
              { amount: '3', unit: 'Unit', item: '-4 tbsp thai cooking tamarind', category: 'Condiments and Sauces' },
              { amount: '2', unit: 'tbsp', item: 'good fish sauce', category: 'Condiments and Sauces' },
              { amount: '4', unit: 'oz', item: '(115g) dry rice noodles, medium size', category: 'Grains and Pasta' }
            ],
            instructions: [
              'Add palm sugar to a small pot and melt over medium heat. Once the sugar is melting, keep stirring until it darkens in colour.',
              'Cut dried noodles once with scissors so they are half as long. This makes them easier to toss and separate in the wok.'
            ]
          }
        ];
        setRecipes(defaultRecipes);
        localStorage.setItem('zecratary_saved_recipes', JSON.stringify(defaultRecipes));
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

  const handleSaveEdit = () => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, ...editForm };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditing(false);
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
  };

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const list = [...(editForm.ingredients || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setEditForm({ ...editForm, ingredients: list });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const steps = [...(editForm.instructions || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const temp = steps[index];
    steps[index] = steps[targetIndex];
    steps[targetIndex] = temp;
    setEditForm({ ...editForm, instructions: steps });
  };

  const toggleStepComplete = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(i => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
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
              onClick={() => { setSelectedRecipe(r); setServingsMultiplier(1); setNoteText(r.note || ''); setCompletedSteps([]); setIsEditing(false); setActiveModalTab('info'); }}
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
          ))}
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
                        
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                            className="p-2 bg-[#1B2436]/90 border border-slate-700/80 rounded-full text-white hover:text-[#E05638] transition"
                            title="Favorite"
                          >
                            <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
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
                        className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit Recipe
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

                  {/* INGREDIENTS & INSTRUCTIONS SECTION WITH FONT ENLARGE */}
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
                        const qtyText = typeof ing === 'string' ? '' : ing.quantity || ing.amount || '';
                        const unitText = typeof ing === 'string' ? '' : ing.unit || '';
                        return (
                          <div key={i} className="flex items-start gap-3 py-1">
                            <span className="w-2 h-2 rounded-full bg-[#E05638] shrink-0 mt-1.5" />
                            <span className="text-slate-200 leading-snug">
                              {qtyText && <strong className="text-white font-semibold">{qtyText} {unitText} </strong>}
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
                          className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#E05638]"
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
                /* FULL EDIT FORM WITH REORDER TOGGLE BUTTONS */
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
                          className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638] resize-y"
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

                  {/* INGREDIENTS EDIT TAB WITH INTERACTIVE REORDER TOGGLE */}
                  {editTab === 'ingredients' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-[#E05638] uppercase">Ingredients</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className={`font-bold px-3.5 py-1.5 rounded-lg border transition ${
                              isReorderingIngredients
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-[#1B2436] text-slate-200 border-slate-700 hover:bg-[#25324A]'
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
                          <div key={idx} className="flex items-center gap-2 bg-[#0B101D] p-2.5 rounded-xl border border-slate-800">
                            
                            {/* Reorder Up/Down arrows when Reorder mode is active */}
                            {isReorderingIngredients && (
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  onClick={() => moveIngredient(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => moveIngredient(idx, 'down')}
                                  disabled={idx === editForm.ingredients.length - 1}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            <input
                              type="text"
                              placeholder="35"
                              value={ing.amount || ing.quantity || ''}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx] = { ...list[idx], amount: e.target.value };
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white text-center font-bold outline-none"
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
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 text-center outline-none"
                            />
                            <input
                              type="text"
                              placeholder="palm sugar, chopped..."
                              value={ing.item || ing.name || ''}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx] = { ...list[idx], item: e.target.value };
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white text-xs outline-none px-2"
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
                            
                            {!isReorderingIngredients && (
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
                            
                            {isReorderingIngredients && (
                              <div className="p-2 text-slate-500 cursor-grab">
                                <GripVertical className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEPS EDIT TAB WITH INTERACTIVE REORDER TOGGLE */}
                  {editTab === 'steps' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-[#E05638] uppercase">Step-by-Step Instructions</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className={`font-bold px-3.5 py-1.5 rounded-lg border transition ${
                              isReorderingSteps
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-[#1B2436] text-slate-200 border-slate-700 hover:bg-[#25324A]'
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
                          <div key={idx} className="flex items-start gap-3 bg-[#0B101D] p-3 rounded-xl border border-slate-800">
                            
                            {isReorderingSteps && (
                              <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                                <button
                                  onClick={() => moveStep(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => moveStep(idx, 'down')}
                                  disabled={idx === editForm.instructions.length - 1}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}

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
                              className="flex-1 bg-transparent border-none text-white text-xs outline-none resize-y"
                            />
                            
                            {!isReorderingSteps && (
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

                            {isReorderingSteps && (
                              <div className="p-2 text-slate-500 cursor-grab mt-1">
                                <GripVertical className="h-4 w-4" />
                              </div>
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
    </div>
  );
}
"""

with open("apps/web/src/app/recipes/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Interactive Reorder toggle and move controls installed!")
