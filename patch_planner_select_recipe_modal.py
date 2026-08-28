import os

planner_code = """'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Check, Heart, SlidersHorizontal, ChevronDown
} from 'lucide-react';

export default function PlannerPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-08-24'));
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Add Meal Modal State
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('2026-08-28');
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  // "Select Recipe" Sub-Modal State
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('All Books');
  const [activeRecipeTagFilter, setActiveRecipeTagFilter] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Load recipes and books from localStorage
  const loadSavedData = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const keys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes', 'recipes'];
      let loaded: any[] = [];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((rec) => {
              const recName = rec.name || rec.title;
              if (rec && recName && !loaded.some(l => l.id === rec.id || (l.name || l.title) === recName)) {
                loaded.push({
                  ...rec,
                  name: recName,
                  title: recName,
                  image: rec.image || rec.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
                  imageUrl: rec.image || rec.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
                  category: rec.category || rec.recipeType || (Array.isArray(rec.tags) ? rec.tags[0] : 'Main Dish'),
                  isFavorite: Boolean(rec.isFavorite)
                });
              }
            });
          }
        }
      }

      if (loaded.length === 0) {
        loaded = [
          {
            id: 'rec_fried_rice',
            name: 'Authentic Pad Thai Recipe',
            title: 'Authentic Pad Thai Recipe',
            category: 'Main Dish',
            isFavorite: true,
            bookId: 'book_2',
            image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
            imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'
          }
        ];
        localStorage.setItem('zecratary_recipes', JSON.stringify(loaded));
      }
      setSavedRecipes(loaded);

      // Load books
      const rawBooks = localStorage.getItem('zecratary_recipe_books');
      if (rawBooks) {
        setBooks(JSON.parse(rawBooks));
      } else {
        setBooks([
          { id: 'book_1', title: 'Family Favorites & Weeknight Dinners' },
          { id: 'book_2', title: 'Authentic Asian Cuisine' },
          { id: 'book_3', title: 'Baking & Desserts' }
        ]);
      }
    } catch (e) {
      console.error('Failed to load recipes/books', e);
    }
  }, []);

  useEffect(() => {
    document.title = 'Meal Planner - FoodiePrep';
    
    const localPlan = localStorage.getItem('zecratary_meal_plan');
    if (localPlan) {
      try {
        setPlannedMeals(JSON.parse(localPlan));
      } catch (e) {}
    } else {
      const defaultPlan = [
        {
          id: 'p_1',
          date: '2026-08-28',
          recipeName: 'Authentic Pad Thai Recipe',
          image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00',
          isLeftover: false,
          notes: ''
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
    }

    loadSavedData();

    const handleSync = () => loadSavedData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
    };
  }, [loadSavedData]);

  const openAddModal = (date: string) => {
    loadSavedData();
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
    setIsLeftover(false);
    setNotes('');
    setShowRecipePickerModal(false);
    setShowAddMealModal(true);
  };

  const savePlan = (updated: any[]) => {
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeObj) {
      alert('Please click "+ Select Recipe" to pick a dish.');
      return;
    }
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: activeDateForAdd || selectedDate,
      recipeId: selectedRecipeObj.id,
      recipeName: selectedRecipeObj.name || selectedRecipeObj.title,
      image: selectedRecipeObj.image || selectedRecipeObj.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
      mealType: mealType,
      time: mealTime,
      isLeftover: isLeftover,
      notes: notes
    };
    savePlan([...plannedMeals, newMeal]);
    setShowAddMealModal(false);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = d.getDate();
    weekDays.push({ dateStr, dayName, dayNum, fullDate: d });
  }

  const todayStr = '2026-08-28';
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeDateObj = new Date(activeDateForAdd + 'T00:00:00');
  const activeDateFormattedHeader = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const activeDateFieldText = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Filter recipes for the "Select Recipe" modal
  const filteredPickerRecipes = savedRecipes.filter(r => {
    const name = (r.name || r.title || '').toLowerCase();
    const matchesSearch = !recipeSearch.trim() || name.includes(recipeSearch.toLowerCase().trim());
    
    let matchesBook = true;
    if (selectedBookFilter !== 'All Books') {
      matchesBook = r.bookId === selectedBookFilter;
    }

    let matchesTag = true;
    if (activeRecipeTagFilter !== 'All') {
      if (activeRecipeTagFilter === 'Favorites') {
        matchesTag = Boolean(r.isFavorite);
      } else {
        matchesTag = (r.category === activeRecipeTagFilter || r.tags?.includes(activeRecipeTagFilter));
      }
    }

    return matchesSearch && matchesBook && matchesTag;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-24 px-4">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Planner</h1>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => alert('Plan Week activated!')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <CalendarIcon className="h-4 w-4" /> Plan Week
          </button>
          <button 
            onClick={() => alert('Week copied!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Copy className="h-4 w-4 text-[#E05638]" /> Copy Week
          </button>
          <Link
            href="/shopping"
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <ShoppingBag className="h-4 w-4 text-[#E05638]" /> Shopping List
          </Link>
          <button 
            onClick={() => alert('Share link copied!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4 text-[#E05638]" /> Share
          </button>
        </div>
      </div>

      {/* WEEK STRIP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-base font-extrabold text-[#E05638] tracking-wide">{rangeStr}</span>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const next = new Date(currentWeekStart);
                next.setDate(next.getDate() + 7);
                setCurrentWeekStart(next);
              }}
              className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentWeekStart(new Date('2026-08-24'))}
              className="px-3.5 py-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs rounded-xl transition"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const isToday = d.dateStr === todayStr;
            const hasMeals = plannedMeals.some(m => m.date === d.dateStr);

            return (
              <div
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  isToday 
                    ? 'bg-[#161213] border-[#E05638] shadow-md' 
                    : isSelected 
                    ? 'bg-[#111726] border-emerald-500' 
                    : 'bg-[#070b13] border-emerald-950/80 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{d.dayName}</span>
                <span className={`text-xl font-black mt-1 ${isToday ? 'text-[#E05638]' : 'text-white'}`}>{d.dayNum}</span>
                {isToday && <span className="text-[9px] font-bold text-[#E05638] uppercase mt-0.5">Today</span>}
                {hasMeals && !isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#E05638] mt-1"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* DAILY AVERAGE BANNER */}
      <div className="bg-[#070b13] border border-emerald-950 rounded-2xl p-5 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <span className="text-lg">🔥</span> Daily average
          </div>
          <button className="flex items-center gap-1.5 bg-[#161213] border border-emerald-900/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-emerald-950/30 transition">
            <Lock className="h-3.5 w-3.5" /> Upgrade
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-400 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Calories</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">1,234</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Protein</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">120g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Carbs</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">150g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Fat</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">45g</span>
          </div>
        </div>
      </div>

      {/* SELECTED DATE MEALS */}
      {(() => {
        const dObj = new Date(selectedDate + 'T00:00:00');
        const titleDate = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const isToday = selectedDate === todayStr;
        const dayMeals = plannedMeals.filter(m => m.date === selectedDate);

        return (
          <div className="bg-[#070b13] border border-emerald-950 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white">{titleDate}</h2>
                {isToday && (
                  <span className="bg-[#E05638] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    TODAY
                  </span>
                )}
              </div>
              <button
                onClick={() => openAddModal(selectedDate)}
                className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" /> Add Meal
              </button>
            </div>

            {dayMeals.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <ChefHat className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Nothing planned yet</p>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="inline-flex items-center gap-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add a meal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md gap-4">
                    <div className="flex items-center gap-3.5">
                      <img 
                        src={meal.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80'} 
                        alt={meal.recipeName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0" 
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                            {meal.mealType}
                          </span>
                          {meal.isLeftover && (
                            <span className="bg-amber-950/60 border border-amber-600/40 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Leftover
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug">{meal.recipeName}</h3>
                        {meal.time && <span className="text-[11px] text-slate-400 flex items-center gap-1">⏰ {meal.time}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-[#070b13] rounded-xl border border-slate-800 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 1. MAIN "ADD MEAL" MODAL (MATCHING SCREENSHOT 1) */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in">
            
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight">
                Add Meal for {activeDateFormattedHeader}
              </h2>
              <p className="text-slate-400 text-xs">
                Plan your meal by selecting a recipe and adding details.
              </p>
            </div>

            <form onSubmit={handleAddMealSubmit} className="space-y-3.5 pt-1">
              
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="w-full bg-[#070b13] border-2 border-blue-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200">
                  {activeDateFieldText}
                </div>
              </div>

              {/* Meal Type */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                    placeholder="--:--"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Recipe Button / Selected Recipe Card */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {selectedRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image || selectedRecipeObj.imageUrl} 
                        alt={selectedRecipeObj.name || selectedRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700" 
                      />
                      <span className="text-white font-bold text-xs truncate">
                        {selectedRecipeObj.name || selectedRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowRecipePickerModal(true)}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRecipePickerModal(true)}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" /> Select Recipe
                  </button>
                )}
              </div>

              {/* Leftover Switch */}
              <div className="bg-[#070b13] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#E05638]">Leftover</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mark as leftovers from a previous meal — won't be added to shopping lists.
                  </p>
                </div>
                
                <div 
                  onClick={() => setIsLeftover(!isLeftover)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3 ${
                    isLeftover ? 'bg-[#E05638]' : 'bg-[#1e293b]'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    isLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={3}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none placeholder-slate-500"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. "SELECT RECIPE" POPUP MODAL (MATCHING SCREENSHOT 2) */}
      {showRecipePickerModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0a0c10] border border-slate-800/90 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in min-h-[500px] flex flex-col justify-between">
            
            <div className="space-y-4">
              {/* Close Button */}
              <button 
                onClick={() => setShowRecipePickerModal(false)} 
                className="absolute top-4 right-4 p-2 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="space-y-0.5 pr-8">
                <h2 className="text-lg font-black text-[#E05638] tracking-tight">Select Recipe</h2>
                <p className="text-xs text-slate-400">
                  Choose a recipe to add to your meal plan
                </p>
              </div>

              {/* Top Search & Filter Bar */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  
                  {/* Search by Name */}
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="w-full bg-[#07090e] border border-[#E05638] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none"
                    />
                  </div>

                  {/* All Books Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedBookFilter}
                      onChange={(e) => setSelectedBookFilter(e.target.value)}
                      className="bg-[#07090e] border border-emerald-800 text-[#E05638] font-bold text-xs rounded-xl pl-3 pr-7 py-2 outline-none appearance-none cursor-pointer"
                    >
                      <option value="All Books">All Books</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Filter Button */}
                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className="border border-emerald-800 bg-[#07090e] hover:bg-emerald-950/30 text-[#E05638] font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#E05638]" /> Filter
                  </button>
                </div>

                {/* Filter Tags Strip */}
                {showFilterOptions && (
                  <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                    {['All', 'Favorites', 'Main Dish', 'Appetizer', 'Dessert'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveRecipeTagFilter(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          activeRecipeTagFilter === tag
                            ? 'bg-[#E05638] text-white border-[#E05638]'
                            : 'bg-[#07090e] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipe Item Cards */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredPickerRecipes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No recipes found matching criteria.
                  </div>
                ) : (
                  filteredPickerRecipes.map((rec) => {
                    const recTitle = rec.name || rec.title || 'Untitled Recipe';
                    const recCategory = rec.category || rec.recipeType || 'Main Dish';
                    const recImage = rec.image || rec.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80';

                    return (
                      <div
                        key={rec.id || recTitle}
                        className="flex items-center justify-between p-2 rounded-2xl bg-transparent transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={recImage}
                            alt={recTitle}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-extrabold text-[#E05638] text-xs leading-snug truncate">
                              {recTitle}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="bg-[#E05638] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {recCategory}
                              </span>
                              <Heart className="h-3 w-3 fill-[#E05638] text-[#E05638]" />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecipeObj(rec);
                            setShowRecipePickerModal(false);
                          }}
                          className="px-4 py-1.5 bg-[#07090e] border border-emerald-800/80 hover:bg-emerald-950/30 text-[#E05638] font-bold text-xs rounded-xl transition shrink-0 ml-2"
                        >
                          Select
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Green Count Label */}
            <div className="text-center py-2 text-xs font-semibold text-emerald-400">
              Showing {filteredPickerRecipes.length} of {savedRecipes.length} recipes
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
"""

os.makedirs("apps/web/src/app/planner", exist_ok=True)
with open("apps/web/src/app/planner/page.tsx", "w", encoding="utf-8") as f:
    f.write(planner_code)

print("✅ 'Select Recipe' popup modal successfully integrated on /planner!")
