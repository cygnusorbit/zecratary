// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart, Check, BookOpen, Clock, Users, Flame, Plus, Search,
  SlidersHorizontal, Trash2, Edit3, Calendar, CalendarPlus, ShoppingCart,
  FolderPlus, Volume2, Play, Pause, RotateCcw, X, ChevronLeft, ChevronRight,
  Grid3X3, Grid2X2, LayoutGrid, ExternalLink, Share2, CheckCircle2, Sparkles,
  Filter, GripVertical, Loader2, Tag, ArrowUpDown
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface Recipe {
  id: string;
  title: string;
  description?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  calories?: number;
  recipeType?: string;
  mealType?: string;
  cuisine?: string;
  ingredients: string[];
  instructions: string[];
  directions?: string[];
  image?: string;
  imageUrl?: string;
  image_url?: string;
  sourceUrl?: string;
  sourceName?: string;
  chefTip?: string;
  isFavorite?: boolean;
  is_favorite?: boolean;
  isCooked?: boolean;
  is_cooked?: boolean;
  bookId?: string | null;
  book_id?: string | null;
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

interface Cookbook {
  id: string;
  title: string;
  description?: string;
  cover_color?: string;
  coverColor?: string;
  recipe_count?: number;
}

// Helper: Safely scale fractional strings like "1/2", "3/4", "1 1/2" or numeric quantities
const scaleIngredientQuantity = (ingredientStr: string, originalServings: number, currentServings: number): string => {
  if (!ingredientStr || originalServings <= 0 || currentServings <= 0 || originalServings === currentServings) {
    return ingredientStr;
  }
  const ratio = currentServings / originalServings;

  return ingredientStr.replace(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/, (match) => {
    let val = 0;
    if (match.includes(' ') && match.includes('/')) {
      const parts = match.split(' ');
      const whole = parseFloat(parts[0]);
      const [num, den] = parts[1].split('/').map(Number);
      val = whole + (num / den);
    } else if (match.includes('/')) {
      const [num, den] = match.split('/').map(Number);
      val = num / den;
    } else {
      val = parseFloat(match);
    }
    if (isNaN(val)) return match;
    const scaled = val * ratio;
    if (Math.abs(scaled - Math.round(scaled)) < 0.05) return String(Math.round(scaled));
    return scaled.toFixed(1).replace(/\.0$/, '');
  });
};

export default function SavedRecipesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all');
  const [selectedCookbookFilter, setSelectedCookbookFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'cooked'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha' | 'time'>('newest');

  // Ingredient popover filter
  const [showIngredientFilter, setShowIngredientFilter] = useState<boolean>(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientSearchInput, setIngredientSearchInput] = useState<string>('');

  // Density & Pagination state (v8.1.15 authentic 3x3, 4x4, 5x5)
  const [gridDensity, setGridDensity] = useState<'3x3' | '4x4' | '5x5'>('3x3');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [modalServings, setModalServings] = useState<number>(2);

  // Kitchen Timer state with Web Audio synthesize alert
  const [timerOpen, setTimerOpen] = useState<boolean>(false);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(600);
  const [timerRemaining, setTimerRemaining] = useState<number>(600);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerLabel, setTimerLabel] = useState<string>('Kitchen Timer');
  const audioContextRef = useRef<any>(null);

  // Add to Plan Modal state
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [planMealType, setPlanMealType] = useState<string>('Dinner');
  const [planServings, setPlanServings] = useState<number>(2);

  // Add to Cookbook Modal state
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [bookTargetRecipe, setBookTargetRecipe] = useState<Recipe | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>('');

  // Shopping List Modal state
  const [showShoppingModal, setShowShoppingModal] = useState<boolean>(false);
  const [shoppingRecipe, setShoppingRecipe] = useState<Recipe | null>(null);
  const [selectedShoppingItems, setSelectedShoppingItems] = useState<string[]>([]);

  // Edit Recipe Modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getSafeImage = (r: Recipe): string => {
    return r.imageUrl || r.image || r.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=600&q=80';
  };

  const getEffectiveMinutes = (r: Recipe): number => {
    const prep = r.prepMinutes ?? r.prepTimeMinutes ?? 0;
    const cook = r.cookMinutes ?? r.cookTimeMinutes ?? 0;
    return prep + cook || 25;
  };

  // Sound chime synthesizer
  const playTimerChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (_) {}
  };

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            playTimerChime();
            showToast('⏰ Kitchen Timer Finished!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerRemaining]);

  // Load recipes and cookbooks from PostgreSQL / MySQL endpoints
  const loadData = useCallback(async (user: User | null) => {
    setLoading(true);
    const userId = user?.id || user?.email || 'guest';
    try {
      const [recRes, bookRes] = await Promise.allSettled([
        fetch(`/api/recipes/saved?userId=${encodeURIComponent(userId)}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/books?userId=${encodeURIComponent(userId)}&t=${Date.now()}`, { cache: 'no-store' })
      ]);

      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const data = await recRes.value.json();
        const list = Array.isArray(data.recipes) ? data.recipes : Array.isArray(data) ? data : [];
        setRecipes(list);
      } else {
        // Fallback to /api/saved-recipes
        const alt = await fetch(`/api/saved-recipes?userId=${encodeURIComponent(userId)}&t=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
        if (alt && alt.ok) {
          const altData = await alt.json();
          setRecipes(Array.isArray(altData.recipes) ? altData.recipes : []);
        }
      }

      if (bookRes.status === 'fulfilled' && bookRes.value.ok) {
        const bData = await bookRes.value.json();
        setCookbooks(Array.isArray(bData.books) ? bData.books : Array.isArray(bData) ? bData : []);
      }
    } catch (e) {
      console.warn('Failed to load saved recipes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadData(user);

    const handleSync = () => {
      const u = getCurrentUser();
      setCurrentUser(u);
      loadData(u);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_books_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_books_updated', handleSync);
    };
  }, [loadData]);

  // Favorite toggle with PostgreSQL synchronization
  const handleToggleFavorite = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !(recipe.isFavorite || recipe.is_favorite);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, isFavorite: newStatus, is_favorite: newStatus } : r));

    try {
      const userId = currentUser?.id || currentUser?.email || 'guest';
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, userId, isFavorite: newStatus })
      });
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      showToast(newStatus ? 'Added to Favorites!' : 'Removed from Favorites');
    } catch (_) {
      showToast('Status updated locally.');
    }
  };

  // Cooked status toggle with PostgreSQL synchronization
  const handleToggleCooked = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !(recipe.isCooked || recipe.is_cooked);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, isCooked: newStatus, is_cooked: newStatus } : r));

    try {
      const userId = currentUser?.id || currentUser?.email || 'guest';
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, userId, isCooked: newStatus })
      });
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      showToast(newStatus ? 'Marked as Cooked!' : 'Unmarked as Cooked');
    } catch (_) {
      showToast('Status updated locally.');
    }
  };

  // Delete recipe with PostgreSQL synchronization
  const handleDeleteRecipe = async (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Delete recipe "${title}"?`)) return;

    setRecipes(prev => prev.filter(r => r.id !== id));
    try {
      const userId = currentUser?.id || currentUser?.email || 'guest';
      await fetch(`/api/recipes/saved?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      if (selectedRecipe?.id === id) setShowDetailModal(false);
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      showToast(`"${title}" deleted.`);
    } catch (_) {
      showToast('Recipe deleted.');
    }
  };

  // All distinct ingredient names across recipes
  const allAvailableIngredients = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => {
      (r.ingredients || []).forEach(ing => {
        const cleaned = ing.replace(/^[\d\s\/\.\,\-\–\—\(\)]+(cups?|tbsp|tsp|g|kg|oz|lbs?|cloves?|pinch|slices?|pieces?)?\s*(of)?\s*/i, '').trim();
        if (cleaned.length > 2 && cleaned.length < 30) {
          set.add(cleaned.toLowerCase());
        }
      });
    });
    return Array.from(set).sort();
  }, [recipes]);

  // Filter & Search Logic
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      // Tab filter
      if (activeTab === 'favorites' && !(r.isFavorite || r.is_favorite)) return false;
      if (activeTab === 'cooked' && !(r.isCooked || r.is_cooked)) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        const matchIng = (r.ingredients || []).some(i => i.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchIng) return false;
      }

      // Recipe Type filter
      if (selectedType !== 'all') {
        const type = (r.recipeType || r.mealType || '').toLowerCase();
        if (type !== selectedType.toLowerCase()) return false;
      }

      // Rating filter
      if (selectedRating !== 'all') {
        const rating = r.rating || 5;
        if (selectedRating === '5' && rating < 5) return false;
        if (selectedRating === '4' && rating < 4) return false;
      }

      // Prep Time filter
      if (selectedTimeFilter !== 'all') {
        const totalMin = getEffectiveMinutes(r);
        if (selectedTimeFilter === 'under15' && totalMin > 15) return false;
        if (selectedTimeFilter === 'under30' && totalMin > 30) return false;
        if (selectedTimeFilter === 'under60' && totalMin > 60) return false;
        if (selectedTimeFilter === 'over60' && totalMin <= 60) return false;
      }

      // Cookbook filter
      if (selectedCookbookFilter !== 'all') {
        const bId = r.bookId || r.book_id;
        if (bId !== selectedCookbookFilter) return false;
      }

      // Ingredient popover filter
      if (selectedIngredients.length > 0) {
        const hasAllSelected = selectedIngredients.every(sel =>
          (r.ingredients || []).some(i => i.toLowerCase().includes(sel))
        );
        if (!hasAllSelected) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return (b.created_at || '').localeCompare(a.created_at || '') || b.id.localeCompare(a.id);
      if (sortBy === 'oldest') return (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id);
      if (sortBy === 'alpha') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'time') return getEffectiveMinutes(a) - getEffectiveMinutes(b);
      return 0;
    });
  }, [recipes, activeTab, searchQuery, selectedType, selectedRating, selectedTimeFilter, selectedCookbookFilter, selectedIngredients, sortBy]);

  // Density & Pagination calculations (v8.1.15)
  const itemsPerPage = useMemo(() => {
    if (gridDensity === '3x3') return 9;
    if (gridDensity === '4x4') return 16;
    return 25; // 5x5
  }, [gridDensity]);

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / itemsPerPage));
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecipes.slice(start, start + itemsPerPage);
  }, [filteredRecipes, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedRating, selectedTimeFilter, selectedCookbookFilter, selectedIngredients, activeTab, gridDensity]);

  // Handle Add to Plan submit
  const handleConfirmAddToPlan = async () => {
    if (!planRecipe) return;
    try {
      const userId = currentUser?.id || currentUser?.email || 'guest';
      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: planDate,
          mealType: planMealType,
          title: planRecipe.title,
          servings: planServings,
          recipeId: planRecipe.id,
          image: getSafeImage(planRecipe),
          recipe: planRecipe
        })
      });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(`Scheduled "${planRecipe.title}" for ${planDate} (${planMealType})!`);
      setShowPlanModal(false);
    } catch (_) {
      showToast('Scheduled to calendar.');
      setShowPlanModal(false);
    }
  };

  // Handle Add to Cookbook submit
  const handleConfirmAddToBook = async () => {
    if (!bookTargetRecipe || !selectedBookId) return;
    try {
      const userId = currentUser?.id || currentUser?.email || 'guest';
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_recipe',
          userId,
          bookId: selectedBookId,
          recipeId: bookTargetRecipe.id
        })
      });
      setRecipes(prev => prev.map(r => r.id === bookTargetRecipe.id ? { ...r, bookId: selectedBookId, book_id: selectedBookId } : r));
      window.dispatchEvent(new Event('zecratary_books_updated'));
      showToast('Added to Cookbook!');
      setShowBookModal(false);
    } catch (_) {
      showToast('Cookbook updated.');
      setShowBookModal(false);
    }
  };

  // Handle Add to Shopping List submit
  const handleConfirmShoppingList = async () => {
    if (selectedShoppingItems.length === 0) return;
    try {
      const userId = currentUser?.id || currentUser?.email || 'guest';
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          items: selectedShoppingItems.map(name => ({ name, checked: false }))
        })
      });
      window.dispatchEvent(new Event('zecratary_grocery_updated'));
      showToast(`Added ${selectedShoppingItems.length} ingredients to Shopping List!`);
      setShowShoppingModal(false);
    } catch (_) {
      showToast('Items added to Shopping List.');
      setShowShoppingModal(false);
    }
  };

  // Start Kitchen Timer
  const handleStartTimerForRecipe = (minutes: number, label: string) => {
    const sec = Math.max(60, minutes * 60);
    setTimerTotalSeconds(sec);
    setTimerRemaining(sec);
    setTimerLabel(label);
    setTimerRunning(true);
    setTimerOpen(true);
    showToast(`⏱️ Timer set for ${minutes} mins`);
  };

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-text)'
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Toolbar (Title, Metrics, and Primary Actions) */}
      <div 
        className="p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                {t('savedRecipesTitle', 'Saved Recipes')}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('savedRecipesSubtitle', 'Browse, filter, scale, plan, and organize your favorite culinary creations')}
              </p>
            </div>
          </div>
        </div>

        {/* Counter Pills & Primary Navigation */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold shadow-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span>{recipes.length} {t('totalRecipes', 'Recipes')}</span>
            <span className="opacity-30">•</span>
            <span className="text-red-500 flex items-center gap-1">
              <Heart className="h-3 w-3 fill-current" /> {recipes.filter(r => r.isFavorite || r.is_favorite).length}
            </span>
            <span className="opacity-30">•</span>
            <span className="text-emerald-500 flex items-center gap-1">
              <Check className="h-3 w-3" /> {recipes.filter(r => r.isCooked || r.is_cooked).length}
            </span>
          </div>

          <Link
            href="/manual"
            className="px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('addRecipe', 'Add Recipe')}</span>
          </Link>

          <Link
            href="/import"
            className="px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:opacity-80"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>{t('importRecipe', 'Import')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Filters & Density Control Bar */}
      <div 
        className="p-4 rounded-3xl border shadow-sm space-y-3 transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div 
            className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition shadow-inner"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchRecipesPlaceholder', 'Search recipes, ingredients, tags...')}
              className="bg-transparent border-none text-xs w-full outline-none"
              style={{ color: 'var(--color-text)' }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="hover:opacity-75 cursor-pointer text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Tabs: All, Favorites, Cooked */}
          <div 
            className="p-1 rounded-2xl border flex items-center gap-1 self-start sm:self-auto shrink-0"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            {(['all', 'favorites', 'cooked'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer"
                style={activeTab === tab ? {
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff'
                } : {
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t(tab, tab)}
              </button>
            ))}
          </div>

          {/* Authentic v8.1.15 Grid Density Switcher (3x3, 4x4, 5x5) */}
          <div 
            className="flex items-center gap-1 p-1 rounded-2xl border self-end lg:self-auto shrink-0 shadow-2xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            {[
              { id: '3x3', icon: LayoutGrid, label: '3×3' },
              { id: '4x4', icon: Grid3X3, label: '4×4' },
              { id: '5x5', icon: Grid2X2, label: '5×5' }
            ].map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setGridDensity(d.id as any)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                style={gridDensity === d.id ? {
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff'
                } : {
                  color: 'var(--color-text-secondary)'
                }}
                title={`Grid density: ${d.label}`}
              >
                <d.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Recipe Type dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border font-bold text-xs outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="all">All Types</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
            <option value="Dessert">Dessert</option>
          </select>

          {/* Prep Time dropdown */}
          <select
            value={selectedTimeFilter}
            onChange={(e) => setSelectedTimeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border font-bold text-xs outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="all">All Durations</option>
            <option value="under15">&lt; 15 mins</option>
            <option value="under30">&lt; 30 mins</option>
            <option value="under60">&lt; 60 mins</option>
            <option value="over60">60+ mins</option>
          </select>

          {/* Rating dropdown */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="px-3 py-1.5 rounded-xl border font-bold text-xs outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars only</option>
            <option value="4">4+ Stars</option>
          </select>

          {/* Cookbook filter */}
          {cookbooks.length > 0 && (
            <select
              value={selectedCookbookFilter}
              onChange={(e) => setSelectedCookbookFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="all">All Cookbooks</option>
              {cookbooks.map(b => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          )}

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border font-bold text-xs outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alpha">Alphabetical (A-Z)</option>
              <option value="time">Cook Time (Fastest)</option>
            </select>
          </div>

          {/* Ingredient Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIngredientFilter(!showIngredientFilter)}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition hover:opacity-80"
              style={{
                backgroundColor: selectedIngredients.length > 0 ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                borderColor: selectedIngredients.length > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                color: selectedIngredients.length > 0 ? '#ffffff' : 'var(--color-text)'
              }}
            >
              <Filter className="h-3 w-3" />
              <span>Ingredients {selectedIngredients.length > 0 ? `(${selectedIngredients.length})` : ''}</span>
            </button>

            {showIngredientFilter && (
              <div 
                className="absolute left-0 mt-2 w-72 p-3.5 rounded-2xl border shadow-2xl z-30 space-y-2.5 animate-in fade-in"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-extrabold text-xs">Filter by Ingredient</span>
                  {selectedIngredients.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setSelectedIngredients([])}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type ingredient name..."
                  value={ingredientSearchInput}
                  onChange={(e) => setIngredientSearchInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {allAvailableIngredients
                    .filter(i => !ingredientSearchInput || i.includes(ingredientSearchInput.toLowerCase()))
                    .map(ing => {
                      const isSel = selectedIngredients.includes(ing);
                      return (
                        <div
                          key={ing}
                          onClick={() => {
                            setSelectedIngredients(prev =>
                              prev.includes(ing) ? prev.filter(x => x !== ing) : [...prev, ing]
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition hover:opacity-80"
                          style={{
                            backgroundColor: isSel ? 'var(--color-inner-dark)' : 'transparent',
                            color: isSel ? 'var(--color-primary)' : 'var(--color-text)'
                          }}
                        >
                          <span className="capitalize">{ing}</span>
                          {isSel && <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Recipes Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: 'var(--color-primary)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Loading recipes from database...</p>
        </div>
      ) : paginatedRecipes.length === 0 ? (
        <div 
          className="py-20 rounded-3xl border text-center space-y-3"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <BookOpen className="h-10 w-10 mx-auto opacity-30" />
          <h3 className="font-extrabold text-base">No recipes found</h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            Try clearing search filters or import/create delicious new dishes to build your library.
          </p>
        </div>
      ) : (
        <div 
          className={`grid gap-4 ${
            gridDensity === '3x3' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : gridDensity === '4x4' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          }`}
        >
          {paginatedRecipes.map(recipe => {
            const isFav = recipe.isFavorite || recipe.is_favorite;
            const isDone = recipe.isCooked || recipe.is_cooked;
            const totalMins = getEffectiveMinutes(recipe);

            return (
              <div
                key={recipe.id}
                className="rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group relative"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                {/* Image & Quick Action Overlay */}
                <div 
                  className="relative aspect-video w-full overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setModalServings(recipe.servings || 2);
                    setShowDetailModal(true);
                  }}
                >
                  <img
                    src={getSafeImage(recipe)}
                    alt={recipe.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=600&q=80';
                    }}
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs pointer-events-auto border"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {recipe.recipeType || recipe.mealType || 'Dish'}
                    </span>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      {/* Favorite Button (Harmonized Day/Dark Mode Visible) */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(recipe, e)}
                        className="p-1.5 rounded-full border shadow-md transition hover:scale-110 cursor-pointer backdrop-blur-md"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: isFav ? '#ef4444' : 'var(--color-border)',
                          color: isFav ? '#ef4444' : 'var(--color-text)'
                        }}
                        title={isFav ? 'Remove Favorite' : 'Save as Favorite'}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current text-red-500' : ''}`} />
                      </button>

                      {/* Cooked Checkmark Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleCooked(recipe, e)}
                        className="p-1.5 rounded-full border shadow-md transition hover:scale-110 cursor-pointer backdrop-blur-md"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: isDone ? 'var(--color-emerald)' : 'var(--color-border)',
                          color: isDone ? 'var(--color-emerald)' : 'var(--color-text)'
                        }}
                        title={isDone ? 'Mark as Not Cooked' : 'Mark as Cooked'}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Stats Banner on Image */}
                  <div 
                    className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-xl flex items-center justify-between text-[10px] font-bold backdrop-blur-md border shadow-xs pointer-events-none"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.65)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff'
                    }}
                  >
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Clock className="h-3 w-3" /> {totalMins}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {recipe.servings || 2} serv
                    </span>
                    {recipe.calories && (
                      <span className="flex items-center gap-1 font-mono text-amber-300">
                        <Flame className="h-3 w-3" /> {recipe.calories}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recipe Body */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setModalServings(recipe.servings || 2);
                        setShowDetailModal(true);
                      }}
                      className="font-extrabold text-sm line-clamp-1 cursor-pointer hover:underline"
                      style={{ color: 'var(--color-text)' }}
                      title={recipe.title}
                    >
                      {recipe.title}
                    </h3>
                    <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {recipe.description || 'Delicious home-cooked chef-grade recipe.'}
                    </p>
                  </div>

                  {/* Card Actions Footer */}
                  <div 
                    className="pt-3 border-t flex items-center justify-between gap-1 text-xs"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-1">
                      {/* Plan button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPlanRecipe(recipe);
                          setPlanServings(recipe.servings || 2);
                          setShowPlanModal(true);
                        }}
                        className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                        title="Add to Meal Planner"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                      </button>

                      {/* Cookbook button */}
                      <button
                        type="button"
                        onClick={() => {
                          setBookTargetRecipe(recipe);
                          setSelectedBookId(recipe.bookId || recipe.book_id || (cookbooks[0]?.id || ''));
                          setShowBookModal(true);
                        }}
                        className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                        title="Add to Cookbook"
                      >
                        <FolderPlus className="h-3.5 w-3.5 text-sky-400" />
                      </button>

                      {/* Shopping button */}
                      <button
                        type="button"
                        onClick={() => {
                          setShoppingRecipe(recipe);
                          setSelectedShoppingItems(recipe.ingredients || []);
                          setShowShoppingModal(true);
                        }}
                        className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                        title="Export ingredients to Shopping List"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setModalServings(recipe.servings || 2);
                          setShowDetailModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition hover:opacity-80 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteRecipe(recipe.id, recipe.title, e)}
                        className="p-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                        title="Delete Recipe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination Bar */}
      {totalPages > 1 && (
        <div 
          className="p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(filteredRecipes.length, currentPage * itemsPerPage)} of {filteredRecipes.length} recipes
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border transition shadow-xs cursor-pointer"
                style={currentPage === p ? {
                  backgroundColor: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  color: '#ffffff'
                } : {
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Floating Kitchen Timer Widget (v8.1.15) */}
      {timerOpen && (
        <div 
          className="fixed bottom-6 right-6 z-40 p-4 rounded-3xl border shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-text)'
          }}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--color-primary)' }}>
              {timerLabel}
            </span>
            <div className="text-xl font-mono font-black">
              {Math.floor(timerRemaining / 60)}:{(timerRemaining % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-2 rounded-xl text-white shadow-xs transition hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setTimerRemaining(timerTotalSeconds);
              }}
              className="p-2 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setTimerOpen(false)}
              className="p-2 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Recipe Details Modal (With Servings Scaler & Source moved to bottom right) */}
      {showDetailModal && selectedRecipe && (
        <div 
          onClick={() => setShowDetailModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-4 cursor-default"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span 
                  className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {selectedRecipe.recipeType || selectedRecipe.mealType || 'Recipe'}
                </span>
                <h2 className="text-xl font-black tracking-tight mt-1" style={{ color: 'var(--color-text)' }}>
                  {selectedRecipe.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(selectedRecipe)}
                  className="p-2 rounded-xl border transition hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: (selectedRecipe.isFavorite || selectedRecipe.is_favorite) ? '#ef4444' : 'var(--color-border)',
                    color: (selectedRecipe.isFavorite || selectedRecipe.is_favorite) ? '#ef4444' : 'var(--color-text)'
                  }}
                >
                  <Heart className={`h-4 w-4 ${(selectedRecipe.isFavorite || selectedRecipe.is_favorite) ? 'fill-current text-red-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-xl border hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs custom-scrollbar">
              <img
                src={getSafeImage(selectedRecipe)}
                alt={selectedRecipe.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full h-48 rounded-2xl object-cover border shadow-sm"
                style={{ borderColor: 'var(--color-border)' }}
              />

              <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedRecipe.description}
              </p>

              {/* Servings Stepper & Metrics Strip */}
              <div 
                className="p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 font-bold"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--color-primary)' }}>Scale Servings:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalServings(Math.max(1, modalServings - 1))}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      -
                    </button>
                    <span className="font-mono text-sm">{modalServings}</span>
                    <button
                      type="button"
                      onClick={() => setModalServings(modalServings + 1)}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Clock className="h-3.5 w-3.5" /> {getEffectiveMinutes(selectedRecipe)} mins
                  </span>
                  {selectedRecipe.calories && (
                    <span className="font-mono text-amber-400">
                      {Math.round(selectedRecipe.calories * (modalServings / (selectedRecipe.servings || 2)))} kcal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartTimerForRecipe(getEffectiveMinutes(selectedRecipe), selectedRecipe.title)}
                    className="px-2.5 py-1 rounded-xl text-white font-bold flex items-center gap-1 shadow-xs hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Timer
                  </button>
                </div>
              </div>

              {/* Ingredients with fractional scaling */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    Ingredients ({selectedRecipe.ingredients?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShoppingRecipe(selectedRecipe);
                      setSelectedShoppingItems(selectedRecipe.ingredients || []);
                      setShowShoppingModal(true);
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ShoppingCart className="h-3 w-3" /> + Add to Shopping List
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedRecipe.ingredients || []).map((ing, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-xl border flex items-center gap-2 shadow-2xs"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                      <span className="leading-snug">
                        {scaleIngredientQuantity(ing, selectedRecipe.servings || 2, modalServings)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2 pt-2">
                <h4 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                  Instructions
                </h4>
                <div className="space-y-2">
                  {(selectedRecipe.instructions || selectedRecipe.directions || []).map((step, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-2xl border flex items-start gap-3 leading-relaxed"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <span 
                        className="w-5 h-5 rounded-md font-black text-[10px] flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {idx + 1}
                      </span>
                      <p className="flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions and Source Link at Bottom Right */}
            <div 
              className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlanRecipe(selectedRecipe);
                    setPlanServings(modalServings);
                    setShowPlanModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Add to Plan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookTargetRecipe(selectedRecipe);
                    setSelectedBookId(selectedRecipe.bookId || selectedRecipe.book_id || (cookbooks[0]?.id || ''));
                    setShowBookModal(true);
                  }}
                  className="px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <FolderPlus className="h-3.5 w-3.5 text-sky-400" /> Book
                </button>
              </div>

              {/* Source Button at Modal Bottom Right */}
              <div className="flex items-center gap-2 ml-auto">
                {selectedRecipe.sourceUrl && (
                  <a
                    href={selectedRecipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-emerald)',
                      color: 'var(--color-emerald)'
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View Source ↗</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs transition cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add to Plan Modal (Accessible <div> container - Constraint 9) */}
      {showPlanModal && planRecipe && (
        <div 
          onClick={() => setShowPlanModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--color-primary)' }}>
                  Meal Planner
                </span>
                <h3 className="text-base font-black tracking-tight">
                  Schedule "{planRecipe.title}"
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold">Target Date</label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Meal Slot</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPlanMealType(slot)}
                      className="py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center"
                      style={planMealType === slot ? {
                        backgroundColor: 'var(--color-primary)',
                        borderColor: 'var(--color-primary)',
                        color: '#ffffff'
                      } : {
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Servings: {planServings}</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanServings(Math.max(1, planServings - 1))}
                    className="w-7 h-7 rounded-lg border font-bold text-xs"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    -
                  </button>
                  <span className="font-mono">{planServings}</span>
                  <button
                    type="button"
                    onClick={() => setPlanServings(planServings + 1)}
                    className="w-7 h-7 rounded-lg border font-bold text-xs"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-xs hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToPlan}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Confirm & Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add to Cookbook Modal */}
      {showBookModal && bookTargetRecipe && (
        <div 
          onClick={() => setShowBookModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block text-sky-400">
                  Cookbooks
                </span>
                <h3 className="text-base font-black tracking-tight">
                  Assign to Cookbook
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBookModal(false)}
                className="p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold">Select Cookbook Collection:</label>
              {cookbooks.length === 0 ? (
                <p className="opacity-70 italic">No cookbooks created yet. Create one in /books.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cookbooks.map(b => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookId(b.id)}
                      className="p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition hover:opacity-90"
                      style={{
                        backgroundColor: selectedBookId === b.id ? 'var(--color-inner-dark)' : 'var(--color-card)',
                        borderColor: selectedBookId === b.id ? 'var(--color-primary)' : 'var(--color-border)'
                      }}
                    >
                      <span className="font-bold">{b.title}</span>
                      {selectedBookId === b.id && <Check className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowBookModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-xs hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBookId}
                onClick={handleConfirmAddToBook}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md disabled:opacity-40 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Save to Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Shopping List Modal */}
      {showShoppingModal && shoppingRecipe && (
        <div 
          onClick={() => setShowShoppingModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-400">
                  Shopping List
                </span>
                <h3 className="text-base font-black tracking-tight">
                  Export Ingredients ({selectedShoppingItems.length})
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowShoppingModal(false)}
                className="p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {(shoppingRecipe.ingredients || []).map((ing, i) => {
                const isSel = selectedShoppingItems.includes(ing);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedShoppingItems(prev =>
                        prev.includes(ing) ? prev.filter(x => x !== ing) : [...prev, ing]
                      );
                    }}
                    className="p-2 rounded-xl border flex items-center justify-between cursor-pointer"
                    style={{
                      backgroundColor: isSel ? 'var(--color-inner-dark)' : 'transparent',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <span className="truncate">{ing}</span>
                    <input 
                      type="checkbox" 
                      checked={isSel} 
                      onChange={() => {}} 
                      className="rounded cursor-pointer" 
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowShoppingModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-xs hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedShoppingItems.length === 0}
                onClick={handleConfirmShoppingList}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md disabled:opacity-40 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Add to List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
