// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Filter, Heart, CheckCircle2, AlertCircle, ChefHat, 
  Clock, Users, ArrowUpRight, Sparkles, Plus, Trash2, Edit3, 
  Grid3X3, LayoutGrid, Rows3, ChevronLeft, ChevronRight, FileJson, 
  Upload, X, Volume2, Play, Pause, RotateCcw, Share2, Lock, 
  Globe, HardDrive, Cloud, RefreshCw, Tag, ExternalLink, Calendar, 
  ShoppingCart, BookOpen, GripVertical, ArrowUp, ArrowDown
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

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

  // Recipe Details Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [currentServings, setCurrentServings] = useState(4);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [recipeNotes, setRecipeNotes] = useState('');
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // Web Audio Kitchen Timer
  const [activeTimer, setActiveTimer] = useState<{ running: boolean; remainingSeconds: number; initialSeconds: number } | null>(null);

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

  // Recipe Edit Studio Modal State
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

  // Modal Sub-dialogs (Meal Planner & Shopping Cart)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingIngredients, setShoppingIngredients] = useState<string[]>([]);

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

  // Web Audio Chime Synthesizer
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

  // Kitchen Timer Interval Effect
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
      const [savedRes, recipesRes, booksRes] = await Promise.allSettled([
        fetch(`/api/saved-recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/books?t=${Date.now()}`, { cache: 'no-store' })
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

      // Check LocalStorage Fallback Hydration
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
            servings: Number(item.servings) || 4
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

    // Restore saved grid density
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

  // Fractional Servings Amount Calculator
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

  // Available unique ingredients for popover filter
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

  // Filtered Recipes Pipeline
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      // Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (r.title || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesNotes = (r.notes || '').toLowerCase().includes(q);
        const matchesIng = Array.isArray(r.ingredients) && r.ingredients.some((ing: any) => {
          const name = typeof ing === 'string' ? ing : ing.name || ing.item;
          return (name || '').toLowerCase().includes(q);
        });
        if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesIng) return false;
      }

      // Quick Toggles
      if (filterFavorites && !r.isFavorite) return false;
      if (filterCooked && !r.isCooked) return false;

      // Category Dropdown
      if (selectedType !== 'ALL' && r.recipeType !== selectedType) return false;

      // Rating Dropdown
      if (selectedRating !== 'ALL') {
        const minRating = Number(selectedRating);
        if ((r.rating || 0) < minRating) return false;
      }

      // Prep Time Filter
      if (selectedPrepTime !== 'ALL') {
        const prep = Number(r.prepTimeMinutes || r.prepTime || 0);
        if (selectedPrepTime === '15' && prep > 15) return false;
        if (selectedPrepTime === '30' && prep > 30) return false;
        if (selectedPrepTime === '60' && prep > 60) return false;
        if (selectedPrepTime === '60+' && prep <= 60) return false;
      }

      // Cook Time Filter
      if (selectedCookTime !== 'ALL') {
        const cook = Number(r.cookTimeMinutes || r.cookTime || 0);
        if (selectedCookTime === '15' && cook > 15) return false;
        if (selectedCookTime === '30' && cook > 30) return false;
        if (selectedCookTime === '60' && cook > 60) return false;
        if (selectedCookTime === '60+' && cook <= 60) return false;
      }

      // Ingredient Multi-Select Popover
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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterFavorites, filterCooked, selectedType, selectedRating, selectedPrepTime, selectedCookTime, selectedIngredientsList, gridMode]);

  // Pagination Slice
  const itemsPerPage = GRID_CONFIG[gridMode].perPage;
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + itemsPerPage);

  // Optimistic Toggle Favorite
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

  // Optimistic Toggle Cooked
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

  // Toggle Public Marketplace Visibility
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

  // Export Recipe JSON
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

  // Delete Recipe
  const handleDeleteRecipe = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
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

  // ----------------------------------------------------------------------
  // Task 4: Interactive Import Recipe Modal Handlers with /admin/storage
  // ----------------------------------------------------------------------
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

      // Sync Remote Image with /admin/storage engine if necessary
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

      // Persist to database endpoints
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

      // Hydrate local state & storage keys
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

      // Dispatch global synchronization events
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      window.dispatchEvent(new Event('storage'));

      // Close modal & reset fields
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

        {/* Action Cluster: Grid Density & Import/Create Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grid Density Switcher (3x3, 4x4, 5x5) */}
          <div 
            className="flex items-center p-1 rounded-xl border shadow-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => changeGridMode('3x3')}
              className="p-1.5 rounded-lg transition cursor-pointer"
              style={gridMode === '3x3' ? { backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              title="3x3 Compact Grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeGridMode('4x4')}
              className="p-1.5 rounded-lg transition cursor-pointer"
              style={gridMode === '4x4' ? { backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              title="4x4 Standard Grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeGridMode('5x5')}
              className="p-1.5 rounded-lg transition cursor-pointer"
              style={gridMode === '5x5' ? { backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              title="5x5 Dense Grid"
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>

          {/* Task 4: Import Recipe Modal Trigger Button */}
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

          {/* Create Recipe Button (Linking to /manual) */}
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
          {/* Main Search Input */}
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

          {/* Quick Toggle Buttons: Favorites & Cooked */}
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

            {/* Filter by Ingredient Popover Trigger */}
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

              {/* Popover Card */}
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
                setCurrentServings(recipe.servings || 4);
                setCompletedSteps([]);
                setRecipeNotes(recipe.notes || '');
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

                {/* Category Badge */}
                <span 
                  className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', color: '#ffffff' }}
                >
                  {recipe.recipeType}
                </span>

                {/* Heart & Cooked Action Pills */}
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

                {/* Prep, Cook, Servings Badges */}
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

                {/* Card Footer: Public/Private Marketplace Toggle, Green Export JSON & Delete */}
                <div 
                  className="pt-2 border-t flex items-center justify-between gap-1 text-[11px]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {/* Public/Private Slide Toggle */}
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
                    {/* Green Export JSON Button */}
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

                    {/* Delete Recipe Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecipe(e, recipe.id)}
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
      {/* Task 4: Interactive Recipe Import Modal with /admin/storage Engine   */}
      {/* ------------------------------------------------------------------ */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            {/* Modal Header & Storage Telemetry Pill */}
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
                {/* /admin/storage Telemetry */}
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

            {/* Step 1: Drag & Drop Center-Click Cover Image Upload */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Recipe Detail Full Modal with Kitchen Timer & Servings Stepper     */}
      {/* ------------------------------------------------------------------ */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-3xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-primary)' }}>
                  {selectedRecipe.recipeType}
                </span>
                <h2 className="text-xl font-black mt-1" style={{ color: 'var(--color-text)' }}>
                  {selectedRecipe.title}
                </h2>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedRecipe(null)} 
                className="p-2 rounded-xl text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Synthesizer Kitchen Timer Widget */}
            <div 
              className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                <div>
                  <span className="text-[10px] uppercase font-bold opacity-80" style={{ color: 'var(--color-text-secondary)' }}>Kitchen Timer</span>
                  <div className="text-lg font-mono font-black" style={{ color: 'var(--color-text)' }}>
                    {activeTimer 
                      ? `${String(Math.floor(activeTimer.remainingSeconds / 60)).padStart(2, '0')}:${String(activeTimer.remainingSeconds % 60).padStart(2, '0')}` 
                      : '00:00'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTimer({ running: true, remainingSeconds: 60, initialSeconds: 60 })}
                  className="px-2.5 py-1 rounded-lg border font-bold cursor-pointer"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                >
                  +1m
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTimer({ running: true, remainingSeconds: 300, initialSeconds: 300 })}
                  className="px-2.5 py-1 rounded-lg border font-bold cursor-pointer"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                >
                  +5m
                </button>
                {activeTimer && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTimer({ ...activeTimer, running: !activeTimer.running })}
                      className="p-1.5 rounded-lg border cursor-pointer"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                    >
                      {activeTimer.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTimer(null)}
                      className="p-1.5 rounded-lg border cursor-pointer text-red-400"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Servings Stepper & Font Size Scaler */}
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-secondary)' }}>Servings:</span>
                <button
                  type="button"
                  onClick={() => setCurrentServings(prev => Math.max(1, prev - 1))}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  -
                </button>
                <span className="font-mono text-sm px-1" style={{ color: 'var(--color-primary)' }}>{currentServings}</span>
                <button
                  type="button"
                  onClick={() => setCurrentServings(prev => prev + 1)}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFontSizeScale(prev => Math.max(80, prev - 10))}
                  className="px-2 py-1 rounded-lg border text-[11px] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeScale(prev => Math.min(140, prev + 10))}
                  className="px-2 py-1 rounded-lg border text-[11px] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  A+
                </button>
              </div>
            </div>

            {/* Ingredients Checklist */}
            <div className="space-y-3" style={{ fontSize: `${fontSizeScale}%` }}>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                Ingredients
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, idx: number) => {
                  const baseServ = selectedRecipe.servings || 4;
                  const item = typeof ing === 'string' ? ing : ing.name || ing.item;
                  const rawAmt = typeof ing === 'object' ? ing.amount || ing.quantity : '';
                  const unit = typeof ing === 'object' ? ing.unit || '' : '';
                  const scaled = rawAmt ? calculateScaledAmount(rawAmt, baseServ, currentServings) : '';

                  return (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-xl border flex items-center gap-2"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <input type="checkbox" className="rounded cursor-pointer" />
                      <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                        {scaled} {unit}
                      </span>
                      <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3" style={{ fontSize: `${fontSizeScale}%` }}>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                Instructions
              </h3>
              <div className="space-y-2 text-xs">
                {Array.isArray(selectedRecipe.instructions || selectedRecipe.steps) && (selectedRecipe.instructions || selectedRecipe.steps).map((step: any, idx: number) => {
                  const stepText = typeof step === 'string' ? step : step.text || step.step || '';
                  const isDone = completedSteps.includes(idx);
                  return (
                    <div 
                      key={idx}
                      onClick={() => setCompletedSteps(prev => isDone ? prev.filter(x => x !== idx) : [...prev, idx])}
                      className="p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition"
                      style={{ 
                        backgroundColor: 'var(--color-inner-dark)', 
                        borderColor: isDone ? 'var(--color-emerald)' : 'var(--color-border)',
                        opacity: isDone ? 0.6 : 1
                      }}
                    >
                      <span 
                        className="w-5 h-5 rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]"
                        style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' }}
                      >
                        {idx + 1}
                      </span>
                      <p className={`flex-1 font-medium leading-relaxed ${isDone ? 'line-through' : ''}`} style={{ color: 'var(--color-text)' }}>
                        {stepText}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div 
              className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {selectedRecipe.sourceUrl && (
                <a
                  href={selectedRecipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-emerald-400 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{t('viewOriginalSource', 'View Original Recipe Source ↗')}</span>
                </a>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportJson(selectedRecipe)}
                  className="px-3 py-1.5 rounded-xl text-white font-bold flex items-center gap-1 shadow-xs transition hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-emerald)' }}
                >
                  <FileJson className="h-3.5 w-3.5" />
                  <span>{t('exportJsonBtn', 'Export JSON')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecipe(null)}
                  className="px-4 py-1.5 rounded-xl border font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {t('closeBtn', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
