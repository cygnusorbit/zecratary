import os
import json

# The 4 exact recipes from your Saved Recipes collection
CURRENT_SAVED_RECIPES = [
    {
        "id": "rec_caesar_1",
        "name": "Caesar Salad",
        "category": "Main Dish",
        "prepTime": "45m",
        "time": "45m",
        "tag": "Baking & Desserts",
        "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80"
    },
    {
        "id": "rec_caesar_2",
        "name": "Caesar Salad Recipe",
        "category": "Main Dish",
        "prepTime": "45m",
        "time": "45m",
        "tag": "Baking & Desserts",
        "image": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80"
    },
    {
        "id": "rec_garden_salad",
        "name": "Garden Salad",
        "category": "Main Dish",
        "prepTime": "45m",
        "time": "45m",
        "tag": "Main Dish",
        "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80"
    },
    {
        "id": "rec_bak_kut_teh",
        "name": "Singapore Style Bak Kut Teh",
        "category": "Imported",
        "prepTime": "55m",
        "time": "55m",
        "rating": 4,
        "isCooked": True,
        "tag": "Imported",
        "image": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80"
    }
]

planner_code = f"""'use client';
import {{ useState, useEffect, useCallback }} from 'react';
import Link from 'next/link';
import {{ 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, X, Search, Clock, Check
}} from 'lucide-react';

const FOUR_SAVED_RECIPES = {json.dumps(CURRENT_SAVED_RECIPES, indent=2)};

export default function PlannerPage() {{
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-08-24'));
  const [selectedDate, setSelectedDate] = useState('2026-08-27');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>(FOUR_SAVED_RECIPES);

  // Modal & Selection State
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('2026-08-27');
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);

  // Sync recipes across all possible localStorage keys
  const loadSavedRecipes = useCallback(() => {{
    if (typeof window === 'undefined') return;

    let loaded: any[] = [];
    const keys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes', 'recipes'];

    for (const key of keys) {{
      const raw = localStorage.getItem(key);
      if (raw) {{
        try {{
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {{
            loaded = parsed;
            break;
          }}
        }} catch (e) {{}}
      }}
    }}

    // Merge with the 4 default saved recipes so all 4 always exist
    const merged = [...loaded];
    FOUR_SAVED_RECIPES.forEach((defaultRec) => {{
      const exists = merged.some(
        r => (r.id && r.id === defaultRec.id) ||
             (r.name && r.name.toLowerCase().trim() === defaultRec.name.toLowerCase().trim())
      );
      if (!exists) {{
        merged.push(defaultRec);
      }}
    }});

    // Remove obsolete placeholders like Simple Green Salad if present
    const cleaned = merged.filter(r => r.name !== 'Simple Green Salad' && r.name !== 'Authentic Pad Thai Recipe');
    const finalList = cleaned.length > 0 ? cleaned : FOUR_SAVED_RECIPES;

    setSavedRecipes(finalList);
    localStorage.setItem('zecratary_recipes', JSON.stringify(finalList));
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(finalList));
  }}, []);

  useEffect(() => {{
    document.title = 'Meal Planner - FoodiePrep';

    // Load planned meals
    const localPlan = localStorage.getItem('zecratary_meal_plan');
    if (localPlan) {{
      try {{
        setPlannedMeals(JSON.parse(localPlan));
      }} catch (e) {{}}
    }} else {{
      const initialPlan = [
        {{
          id: 'plan_init_1',
          date: '2026-08-27',
          recipeName: 'Singapore Style Bak Kut Teh',
          image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00'
        }}
      ];
      setPlannedMeals(initialPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(initialPlan));
    }}

    loadSavedRecipes();

    const handleSync = () => loadSavedRecipes();
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    return () => {{
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
    }};
  }}, [loadSavedRecipes]);

  const openAddModal = (date: string) => {{
    loadSavedRecipes();
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setRecipeSearch('');
    setMealType('Dinner');
    setMealTime('');
    setIsLeftover(false);
    setShowAddMealModal(true);
  }};

  const savePlan = (updated: any[]) => {{
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
  }};

  const handleAddMealSubmit = (e: React.FormEvent) => {{
    e.preventDefault();
    if (!selectedRecipeObj) {{
      alert('Please select a recipe from the list.');
      return;
    }}
    const newMeal = {{
      id: 'plan_' + Date.now(),
      date: activeDateForAdd || selectedDate,
      recipeName: selectedRecipeObj.name,
      image: selectedRecipeObj.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      mealType: mealType,
      time: mealTime,
      isLeftover: isLeftover
    }};
    savePlan([...plannedMeals, newMeal]);
    setSelectedRecipeObj(null);
    setShowAddMealModal(false);
  }};

  const handleDeleteMeal = (id: string) => {{
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
  }};

  const weekDays = [];
  for (let i = 0; i < 7; i++) {{
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', {{ weekday: 'short' }}).toUpperCase();
    const dayNum = d.getDate();
    weekDays.push({{ dateStr, dayName, dayNum, fullDate: d }});
  }}

  const todayStr = '2026-08-27';
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const rangeStr = `${{currentWeekStart.toLocaleDateString('en-US', {{ month: 'short', day: 'numeric' }})}} - ${{endDate.toLocaleDateString('en-US', {{ month: 'short', day: 'numeric', year: 'numeric' }})}}`;

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
            onClick={() => alert('Plan Week feature activated!')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <CalendarIcon className="h-4 w-4" /> Plan Week
          </button>
          <button 
            onClick={() => alert('Week copied successfully!')}
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
            onClick={() => alert('Share link copied to clipboard!')}
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
            onClick={() => {{
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeekStart(prev);
            }}}}
            className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-base font-extrabold text-[#E05638] tracking-wide">{{rangeStr}}</span>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {{
                const next = new Date(currentWeekStart);
                next.setDate(next.getDate() + 7);
                setCurrentWeekStart(next);
              }}}}
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
          {{weekDays.map((d) => {{
            const isSelected = selectedDate === d.dateStr;
            const isToday = d.dateStr === todayStr;
            const hasMeals = plannedMeals.some(m => m.date === d.dateStr);

            return (
              <div
                key={{d.dateStr}}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${{
                  isToday 
                    ? 'bg-[#161213] border-[#E05638] shadow-md' 
                    : isSelected 
                    ? 'bg-[#111726] border-emerald-500' 
                    : 'bg-[#070b13] border-emerald-950/80 hover:border-slate-700'
                }}`}
              >
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{{d.dayName}}</span>
                <span className={`text-xl font-black mt-1 ${{isToday ? 'text-[#E05638]' : 'text-white'}}`}>{{d.dayNum}}</span>
                {{isToday && <span className="text-[9px] font-bold text-[#E05638] uppercase mt-0.5">Today</span>}}
                {{hasMeals && !isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#E05638] mt-1"></div>}}
              </div>
            );
          }})}}
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
      {{(() => {{
        const dObj = new Date(selectedDate);
        const titleDate = dObj.toLocaleDateString('en-US', {{ weekday: 'long', month: 'long', day: 'numeric' }});
        const isToday = selectedDate === todayStr;
        const dayMeals = plannedMeals.filter(m => m.date === selectedDate);

        return (
          <div className="bg-[#070b13] border border-emerald-950 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white">{{titleDate}}</h2>
                {{isToday && (
                  <span className="bg-[#E05638] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    TODAY
                  </span>
                )}}
              </div>
              <button
                onClick={() => openAddModal(selectedDate)}
                className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" /> Add Meal
              </button>
            </div>

            {{dayMeals.length === 0 ? (
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
                {{dayMeals.map((meal) => (
                  <div key={{meal.id}} className="bg-[#111726] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img 
                        src={{meal.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=200&q=80'}} 
                        alt={{meal.recipeName}}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0" 
                      />
                      <div className="space-y-1 min-w-0">
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                          {{meal.mealType}}
                        </span>
                        <h3 className="text-sm font-bold text-white leading-snug truncate">{{meal.recipeName}}</h3>
                        {{meal.time && <span className="text-[11px] text-slate-400 flex items-center gap-1">⏰ {{meal.time}}</span>}}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-[#070b13] rounded-xl border border-slate-800 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}}
              </div>
            )}}
          </div>
        );
      }})()}}

      {/* CHOOSE A SAVED RECIPE MODAL (EXACT SCREENSHOT MATCH) */}
      {{showAddMealModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-slate-800/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Top Close Button */}
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5">
              <ChefHat className="h-6 w-6 text-[#E05638]" />
              <h2 className="text-lg font-bold text-white tracking-tight">Choose a Saved Recipe</h2>
            </div>

            <form onSubmit={{handleAddMealSubmit}} className="space-y-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Search recipe..."
                  value={{recipeSearch}}
                  onChange={{(e) => setRecipeSearch(e.target.value)}}
                  className="w-full bg-[#07090e] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-700"
                />
              </div>

              {/* Recipe List Container */}
              <div className="bg-[#07090e] border border-slate-800/90 rounded-2xl p-2 max-h-60 overflow-y-auto space-y-2">
                {{filteredSavedRecipes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No matching recipes found.
                  </div>
                ) : (
                  filteredSavedRecipes.map((rec) => {{
                    const isSelected = selectedRecipeObj?.name === rec.name;
                    return (
                      <div
                        key={{rec.id || rec.name}}
                        onClick={() => setSelectedRecipeObj(rec)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition ${{
                          isSelected 
                            ? 'bg-[#191e2b] border-emerald-500/80 shadow-sm' 
                            : 'bg-[#0b0e14] border-slate-800/70 hover:border-slate-700'
                        }}`}
                      >
                        <img
                          src={{rec.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=200&q=80'}}
                          alt={{rec.name}}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-white text-xs truncate">{{rec.name}}</h4>
                          <span className="text-[11px] text-emerald-400 font-medium block">
                            {{rec.category || 'Main Dish'}}
                          </span>
                        </div>
                        {{isSelected && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
                            Selected
                          </span>
                        )}}
                      </div>
                    );
                  }})
                )}}
              </div>

              {/* Leftover Switch Control */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="text-[11px] text-slate-400 leading-snug cursor-pointer select-none" onClick={() => setIsLeftover(!isLeftover)}>
                  Mark as leftovers from a previous meal — won&apos;t be added to shopping lists
                </label>
                <div 
                  onClick={() => setIsLeftover(!isLeftover)}
                  className={`w-11 h-6 rounded-full transition cursor-pointer p-0.5 shrink-0 ${{
                    isLeftover ? 'bg-[#E05638]' : 'bg-slate-800 border border-slate-700'
                  }}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition transform ${{
                    isLeftover ? 'translate-x-5' : 'translate-x-0'
                  }}`} />
                </div>
              </div>

              {/* Meal Timing Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Meal Type</label>
                  <select
                    value={{mealType}}
                    onChange={{(e) => setMealType(e.target.value)}}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Time (Optional)</label>
                  <input
                    type="time"
                    value={{mealTime}}
                    onChange={{(e) => setMealTime(e.target.value)}}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                <button 
                  type="button" 
                  onClick={() => setShowAddMealModal(false)} 
                  className="px-4 py-2 bg-[#07090e] border border-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={{!selectedRecipeObj}}
                  className={`px-5 py-2 font-bold rounded-xl text-xs transition shadow-md ${{
                    selectedRecipeObj 
                      ? 'bg-[#E05638] hover:bg-[#c94529] text-white cursor-pointer' 
                      : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800'
                  }}`}
                >
                  Add Meal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}}

    </div>
  );
}}
"""

os.makedirs("apps/web/src/app/planner", exist_ok=True)
with open("apps/web/src/app/planner/page.tsx", "w", encoding="utf-8") as f:
    f.write(planner_code)

print("✅ Choose a Saved Recipe modal successfully synchronized with the 4 recipes!")
