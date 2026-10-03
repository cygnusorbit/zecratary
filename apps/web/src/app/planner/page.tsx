// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Heart, SlidersHorizontal, ChevronDown, 
  ChevronUp, Edit3, Check, Sparkles, CheckCircle2, AlertCircle,
  Flame, Activity
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (str?: string): Date => {
  if (!str || typeof str !== 'string' || !str.includes('-')) {
    return new Date();
  }
  const cleanStr = str.split('T')[0];
  const [year, month, day] = cleanStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
  return new Date(year, month - 1, day);
};

const getMondayOfWeek = (d: Date): Date => {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
};

const getLocaleTag = (locale: string): string => {
  if (locale === 'th') return 'th-TH';
  if (locale === 'fr') return 'fr-FR';
  if (locale === 'es') return 'es-ES';
  return 'en-US';
};

// Robust nutritional extractor supporting numbers, strings ("450 kcal", "32g"), and nested JSONB
const parseNutrientValue = (rawVal: any, fallback: number): number => {
  if (rawVal === undefined || rawVal === null || rawVal === '') return fallback;
  if (typeof rawVal === 'number' && !isNaN(rawVal)) return rawVal;
  const match = String(rawVal).match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const parsed = parseFloat(match[1]);
    return !isNaN(parsed) ? parsed : fallback;
  }
  return fallback;
};

export default function PlannerPage() {
  const { t, locale, version } = useTranslation();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [canViewMacros, setCanViewMacros] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState<string>(() => formatDateKey(new Date()));
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [mealServings, setMealServings] = useState<number>(2);
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  const [activeCopyDropdownDate, setActiveCopyDropdownDate] = useState<string | null>(null);
  const [copyCustomDate, setCopyCustomDate] = useState('');

  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editRecipeObj, setEditRecipeObj] = useState<any | null>(null);
  const [editDate, setEditDate] = useState<string>(() => formatDateKey(new Date()));
  const [editMealType, setEditMealType] = useState('Dinner');
  const [editMealTime, setEditMealTime] = useState('');
  const [editServings, setEditServings] = useState<number>(2);
  const [editIsLeftover, setEditIsLeftover] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'add' | 'edit'>('add');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('All Books');
  const [activeRecipeTagFilter, setActiveRecipeTagFilter] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [selectedMealIdsForShopping, setSelectedMealIdsForShopping] = useState<string[]>([]);
  const [expandedDayCards, setExpandedDayCards] = useState<{ [key: string]: boolean }>({});

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyGlobalTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      setIsDayMode(mode === 'light' || mode === 'day');
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    applyGlobalTheme();
    window.addEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_updated', applyGlobalTheme);
    window.addEventListener('storage', applyGlobalTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_updated', applyGlobalTheme);
      window.removeEventListener('storage', applyGlobalTheme);
    };
  }, [applyGlobalTheme]);

  // Comprehensive Recipe Hydration with Nutrition Parsing
  const loadSavedData = useCallback(async (user: User | null) => {
    if (typeof window === 'undefined') return;
    try {
      let combinedRecipes: any[] = [];
      const localKeys = ['zecratary_saved_recipes', 'saved_recipes', 'zecratary_recipes', 'zecratary_imported_recipes'];
      for (const k of localKeys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) combinedRecipes.push(...parsed);
          }
        } catch (_) {}
      }

      const endpoints = ['/api/recipes/saved', '/api/saved-recipes', '/api/recipes'];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const recList = Array.isArray(data) ? data : (data?.recipes || data?.saved_recipes || []);
            if (Array.isArray(recList) && recList.length > 0) {
              combinedRecipes.push(...recList);
            }
          }
        } catch (_) {}
      }

      const uniqueRecipes: any[] = [];
      const seen = new Set<string>();

      combinedRecipes.forEach((rec: any) => {
        if (!rec) return;
        const normId = String(rec.id || rec.recipeId || rec.recipe_id || rec.title || rec.name || Math.random());
        const normTitle = rec.title || rec.name || rec.recipeName || rec.recipe_name || 'Untitled Recipe';
        const normKey = `${normId}_${normTitle}`.toLowerCase();
        
        const rUserId = rec.userId || rec.user_id;
        const rEmail = rec.createdBy || rec.created_by;
        const isOwner = !user || !rUserId || rUserId === user.id || rUserId === 'usr_admin_1' || rEmail === user.email || !rEmail;

        if (isOwner && !seen.has(normKey)) {
          seen.add(normKey);

          // Deep nutritional extraction
          const nInfo = rec.nutritional_info || rec.nutritionalInfo || rec.nutrition || {};
          const calories = parseNutrientValue(rec.calories ?? nInfo.calories ?? nInfo.calorieCount, 520);
          const protein = parseNutrientValue(rec.protein ?? nInfo.protein ?? nInfo.proteinContent, 32);
          const carbs = parseNutrientValue(rec.carbs ?? nInfo.carbs ?? nInfo.carbohydrateContent, 45);
          const fat = parseNutrientValue(rec.fat ?? nInfo.fat ?? nInfo.fatContent, 18);
          const baseServings = parseNutrientValue(rec.servings ?? rec.yield, 2);

          uniqueRecipes.push({
            id: normId,
            name: normTitle,
            title: normTitle,
            category: rec.category || rec.recipeType || rec.recipe_type || rec.tags?.[0] || 'Main Dish',
            isFavorite: Boolean(rec.isFavorite || rec.is_favorite),
            bookId: rec.bookId || rec.book_id || null,
            ingredients: rec.ingredients || [],
            servings: baseServings,
            calories,
            protein,
            carbs,
            fat,
            image: rec.imageUrl || rec.image || rec.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
            imageUrl: rec.imageUrl || rec.image || rec.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
          });
        }
      });

      setSavedRecipes(uniqueRecipes);

      const rawBooks = localStorage.getItem('zecratary_recipe_books');
      if (rawBooks) {
        try {
          const parsedBooks = JSON.parse(rawBooks);
          if (Array.isArray(parsedBooks)) {
            setBooks(user ? parsedBooks.filter((b: any) => !b.userId || b.userId === user.id || b.createdBy === user.email) : parsedBooks);
          }
        } catch (_) {}
      } else {
        setBooks([
          { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', userId: user?.id, createdBy: user?.email },
          { id: 'book_2', title: 'Authentic Asian Cuisine', userId: user?.id, createdBy: user?.email },
          { id: 'book_3', title: 'Baking & Desserts', userId: user?.id, createdBy: user?.email }
        ]);
      }
    } catch (e) {
      console.error('Failed to load saved recipes in planner', e);
    }
  }, []);

  // Hydrate Planned Meals & Subscription Permissions
  const loadMealPlan = useCallback(async (user: User | null) => {
    if (typeof window === 'undefined') return;
    try {
      let localMeals: any[] = [];
      const planKeys = ['zecratary_meal_plan', 'zecratary_meal_plans'];
      for (const pk of planKeys) {
        try {
          const raw = localStorage.getItem(pk);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localMeals.push(...parsed);
          }
        } catch (_) {}
      }

      const userFilteredLocal = localMeals.map((m: any) => ({
        ...m,
        date: String(m.date || '').split('T')[0]
      })).filter((m: any) => {
        const uId = m.userId || m.user_id;
        const uEmail = m.createdBy || m.created_by;
        return !user || !uId || uId === user.id || uId === 'usr_admin_1' || uEmail === user.email;
      });

      let serverMeals: any[] = [];
      try {
        const queryParams = user?.id ? `?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}` : '';
        const res = await fetch(`/api/planner${queryParams}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.meals)) {
            serverMeals = data.meals.map((m: any) => ({
              ...m,
              date: String(m.date || '').split('T')[0]
            }));
          }
        }
      } catch (_) {}

      const mealMap = new Map();
      serverMeals.forEach((m: any) => { if (m.id) mealMap.set(m.id, m); });
      userFilteredLocal.forEach((m: any) => { if (m.id && !mealMap.has(m.id)) mealMap.set(m.id, m); });

      const mergedPlans = Array.from(mealMap.values());
      setPlannedMeals(mergedPlans);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(mergedPlans));
      localStorage.setItem('zecratary_meal_plans', JSON.stringify(mergedPlans));

      // Synchronize macro viewing capability from subscription
      try {
        const planRes = await fetch('/api/admin/plans', { cache: 'no-store' });
        if (planRes.ok) {
          const pData = await planRes.json();
          const plans = pData.plans || pData;
          if (Array.isArray(plans)) {
            const userPlanSlug = (user?.subscriptionPlan || 'taster').toLowerCase();
            const matchedPlan = plans.find((p: any) => p.slug?.toLowerCase() === userPlanSlug);
            if (matchedPlan) {
              setCanViewMacros(Boolean(matchedPlan.can_view_macros || matchedPlan.canViewMacros));
              return;
            }
          }
        }
        const userPlan = (user?.subscriptionPlan || 'taster').toLowerCase();
        setCanViewMacros(userPlan !== 'taster' && userPlan !== 'free');
      } catch (_) {
        const userPlan = (user?.subscriptionPlan || 'taster').toLowerCase();
        setCanViewMacros(userPlan !== 'taster' && userPlan !== 'free');
      }
    } catch (e) {
      console.error('Failed to load meal plan', e);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('plannerTitle', 'Planner')} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);

    loadSavedData(user);
    loadMealPlan(user);

    const handleSync = (e: any) => {
      if (e?.detail?.source === 'local_planner_mutation') return;
      const active = getCurrentUser();
      setCurrentUser(active);
      loadSavedData(active);
      loadMealPlan(active);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync as EventListener);
    window.addEventListener('zecratary_meal_plan_updated', handleSync as EventListener);
    window.addEventListener('zecratary_meal_plans_updated', handleSync as EventListener);
    window.addEventListener('zecratary_auth_changed', handleSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync as EventListener);
      window.removeEventListener('zecratary_meal_plan_updated', handleSync as EventListener);
      window.removeEventListener('zecratary_meal_plans_updated', handleSync as EventListener);
      window.removeEventListener('zecratary_auth_changed', handleSync as EventListener);
    };
  }, [loadSavedData, loadMealPlan, t, locale, version]);

  const savePlan = async (updatedUserMeals: any[]) => {
    try {
      const localPlan = localStorage.getItem('zecratary_meal_plan');
      const allMeals: any[] = localPlan ? JSON.parse(localPlan) : [];

      const otherUserMeals = currentUser 
        ? allMeals.filter((m: any) => m.userId && m.userId !== currentUser.id && m.createdBy !== currentUser.email)
        : [];

      const merged = [...updatedUserMeals, ...otherUserMeals];
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(merged));
      localStorage.setItem('zecratary_meal_plans', JSON.stringify(merged));
      setPlannedMeals(updatedUserMeals);

      if (currentUser?.id) {
        await fetch('/api/planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, createdBy: currentUser.email, meals: updatedUserMeals })
        }).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('zecratary_planner_updated', { detail: { source: 'local_planner_mutation' } }));
      window.dispatchEvent(new Event('zecratary_meal_plan_updated'));
      window.dispatchEvent(new Event('zecratary_meal_plans_updated'));
    } catch (e) {
      console.error('Failed to save meal plan', e);
    }
  };

  const todayDateObj = new Date();
  const todayStr = formatDateKey(todayDateObj);

  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = formatDateKey(tomorrowDateObj);

  const translateDayOfWeek = (d: Date) => {
    const day = d.getDay();
    const days = [
      t('sunday', 'Sunday'),
      t('monday', 'Monday'),
      t('tuesday', 'Tuesday'),
      t('wednesday', 'Wednesday'),
      t('thursday', 'Thursday'),
      t('friday', 'Friday'),
      t('saturday', 'Saturday')
    ];
    return days[day];
  };

  const translateShortDayOfWeek = (d: Date) => {
    const day = d.getDay();
    const shortDays = [
      t('sunShort', 'Sun'),
      t('monShort', 'Mon'),
      t('tueShort', 'Tue'),
      t('wedShort', 'Wed'),
      t('thuShort', 'Thu'),
      t('friShort', 'Fri'),
      t('satShort', 'Sat')
    ];
    return shortDays[day] || d.toLocaleDateString(getLocaleTag(locale), { weekday: 'short' });
  };

  const translateMealType = (mt: string) => {
    const m = (mt || '').toLowerCase();
    if (m === 'breakfast') return t('breakfast', 'Breakfast');
    if (m === 'lunch') return t('lunch', 'Lunch');
    if (m === 'dinner') return t('dinner', 'Dinner');
    if (m === 'snack') return t('snack', 'Snack');
    return mt;
  };

  const weekDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
      const dateStr = formatDateKey(d);
      const dayName = translateShortDayOfWeek(d);
      const dayNum = d.getDate();
      arr.push({ dateStr, dayName, dayNum, fullDate: d });
    }
    return arr;
  }, [currentWeekStart, locale, t]);

  const endDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString(getLocaleTag(locale), { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(getLocaleTag(locale), { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const displayDays = [0, 1, 2].map((offset) => {
    const base = parseDateKey(selectedDate);
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    const dateStr = formatDateKey(d);
    const isToday = dateStr === todayStr;
    const isTomorrow = dateStr === tomorrowStr;
    const titleDate = `${translateDayOfWeek(d)}, ${d.toLocaleDateString(getLocaleTag(locale), { month: 'long', day: 'numeric' })}`;
    const dayMeals = plannedMeals.filter(m => (m.date || '').split('T')[0] === dateStr);
    return { dateStr, titleDate, isToday, isTomorrow, dayMeals };
  });

  // ===========================================================================
  // REAL-TIME DAILY AVERAGE NUTRITIONAL ENGINE
  // ===========================================================================
  const dailyNutrition = useMemo(() => {
    const currentWeekDates = new Set(weekDays.map(w => w.dateStr));
    const activeMeals = plannedMeals.filter(m => currentWeekDates.has((m.date || '').split('T')[0]));
    
    if (activeMeals.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, activeDays: 0, totalMeals: 0 };
    }

    const uniqueDays = new Set(activeMeals.map(m => (m.date || '').split('T')[0]));
    const uniqueDaysCount = Math.max(1, uniqueDays.size);
    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;

    activeMeals.forEach(m => {
      const rec = savedRecipes.find(r => r.id === m.recipeId || r.name === m.recipeName || r.title === m.recipeName);
      const scheduledServings = Number(m.servings || 2);
      const baseServings = Math.max(1, Number(rec?.servings || 2));
      const scaleRatio = scheduledServings / baseServings;

      const cal = Number(rec?.calories ?? 520) * scaleRatio;
      const p = Number(rec?.protein ?? 32) * scaleRatio;
      const c = Number(rec?.carbs ?? 45) * scaleRatio;
      const f = Number(rec?.fat ?? 18) * scaleRatio;

      totalCal += cal;
      totalP += p;
      totalC += c;
      totalF += f;
    });

    return {
      calories: Math.round(totalCal / uniqueDaysCount),
      protein: Math.round(totalP / uniqueDaysCount),
      carbs: Math.round(totalC / uniqueDaysCount),
      fat: Math.round(totalF / uniqueDaysCount),
      activeDays: uniqueDaysCount,
      totalMeals: activeMeals.length
    };
  }, [plannedMeals, savedRecipes, weekDays]);

  const handlePlanWeek = () => {
    if (savedRecipes.length === 0) {
      alert(t('noSavedRecipesToPlanAlert', 'No saved recipes found. Please add or import some recipes first to use the auto-planner!'));
      return;
    }

    const newAdditions: any[] = [];
    const mealTypesList = ['Breakfast', 'Lunch', 'Dinner'];
    let recipeIdx = 0;

    weekDays.forEach((day) => {
      const existingTypes = new Set(plannedMeals.filter(m => (m.date || '').split('T')[0] === day.dateStr).map(m => m.mealType));
      mealTypesList.forEach((type) => {
        if (!existingTypes.has(type)) {
          const pickedRec = savedRecipes[recipeIdx % savedRecipes.length];
          recipeIdx++;
          newAdditions.push({
            id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            userId: currentUser?.id,
            createdBy: currentUser?.email,
            date: day.dateStr,
            recipeId: pickedRec.id,
            recipeName: pickedRec.name || pickedRec.title,
            image: pickedRec.image || pickedRec.imageUrl,
            mealType: type,
            time: type === 'Breakfast' ? '08:30' : type === 'Lunch' ? '12:30' : '19:00',
            servings: 2,
            isLeftover: false,
            notes: 'Auto-planned from recipe library'
          });
        }
      });
    });

    if (newAdditions.length === 0) {
      showToast(t('allSlotsFilledNotice', 'All meals for this week are already planned!'), 'info');
      return;
    }

    const updated = [...plannedMeals, ...newAdditions];
    savePlan(updated);
    showToast(t('weekPlanGeneratedToast', `Generated ${newAdditions.length} meals across your weekly calendar!`).replace('{count}', String(newAdditions.length)), 'success');
  };

  const handleCopyWeek = () => {
    const activeWeekDateSet = new Set(weekDays.map(w => w.dateStr));
    const currentWeekMeals = plannedMeals.filter(m => activeWeekDateSet.has((m.date || '').split('T')[0]));

    if (currentWeekMeals.length === 0) {
      alert(t('noMealsInWeekToCopyAlert', 'There are no planned meals in the current week to copy.'));
      return;
    }

    const copiedMeals = currentWeekMeals.map((m) => {
      const d = parseDateKey(m.date);
      d.setDate(d.getDate() + 7);
      return {
        ...m,
        id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        date: formatDateKey(d),
        userId: currentUser?.id,
        createdBy: currentUser?.email
      };
    });

    const updated = [...plannedMeals, ...copiedMeals];
    savePlan(updated);
    showToast(t('weekCopiedSuccessToast', `Copied ${currentWeekMeals.length} meals to next week!`).replace('{count}', String(currentWeekMeals.length)), 'success');
  };

  const handleShareWeek = () => {
    const activeWeekDateSet = new Set(weekDays.map(w => w.dateStr));
    const currentWeekMeals = plannedMeals.filter(m => activeWeekDateSet.has((m.date || '').split('T')[0])).sort((a, b) => a.date.localeCompare(b.date));

    if (currentWeekMeals.length === 0) {
      alert(t('noMealsToShareAlert', 'No meals planned for this week to share.'));
      return;
    }

    let summaryText = `📅 FoodiePrep Meal Plan (${rangeStr}):\n\n`;
    currentWeekMeals.forEach(m => {
      const d = parseDateKey(m.date);
      const dayLabel = d.toLocaleDateString(getLocaleTag(locale), { weekday: 'short', month: 'short', day: 'numeric' });
      summaryText += `• ${dayLabel} [${translateMealType(m.mealType)}]: ${m.recipeName}${m.time ? ` at ${m.time}` : ''}\n`;
    });

    navigator.clipboard.writeText(summaryText);
    showToast(t('mealPlanCopiedToast', 'Meal plan summary copied to clipboard!'), 'success');
  };

  const handleClearCurrentPageMeals = () => {
    const pageDateSet = new Set(displayDays.map(d => d.dateStr));
    const mealsOnCurrentPage = plannedMeals.filter(m => pageDateSet.has((m.date || '').split('T')[0]));

    if (mealsOnCurrentPage.length === 0) {
      alert(t('noMealsOnPageToClearAlert', 'No planned meals on the current view to clear.'));
      return;
    }

    if (window.confirm(t('confirmClearMealsOnPage', `Are you sure you want to clear ${mealsOnCurrentPage.length} meal(s) from this view?`).replace('{count}', String(mealsOnCurrentPage.length)))) {
      const updated = plannedMeals.filter(m => !pageDateSet.has((m.date || '').split('T')[0]));
      savePlan(updated);
      showToast(t('clearedMealsToast', `Cleared ${mealsOnCurrentPage.length} meal(s)`).replace('{count}', String(mealsOnCurrentPage.length)), 'info');
    }
  };

  const openAddModal = (date: string) => {
    loadSavedData(currentUser);
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
    setMealServings(2);
    setIsLeftover(false);
    setNotes('');
    setRecipeSearch('');
    setSelectedBookFilter('All Books');
    setActiveRecipeTagFilter('All');
    setShowFilterOptions(false);
    setShowRecipePickerModal(false);
    setActiveCopyDropdownDate(null);
    setShowAddMealModal(true);
  };

  const openEditModal = (meal: any) => {
    loadSavedData(currentUser);
    setEditingMealId(meal.id);
    setEditDate(meal.date || selectedDate);
    setEditMealType(meal.mealType || 'Dinner');
    setEditMealTime(meal.time || '');
    setEditServings(Number(meal.servings || 2));
    setEditIsLeftover(Boolean(meal.isLeftover));
    setEditNotes(meal.notes || '');

    const found = savedRecipes.find(r => (r.name === meal.recipeName || r.title === meal.recipeName || r.id === meal.recipeId));
    setEditRecipeObj(found || {
      id: meal.recipeId || 'custom',
      name: meal.recipeName,
      title: meal.recipeName,
      image: meal.image,
      imageUrl: meal.image
    });

    setRecipeSearch('');
    setSelectedBookFilter('All Books');
    setActiveRecipeTagFilter('All');
    setShowFilterOptions(false);
    setActiveCopyDropdownDate(null);
    setShowEditMealModal(true);
  };

  const handleCopyDayTo = (sourceDateStr: string, targetDateStr: string) => {
    const sourceDayMeals = plannedMeals.filter(m => (m.date || '').split('T')[0] === sourceDateStr);
    if (sourceDayMeals.length === 0) {
      alert(t('noMealsToCopyAlert', 'There are no planned meals on this day to copy.'));
      setActiveCopyDropdownDate(null);
      return;
    }

    const copiedMeals = sourceDayMeals.map((m) => ({
      ...m,
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: targetDateStr,
      userId: currentUser?.id,
      createdBy: currentUser?.email
    }));

    const updated = [...plannedMeals, ...copiedMeals];
    savePlan(updated);
    setActiveCopyDropdownDate(null);

    const targetFormatted = parseDateKey(targetDateStr).toLocaleDateString(getLocaleTag(locale), {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    showToast(t('copiedMealsSuccessAlert', `Successfully copied ${sourceDayMeals.length} meal(s) to ${targetFormatted}!`).replace('{count}', String(sourceDayMeals.length)).replace('{target}', targetFormatted), 'success');
  };

  const handleCopyTomorrow = (sourceDateStr: string) => {
    const d = parseDateKey(sourceDateStr);
    d.setDate(d.getDate() + 1);
    handleCopyDayTo(sourceDateStr, formatDateKey(d));
  };

  const handleCopyNextWeek = (sourceDateStr: string) => {
    const d = parseDateKey(sourceDateStr);
    d.setDate(d.getDate() + 7);
    handleCopyDayTo(sourceDateStr, formatDateKey(d));
  };

  const handleAddMealSubmit = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!selectedRecipeObj) {
      alert(t('pleaseSelectRecipeAlert', 'Please choose a recipe before scheduling.'));
      return;
    }
    const newMeal = {
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser?.id,
      createdBy: currentUser?.email,
      date: activeDateForAdd,
      recipeId: selectedRecipeObj.id,
      recipeName: selectedRecipeObj.name || selectedRecipeObj.title,
      image: selectedRecipeObj.image || selectedRecipeObj.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      mealType: mealType,
      time: mealTime,
      servings: Number(mealServings) || 2,
      isLeftover: isLeftover,
      notes: notes
    };
    savePlan([...plannedMeals, newMeal]);
    setShowAddMealModal(false);
    showToast(t('mealAddedToast', 'Meal scheduled successfully!'), 'success');
  };

  const handleEditMealSubmit = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!editingMealId || !editRecipeObj) return;

    const updated = plannedMeals.map((m) => {
      if (m.id === editingMealId) {
        return {
          ...m,
          date: editDate,
          recipeId: editRecipeObj.id || m.recipeId,
          recipeName: editRecipeObj.name || editRecipeObj.title || m.recipeName,
          image: editRecipeObj.image || editRecipeObj.imageUrl || m.image,
          mealType: editMealType,
          time: editMealTime,
          servings: Number(editServings) || 2,
          isLeftover: editIsLeftover,
          notes: editNotes,
          userId: currentUser?.id,
          createdBy: currentUser?.email
        };
      }
      return m;
    });

    savePlan(updated);
    setShowEditMealModal(false);
    setEditingMealId(null);
    showToast(t('mealUpdatedToast', 'Meal updated successfully!'), 'success');
  };

  const handleDeleteMeal = async (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
    if (showEditMealModal && editingMealId === id) {
      setShowEditMealModal(false);
    }

    if (currentUser?.id) {
      fetch(`/api/planner?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
    showToast(t('mealDeletedToast', 'Meal deleted from plan.'), 'info');
  };

  const openShoppingListSelectModal = () => {
    loadSavedData(currentUser);
    const allMealIds = plannedMeals.filter(m => !m.isLeftover).map(m => m.id);
    setSelectedMealIdsForShopping(allMealIds);
    setShowShoppingListModal(true);
  };

  const toggleDaySelectionForShopping = (dateStr: string, dayMeals: any[]) => {
    const dayMealIds = dayMeals.map(m => m.id);
    const allSelected = dayMealIds.every(id => selectedMealIdsForShopping.includes(id));

    if (allSelected) {
      setSelectedMealIdsForShopping(selectedMealIdsForShopping.filter(id => !dayMealIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedMealIdsForShopping, ...dayMealIds]));
      setSelectedMealIdsForShopping(merged);
    }
  };

  const toggleSingleMealForShopping = (mealId: string) => {
    if (selectedMealIdsForShopping.includes(mealId)) {
      setSelectedMealIdsForShopping(selectedMealIdsForShopping.filter(id => id !== mealId));
    } else {
      setSelectedMealIdsForShopping([...selectedMealIdsForShopping, mealId]);
    }
  };

  const handleGenerateShoppingList = async () => {
    const selectedMeals = plannedMeals.filter(m => selectedMealIdsForShopping.includes(m.id));
    if (selectedMeals.length === 0) {
      alert(t('selectAtLeastOneRecipeAlert', 'Please select at least one meal to generate a shopping list.'));
      return;
    }

    const localList = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    let currentItems: any[] = [];
    try {
      if (localList) currentItems = JSON.parse(localList);
    } catch (_) {}

    const newIngredients: any[] = [];

    selectedMeals.forEach((meal) => {
      const fullRecipe = savedRecipes.find(r => (r.name === meal.recipeName || r.title === meal.recipeName || r.id === meal.recipeId));
      if (fullRecipe && Array.isArray(fullRecipe.ingredients) && fullRecipe.ingredients.length > 0) {
        fullRecipe.ingredients.forEach((ing: any, idx: number) => {
          newIngredients.push({
            id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + idx,
            userId: currentUser?.id,
            createdBy: currentUser?.email,
            creatorName: currentUser?.name,
            name: typeof ing === 'string' ? ing : (ing.item || ing.name || 'Ingredient'),
            amount: ing.amount || ing.quantity || '1',
            unit: ing.unit || 'unit',
            category: ing.category || 'Pantry Staples',
            checked: false,
            staple: false,
            createdAt: new Date().toISOString()
          });
        });
      } else {
        newIngredients.push({
          id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          userId: currentUser?.id,
          createdBy: currentUser?.email,
          creatorName: currentUser?.name,
          name: meal.recipeName + ' ingredients',
          amount: '1',
          unit: 'pack',
          category: 'Pantry Staples',
          checked: false,
          staple: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    const merged = [...newIngredients, ...currentItems];
    localStorage.setItem('zecratary_shopping', JSON.stringify(merged));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(merged));

    try {
      fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id, items: merged })
      }).catch(() => {});
    } catch (_) {}

    window.dispatchEvent(new Event('zecratary_shopping_updated'));
    setShowShoppingListModal(false);
    router.push('/shopping');
  };

  const activeDateObj = parseDateKey(activeDateForAdd);
  const activeDateFormattedHeader = `${translateDayOfWeek(activeDateObj)}, ${activeDateObj.toLocaleDateString(getLocaleTag(locale), { month: 'long', day: 'numeric' })}`;
  const activeDateFieldText = `${translateDayOfWeek(activeDateObj)}, ${activeDateObj.toLocaleDateString(getLocaleTag(locale), { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const datesWithMeals = Array.from(new Set(plannedMeals.map(m => (m.date || '').split('T')[0]))).sort();
  const userFilteredBooks = books.filter(b => !currentUser || !b.userId || b.userId === currentUser.id || b.createdBy === currentUser.email);

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
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[100] animate-in fade-in slide-in-from-top-4">
          <div 
            className="px-4 py-3 rounded-2xl border flex items-center gap-2.5 shadow-2xl text-xs font-bold"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: toastMessage.type === 'error' ? 'var(--color-primary)' : 'var(--color-emerald)',
              color: 'var(--color-text)'
            }}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 suppressHydrationWarning className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('plannerTitle', 'Planner')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {currentUser ? `${t('planningForPrefix', 'Planning for')} ${currentUser.name || currentUser.email}` : t('plannerSubtitle', 'Organize and schedule your meals for the week')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            type="button"
            onClick={handlePlanWeek}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
            title={t('planWeekTooltip', 'Auto-fill empty slots for the week using saved recipes')}
          >
            <Sparkles className="h-4 w-4" /> {t('planWeekBtn', 'Plan Week')}
          </button>
          <button 
            type="button"
            onClick={handleCopyWeek}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title={t('copyWeekTooltip', 'Copy all meals from this week to next week')}
          >
            <Copy className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('copyWeekBtn', 'Copy Week')}
          </button>
          <button
            type="button"
            onClick={openShoppingListSelectModal}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <ShoppingBag className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('shoppingListBtn', 'Shopping List')}
          </button>
          <button 
            type="button"
            onClick={handleShareWeek}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title={t('shareTooltip', 'Copy structured weekly meal schedule to clipboard')}
          >
            <Share2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('shareBtn', 'Share')}
          </button>
          <button 
            type="button"
            onClick={handleClearCurrentPageMeals}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:border-red-500/60"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-primary)'
            }}
            title={t('clearAllMealTooltip', 'Clear planned meals for displayed days')}
          >
            <Trash2 className="h-4 w-4 text-red-500" /> {t('clearAllMealBtn', 'Clear View')}
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button 
            type="button"
            onClick={() => {
              const prev = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="p-2 border rounded-xl transition cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-primary)'
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span 
            className="text-base font-extrabold tracking-wide"
            style={{ color: 'var(--color-primary)' }}
          >
            {rangeStr}
          </span>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                const next = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 7);
                setCurrentWeekStart(next);
              }}
              className="p-2 border rounded-xl transition cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentWeekStart(getMondayOfWeek(now));
                setSelectedDate(formatDateKey(now));
              }}
              className="px-3.5 py-2 border font-bold text-xs rounded-xl transition cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
            >
              {t('todayBtn', 'Today')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const isToday = d.dateStr === todayStr;
            const hasMeals = plannedMeals.some(m => (m.date || '').split('T')[0] === d.dateStr);

            return (
              <div
                key={d.dateStr}
                onClick={() => {
                  setSelectedDate(d.dateStr);
                  setActiveCopyDropdownDate(null);
                }}
                className="p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-center shadow-xs"
                style={isToday ? {
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-primary)'
                } : isSelected ? {
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-emerald)',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                } : {
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  {d.dayName}
                </span>
                <span 
                  className="text-xl font-black mt-1"
                  style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text)' }}
                >
                  {d.dayNum}
                </span>
                {isToday && (
                  <span 
                    className="text-[9px] font-bold uppercase mt-0.5"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('todayBtn', 'Today')}
                  </span>
                )}
                {hasMeals && !isToday && (
                  <div 
                    className="w-1.5 h-1.5 rounded-full mt-1"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC DAILY AVERAGE NUTRITION BANNER */}
      <div 
        className="border rounded-2xl p-5 relative overflow-hidden shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-inner-dark)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-extrabold" style={{ color: 'var(--color-text)' }}>
            <span className="text-lg">🔥</span> 
            <span>{t('dailyAverage', 'Daily Average')}</span>
            {dailyNutrition.totalMeals > 0 && (
              <span className="text-[11px] font-semibold opacity-75 ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                ({dailyNutrition.totalMeals} meals across {dailyNutrition.activeDays} {dailyNutrition.activeDays === 1 ? 'day' : 'days'})
              </span>
            )}
          </div>

          {canViewMacros ? (
            <div 
              className="flex items-center gap-1.5 border text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs self-start sm:self-auto"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-emerald)',
                color: 'var(--color-emerald)'
              }}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{t('macrosUnlocked', 'Macros Active')}</span>
            </div>
          ) : (
            <Link
              href="/subscriptions"
              className="flex items-center gap-1.5 border font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs hover:border-[var(--color-primary)] self-start sm:self-auto"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)'
              }}
              title={t('upgradeToViewMacros', 'Upgrade plan to unlock nutritional macro analysis')}
            >
              <Lock className="h-3.5 w-3.5" /> {t('upgrade', 'Upgrade')}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>{t('calories', 'Calories')}</span>
            <span className={`text-xl font-black ${!canViewMacros ? 'blur-[4px] select-none' : ''}`} style={{ color: 'var(--color-text)' }}>
              {dailyNutrition.calories > 0 ? `${dailyNutrition.calories} kcal` : '—'}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>{t('protein', 'Protein')}</span>
            <span className={`text-xl font-black ${!canViewMacros ? 'blur-[4px] select-none' : ''}`} style={{ color: 'var(--color-text)' }}>
              {dailyNutrition.protein > 0 ? `${dailyNutrition.protein}g` : '—'}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>{t('carbs', 'Carbs')}</span>
            <span className={`text-xl font-black ${!canViewMacros ? 'blur-[4px] select-none' : ''}`} style={{ color: 'var(--color-text)' }}>
              {dailyNutrition.carbs > 0 ? `${dailyNutrition.carbs}g` : '—'}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>{t('fat', 'Fat')}</span>
            <span className={`text-xl font-black ${!canViewMacros ? 'blur-[4px] select-none' : ''}`} style={{ color: 'var(--color-text)' }}>
              {dailyNutrition.fat > 0 ? `${dailyNutrition.fat}g` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3-DAY FEED: SELECTED DAY + ADDITIONAL 2 DAYS */}
      <div className="space-y-6">
        {displayDays.map((day) => {
          const isCopyOpen = activeCopyDropdownDate === day.dateStr;
          const hasMealsInDay = day.dayMeals.length > 0;

          return (
            <div
              key={day.dateStr}
              className="border rounded-3xl p-6 space-y-6 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              {/* Day Header Row */}
              <div 
                className="flex items-center justify-between border-b pb-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-extrabold" style={{ color: 'var(--color-text)' }}>{day.titleDate}</h2>
                  
                  {day.isToday && (
                    <span 
                      className="text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {t('todayBadge', 'Today')}
                    </span>
                  )}
                  {day.isTomorrow && !day.isToday && (
                    <span 
                      className="border text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      {t('tomorrowBadge', 'Tomorrow')}
                    </span>
                  )}
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-2 relative">
                  {hasMealsInDay && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveCopyDropdownDate(isCopyOpen ? null : day.dateStr)}
                        className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:border-[var(--color-primary)]"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        <Copy className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} /> {t('copyDayBtn', 'Copy Day')}
                      </button>

                      {isCopyOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveCopyDropdownDate(null)} 
                          />
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-2 w-60 border rounded-2xl shadow-2xl p-3.5 z-50 space-y-3 text-xs animate-in fade-in transition-colors duration-200"
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          >
                            <h4 className="font-bold text-xs px-1" style={{ color: 'var(--color-text)' }}>{t('copyDayToTitle', 'Copy Day Meals To')}</h4>
                            
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyTomorrow(day.dateStr)}
                                className="w-full text-left font-bold px-3 py-2 rounded-xl border transition cursor-pointer hover:border-[var(--color-primary)]"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)'
                                }}
                              >
                                {t('copyTomorrowOption', 'Tomorrow')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyNextWeek(day.dateStr)}
                                className="w-full text-left font-bold px-3 py-2 rounded-xl border transition cursor-pointer hover:border-[var(--color-primary)]"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)'
                                }}
                              >
                                {t('copyNextWeekOption', 'Next Week (+7 Days)')}
                              </button>
                            </div>

                            <div 
                              className="pt-2 border-t space-y-1.5 px-1"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <span className="block text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('pickADateLabel', 'Or Pick a Custom Date:')}</span>
                              <input
                                type="date"
                                value={copyCustomDate}
                                onChange={(e) => {
                                  setCopyCustomDate(e.target.value);
                                  if (e.target.value) {
                                    handleCopyDayTo(day.dateStr, e.target.value);
                                    setCopyCustomDate('');
                                  }
                                }}
                                className="w-full border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)'
                                }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openAddModal(day.dateStr)}
                    className="border font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Plus className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('addMealBtn', 'Add Meal')}
                  </button>
                </div>
              </div>

              {/* Day Meals Content */}
              {!hasMealsInDay ? (
                <div className="py-16 text-center space-y-4">
                  <div 
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-emerald)',
                      color: 'var(--color-emerald)'
                    }}
                  >
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('nothingPlannedYet', 'Nothing planned for this day yet')}</p>
                  <button
                    type="button"
                    onClick={() => openAddModal(day.dateStr)}
                    className="inline-flex items-center gap-2 border font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('addAMealBtn', 'Add a Meal')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {day.dayMeals.map((meal) => (
                    <div 
                      key={meal.id} 
                      className="border rounded-2xl p-4 flex items-center justify-between shadow-xs gap-4 transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img 
                          src={meal.image || meal.imageUrl || meal.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                          alt={meal.recipeName}
                          className="w-14 h-14 rounded-xl object-cover border shrink-0" 
                          style={{ borderColor: 'var(--color-border)' }}
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                            >
                              {translateMealType(meal.mealType)}
                            </span>
                            {meal.isLeftover && (
                              <span 
                                className="border text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                                  borderColor: isDayMode ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)',
                                  color: isDayMode ? '#b45309' : '#fbbf24'
                                }}
                              >
                                {t('leftoverBadge', 'Leftover')}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold leading-snug truncate" style={{ color: 'var(--color-text)' }}>
                            {meal.recipeName}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {meal.time && <span>⏰ {meal.time}</span>}
                            <span>• {meal.servings || 2} {t('servingsLabel', 'servings')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(meal)}
                          className="p-2.5 rounded-xl border shadow-xs cursor-pointer transition hover:border-[var(--color-primary)]"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                          title={t('editPlannedMealTooltip', 'Edit Planned Meal')}
                        >
                          <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="p-2.5 rounded-xl border shadow-xs cursor-pointer transition hover:border-red-500/50 hover:text-red-500"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                          title={t('deleteMealTooltip', 'Delete Meal')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 1. SELECT RECIPES FOR SHOPPING LIST MODAL */}
      {showShoppingListModal && (
        <div 
          onClick={() => setShowShoppingListModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-7 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowShoppingListModal(false)} 
              className="absolute top-5 right-5 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1.5 pr-8">
              <h2 
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('selectRecipesShoppingTitle', 'Select Recipes for Shopping List')}
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t('selectRecipesShoppingSub', 'Choose which planned meals to compile into your grocery list')}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-1 text-xs">
              {datesWithMeals.length === 0 ? (
                <div 
                  className="py-12 text-center text-xs rounded-2xl border"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('noMealsInPlanNotice', 'No meals currently scheduled.')}
                </div>
              ) : (
                datesWithMeals.map((dateStr) => {
                  const dayMeals = plannedMeals.filter(m => (m.date || '').split('T')[0] === dateStr);
                  const selectedCount = dayMeals.filter(m => selectedMealIdsForShopping.includes(m.id)).length;
                  const isAllDaySelected = selectedCount === dayMeals.length && dayMeals.length > 0;
                  const isPartiallySelected = selectedCount > 0 && selectedCount < dayMeals.length;
                  const isExpanded = Boolean(expandedDayCards[dateStr]);

                  const dObj = parseDateKey(dateStr);
                  const formattedDayTitle = `${translateDayOfWeek(dObj)}, ${dObj.toLocaleDateString(getLocaleTag(locale), { month: 'short', day: 'numeric' })}`;

                  return (
                    <div 
                      key={dateStr}
                      className="border rounded-2xl transition overflow-hidden shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-primary)'
                      }}
                    >
                      <div 
                        onClick={() => toggleDaySelectionForShopping(dateStr, dayMeals)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5">
                          <div 
                            className="w-5 h-5 rounded-md flex items-center justify-center transition shrink-0"
                            style={isAllDaySelected || isPartiallySelected ? {
                              backgroundColor: 'var(--color-primary)',
                              borderColor: 'var(--color-primary)',
                              color: '#ffffff'
                            } : {
                              borderColor: 'var(--color-border)',
                              backgroundColor: 'var(--color-card)'
                            }}
                          >
                            {isAllDaySelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            {isPartiallySelected && <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#ffffff' }} />}
                          </div>

                          <div>
                            <h3 
                              className="text-sm font-bold"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {formattedDayTitle}
                            </h3>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                              {selectedCount}/{dayMeals.length} {t('selectedCountSuffix', 'recipes selected')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDayCards({ ...expandedDayCards, [dateStr]: !isExpanded });
                          }}
                          className="p-1 transition cursor-pointer"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div 
                          className="px-4 pb-3 pt-1 space-y-2 border-t"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          {dayMeals.map((meal) => {
                            const isMealSelected = selectedMealIdsForShopping.includes(meal.id);
                            return (
                              <div
                                key={meal.id}
                                onClick={() => toggleSingleMealForShopping(meal.id)}
                                className="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition"
                                style={isMealSelected ? {
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-primary)'
                                } : {
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)'
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div 
                                    className="w-4 h-4 rounded border flex items-center justify-center transition shrink-0"
                                    style={isMealSelected ? {
                                      backgroundColor: 'var(--color-primary)',
                                      borderColor: 'var(--color-primary)',
                                      color: '#ffffff'
                                    } : {
                                      borderColor: 'var(--color-border)',
                                      backgroundColor: 'var(--color-card)'
                                    }}
                                  >
                                    {isMealSelected && <Check className="h-3 w-3" />}
                                  </div>

                                  <img 
                                    src={meal.image || meal.imageUrl || meal.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                                    alt={meal.recipeName}
                                    className="w-8 h-8 rounded-lg object-cover border shrink-0"
                                    style={{ borderColor: 'var(--color-border)' }}
                                  />

                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{meal.recipeName}</h4>
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{translateMealType(meal.mealType)}</span>
                                  </div>
                                </div>

                                {meal.isLeftover && (
                                  <span 
                                    className="text-[9px] font-bold border px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                                      borderColor: isDayMode ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)',
                                      color: isDayMode ? '#b45309' : '#fbbf24'
                                    }}
                                  >
                                    {t('leftoverBadge', 'Leftover')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowShoppingListModal(false)}
                className="py-3 px-4 border font-bold rounded-2xl text-xs transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerateShoppingList}
                className="py-3 px-4 text-white font-bold rounded-2xl text-xs transition shadow-lg cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('generateListBtn', 'Generate Shopping List')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACCESSIBLE MAIN ADD MEAL MODAL */}
      {showAddMealModal && (
        <div 
          onClick={() => setShowAddMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-lg font-black tracking-tight"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('addMealForDateTitle', `Add Meal for ${activeDateFormattedHeader}`).replace('{date}', activeDateFormattedHeader)}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('addMealModalSub', 'Schedule a recipe for this day')}
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('dateLabel', 'Date')}
                </label>
                <div 
                  className="w-full border-2 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-text)'
                  }}
                >
                  {activeDateFieldText}
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('mealTypeLabel', 'Meal Type')}
                </label>
                <div className="relative">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="Breakfast" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('breakfast', 'Breakfast')}</option>
                    <option value="Lunch" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('lunch', 'Lunch')}</option>
                    <option value="Dinner" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('dinner', 'Dinner')}</option>
                    <option value="Snack" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('snack', 'Snack')}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-primary)' }}>
                    {t('timeLabel', 'Time')}
                  </label>
                  <div className="relative flex items-center">
                    <Clock className="h-4 w-4 absolute left-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                    <input
                      type="time"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                      autoComplete="off"
                      className="w-full border rounded-lg pl-9 pr-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                      placeholder="--:--"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-primary)' }}>
                    {t('servings', 'Servings')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={mealServings}
                    onChange={(e) => setMealServings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('recipeLabel', 'Recipe')}
                </label>
                {selectedRecipeObj ? (
                  <div 
                    className="flex items-center justify-between p-2.5 border rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image || selectedRecipeObj.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                        alt={selectedRecipeObj.name || selectedRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border shrink-0" 
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <span className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                        {selectedRecipeObj.name || selectedRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setPickerTarget('add');
                        setShowRecipePickerModal(true);
                      }}
                      className="text-[11px] hover:underline font-bold shrink-0 ml-2 cursor-pointer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {t('changeBtn', 'Change')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('add');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full border rounded-lg py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('selectRecipeBtn', 'Select Recipe')}
                  </button>
                )}
              </div>

              <div 
                className="border rounded-xl p-3 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div>
                  <div 
                    className="text-xs font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('leftoverLabel', 'Leftover Meal')}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('leftoverHelpText', 'Mark if this is leftover from a previous meal')}
                  </p>
                </div>
                
                <div 
                  onClick={() => setIsLeftover(!isLeftover)}
                  className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3"
                  style={{ backgroundColor: isLeftover ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <div 
                    className={`w-4 h-4 rounded-full shadow-md transform transition ${
                      isLeftover ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('notesLabel', 'Notes (Optional)')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notesPlaceholder', 'Add any preparation notes, variations, or reminders...')}
                  rows={3}
                  className="w-full border rounded-lg p-3 text-xs outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMealSubmit()}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('addToCalendarBtn', 'Add to Calendar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACCESSIBLE EDIT MEAL MODAL */}
      {showEditMealModal && (
        <div 
          onClick={() => setShowEditMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowEditMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-lg font-black tracking-tight flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('editPlannedMealTitle', 'Edit Planned Meal')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('editPlannedMealSub', 'Update schedule, recipe, or meal details')}
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('dateLabel', 'Date')}
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('mealTypeLabel', 'Meal Type')}
                </label>
                <div className="relative">
                  <select
                    value={editMealType}
                    onChange={(e) => setEditMealType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="Breakfast" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('breakfast', 'Breakfast')}</option>
                    <option value="Lunch" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('lunch', 'Lunch')}</option>
                    <option value="Dinner" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('dinner', 'Dinner')}</option>
                    <option value="Snack" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('snack', 'Snack')}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-primary)' }}>
                    {t('timeLabel', 'Time')}
                  </label>
                  <div className="relative flex items-center">
                    <Clock className="h-4 w-4 absolute left-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                    <input
                      type="time"
                      value={editMealTime}
                      onChange={(e) => setEditMealTime(e.target.value)}
                      autoComplete="off"
                      className="w-full border rounded-lg pl-9 pr-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-primary)' }}>
                    {t('servings', 'Servings')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editServings}
                    onChange={(e) => setEditServings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('recipeLabel', 'Recipe')}
                </label>
                {editRecipeObj ? (
                  <div 
                    className="flex items-center justify-between p-2.5 border rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={editRecipeObj.image || editRecipeObj.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                        alt={editRecipeObj.name || editRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border shrink-0" 
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <span className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                        {editRecipeObj.name || editRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setPickerTarget('edit');
                        setShowRecipePickerModal(true);
                      }}
                      className="text-[11px] hover:underline font-bold shrink-0 ml-2 cursor-pointer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {t('changeBtn', 'Change')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('edit');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full border rounded-lg py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('selectRecipeBtn', 'Select Recipe')}
                  </button>
                )}
              </div>

              <div 
                className="border rounded-xl p-3 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div>
                  <div 
                    className="text-xs font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('leftoverLabel', 'Leftover Meal')}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('leftoverHelpText', 'Mark if this is leftover from a previous meal')}
                  </p>
                </div>
                
                <div 
                  onClick={() => setEditIsLeftover(!editIsLeftover)}
                  className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3"
                  style={{ backgroundColor: editIsLeftover ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <div 
                    className={`w-4 h-4 rounded-full shadow-md transform transition ${
                      editIsLeftover ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('notesLabel', 'Notes (Optional)')}
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t('notesPlaceholder', 'Add any preparation notes, variations, or reminders...')}
                  rows={3}
                  className="w-full border rounded-lg p-3 text-xs outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingMealId && confirm(t('confirmDeleteMealAlert', 'Are you sure you want to remove this meal from your plan?'))) {
                      handleDeleteMeal(editingMealId);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-500 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer hover:bg-red-500/10"
                  style={{ backgroundColor: 'var(--color-inner-dark)' }}
                >
                  <Trash2 className="h-4 w-4" /> {t('delete', 'Delete')}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditMealModal(false)}
                    className="px-4 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditMealSubmit()}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {t('saveChanges', 'Save Changes')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SELECT RECIPE PICKER MODAL */}
      {showRecipePickerModal && (
        <div 
          onClick={() => setShowRecipePickerModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in min-h-[500px] flex flex-col justify-between cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="space-y-4">
              <button 
                type="button"
                onClick={() => setShowRecipePickerModal(false)} 
                className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  color: 'var(--color-text)'
                }}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-0.5 pr-8">
                <h2 
                  className="text-lg font-black tracking-tight"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('selectRecipeModalTitle', 'Select a Recipe')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pickerSubMealPlan', 'Pick from your saved recipe books or search')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                    <input
                      type="text"
                      placeholder={t('searchByNamePlaceholder', 'Search by recipe name...')}
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      autoComplete="off"
                      className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedBookFilter}
                      onChange={(e) => setSelectedBookFilter(e.target.value)}
                      className="border font-bold text-xs rounded-xl pl-3 pr-7 py-2 outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      <option value="All Books" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('allBooksOption', 'All Books')}</option>
                      {userFilteredBooks.map((b) => (
                        <option key={b.id} value={b.id} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{b.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className="border font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('filterBtn', 'Filter')}
                  </button>
                </div>

                {showFilterOptions && (
                  <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                    {[
                      { key: 'All', label: t('allTag', 'All') },
                      { key: 'Favorites', label: t('favoritesTag', 'Favorites') },
                      { key: 'Main Dish', label: t('mainDishTag', 'Main Dish') },
                      { key: 'Imported', label: t('importedTag', 'Imported') }
                    ].map((tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() => setActiveRecipeTagFilter(tag.key)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                        style={activeRecipeTagFilter === tag.key ? {
                          backgroundColor: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)',
                          color: '#ffffff'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredPickerRecipes.length === 0 ? (
                  <div className="py-12 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('noRecipesMatchCriteria', 'No recipes match your search criteria.')}
                  </div>
                ) : (
                  filteredPickerRecipes.map((rec) => {
                    const recTitle = rec.name || rec.title || 'Untitled Recipe';
                    const recCategory = rec.category || rec.recipeType || 'Main Dish';
                    const recImage = rec.image || rec.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

                    return (
                      <div
                        key={rec.id || recTitle}
                        className="flex items-center justify-between p-2 rounded-2xl border transition shadow-xs"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={recImage}
                            alt={recTitle}
                            className="w-12 h-12 rounded-xl object-cover border shrink-0"
                            style={{ borderColor: 'var(--color-border)' }}
                          />
                          <div className="space-y-1 min-w-0">
                            <h4 
                              className="font-extrabold text-xs leading-snug truncate"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {recTitle}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                              >
                                {recCategory}
                              </span>
                              <Heart className="h-3 w-3 fill-current" style={{ color: 'var(--color-primary)' }} />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (pickerTarget === 'edit') {
                              setEditRecipeObj(rec);
                            } else {
                              setSelectedRecipeObj(rec);
                            }
                            setShowRecipePickerModal(false);
                          }}
                          className="px-4 py-1.5 border font-bold text-xs rounded-xl transition shrink-0 ml-2 cursor-pointer shadow-xs hover:border-[var(--color-primary)]"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-primary)'
                          }}
                        >
                          {t('selectBtn', 'Select')}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div 
              className="text-center py-2 text-xs font-semibold"
              style={{ color: 'var(--color-emerald)' }}
            >
              {t('showingRecipesCount', `Showing ${filteredPickerRecipes.length} of ${savedRecipes.length} saved recipes`).replace('{count}', String(filteredPickerRecipes.length)).replace('{total}', String(savedRecipes.length))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
