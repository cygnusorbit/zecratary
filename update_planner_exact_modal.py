import os

planner_code = """'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Check, Utensils
} from 'lucide-react';

export default function PlannerPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-08-24'));
  const [selectedDate, setSelectedDate] = useState('2026-08-27');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);

  // Main Add Meal Modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('2026-08-27');
  
  // Modal Form states
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  // Sub-modal for selecting recipe
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');

  const loadSavedRecipes = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const keys = ['zecratary_recipes', 'saved_recipes', 'recipes', 'foodieprep_recipes'];
      let loaded: any[] = [];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((rec) => {
              if (rec && rec.name && !loaded.some(l => l.id === rec.id || l.name.toLowerCase() === rec.name.toLowerCase())) {
                loaded.push({
                  ...rec,
                  image: rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
                  category: rec.category || 'Main Dish'
                });
              }
            });
          }
        }
      }

      if (loaded.length === 0) {
        loaded = [
          {
            id: 'rec_1',
            name: 'Authentic Pad Thai Recipe',
            category: 'Main Dish',
            image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'rec_2',
            name: 'Simple Green Salad',
            category: 'Main Dish',
            image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
          }
        ];
        localStorage.setItem('zecratary_recipes', JSON.stringify(loaded));
      }

      setSavedRecipes(loaded);
    } catch (e) {
      console.error('Failed to load recipes', e);
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
          date: '2026-08-27',
          recipeName: 'Simple Green Salad',
          image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00',
          isLeftover: false,
          notes: ''
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
    }

    loadSavedRecipes();
  }, [loadSavedRecipes]);

  const openAddModal = (date: string) => {
    loadSavedRecipes();
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
    setIsLeftover(false);
    setNotes('');
    setShowRecipePicker(false);
    setShowAddMealModal(true);
  };

  const savePlan = (updated: any[]) => {
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeObj) {
      alert('Please select a recipe by clicking "+ Select Recipe".');
      return;
    }
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: activeDateForAdd || selectedDate,
      recipeId: selectedRecipeObj.id,
      recipeName: selectedRecipeObj.name,
      image: selectedRecipeObj.image,
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

  const todayStr = '2026-08-27';
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeDateObj = new Date(activeDateForAdd);
  const activeDateFormattedHeader = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const activeDateFieldText = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const filteredSavedRecipes = savedRecipes.filter(r => 
    !recipeSearch.trim() || r.name?.toLowerCase().includes(recipeSearch.toLowerCase().trim())
  );

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
          <button 
            onClick={() => window.location.href = '/shopping'}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <ShoppingBag className="h-4 w-4 text-[#E05638]" /> Shopping List
          </button>
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
        const dObj = new Date(selectedDate);
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
                        src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
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

      {/* EXACT REFERENCE MATCHING ADD MEAL POPUP */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-slate-800/90 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs">
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* HEADER */}
            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight">
                Add Meal for {activeDateFormattedHeader}
              </h2>
              <p className="text-slate-400 text-xs">
                Plan your meal by selecting a recipe and adding details.
              </p>
            </div>

            <form onSubmit={handleAddMealSubmit} className="space-y-3.5 pt-1">
              
              {/* DATE FIELD */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="w-full bg-[#070b13] border-2 border-blue-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200">
                  {activeDateFieldText}
                </div>
              </div>

              {/* MEAL TYPE DROPDOWN */}
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
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                  </div>
                </div>
              </div>

              {/* TIME FIELD */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-3.5 w-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                    placeholder="--:-- --"
                  />
                  <Clock className="h-3.5 w-3.5 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* RECIPE SELECTION */}
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {selectedRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image} 
                        alt={selectedRecipeObj.name}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700" 
                      />
                      <span className="text-white font-bold text-xs truncate">{selectedRecipeObj.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowRecipePicker(true)}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRecipePicker(true)}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Select Recipe
                  </button>
                )}
              </div>

              {/* LEFTOVER TOGGLE SWITCH */}
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

              {/* NOTES */}
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

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2 rounded-lg border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECIPE PICKER SUB-MODAL */}
      {showRecipePicker && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-xs">
            <button 
              onClick={() => setShowRecipePicker(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-[#E05638]" /> Choose a Saved Recipe
            </h3>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search recipe..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {filteredSavedRecipes.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">No recipes found.</div>
              ) : (
                filteredSavedRecipes.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setSelectedRecipeObj(rec);
                      setShowRecipePicker(false);
                    }}
                    className="flex items-center gap-3 p-2.5 bg-[#070b13] hover:bg-[#111726] border border-slate-800 hover:border-[#E05638] rounded-xl cursor-pointer transition"
                  >
                    <img 
                      src={rec.image} 
                      alt={rec.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" 
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-xs truncate">{rec.name}</h4>
                      <span className="text-[10px] text-emerald-400">{rec.category || 'Main Dish'}</span>
                    </div>
                  </div>
                ))
              )}
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

print("✅ Planner page updated to match your exact 'Add Meal' modal reference!")
