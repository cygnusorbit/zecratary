'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Sparkles, Copy, Share2, Trash2, ShoppingCart, Clock, Users, 
  Flame, CheckCircle2, AlertCircle, X, Search, Check, RefreshCw, 
  ArrowRight, Lock, BookOpen, Utensils, Heart
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface ScheduledMeal {
  id: string;
  userId: string;
  createdBy?: string;
  date: string; // YYYY-MM-DD
  recipeId?: string;
  recipeName: string;
  title?: string;
  image?: string;
  imageUrl?: string;
  mealType: string; // Breakfast | Lunch | Dinner | Snack
  time?: string;
  isLeftover?: boolean;
  notes?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
}

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PlannerPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Active Week Date State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [scheduledMeals, setScheduledMeals] = useState<ScheduledMeal[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Schedule Meal Modal State (Form-Free Accessible Container)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>('');
  const [modalMealType, setModalMealType] = useState<string>('Dinner');
  const [modalDishTitle, setModalDishTitle] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('19:00');
  const [modalServings, setModalServings] = useState<number>(4);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [selectedRecipeForModal, setSelectedRecipeForModal] = useState<any | null>(null);

  // Saved Recipe Picker Modal State
  const [showRecipePicker, setShowRecipePicker] = useState<boolean>(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState<string>('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Scheduled Meals from PostgreSQL /api/planner
  const loadPlannerMeals = useCallback(async (user: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';
    setLoading(true);

    try {
      let fetchedMeals: ScheduledMeal[] = [];
      const res = await fetch(`/api/planner?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.meals)) {
          fetchedMeals = data.meals.map((m: any) => ({
            id: m.id,
            userId: m.userId || targetUserId,
            createdBy: m.createdBy || user?.email,
            date: String(m.date).split('T')[0],
            recipeId: m.recipeId || null,
            recipeName: m.recipeName || m.title || 'Scheduled Meal',
            title: m.recipeName || m.title || 'Scheduled Meal',
            image: m.image || m.imageUrl || '/uploads/recipes/default.jpg',
            imageUrl: m.image || m.imageUrl || '/uploads/recipes/default.jpg',
            mealType: m.mealType || 'Dinner',
            time: m.time || '',
            notes: m.notes || '',
            servings: Number(m.servings || 4),
            prepTimeMinutes: Number(m.prepTimeMinutes || 15),
            cookTimeMinutes: Number(m.cookTimeMinutes || 25)
          }));
        }
      }

      setScheduledMeals(fetchedMeals);

      // 2. Fetch live Saved Recipes for the Recipe Picker Modal
      try {
        const rRes = await fetch(`/api/saved-recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (rRes.ok) {
          const rData = await rRes.json();
          const rList = Array.isArray(rData) ? rData : (rData?.recipes || []);
          setSavedRecipes(rList);
        }
      } catch (_) {}

    } catch (e) {
      console.warn('[PlannerPage] Error loading meals:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('mealPlannerTitle', 'Weekly Meal Planner')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadPlannerMeals(user);

    const handleSync = () => {
      const u = getCurrentUser();
      if (u) {
        setCurrentUser(u);
        loadPlannerMeals(u);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadPlannerMeals, router, t]);

  // Compute 7 days of the active week
  const weekDays = useMemo(() => {
    const days: { date: Date; dateKey: string; dayNameKey: string; dayName: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const dateKey = formatDateKey(d);
      const dayName = DAY_NAMES[i];
      const dayNameKey = `day${dayName}`;
      days.push({ date: d, dateKey, dayNameKey, dayName });
    }
    return days;
  }, [currentWeekStart]);

  // Navigate Weeks
  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const handleToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  // Group meals for the active 7 days
  const activeWeekMeals = useMemo(() => {
    const keys = new Set(weekDays.map(d => d.dateKey));
    return scheduledMeals.filter(m => keys.has(m.date));
  }, [scheduledMeals, weekDays]);

  // Daily Nutritional Averages
  const weeklyNutrition = useMemo(() => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    activeWeekMeals.forEach(m => {
      // Find matching saved recipe if available for detailed macros
      const matched = savedRecipes.find(r => r.id === m.recipeId || (r.title || r.name)?.toLowerCase() === m.recipeName?.toLowerCase());
      const cals = Number(matched?.calories || 450);
      const prot = Number(matched?.proteinGrams || 25);
      const carbs = Number(matched?.carbsGrams || 40);
      const fat = Number(matched?.fatGrams || 15);

      totalCalories += cals;
      totalProtein += prot;
      totalCarbs += carbs;
      totalFat += fat;
    });

    return {
      avgCalories: Math.round(totalCalories / 7),
      avgProtein: Math.round(totalProtein / 7),
      avgCarbs: Math.round(totalCarbs / 7),
      avgFat: Math.round(totalFat / 7)
    };
  }, [activeWeekMeals, savedRecipes]);

  // Check Macro Access
  const canViewMacros = useMemo(() => {
    if (!currentUser) return false;
    const plan = (currentUser.subscription_plan || currentUser.role || '').toLowerCase();
    return plan.includes('pro') || plan.includes('premium') || plan.includes('nutrition') || currentUser.role === 'admin';
  }, [currentUser]);

  // Open Modal
  const handleOpenAddModal = (dateKey: string, mealType: string = 'Dinner') => {
    setModalDate(dateKey);
    setModalMealType(mealType);
    setModalDishTitle('');
    setModalTime('19:00');
    setModalServings(4);
    setModalNotes('');
    setSelectedRecipeForModal(null);
    setShowAddModal(true);
  };

  // Save Scheduled Meal
  const handleConfirmScheduleMeal = async () => {
    if (!modalDishTitle.trim() || !currentUser) return;

    const newMeal: ScheduledMeal = {
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: currentUser.id || 'usr_admin_1',
      createdBy: currentUser.email || 'admin@zecratary.com',
      date: modalDate,
      recipeId: selectedRecipeForModal?.id || null,
      recipeName: modalDishTitle.trim(),
      title: modalDishTitle.trim(),
      image: selectedRecipeForModal?.imageUrl || selectedRecipeForModal?.image || '/uploads/recipes/default.jpg',
      imageUrl: selectedRecipeForModal?.imageUrl || selectedRecipeForModal?.image || '/uploads/recipes/default.jpg',
      mealType: modalMealType,
      time: modalTime || '19:00',
      notes: modalNotes.trim(),
      servings: Number(modalServings || 4),
      prepTimeMinutes: Number(selectedRecipeForModal?.prepTimeMinutes || 15),
      cookTimeMinutes: Number(selectedRecipeForModal?.cookTimeMinutes || 25)
    };

    const updated = [...scheduledMeals, newMeal];
    setScheduledMeals(updated);

    try {
      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeal)
      });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('mealScheduledSuccessToast', 'Meal scheduled successfully!'));
    } catch (_) {}

    setShowAddModal(false);
  };

  // Delete Single Scheduled Meal
  const handleDeleteMeal = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = scheduledMeals.filter(m => m.id !== id);
    setScheduledMeals(updated);

    try {
      await fetch(`/api/planner?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('mealDeletedToast', 'Meal removed from planner.'));
    } catch (_) {}
  };

  // Clear Active Week Meals
  const handleClearWeek = async () => {
    if (activeWeekMeals.length === 0) return;
    if (!confirm(t('confirmClearWeek', 'Are you sure you want to clear all scheduled meals for this week?'))) return;

    const startDate = weekDays[0].dateKey;
    const endDate = weekDays[6].dateKey;
    const weekIds = new Set(activeWeekMeals.map(m => m.id));
    const updated = scheduledMeals.filter(m => !weekIds.has(m.id));
    setScheduledMeals(updated);

    try {
      await fetch(`/api/planner?dateRange=${encodeURIComponent(`${startDate},${endDate}`)}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('weekClearedToast', 'All meals for this week cleared.'));
    } catch (_) {}
  };

  // Copy Current Week to Next Week
  const handleCopyWeek = async () => {
    if (activeWeekMeals.length === 0) return;

    const copiedMeals: ScheduledMeal[] = activeWeekMeals.map(m => {
      const [y, mo, d] = m.date.split('-').map(Number);
      const targetDate = new Date(y, mo - 1, d + 7);
      return {
        ...m,
        id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        date: formatDateKey(targetDate)
      };
    });

    const updated = [...scheduledMeals, ...copiedMeals];
    setScheduledMeals(updated);

    try {
      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals: copiedMeals })
      });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('weekCopiedSuccessToast', 'Copied this week’s meals to the next week!'));
    } catch (_) {}
  };

  // Share Weekly Meal Plan (Copy to Clipboard)
  const handleSharePlan = async () => {
    if (activeWeekMeals.length === 0) return;

    let text = `🗓️ ${t('mealPlannerTitle', 'Weekly Meal Planner')} (${weekDays[0].dateKey} - ${weekDays[6].dateKey})\n\n`;
    weekDays.forEach(day => {
      const dayMeals = activeWeekMeals.filter(m => m.date === day.dateKey);
      if (dayMeals.length > 0) {
        text += `📌 ${t(day.dayNameKey, day.dayName)} (${day.dateKey}):\n`;
        dayMeals.forEach(m => {
          text += `  • [${t(`slot${m.mealType}`, m.mealType)}] ${m.recipeName} (${m.servings || 4} servings)\n`;
        });
        text += '\n';
      }
    });

    try {
      await navigator.clipboard.writeText(text);
      showToast(t('planSharedSuccessToast', 'Weekly meal plan copied to clipboard!'));
    } catch (_) {
      showToast('Could not access clipboard.');
    }
  };

  // Generate Grocery List to /shopping
  const handleGenerateGroceryList = async () => {
    if (activeWeekMeals.length === 0) return;
    const targetUserId = currentUser?.id || 'usr_admin_1';

    const itemsToPost: any[] = [];
    activeWeekMeals.forEach(meal => {
      const matched = savedRecipes.find(r => r.id === meal.recipeId || (r.title || r.name)?.toLowerCase() === meal.recipeName?.toLowerCase());
      if (matched && Array.isArray(matched.ingredients)) {
        matched.ingredients.forEach((ing: any) => {
          itemsToPost.push({
            id: 'shop_' + Math.random().toString(36).substring(2, 7),
            userId: targetUserId,
            item: typeof ing === 'string' ? ing : ing.name || ing.item,
            amount: typeof ing === 'object' ? ing.amount || '1' : '1',
            unit: typeof ing === 'object' ? ing.unit || '' : '',
            category: typeof ing === 'object' ? ing.category || 'Produce' : 'Produce',
            checked: false
          });
        });
      } else {
        itemsToPost.push({
          id: 'shop_' + Math.random().toString(36).substring(2, 7),
          userId: targetUserId,
          item: `Ingredients for ${meal.recipeName}`,
          amount: '1',
          unit: 'pkg',
          category: 'Produce',
          checked: false
        });
      }
    });

    try {
      await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToPost })
      });
      window.dispatchEvent(new Event('zecratary_shopping_updated'));
      showToast(t('groceryListCreatedToast', 'Ingredients added to your shopping list!'));
    } catch (_) {}
  };

  const filteredPickerRecipes = useMemo(() => {
    const q = recipeSearchQuery.toLowerCase().trim();
    if (!q) return savedRecipes;
    return savedRecipes.filter(r => 
      (r.title || r.name || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }, [savedRecipes, recipeSearchQuery]);

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toastMessage.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: 'var(--color-text)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('mealPlannerTitle', 'Weekly Meal Planner')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('mealPlannerSubtitle', 'Organize your weekly meals, balance nutritional targets, and generate grocery lists.')}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <Link
            href="/chef"
            className="px-3.5 py-2 rounded-xl text-white transition flex items-center gap-1.5 shadow-md hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Sparkles className="h-4 w-4" />
            <span>{t('planWeekBtn', 'AI Auto-Plan')}</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyWeek}
            disabled={activeWeekMeals.length === 0}
            className="px-3 py-2 rounded-xl border transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{t('copyWeekBtn', 'Copy Week')}</span>
          </button>

          <button
            type="button"
            onClick={handleSharePlan}
            disabled={activeWeekMeals.length === 0}
            className="px-3 py-2 rounded-xl border transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{t('sharePlanBtn', 'Share Plan')}</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateGroceryList}
            disabled={activeWeekMeals.length === 0}
            className="px-3 py-2 rounded-xl border transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-emerald)' }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>{t('groceryListBtn', 'Generate Grocery List')}</span>
          </button>

          <button
            type="button"
            onClick={handleClearWeek}
            disabled={activeWeekMeals.length === 0}
            className="px-3 py-2 rounded-xl border text-red-400 hover:bg-red-500/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t('clearWeekBtn', 'Clear Week')}</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Macro Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Date Navigator Strip (7 Cols) */}
        <div 
          className="lg:col-span-7 p-4 rounded-3xl border flex items-center justify-between gap-4 shadow-sm"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-2 rounded-xl border transition cursor-pointer hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              title={t('prevWeek', 'Previous Week')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              {t('todayBtn', 'Today')}
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-2 rounded-xl border transition cursor-pointer hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              title={t('nextWeek', 'Next Week')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="text-right">
            <span className="text-xs font-black" style={{ color: 'var(--color-primary)' }}>
              {weekDays[0].dateKey} — {weekDays[6].dateKey}
            </span>
            <span className="block text-[10px] opacity-70">
              {activeWeekMeals.length} meals scheduled
            </span>
          </div>
        </div>

        {/* Nutritional Macro Summary Banner (5 Cols) */}
        <div 
          className="lg:col-span-5 p-4 rounded-3xl border shadow-sm flex flex-col justify-between relative overflow-hidden"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
              {t('dailyNutritionalAverage', 'Daily Nutritional Average')}
            </span>
            {!canViewMacros && (
              <Link 
                href="/subscriptions"
                className="text-[10px] font-bold text-amber-500 hover:underline flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                <span>{t('unlockMacrosBadge', 'Upgrade to Unlock')}</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <span className="text-[10px] opacity-70 block">{t('calories', 'Calories')}</span>
              <span className="text-sm font-black font-mono">
                {canViewMacros ? weeklyNutrition.avgCalories : '••••'}
              </span>
            </div>
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <span className="text-[10px] opacity-70 block">{t('protein', 'Protein')}</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {canViewMacros ? `${weeklyNutrition.avgProtein}g` : '••g'}
              </span>
            </div>
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <span className="text-[10px] opacity-70 block">{t('carbs', 'Carbs')}</span>
              <span className="text-sm font-black font-mono text-amber-400">
                {canViewMacros ? `${weeklyNutrition.avgCarbs}g` : '••g'}
              </span>
            </div>
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <span className="text-[10px] opacity-70 block">{t('fat', 'Fat')}</span>
              <span className="text-sm font-black font-mono text-sky-400">
                {canViewMacros ? `${weeklyNutrition.avgFat}g` : '••g'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Interactive Meal Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5 items-start">
        {weekDays.map(day => {
          const isToday = day.dateKey === formatDateKey(new Date());
          const dayMeals = activeWeekMeals.filter(m => m.date === day.dateKey);

          return (
            <div 
              key={day.dateKey}
              className="border rounded-3xl p-3.5 space-y-3 shadow-xs flex flex-col justify-between min-h-[380px]"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: isToday ? 'var(--color-primary)' : 'var(--color-border)'
              }}
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between border-b pb-2 mb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <h3 className={`text-xs font-black ${isToday ? 'text-[var(--color-primary)]' : ''}`}>
                      {t(day.dayNameKey, day.dayName)}
                    </h3>
                    <span className="text-[10px] opacity-60 font-mono">
                      {day.dateKey.slice(5)}
                    </span>
                  </div>
                  {isToday && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white bg-[var(--color-primary)]">
                      {t('todayBtn', 'Today')}
                    </span>
                  )}
                </div>

                {/* Scheduled Meals List for the Day */}
                <div className="space-y-2">
                  {dayMeals.length === 0 ? (
                    <div className="py-8 text-center text-[11px] opacity-40">
                      {t('noMealsScheduled', 'No meals scheduled')}
                    </div>
                  ) : (
                    dayMeals.map(meal => (
                      <div 
                        key={meal.id}
                        className="p-2.5 rounded-2xl border space-y-1.5 relative group shadow-xs hover:border-[var(--color-primary)] transition"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-emerald-400" style={{ borderColor: 'var(--color-border)' }}>
                            {t(`slot${meal.mealType}`, meal.mealType)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMeal(e, meal.id)}
                            className="text-red-400 hover:text-red-300 opacity-60 hover:opacity-100 transition cursor-pointer p-0.5"
                            title="Delete Meal"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <h4 className="font-bold text-xs leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
                          {meal.recipeName}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] opacity-75 font-mono pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <span>{meal.time || '19:00'}</span>
                          <span>{(meal.prepTimeMinutes || 15) + (meal.cookTimeMinutes || 25)}m</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Meal Button for Day */}
              <button
                type="button"
                onClick={() => handleOpenAddModal(day.dateKey, 'Dinner')}
                className="w-full py-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-800/30"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('addMealBtn', 'Add Meal')}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* SCHEDULE MEAL MODAL (Autofill Safe Accessible Container) */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('addMealModalTitle', 'Schedule Meal')}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Select from Saved Recipes Action */}
              <button
                type="button"
                onClick={() => setShowRecipePicker(true)}
                className="w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer hover:opacity-80 transition"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {selectedRecipeForModal ? selectedRecipeForModal.title : t('selectFromSaved', 'Select from Saved Recipes')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('dishTitleLabel', 'Dish / Recipe Title *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('dishTitlePlaceholder', 'e.g. Grilled Salmon with Asparagus')}
                  value={modalDishTitle}
                  onChange={(e) => setModalDishTitle(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('mealDateLabel', 'Scheduled Date')}</label>
                  <input
                    type="date"
                    autoComplete="off"
                    data-lpignore="true"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('mealSlotLabel', 'Meal Slot')}</label>
                  <select
                    value={modalMealType}
                    onChange={(e) => setModalMealType(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {MEAL_SLOTS.map(s => (
                      <option key={s} value={s}>{t(`slot${s}`, s)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('mealTimeLabel', 'Time (Optional)')}</label>
                  <input
                    type="time"
                    autoComplete="off"
                    data-lpignore="true"
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('servingsLabel', 'Servings')}</label>
                  <input
                    type="number"
                    min="1"
                    autoComplete="off"
                    data-lpignore="true"
                    value={modalServings}
                    onChange={(e) => setModalServings(parseInt(e.target.value) || 1)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('notesLabel', 'Cooking Notes (Optional)')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Defrost chicken overnight..."
                  className="w-full border rounded-xl p-2.5 text-xs outline-none resize-none font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold transition cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmScheduleMeal}
                  disabled={!modalDishTitle.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl transition shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('confirmScheduleBtn', 'Confirm Schedule')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED RECIPE PICKER MODAL */}
      {showRecipePicker && (
        <div 
          onClick={() => setShowRecipePicker(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative p-5 space-y-3 cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('selectFromSaved', 'Select from Saved Recipes')}
              </h3>
              <button type="button" onClick={() => setShowRecipePicker(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 pointer-events-none opacity-60" />
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                placeholder={t('searchSavedRecipesModal', 'Search your recipe collection...')}
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar max-h-80">
              {filteredPickerRecipes.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-50">
                  No recipes found.
                </div>
              ) : (
                filteredPickerRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      setSelectedRecipeForModal(recipe);
                      setModalDishTitle(recipe.title || recipe.name);
                      setModalServings(Number(recipe.servings || 4));
                      setShowRecipePicker(false);
                    }}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-3 hover:border-[var(--color-primary)] transition cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={recipe.imageUrl || recipe.image || '/uploads/recipes/default.jpg'} 
                        alt={recipe.title} 
                        className="w-10 h-10 rounded-lg object-cover border shrink-0" 
                        style={{ borderColor: 'var(--color-border)' }} 
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate">{recipe.title || recipe.name}</h4>
                        <span className="text-[10px] opacity-60 block">{recipe.recipeType || 'Main Dish'}</span>
                      </div>
                    </div>
                    <Check className="h-4 w-4 text-[var(--color-primary)] opacity-0 group-hover:opacity-100" />
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
