// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutTemplate, Plus, Search, Trash2, Edit3, X, 
  Calendar as CalendarIcon, ShoppingCart, Check, ChefHat, Clock, Sparkles,
  ChevronDown, Heart, SlidersHorizontal
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface TemplateDayMeal {
  id: string;
  recipeId?: string;
  recipeName: string;
  image?: string;
  mealType: string;
  time?: string;
}

interface TemplateDay {
  dayIndex: number;
  dayLabel: string;
  meals: TemplateDayMeal[];
}

interface MealPlanTemplate {
  id: string;
  userId?: string;
  createdBy?: string;
  title: string;
  description: string;
  days: TemplateDay[];
  createdAt: string;
}

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (str: string): Date => {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function TemplatesPage() {
  const { t, version } = useTranslation();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MealPlanTemplate | null>(null);

  // Create / Edit Template Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [modalDays, setModalDays] = useState<TemplateDay[]>([]);

  // Add / Edit Meal inside Template Sub-Modal State
  const [showMealSubModal, setShowMealSubModal] = useState(false);
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null);
  const [editingMealSubId, setEditingMealSubId] = useState<string | null>(null);
  const [subMealType, setSubMealType] = useState('Dinner');
  const [subMealTime, setSubMealTime] = useState('19:00');
  const [subSelectedRecipe, setSubSelectedRecipe] = useState<any | null>(null);

  // Recipe Picker Modal State
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('All Books');
  const [activeRecipeTagFilter, setActiveRecipeTagFilter] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Apply to Calendar Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyStartDate, setApplyStartDate] = useState<string>(() => formatDateKey(new Date()));

  // Dynamic Theme Synchronization
  const applyGlobalTheme = useCallback(() => {
    try {
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

  // Load saved recipes & books from PostgreSQL with localStorage fallback
  const loadSavedData = useCallback(async (user: User | null) => {
    if (typeof window === 'undefined') return;
    const activeUserId = user?.id || 'usr_admin_1';

    let liveRecipes: any[] = [];
    try {
      const rRes = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(activeUserId)}`, { cache: 'no-store' });
      if (rRes.ok) {
        const rData = await rRes.json();
        if (Array.isArray(rData.recipes)) liveRecipes = rData.recipes;
      }
    } catch (_) {}

    if (liveRecipes.length === 0) {
      try {
        const raw = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) liveRecipes = parsed;
        }
      } catch (_) {}
    }

    const uniqueRecipes: any[] = [];
    const seenIds = new Set();
    liveRecipes.forEach((rec: any) => {
      const id = rec.id || rec.title || rec.name;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        uniqueRecipes.push({
          id: rec.id || id,
          name: rec.title || rec.name || 'Untitled Recipe',
          title: rec.title || rec.name || 'Untitled Recipe',
          category: rec.tags?.[0] || rec.recipeType || rec.category || 'Main Dish',
          isFavorite: Boolean(rec.isFavorite || rec.is_favorite),
          bookId: rec.bookId || rec.book_id || null,
          image: rec.imageUrl || rec.image || rec.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
          imageUrl: rec.imageUrl || rec.image || rec.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
        });
      }
    });
    setSavedRecipes(uniqueRecipes);

    let liveBooks: any[] = [];
    try {
      const bRes = await fetch(`/api/books?userId=${encodeURIComponent(activeUserId)}`, { cache: 'no-store' });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData.books)) liveBooks = bData.books;
      }
    } catch (_) {}

    if (liveBooks.length === 0) {
      try {
        const rawBooks = localStorage.getItem('zecratary_recipe_books');
        if (rawBooks) {
          const parsedBooks = JSON.parse(rawBooks);
          if (Array.isArray(parsedBooks)) liveBooks = parsedBooks;
        }
      } catch (_) {}
    }
    setBooks(liveBooks);
  }, []);

  // Load templates strictly from PostgreSQL without resurrection loop
  const loadTemplates = useCallback(async (user: User | null) => {
    if (!user) return;
    const activeUserId = user.id || 'usr_admin_1';

    let loadedTemplates: MealPlanTemplate[] = [];
    let fetchSucceeded = false;

    try {
      const res = await fetch(`/api/templates?userId=${encodeURIComponent(activeUserId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.templates)) {
          loadedTemplates = data.templates;
          fetchSucceeded = true;
        }
      }
    } catch (_) {}

    const isInitialized = typeof window !== 'undefined' ? localStorage.getItem('zecratary_templates_initialized') === 'true' : false;

    if (!fetchSucceeded && typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('zecratary_meal_templates');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) loadedTemplates = parsed;
        }
      } catch (_) {}
    }

    if (!isInitialized && loadedTemplates.length === 0) {
      const starterTemplate: MealPlanTemplate = {
        id: 'tpl_1_' + (user ? user.id : 'default'),
        userId: user?.id,
        createdBy: user?.email,
        title: 'Weekly Schedule',
        description: 'Weekly schedule template with ready-to-plan recipes.',
        createdAt: new Date().toISOString(),
        days: [
          {
            dayIndex: 0,
            dayLabel: 'Monday',
            meals: [
              { 
                id: 'tm_1', 
                mealType: 'Dinner', 
                recipeName: 'Caesar Salad Recipe', 
                time: '19:00',
                image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80'
              }
            ]
          },
          {
            dayIndex: 2,
            dayLabel: 'Wednesday',
            meals: [
              { 
                id: 'tm_2', 
                mealType: 'Dinner', 
                recipeName: 'Authentic Pad Thai Recipe', 
                time: '19:30',
                image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'
              }
            ]
          },
          {
            dayIndex: 4,
            dayLabel: 'Friday',
            meals: [
              { 
                id: 'tm_3', 
                mealType: 'Dinner', 
                recipeName: 'Singapore Style Bak Kut Teh', 
                time: '20:00',
                image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
              }
            ]
          }
        ]
      };

      loadedTemplates = [starterTemplate];
      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_templates_initialized', 'true');
      }

      fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loadedTemplates)
      }).catch(() => {});
    } else if (typeof window !== 'undefined') {
      localStorage.setItem('zecratary_templates_initialized', 'true');
    }

    const userTemplates = user
      ? loadedTemplates.filter(t => !t.userId || t.userId === user.id || t.createdBy === user.email)
      : loadedTemplates;

    setTemplates(userTemplates);
    setSelectedTemplate(prev => {
      if (prev && userTemplates.some(t => t.id === prev.id)) {
        return userTemplates.find(t => t.id === prev.id) || null;
      }
      return userTemplates.length > 0 ? userTemplates[0] : null;
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_meal_templates', JSON.stringify(loadedTemplates));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    document.title = `${t('mealPlanTemplatesTitle') || 'Meal Plan Templates'} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadSavedData(user);
    loadTemplates(user);

    const handleSync = () => {
      const active = getCurrentUser();
      setCurrentUser(active);
      loadSavedData(active);
      loadTemplates(active);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_templates_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_templates_updated', handleSync);
    };
  }, [loadTemplates, loadSavedData, t, version]);

  const saveTemplatesList = async (updatedUserTemplates: MealPlanTemplate[]) => {
    setTemplates(updatedUserTemplates);

    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserTemplates)
      });
    } catch (e) {
      console.error('Failed to save templates to server', e);
    }

    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('zecratary_meal_templates');
        const allTemplates: MealPlanTemplate[] = local ? JSON.parse(local) : [];
        const otherUsersTemplates = currentUser
          ? allTemplates.filter(t => t.userId && t.userId !== currentUser.id && t.createdBy !== currentUser.email && !updatedUserTemplates.some(u => u.id === t.id))
          : [];
        const merged = [...updatedUserTemplates, ...otherUsersTemplates];
        localStorage.setItem('zecratary_meal_templates', JSON.stringify(merged));
        localStorage.setItem('zecratary_templates_initialized', 'true');
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_templates_updated'));
    }
  };

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setTemplateTitle('');
    setTemplateDescription('');
    setModalDays(
      DEFAULT_DAYS.map((dayLabel, dayIndex) => ({
        dayIndex,
        dayLabel,
        meals: []
      }))
    );
    setShowModal(true);
  };

  const openEditModal = (tpl: MealPlanTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateTitle(tpl.title);
    setTemplateDescription(tpl.description || '');

    const filledDays = DEFAULT_DAYS.map((dayLabel, dayIndex) => {
      const existing = tpl.days.find(d => d.dayIndex === dayIndex || d.dayLabel === dayLabel);
      return existing || { dayIndex, dayLabel, meals: [] };
    });

    setModalDays(filledDays);
    setShowModal(true);
  };

  const openAddMealSubModal = (dayIndex: number) => {
    setTargetDayIndex(dayIndex);
    setEditingMealSubId(null);
    setSubMealType('Dinner');
    setSubMealTime('19:00');
    setSubSelectedRecipe(null);
    setShowMealSubModal(true);
  };

  const openEditMealSubModal = (dayIndex: number, meal: TemplateDayMeal) => {
    setTargetDayIndex(dayIndex);
    setEditingMealSubId(meal.id);
    setSubMealType(meal.mealType || 'Dinner');
    setSubMealTime(meal.time || '19:00');

    const found = savedRecipes.find(r => r.id === meal.recipeId || r.name === meal.recipeName || r.title === meal.recipeName);
    setSubSelectedRecipe(found || {
      id: meal.recipeId || 'custom',
      name: meal.recipeName,
      title: meal.recipeName,
      image: meal.image,
      imageUrl: meal.image
    });

    setShowMealSubModal(true);
  };

  const handleSaveMealSubModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetDayIndex === null || !subSelectedRecipe) {
      alert(t('selectRecipeAlert') || 'Please select a recipe for this meal.');
      return;
    }

    const updatedDays = modalDays.map(d => {
      if (d.dayIndex === targetDayIndex) {
        if (editingMealSubId) {
          return {
            ...d,
            meals: d.meals.map(m => m.id === editingMealSubId ? {
              ...m,
              recipeId: subSelectedRecipe.id,
              recipeName: subSelectedRecipe.name || subSelectedRecipe.title,
              image: subSelectedRecipe.image || subSelectedRecipe.imageUrl,
              mealType: subMealType,
              time: subMealTime
            } : m)
          };
        } else {
          const newDayMeal: TemplateDayMeal = {
            id: 'tm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            recipeId: subSelectedRecipe.id,
            recipeName: subSelectedRecipe.name || subSelectedRecipe.title,
            image: subSelectedRecipe.image || subSelectedRecipe.imageUrl,
            mealType: subMealType,
            time: subMealTime
          };
          return {
            ...d,
            meals: [...d.meals, newDayMeal]
          };
        }
      }
      return d;
    });

    setModalDays(updatedDays);
    setShowMealSubModal(false);
    setEditingMealSubId(null);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim()) {
      alert(t('enterTemplateTitleAlert') || 'Please enter a template title.');
      return;
    }

    const cleanedDays = modalDays.filter(d => d.meals.length > 0);

    if (editingTemplateId) {
      const updated = templates.map(t => {
        if (t.id === editingTemplateId) {
          return {
            ...t,
            title: templateTitle.trim(),
            description: templateDescription.trim(),
            days: cleanedDays
          };
        }
        return t;
      });
      await saveTemplatesList(updated);
      setSelectedTemplate(updated.find(t => t.id === editingTemplateId) || null);
    } else {
      const newTemplate: MealPlanTemplate = {
        id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: currentUser?.id,
        createdBy: currentUser?.email,
        title: templateTitle.trim(),
        description: templateDescription.trim(),
        days: cleanedDays,
        createdAt: new Date().toISOString()
      };
      const updated = [newTemplate, ...templates];
      await saveTemplatesList(updated);
      setSelectedTemplate(newTemplate);
    }

    setShowModal(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t('confirmDeleteTemplatePrompt') || 'Are you sure you want to delete this template?')) return;

    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);

    if (selectedTemplate?.id === id) {
      setSelectedTemplate(updated.length > 0 ? updated[0] : null);
    }

    try {
      await fetch(`/api/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to delete template from database', e);
    }

    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('zecratary_meal_templates');
        const allTemplates: MealPlanTemplate[] = local ? JSON.parse(local) : [];
        const remaining = allTemplates.filter(t => t.id !== id);
        localStorage.setItem('zecratary_meal_templates', JSON.stringify(remaining));
        localStorage.setItem('zecratary_templates_initialized', 'true');
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_templates_updated'));
    }
  };

  const handleRemoveMealFromModalDay = (dayIndex: number, mealId: string) => {
    const updatedDays = modalDays.map(d => {
      if (d.dayIndex === dayIndex) {
        return {
          ...d,
          meals: d.meals.filter(m => m.id !== mealId)
        };
      }
      return d;
    });
    setModalDays(updatedDays);
  };

  const handleApplyTemplateToPlanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !applyStartDate) return;

    try {
      const start = parseDateKey(applyStartDate);
      const localPlan = localStorage.getItem('zecratary_meal_plan');
      const currentPlan = localPlan ? JSON.parse(localPlan) : [];

      const newPlannedMeals: any[] = [];

      selectedTemplate.days.forEach(templateDay => {
        const mealDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + templateDay.dayIndex);
        const dateStr = formatDateKey(mealDate);

        templateDay.meals.forEach(meal => {
          newPlannedMeals.push({
            id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            userId: currentUser?.id,
            createdBy: currentUser?.email,
            date: dateStr,
            recipeId: meal.recipeId,
            recipeName: meal.recipeName,
            image: meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
            mealType: meal.mealType || 'Dinner',
            time: meal.time || '19:00',
            isLeftover: false,
            notes: `Applied from template: ${selectedTemplate.title}`
          });
        });
      });

      localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, ...newPlannedMeals]));
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      window.dispatchEvent(new Event('zecratary_meal_plan_updated'));
      setShowApplyModal(false);

      const successMsg = (t('applyTemplateSuccessAlert') || 'Applied "{title}" starting from {date} to your Meal Planner!')
        .replace('{title}', selectedTemplate.title)
        .replace('{date}', applyStartDate);
      alert(successMsg);
      router.push('/planner');
    } catch (e) {
      console.error('Failed to apply template', e);
      alert(t('applyTemplateErrorAlert') || 'Failed to apply template. Please try again.');
    }
  };

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

  const filteredTemplates = templates.filter(tItem => 
    !search.trim() || tItem.title.toLowerCase().includes(search.toLowerCase().trim())
  );

  const startDateObj = applyStartDate ? parseDateKey(applyStartDate) : new Date();
  const endDateObj = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate() + 6);
  
  const todayKey = formatDateKey(new Date());
  const isStartToday = applyStartDate === todayKey;

  const startFormatted = isStartToday 
    ? `Today, ${startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : startDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const endFormatted = endDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const rangeDescriptionText = `Will fill ${startFormatted} — ${endFormatted}`;

  const translateDayLabel = (label: string) => {
    const l = label.toLowerCase();
    if (l === 'monday') return t('monday') || 'Monday';
    if (l === 'tuesday') return t('tuesday') || 'Tuesday';
    if (l === 'wednesday') return t('wednesday') || 'Wednesday';
    if (l === 'thursday') return t('thursday') || 'Thursday';
    if (l === 'friday') return t('friday') || 'Friday';
    if (l === 'saturday') return t('saturday') || 'Saturday';
    if (l === 'sunday') return t('sunday') || 'Sunday';
    return label;
  };

  const translateMealType = (mType: string) => {
    const mt = mType.toLowerCase();
    if (mt === 'breakfast') return t('breakfast') || 'Breakfast';
    if (mt === 'lunch') return t('lunch') || 'Lunch';
    if (mt === 'dinner') return t('dinner') || 'Dinner';
    if (mt === 'snack') return t('snack') || 'Snack';
    return mType;
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('mealPlanTemplatesTitle') || 'Meal Plan Templates'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {currentUser ? `${currentUser.name}'s templates: ` : ''}{t('templatesSubtitle') || 'Save reusable weekly meal blueprints and apply them to any calendar week in 1-click'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-lg cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
        >
          <Plus className="h-4 w-4" /> {t('createTemplateBtn') || 'Create Template'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Template List */}
        <div 
          className="border rounded-3xl p-5 space-y-4 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="relative">
            <Search 
              className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" 
              style={{ color: 'var(--color-emerald)' }}
            />
            <input
              type="text"
              placeholder={t('searchTemplatesPlaceholder') || 'Search templates by title...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('noTemplatesFound') || 'No templates found.'}
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const totalMeals = template.days.reduce((acc, d) => acc + d.meals.length, 0);
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className="p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xs"
                    style={isSelected ? {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <h3 className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                        {template.title}
                      </h3>
                      <p className="text-[11px] line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {template.description || (t('noDescriptionProvided') || 'No description')}
                      </p>
                      <span 
                        className="text-[10px] font-semibold block pt-0.5"
                        style={{ color: 'var(--color-emerald)' }}
                      >
                        {template.days.length} {t('activeDaysSuffix') || 'days'} • {totalMeals} {t('mealsSuffix') || 'meals'}
                      </span>
                    </div>
                    <LayoutTemplate 
                      className="h-5 w-5 shrink-0" 
                      style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} 
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Template Detail & Action View */}
        <div 
          className="lg:col-span-2 border rounded-3xl p-6 space-y-6 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          {selectedTemplate ? (
            <div className="space-y-6">
              <div 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>
                    {selectedTemplate.title}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedTemplate.description || (t('noDescriptionProvided') || 'No description')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setApplyStartDate(formatDateKey(new Date()));
                      setShowApplyModal(true);
                    }}
                    className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                  >
                    <CalendarIcon className="h-4 w-4" /> {t('applyToCalendarBtn') || 'Apply to Calendar'}
                  </button>
                  <button
                    onClick={() => openEditModal(selectedTemplate)}
                    className="p-2.5 rounded-xl border transition cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    title={t('editTemplateTooltip') || 'Edit Template'}
                  >
                    <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="p-2.5 rounded-xl border transition cursor-pointer hover:text-red-500 shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title={t('deleteTemplateTooltip') || 'Delete Template'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Template Days List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('weeklyScheduleBlueprint') || 'Weekly Schedule Blueprint'}
                </h3>

                {selectedTemplate.days.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>{t('noMealsConfigured') || 'No meals scheduled in this template.'}</p>
                ) : (
                  selectedTemplate.days.map((day) => (
                    <div 
                      key={day.dayIndex} 
                      className="border rounded-2xl p-4 space-y-3 transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div 
                        className="flex items-center justify-between border-b pb-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <span 
                          className="text-xs font-extrabold uppercase tracking-wide"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {translateDayLabel(day.dayLabel)}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                          {day.meals.length} {t('mealScheduledSuffix') || 'meal(s)'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {day.meals.map((meal) => (
                          <div 
                            key={meal.id} 
                            className="flex items-center justify-between p-3 rounded-xl border shadow-xs transition-colors duration-200"
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {meal.image && (
                                <img 
                                  src={meal.image} 
                                  alt={meal.recipeName} 
                                  className="w-10 h-10 rounded-lg object-cover border shrink-0" 
                                  style={{ borderColor: 'var(--color-border)' }}
                                />
                              )}
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
                                  {meal.recipeName}
                                </span>
                                <span 
                                  className="text-[10px] font-semibold uppercase"
                                  style={{ color: 'var(--color-emerald)' }}
                                >
                                  {translateMealType(meal.mealType)}
                                </span>
                              </div>
                            </div>
                            {meal.time && (
                              <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                                <Clock className="h-3 w-3" /> {meal.time}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center space-y-3">
              <ChefHat className="h-12 w-12 mx-auto" style={{ color: 'var(--color-text-secondary)' }} />
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {t('noTemplateSelected') || 'No Template Selected'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('noTemplateSelectedDesc') || 'Select a meal plan template from the list on the left to view, edit, or apply it to your calendar.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 1. CREATE / EDIT TEMPLATE MODAL */}
      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default text-xs animate-in fade-in transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <LayoutTemplate className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> 
              {editingTemplateId ? (t('editMealTemplateTitle') || 'Edit Meal Template') : (t('createMealTemplateTitle') || 'Create Meal Template')}
            </h2>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('templateTitleLabel') || 'Template Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('templateTitlePlaceholder') || 'e.g. Clean Eating Week'}
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition"
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
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('templateDescLabel') || 'Description'}
                </label>
                <input
                  type="text"
                  placeholder={t('templateDescPlaceholder') || 'e.g. Healthy macro-balanced meals for high energy'}
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Days Meal Config */}
              <div className="space-y-3 pt-2">
                <label 
                  className="block text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('configureDaysMeals') || 'Configure Days & Scheduled Meals'}
                </label>

                {modalDays.map((d) => (
                  <div 
                    key={d.dayIndex} 
                    className="border rounded-2xl p-3.5 space-y-2.5 transition-colors duration-200"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                        {translateDayLabel(d.dayLabel)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openAddMealSubModal(d.dayIndex)}
                        className="font-bold text-xs flex items-center gap-1 cursor-pointer"
                        style={{ color: 'var(--color-emerald)' }}
                      >
                        <Plus className="h-3.5 w-3.5" /> {t('addMealBtn') || 'Add Meal'}
                      </button>
                    </div>

                    {d.meals.length === 0 ? (
                      <p className="text-[11px] italic" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('noMealsScheduled') || 'No meals scheduled for this day'}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {d.meals.map((m) => (
                          <div 
                            key={m.id} 
                            className="flex items-center justify-between p-2.5 rounded-xl border gap-2 shadow-xs transition-colors duration-200"
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {m.image && (
                                <img 
                                  src={m.image} 
                                  alt={m.recipeName} 
                                  className="w-7 h-7 rounded-md object-cover border shrink-0" 
                                  style={{ borderColor: 'var(--color-border)' }}
                                />
                              )}
                              <span className="font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                {m.recipeName}
                              </span>
                              <span 
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  color: 'var(--color-emerald)'
                                }}
                              >
                                {translateMealType(m.mealType)}
                              </span>
                              {m.time && <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>⏰ {m.time}</span>}
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditMealSubModal(d.dayIndex, m)}
                                className="p-1.5 rounded-lg border transition cursor-pointer shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)'
                                }}
                                title="Edit meal"
                              >
                                <Edit3 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMealFromModalDay(d.dayIndex, m.id)}
                                className="p-1.5 rounded-lg border transition cursor-pointer hover:text-red-500 shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)'
                                }}
                                title="Remove meal"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {t('saveTemplateBtn') || 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD / EDIT MEAL SUB-MODAL */}
      {showMealSubModal && targetDayIndex !== null && (
        <div 
          onClick={() => setShowMealSubModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 cursor-pointer"
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
              onClick={() => setShowMealSubModal(false)} 
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
                className="text-lg font-black tracking-tight flex items-center gap-1.5"
                style={{ color: 'var(--color-primary)' }}
              >
                <Edit3 className="h-4 w-4" />
                {editingMealSubId ? (t('editMealTitle') || 'Edit Meal') : (t('addMealTitle') || 'Add Meal')} for {translateDayLabel(DEFAULT_DAYS[targetDayIndex])}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('selectRecipeModalSub') || 'Choose from your saved recipe library'}
              </p>
            </div>

            <form onSubmit={handleSaveMealSubModal} className="space-y-3.5 pt-1">
              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('mealTypeLabel') || 'Meal Type'}
                </label>
                <div className="relative">
                  <select
                    value={subMealType}
                    onChange={(e) => setSubMealType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 text-xs outline-none appearance-none cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="Breakfast" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('breakfast') || 'Breakfast'}</option>
                    <option value="Lunch" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('lunch') || 'Lunch'}</option>
                    <option value="Dinner" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('dinner') || 'Dinner'}</option>
                    <option value="Snack" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('snack') || 'Snack'}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('timeLabel') || 'Time'}
                </label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 absolute left-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="time"
                    value={subMealTime}
                    onChange={(e) => setSubMealTime(e.target.value)}
                    className="w-full border rounded-lg pl-9 pr-9 py-2 text-xs outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <Clock 
                    className="h-4 w-4 absolute right-3 pointer-events-none" 
                    style={{ color: 'var(--color-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('recipeLabel') || 'Recipe'}
                </label>
                {subSelectedRecipe ? (
                  <div 
                    className="flex items-center justify-between p-2.5 border rounded-lg shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={subSelectedRecipe.image || subSelectedRecipe.imageUrl} 
                        alt={subSelectedRecipe.name || subSelectedRecipe.title}
                        className="w-8 h-8 rounded-md object-cover border shrink-0" 
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <span className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                        {subSelectedRecipe.name || subSelectedRecipe.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowRecipePickerModal(true)}
                      className="text-[11px] hover:underline font-bold shrink-0 ml-2 cursor-pointer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {t('changeBtn') || 'Change'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRecipePickerModal(true)}
                    className="w-full border rounded-lg py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('selectRecipeBtn') || 'Select Recipe'}
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowMealSubModal(false)}
                  className="px-5 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {editingMealSubId ? (t('saveChanges') || 'Save Changes') : (t('addMealBtn') || 'Add Meal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SELECT RECIPE PICKER MODAL */}
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
                  {t('selectRecipeModalTitle') || 'Select a Recipe'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('selectRecipeModalSub') || 'Choose from your saved recipe library'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                    <input
                      type="text"
                      placeholder={t('searchByNamePlaceholder') || 'Search recipes by name...'}
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
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
                      <option value="All Books" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('allBooksOption') || 'All Books'}</option>
                      {userFilteredBooks.map((b) => (
                        <option key={b.id} value={b.id} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{b.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className="border font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('filterBtn') || 'Filter'}
                  </button>
                </div>

                {showFilterOptions && (
                  <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                    {[
                      { key: 'All', label: 'All' },
                      { key: 'Favorites', label: t('favoritesTag') || 'Favorites' },
                      { key: 'Main Dish', label: t('mainDishTag') || 'Main Dish' },
                      { key: 'Imported', label: t('importedTag') || 'Imported' }
                    ].map((tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() => setActiveRecipeTagFilter(tag.key)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shadow-xs"
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
                    {t('noRecipesMatchCriteria') || 'No recipes match your criteria.'}
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
                            setSubSelectedRecipe(rec);
                            setShowRecipePickerModal(false);
                          }}
                          className="px-4 py-1.5 border font-bold text-xs rounded-xl transition shrink-0 ml-2 cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-primary)'
                          }}
                        >
                          {t('selectBtn') || 'Select'}
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
              {t('showing') || 'Showing'} {filteredPickerRecipes.length} {t('of') || 'of'} {savedRecipes.length} {t('resultsSuffix') || 'results'}
            </div>
          </div>
        </div>
      )}

      {/* 4. APPLY TEMPLATE MODAL */}
      {showApplyModal && selectedTemplate && (
        <div 
          onClick={() => setShowApplyModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 cursor-pointer"
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
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-6 space-y-1">
              <h2 
                className="text-xl font-black tracking-tight"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('applyTemplateModalTitle') || 'Apply Template to Plan'}
              </h2>
              <p className="text-xs leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                {t('applyTemplateModalSub') || 'Choose a start date. The template meals will be scheduled into your Meal Planner starting on that date.'}
              </p>
            </div>

            <form onSubmit={handleApplyTemplateToPlanner} className="space-y-4 pt-1">
              <div 
                className="w-full border rounded-xl px-3.5 py-3 text-xs font-bold flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-primary)'
                }}
              >
                <CalendarIcon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <span>{selectedTemplate.title}</span>
              </div>

              <div className="space-y-1.5">
                <label 
                  className="block text-xs font-bold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('startDateLabel') || 'Start Date (Day 1)'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="w-full border-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-text)',
                      colorScheme: isDayMode ? 'light' : 'dark'
                    }}
                  />
                  <CalendarIcon 
                    className="h-4 w-4 absolute right-3.5 pointer-events-none" 
                    style={{ color: 'var(--color-primary)' }}
                  />
                </div>
                <p className="text-[11px] pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {rangeDescriptionText}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="w-full py-2.5 px-4 border transition cursor-pointer font-bold text-xs rounded-xl shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {t('applyBtn') || 'Apply to Planner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
