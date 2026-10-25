'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutTemplate, Search, Plus, Trash2, Edit3, CalendarPlus, 
  Sparkles, Clock, Users, ArrowRight, Check, X, BookOpen, 
  RefreshCw, CheckCircle2, AlertCircle, Utensils, Calendar,
  ChevronRight, Layers, Bookmark
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface TemplateMeal {
  id: string;
  dayIndex: number; // 0 to 6 (Monday to Sunday)
  mealType: string; // Breakfast | Lunch | Dinner | Snack
  recipeId?: string;
  recipeName: string;
  image?: string;
  imageUrl?: string;
  time?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  notes?: string;
}

interface MealTemplate {
  id: string;
  userId: string;
  createdBy?: string;
  title: string;
  description: string;
  category?: string;
  totalDays: number;
  meals: TemplateMeal[];
  createdAt?: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DEFAULT_TEMPLATES: MealTemplate[] = [
  {
    id: 'tpl_default_1',
    userId: 'usr_admin_1',
    title: 'High-Protein Wholesome Week',
    description: 'Balanced lean meats, complex carbohydrates, and vibrant greens designed for active lifestyles.',
    category: 'High-Protein',
    totalDays: 7,
    meals: [
      { id: 'm_1_0', dayIndex: 0, mealType: 'Dinner', recipeName: 'Garlic Butter Chicken Breast', prepMinutes: 15, cookMinutes: 20, servings: 2 },
      { id: 'm_1_1', dayIndex: 1, mealType: 'Dinner', recipeName: 'Grilled Salmon with Asparagus', prepMinutes: 10, cookMinutes: 15, servings: 2 },
      { id: 'm_1_2', dayIndex: 2, mealType: 'Dinner', recipeName: 'Lean Beef & Broccoli Stir-Fry', prepMinutes: 15, cookMinutes: 15, servings: 2 }
    ]
  },
  {
    id: 'tpl_default_2',
    userId: 'usr_admin_1',
    title: 'Quick 20-Minute Dinners',
    description: 'Fast weeknight family favorites with minimal prep and cleanup.',
    category: 'Quick & Easy',
    totalDays: 5,
    meals: [
      { id: 'm_2_0', dayIndex: 0, mealType: 'Dinner', recipeName: 'Creamy Pesto Penne Pasta', prepMinutes: 5, cookMinutes: 15, servings: 4 },
      { id: 'm_2_1', dayIndex: 1, mealType: 'Dinner', recipeName: 'Quick Thai Basil Tofu Stir-Fry', prepMinutes: 10, cookMinutes: 10, servings: 2 }
    ]
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal 1: Create / Edit Template
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateDesc, setTemplateDesc] = useState<string>('');
  const [templateCategory, setTemplateCategory] = useState<string>('General');
  const [templateDays, setTemplateDays] = useState<number>(7);

  // Modal 2: Add / Edit Meal in Blueprint Day
  const [showMealModal, setShowMealModal] = useState<boolean>(false);
  const [targetDayIndex, setTargetDayIndex] = useState<number>(0);
  const [targetMealType, setTargetMealType] = useState<string>('Dinner');
  const [targetDishTitle, setTargetDishTitle] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('19:00');
  const [targetServings, setTargetServings] = useState<number>(4);
  const [targetCookingTime, setTargetCookingTime] = useState<number>(30);
  const [targetNotes, setTargetNotes] = useState<string>('');
  const [selectedRecipeForMeal, setSelectedRecipeForMeal] = useState<any | null>(null);

  // Modal 3: Saved Recipe Picker
  const [showRecipePicker, setShowRecipePicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');

  // Modal 4: Apply to Calendar
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [applyStartDate, setApplyStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch live templates from PostgreSQL /api/templates
  const loadTemplatesData = useCallback(async (user: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';
    setLoading(true);

    try {
      let fetchedTemplates: MealTemplate[] = [];
      const res = await fetch(`/api/templates?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.templates) && data.templates.length > 0) {
          fetchedTemplates = data.templates;
        }
      }

      // Offline localStorage fallback
      if (fetchedTemplates.length === 0 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('zecratary_meal_templates');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) fetchedTemplates = parsed;
        }
      }

      if (fetchedTemplates.length === 0) {
        fetchedTemplates = DEFAULT_TEMPLATES;
      }

      setTemplates(fetchedTemplates);
      if (!selectedTemplateId && fetchedTemplates.length > 0) {
        setSelectedTemplateId(fetchedTemplates[0].id);
      }

      // Hydrate Saved Recipes for the Recipe Picker
      try {
        const rRes = await fetch(`/api/saved-recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (rRes.ok) {
          const rData = await rRes.json();
          const rList = Array.isArray(rData) ? rData : (rData?.recipes || []);
          setSavedRecipes(rList);
        }
      } catch (_) {}

    } catch (e) {
      console.warn('[TemplatesPage] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    document.title = `${t('mealBlueprintsTitle', 'Meal Blueprints')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadTemplatesData(user);

    const handleSync = () => {
      const active = getCurrentUser();
      if (active) {
        setCurrentUser(active);
        loadTemplatesData(active);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadTemplatesData, router, t]);

  const activeTemplate = useMemo(() => {
    return templates.find(tpl => tpl.id === selectedTemplateId) || templates[0] || null;
  }, [templates, selectedTemplateId]);

  const persistTemplatesList = async (updatedList: MealTemplate[]) => {
    setTemplates(updatedList);
    const targetUserId = currentUser?.id || 'usr_admin_1';

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_meal_templates', JSON.stringify(updatedList));
      } catch (_) {}
    }

    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, createdBy: currentUser?.email, templates: updatedList })
      });
    } catch (_) {}

    window.dispatchEvent(new Event('storage'));
  };

  // Create or Update Template
  const handleSaveTemplateModal = async () => {
    if (!templateTitle.trim() || !currentUser) return;

    if (editingTemplateId) {
      const updated = templates.map(tpl => {
        if (tpl.id === editingTemplateId) {
          return {
            ...tpl,
            title: templateTitle.trim(),
            description: templateDesc.trim(),
            category: templateCategory,
            totalDays: Number(templateDays || 7)
          };
        }
        return tpl;
      });
      await persistTemplatesList(updated);
      showToast(t('blueprintSavedToast', 'Blueprint saved to database!'));
    } else {
      const newTpl: MealTemplate = {
        id: 'tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        userId: currentUser.id || 'usr_admin_1',
        createdBy: currentUser.email || 'admin@zecratary.com',
        title: templateTitle.trim(),
        description: templateDesc.trim(),
        category: templateCategory,
        totalDays: Number(templateDays || 7),
        meals: []
      };
      const updated = [newTpl, ...templates];
      await persistTemplatesList(updated);
      setSelectedTemplateId(newTpl.id);
      showToast(t('blueprintSavedToast', 'Blueprint saved to database!'));
    }

    setShowTemplateModal(false);
  };

  const handleOpenEditTemplate = (e: React.MouseEvent, tpl: MealTemplate) => {
    e.stopPropagation();
    setEditingTemplateId(tpl.id);
    setTemplateTitle(tpl.title);
    setTemplateDesc(tpl.description || '');
    setTemplateCategory(tpl.category || 'General');
    setTemplateDays(tpl.totalDays || 7);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteBlueprint', 'Are you sure you want to delete this meal blueprint?'))) return;

    const updated = templates.filter(t => t.id !== id);
    await persistTemplatesList(updated);

    if (selectedTemplateId === id) {
      setSelectedTemplateId(updated[0]?.id || null);
    }

    try {
      await fetch(`/api/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    showToast(t('blueprintDeletedToast', 'Blueprint deleted successfully.'));
  };

  // Add / Edit Meal inside a Blueprint Day
  const handleOpenAddMeal = (dayIdx: number, slot: string = 'Dinner') => {
    setTargetDayIndex(dayIdx);
    setTargetMealType(slot);
    setTargetDishTitle('');
    setTargetTime('19:00');
    setTargetServings(4);
    setTargetCookingTime(30);
    setTargetNotes('');
    setSelectedRecipeForMeal(null);
    setShowMealModal(true);
  };

  const handleSaveMealToBlueprint = async () => {
    if (!targetDishTitle.trim() || !activeTemplate) return;

    const newMeal: TemplateMeal = {
      id: 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      dayIndex: targetDayIndex,
      mealType: targetMealType,
      recipeId: selectedRecipeForMeal?.id || null,
      recipeName: targetDishTitle.trim(),
      title: targetDishTitle.trim(),
      image: selectedRecipeForMeal?.imageUrl || selectedRecipeForMeal?.image || '/uploads/recipes/default.jpg',
      imageUrl: selectedRecipeForMeal?.imageUrl || selectedRecipeForMeal?.image || '/uploads/recipes/default.jpg',
      time: targetTime || '19:00',
      servings: Number(targetServings || 4),
      prepMinutes: Number(selectedRecipeForMeal?.prepTimeMinutes || 15),
      cookMinutes: Number(selectedRecipeForMeal?.cookTimeMinutes || 25),
      notes: targetNotes.trim()
    };

    const updatedMeals = [...(activeTemplate.meals || []), newMeal];
    const updated = templates.map(tpl => tpl.id === activeTemplate.id ? { ...tpl, meals: updatedMeals } : tpl);

    await persistTemplatesList(updated);
    setShowMealModal(false);
    showToast(t('blueprintSavedToast', 'Blueprint saved to database!'));
  };

  const handleRemoveMealFromBlueprint = async (mealId: string) => {
    if (!activeTemplate) return;
    const updatedMeals = (activeTemplate.meals || []).filter(m => m.id !== mealId);
    const updated = templates.map(tpl => tpl.id === activeTemplate.id ? { ...tpl, meals: updatedMeals } : tpl);
    await persistTemplatesList(updated);
  };

  // Apply Blueprint to Weekly Calendar (/api/planner)
  const handleApplyToCalendar = async () => {
    if (!activeTemplate || !activeTemplate.meals || activeTemplate.meals.length === 0) return;
    const targetUserId = currentUser?.id || 'usr_admin_1';

    const [y, m, d] = applyStartDate.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);

    const scheduledMeals = activeTemplate.meals.map((meal, idx) => {
      const mealDate = new Date(baseDate);
      mealDate.setDate(mealDate.getDate() + (meal.dayIndex || 0));
      const dateStr = mealDate.toISOString().split('T')[0];

      return {
        id: 'plan_' + Date.now() + '_' + idx,
        userId: targetUserId,
        createdBy: currentUser?.email || 'admin@zecratary.com',
        date: dateStr,
        recipeId: meal.recipeId || null,
        recipeName: meal.recipeName || meal.title || 'Scheduled Dish',
        title: meal.recipeName || meal.title || 'Scheduled Dish',
        image: meal.image || meal.imageUrl || '/uploads/recipes/default.jpg',
        imageUrl: meal.image || meal.imageUrl || '/uploads/recipes/default.jpg',
        mealType: meal.mealType || 'Dinner',
        time: meal.time || '19:00',
        servings: Number(meal.servings || 4),
        prepTimeMinutes: Number(meal.prepMinutes || 15),
        cookTimeMinutes: Number(meal.cookMinutes || 25),
        notes: meal.notes || `Applied from ${activeTemplate.title}`
      };
    });

    try {
      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals: scheduledMeals })
      });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('templateAppliedSuccessToast', 'Meal blueprint scheduled onto your calendar!'));
      setShowApplyModal(false);
    } catch (_) {
      showToast('Error applying template to planner.', 'error');
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter(tpl => 
      tpl.title.toLowerCase().includes(q) ||
      (tpl.description || '').toLowerCase().includes(q) ||
      (tpl.category || '').toLowerCase().includes(q)
    );
  }, [templates, search]);

  const filteredPickerRecipes = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return savedRecipes;
    return savedRecipes.filter(r => 
      (r.title || r.name || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }, [savedRecipes, pickerSearch]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('mealBlueprintsTitle', 'Meal Blueprints')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('mealBlueprintsSubtitle', 'Create, customize, and apply multi-day meal planning blueprints to your calendar.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadTemplatesData(currentUser)}
            disabled={loading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title={t('reloadBtn', 'Reload')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('reloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateTitle('');
              setTemplateDesc('');
              setTemplateCategory('General');
              setTemplateDays(7);
              setShowTemplateModal(true);
            }}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> {t('newBlueprintBtn', 'New Blueprint')}
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: BLUEPRINTS CATALOG (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search Box (Autofill Safe) */}
          <div role="region" data-lpignore="true" className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none opacity-60" />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              spellCheck="false"
              placeholder={t('searchBlueprintsPlaceholder', 'Search blueprints by title or category...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none transition font-medium"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          {/* Templates Selection List */}
          <div className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-50 border rounded-2xl" style={{ borderColor: 'var(--color-border)' }}>
                {t('noBlueprintsFound', 'No Blueprints Found')}
              </div>
            ) : (
              filteredTemplates.map(tpl => {
                const isSelected = tpl.id === activeTemplate?.id;
                const mealCount = (tpl.meals || []).length;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className="p-4 rounded-3xl border transition cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-2.5 group"
                    style={isSelected ? {
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-primary)',
                      borderWidth: '2px'
                    } : {
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                          {tpl.category || 'General'}
                        </span>
                        <h3 className="font-extrabold text-sm leading-snug truncate" style={{ color: 'var(--color-text)' }}>
                          {tpl.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditTemplate(e, tpl)}
                          className="p-1 rounded-lg hover:bg-slate-800/30 transition text-slate-400 hover:text-white"
                          title={t('editBlueprint', 'Edit Blueprint')}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                          className="p-1 rounded-lg hover:bg-red-500/10 transition text-red-400"
                          title={t('deleteBlueprint', 'Delete Blueprint')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed opacity-75 line-clamp-2">
                      {tpl.description || t('emptyDayDesc', 'Weekly meal plan blueprint.')}
                    </p>

                    <div className="pt-2 border-t flex items-center justify-between text-[10px] font-bold opacity-80" style={{ borderColor: 'var(--color-border)' }}>
                      <span>{(t('totalMealsCount', '{count} Meals Planned')).replace('{count}', String(mealCount))}</span>
                      <span className="text-emerald-400">{(t('durationDays', '{days} Days Duration')).replace('{days}', String(tpl.totalDays || 7))}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BLUEPRINT WORKBENCH CANVAS (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeTemplate ? (
            <div 
              className="border rounded-3xl p-6 space-y-6 shadow-sm transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              {/* Active Blueprint Banner & Apply Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase text-emerald-400" style={{ borderColor: 'var(--color-border)' }}>
                      {activeTemplate.category || 'General'}
                    </span>
                    <span className="text-xs opacity-60">
                      {(t('durationDays', '{days} Days Duration')).replace('{days}', String(activeTemplate.totalDays || 7))}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1" style={{ color: 'var(--color-text)' }}>
                    {activeTemplate.title}
                  </h2>
                  {activeTemplate.description && (
                    <p className="text-xs opacity-75 mt-0.5">{activeTemplate.description}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowApplyModal(true)}
                  disabled={!activeTemplate.meals || activeTemplate.meals.length === 0}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg hover:opacity-90 cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>{t('applyToCalendarBtn', 'Apply to Calendar')}</span>
                </button>
              </div>

              {/* 7-Day Blueprint Day Cards Breakdown */}
              <div className="space-y-4">
                {DAY_NAMES.slice(0, activeTemplate.totalDays || 7).map((dayName, dayIdx) => {
                  const dayMeals = (activeTemplate.meals || []).filter(m => m.dayIndex === dayIdx);
                  const dayNameKey = `day${dayName}`;

                  return (
                    <div 
                      key={dayIdx}
                      className="border rounded-2xl p-4 space-y-3 shadow-xs"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs text-[var(--color-primary)]" style={{ borderColor: 'var(--color-border)' }}>
                            {dayIdx + 1}
                          </span>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                            {t(dayNameKey, dayName)}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAddMeal(dayIdx, 'Dinner')}
                          className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{(t('addMealToDay', 'Add Dish to {day}')).replace('{day}', t(dayNameKey, dayName))}</span>
                        </button>
                      </div>

                      {dayMeals.length === 0 ? (
                        <div className="py-4 text-center text-[11px] opacity-40">
                          {t('emptyDayDesc', 'No meals planned for this day.')}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dayMeals.map(meal => (
                            <div 
                              key={meal.id}
                              className="p-3 rounded-xl border space-y-1.5 flex items-start justify-between gap-2 shadow-xs group"
                              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border text-emerald-400" style={{ borderColor: 'var(--color-border)' }}>
                                    {t(`slot${meal.mealType}`, meal.mealType)}
                                  </span>
                                  {meal.time && (
                                    <span className="text-[10px] font-mono opacity-60">
                                      {meal.time}
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                                  {meal.recipeName}
                                </h5>
                                <div className="flex items-center gap-3 text-[10px] opacity-75 font-mono">
                                  <span>{meal.servings || 4} serv</span>
                                  <span>{(meal.prepMinutes || 15) + (meal.cookMinutes || 25)}m</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMealFromBlueprint(meal.id)}
                                className="p-1 rounded text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                title="Remove meal"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs opacity-50 border rounded-3xl" style={{ borderColor: 'var(--color-border)' }}>
              {t('noBlueprintsFound', 'No Blueprints Found')}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT BLUEPRINT (Autofill Safe Container) */}
      {showTemplateModal && (
        <div 
          onClick={() => setShowTemplateModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {editingTemplateId ? t('editBlueprint', 'Edit Blueprint') : t('newBlueprintBtn', 'New Blueprint')}
              </h3>
              <button type="button" onClick={() => setShowTemplateModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('blueprintTitleLabel', 'Blueprint Title *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('blueprintTitlePlaceholder', 'e.g. High-Protein Muscle Gain...')}
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('blueprintCategoryLabel', 'Category')}</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {['General', 'High-Protein', 'Low-Carb / Keto', 'Mediterranean', 'Family Friendly', 'Quick & Easy'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Duration (Days)</label>
                  <select
                    value={templateDays}
                    onChange={(e) => setTemplateDays(Number(e.target.value))}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {[3, 4, 5, 7].map(d => (
                      <option key={d} value={d}>{(t('durationDays', '{days} Days Duration')).replace('{days}', String(d))}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('blueprintDescLabel', 'Description')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('blueprintDescPlaceholder', 'Short summary of this meal plan blueprint...')}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplateModal}
                  disabled={!templateTitle.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('saveBlueprintBtn', 'Save Blueprint')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MEAL TO BLUEPRINT DAY (Autofill Safe Container) */}
      {showMealModal && (
        <div 
          onClick={() => setShowMealModal(false)}
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
                {(t('addMealToDay', 'Add Dish to {day}')).replace('{day}', t(`day${DAY_NAMES[targetDayIndex]}`, DAY_NAMES[targetDayIndex]))}
              </h3>
              <button type="button" onClick={() => setShowMealModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <button
                type="button"
                onClick={() => setShowRecipePicker(true)}
                className="w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer hover:opacity-80 transition"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {selectedRecipeForMeal ? selectedRecipeForMeal.title : t('selectFromSavedRecipes', 'Select from Saved Recipes')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('customDishTitleLabel', 'Dish Title *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('dishTitlePlaceholder', 'e.g. Grilled Salmon with Asparagus')}
                  value={targetDishTitle}
                  onChange={(e) => setTargetDishTitle(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('mealSlotLabel', 'Meal Slot')}</label>
                  <select
                    value={targetMealType}
                    onChange={(e) => setTargetMealType(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {MEAL_SLOTS.map(s => (
                      <option key={s} value={s}>{t(`slot${s}`, s)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('servingsLabel', 'Servings')}</label>
                  <input
                    type="number"
                    min="1"
                    autoComplete="off"
                    data-lpignore="true"
                    value={targetServings}
                    onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowMealModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveMealToBlueprint}
                  disabled={!targetDishTitle.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('confirmScheduleBtn', 'Confirm Schedule')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SAVED RECIPES PICKER */}
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
                {t('selectFromSavedRecipes', 'Select from Saved Recipes')}
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
                placeholder={t('searchRecipesPlaceholder', 'Search saved recipes...')}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar max-h-80">
              {filteredPickerRecipes.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-50">
                  {t('noRecipesFound', 'No recipes found.')}
                </div>
              ) : (
                filteredPickerRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      setSelectedRecipeForMeal(recipe);
                      setTargetDishTitle(recipe.title || recipe.name);
                      setTargetServings(Number(recipe.servings || 4));
                      setTargetCookingTime((recipe.prepTimeMinutes || 15) + (recipe.cookTimeMinutes || 25));
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

      {/* MODAL 4: APPLY TO CALENDAR (Autofill Safe Container) */}
      {showApplyModal && (
        <div 
          onClick={() => setShowApplyModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('applyModalTitle', 'Schedule Blueprint onto Calendar')}
              </h3>
              <button type="button" onClick={() => setShowApplyModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('applyStartDateLabel', 'Target Start Date')}</label>
                <input
                  type="date"
                  autoComplete="off"
                  data-lpignore="true"
                  value={applyStartDate}
                  onChange={(e) => setApplyStartDate(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="p-3 rounded-2xl border text-[11px] opacity-80" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                Scheduling {(activeTemplate?.meals || []).length} meals across {activeTemplate?.totalDays || 7} days starting on {applyStartDate}.
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyToCalendar}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('confirmApplyBtn', 'Confirm & Apply to Calendar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
