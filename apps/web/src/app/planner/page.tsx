'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Heart, SlidersHorizontal, ChevronDown, 
  ChevronUp, Edit3, Check, CheckSquare
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

// Timezone-safe calendar date formatting helpers
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

export default function PlannerPage() {
  const { t, locale, version } = useTranslation();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Dynamic system dates
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Main Add Meal Modal State
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState<string>(() => formatDateKey(new Date()));
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  // Copy Day Dropdown State
  const [activeCopyDropdownDate, setActiveCopyDropdownDate] = useState<string | null>(null);
  const [copyCustomDate, setCopyCustomDate] = useState('');

  // Edit Meal Modal State
  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editRecipeObj, setEditRecipeObj] = useState<any | null>(null);
  const [editDate, setEditDate] = useState<string>(() => formatDateKey(new Date()));
  const [editMealType, setEditMealType] = useState('Dinner');
  const [editMealTime, setEditMealTime] = useState('');
  const [editIsLeftover, setEditIsLeftover] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // "Select Recipe" Sub-Modal State
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'add' | 'edit'>('add');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('All Books');
  const [activeRecipeTagFilter, setActiveRecipeTagFilter] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // "Select Recipes for Shopping List" Modal State
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [selectedMealIdsForShopping, setSelectedMealIdsForShopping] = useState<string[]>([]);
  const [expandedDayCards, setExpandedDayCards] = useState<{ [key: string]: boolean }>({});

  // Dynamic Theme Synchronization & Color Inversion
  const applyGlobalTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      const c = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-card', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', c.innerDark || c.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', c.borderColor || c.cardBorder || '#1e293b');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', c.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', c.textSecondary || '#94a3b8');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }
    } catch (e) {}
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
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applyGlobalTheme]);

  const loadSavedData = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const userSpecific = user 
            ? parsed.filter((r: any) => !r.userId || r.userId === user.id || r.createdBy === user.email)
            : parsed;

          const uniqueRecipes: any[] = [];
          const seenIds = new Set();

          userSpecific.forEach((rec: any) => {
            const id = rec.id || rec.title || rec.name;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              uniqueRecipes.push({
                id: rec.id || id,
                name: rec.title || rec.name || 'Untitled Recipe',
                title: rec.title || rec.name || 'Untitled Recipe',
                category: rec.tags?.[0] || rec.recipeType || rec.category || 'Main Dish',
                isFavorite: Boolean(rec.isFavorite),
                bookId: rec.bookId || null,
                ingredients: rec.ingredients || [],
                image: rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
                imageUrl: rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
              });
            }
          });

          setSavedRecipes(uniqueRecipes);
        }
      }

      const rawBooks = localStorage.getItem('zecratary_recipe_books');
      if (rawBooks) {
        const parsedBooks = JSON.parse(rawBooks);
        if (Array.isArray(parsedBooks)) {
          const userBooks = user 
            ? parsedBooks.filter((b: any) => !b.userId || b.userId === user.id || b.createdBy === user.email)
            : parsedBooks;
          setBooks(userBooks);
        }
      } else {
        const defaultBooks = [
          { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', userId: user?.id, createdBy: user?.email },
          { id: 'book_2', title: 'Authentic Asian Cuisine', userId: user?.id, createdBy: user?.email },
          { id: 'book_3', title: 'Baking & Desserts', userId: user?.id, createdBy: user?.email }
        ];
        setBooks(defaultBooks);
      }
    } catch (e) {
      console.error('Failed to load saved data in planner', e);
    }
  }, []);

  const loadMealPlan = useCallback((user: User | null) => {
    if (typeof window === 'undefined') return;
    try {
      const localPlan = localStorage.getItem('zecratary_meal_plan');
      if (localPlan) {
        const parsed = JSON.parse(localPlan);
        if (Array.isArray(parsed)) {
          const userPlans = user 
            ? parsed.filter((m: any) => !m.userId || m.userId === user.id || m.createdBy === user.email)
            : parsed;
          setPlannedMeals(userPlans);
          return;
        }
      }

      const systemToday = formatDateKey(new Date());
      const defaultPlan = [
        {
          id: 'p_1_' + (user ? user.id : 'default'),
          userId: user?.id,
          createdBy: user?.email,
          date: systemToday,
          recipeName: 'Caesar Salad Recipe',
          image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00',
          isLeftover: false,
          notes: ''
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
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

    const handleSync = () => {
      const active = getCurrentUser();
      setCurrentUser(active);
      loadSavedData(active);
      loadMealPlan(active);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadSavedData, loadMealPlan, t, locale, version]);

  const savePlan = (updatedUserMeals: any[]) => {
    try {
      const localPlan = localStorage.getItem('zecratary_meal_plan');
      const allMeals: any[] = localPlan ? JSON.parse(localPlan) : [];

      const otherUserMeals = currentUser 
        ? allMeals.filter((m: any) => m.userId && m.userId !== currentUser.id && m.createdBy !== currentUser.email)
        : [];

      const merged = [...updatedUserMeals, ...otherUserMeals];
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(merged));
      setPlannedMeals(updatedUserMeals);
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      window.dispatchEvent(new Event('zecratary_meal_plan_updated'));
      window.dispatchEvent(new Event('storage'));
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
    const days = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];
    return days[day];
  };

  const translateShortDayOfWeek = (d: Date) => {
    const day = d.getDay();
    const shortDays = [t('sunShort'), t('monShort'), t('tueShort'), t('wedShort'), t('thuShort'), t('friShort'), t('satShort')];
    return shortDays[day] || d.toLocaleDateString(getLocaleTag(locale), { weekday: 'short' });
  };

  const translateMealType = (mt: string) => {
    const m = (mt || '').toLowerCase();
    if (m === 'breakfast') return t('breakfast');
    if (m === 'lunch') return t('lunch');
    if (m === 'dinner') return t('dinner');
    if (m === 'snack') return t('snack');
    return mt;
  };

  // 3-Day Sequential Display Feed (Selected Day + Next 2 Days)
  const displayDays = [0, 1, 2].map((offset) => {
    const base = parseDateKey(selectedDate);
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    const dateStr = formatDateKey(d);
    const isToday = dateStr === todayStr;
    const isTomorrow = dateStr === tomorrowStr;
    const titleDate = `${translateDayOfWeek(d)}, ${d.toLocaleDateString(getLocaleTag(locale), { month: 'long', day: 'numeric' })}`;
    const dayMeals = plannedMeals.filter(m => m.date === dateStr);
    return { dateStr, titleDate, isToday, isTomorrow, dayMeals };
  });

  const handleClearCurrentPageMeals = () => {
    const pageDateSet = new Set(displayDays.map(d => d.dateStr));
    const mealsOnCurrentPage = plannedMeals.filter(m => pageDateSet.has(m.date));

    if (mealsOnCurrentPage.length === 0) {
      alert(t('noMealsOnPageToClearAlert'));
      return;
    }

    if (window.confirm(t('confirmClearMealsOnPage').replace('{count}', String(mealsOnCurrentPage.length)))) {
      const updated = plannedMeals.filter(m => !pageDateSet.has(m.date));
      savePlan(updated);
    }
  };

  const openAddModal = (date: string) => {
    loadSavedData(currentUser);
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
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
    const sourceDayMeals = plannedMeals.filter(m => m.date === sourceDateStr);
    if (sourceDayMeals.length === 0) {
      alert(t('noMealsToCopyAlert'));
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
    alert(t('copiedMealsSuccessAlert').replace('{count}', String(sourceDayMeals.length)).replace('{target}', targetFormatted));
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

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeObj) {
      alert(t('pleaseSelectRecipeAlert'));
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
      isLeftover: isLeftover,
      notes: notes
    };
    savePlan([...plannedMeals, newMeal]);
    setShowAddMealModal(false);
  };

  const handleEditMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
    if (showEditMealModal && editingMealId === id) {
      setShowEditMealModal(false);
    }
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

  const handleGenerateShoppingList = () => {
    const selectedMeals = plannedMeals.filter(m => selectedMealIdsForShopping.includes(m.id));
    if (selectedMeals.length === 0) {
      alert(t('selectAtLeastOneRecipeAlert'));
      return;
    }

    const localList = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const currentItems = localList ? JSON.parse(localList) : [];
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
    window.dispatchEvent(new Event('zecratary_shopping_updated'));
    setShowShoppingListModal(false);
    router.push('/shopping');
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
    const dateStr = formatDateKey(d);
    const dayName = translateShortDayOfWeek(d);
    const dayNum = d.getDate();
    weekDays.push({ dateStr, dayName, dayNum, fullDate: d });
  }

  const endDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString(getLocaleTag(locale), { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(getLocaleTag(locale), { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeDateObj = parseDateKey(activeDateForAdd);
  const activeDateFormattedHeader = `${translateDayOfWeek(activeDateObj)}, ${activeDateObj.toLocaleDateString(getLocaleTag(locale), { month: 'long', day: 'numeric' })}`;
  const activeDateFieldText = `${translateDayOfWeek(activeDateObj)}, ${activeDateObj.toLocaleDateString(getLocaleTag(locale), { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const datesWithMeals = Array.from(new Set(plannedMeals.map(m => m.date))).sort();
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
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 suppressHydrationWarning className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('plannerTitle', 'Planner')}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {currentUser ? `${t('planningForPrefix')} ${currentUser.name}` : t('plannerSubtitle')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => alert(t('planWeekActivatedAlert'))}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <CalendarIcon className="h-4 w-4" /> {t('planWeekBtn')}
          </button>
          <button 
            onClick={() => alert(t('weekCopiedAlert'))}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <Copy className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('copyWeekBtn')}
          </button>
          <button
            type="button"
            onClick={openShoppingListSelectModal}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <ShoppingBag className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('shoppingListBtn')}
          </button>
          <button 
            onClick={() => alert(t('shareCopiedAlert'))}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <Share2 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('shareBtn')}
          </button>
          <button 
            type="button"
            onClick={handleClearCurrentPageMeals}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer hover:border-red-500/50 hover:text-red-400 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#dc2626' : '#cbd5e1'
            }}
            title={t('clearAllMealTooltip')}
          >
            <Trash2 className="h-4 w-4 text-red-500" /> {t('clearAllMealBtn')}
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="p-2 border rounded-xl transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: 'var(--color-primary, #E05638)'
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span 
            className="text-base font-extrabold tracking-wide"
            style={{ color: 'var(--color-primary, #E05638)' }}
          >
            {rangeStr}
          </span>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const next = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 7);
                setCurrentWeekStart(next);
              }}
              className="p-2 border rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: 'var(--color-primary, #E05638)'
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentWeekStart(getMondayOfWeek(now));
                setSelectedDate(formatDateKey(now));
              }}
              className="px-3.5 py-2 border font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: 'var(--color-primary, #E05638)'
              }}
            >
              {t('todayBtn')}
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
                onClick={() => {
                  setSelectedDate(d.dateStr);
                  setActiveCopyDropdownDate(null);
                }}
                className="p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-center shadow-xs"
                style={isToday ? {
                  backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.12)',
                  borderColor: 'var(--color-primary, #E05638)'
                } : isSelected ? {
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                  borderColor: 'var(--color-emerald, #10b981)',
                  boxShadow: isDayMode ? '0 2px 8px rgba(16, 185, 129, 0.2)' : undefined
                } : {
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                }}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {d.dayName}
                </span>
                <span 
                  className="text-xl font-black mt-1"
                  style={{ color: isToday ? 'var(--color-primary, #E05638)' : (isDayMode ? '#0f172a' : '#ffffff') }}
                >
                  {d.dayNum}
                </span>
                {isToday && (
                  <span 
                    className="text-[9px] font-bold uppercase mt-0.5"
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  >
                    {t('todayBtn')}
                  </span>
                )}
                {hasMeals && !isToday && (
                  <div 
                    className="w-1.5 h-1.5 rounded-full mt-1"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Average Banner */}
      <div 
        className="border rounded-2xl p-5 relative overflow-hidden shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #070b13)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-extrabold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            <span className="text-lg">🔥</span> {t('dailyAverage')}
          </div>
          <button 
            className="flex items-center gap-1.5 border font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#fff7ed' : 'rgba(224, 86, 56, 0.1)',
              borderColor: isDayMode ? '#fdba74' : 'var(--color-border, #1e293b)',
              color: 'var(--color-primary, #E05638)'
            }}
          >
            <Lock className="h-3.5 w-3.5" /> {t('upgrade')}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('calories')}</span>
            <span className="text-xl font-black blur-[4px]" style={{ color: isDayMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.4)' }}>1,234</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('protein')}</span>
            <span className="text-xl font-black blur-[4px]" style={{ color: isDayMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.4)' }}>120g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('carbs')}</span>
            <span className="text-xl font-black blur-[4px]" style={{ color: isDayMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.4)' }}>150g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('fat')}</span>
            <span className="text-xl font-black blur-[4px]" style={{ color: isDayMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.4)' }}>45g</span>
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
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              {/* Day Header Row */}
              <div 
                className="flex items-center justify-between border-b pb-4"
                style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-extrabold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{day.titleDate}</h2>
                  
                  {day.isToday && (
                    <span 
                      className="text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm"
                      style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                    >
                      {t('todayBadge')}
                    </span>
                  )}
                  {day.isTomorrow && !day.isToday && (
                    <span 
                      className="border text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)',
                        borderColor: 'var(--color-primary, #E05638)',
                        color: 'var(--color-primary, #E05638)'
                      }}
                    >
                      {t('tomorrowBadge')}
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
                        className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        style={{
                          backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-card, #0b0e14)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#0f172a' : '#cbd5e1'
                        }}
                      >
                        <Copy className="h-4 w-4" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} /> {t('copyDayBtn')}
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
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0e14)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#0f172a' : '#ffffff'
                            }}
                          >
                            <h4 className="font-bold text-xs px-1" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('copyDayToTitle')}</h4>
                            
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyTomorrow(day.dateStr)}
                                className="w-full text-left font-bold px-3 py-2 rounded-xl border transition cursor-pointer"
                                style={{
                                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                                }}
                              >
                                {t('copyTomorrowOption')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyNextWeek(day.dateStr)}
                                className="w-full text-left font-bold px-3 py-2 rounded-xl border transition cursor-pointer"
                                style={{
                                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                                }}
                              >
                                {t('copyNextWeekOption')}
                              </button>
                            </div>

                            <div 
                              className="pt-2 border-t space-y-1.5 px-1"
                              style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
                            >
                              <span className="block text-[11px] font-semibold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('pickADateLabel')}</span>
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
                                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                                }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                                onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => openAddModal(day.dateStr)}
                    className="border font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-card, #0b0e14)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                  >
                    <Plus className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('addMealBtn')}
                  </button>
                </div>
              </div>

              {/* Day Meals Content */}
              {!hasMealsInDay ? (
                <div className="py-16 text-center space-y-4">
                  <div 
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto shadow-xs"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: 'var(--color-emerald, #10b981)',
                      color: 'var(--color-emerald, #10b981)'
                    }}
                  >
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('nothingPlannedYet')}</p>
                  <button
                    onClick={() => openAddModal(day.dateStr)}
                    className="inline-flex items-center gap-2 border font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1117)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('addAMealBtn')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {day.dayMeals.map((meal) => (
                    <div 
                      key={meal.id} 
                      className="border rounded-2xl p-4 flex items-center justify-between shadow-xs gap-4 transition-colors duration-200"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-card, #0b0e14)',
                        borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img 
                          src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                          alt={meal.recipeName}
                          className="w-14 h-14 rounded-xl object-cover border shadow-xs shrink-0" 
                          style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                              style={{
                                backgroundColor: isDayMode ? '#e2e8f0' : 'var(--color-inner-dark, #172033)',
                                color: isDayMode ? '#334155' : '#cbd5e1'
                              }}
                            >
                              {translateMealType(meal.mealType)}
                            </span>
                            {meal.isLeftover && (
                              <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {t('leftoverBadge')}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold leading-snug truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                            {meal.recipeName}
                          </h3>
                          {meal.time && <span className="text-[11px] flex items-center gap-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>⏰ {meal.time}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(meal)}
                          className="p-2.5 rounded-xl border shadow-xs cursor-pointer transition"
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #172033)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#cbd5e1'
                          }}
                          title={t('editPlannedMealTooltip')}
                        >
                          <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="p-2.5 rounded-xl border shadow-xs cursor-pointer transition hover:text-red-500"
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #172033)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#64748b' : '#94a3b8'
                          }}
                          title={t('deleteMealTooltip')}
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-7 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0e14)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowShoppingListModal(false)} 
              className="absolute top-5 right-5 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1.5 pr-8">
              <h2 
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {t('selectRecipesShoppingTitle')}
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('selectRecipesShoppingSub')}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-1 text-xs">
              {datesWithMeals.length === 0 ? (
                <div 
                  className="py-12 text-center text-xs rounded-2xl border"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#64748b' : '#94a3b8'
                  }}
                >
                  {t('noMealsInPlanNotice')}
                </div>
              ) : (
                datesWithMeals.map((dateStr) => {
                  const dayMeals = plannedMeals.filter(m => m.date === dateStr);
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
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0c0d11)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-primary, #E05638)'
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
                              backgroundColor: 'var(--color-primary, #E05638)',
                              color: '#ffffff'
                            } : {
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)'
                            }}
                          >
                            {isAllDaySelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            {isPartiallySelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>

                          <div>
                            <h3 
                              className="text-sm font-bold"
                              style={{ color: 'var(--color-primary, #E05638)' }}
                            >
                              {formattedDayTitle}
                            </h3>
                            <span className="text-xs font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                              {selectedCount}/{dayMeals.length} {t('selectedCountSuffix')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDayCards({ ...expandedDayCards, [dateStr]: !isExpanded });
                          }}
                          className="p-1 hover:text-white transition cursor-pointer"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div 
                          className="px-4 pb-3 pt-1 space-y-2 border-t"
                          style={{
                            backgroundColor: isDayMode ? '#f1f5f9' : 'rgba(7, 9, 14, 0.6)',
                            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
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
                                  backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)',
                                  borderColor: 'var(--color-primary, #E05638)'
                                } : {
                                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0e14)',
                                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div 
                                    className="w-4 h-4 rounded border flex items-center justify-center transition shrink-0"
                                    style={isMealSelected ? {
                                      backgroundColor: 'var(--color-primary, #E05638)',
                                      borderColor: 'var(--color-primary, #E05638)',
                                      color: '#ffffff'
                                    } : {
                                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-card, #111726)'
                                    }}
                                  >
                                    {isMealSelected && <Check className="h-3 w-3" />}
                                  </div>

                                  <img 
                                    src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                                    alt={meal.recipeName}
                                    className="w-8 h-8 rounded-lg object-cover border shrink-0"
                                    style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                                  />

                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{meal.recipeName}</h4>
                                    <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{translateMealType(meal.mealType)}</span>
                                  </div>
                                </div>

                                {meal.isLeftover && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                    {t('leftoverBadge')}
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

            <div className="grid grid-cols-2 gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <button
                type="button"
                onClick={() => setShowShoppingListModal(false)}
                className="py-3 px-4 border font-bold rounded-2xl text-xs transition cursor-pointer"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #07090e)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#475569' : '#cbd5e1'
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerateShoppingList}
                className="py-3 px-4 text-white font-bold rounded-2xl text-xs transition shadow-lg cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
              >
                {t('generateListBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN ADD MEAL MODAL */}
      {showAddMealModal && (
        <div 
          onClick={() => setShowAddMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0e14)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-lg font-black tracking-tight"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {t('addMealForDateTitle').replace('{date}', activeDateFormattedHeader)}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('addMealModalSub')}
              </p>
            </div>

            <form onSubmit={handleAddMealSubmit} className="space-y-3.5 pt-1">
              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('dateLabel')}
                </label>
                <div 
                  className="w-full border-2 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-primary, #E05638)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
                  }}
                >
                  {activeDateFieldText}
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('mealTypeLabel')}
                </label>
                <div className="relative">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                  >
                    <option value="Breakfast" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('breakfast')}</option>
                    <option value="Lunch" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('lunch')}</option>
                    <option value="Dinner" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('dinner')}</option>
                    <option value="Snack" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('snack')}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('timeLabel')}
                </label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 absolute left-3 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full border rounded-lg pl-9 pr-9 py-2 text-xs outline-none"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                    placeholder="--:--"
                  />
                  <Clock 
                    className="h-4 w-4 absolute right-3 pointer-events-none" 
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('recipeLabel')}
                </label>
                {selectedRecipeObj ? (
                  <div 
                    className="flex items-center justify-between p-2.5 border rounded-lg"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image || selectedRecipeObj.imageUrl} 
                        alt={selectedRecipeObj.name || selectedRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border shrink-0" 
                        style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                      />
                      <span className="font-bold text-xs truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
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
                      style={{ color: 'var(--color-primary, #E05638)' }}
                    >
                      {t('changeBtn')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('add');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full border rounded-lg py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('selectRecipeBtn')}
                  </button>
                )}
              </div>

              <div 
                className="border rounded-xl p-3 flex items-center justify-between"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                }}
              >
                <div>
                  <div 
                    className="text-xs font-bold"
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  >
                    {t('leftoverLabel')}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('leftoverHelpText')}
                  </p>
                </div>
                
                <div 
                  onClick={() => setIsLeftover(!isLeftover)}
                  className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3"
                  style={{ backgroundColor: isLeftover ? 'var(--color-primary, #E05638)' : (isDayMode ? '#cbd5e1' : '#1e293b') }}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    isLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('notesLabel')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                  className="w-full border rounded-lg p-3 text-xs outline-none resize-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: 'var(--color-primary, #E05638)'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  {t('addToCalendarBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT MEAL MODAL */}
      {showEditMealModal && (
        <div 
          onClick={() => setShowEditMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0e14)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowEditMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-md transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-lg font-black tracking-tight flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('editPlannedMealTitle')}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('editPlannedMealSub')}
              </p>
            </div>

            <form onSubmit={handleEditMealSubmit} className="space-y-3.5 pt-1">
              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('dateLabel')}
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('mealTypeLabel')}
                </label>
                <div className="relative">
                  <select
                    value={editMealType}
                    onChange={(e) => setEditMealType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                  >
                    <option value="Breakfast" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('breakfast')}</option>
                    <option value="Lunch" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('lunch')}</option>
                    <option value="Dinner" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('dinner')}</option>
                    <option value="Snack" style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('snack')}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('timeLabel')}
                </label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 absolute left-3 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  <input
                    type="time"
                    value={editMealTime}
                    onChange={(e) => setEditMealTime(e.target.value)}
                    className="w-full border rounded-lg pl-9 pr-9 py-2 text-xs outline-none"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                  />
                  <Clock 
                    className="h-4 w-4 absolute right-3 pointer-events-none" 
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('recipeLabel')}
                </label>
                {editRecipeObj ? (
                  <div 
                    className="flex items-center justify-between p-2.5 border rounded-lg"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={editRecipeObj.image || editRecipeObj.imageUrl} 
                        alt={editRecipeObj.name || editRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border shrink-0" 
                        style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                      />
                      <span className="font-bold text-xs truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
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
                      style={{ color: 'var(--color-primary, #E05638)' }}
                    >
                      {t('changeBtn')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('edit');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full border rounded-lg py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t('selectRecipeBtn')}
                  </button>
                )}
              </div>

              <div 
                className="border rounded-xl p-3 flex items-center justify-between"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                }}
              >
                <div>
                  <div 
                    className="text-xs font-bold"
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  >
                    {t('leftoverLabel')}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('leftoverHelpText')}
                  </p>
                </div>
                
                <div 
                  onClick={() => setEditIsLeftover(!editIsLeftover)}
                  className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3"
                  style={{ backgroundColor: editIsLeftover ? 'var(--color-primary, #E05638)' : (isDayMode ? '#cbd5e1' : '#1e293b') }}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    editIsLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('notesLabel')}
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                  className="w-full border rounded-lg p-3 text-xs outline-none resize-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingMealId && confirm(t('confirmDeleteMealAlert'))) {
                      handleDeleteMeal(editingMealId);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-500 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer hover:bg-red-50"
                  style={{ backgroundColor: isDayMode ? '#fef2f2' : 'transparent' }}
                >
                  <Trash2 className="h-4 w-4" /> {t('delete')}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditMealModal(false)}
                    className="px-4 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                  >
                    {t('saveChanges')}
                  </button>
                </div>
              </div>
            </form>
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
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a0c10)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <div className="space-y-4">
              <button 
                onClick={() => setShowRecipePickerModal(false)} 
                className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                }}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-0.5 pr-8">
                <h2 
                  className="text-lg font-black tracking-tight"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('selectRecipeModalTitle')}
                </h2>
                <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {t('pickerSubMealPlan')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder={t('searchByNamePlaceholder')}
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-primary, #E05638)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedBookFilter}
                      onChange={(e) => setSelectedBookFilter(e.target.value)}
                      className="border font-bold text-xs rounded-xl pl-3 pr-7 py-2 outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: 'var(--color-primary, #E05638)'
                      }}
                    >
                      <option value="All Books" style={{ backgroundColor: isDayMode ? '#ffffff' : '#07090e', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('allBooksOption')}</option>
                      {userFilteredBooks.map((b) => (
                        <option key={b.id} value={b.id} style={{ backgroundColor: isDayMode ? '#ffffff' : '#07090e', color: isDayMode ? '#0f172a' : '#ffffff' }}>{b.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-2.5 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className="border font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('filterBtn')}
                  </button>
                </div>

                {showFilterOptions && (
                  <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                    {[
                      { key: 'All', label: t('allTag') },
                      { key: 'Favorites', label: t('favoritesTag') },
                      { key: 'Main Dish', label: t('mainDishTag') },
                      { key: 'Imported', label: t('importedTag') }
                    ].map((tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() => setActiveRecipeTagFilter(tag.key)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                        style={activeRecipeTagFilter === tag.key ? {
                          backgroundColor: 'var(--color-primary, #E05638)',
                          borderColor: 'var(--color-primary, #E05638)',
                          color: '#ffffff'
                        } : {
                          backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #07090e)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#475569' : '#94a3b8'
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
                  <div className="py-12 text-center text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('noRecipesMatchCriteria')}
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
                          backgroundColor: isDayMode ? '#f8fafc' : 'transparent',
                          borderColor: isDayMode ? '#e2e8f0' : 'transparent'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={recImage}
                            alt={recTitle}
                            className="w-12 h-12 rounded-xl object-cover border shrink-0"
                            style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                          />
                          <div className="space-y-1 min-w-0">
                            <h4 
                              className="font-extrabold text-xs leading-snug truncate"
                              style={{ color: 'var(--color-primary, #E05638)' }}
                            >
                              {recTitle}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                              >
                                {recCategory}
                              </span>
                              <Heart className="h-3 w-3 fill-current" style={{ color: 'var(--color-primary, #E05638)' }} />
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
                          className="px-4 py-1.5 border font-bold text-xs rounded-xl transition shrink-0 ml-2 cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #07090e)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: 'var(--color-primary, #E05638)'
                          }}
                        >
                          {t('selectBtn')}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div 
              className="text-center py-2 text-xs font-semibold"
              style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }}
            >
              {t('showingRecipesCount').replace('{count}', String(filteredPickerRecipes.length)).replace('{total}', String(savedRecipes.length))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
