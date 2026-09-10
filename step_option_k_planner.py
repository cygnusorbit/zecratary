import os
import glob

# 1. Locate active App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate active App Router directory.")
    exit(1)

planner_dir = os.path.join(app_dir, 'planner')
os.makedirs(planner_dir, exist_ok=True)
planner_path = os.path.join(planner_dir, 'page.tsx')

planner_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Plus, Trash2, ShoppingCart, Utensils, 
  CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Sparkles, ChefHat
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface MealSlot {
  recipeId?: string;
  recipeName: string;
  ingredients?: string[];
}

type WeekSchedule = {
  [day: string]: {
    breakfast?: MealSlot;
    lunch?: MealSlot;
    dinner?: MealSlot;
  };
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

export default function WeeklyPlannerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>({});
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal selector state
  const [activeModal, setActiveModal] = useState<{ day: string; mealType: 'breakfast' | 'lunch' | 'dinner' } | null>(null);

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }
    setUser(active);

    // Load saved recipes for picker
    try {
      const rawRecipes = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      if (rawRecipes) {
        setSavedRecipes(JSON.parse(rawRecipes));
      }
    } catch (_) {}

    // Load user weekly schedule
    try {
      const rawSched = localStorage.getItem(`zecratary_planner_${active.id}`);
      if (rawSched) {
        setSchedule(JSON.parse(rawSched));
      }
    } catch (_) {}
  }, [router]);

  const saveSchedule = (updated: WeekSchedule) => {
    setSchedule(updated);
    if (user) {
      localStorage.setItem(`zecratary_planner_${user.id}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('zecratary_planner_updated'));
    }
  };

  const handleAssignRecipe = (recipe: any) => {
    if (!activeModal) return;
    const { day, mealType } = activeModal;

    const updated = {
      ...schedule,
      [day]: {
        ...(schedule[day] || {}),
        [mealType]: {
          recipeId: recipe.id || recipe.slug,
          recipeName: recipe.title || recipe.name || 'Custom Recipe',
          ingredients: recipe.ingredients || []
        }
      }
    };

    saveSchedule(updated);
    setActiveModal(null);
    setStatusMsg({ text: `Assigned "${recipe.title || recipe.name}" to ${day} ${mealType}!`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleRemoveMeal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const daySlots = schedule[day];
    if (!daySlots) return;

    const updatedDay = { ...daySlots };
    delete updatedDay[mealType];

    const updated = {
      ...schedule,
      [day]: updatedDay
    };

    saveSchedule(updated);
    setStatusMsg({ text: `Removed meal from ${day} ${mealType}.`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleGenerateShoppingList = () => {
    try {
      const allIngredients: string[] = [];
      Object.values(schedule).forEach(dayObj => {
        Object.values(dayObj).forEach(slot => {
          if (slot?.ingredients && Array.isArray(slot.ingredients)) {
            allIngredients.push(...slot.ingredients);
          }
        });
      });

      if (allIngredients.length === 0) {
        setStatusMsg({ text: 'No ingredients found in your weekly planner schedule.', type: 'error' });
        return;
      }

      // Merge into shopping list storage
      const existingListRaw = localStorage.getItem('zecratary_shopping_list');
      const existingList = existingListRaw ? JSON.parse(existingListRaw) : [];
      
      const newItems = allIngredients.map((item, idx) => ({
        id: 'item_' + Date.now() + '_' + idx,
        name: typeof item === 'string' ? item : JSON.stringify(item),
        completed: false,
        category: 'Planner Auto-Sync'
      }));

      localStorage.setItem('zecratary_shopping_list', JSON.stringify([...newItems, ...existingList]));
      window.dispatchEvent(new Event('zecratary_shopping_updated'));

      setStatusMsg({ text: 'Successfully compiled all scheduled ingredients into your Shopping List!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      setStatusMsg({ text: 'Failed to sync shopping list.', type: 'error' });
    }
  };

  if (!user) return null;

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/dashboard" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Interactive Weekly Meal Planner
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Map your favorite saved recipes across breakfast, lunch, and dinner, and auto-generate your grocery list.
          </p>
        </div>

        <button
          onClick={handleGenerateShoppingList}
          className="px-4 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <ShoppingCart className="h-4 w-4" /> Compile Shopping List
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
          statusMsg.type === 'success' ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300') : (isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300')
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* WEEKLY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = schedule[day] || {};
          return (
            <div 
              key={day}
              className="border rounded-3xl p-4 space-y-4 shadow-xl flex flex-col justify-between"
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
            >
              <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{day}</h3>
                <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="space-y-3">
                {MEAL_TYPES.map((mealType) => {
                  const slot = daySlots[mealType];
                  return (
                    <div 
                      key={mealType}
                      className="p-3 rounded-2xl border space-y-1.5 transition"
                      style={{ 
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b' 
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                          {mealType}
                        </span>
                        {slot && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveMeal(day, mealType)}
                            className="text-slate-400 hover:text-red-400 cursor-pointer"
                            title="Remove meal"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {slot ? (
                        <div className="space-y-1">
                          <div className="font-bold text-xs truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }} title={slot.recipeName}>
                            {slot.recipeName}
                          </div>
                          {slot.ingredients && slot.ingredients.length > 0 && (
                            <div className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                              {slot.ingredients.length} ingredient items
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveModal({ day, mealType })}
                          className="w-full py-1.5 border border-dashed rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer hover:border-[var(--color-primary)]"
                          style={{ borderColor: isDayMode ? '#cbd5e1' : '#334155', color: isDayMode ? '#64748b' : '#94a3b8' }}
                        >
                          <Plus className="h-3 w-3" /> Add Meal
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* RECIPE PICKER MODAL */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col"
            style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <ChefHat className="h-4 w-4 text-[var(--color-primary)]" /> Choose Recipe for {activeModal.day} ({activeModal.mealType})
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white cursor-pointer text-xs">✕</button>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {savedRecipes.length === 0 ? (
                <div className="text-center py-10 text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  No saved recipes found. Create or generate recipes using the AI Chef or Manual creator first!
                </div>
              ) : (
                savedRecipes.map((recipe, idx) => (
                  <div 
                    key={recipe.id || idx}
                    onClick={() => handleAssignRecipe(recipe)}
                    className="p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)]"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                  >
                    <div>
                      <h4 className="font-black text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{recipe.title || recipe.name}</h4>
                      <p className="text-[11px] truncate max-w-[300px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                        {recipe.description || (recipe.ingredients ? `${recipe.ingredients.length} ingredients` : 'Saved Recipe')}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-white font-extrabold text-[11px] shadow-sm" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-xl font-bold text-xs cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open(planner_path, 'w', encoding='utf-8') as f:
    f.write(planner_code)

print(f"✓ Installed Option K: Interactive Weekly Meal Planner at {planner_path}")
