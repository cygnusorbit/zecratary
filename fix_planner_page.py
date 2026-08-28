import os

planner_code = """'use client';
import { useState, useEffect } from 'react';
import { Calendar, Trash2, ChefHat, Clock, Utensils } from 'lucide-react';

export default function PlannerPage() {
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Meal Planner - FoodiePrep';
    const local = localStorage.getItem('zecratary_meal_plan');
    if (local) {
      setPlannedMeals(JSON.parse(local));
    }
  }, []);

  const handleDeletePlan = (id: string) => {
    if (!confirm('Remove this meal from your plan?')) return;
    const updated = plannedMeals.filter(meal => meal.id !== id);
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
  };

  // Group meals by date
  const sortedMeals = [...plannedMeals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const groupedMeals = sortedMeals.reduce((acc: any, meal: any) => {
    const dateKey = meal.date || 'Unscheduled';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meal);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100 pb-20 px-2 sm:px-4">
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Meal Planner</h1>
        <p className="text-sm font-semibold text-emerald-400">Organize your weekly meals and prep schedule</p>
      </div>

      {plannedMeals.length === 0 ? (
        <div className="bg-[#111726] border border-slate-800 rounded-3xl py-24 text-center space-y-3 shadow-lg">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Your planner is empty</h3>
          <p className="text-sm text-slate-400">Head over to Saved Recipes to start scheduling your meals.</p>
        </div>
      ) : (
        <div className="space-y-8 pt-4">
          {Object.keys(groupedMeals).map((date) => {
            const dateObj = new Date(date);
            const isToday = new Date().toISOString().split('T')[0] === date;
            const displayDate = date === 'Unscheduled' 
              ? 'Unscheduled' 
              : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

            return (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-emerald-950 pb-2">
                  <h2 className="text-xl font-bold text-white">{displayDate}</h2>
                  {isToday && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/30">
                      Today
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedMeals[date].map((meal: any) => (
                    <div 
                      key={meal.id} 
                      className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition shadow-md flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 w-max">
                            <Utensils className="h-3 w-3" /> {meal.mealType || 'Meal'}
                          </span>
                          <h3 className="text-lg font-extrabold text-white leading-tight">{meal.recipeName}</h3>
                          
                          {meal.time && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                              <Clock className="h-3.5 w-3.5" /> {meal.time}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePlan(meal.id)}
                          className="p-2 text-slate-500 hover:text-red-400 transition bg-[#111726] rounded-xl border border-slate-800 shrink-0"
                          title="Remove from planner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {meal.notes && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 bg-slate-900/30 rounded-lg p-3 italic">
                          "{meal.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"""

os.makedirs("apps/web/src/app/planner", exist_ok=True)
with open("apps/web/src/app/planner/page.tsx", "w", encoding="utf-8") as f:
    f.write(planner_code)

print("✅ Planner page successfully created and fully functional!")
