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
  Filter, GripVertical, Loader2, Tag, ArrowUpDown, Globe, Lock, User as UserIcon,
  Download, FileJson
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface Recipe {
  id: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  userId?: string;
  user_id?: string;
  createdBy?: string;
  created_by?: string;
  creatorName?: string;
  creator_name?: string;
  isPublic?: boolean;
  is_public?: boolean;
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
  ingredients: (string | any)[];
  instructions: (string | any)[];
  directions?: (string | any)[];
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
  recipe_count?: number;
}

const getIngredientString = (ing: any): string => {
  if (!ing) return '';
  if (typeof ing === 'string') {
    const trimmed = ing.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return getIngredientString(parsed);
      } catch (_) {}
    }
    return trimmed;
  }
  if (typeof ing === 'object') {
    const parts: string[] = [];
    if (ing.amount !== undefined && ing.amount !== null && String(ing.amount).trim()) {
      parts.push(String(ing.amount).trim());
    }
    if (ing.unit !== undefined && ing.unit !== null && String(ing.unit).trim()) {
      parts.push(String(ing.unit).trim());
    }
    const name = ing.name || ing.item || ing.ingredient || ing.title || '';
    if (name) parts.push(String(name).trim());
    if (parts.length > 0) return parts.join(' ').trim();
    return String(ing.name || ing.item || Object.values(ing)[0] || '').trim();
  }
  return String(ing).trim();
};

const getInstructionString = (inst: any): string => {
  if (!inst) return '';
  if (typeof inst === 'string') return inst.trim();
  if (typeof inst === 'object') {
    return String(inst.text || inst.step || inst.instruction || inst.description || Object.values(inst)[0] || '').trim();
  }
  return String(inst).trim();
};

const scaleIngredientQuantity = (rawIng: any, originalServings: number, currentServings: number): string => {
  const ingredientStr = getIngredientString(rawIng);
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

export default function RecipesPage() {
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
  
  // TABS: 'my_recipes' (personal) | 'marketplace' (public from all users) | 'favorites' | 'cooked'
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'marketplace' | 'favorites' | 'cooked'>('my_recipes');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha' | 'time'>('newest');

  // Ingredient popover filter
  const [showIngredientFilter, setShowIngredientFilter] = useState<boolean>(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientSearchInput, setIngredientSearchInput] = useState<string>('');

  // Density & Pagination
  const [gridDensity, setGridDensity] = useState<'3x3' | '4x4' | '5x5'>('3x3');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [modalServings, setModalServings] = useState<number>(2);

  // Kitchen Timer state
  const [timerOpen, setTimerOpen] = useState<boolean>(false);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(600);
  const [timerRemaining, setTimerRemaining] = useState<number>(600);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerLabel, setTimerLabel] = useState<string>('Kitchen Timer');
  const audioContextRef = useRef<any>(null);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [planMealType, setPlanMealType] = useState<string>('Dinner');
  const [planServings, setPlanServings] = useState<number>(2);

  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [bookTargetRecipe, setBookTargetRecipe] = useState<Recipe | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>('');

  const [showShoppingModal, setShowShoppingModal] = useState<boolean>(false);
  const [shoppingRecipe, setShoppingRecipe] = useState<Recipe | null>(null);
  const [selectedShoppingItems, setSelectedShoppingItems] = useState<string[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const getSafeImage = (r: Recipe): string => {
    return r.imageUrl || r.image || r.image_url || '/recipes/images/default.jpg';
  };

  const getEffectiveMinutes = (r: Recipe): number => {
    const prep = r.prepMinutes ?? r.prepTimeMinutes ?? 0;
    const cook = r.cookMinutes ?? r.cookTimeMinutes ?? 0;
    return prep + cook || 25;
  };

  const isOwner = (recipe: Recipe): boolean => {
    if (!currentUser) return true;
    const uid = currentUser.id;
    const email = currentUser.email;
    return (
      recipe.ownerId === uid ||
      recipe.userId === uid ||
      recipe.user_id === uid ||
      recipe.createdBy === email ||
      recipe.created_by === email ||
      recipe.ownerEmail === email
    );
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (_) {}
  };

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

  // Load recipes across JSON files, PostgreSQL & MySQL
  const loadData = useCallback(async (user: User | null, tab: string = activeTab) => {
    setLoading(true);
    const userId = user?.id || '';
    const userEmail = user?.email || '';
    const queryParams = new URLSearchParams();
    if (userId) queryParams.set('userId', userId);
    if (userEmail) queryParams.set('email', userEmail);
    if (tab === 'marketplace') queryParams.set('marketplace', 'true');
    queryParams.set('t', String(Date.now()));

    try {
      const [recRes, bookRes] = await Promise.allSettled([
        fetch(`/api/recipes/saved?${queryParams.toString()}`, { cache: 'no-store' }),
        fetch(`/api/books?userId=${encodeURIComponent(userId || 'guest')}&t=${Date.now()}`, { cache: 'no-store' })
      ]);

      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const data = await recRes.value.json();
        const list = Array.isArray(data.recipes) ? data.recipes : [];
        setRecipes(list);
      }

      if (bookRes.status === 'fulfilled' && bookRes.value.ok) {
        const bData = await bookRes.value.json();
        setCookbooks(Array.isArray(bData.books) ? bData.books : []);
      }
    } catch (e) {
      console.warn('Failed to load recipes:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadData(user, activeTab);

    const handleSync = () => {
      const u = getCurrentUser();
      setCurrentUser(u);
      loadData(u, activeTab);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
    };
  }, [loadData, activeTab]);

  // Toggle Public / Private (Marketplace Sharing)
  const handleTogglePublic = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !(recipe.isPublic || recipe.is_public);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, isPublic: newStatus, is_public: newStatus } : r));

    if (selectedRecipe?.id === recipe.id) {
      setSelectedRecipe(prev => prev ? { ...prev, isPublic: newStatus, is_public: newStatus } : null);
    }

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, isPublic: newStatus })
      });
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      showToast(newStatus ? '🌐 Shared to Marketplace (Public)!' : '🔒 Made Private (Only You)');
    } catch (_) {
      showToast('Visibility updated.');
    }
  };

  // Clone Marketplace Recipe to My Recipes
  const handleSaveToMyRecipes = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const activeUser = currentUser || getCurrentUser();
      const payload = {
        ...recipe,
        id: 'rec_' + Date.now().toString(36),
        userId: activeUser?.id || 'guest',
        user_id: activeUser?.id || 'guest',
        createdBy: activeUser?.email || 'guest',
        created_by: activeUser?.email || 'guest',
        creatorName: activeUser?.name || 'Chef',
        creator_name: activeUser?.name || 'Chef',
        isPublic: false,
        is_public: false
      };

      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      showToast(`Saved "${recipe.title}" to My Recipes!`);
    } catch (_) {
      showToast('Saved to your collection.');
    }
  };

  // Favorite toggle
  const handleToggleFavorite = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !(recipe.isFavorite || recipe.is_favorite);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, isFavorite: newStatus, is_favorite: newStatus } : r));

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, isFavorite: newStatus })
      });
      showToast(newStatus ? 'Added to Favorites!' : 'Removed from Favorites');
    } catch (_) {}
  };

  // Cooked status toggle
  const handleToggleCooked = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !(recipe.isCooked || recipe.is_cooked);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, isCooked: newStatus, is_cooked: newStatus } : r));

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, isCooked: newStatus })
      });
      showToast(newStatus ? 'Marked as Cooked!' : 'Unmarked as Cooked');
    } catch (_) {}
  };

  // Delete recipe
  const handleDeleteRecipe = async (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Delete recipe "${title}"?`)) return;

    setRecipes(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/recipes/saved?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (selectedRecipe?.id === id) setShowDetailModal(false);
      showToast(`"${title}" deleted.`);
    } catch (_) {}
  };

  // Ingredients set
  const allAvailableIngredients = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => {
      (r.ingredients || []).forEach(rawIng => {
        const ing = getIngredientString(rawIng);
        if (!ing) return;
        const cleaned = ing.replace(/^[\d\s\/\.\,\-\–\—\(\)]+(cups?|tbsp|tsp|g|kg|oz|lbs?|cloves?|pinch|slices?|pieces?)?\s*(of)?\s*/i, '').trim();
        if (cleaned.length > 2 && cleaned.length < 30) set.add(cleaned.toLowerCase());
      });
    });
    return Array.from(set).sort();
  }, [recipes]);

  // Filter & Search Logic
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (activeTab === 'marketplace') {
        if (!(r.isPublic || r.is_public)) return false;
      } else if (activeTab === 'favorites') {
        if (!(r.isFavorite || r.is_favorite)) return false;
      } else if (activeTab === 'cooked') {
        if (!(r.isCooked || r.is_cooked)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        const matchCreator = (r.creatorName || r.ownerName || '').toLowerCase().includes(q);
        const matchIng = (r.ingredients || []).some(i => getIngredientString(i).toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchIng && !matchCreator) return false;
      }

      if (selectedType !== 'all') {
        const type = (r.recipeType || r.mealType || '').toLowerCase();
        if (type !== selectedType.toLowerCase()) return false;
      }

      if (selectedRating !== 'all') {
        const rating = r.rating || 5;
        if (selectedRating === '5' && rating < 5) return false;
        if (selectedRating === '4' && rating < 4) return false;
      }

      if (selectedTimeFilter !== 'all') {
        const totalMin = getEffectiveMinutes(r);
        if (selectedTimeFilter === 'under15' && totalMin > 15) return false;
        if (selectedTimeFilter === 'under30' && totalMin > 30) return false;
        if (selectedTimeFilter === 'under60' && totalMin > 60) return false;
        if (selectedTimeFilter === 'over60' && totalMin <= 60) return false;
      }

      if (selectedCookbookFilter !== 'all') {
        const bId = r.bookId || r.book_id;
        if (bId !== selectedCookbookFilter) return false;
      }

      if (selectedIngredients.length > 0) {
        const hasAllSelected = selectedIngredients.every(sel =>
          (r.ingredients || []).some(i => getIngredientString(i).toLowerCase().includes(sel))
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

  const itemsPerPage = useMemo(() => {
    if (gridDensity === '3x3') return 9;
    if (gridDensity === '4x4') return 16;
    return 25;
  }, [gridDensity]);

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / itemsPerPage));
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecipes.slice(start, start + itemsPerPage);
  }, [filteredRecipes, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedRating, selectedTimeFilter, selectedCookbookFilter, selectedIngredients, activeTab, gridDensity]);

  // Add to Plan submit
  const handleConfirmAddToPlan = async () => {
    if (!planRecipe) return;
    try {
      const userId = currentUser?.id || 'guest';
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
      showToast(`Scheduled "${planRecipe.title}" for ${planDate} (${planMealType})!`);
      setShowPlanModal(false);
    } catch (_) {
      setShowPlanModal(false);
    }
  };

  // Add to Cookbook submit
  const handleConfirmAddToBook = async () => {
    if (!bookTargetRecipe || !selectedBookId) return;
    try {
      const userId = currentUser?.id || 'guest';
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
      setRecipes(prev => prev.map(r => r.id === bookTargetRecipe.id ? { ...r, bookId: selectedBookId } : r));
      showToast('Added to Cookbook!');
      setShowBookModal(false);
    } catch (_) {
      setShowBookModal(false);
    }
  };

  // Add to Shopping List submit
  const handleConfirmShoppingList = async () => {
    if (selectedShoppingItems.length === 0) return;
    try {
      const userId = currentUser?.id || 'guest';
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          items: selectedShoppingItems.map(name => ({ name, checked: false }))
        })
      });
      showToast(`Added ${selectedShoppingItems.length} ingredients to Shopping List!`);
      setShowShoppingModal(false);
    } catch (_) {
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('recipesTitle', 'Recipes')}
                </h1>
                <span 
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                  title="All recipes saved as individual JSON files in /recipes & PostgreSQL"
                >
                  <FileJson className="h-3 w-3 text-emerald-400" />
                  <span>JSON Files & DB Synced</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('recipesSubtitle', 'Discover community dishes on Marketplace or manage your personal recipes')}
              </p>
            </div>
          </div>
        </div>

        {/* Counter Pills & Primary Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold shadow-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span>{recipes.length} {t('totalRecipes', 'Recipes')}</span>
            <span className="opacity-30">•</span>
            <span className="text-sky-400 flex items-center gap-1" title="Public in Marketplace">
              <Globe className="h-3 w-3" /> {recipes.filter(r => r.isPublic || r.is_public).length}
            </span>
            <span className="opacity-30">•</span>
            <span className="text-red-500 flex items-center gap-1">
              <Heart className="h-3 w-3 fill-current" /> {recipes.filter(r => r.isFavorite || r.is_favorite).length}
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

      {/* 2. Filters, Marketplace Tabs & Density Control Bar */}
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
              placeholder={t('searchRecipesPlaceholder', 'Search recipes, ingredients, creator...')}
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

          {/* Quick Tabs (Including Marketplace Tab) */}
          <div 
            className="p-1 rounded-2xl border flex items-center gap-1 self-start sm:self-auto shrink-0"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('my_recipes')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              style={activeTab === 'my_recipes' ? {
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff'
              } : {
                color: 'var(--color-text-secondary)'
              }}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{t('myRecipes', 'My Recipes')}</span>
            </button>

            {/* TAB: Marketplace (Public Recipes from All Users) */}
            <button
              type="button"
              onClick={() => setActiveTab('marketplace')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
              style={activeTab === 'marketplace' ? {
                backgroundColor: 'var(--color-emerald)',
                color: '#ffffff'
              } : {
                color: 'var(--color-emerald)'
              }}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{t('marketplaceTab', 'Marketplace')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
              style={activeTab === 'favorites' ? {
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff'
              } : {
                color: 'var(--color-text-secondary)'
              }}
            >
              <Heart className="h-3 w-3" />
              <span>{t('favorites', 'Favorites')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cooked')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
              style={activeTab === 'cooked' ? {
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff'
              } : {
                color: 'var(--color-text-secondary)'
              }}
            >
              <Check className="h-3 w-3" />
              <span>{t('cooked', 'Cooked')}</span>
            </button>
          </div>

          {/* Density Switcher */}
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
              >
                <d.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
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

          {cookbooks.length > 0 && activeTab !== 'marketplace' && (
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

          {/* Ingredient Popover */}
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
                  placeholder="Type ingredient..."
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
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Loading recipes...</p>
        </div>
      ) : paginatedRecipes.length === 0 ? (
        <div 
          className="py-20 rounded-3xl border text-center space-y-3"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <BookOpen className="h-10 w-10 mx-auto opacity-30" />
          <h3 className="font-extrabold text-base">
            {activeTab === 'marketplace' ? 'No public recipes found on Marketplace' : 'No recipes found in your collection'}
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            {activeTab === 'marketplace' 
              ? 'Be the first to share your recipe to the community Marketplace!' 
              : 'Try clearing search filters or import/create delicious new dishes to build your library.'}
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
            const isPub = recipe.isPublic || recipe.is_public;
            const userOwns = isOwner(recipe);
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
                      e.target.src = '/recipes/images/default.jpg';
                    }}
                  />

                  {/* Top Badges */}
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
                      {/* Marketplace Public / Private Sharing Toggle */}
                      {userOwns && (
                        <button
                          type="button"
                          onClick={(e) => handleTogglePublic(recipe, e)}
                          className="p-1.5 rounded-full border shadow-md transition hover:scale-110 cursor-pointer backdrop-blur-md"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: isPub ? 'var(--color-emerald)' : 'var(--color-border)',
                            color: isPub ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
                          }}
                          title={isPub ? 'Public in Marketplace (Click to make Private)' : 'Private (Click to Share to Marketplace)'}
                        >
                          {isPub ? <Globe className="h-3.5 w-3.5 stroke-[2.5]" /> : <Lock className="h-3.5 w-3.5" />}
                        </button>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(recipe, e)}
                        className="p-1.5 rounded-full border shadow-md transition hover:scale-110 cursor-pointer backdrop-blur-md"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: isFav ? '#ef4444' : 'var(--color-border)',
                          color: isFav ? '#ef4444' : 'var(--color-text)'
                        }}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current text-red-500' : ''}`} />
                      </button>

                      {/* Cooked Checkmark */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleCooked(recipe, e)}
                        className="p-1.5 rounded-full border shadow-md transition hover:scale-110 cursor-pointer backdrop-blur-md"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: isDone ? 'var(--color-emerald)' : 'var(--color-border)',
                          color: isDone ? 'var(--color-emerald)' : 'var(--color-text)'
                        }}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Creator Attribution (On Marketplace) & Stats */}
                  <div 
                    className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-xl flex items-center justify-between text-[10px] font-bold backdrop-blur-md border shadow-xs pointer-events-none"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff'
                    }}
                  >
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Clock className="h-3 w-3" /> {totalMins}m
                    </span>

                    {/* Creator Tag */}
                    {(recipe.creatorName || recipe.ownerName) && (
                      <span className="truncate max-w-[120px] text-amber-300 flex items-center gap-1">
                        <UserIcon className="h-2.5 w-2.5 shrink-0" /> {recipe.creatorName || recipe.ownerName}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {recipe.servings || 4} serv
                    </span>
                  </div>
                </div>

                {/* Recipe Body */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
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

                      {isPub && (
                        <span 
                          className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded border flex items-center gap-0.5 shrink-0"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-emerald)',
                            color: 'var(--color-emerald)'
                          }}
                          title="Visible on Marketplace"
                        >
                          <Globe className="h-2.5 w-2.5" /> Market
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {recipe.description || 'Delicious culinary creation with balanced nutrients.'}
                    </p>
                  </div>

                  {/* Card Actions Footer */}
                  <div 
                    className="pt-3 border-t flex items-center justify-between gap-1 text-xs"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-1">
                      {/* If on Marketplace and not owner: Allow saving to My Recipes */}
                      {activeTab === 'marketplace' && !userOwns ? (
                        <button
                          type="button"
                          onClick={(e) => handleSaveToMyRecipes(recipe, e)}
                          className="px-2 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-emerald)',
                            color: 'var(--color-emerald)'
                          }}
                          title="Save this marketplace recipe to your personal collection"
                        >
                          <Download className="h-3 w-3" /> Save
                        </button>
                      ) : (
                        <>
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

                          <button
                            type="button"
                            onClick={() => {
                              setBookTargetRecipe(recipe);
                              setSelectedBookId(recipe.bookId || (cookbooks[0]?.id || ''));
                              setShowBookModal(true);
                            }}
                            className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                            title="Add to Cookbook"
                          >
                            <FolderPlus className="h-3.5 w-3.5 text-sky-400" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShoppingRecipe(recipe);
                          setSelectedShoppingItems((recipe.ingredients || []).map(getIngredientString).filter(Boolean));
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

                      {userOwns && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecipe(recipe.id, recipe.title, e)}
                          className="p-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                          title="Delete Recipe"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination */}
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

      {/* 5. Kitchen Timer */}
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

      {/* 6. Recipe Details Modal */}
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
                <div className="flex items-center gap-2">
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

                  {/* Public / Private Badge */}
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: (selectedRecipe.isPublic || selectedRecipe.is_public) ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: (selectedRecipe.isPublic || selectedRecipe.is_public) ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
                    }}
                  >
                    {(selectedRecipe.isPublic || selectedRecipe.is_public) ? (
                      <><Globe className="h-3 w-3" /> Public on Marketplace</>
                    ) : (
                      <><Lock className="h-3 w-3" /> Private (Only You)</>
                    )}
                  </span>
                </div>

                <h2 className="text-xl font-black tracking-tight mt-1" style={{ color: 'var(--color-text)' }}>
                  {selectedRecipe.title}
                </h2>

                {(selectedRecipe.creatorName || selectedRecipe.ownerName) && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-emerald)' }}>
                    Author: {selectedRecipe.creatorName || selectedRecipe.ownerName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isOwner(selectedRecipe) && (
                  <button
                    type="button"
                    onClick={() => handleTogglePublic(selectedRecipe)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: (selectedRecipe.isPublic || selectedRecipe.is_public) ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: (selectedRecipe.isPublic || selectedRecipe.is_public) ? 'var(--color-emerald)' : 'var(--color-text)'
                    }}
                    title="Toggle public marketplace visibility"
                  >
                    {(selectedRecipe.isPublic || selectedRecipe.is_public) ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    <span>{(selectedRecipe.isPublic || selectedRecipe.is_public) ? 'Public' : 'Make Public'}</span>
                  </button>
                )}

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
                onError={(e: any) => { e.target.src = '/recipes/images/default.jpg'; }}
              />

              <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedRecipe.description}
              </p>

              {/* Servings Stepper */}
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

              {/* Ingredients */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    Ingredients ({selectedRecipe.ingredients?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShoppingRecipe(selectedRecipe);
                      setSelectedShoppingItems((selectedRecipe.ingredients || []).map(getIngredientString).filter(Boolean));
                      setShowShoppingModal(true);
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ShoppingCart className="h-3 w-3" /> + Add to Shopping List
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedRecipe.ingredients || []).map((rawIng, idx) => {
                    const displayStr = scaleIngredientQuantity(rawIng, selectedRecipe.servings || 4, modalServings);
                    return (
                      <div 
                        key={idx}
                        className="p-2.5 rounded-xl border flex items-center gap-2 shadow-2xs"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                        <span className="leading-snug">{displayStr}</span>
                      </div>
                    );
                  })}
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
                      <p className="flex-1">{getInstructionString(step)}</p>
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
                {!isOwner(selectedRecipe) ? (
                  <button
                    type="button"
                    onClick={(e) => handleSaveToMyRecipes(selectedRecipe, e)}
                    className="px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-emerald)' }}
                  >
                    <Download className="h-3.5 w-3.5" /> Save to My Recipes
                  </button>
                ) : (
                  <>
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
                        setSelectedBookId(selectedRecipe.bookId || (cookbooks[0]?.id || ''));
                        setShowBookModal(true);
                      }}
                      className="px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <FolderPlus className="h-3.5 w-3.5 text-sky-400" /> Book
                    </button>
                  </>
                )}
              </div>

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

      {/* 7. Add to Plan Modal (Constraint 9 Accessible <div> container) */}
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
              {(shoppingRecipe.ingredients || []).map((rawIng, i) => {
                const ing = getIngredientString(rawIng);
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
