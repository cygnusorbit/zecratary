'use client';
// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, SlidersHorizontal, Heart, Clock, Utensils, X, UploadCloud, 
  BookmarkPlus, CalendarPlus, ShoppingCart, Timer, Edit3, Share2, 
  Star, Check, Book, ChevronDown, Trash2, Save, Plus, ImagePlus, 
  Users, Calendar, GripVertical, CheckSquare, CheckCircle2, Type, 
  ExternalLink, Carrot, Hourglass, ChevronLeft, ChevronRight, 
  LayoutGrid, Grid3X3, Rows3, Flame, AlertCircle, BookOpen
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { syncUserSavedRecipes, persistSavedRecipe, deleteSavedRecipe } from '@/lib/recipeSync';
import { getStoredCategories } from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';

type GridMode = '3x3' | '4x4' | '5x5';

const GRID_CONFIG: Record<GridMode, { colsClass: string; perPage: number; label: string; imgHeight: string; titleSize: string }> = {
  '3x3': { colsClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', perPage: 9, label: '3×3', imgHeight: 'h-44', titleSize: 'text-base' },
  '4x4': { colsClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', perPage: 16, label: '4×4', imgHeight: 'h-36', titleSize: 'text-sm' },
  '5x5': { colsClass: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', perPage: 25, label: '5×5', imgHeight: 'h-28', titleSize: 'text-xs' }
};

const isRecipeInBook = (rec: any, bookId: string): boolean => {
  if (!rec || !bookId) return false;
  return rec.bookId === bookId || rec.book_id === bookId;
};

// Robust arithmetic fraction and ingredient quantity scaler
function scaleAmountString(amountStr: string, factor: number): string {
  if (!amountStr || factor === 1) return amountStr;
  const trimmed = amountStr.trim();
  
  // Handle mixed fractions like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    const val = (whole + num / den) * factor;
    return (Math.round(val * 100) / 100).toString();
  }

  // Handle simple fractions like "1/2", "3/4"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    const val = (num / den) * factor;
    return (Math.round(val * 100) / 100).toString();
  }

  const numVal = parseFloat(trimmed);
  if (!isNaN(numVal)) {
    const scaled = numVal * factor;
    return (Math.round(scaled * 100) / 100).toString();
  }
  return amountStr;
}

export default function SavedRecipesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isSavingRef = useRef<boolean>(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterCooked, setFilterCooked] = useState(false);
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [selectedIngredientsList, setSelectedIngredientsList] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedRating, setSelectedRating] = useState('All Ratings');
  const [selectedPrepTime, setSelectedPrepTime] = useState('All Prep Times');
  const [selectedCookTime, setSelectedCookTime] = useState('All Cook Times');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Multi-Density Grid & Pagination State
  const [gridMode, setGridMode] = useState<GridMode>('3x3');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add to Plan / Calendar Modal State
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planTime, setPlanTime] = useState('19:00');
  const [planNotes, setPlanNotes] = useState('');

  // Servings Scaling State in Detail Modal
  const [modalServings, setModalServings] = useState<number>(4);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (user: User | null) => {
    try {
      const targetUserId = user?.id || 'usr_admin_1';
      
      // 1. Fetch from PostgreSQL /api/saved-recipes & /api/recipes/saved
      let remoteRecipes: any[] = [];
      try {
        const res = await fetch(`/api/saved-recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          remoteRecipes = Array.isArray(data) ? data : (data?.recipes || data?.saved_recipes || []);
        }
      } catch (_) {}

      if (remoteRecipes.length === 0) {
        try {
          const res2 = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
          if (res2.ok) {
            const data2 = await res2.json();
            remoteRecipes = Array.isArray(data2) ? data2 : (data2?.recipes || data2?.saved_recipes || []);
          }
        } catch (_) {}
      }

      // Fallback to localStorage
      if (remoteRecipes.length === 0 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('saved_recipes');
        if (raw) remoteRecipes = JSON.parse(raw);
      }

      const normalized = remoteRecipes.map(r => ({
        ...r,
        id: r.id || ('saved_' + Math.random().toString(36).substring(2, 8)),
        title: r.title || r.name || 'Untitled Recipe',
        name: r.title || r.name || 'Untitled Recipe',
        isFavorite: Boolean(r.isFavorite ?? r.is_favorite),
        is_favorite: Boolean(r.isFavorite ?? r.is_favorite),
        isCooked: Boolean(r.isCooked ?? r.is_cooked),
        is_cooked: Boolean(r.isCooked ?? r.is_cooked),
        servings: Number(r.servings) || 4,
        prepTimeMinutes: Number(r.prepTimeMinutes || r.prep_time_minutes || 15),
        cookTimeMinutes: Number(r.cookTimeMinutes || r.cook_time_minutes || 25),
        recipeType: r.recipeType || r.category || 'Main Dish',
        category: r.category || r.recipeType || 'Main Dish',
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: Array.isArray(r.instructions) ? r.instructions : (Array.isArray(r.directions) ? r.directions : []),
        imageUrl: r.imageUrl || r.image || r.image_url || '/uploads/recipes/default.jpg'
      }));

      setRecipes(normalized);

      // Fetch Cookbooks
      try {
        const bRes = await fetch(`/api/books?userId=${encodeURIComponent(targetUserId)}`, { cache: 'no-store' });
        if (bRes.ok) {
          const bData = await bRes.json();
          const bList = Array.isArray(bData) ? bData : (bData?.books || []);
          setBooks(bList);
        }
      } catch (_) {}

    } catch (err) {
      console.warn('Error loading saved recipes:', err);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('savedRecipesTitle', 'Saved Recipe Collections')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadData(user);

    if (typeof window !== 'undefined') {
      const storedGrid = localStorage.getItem('zecratary_saved_grid_mode') as GridMode;
      if (storedGrid && GRID_CONFIG[storedGrid]) setGridMode(storedGrid);
    }

    const handleSync = () => {
      const u = getCurrentUser();
      loadData(u);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadData, t]);

  const handleGridModeChange = (mode: GridMode) => {
    setGridMode(mode);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zecratary_saved_grid_mode', mode);
    }
  };

  const saveAllRecipes = async (updatedUserList: any[]) => {
    const targetUserId = currentUser?.id || 'usr_admin_1';
    setRecipes(updatedUserList);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedUserList));
      } catch (_) {}
    }

    try {
      await persistSavedRecipe(targetUserId, updatedUserList);
    } catch (_) {}
  };

  // Toggle Favorite
  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const current = recipes.find(r => r.id === id);
    if (!current) return;
    const nextVal = !current.isFavorite;

    const updatedRecipe = { ...current, isFavorite: nextVal, is_favorite: nextVal };
    const updated = recipes.map(r => r.id === id ? updatedRecipe : r);
    setRecipes(updated);

    if (selectedRecipe?.id === id) {
      setSelectedRecipe(updatedRecipe);
    }

    await saveAllRecipes(updated);
    showToast(t('favoriteUpdatedToast', 'Favorite status updated.'));

    try {
      await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecipe)
      });
    } catch (_) {}
  };

  // Toggle Cooked
  const toggleCooked = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const current = recipes.find(r => r.id === id);
    if (!current) return;
    const nextVal = !current.isCooked;

    const updatedRecipe = { ...current, isCooked: nextVal, is_cooked: nextVal };
    const updated = recipes.map(r => r.id === id ? updatedRecipe : r);
    setRecipes(updated);

    if (selectedRecipe?.id === id) {
      setSelectedRecipe(updatedRecipe);
    }

    await saveAllRecipes(updated);
    showToast(t('cookedUpdatedToast', 'Cooked status updated.'));

    try {
      await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecipe)
      });
    } catch (_) {}
  };

  // Delete Recipe
  const handleDeleteRecipe = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteRecipe', 'Are you sure you want to delete this recipe?'))) return;

    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    if (selectedRecipe?.id === id) setSelectedRecipe(null);

    await saveAllRecipes(updated);
    try {
      await fetch(`/api/saved-recipes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    showToast(t('recipeDeletedToast', 'Recipe removed from your library.'));
    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
  };

  // Cookbook Assignment
  const handleAssignToBook = async (bookId: string) => {
    if (!selectedRecipe) return;
    const isRemoving = isRecipeInBook(selectedRecipe, bookId);
    const targetBookId = isRemoving ? null : bookId;

    const updatedRecipe = {
      ...selectedRecipe,
      bookId: targetBookId,
      book_id: targetBookId
    };

    setSelectedRecipe(updatedRecipe);
    const updated = recipes.map(r => r.id === selectedRecipe.id ? updatedRecipe : r);
    setRecipes(updated);
    await saveAllRecipes(updated);
    showToast(t('cookbookAssignedToast', 'Cookbook assignment updated.'));

    try {
      await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecipe)
      });
    } catch (_) {}
  };

  // Add to Meal Planner / Calendar
  const handleSaveToCalendar = async () => {
    if (!selectedRecipe) return;
    const targetUserId = currentUser?.id || 'usr_admin_1';

    const mealItem = {
      id: 'plan_' + Date.now(),
      userId: targetUserId,
      recipeId: selectedRecipe.id,
      title: selectedRecipe.title,
      mealType: planMealType,
      date: planDate,
      time: planTime,
      notes: planNotes,
      servings: modalServings,
      prepMinutes: selectedRecipe.prepTimeMinutes || 15,
      cookMinutes: selectedRecipe.cookTimeMinutes || 25
    };

    try {
      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealItem)
      });
    } catch (_) {}

    setShowAddToPlanModal(false);
    showToast(t('mealScheduledToast', 'Recipe scheduled in your meal planner!'));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
  };

  // Add to Shopping List
  const handleAddToShoppingList = async () => {
    if (!selectedRecipe) return;
    const targetUserId = currentUser?.id || 'usr_admin_1';
    const ings = (selectedRecipe.ingredients || []).map((ing: any) => ({
      id: 'shop_' + Math.random().toString(36).substring(2, 7),
      userId: targetUserId,
      item: typeof ing === 'string' ? ing : ing.name || ing.item,
      amount: typeof ing === 'object' ? scaleAmountString(ing.amount || '1', modalServings / (selectedRecipe.servings || 4)) : '1',
      unit: typeof ing === 'object' ? ing.unit || '' : '',
      category: typeof ing === 'object' ? ing.category || 'Pantry Staples' : 'Pantry Staples',
      checked: false
    }));

    try {
      await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: ings })
      });
    } catch (_) {}

    showToast(t('addedToShoppingListToast', 'Ingredients added to your shopping list!'));
    window.dispatchEvent(new Event('zecratary_shopping_updated'));
  };

  // Filtered Recipes Pipeline
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (filterFavorites && !r.isFavorite) return false;
      if (filterCooked && !r.isCooked) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (r.title || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesIng = (r.ingredients || []).some((ing: any) => 
          (typeof ing === 'string' ? ing : ing.name || ing.item || '').toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesDesc && !matchesIng) return false;
      }

      if (selectedIngredientsList.length > 0) {
        const rIngs = (r.ingredients || []).map((i: any) => (typeof i === 'string' ? i : i.name || i.item || '').toLowerCase());
        const matchesAll = selectedIngredientsList.every(sel => rIngs.some((ri: any) => ri.includes(sel.toLowerCase())));
        if (!matchesAll) return false;
      }

      if (selectedType !== 'All Types' && r.recipeType !== selectedType && r.category !== selectedType) {
        return false;
      }

      if (selectedRating !== 'All Ratings') {
        const minRating = parseInt(selectedRating);
        if ((r.rating || 0) < minRating) return false;
      }

      if (selectedPrepTime !== 'All Prep Times') {
        const pt = r.prepTimeMinutes || 0;
        if (selectedPrepTime === 'Under 15 mins' && pt > 15) return false;
        if (selectedPrepTime === 'Under 30 mins' && pt > 30) return false;
        if (selectedPrepTime === 'Under 60 mins' && pt > 60) return false;
        if (selectedPrepTime === '60+ mins' && pt < 60) return false;
      }

      if (selectedCookTime !== 'All Cook Times') {
        const ct = r.cookTimeMinutes || 0;
        if (selectedCookTime === 'Under 15 mins' && ct > 15) return false;
        if (selectedCookTime === 'Under 30 mins' && ct > 30) return false;
        if (selectedCookTime === 'Under 60 mins' && ct > 60) return false;
        if (selectedCookTime === '60+ mins' && ct < 60) return false;
      }

      return true;
    });
  }, [recipes, filterFavorites, filterCooked, search, selectedIngredientsList, selectedType, selectedRating, selectedPrepTime, selectedCookTime]);

  // Pagination Math
  const itemsPerPage = GRID_CONFIG[gridMode].perPage;
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenDetailModal = (recipe: any) => {
    setSelectedRecipe(recipe);
    setModalServings(Number(recipe.servings) || 4);
  };

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
            borderColor: 'var(--color-emerald)',
            color: 'var(--color-text)'
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('savedRecipesTitle', 'Saved Recipe Collections')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('savedRecipesSubtitle', 'Browse, filter, and organize your favorite culinary creations and meal plans.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grid Mode Switcher (3x3, 4x4, 5x5) */}
          <div 
            className="flex items-center border rounded-xl p-1 shadow-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            {(['3x3', '4x4', '5x5'] as GridMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => handleGridModeChange(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  gridMode === mode ? 'text-white shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={gridMode === mode ? { backgroundColor: 'var(--color-primary)' } : {}}
                title={`Switch to ${mode} grid`}
              >
                {mode === '3x3' ? <Grid3X3 className="h-3.5 w-3.5" /> : mode === '4x4' ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
                <span>{GRID_CONFIG[mode].label}</span>
              </button>
            ))}
          </div>

          <Link
            href="/books"
            className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-80"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>{t('manageCookbooks', 'Manage Cookbooks')}</span>
          </Link>

          <Link
            href="/manual"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('newRecipeBtn', 'Create Recipe')}</span>
          </Link>
        </div>
      </div>

      {/* Search & Active Filters Bar */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-4 rounded-3xl border space-y-3.5 shadow-sm transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none opacity-60" />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              spellCheck="false"
              placeholder={t('searchRecipesPlaceholder', 'Search saved recipes by title, ingredients, tags, or notes...')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none font-medium"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setFilterFavorites(!filterFavorites); setCurrentPage(1); }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                filterFavorites ? 'text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={filterFavorites ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : { backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <Heart className={`h-3.5 w-3.5 ${filterFavorites ? 'fill-current' : ''}`} />
              <span>{t('filterFavorites', 'Favorites')}</span>
            </button>

            <button
              type="button"
              onClick={() => { setFilterCooked(!filterCooked); setCurrentPage(1); }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                filterCooked ? 'text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={filterCooked ? { backgroundColor: 'var(--color-emerald)', borderColor: 'var(--color-emerald)' } : { backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{t('filterCooked', 'Cooked')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Toggle Detailed Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Extended Filter Dropdowns */}
        {showFilters && (
          <div className="pt-2 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" style={{ borderColor: 'var(--color-border)' }}>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl p-2 outline-none cursor-pointer font-bold"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="All Types">{t('allTypes', 'All Types')}</option>
              {['Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetizer', 'Side Dish', 'Dessert', 'Snacks', 'Beverages'].map(tp => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>

            <select
              value={selectedRating}
              onChange={(e) => { setSelectedRating(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl p-2 outline-none cursor-pointer font-bold"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="All Ratings">{t('allRatings', 'All Ratings')}</option>
              <option value="5">★★★★★ (5 Stars)</option>
              <option value="4">★★★★☆ (4+ Stars)</option>
              <option value="3">★★★☆☆ (3+ Stars)</option>
            </select>

            <select
              value={selectedPrepTime}
              onChange={(e) => { setSelectedPrepTime(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl p-2 outline-none cursor-pointer font-bold"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="All Prep Times">{t('allPrepTimes', 'All Prep Times')}</option>
              <option value="Under 15 mins">{t('under15Mins', 'Under 15 mins')}</option>
              <option value="Under 30 mins">{t('under30Mins', 'Under 30 mins')}</option>
              <option value="Under 60 mins">{t('under60Mins', 'Under 60 mins')}</option>
              <option value="60+ mins">{t('over60Mins', '60+ mins')}</option>
            </select>

            <select
              value={selectedCookTime}
              onChange={(e) => { setSelectedCookTime(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl p-2 outline-none cursor-pointer font-bold"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="All Cook Times">{t('allCookTimes', 'All Cook Times')}</option>
              <option value="Under 15 mins">{t('under15Mins', 'Under 15 mins')}</option>
              <option value="Under 30 mins">{t('under30Mins', 'Under 30 mins')}</option>
              <option value="Under 60 mins">{t('under60Mins', 'Under 60 mins')}</option>
              <option value="60+ mins">{t('over60Mins', '60+ mins')}</option>
            </select>
          </div>
        )}
      </div>

      {/* Recipe Grid (Adaptive Density 3x3, 4x4, 5x5) */}
      {paginatedRecipes.length === 0 ? (
        <div 
          className="text-center py-16 border rounded-3xl p-8 space-y-3 shadow-xs"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <Utensils className="h-10 w-10 mx-auto opacity-40" />
          <h3 className="font-extrabold text-sm">{t('noRecipesFound', 'No recipes found matching your criteria.')}</h3>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterFavorites(false);
              setFilterCooked(false);
              setSelectedType('All Types');
              setSelectedRating('All Ratings');
              setSelectedPrepTime('All Prep Times');
              setSelectedCookTime('All Cook Times');
              setCurrentPage(1);
            }}
            className="text-xs font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
          >
            {t('clearAllFilters', 'Clear all filters')}
          </button>
        </div>
      ) : (
        <div className={`grid gap-4 ${GRID_CONFIG[gridMode].colsClass}`}>
          {paginatedRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => handleOpenDetailModal(recipe)}
              className="border rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-2.5">
                {/* Thumbnail Header with Favorite & Cooked Action Buttons */}
                <div className={`relative w-full ${GRID_CONFIG[gridMode].imgHeight} overflow-hidden`} style={{ backgroundColor: 'var(--color-inner-dark)' }}>
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, recipe.id)}
                      className="p-1.5 rounded-full backdrop-blur-md transition cursor-pointer shadow"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        color: recipe.isFavorite ? '#ef4444' : '#ffffff'
                      }}
                      title={recipe.isFavorite ? 'Favorited' : 'Add to favorites'}
                    >
                      <Heart className={`h-3.5 w-3.5 ${recipe.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleCooked(e, recipe.id)}
                      className="p-1.5 rounded-full backdrop-blur-md transition cursor-pointer shadow"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        color: recipe.isCooked ? 'var(--color-emerald)' : '#ffffff'
                      }}
                      title={recipe.isCooked ? 'Cooked' : 'Mark as cooked'}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-2.5 left-2.5">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/20"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
                    >
                      {recipe.recipeType || 'Main Dish'}
                    </span>
                  </div>
                </div>

                {/* Recipe Card Body */}
                <div className="p-3.5 space-y-1.5">
                  <h3 className={`font-black ${GRID_CONFIG[gridMode].titleSize} leading-snug line-clamp-1`} style={{ color: 'var(--color-text)' }}>
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-[11px] leading-relaxed opacity-75 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {recipe.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Telemetry */}
              <div 
                className="p-3 border-t flex items-center justify-between text-[11px] font-semibold opacity-80"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
              >
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-400" />
                  {recipe.prepTimeMinutes + recipe.cookTimeMinutes}m
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {recipe.servings}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                  {recipe.calories || 450} {t('recipeCardCalories', 'kcal')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Production-Ready Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs opacity-75 font-medium">
            {(t('showingRecipesRange', 'Showing {start} - {end} of {total} recipes'))
              .replace('{start}', String(startIndex + 1))
              .replace('{end}', String(Math.min(startIndex + itemsPerPage, filteredRecipes.length)))
              .replace('{total}', String(filteredRecipes.length))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl border text-xs font-bold disabled:opacity-30 transition cursor-pointer shadow-xs"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              {(t('pageIndicator', 'Page {page} of {total}'))
                .replace('{page}', String(safeCurrentPage))
                .replace('{total}', String(totalPages))}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl border text-xs font-bold disabled:opacity-30 transition cursor-pointer shadow-xs"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* RECIPE DETAILS MODAL (Autofill Safe & Dynamic Scaler) */}
      {selectedRecipe && (
        <div 
          onClick={() => setSelectedRecipe(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-4 cursor-default animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                  {selectedRecipe.recipeType || 'Main Dish'}
                </span>
                <h2 className="text-xl font-black leading-tight" style={{ color: 'var(--color-text)' }}>
                  {selectedRecipe.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="p-2 rounded-xl border transition cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs custom-scrollbar">
              {/* Image & Quick Action Header */}
              <div className="relative h-48 w-full rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} className="w-full h-full object-cover" />
                <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                    className="p-2 rounded-full backdrop-blur-md shadow"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: selectedRecipe.isFavorite ? '#ef4444' : '#ffffff' }}
                  >
                    <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => toggleCooked(e, selectedRecipe.id)}
                    className="p-2 rounded-full backdrop-blur-md shadow"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: selectedRecipe.isCooked ? 'var(--color-emerald)' : '#ffffff' }}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Telemetry Info Bar & Servings Scaler */}
              <div 
                className="p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-4 opacity-80">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" /> {t('recipeCardPrep', 'Prep')}: {selectedRecipe.prepTimeMinutes}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('recipeCardCook', 'Cook')}: {selectedRecipe.cookTimeMinutes}m
                  </span>
                </div>

                {/* Arithmetic Scaler */}
                <div className="flex items-center gap-2 font-bold">
                  <span>{t('scaleServings', 'Scale Servings')}:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalServings(Math.max(1, modalServings - 1))}
                      className="w-6 h-6 rounded-lg border flex items-center justify-center font-bold hover:bg-slate-800/30 cursor-pointer"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      -
                    </button>
                    <span className="px-2 font-mono text-sm">{modalServings}</span>
                    <button
                      type="button"
                      onClick={() => setModalServings(modalServings + 1)}
                      className="w-6 h-6 rounded-lg border flex items-center justify-center font-bold hover:bg-slate-800/30 cursor-pointer"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
                    {t('ingredientsHeading', 'Ingredients')} ({(selectedRecipe.ingredients || []).length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddToShoppingList}
                    className="text-[11px] font-bold flex items-center gap-1 text-emerald-400 hover:underline cursor-pointer"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> {t('addToShoppingList', 'Add to Shopping List')}
                  </button>
                </div>
                <ul className="space-y-1">
                  {(selectedRecipe.ingredients || []).map((ing: any, i: number) => {
                    const baseAmt = typeof ing === 'object' ? ing.amount || '' : '';
                    const scaledAmt = scaleAmountString(baseAmt, modalServings / (Number(selectedRecipe.servings) || 4));
                    const unit = typeof ing === 'object' ? ing.unit || '' : '';
                    const name = typeof ing === 'object' ? ing.name || ing.item || '' : ing;

                    return (
                      <li 
                        key={i} 
                        className="p-2 rounded-xl border flex items-center justify-between text-xs"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <span className="font-medium">• {name}</span>
                        {(scaledAmt || unit) && (
                          <span className="font-bold opacity-80 font-mono text-[11px]">
                            {scaledAmt} {unit}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Step-by-Step Directions */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
                  {t('directionsHeading', 'Preparation Steps')}
                </h4>
                <ol className="space-y-2">
                  {(selectedRecipe.instructions || []).map((step: string, sIdx: number) => (
                    <li key={sIdx} className="flex items-start gap-2.5 leading-relaxed text-xs">
                      <span 
                        className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                      >
                        {sIdx + 1}
                      </span>
                      <span className="opacity-90">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Modal Footer with Actions & Bottom-Right Source Link (Constraint 2) */}
            <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(true)}
                  className="px-3.5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 transition shadow cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span>{t('addToMealPlan', 'Add to Meal Planner')}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                    className="px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    <Book className="h-3.5 w-3.5" />
                    <span>{t('addToCookbook', 'Add to Cookbook')}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {isBookDropdownOpen && (
                    <div 
                      className="absolute left-0 mt-1.5 w-48 border rounded-2xl p-2 shadow-2xl z-30 space-y-1 text-xs"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      {books.map(b => {
                        const inThisBook = isRecipeInBook(selectedRecipe, b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => { handleAssignToBook(b.id); setIsBookDropdownOpen(false); }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition hover:bg-slate-800/40 cursor-pointer"
                          >
                            <span className="truncate">{b.title}</span>
                            {inThisBook && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteRecipe(e, selectedRecipe.id)}
                  className="p-2 rounded-xl border text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title={t('deleteRecipe', 'Delete Recipe')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom-Right Source Placement */}
              {selectedRecipe.sourceUrl && (
                <a
                  href={selectedRecipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:underline shrink-0"
                >
                  <span>{t('viewOriginalSource', 'View Original Recipe Source ↗')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE IN MEAL PLANNER MODAL (Autofill Safe Container) */}
      {showAddToPlanModal && (
        <div 
          onClick={() => setShowAddToPlanModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('scheduleMealTitle', 'Schedule in Meal Planner')}
              </h3>
              <button type="button" onClick={() => setShowAddToPlanModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div role="region" data-lpignore="true" className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('selectDate', 'Date')}</label>
                <input
                  type="date"
                  autoComplete="off"
                  data-lpignore="true"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('selectMealSlot', 'Meal Slot')}</label>
                <select
                  value={planMealType}
                  onChange={(e) => setPlanMealType(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="Breakfast">{t('breakfast', 'Breakfast')}</option>
                  <option value="Lunch">{t('lunch', 'Lunch')}</option>
                  <option value="Dinner">{t('dinner', 'Dinner')}</option>
                  <option value="Snack">{t('snack', 'Snack')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('planNotes', 'Notes (Optional)')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="e.g. Serve with jasmine rice..."
                  className="w-full border rounded-xl p-2.5 text-xs outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToCalendar}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('scheduleBtn', 'Confirm Schedule')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
