import os

exact_planner_code = """'use client';
import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, Utensils 
} from 'lucide-react';

export default function PlannerPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-08-24')); // Mon Aug 24
  const [selectedDate, setSelectedDate] = useState('2026-08-27'); // Today Aug 27
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('');
  
  // New meal form state
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');

  useEffect(() => {
    document.title = 'Meal Planner - FoodiePrep';
    const local = localStorage.getItem('zecratary_meal_plan');
    if (local) {
      setPlannedMeals(JSON.parse(local));
    } else {
      const defaultPlan = [
        {
          id: 'p_1',
          date: '2026-08-27',
          recipeName: 'Authentic Pad Thai Recipe',
          mealType: 'Dinner',
          time: '19:00'
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
    }
  }, []);

  const savePlan = (updated: any[]) => {
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: activeDateForAdd || selectedDate,
      recipeName: mealName.trim(),
      mealType: mealType,
      time: mealTime
    };
    savePlan([...plannedMeals, newMeal]);
    setMealName('');
    setShowAddMealModal(false);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
  };

  // Generate 7 days for the weekly strip starting from currentWeekStart
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

  // Format date range string e.g. "Aug 27 - Aug 30, 2026"
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-24 px-4">
      
      {/* TOP HEADER & ACTION BUTTONS */}
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
          <button 
            onClick={() => window.location.href = '/shopping'}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <ShoppingBag className="h-4 w-4 text-[#E05638]" /> Shopping List
          </button>
          <button 
            onClick={() => alert('Share link copied to clipboard!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4 text-[#E05638]" /> Share
          </button>
        </div>
      </div>

      {/* WEEK DATE NAVIGATION STRIP */}
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

        {/* 7 DAY CARDS */}
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

        <div className="text-xs font-bold text-[#E05638] pt-1 cursor-pointer hover:underline">
          ← Show 3 earlier days
        </div>
      </div>

      {/* DAILY AVERAGE MACROS BANNER */}
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

      {/* SELECTED DATE MEAL BLOCK */}
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
                onClick={() => {
                  setActiveDateForAdd(selectedDate);
                  setMealName('');
                  setMealType('Dinner');
                  setMealTime('');
                  setShowAddMealModal(true);
                }}
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
                  onClick={() => {
                    setActiveDateForAdd(selectedDate);
                    setMealName('');
                    setShowAddMealModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add a meal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
                    <div className="space-y-1">
                      <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                        {meal.mealType}
                      </span>
                      <h3 className="text-base font-bold text-white">{meal.recipeName}</h3>
                      {meal.time && <span className="text-xs text-slate-400 flex items-center gap-1">⏰ {meal.time}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-[#070b13] rounded-xl border border-slate-800"
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

      {/* ADD MEAL MODAL */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowAddMealModal(false)} className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full">
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E05638]" /> Add Meal to Planner
            </h2>

            <form onSubmit={handleAddMealSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Recipe / Meal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Authentic Pad Thai Recipe..."
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Time (Optional)</label>
                <input
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowAddMealModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#E05638] text-white font-bold rounded-xl hover:bg-[#c94529] shadow-md">
                  Add Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
"""

os.makedirs("apps/web/src/app/planner", exist_ok=True)
with open("apps/web/src/app/planner/page.tsx", "w", encoding="utf-8") as f:
    f.write(exact_planner_code)

print("✅ Planner page successfully updated to match your exact reference layout!")
