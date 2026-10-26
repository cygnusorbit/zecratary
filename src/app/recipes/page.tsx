// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Filter, Heart, CheckCircle2, AlertCircle, ChefHat, 
  Clock, Users, ArrowUpRight, Sparkles, Plus, Trash2, Edit3, 
  ChevronLeft, ChevronRight, FileJson, Upload, X, Volume2, 
  Play, Pause, RotateCcw, Share2, Lock, Globe, HardDrive, 
  Cloud, RefreshCw, Tag, ExternalLink, Calendar, ShoppingCart, 
  BookOpen, GripVertical, ArrowUp, ArrowDown, BookmarkPlus, 
  ChevronDown, Check, Star, Type, ImagePlus, CheckSquare, Utensils, Save
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { IconGrid3x3, IconGrid4x4, IconGrid5x5 } from '@/components/GridDensityIcons';

type GridMode = '3x3' | '4x4' | '5x5';

const GRID_CONFIG: Record<GridMode, { perPage: number; gridClass: string; imageAspect: string }> = {
  '3x3': {
    perPage: 9,
    gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
    imageAspect: 'h-52'
  },
  '4x4': {
    perPage: 16,
    gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
    imageAspect: 'h-44'
  },
  '5x5': {
    perPage: 25,
    gridClass: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
    imageAspect: 'h-36'
  }
};

const RECIPE_TYPES = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetizer', 
  'Side Dish', 'Dessert', 'Snacks', 'Beverages', 'Soup', 'Salad'
];

const DEFAULT_CATEGORIES = [
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry Staples', 
  'Spices & Seasonings', 'Canned Goods', 'Grains & Pasta', 'Condiments & Sauces', 'Other'
];

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&#0*8211;/g, '–')
    .replace(/&#0*8212;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

export default function RecipesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const isSelfUpdatingRef = useRef(false);

  // Storage Settings Telemetry (Synced with /admin/storage)
  const [storageProvider, setStorageProvider] = useState<'local' | 'supabase'>('local');

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterCooked, setFilterCooked] = useState(false);
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedRating, setSelectedRating] = useState('ALL');
  const [selectedPrepTime, setSelectedPrepTime] = useState('ALL');
  const [selectedCookTime, setSelectedCookTime] = useState('ALL');
  const [selectedIngredientsList, setSelectedIngredientsList] = useState<string[]>([]);
  const [isIngredientPopoverOpen, setIsIngredientPopoverOpen] = useState(false);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');

  // Grid Density & Pagination States
  const [gridMode, setGridMode] = useState<GridMode>('3x3');
  const [currentPage, setCurrentPage] = useState(1);

  // Authentic Recipe Details Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Full-Featured In-Place Recipe Edit Studio Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editForm, setEditForm] = useState<any>({
    title: '', description: '', recipeType: 'Main Dish', sourceUrl: '',
    servings: 4, prepTimeMinutes: 30, cookTimeMinutes: 10, imageUrl: '',
    ingredients: [], instructions: []
  });
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sub-Modals (Add to Plan & Shopping List)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState(todayDateStr);
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planTime, setPlanTime] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  // Task 4: Interactive Import Recipe Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importImageFile, setImportImageFile] = useState<File | null>(null);
  const [importImagePreview, setImportImagePreview] = useState<string>('');
  const [importJsonFile, setImportJsonFile] = useState<File | null>(null);
  const [importedRecipeData, setImportedRecipeData] = useState<any | null>(null);
  const [isUploadingImportImage, setIsUploadingImportImage] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const importImageInputRef = useRef<HTMLInputElement | null>(null);
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);

  // Web Audio Kitchen Timer Widget
  const [activeTimer, setActiveTimer] = useState<{ running: boolean; remainingSeconds: number; initialSeconds: number } | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Sync Storage Engine with /admin/storage
  const fetchStorageSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/storage?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const s = data.storage || data.settings || data;
        const provider = s.provider || s.activeProvider || (s.supabase?.enabled ? 'supabase' : 'local');
        setStorageProvider(provider === 'supabase' ? 'supabase' : 'local');
      }
    } catch (_) {
      try {
        const adminRes = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
        if (adminRes.ok) {
          const adm = await adminRes.json();
          const s = adm.storage || adm.settings?.storage || {};
          if (s.provider) setStorageProvider(s.provider);
        }
      } catch (_) {}
    }
  }, []);

  // Web Audio Synthesizer Chime
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
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
    if (activeTimer && activeTimer.running && activeTimer.remainingSeconds > 0) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev) return null;
          if (prev.remainingSeconds <= 1) {
            playChimeSound();
            return { ...prev, running: false, remainingSeconds: 0 };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeTimer]);

  // Load Recipes from Multi-Source REST Endpoints & Local Hydration
  const loadData = useCallback(async (user: User | null, showSpinner = false) => {
    if (!user) return;
    if (isSelfUpdatingRef.current) return;
    if (showSpinner) setLoading(true);

    try {
      const targetUserId = (user.id || user.email || 'usr_admin_1').trim();
      const [savedRes, recipesRes, booksRes, catRes] = await Promise.allSettled([
        fetch(`/api/saved-recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/books?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/ingredient-categories?t=${Date.now()}`, { cache: 'no-store' })
      ]);

      let combined: any[] = [];
      if (savedRes.status === 'fulfilled' && savedRes.value.ok) {
        const data = await savedRes.value.json();
        const list = Array.isArray(data) ? data : data.recipes || [];
        combined.push(...list);
      }
      if (recipesRes.status === 'fulfilled' && recipesRes.value.ok) {
        const data = await recipesRes.value.json();
        const list = Array.isArray(data) ? data : data.recipes || [];
        combined.push(...list);
      }
      if (booksRes.status === 'fulfilled' && booksRes.value.ok) {
        const bData = await booksRes.value.json();
        setBooks(Array.isArray(bData) ? bData : bData.books || []);
      }
      if (catRes.status === 'fulfilled' && catRes.value.ok) {
        const cData = await catRes.value.json();
        const cList = Array.isArray(cData) ? cData : cData.categories || [];
        if (cList.length > 0) setCategories(cList.map((c: any) => typeof c === 'string' ? c : c.name || c.label));
      }

      // LocalStorage Fallback Hydration
      const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
      storageKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) combined.push(...parsed);
          }
        } catch (_) {}
      });

      // Deduplicate Recipes by ID
      const seen = new Set();
      const deduplicated: any[] = [];
      for (const item of combined) {
        if (!item || !item.id) continue;
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduplicated.push({
            ...item,
            title: decodeHtmlEntities(item.title || item.name || 'Untitled Recipe'),
            imageUrl: item.imageUrl || item.image || item.image_url || '/recipes/images/default.jpg',
            recipeType: item.recipeType || item.category || 'Main Dish',
            isFavorite: Boolean(item.isFavorite ?? item.is_favorite),
            isCooked: Boolean(item.isCooked ?? item.is_cooked),
            isPublic: Boolean(item.isPublic ?? item.is_public),
            servings: Number(item.servings) || 4,
            rating: Number(item.rating) || 5,
            note: item.note || item.notes || ''
          });
        }
      }

      setRecipes(deduplicated);
    } catch (_) {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('recipesTitle', 'Recipe Library')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadData(user, true);
    fetchStorageSettings();

    try {
      const savedGrid = localStorage.getItem('zecratary_recipe_grid_mode') as GridMode;
      if (savedGrid && GRID_CONFIG[savedGrid]) setGridMode(savedGrid);
    } catch (_) {}

    const handleSync = () => {
      const u = getCurrentUser();
      if (u) {
        setCurrentUser(u);
        loadData(u, false);
      }
      fetchStorageSettings();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_storage_settings_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_storage_settings_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [router, t, loadData, fetchStorageSettings]);

  const changeGridMode = (mode: GridMode) => {
    setGridMode(mode);
    try {
      localStorage.setItem('zecratary_recipe_grid_mode', mode);
    } catch (_) {}
    setCurrentPage(1);
  };

  const calculateScaledAmount = (rawAmt: any, baseServings: number, currentServings: number) => {
    if (!rawAmt || isNaN(Number(rawAmt))) {
      if (typeof rawAmt === 'string' && rawAmt.includes('/')) {
        try {
          const parts = rawAmt.trim().split(' ');
          let fractionValue = 0;
          if (parts.length === 2) {
            const [num, den] = parts[1].split('/').map(Number);
            fractionValue = Number(parts[0]) + (num / den);
          } else {
            const [num, den] = parts[0].split('/').map(Number);
            fractionValue = num / den;
          }
          const scaled = (fractionValue / (baseServings || 4)) * currentServings;
          return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
        } catch {
          return rawAmt;
        }
      }
      return rawAmt;
    }
    const num = Number(rawAmt);
    const scaled = (num / (baseServings || 4)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
  };

  const allAvailableIngredients = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => {
      if (Array.isArray(r.ingredients)) {
        r.ingredients.forEach((ing: any) => {
          const name = typeof ing === 'string' ? ing : ing.name || ing.item;
          if (name && typeof name === 'string') {
            const clean = name.trim().toLowerCase();
            if (clean.length > 1) set.add(clean);
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (r.title || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesNotes = (r.note || r.notes || '').toLowerCase().includes(q);
        const matchesIng = Array.isArray(r.ingredients) && r.ingredients.some((ing: any) => {
          const name = typeof ing === 'string' ? ing : ing.name || ing.item;
          return (name || '').toLowerCase().includes(q);
        });
        if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesIng) return false;
      }

      if (filterFavorites && !r.isFavorite) return false;
      if (filterCooked && !r.isCooked) return false;
      if (selectedType !== 'ALL' && r.recipeType !== selectedType) return false;

      if (selectedRating !== 'ALL') {
        const minRating = Number(selectedRating);
        if ((r.rating || 0) < minRating) return false;
      }

      if (selectedPrepTime !== 'ALL') {
        const prep = Number(r.prepTimeMinutes || r.prepTime || 0);
        if (selectedPrepTime === '15' && prep > 15) return false;
        if (selectedPrepTime === '30' && prep > 30) return false;
        if (selectedPrepTime === '60' && prep > 60) return false;
        if (selectedPrepTime === '60+' && prep <= 60) return false;
      }

      if (selectedCookTime !== 'ALL') {
        const cook = Number(r.cookTimeMinutes || r.cookTime || 0);
        if (selectedCookTime === '15' && cook > 15) return false;
        if (selectedCookTime === '30' && cook > 30) return false;
        if (selectedCookTime === '60' && cook > 60) return false;
        if (selectedCookTime === '60+' && cook <= 60) return false;
      }

      if (selectedIngredientsList.length > 0) {
        const recIngs = Array.isArray(r.ingredients)
          ? r.ingredients.map((i: any) => (typeof i === 'string' ? i : i.name || i.item || '').toLowerCase())
          : [];
        const hasAll = selectedIngredientsList.every(req => recIngs.some(ri => ri.includes(req.toLowerCase())));
        if (!hasAll) return false;
      }

      return true;
    });
  }, [recipes, search, filterFavorites, filterCooked, selectedType, selectedRating, selectedPrepTime, selectedCookTime, selectedIngredientsList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterFavorites, filterCooked, selectedType, selectedRating, selectedPrepTime, selectedCookTime, selectedIngredientsList, gridMode]);

  const itemsPerPage = GRID_CONFIG[gridMode].perPage;
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + itemsPerPage);

  const handleToggleFavorite = async (e: React.MouseEvent, recipe: any) => {
    e.stopPropagation();
    isSelfUpdatingRef.current = true;
    const newFav = !recipe.isFavorite;
    const updated = { ...recipe, isFavorite: newFav, is_favorite: newFav };

    setRecipes(prev => prev.map(r => r.id === recipe.id ? updated : r));
    if (selectedRecipe && selectedRecipe.id === recipe.id) setSelectedRecipe(updated);

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, isFavorite: newFav, is_favorite: newFav })
      });
    } catch (_) {} finally {
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 300);
    }
  };

  const handleToggleCooked = async (e: React.MouseEvent, recipe: any) => {
    e.stopPropagation();
    isSelfUpdatingRef.current = true;
    const newCooked = !recipe.isCooked;
    const updated = { ...recipe, isCooked: newCooked, is_cooked: newCooked };

    setRecipes(prev => prev.map(r => r.id === recipe.id ? updated : r));
    if (selectedRecipe && selectedRecipe.id === recipe.id) setSelectedRecipe(updated);

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, isCooked: newCooked, is_cooked: newCooked })
      });
    } catch (_) {} finally {
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 300);
    }
  };

  const handleTogglePublic = async (e: React.MouseEvent, recipe: any) => {
    e.stopPropagation();
    const newStatus = !recipe.isPublic;
    const updated = { ...recipe, isPublic: newStatus, is_public: newStatus };

    setRecipes(prev => prev.map(r => r.id === recipe.id ? updated : r));
    if (selectedRecipe && selectedRecipe.id === recipe.id) setSelectedRecipe(updated);

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, isPublic: newStatus, is_public: newStatus })
      });
    } catch (_) {}
  };

  const handleAssignToBook = async (bookId: string) => {
    if (!selectedRecipe) return;
    const isRemoving = selectedRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...selectedRecipe, bookId: targetBookId };
    setSelectedRecipe(updatedRecipe);

    setRecipes(prev => prev.map(r => r.id === selectedRecipe.id ? updatedRecipe : r));

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRecipe.id, bookId: targetBookId, book_id: targetBookId })
      });
    } catch (_) {}

    const bookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    showToast(isRemoving ? `Removed from "${bookTitle}"` : `Added to "${bookTitle}"!`, 'success');
  };

  const updateSelectedRecipeState = async (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    setRecipes(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));

    try {
      await fetch('/api/recipes/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRecipe.id, [key]: val })
      });
    } catch (_) {}
  };

  const handleSaveToCalendar = async () => {
    if (!selectedRecipe || !currentUser) return;
    try {
      const localPlan = localStorage.getItem('zecratary_meal_plan');
      const currentPlan = localPlan ? JSON.parse(localPlan) : [];

      const newPlanItem = {
        id: 'plan_' + Date.now(),
        userId: currentUser.id,
        createdBy: currentUser.email,
        creatorName: currentUser.name,
        date: planDate,
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.title || selectedRecipe.name,
        image: selectedRecipe.imageUrl || selectedRecipe.image || '/recipes/images/default.jpg',
        mealType: planMealType,
        time: planTime,
        notes: planNotes,
        isLeftover: false
      };

      const updatedPlan = [...currentPlan, newPlanItem];
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(updatedPlan));

      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, meals: updatedPlan })
      });

      window.dispatchEvent(new Event('zecratary_planner_updated'));
      window.dispatchEvent(new Event('storage'));
      setShowAddToPlanModal(false);
      showToast(t('mealScheduledToast', 'Recipe scheduled in your meal planner!'), 'success');
    } catch (_) {}
  };

  const handleOpenShoppingModal = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    const baseServings = selectedRecipe.servings || 4;
    const totalServings = baseServings * servingsMultiplier;

    const items = (selectedRecipe.ingredients || []).map((ing: any, idx: number) => {
      const rawAmt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
      const scaledAmt = calculateScaledAmount(rawAmt, baseServings, totalServings);
      return {
        id: 'shop_item_' + idx,
        selected: true,
        amount: scaledAmt,
        unit: typeof ing === 'string' ? '' : ing.unit || '',
        name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
        category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
      };
    });
    setShoppingModalIngredients(items);
    setIsShoppingModalOpen(true);
  };

  const handleConfirmAddToShoppingList = () => {
    const selectedItems = shoppingModalIngredients.filter(i => i.selected);
    if (selectedItems.length === 0) return;
    const local = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const current = local ? JSON.parse(local) : [];
    const formatted = selectedItems.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      userId: currentUser?.id,
      createdBy: currentUser?.email,
      creatorName: currentUser?.name,
      name: i.name,
      amount: i.amount || '1',
      unit: i.unit || 'unit',
      category: i.category,
      checked: false
    }));
    const updated = [...formatted, ...current];
    localStorage.setItem('zecratary_shopping', JSON.stringify(updated));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
    setIsShoppingModalOpen(false);
    showToast(t('addedToShoppingListToast', 'Ingredients added to your shopping list!'), 'success');
  };

  // Recipe Edit Studio Open & Handlers
  const handleOpenEdit = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    const rawIngs = selectedRecipe.ingredients || [];
    setEditForm({
      title: selectedRecipe.title || selectedRecipe.name || '',
      description: selectedRecipe.description || '',
      recipeType: selectedRecipe.recipeType || selectedRecipe.tags?.[0] || 'Main Dish',
      sourceUrl: selectedRecipe.sourceUrl || selectedRecipe.source_url || '',
      servings: selectedRecipe.servings || 4,
      prepTimeMinutes: selectedRecipe.prepTimeMinutes || selectedRecipe.prepTime || 30,
      cookTimeMinutes: selectedRecipe.cookTimeMinutes || selectedRecipe.cookTime || 10,
      imageUrl: selectedRecipe.imageUrl || selectedRecipe.image || '',
      ingredients: rawIngs.length > 0
        ? rawIngs.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
          }))
        : [{ amount: '', unit: '', item: '', category: defaultCat }],
      instructions: selectedRecipe.instructions && selectedRecipe.instructions.length > 0
        ? [...selectedRecipe.instructions]
        : selectedRecipe.steps && selectedRecipe.steps.length > 0
          ? [...selectedRecipe.steps]
          : ['']
    });
    setEditTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) {
      showToast(t('enterRecipeTitleAlert', 'Please enter a recipe title before saving.'), 'error');
      setEditTab('info');
      return;
    }

    const updatedRec = {
      ...selectedRecipe,
      ...editForm,
      title: editForm.title.trim(),
      recipeType: editForm.recipeType,
      category: editForm.recipeType,
      tags: [editForm.recipeType]
    };

    setSelectedRecipe(updatedRec);
    setRecipes(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));
    setIsEditing(false);

    try {
      await Promise.allSettled([
        fetch('/api/recipes/saved', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRec)
        }),
        fetch('/api/recipes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRec)
        })
      ]);
      showToast(t('saveChanges', 'Recipe updated successfully!'), 'success');
    } catch (_) {}
  };

  const handleExportJson = (recipe: any) => {
    try {
      const exportData = {
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        id: recipe.id,
        ownership: recipe.ownership || {
          userId: recipe.userId || recipe.user_id,
          createdBy: recipe.createdBy || recipe.created_by,
          creatorName: recipe.creatorName || recipe.creator_name,
          isPublic: Boolean(recipe.isPublic ?? recipe.is_public)
        },
        owner: recipe.owner || recipe.creatorName || 'Chef',
        ownerId: recipe.ownerId || recipe.userId || recipe.user_id,
        ownerName: recipe.ownerName || recipe.creatorName,
        ownerEmail: recipe.ownerEmail || recipe.createdBy || recipe.created_by,
        userId: recipe.userId || recipe.user_id,
        createdBy: recipe.createdBy || recipe.created_by,
        creatorName: recipe.creatorName || recipe.creator_name,
        title: recipe.title || recipe.name,
        name: recipe.title || recipe.name,
        description: recipe.description || '',
        recipeType: recipe.recipeType || recipe.category || 'Main Dish',
        category: recipe.category || recipe.recipeType || 'Main Dish',
        servings: Number(recipe.servings) || 4,
        prepTimeMinutes: Number(recipe.prepTimeMinutes || recipe.prepTime) || 15,
        cookTimeMinutes: Number(recipe.cookTimeMinutes || recipe.cookTime) || 25,
        calories: Number(recipe.calories) || 0,
        proteinGrams: Number(recipe.proteinGrams) || 0,
        carbsGrams: Number(recipe.carbsGrams) || 0,
        fatGrams: Number(recipe.fatGrams) || 0,
        imageUrl: recipe.imageUrl || recipe.image || recipe.image_url || '',
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || recipe.steps || recipe.directions || [],
        tags: recipe.tags || [recipe.recipeType || 'Main Dish'],
        sourceUrl: recipe.sourceUrl || recipe.source_url || '',
        isPublic: Boolean(recipe.isPublic ?? recipe.is_public)
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = (recipe.title || 'recipe').toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.href = url;
      link.download = `${safeTitle}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(t('jsonExportedSuccessToast', 'Recipe exported as JSON file successfully!'), 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export recipe JSON', 'error');
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm(t('confirmDeleteRecipe', 'Are you sure you want to delete this recipe?'))) return;

    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    if (selectedRecipe && selectedRecipe.id === recipeId) setSelectedRecipe(null);

    try {
      await Promise.allSettled([
        fetch(`/api/recipes/saved?id=${encodeURIComponent(recipeId)}`, { method: 'DELETE' }),
        fetch(`/api/recipes?id=${encodeURIComponent(recipeId)}`, { method: 'DELETE' })
      ]);
      const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
      storageKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            localStorage.setItem(k, JSON.stringify(list.filter((r: any) => r.id !== recipeId)));
          }
        } catch (_) {}
      });
      showToast(t('recipeDeletedToast', 'Recipe removed from your library.'), 'success');
    } catch (_) {}
  };

  const handleImportImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(t('uploadOrDragHint', 'Supports PNG, JPG, WEBP (Max 10MB)'), 'error');
      return;
    }
    setImportImageFile(file);
    setIsUploadingImportImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', storageProvider);

      const res = await fetch('/api/recipes/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && (data.url || data.localUrl || data.path)) {
        setImportImagePreview(data.url || data.localUrl || data.path);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => setImportImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } catch (_) {
      const reader = new FileReader();
      reader.onloadend = () => setImportImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImportImage(false);
    }
  };

  const handleImportJsonFile = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showToast(t('noJsonFileSelected', 'Please select a valid recipe JSON file before importing.'), 'error');
      return;
    }
    setImportJsonFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format');
        }
        setImportedRecipeData(parsed);
        showToast(t('jsonLoadedSuccess', 'Recipe JSON loaded successfully!'), 'success');
      } catch (err: any) {
        showToast(t('jsonParseError', 'Failed to parse JSON file. Please ensure it is a valid recipe JSON.'), 'error');
        setImportedRecipeData(null);
        setImportJsonFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importedRecipeData) {
      showToast(t('noJsonFileSelected', 'Please select a valid recipe JSON file before importing.'), 'error');
      return;
    }

    setIsImporting(true);
    try {
      const targetUserId = (currentUser?.id || currentUser?.email || 'usr_admin_1').trim();
      const createdBy = (currentUser?.email || targetUserId).trim();
      const creatorName = (currentUser?.name || 'Chef').trim();

      const recipeId = importedRecipeData.id || ('rcp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      let finalImageUrl = importImagePreview || importedRecipeData.imageUrl || importedRecipeData.image || importedRecipeData.image_url || '/recipes/images/default.jpg';

      if (!importImagePreview && (finalImageUrl.startsWith('http://') || finalImageUrl.startsWith('https://'))) {
        try {
          const dlRes = await fetch('/api/recipes/save-remote-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: finalImageUrl })
          });
          const dlData = await dlRes.json();
          if (dlData.success && (dlData.localPath || dlData.localUrl)) {
            finalImageUrl = dlData.localPath || dlData.localUrl;
          }
        } catch (_) {}
      }

      const cleanTitle = decodeHtmlEntities(importedRecipeData.title || importedRecipeData.name || 'Imported Recipe');
      const cleanType = importedRecipeData.recipeType || importedRecipeData.category || 'Main Dish';

      const normalizedRecipe = {
        ...importedRecipeData,
        id: recipeId,
        title: cleanTitle,
        name: cleanTitle,
        description: importedRecipeData.description || '',
        userId: targetUserId,
        user_id: targetUserId,
        createdBy,
        created_by: createdBy,
        creatorName,
        creator_name: creatorName,
        ownership: importedRecipeData.ownership || {
          userId: targetUserId,
          createdBy,
          creatorName,
          isPublic: Boolean(importedRecipeData.isPublic ?? importedRecipeData.is_public)
        },
        recipeType: cleanType,
        category: cleanType,
        imageUrl: finalImageUrl,
        image: finalImageUrl,
        image_url: finalImageUrl,
        servings: Number(importedRecipeData.servings) || 4,
        prepTimeMinutes: Number(importedRecipeData.prepTimeMinutes || importedRecipeData.prepTime) || 15,
        cookTimeMinutes: Number(importedRecipeData.cookTimeMinutes || importedRecipeData.cookTime) || 25,
        ingredients: Array.isArray(importedRecipeData.ingredients) ? importedRecipeData.ingredients : [],
        instructions: Array.isArray(importedRecipeData.instructions) 
          ? importedRecipeData.instructions 
          : Array.isArray(importedRecipeData.steps) 
            ? importedRecipeData.steps 
            : Array.isArray(importedRecipeData.directions) 
              ? importedRecipeData.directions 
              : ['Follow standard chef cooking guidelines.'],
        isFavorite: false,
        isCooked: false,
        rating: Number(importedRecipeData.rating) || 5,
        storageProvider,
        createdAt: new Date().toISOString()
      };

      await Promise.allSettled([
        fetch('/api/saved-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedRecipe)
        }),
        fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedRecipe)
        })
      ]);

      setRecipes(prev => [normalizedRecipe, ...prev.filter(r => r.id !== normalizedRecipe.id)]);
      const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
      storageKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          const currentList = raw ? JSON.parse(raw) : [];
          const filtered = Array.isArray(currentList) ? currentList.filter((r: any) => r.id !== normalizedRecipe.id) : [];
          localStorage.setItem(k, JSON.stringify([normalizedRecipe, ...filtered]));
        } catch (_) {}
      });

      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      window.dispatchEvent(new Event('storage'));

      setIsImportModalOpen(false);
      setImportImageFile(null);
      setImportImagePreview('');
      setImportJsonFile(null);
      setImportedRecipeData(null);
      showToast(t('recipeImportSuccessToast', 'Recipe imported successfully into your library!'), 'success');
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const assignedBook = books.find(b => b.id === selectedRecipe?.bookId);
  const baseServings = selectedRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;

  return (
    <div 
      id="zecratary-recipes-canvas"
      role="region"
      aria-label={t('savedRecipesTitle', 'Recipe Library')}
      data-lpignore="true"
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        color: 'var(--color-text)' 
      }}
    >
      {/* Toast Banner */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toastMessage.type === 'success' 
              ? 'var(--color-emerald)' 
              : toastMessage.type === 'warning' 
                ? '#f59e0b' 
                : '#ef4444',
            color: 'var(--color-text)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Action Toolbar */}
      <div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <ChefHat className="h-6 w-6" /> {t('recipesTitle', 'Recipe Library')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('savedRecipesSubtitle', 'Browse, filter, and organize your favorite culinary creations and meal plans.')}
          </p>
        </div>

        {/* Action Cluster: Exact 3x3, 4x4, 5x5 Grid Switcher + Import/Create */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            role="group"
            aria-label="Grid layout density switcher"
            className="flex items-center p-1 rounded-xl border shadow-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => changeGridMode('3x3')}
              className="p-1.5 rounded-lg transition cursor-pointer"
              style={gridMode === '3x3' ? { backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              title={t('grid3x3', '3x3 Grid (9 per page)')}
            >
              <IconGrid3x3 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => changeGridMode('4x4')}
              className="p-1.5 rounded-lg transition cursor-pointer"
              style={gridMode === '4x4' ? { backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              title={t('grid4x4', '4x4 Grid (16 per page)')}
            >
              <IconGrid4x4 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => changeGridMode('5x5')}
              className="p-1.5 rounded-lg transition cursor-pointer"
              style={gridMode === '5x5' ? { backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              title={t('grid5x5', '5x5 Grid (25 per page)')}
            >
              <IconGrid5x5 className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-85"
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Upload className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>{t('importRecipe', 'Import Recipe')}</span>
          </button>

          <Link
            href="/manual"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-md hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('createRecipe', 'Create Recipe')}</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div 
        role="region"
        data-lpignore="true"
        className="w-full max-w-full rounded-2xl p-4 border space-y-3 shadow-xs transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div 
            className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              placeholder={t('searchRecipesPlaceholder', 'Search saved recipes by title, ingredients, tags, or notes...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-medium"
              style={{ color: 'var(--color-text)' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterFavorites(!filterFavorites)}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer"
              style={filterFavorites ? {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                color: '#ef4444'
              } : {
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <Heart className={`h-3.5 w-3.5 ${filterFavorites ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{t('filterFavorites', 'Favorites')}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCooked(!filterCooked)}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer"
              style={filterCooked ? {
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald)',
                color: 'var(--color-emerald)'
              } : {
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t('filterCooked', 'Cooked')}</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsIngredientPopoverOpen(!isIngredientPopoverOpen)}
                className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer"
                style={selectedIngredientsList.length > 0 ? {
                  backgroundColor: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  color: '#ffffff'
                } : {
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>{t('filterByIngredient', 'Filter by Ingredient')}</span>
                {selectedIngredientsList.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-black font-extrabold text-[10px] flex items-center justify-center">
                    {selectedIngredientsList.length}
                  </span>
                )}
              </button>

              {isIngredientPopoverOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 p-3.5 rounded-2xl border shadow-2xl z-40 space-y-3 animate-in fade-in"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{t('filterByIngredient', 'Filter by Ingredient')}</span>
                    {selectedIngredientsList.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setSelectedIngredientsList([])}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        {t('clearAllFilters', 'Clear all filters')}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={t('ingredientPlaceholder', 'Type ingredient...')}
                    value={ingredientSearchQuery}
                    onChange={(e) => setIngredientSearchQuery(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs outline-none font-medium"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {allAvailableIngredients
                      .filter(ing => ing.includes(ingredientSearchQuery.toLowerCase()))
                      .map(ing => {
                        const isChecked = selectedIngredientsList.includes(ing);
                        return (
                          <div 
                            key={ing}
                            onClick={() => {
                              setSelectedIngredientsList(prev => isChecked ? prev.filter(x => x !== ing) : [...prev, ing]);
                            }}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:opacity-80 cursor-pointer"
                            style={{ backgroundColor: isChecked ? 'var(--color-inner-dark)' : 'transparent' }}
                          >
                            <input type="checkbox" checked={isChecked} readOnly className="cursor-pointer" />
                            <span className="capitalize" style={{ color: 'var(--color-text)' }}>{ing}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="ALL">{t('allTypes', 'All Types')}</option>
            {RECIPE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="ALL">{t('allRatings', 'All Ratings')}</option>
            <option value="5">★★★★★ (5 Stars)</option>
            <option value="4">★★★★☆ (4+ Stars)</option>
            <option value="3">★★★☆☆ (3+ Stars)</option>
          </select>

          <select
            value={selectedPrepTime}
            onChange={(e) => setSelectedPrepTime(e.target.value)}
            className="w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="ALL">{t('allPrepTimes', 'All Prep Times')}</option>
            <option value="15">{t('under15Mins', 'Under 15 mins')}</option>
            <option value="30">{t('under30Mins', 'Under 30 mins')}</option>
            <option value="60">{t('under60Mins', 'Under 60 mins')}</option>
            <option value="60+">{t('over60Mins', '60+ mins')}</option>
          </select>

          <select
            value={selectedCookTime}
            onChange={(e) => setSelectedCookTime(e.target.value)}
            className="w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="ALL">{t('allCookTimes', 'All Cook Times')}</option>
            <option value="15">{t('under15Mins', 'Under 15 mins')}</option>
            <option value="30">{t('under30Mins', 'Under 30 mins')}</option>
            <option value="60">{t('under60Mins', 'Under 60 mins')}</option>
            <option value="60+">{t('over60Mins', '60+ mins')}</option>
          </select>
        </div>
      </div>

      {/* Recipe Grid View */}
      {paginatedRecipes.length === 0 ? (
        <div 
          className="w-full max-w-full rounded-3xl p-12 text-center border space-y-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <ChefHat className="h-12 w-12 mx-auto stroke-1" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {t('noRecipesFound', 'No recipes found matching your criteria.')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterFavorites(false);
              setFilterCooked(false);
              setSelectedType('ALL');
              setSelectedRating('ALL');
              setSelectedPrepTime('ALL');
              setSelectedCookTime('ALL');
              setSelectedIngredientsList([]);
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t('clearAllFilters', 'Clear all filters')}
          </button>
        </div>
      ) : (
        <div className={GRID_CONFIG[gridMode].gridClass}>
          {paginatedRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => {
                setSelectedRecipe(recipe);
                setServingsMultiplier(1);
                setCompletedSteps([]);
                setNoteText(recipe.note || recipe.notes || '');
                setIsBookDropdownOpen(false);
                setIsEditing(false);
              }}
              className="group rounded-3xl overflow-hidden border transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl cursor-pointer flex flex-col"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              {/* Card Image Banner */}
              <div className={`relative w-full ${GRID_CONFIG[gridMode].imageAspect} overflow-hidden bg-black/20`}>
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition transform group-hover:scale-105 duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/recipes/images/default.jpg';
                  }}
                />

                <span 
                  className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', color: '#ffffff' }}
                >
                  {recipe.recipeType}
                </span>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, recipe)}
                    className="p-2 rounded-xl backdrop-blur-md transition cursor-pointer shadow-sm hover:scale-110"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
                    title={t('filterFavorites', 'Favorites')}
                  >
                    <Heart className={`h-4 w-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleToggleCooked(e, recipe)}
                    className="p-2 rounded-xl backdrop-blur-md transition cursor-pointer shadow-sm hover:scale-110"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
                    title={t('filterCooked', 'Cooked')}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${recipe.isCooked ? 'text-emerald-400' : 'text-white'}`} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-sm tracking-tight line-clamp-1" style={{ color: 'var(--color-text)' }}>
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-[11px] line-clamp-2 mt-1 opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                      {recipe.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-semibold opacity-90" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                    {(Number(recipe.prepTimeMinutes || recipe.prepTime || 0) + Number(recipe.cookTimeMinutes || recipe.cookTime || 0))}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                    {recipe.servings || 4}
                  </span>
                </div>

                <div 
                  className="pt-2 border-t flex items-center justify-between gap-1 text-[11px]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={(e) => handleTogglePublic(e, recipe)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer"
                    style={recipe.isPublic ? {
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: 'var(--color-emerald)',
                      color: 'var(--color-emerald)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title={recipe.isPublic ? t('publicMarketplace', 'Public Marketplace') : t('privateRecipe', 'Private Recipe')}
                  >
                    {recipe.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    <span>{recipe.isPublic ? t('publicMarketplace', 'Public') : t('privateRecipe', 'Private')}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleExportJson(recipe); }}
                      className="px-2 py-1 rounded-lg text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-emerald)' }}
                      title={t('exportJsonBtn', 'Export JSON')}
                    >
                      <FileJson className="h-3 w-3" />
                      <span>JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                      title={t('deleteRecipe', 'Delete Recipe')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-xs font-bold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <div>
            {(t('showingRecipesRange', 'Showing {start} - {end} of {total} recipes'))
              .replace('{start}', String(startIndex + 1))
              .replace('{end}', String(Math.min(startIndex + itemsPerPage, filteredRecipes.length)))
              .replace('{total}', String(filteredRecipes.length))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              const isCurr = p === safeCurrentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer"
                  style={isCurr ? {
                    backgroundColor: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    color: '#ffffff'
                  } : {
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RESTORED 100% AUTHENTIC RECIPE DETAILS & IN-PLACE EDIT MODAL       */}
      {/* ------------------------------------------------------------------ */}
      {selectedRecipe && (
        <div 
          onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            role="region"
            data-lpignore="true"
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              type="button"
              onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2 bg-black/70 hover:bg-black text-white rounded-xl border border-white/20 transition cursor-pointer"
            >
              <X className="h-5 w-5"/>
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditing ? (
                /* AUTHENTIC RECIPE DETAILS VIEW */
                <div className="space-y-5 pb-6">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden flex flex-col justify-end p-5" style={{ backgroundColor: 'var(--color-inner-dark)' }}>
                    <img
                      src={selectedRecipe.imageUrl || selectedRecipe.image || '/recipes/images/default.jpg'}
                      alt={selectedRecipe.title || selectedRecipe.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {selectedRecipe.title || selectedRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="bg-black/60 border border-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300"/> Cook: {selectedRecipe.cookTimeMinutes || selectedRecipe.cookTime || 10}m
                        </span>
                        <span className="bg-black/60 border border-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300"/> Prep: {selectedRecipe.prepTimeMinutes || selectedRecipe.prepTime || 30}m
                        </span>
                        <span className="bg-black/60 border border-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5 text-slate-300"/> {selectedRecipe.tags?.[0] || selectedRecipe.recipeType || 'Main Dish'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, selectedRecipe)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow cursor-pointer transition transform hover:scale-105"
                          title={t('filterFavorites', 'Favorites')}
                        >
                          <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`}/>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                        className="w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        style={{
                          backgroundColor: assignedBook ? 'rgba(224, 86, 56, 0.15)' : 'var(--color-inner-dark)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0"/>
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : t('addToBook', 'Add to Book')}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5"/>
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div 
                            className="absolute left-0 top-full mt-2 w-64 border rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in"
                            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                              <span>{t('selectCookbook', 'Select Cookbook')}</span>
                              <Link className="hover:underline" style={{ color: 'var(--color-primary)' }} href="/books">
                                {t('manage', 'Manage')}
                              </Link>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs px-2.5 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                                  {t('noCookbooksAvailable', 'No cookbooks available')}
                                </div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = selectedRecipe.bookId === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        handleAssignToBook(b.id);
                                        setIsBookDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                                      style={{
                                        backgroundColor: isAssigned ? 'rgba(224, 86, 56, 0.15)' : 'transparent',
                                        color: isAssigned ? 'var(--color-primary)' : 'var(--color-text)'
                                      }}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }}/>}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddToPlanModal(true)}
                      className="border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      <Calendar className="h-4 w-4"/> {t('addToPlan', 'Add to Plan')}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenShoppingModal}
                      className="border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      <ShoppingCart className="h-4 w-4"/> {t('shoppingList', 'Shopping List')}
                    </button>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Servings Stepper & Tools */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                        <Users className="h-4 w-4"/> {t('servings', 'Servings')}
                      </span>
                      <div className="flex items-center border rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-2.5 py-1 font-bold cursor-pointer transition hover:bg-white/10"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold min-w-[32px] text-center font-mono" style={{ color: 'var(--color-text)' }}>
                          {currentTotalServings}
                        </span>
                        <button
                          type="button"
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-2.5 py-1 font-bold cursor-pointer transition hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTimer({ running: true, remainingSeconds: (selectedRecipe.cookTimeMinutes || 15) * 60, initialSeconds: (selectedRecipe.cookTimeMinutes || 15) * 60 })}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)', backgroundColor: 'var(--color-inner-dark)' }}
                      >
                        <Volume2 className="h-3.5 w-3.5"/> {t('timer', 'Timer')}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)', backgroundColor: 'var(--color-inner-dark)' }}
                      >
                        <Edit3 className="h-3.5 w-3.5"/> {t('edit', 'Edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Recipe link copied to clipboard!', 'success');
                        }}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)', backgroundColor: 'var(--color-inner-dark)' }}
                      >
                        <Share2 className="h-3.5 w-3.5"/> {t('share', 'Share')}
                      </button>
                    </div>
                  </div>

                  {/* Active Floating Timer (if running) */}
                  {activeTimer && (
                    <div 
                      className="mx-5 p-3 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-2 font-mono text-sm font-black" style={{ color: 'var(--color-text)' }}>
                        <Volume2 className="h-4 w-4 animate-pulse" style={{ color: 'var(--color-primary)' }} />
                        <span>
                          {String(Math.floor(activeTimer.remainingSeconds / 60)).padStart(2, '0')}:
                          {String(activeTimer.remainingSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTimer({ ...activeTimer, running: !activeTimer.running })}
                          className="p-1 rounded-lg border text-xs font-bold"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          {activeTimer.running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTimer(null)}
                          className="p-1 rounded-lg border text-xs font-bold text-red-400"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedRecipe.description && (
                    <div className="px-5 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedRecipe.description}
                    </div>
                  )}

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Cooked Status / Star Rating / Note */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => handleToggleCooked(e, selectedRecipe)}
                        className="flex items-center gap-2.5 text-base font-extrabold group cursor-pointer select-none transition"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <span>
                          {selectedRecipe.isCooked ? t('cooked', 'Cooked') : t('markAsCooked', 'Mark as Cooked')}
                        </span>
                        
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center transition shadow-sm ${
                          selectedRecipe.isCooked 
                            ? 'bg-emerald-500 text-white' 
                            : 'border border-slate-600 bg-transparent text-transparent'
                        }`}>
                          {selectedRecipe.isCooked && <Check className="h-3.5 w-3.5 stroke-[3]"/>}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateSelectedRecipeState('rating', star)}
                            className={`h-5 w-5 cursor-pointer transition ${
                              (selectedRecipe.rating || 0) >= star
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-medium transition cursor-pointer"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Edit3 className="h-3.5 w-3.5"/>
                        <span className="italic">{t('addANote', 'Add a note')}</span>
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2 animate-in fade-in">
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 border rounded-xl px-3 py-2 text-xs outline-none"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {selectedRecipe.note && !isNoteOpen && (
                        <p className="text-xs italic font-medium" style={{ color: 'var(--color-primary)' }}>
                          Note: "{selectedRecipe.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* INGREDIENTS SECTION */}
                  <div className="px-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>
                        {t('ingredients', 'Ingredients')}
                      </h3>
                      
                      <div className="flex items-center border rounded-lg overflow-hidden text-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                        <div className="px-2.5 py-1 border-r flex items-center justify-center" style={{ borderColor: 'var(--color-border)' }}>
                          <Type className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }}/>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(Math.max(60, fontSizeScale - 10))}
                          className="px-2.5 py-1 font-bold cursor-pointer hover:bg-white/10"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-1 font-bold min-w-[42px] text-center font-mono" style={{ color: 'var(--color-text)' }}>
                          {fontSizeScale}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                          className="px-2.5 py-1 font-bold cursor-pointer hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5" style={{ fontSize: `${fontSizeScale}%` }}>
                      {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, idx: number) => {
                        const rawAmt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                        const scaledAmt = calculateScaledAmount(rawAmt, baseServings, currentTotalServings);
                        const unit = typeof ing === 'string' ? '' : ing.unit || '';
                        const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        return (
                          <div key={idx} className="flex items-start gap-2.5 leading-snug">
                            <span className="w-2 h-2 rounded-full inline-block shrink-0 mt-1.5" style={{ backgroundColor: 'var(--color-primary)' }} />
                            <span style={{ color: 'var(--color-text)' }}>
                              {(scaledAmt !== '' || unit) && (
                                <strong className="font-semibold">
                                  {scaledAmt} {unit && unit !== 'Unit' ? unit : ''}{' '}
                                </strong>
                              )}
                              <span>{name}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* INSTRUCTIONS SECTION */}
                  <div className="px-5 space-y-4">
                    <h3 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>
                      {t('instructions', 'Instructions')}
                    </h3>
                    
                    <div className="space-y-3.5" style={{ fontSize: `${fontSizeScale}%` }}>
                      {Array.isArray(selectedRecipe.instructions || selectedRecipe.steps) && (selectedRecipe.instructions || selectedRecipe.steps).map((step: any, idx: number) => {
                        const stepText = typeof step === 'string' ? step : step.text || step.step || '';
                        const isDone = completedSteps.includes(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (completedSteps.includes(idx)) {
                                setCompletedSteps(completedSteps.filter(i => i !== idx));
                              } else {
                                setCompletedSteps([...completedSteps, idx]);
                              }
                            }}
                            className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${
                              isDone ? 'opacity-50' : 'hover:scale-[1.005]'
                            }`}
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: isDone ? 'var(--color-emerald)' : 'var(--color-border)'
                            }}
                          >
                            <div 
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                isDone ? 'text-white' : 'bg-transparent'
                              }`}
                              style={{
                                borderColor: 'var(--color-primary)',
                                backgroundColor: isDone ? 'var(--color-primary)' : 'transparent'
                              }}
                            >
                              {isDone && <Check className="h-3 w-3 stroke-[3]"/>}
                            </div>

                            <span className="font-extrabold shrink-0 text-sm" style={{ color: 'var(--color-primary)' }}>
                              {idx + 1}.
                            </span>

                            <span className={`leading-relaxed flex-1 ${isDone ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--color-text)' }}>
                              {stepText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* MODAL FOOTER: SOURCE AT BOTTOM RIGHT + DELETE & EXPORT */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                        className="border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-950/30 cursor-pointer transition"
                      >
                        <Trash2 className="h-3.5 w-3.5"/> {t('deleteRecipe', 'Delete Recipe')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportJson(selectedRecipe)}
                        className="px-3.5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-xs transition hover:opacity-90 cursor-pointer"
                        style={{ backgroundColor: 'var(--color-emerald)' }}
                        title={t('exportJsonBtn', 'Export JSON')}
                      >
                        <FileJson className="h-3.5 w-3.5" />
                        <span>{t('exportJsonBtn', 'Export JSON')}</span>
                      </button>
                    </div>

                    {/* Source anchored to Bottom Right */}
                    {selectedRecipe.sourceUrl && (
                      <div className="text-right">
                        <a
                          href={selectedRecipe.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-xs inline-flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <span>Visit {(() => {
                            try { return new URL(selectedRecipe.sourceUrl).hostname.replace('www.', ''); } catch { return 'source'; }
                          })()}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* AUTHENTIC 3-TAB IN-PLACE RECIPE EDIT STUDIO */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                      <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }}/> {t('editRecipe', 'Edit Recipe')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                    >
                      <X className="h-5 w-5"/>
                    </button>
                  </div>

                  <div className="flex p-1.5 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                    {[
                      { id: 'info', label: t('basicInfo', 'Basic Info') },
                      { id: 'ingredients', label: t('ingredients', 'Ingredients') },
                      { id: 'steps', label: t('instructions', 'Steps') }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditTab(tab.id as any)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                          editTab === tab.id
                            ? 'text-white shadow-md border border-[var(--color-border)]'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: editTab === tab.id ? 'var(--color-card)' : 'transparent',
                          color: editTab === tab.id ? 'var(--color-primary)' : 'var(--color-text)'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-primary)' }}>
                          Photo
                        </label>
                        <label 
                          className="border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group"
                          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                        >
                          {editForm.imageUrl ? (
                            <>
                              <img
                                src={editForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span className="text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-card)' }}>
                                  <ImagePlus className="h-4 w-4" style={{ color: 'var(--color-primary)' }}/> {t('changePhoto', 'Change Photo')}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditForm({ ...editForm, imageUrl: '' });
                                  }}
                                  className="border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900 cursor-pointer"
                                  style={{ backgroundColor: 'var(--color-inner-dark)' }}
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 mx-auto opacity-40 transition" style={{ color: 'var(--color-primary)' }}/>
                              <span className="text-xs font-bold block" style={{ color: 'var(--color-text-secondary)' }}>{t('addAPhoto', 'Add a photo')}</span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setEditForm(prev => ({ ...prev, imageUrl: reader.result as string }));
                                reader.readAsDataURL(file);
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                          Recipe Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full border rounded-xl p-3 text-sm outline-none font-bold"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </div>

                      <div>
                        <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border rounded-xl p-3 text-xs outline-none resize-y leading-relaxed font-medium"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                            Recipe Type
                          </label>
                          <select
                            value={editForm.recipeType}
                            onChange={(e) => setEditForm({ ...editForm, recipeType: e.target.value })}
                            className="w-full border rounded-xl p-3 text-xs outline-none cursor-pointer font-bold"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          >
                            {RECIPE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                            Servings
                          </label>
                          <input
                            type="number"
                            value={editForm.servings}
                            onChange={(e) => setEditForm({ ...editForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none font-bold"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                            Preparation Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.prepTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none font-bold"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          />
                        </div>

                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                            Cooking Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.cookTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none font-bold"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold uppercase tracking-wider text-[11px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                          Source URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com/recipe"
                          value={editForm.sourceUrl}
                          onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
                          className="w-full border rounded-xl p-3 text-xs outline-none font-medium"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </div>

                      <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-5 py-2.5 rounded-xl border font-bold transition text-xs cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {t('cancelBtn', 'Cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg flex items-center gap-2 text-xs cursor-pointer hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          <Save className="h-4 w-4"/> {t('saveChanges', 'Save Changes')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editTab === 'ingredients' && (
                    <div className="border rounded-2xl p-5 space-y-4 animate-in fade-in text-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>{t('ingredients', 'Ingredients')}</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                            style={{
                              backgroundColor: isReorderingIngredients ? 'var(--color-emerald)' : 'var(--color-card)',
                              borderColor: 'var(--color-border)',
                              color: '#ffffff'
                            }}
                          >
                            {isReorderingIngredients ? t('done', 'Done') : t('reorder', 'Reorder')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              ingredients: [...editForm.ingredients, { amount: '', unit: '', item: '', category: categories[0] || 'Produce' }]
                            })}
                            className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs hover:opacity-90"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            <Plus className="h-3.5 w-3.5"/> {t('addIngredient', 'Add Ingredient')}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => setDraggedIndex(idx)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedIndex === null || draggedIndex === idx) return;
                              const list = [...editForm.ingredients];
                              const item = list[draggedIndex];
                              list.splice(draggedIndex, 1);
                              list.splice(idx, 0, item);
                              setEditForm({ ...editForm, ingredients: list });
                              setDraggedIndex(idx);
                            }}
                            onDrop={() => setDraggedIndex(null)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'cursor-grab border-emerald-500' : ''
                            }`}
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Amt"
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 border rounded-lg p-2 text-center font-bold outline-none"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-20 border rounded-lg p-2 text-center outline-none"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none outline-none px-2 font-medium"
                              style={{ color: 'var(--color-text)' }}
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer font-bold"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 cursor-grab text-emerald-400"><GripVertical className="h-4 w-4"/></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  ingredients: editForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4"/>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditTab('info')}
                          className="border font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTab('steps')}
                          className="text-white font-bold px-6 py-2 rounded-xl text-xs transition shadow-md cursor-pointer hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          Next: Steps →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editTab === 'steps' && (
                    <div className="border rounded-2xl p-5 space-y-4 animate-in fade-in text-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>{t('instructions', 'Step-by-Step Instructions')}</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                            style={{
                              backgroundColor: isReorderingSteps ? 'var(--color-emerald)' : 'var(--color-card)',
                              borderColor: 'var(--color-border)',
                              color: '#ffffff'
                            }}
                          >
                            {isReorderingSteps ? t('done', 'Done') : t('reorder', 'Reorder')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              instructions: [...editForm.instructions, '']
                            })}
                            className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs hover:opacity-90"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            <Plus className="h-3.5 w-3.5"/> {t('addStep', 'Add Step')}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => setDraggedIndex(idx)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedIndex === null || draggedIndex === idx) return;
                              const list = [...editForm.instructions];
                              const item = list[draggedIndex];
                              list.splice(draggedIndex, 1);
                              list.splice(idx, 0, item);
                              setEditForm({ ...editForm, instructions: list });
                              setDraggedIndex(idx);
                            }}
                            onDrop={() => setDraggedIndex(null)}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                              isReorderingSteps ? 'cursor-grab border-emerald-500' : ''
                            }`}
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            <span className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: 'rgba(224, 86, 56, 0.2)', color: 'var(--color-primary)' }}>
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={`Describe step ${idx + 1}...`}
                              value={step}
                              onChange={(e) => {
                                const list = [...editForm.instructions];
                                list[idx] = e.target.value;
                                setEditForm({ ...editForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none outline-none resize-y font-medium text-xs"
                              style={{ color: 'var(--color-text)' }}
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 cursor-grab mt-1 text-emerald-400"><GripVertical className="h-4 w-4"/></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  instructions: editForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-400 hover:text-red-300 h-fit cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4"/>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditTab('ingredients')}
                          className="border font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="text-white font-bold px-8 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          <Save className="h-4 w-4"/> {t('saveChanges', 'Save Changes')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 1: ADD TO PLAN / CALENDAR MODAL                          */}
      {/* ------------------------------------------------------------------ */}
      {showAddToPlanModal && selectedRecipe && (
        <div 
          onClick={() => setShowAddToPlanModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            role="region"
            data-lpignore="true"
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
              onClick={() => setShowAddToPlanModal(false)} 
              className="absolute top-4 right-4 p-2 rounded-lg transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-text)' }}
            >
              <X className="h-4 w-4"/>
            </button>

            <div className="pr-6 space-y-1">
              <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
                {t('addToCalendar', 'Add to Calendar')}
              </h2>
              <p className="text-xs leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                Schedule {selectedRecipe.title || selectedRecipe.name} in your meal plan
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-primary)' }}>
                  {t('date', 'Date')}
                </label>
                <div className="relative flex items-center">
                  <Calendar className="h-4 w-4 absolute left-3.5 pointer-events-none" style={{ color: 'var(--color-primary)' }}/>
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
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
                  {t('mealType', 'Meal Type')}
                </label>
                <div className="relative flex items-center">
                  <select
                    value={planMealType}
                    onChange={(e) => setPlanMealType(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer appearance-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-primary)' }}>
                  {t('time', 'Time')}
                </label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 absolute left-3.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }}/>
                  <input
                    type="time"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full border rounded-xl px-10 py-2.5 text-xs outline-none font-bold"
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
                  {t('notes', 'Notes')}
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Add any notes or reminders..."
                  rows={3}
                  className="w-full border rounded-xl p-3 text-xs outline-none resize-none font-medium"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(false)}
                  className="px-5 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToCalendar}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('addToCalendar', 'Add to Calendar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 2: SHOPPING LIST INGREDIENT PICKER MODAL                 */}
      {/* ------------------------------------------------------------------ */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            role="region"
            data-lpignore="true"
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <ShoppingCart className="h-5 w-5" style={{ color: 'var(--color-primary)' }}/> {t('addToShoppingList', 'Add to Shopping List')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Select or edit items to add directly to your list
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsShoppingModalOpen(false)} 
                className="hover:opacity-75 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X className="h-5 w-5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {shoppingModalIngredients.map((ing, idx) => (
                <div 
                  key={ing.id} 
                  className="flex items-center gap-2 p-2.5 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div
                    onClick={() => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].selected = !updated[idx].selected;
                      setShoppingModalIngredients(updated);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                      ing.selected ? 'text-white' : 'border-slate-700 bg-slate-900'
                    }`}
                    style={{
                      borderColor: ing.selected ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: ing.selected ? 'var(--color-primary)' : 'transparent'
                    }}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5"/>}
                  </div>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].amount = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-16 border rounded-lg p-2 text-center font-bold outline-none"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    placeholder="Amt"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].unit = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-20 border rounded-lg p-2 text-center outline-none"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    placeholder="Unit"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].name = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="flex-1 bg-transparent border-none outline-none px-2 font-medium"
                    style={{ color: 'var(--color-text)' }}
                    placeholder="Ingredient name..."
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].category = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer font-bold"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <ShoppingCart className="h-3.5 w-3.5"/> {t('addSelectedToList', 'Add Selected to List')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TASK 4: RECIPE IMPORT MODAL (JSON + D&D COVER IMAGE)               */}
      {/* ------------------------------------------------------------------ */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                  <Upload className="h-5 w-5" /> {t('importRecipeModalTitle', 'Import Recipe from JSON')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('importRecipeModalSubtitle', 'Upload a recipe JSON file and attach an optional cover image')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title={`Storage Engine synced with /admin/storage: ${storageProvider.toUpperCase()}`}
                >
                  {storageProvider === 'supabase' ? <Cloud className="h-3 w-3 text-emerald-400" /> : <HardDrive className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />}
                  <span className="font-mono uppercase">{storageProvider === 'supabase' ? 'Supabase S3' : 'Localhost'}</span>
                </div>

                <button 
                  type="button" 
                  onClick={() => setIsImportModalOpen(false)} 
                  className="p-2 rounded-xl text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Step 1: Drag & Drop Cover Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                {t('dragDropImageLabel', 'Drag & Drop recipe image here')}
              </label>

              {importImagePreview ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border shadow-inner" style={{ borderColor: 'var(--color-border)' }}>
                  <img src={importImagePreview} alt="Import Cover Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImportImageFile(null); setImportImagePreview(''); }}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-black/75 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('removeSelectedImage', 'Remove Photo')}</span>
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingImage(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingImage(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation(); setIsDraggingImage(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImportImageUpload(e.dataTransfer.files[0]);
                  }}
                  onClick={() => importImageInputRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl py-8 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative group"
                  style={{
                    borderColor: isDraggingImage ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isDraggingImage ? 'var(--color-card)' : 'var(--color-inner-dark)'
                  }}
                >
                  <input
                    ref={importImageInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => e.target.files?.[0] && handleImportImageUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2 transition transform group-hover:scale-105"
                    style={{ backgroundColor: 'var(--color-card)' }}
                  >
                    <Upload className={`h-6 w-6 ${isUploadingImportImage ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    <span style={{ color: 'var(--color-primary)' }} className="font-bold">
                      {t('clickToUploadCenter', 'Click center to browse or drag file here')}
                    </span>
                  </p>
                  <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('uploadOrDragHint', 'Supports PNG, JPG, WEBP (Max 10MB)')}
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Upload Recipe JSON File Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                {t('uploadJsonBtn', 'Upload JSON File')}
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingJson(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingJson(false); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation(); setIsDraggingJson(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImportJsonFile(e.dataTransfer.files[0]);
                }}
                className="p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: isDraggingJson ? 'var(--color-primary)' : 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl text-emerald-400 bg-emerald-950/30 border border-emerald-800/40">
                    <FileJson className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                      {importJsonFile ? importJsonFile.name : t('uploadJsonHint', 'Select a .json recipe file from your computer or drag it here')}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {importJsonFile ? `${(importJsonFile.size / 1024).toFixed(1)} KB` : 'Application JSON (.json)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={importJsonInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => e.target.files?.[0] && handleImportJsonFile(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => importJsonInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-85 shadow-xs"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {importJsonFile ? 'Change File' : t('uploadJsonBtn', 'Upload JSON File')}
                  </button>
                  {importJsonFile && (
                    <button
                      type="button"
                      onClick={() => { setImportJsonFile(null); setImportedRecipeData(null); }}
                      className="p-2 text-red-400 hover:text-red-500 cursor-pointer"
                      title={t('removeSelectedJson', 'Remove JSON')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Imported Recipe Preview Card */}
            {importedRecipeData && (
              <div 
                className="p-4 rounded-2xl border space-y-2 text-xs"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-emerald)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> {t('recipePreviewLabel', 'Recipe Preview')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-950/40 text-emerald-300 border border-emerald-800">
                    {importedRecipeData.recipeType || importedRecipeData.category || 'Main Dish'}
                  </span>
                </div>
                <h4 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                  {importedRecipeData.title || importedRecipeData.name || 'Untitled Recipe'}
                </h4>
                <div className="flex items-center gap-4 text-[11px] opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>
                    {(t('ingredientsCount', '{count} ingredients')).replace('{count}', String(Array.isArray(importedRecipeData.ingredients) ? importedRecipeData.ingredients.length : 0))}
                  </span>
                  <span>
                    {(t('stepsCount', '{count} steps')).replace('{count}', String(Array.isArray(importedRecipeData.instructions || importedRecipeData.steps) ? (importedRecipeData.instructions || importedRecipeData.steps).length : 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer hover:opacity-85 transition"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || !importedRecipeData}
                className="px-8 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Upload className={`h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
                <span>{isImporting ? t('importingRecipe', 'Importing Recipe...') : t('importBtnAction', 'Import Recipe')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
