import os
import glob

candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("Error: Could not locate active App Router directory.")
    exit(1)

planner_dir = os.path.join(app_dir, 'planner')
os.makedirs(planner_dir, exist_ok=True)
planner_path = os.path.join(planner_dir, 'page.tsx')

planner_code = """// Generated / Updated by AI Collaborator - Full Fidelity Weekly Meal Planner with Recipe Details Modal
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Plus, Trash2, ShoppingCart, Utensils, 
  CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Sparkles, ChefHat,
  Clock, Flame, Info, X, BookOpen, ExternalLink, Check
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface RecipeItem {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number | string;
  calories?: number | string;
  protein?: string | number;
  carbs?: string | number;
  fat?: string | number;
  ingredients?: string[] | { name: string; amount?: string }[];
  instructions?: string[] | string;
  category?: string;
  image?: string;
}

interface MealSlot {
  recipeId?: string;
  recipeName: string;
  recipeData?: RecipeItem;
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
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>({});
  const [savedRecipes, setSavedRecipes] = useState<RecipeItem[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [activeAddModal, setActiveAddModal] = useState<{ day: string; mealType: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<RecipeItem | null>(null);

  const applyTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    applyTheme();
    window.addEventListener('zecratary_theme_mode_changed', applyTheme);
    window.addEventListener('storage', applyTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applyTheme);
      window.removeEventListener('storage', applyTheme);
    };
  }, [applyTheme]);

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

  const handleAssignRecipe = (recipe: RecipeItem) => {
    if (!activeAddModal) return;
    const { day, mealType } = activeAddModal;

    const formattedIngredients = (recipe.ingredients || []).map((ing: any) => 
      typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ''}`.trim()
    );

    const updated = {
      ...schedule,
      [day]: {
        ...(schedule[day] || {}),
        [mealType]: {
          recipeId: recipe.id,
          recipeName: recipe.title || recipe.name || 'Custom Recipe',
          recipeData: recipe,
          ingredients: formattedIngredients
        }
      }
    };

    saveSchedule(updated);
    setActiveAddModal(null);
    setStatusMsg({ text: `Assigned "${recipe.title || recipe.name}" to ${day} ${mealType}!`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleRemoveMeal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner', e: React.MouseEvent) => {
    e.stopPropagation();
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

      const existingListRaw = localStorage.getItem('zecratary_shopping_list');
      const existingList = existingListRaw ? JSON.parse(existingListRaw) : [];
      
      const newItems = allIngredients.map((item, idx) => ({
        id: 'item_' + Date.now() + '_' + idx,
        name: typeof item === 'string' ? item : JSON.stringify(item),
        completed: false,
        category: 'Weekly Planner Sync'
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
      className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ 
        color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)',
        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)'
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/dashboard" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Interactive Weekly Meal Planner
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Map your favorite saved recipes across breakfast, lunch, and dinner. Click any recipe card to view full preparation details.
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
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
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
                        backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', 
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
                            onClick={(e) => handleRemoveMeal(day, mealType, e)}
                            className="text-slate-400 hover:text-red-400 cursor-pointer"
                            title="Remove meal"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {slot ? (
                        <div 
                          onClick={() => slot.recipeData && setSelectedRecipeDetail(slot.recipeData)}
                          className="space-y-1 p-2 rounded-xl cursor-pointer transition hover:opacity-85 group border"
                          style={{ 
                            backgroundColor: isDayMode ? '#ffffff' : '#070b13',
                            borderColor: isDayMode ? '#e2e8f0' : '#1e293b'
                          }}
                          title="Click to view full recipe details"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs truncate group-hover:underline" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                              {slot.recipeName}
                            </div>
                            <BookOpen className="h-3 w-3 text-[var(--color-primary)] shrink-0" />
                          </div>
                          {slot.ingredients && slot.ingredients.length > 0 && (
                            <div className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                              {slot.ingredients.length} items • Click for details
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveAddModal({ day, mealType })}
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

      {/* FULL RECIPE DETAILS POPUP MODAL */}
      {selectedRecipeDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-[var(--color-primary)] border border-orange-500/20">
                  <ChefHat className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    {selectedRecipeDetail.title || selectedRecipeDetail.name}
                  </h2>
                  <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {selectedRecipeDetail.category || 'Scheduled Recipe Details'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedRecipeDetail(null)} 
                className="p-2 rounded-full border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-6 pr-2 flex-1 text-xs">
              {selectedRecipeDetail.description && (
                <p className="leading-relaxed" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {selectedRecipeDetail.description}
                </p>
              )}

              {/* Meta stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl border flex flex-col gap-1" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Prep Time</span>
                  <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{selectedRecipeDetail.prepTime || '15 mins'}</span>
                </div>
                <div className="p-3 rounded-2xl border flex flex-col gap-1" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Cook Time</span>
                  <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{selectedRecipeDetail.cookTime || '30 mins'}</span>
                </div>
                <div className="p-3 rounded-2xl border flex flex-col gap-1" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Servings</span>
                  <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{selectedRecipeDetail.servings || '4'}</span>
                </div>
                <div className="p-3 rounded-2xl border flex flex-col gap-1" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Calories</span>
                  <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{selectedRecipeDetail.calories || '450 kcal'}</span>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <h3 className="font-black text-sm flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  <Utensils className="h-4 w-4 text-[var(--color-primary)]" /> Ingredients
                </h3>
                <div className="border rounded-2xl p-4 space-y-2" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  {selectedRecipeDetail.ingredients && selectedRecipeDetail.ingredients.length > 0 ? (
                    selectedRecipeDetail.ingredients.map((ing: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                          {typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ''}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="italic text-slate-400">No ingredients specified.</span>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <h3 className="font-black text-sm flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  <BookOpen className="h-4 w-4 text-[var(--color-primary)]" /> Instructions & Preparation
                </h3>
                <div className="border rounded-2xl p-4 space-y-3" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  {Array.isArray(selectedRecipeDetail.instructions) ? (
                    selectedRecipeDetail.instructions.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{step}</span>
                      </div>
                    ))
                  ) : typeof selectedRecipeDetail.instructions === 'string' ? (
                    <p className="leading-relaxed whitespace-pre-line" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                      {selectedRecipeDetail.instructions}
                    </p>
                  ) : (
                    <span className="italic text-slate-400">No step-by-step instructions provided.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <button 
                type="button" 
                onClick={() => setSelectedRecipeDetail(null)} 
                className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECIPE PICKER MODAL */}
      {activeAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col"
            style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <ChefHat className="h-4 w-4 text-[var(--color-primary)]" /> Choose Recipe for {activeAddModal.day} ({activeAddModal.mealType})
              </h3>
              <button type="button" onClick={() => setActiveAddModal(null)} className="text-slate-400 hover:text-white cursor-pointer text-xs">✕</button>
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
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0B101D', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
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
              <button type="button" onClick={() => setActiveAddModal(null)} className="px-4 py-2 border rounded-xl font-bold text-xs cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}>
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

print(f"Successfully installed full-fidelity interactive Weekly Meal Planner with Recipe Details Popup at {planner_path}")
