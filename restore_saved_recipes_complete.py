import os

recipes_page_code = """'use client';
import { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, Heart, MoreVertical, Plus, 
  Trash2, Edit3, X, ChefHat, CheckSquare, ShoppingCart, Clock, Users, CalendarPlus 
} from 'lucide-react';
import { CATEGORIES } from '@/constants/categories';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal / Detail views
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [shoppingIngredients, setShoppingIngredients] = useState<any[]>([]);

  // Planner modal states
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerDate, setPlannerDate] = useState('2026-08-27');
  const [plannerMealType, setPlannerMealType] = useState('Dinner');
  const [plannerTime, setPlannerTime] = useState('');
  const [plannerNotes, setPlannerNotes] = useState('');

  // Create Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Main Dish');
  const [formImage, setFormImage] = useState('https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80');
  const [formServings, setFormServings] = useState('2');
  const [formPrepTime, setFormPrepTime] = useState('25 mins');
  const [formIngredients, setFormIngredients] = useState<any[]>([
    { id: 'i_1', amount: '3', unit: '', name: 'cloves garlic', category: 'Produce' },
    { id: 'i_2', amount: '¼', unit: 'cup', name: 'roughly chopped shallots', category: 'Produce' }
  ]);
  const [formSteps, setFormSteps] = useState<string[]>([
    'Prepare all ingredients before starting.',
    'Heat vegetable oil in a wok over medium-high heat.'
  ]);

  useEffect(() => {
    document.title = 'Saved Recipes - FoodiePrep';
    const local = localStorage.getItem('zecratary_recipes');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipes(parsed);
          return;
        }
      } catch (e) {}
    }

    const defaultRecipes = [
      {
        id: 'rec_1',
        name: 'Authentic Pad Thai Recipe',
        category: 'Main Dish',
        isFavorite: true,
        image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
        servings: 2,
        prepTime: '25 mins',
        ingredients: [
          { id: 'i_1', amount: '3', unit: '', name: 'cloves garlic', category: 'Produce' },
          { id: 'i_2', amount: '¼', unit: 'cup', name: 'roughly chopped shallots', category: 'Produce' },
          { id: 'i_3', amount: '3', unit: 'tbsp', name: 'finely chopped sweet preserved daikon radish', category: 'Produce' },
          { id: 'i_4', amount: '2½', unit: 'cup', name: 'bean sprouts loosely packed', category: 'Produce' },
          { id: 'i_5', amount: '2', unit: 'tbsp', name: 'dried shrimp medium size roughly chopped', category: 'Meat and Seafood' },
          { id: 'i_6', amount: '3', unit: 'oz', name: 'pressed tofu', category: 'Meat and Seafood' }
        ],
        steps: [
          'Prepare all ingredients before starting.',
          'Heat vegetable oil in a wok over medium-high heat.',
          'Add garlic and shallots, fry until golden.',
          'Stir in noodles and sauce and mix thoroughly until done.'
        ]
      },
      {
        id: 'rec_2',
        name: 'Simple Green Salad',
        category: 'Main Dish',
        isFavorite: false,
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        servings: 4,
        prepTime: '15 mins',
        ingredients: [
          { id: 'i_7', amount: '1', unit: 'head', name: 'romaine lettuce', category: 'Produce' },
          { id: 'i_8', amount: '2', unit: 'tbsp', name: 'olive oil', category: 'Condiments and Sauces' }
        ],
        steps: [
          'Wash and chop romaine lettuce.',
          'Toss with olive oil and seasoning.'
        ]
      }
    ];
    setRecipes(defaultRecipes);
    localStorage.setItem('zecratary_recipes', JSON.stringify(defaultRecipes));
  }, []);

  const saveRecipes = (updated: any[]) => {
    setRecipes(updated);
    localStorage.setItem('zecratary_recipes', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    saveRecipes(updated);
  };

  const handleDeleteRecipe = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveRecipes(updated);
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
    setActiveMenuId(null);
  };

  const openShoppingListModal = (recipe: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShoppingIngredients(recipe.ingredients.map((ing: any) => ({ ...ing, selected: true })));
    setShowShoppingModal(true);
    setActiveMenuId(null);
  };

  const handleAddToShoppingList = () => {
    const selected = shoppingIngredients.filter(i => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one ingredient');
      return;
    }
    const local = localStorage.getItem('zecratary_shopping_list');
    let current = local ? JSON.parse(local) : [];
    const newItems = selected.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      name: i.name,
      amount: i.amount,
      unit: i.unit,
      category: i.category || 'Pantry Staples',
      checked: false,
      staple: false
    }));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify([...newItems, ...current]));
    setShowShoppingModal(false);
    alert(`Added ${newItems.length} items to your Shopping List!`);
  };

  const openPlannerModal = (recipe: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRecipe(recipe);
    setPlannerDate('2026-08-27');
    setPlannerMealType('Dinner');
    setPlannerTime('');
    setPlannerNotes('');
    setShowPlannerModal(true);
    setActiveMenuId(null);
  };

  const handleSaveToPlanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;
    const local = localStorage.getItem('zecratary_meal_plan');
    const currentPlan = local ? JSON.parse(local) : [];
    const planItem = {
      id: 'plan_' + Date.now(),
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      image: selectedRecipe.image,
      date: plannerDate,
      mealType: plannerMealType,
      time: plannerTime,
      notes: plannerNotes
    };
    localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, planItem]));
    setShowPlannerModal(false);
    alert(`Successfully scheduled ${selectedRecipe.name} to your Planner!`);
  };

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = !search.trim() || r.name?.toLowerCase().includes(search.toLowerCase().trim());
    const matchesTag = selectedTag === 'All' || r.category === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-20 px-2 sm:px-4">
      
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Saved Recipes</h1>
        <p className="text-sm font-semibold text-emerald-400">Your collection of favorite recipes</p>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#070b13] border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-slate-700 shadow-inner"
          />
        </div>

        <button
          onClick={() => setShowFilterModal(!showFilterModal)}
          className={`border font-bold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-sm ${
            selectedTag !== 'All' 
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' 
              : 'bg-[#070b13] hover:bg-[#0f172a] border-emerald-900/60 text-[#E05638]'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-3 rounded-xl transition flex items-center gap-1.5 shadow-md"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* RECIPES CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="group relative bg-[#070b13] rounded-2xl overflow-hidden border border-emerald-950 hover:border-emerald-700/60 transition cursor-pointer shadow-lg flex flex-col"
          >
            <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
              <img
                src={recipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'}
                alt={recipe.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              
              <div className="absolute top-3 right-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => toggleFavorite(recipe.id, e)}
                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition"
                >
                  <Heart className={`h-4 w-4 ${recipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === recipe.id ? null : recipe.id)}
                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {activeMenuId === recipe.id && (
                    <div className="absolute right-0 top-10 w-44 bg-[#111726] border border-slate-800 rounded-xl shadow-2xl py-1 z-30 text-xs text-slate-200">
                      <button
                        onClick={(e) => openPlannerModal(recipe, e)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 text-emerald-400" /> Add to Plan
                      </button>
                      <button
                        onClick={(e) => openShoppingListModal(recipe, e)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 text-[#E05638]" /> Add to Shopping
                      </button>
                      <button
                        onClick={(e) => handleDeleteRecipe(recipe.id, e)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-800 text-red-400 flex items-center gap-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-3 flex-1 bg-[#070b13]">
              <h3 className="font-extrabold text-sm text-white leading-snug line-clamp-2">
                {recipe.name}
              </h3>
              <span className="bg-[#E05638] text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm shrink-0">
                {recipe.category || 'Main Dish'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER POPUP */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowFilterModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold text-white">Filter Recipes</h3>
            <div className="flex flex-wrap gap-2">
              {['All', 'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snacks', 'Beverages'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    setShowFilterModal(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                    selectedTag === tag
                      ? 'bg-[#E05638] text-white'
                      : 'bg-[#0B101D] border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECIPE DETAIL MODAL */}
      {selectedRecipe && !showPlannerModal && !showShoppingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedRecipe(null)} className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full">
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3">
              <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {selectedRecipe.category || 'Main Dish'}
              </span>
              <h2 className="text-2xl font-black text-white">{selectedRecipe.name}</h2>
              <div className="flex items-center gap-4 text-xs font-semibold text-emerald-400">
                <span>⏱ {selectedRecipe.prepTime || '25 mins'}</span>
                <span>🍽 {selectedRecipe.servings || 2} Servings</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  onClick={(e) => openPlannerModal(selectedRecipe, e)}
                  className="flex items-center gap-2 bg-[#1e293b] hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                  <CalendarPlus className="h-4 w-4 text-emerald-400" /> Add to Plan
                </button>
                <button 
                  onClick={() => openShoppingListModal(selectedRecipe)}
                  className="flex items-center gap-2 bg-[#1e293b] hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                  <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Add to Shopping
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">Ingredients</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedRecipe.ingredients?.map((ing: any, idx: number) => (
                  <div key={idx} className="bg-[#0B101D] p-3 rounded-xl border border-slate-800/80 text-xs flex justify-between">
                    <span className="font-bold text-white capitalize">{ing.name}</span>
                    <span className="text-slate-400">{ing.amount} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">Preparation Steps</h3>
              <div className="space-y-2">
                {selectedRecipe.steps?.map((step: string, idx: number) => (
                  <div key={idx} className="flex gap-3 bg-[#0B101D] p-3 rounded-xl border border-slate-800/80 text-xs">
                    <span className="font-extrabold text-[#E05638]">{idx + 1}.</span>
                    <p className="text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO PLANNER MODAL */}
      {showPlannerModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setShowPlannerModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#1e293b] text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="pr-6">
              <h2 className="text-xl font-bold text-[#E05638]">Add to Calendar</h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                Schedule {selectedRecipe.name} in your meal plan
              </p>
            </div>

            <form onSubmit={handleSaveToPlanner} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={plannerDate}
                  onChange={(e) => setPlannerDate(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-[#E05638] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <select
                  value={plannerMealType}
                  onChange={(e) => setPlannerMealType(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-[#E05638] transition cursor-pointer"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <input
                  type="time"
                  value={plannerTime}
                  onChange={(e) => setPlannerTime(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-[#E05638] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={plannerNotes}
                  onChange={(e) => setPlannerNotes(e.target.value)}
                  placeholder="Add any notes or reminders..."
                  rows={3}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-[#E05638] transition resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPlannerModal(false)}
                  className="px-5 py-2.5 rounded-lg border border-green-800 text-[#E05638] font-bold text-xs hover:bg-green-900/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#E05638] text-white font-bold text-xs hover:bg-[#c94529] transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHOPPING LIST MODAL */}
      {showShoppingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button onClick={() => setShowShoppingModal(false)} className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#E05638]" /> Add to Shopping List
            </h2>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {shoppingIngredients.map((ing, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const updated = [...shoppingIngredients];
                    updated[idx].selected = !updated[idx].selected;
                    setShoppingIngredients(updated);
                  }}
                  className="flex items-center gap-3 p-3 bg-[#0B101D] border border-slate-800 rounded-xl cursor-pointer text-xs"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${ing.selected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'}`}>
                    {ing.selected && <CheckSquare className="h-3 w-3" />}
                  </div>
                  <span className="font-bold text-white capitalize flex-1">{ing.name}</span>
                  <span className="text-slate-400">{ing.amount} {ing.unit}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setShowShoppingModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">
                Cancel
              </button>
              <button onClick={handleAddToShoppingList} className="px-5 py-2 bg-[#E05638] text-white font-bold rounded-xl text-xs hover:bg-[#c94529] shadow-md">
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RECIPE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E05638]" /> Add New Recipe
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Recipe Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Authentic Pad Thai Recipe..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category Tag</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                  >
                    {['Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snacks', 'Beverages'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Image URL</label>
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-[#E05638] uppercase">Ingredients</label>
                  <button
                    onClick={() => setFormIngredients([...formIngredients, { id: 'i_' + Date.now(), amount: '', unit: '', name: '', category: 'Produce' }])}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    + Add Ingredient
                  </button>
                </div>
                {formIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Amt"
                      value={ing.amount}
                      onChange={(e) => {
                        const updated = [...formIngredients];
                        updated[idx].amount = e.target.value;
                        setFormIngredients(updated);
                      }}
                      className="w-14 bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-center text-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => {
                        const updated = [...formIngredients];
                        updated[idx].unit = e.target.value;
                        setFormIngredients(updated);
                      }}
                      className="w-16 bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-center text-slate-300 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Name..."
                      value={ing.name}
                      onChange={(e) => {
                        const updated = [...formIngredients];
                        updated[idx].name = e.target.value;
                        setFormIngredients(updated);
                      }}
                      className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl">Cancel</button>
                <button
                  onClick={() => {
                    if (!formName.trim()) return;
                    const newRec = {
                      id: 'rec_' + Date.now(),
                      name: formName.trim(),
                      category: formCategory,
                      image: formImage,
                      servings: parseInt(formServings) || 2,
                      prepTime: formPrepTime,
                      isFavorite: true,
                      ingredients: formIngredients.filter(i => i.name.trim()),
                      steps: formSteps.filter(s => s.trim())
                    };
                    saveRecipes([newRec, ...recipes]);
                    setShowCreateModal(false);
                    setFormName('');
                  }}
                  className="px-5 py-2 bg-[#E05638] text-white font-bold rounded-xl hover:bg-[#c94529]"
                >
                  Save Recipe
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

# Write to both /recipes and /saved routes so it's always accessible
os.makedirs("apps/web/src/app/recipes", exist_ok=True)
os.makedirs("apps/web/src/app/saved", exist_ok=True)

with open("apps/web/src/app/recipes/page.tsx", "w", encoding="utf-8") as f:
    f.write(recipes_page_code)

with open("apps/web/src/app/saved/page.tsx", "w", encoding="utf-8") as f:
    f.write(recipes_page_code)

print("✅ Saved Recipes successfully restored at both /recipes and /saved!")
