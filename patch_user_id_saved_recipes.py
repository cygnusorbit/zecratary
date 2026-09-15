import os
import glob
import json

# 1. Locate saved/page.tsx
candidates = [
    'apps/web/src/app/saved/page.tsx',
    'src/app/saved/page.tsx',
    'apps/web/app/saved/page.tsx',
    'app/saved/page.tsx'
]

target_path = next((c for c in candidates if os.path.exists(c)), None)

if not target_path:
    matches = glob.glob('**/saved/page.tsx', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        target_path = matches[0]

if not target_path:
    print("❌ Error: Could not locate saved/page.tsx.")
    exit(1)

# 2. Write updated SavedRecipesPage prioritizing user.id ("usr_admin_1")
page_code = """'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, Utensils,
  X, UploadCloud, BookmarkPlus, CalendarPlus, ShoppingCart,
  Timer, Edit3, Share2, Star, Check, Book, ChevronDown,
  Trash2, Save, Plus, ImagePlus, Users, Calendar,
  GripVertical, CheckSquare, CheckCircle2, Type, ExternalLink,
  Carrot, Hourglass, ChevronLeft, ChevronRight, LayoutGrid,
  Grid3X3, Rows3
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { syncUserSavedRecipes, persistSavedRecipe, getLocalRecipes } from '@/lib/recipeSync';
import { getStoredCategories } from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';

const RECIPE_TYPES = [
  'All Types',
  'Appetiser',
  'Main Dish',
  'Side Dish',
  'Dessert',
  'Snack',
  'Breakfast',
  'Lunch'
];

type GridMode = '3x3' | '4x4' | '5x5';

const GRID_CONFIG: Record<GridMode, { colsClass: string; perPage: number; label: string; imgHeight: string; titleSize: string }> = {
  '3x3': {
    colsClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    perPage: 9,
    label: '3×3',
    imgHeight: 'h-44',
    titleSize: 'text-base'
  },
  '4x4': {
    colsClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    perPage: 16,
    label: '4×4',
    imgHeight: 'h-36',
    titleSize: 'text-sm'
  },
  '5x5': {
    colsClass: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    perPage: 25,
    label: '5×5',
    imgHeight: 'h-28',
    titleSize: 'text-xs'
  }
};

function readLocalSavedRecipes(): any[] {
  if (typeof window === 'undefined') return [];
  const keys = ['zecratary_saved_recipes', 'zecratary_recipes', 'saved_recipes', 'savedRecipes', 'recipes'];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
  }
  return [];
}

export default function SavedRecipesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterCooked, setFilterCooked] = useState(false);
  
  // Ingredients Filter State
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [selectedIngredientsList, setSelectedIngredientsList] = useState<string[]>([]);

  // Dropdown Filters
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedRating, setSelectedRating] = useState('All Ratings');
  const [selectedPrepTime, setSelectedPrepTime] = useState('All Prep Times');
  const [selectedCookTime, setSelectedCookTime] = useState('All Cook Times');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Add to Plan / Calendar Modal State
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState('2026-08-28');
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planTime, setPlanTime] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Edit Mode & Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editForm, setEditForm] = useState<any>({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    sourceUrl: '',
    servings: 4,
    prepTimeMinutes: 30,
    cookTimeMinutes: 10,
    imageUrl: '',
    ingredients: [],
    instructions: []
  });

  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // View States
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(80);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Grid Density & Pagination States
  const [gridMode, setGridMode] = useState<GridMode>('3x3');
  const [currentPage, setCurrentPage] = useState(1);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  const defaultBooks = [
    { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', description: 'Quick and easy meals.' },
    { id: 'book_2', title: 'Authentic Asian Cuisine', description: 'Traditional recipes & stir-fries.' },
    { id: 'book_3', title: 'Baking & Desserts', description: 'Sweet treats & pastries.' }
  ];

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
    } catch (_) {}
  }, []);

  const getCleanRecipeType = (rec: any): string => {
    const raw = rec.recipeType || rec.category || (Array.isArray(rec.tags) ? rec.tags[0] : 'Main Dish');
    if (raw === 'Appetizer' || raw === 'Appetiser') return 'Appetiser';
    if (RECIPE_TYPES.includes(raw)) return raw;
    return 'Main Dish';
  };

  const getSafeHostname = (urlStr: string) => {
    if (!urlStr || typeof urlStr !== 'string') return 'source website';
    try {
      const normalized = urlStr.startsWith('http://') || urlStr.startsWith('https://') 
        ? urlStr 
        : `https://${urlStr}`;
      return new URL(normalized).hostname.replace('www.', '');
    } catch {
      return urlStr.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || 'source website';
    }
  };

  const getSafeHref = (urlStr: string) => {
    if (!urlStr) return '#';
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr;
    return `https://${urlStr}`;
  };

  // Primary filtering by User ID ("usr_admin_1")
  const loadData = useCallback((user: User | null) => {
    if (!user) return;
    setCategories(getStoredCategories());
    try {
      const localRecipes = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      const localBooks = localStorage.getItem('zecratary_recipe_books');

      let parsedRecipes: any[] = [];
      if (localRecipes) {
        const parsed = JSON.parse(localRecipes);
        if (Array.isArray(parsed)) {
          parsedRecipes = parsed;
        }
      }

      // Prioritize match on userId === user.id ("usr_admin_1"), falling back gracefully if unassigned
      const userRecipes = parsedRecipes
        .filter((r: any) => {
          if (r.userId) return r.userId === user.id;
          if (r.creatorId) return r.creatorId === user.id;
          return r.createdBy === user.email || r.createdBy === user.id;
        })
        .map((r: any) => {
          const cleanType = getCleanRecipeType(r);
          return {
            ...r,
            userId: user.id, // Normalize to User ID
            recipeType: cleanType,
            category: cleanType,
            tags: [cleanType, ...(Array.isArray(r.tags) ? r.tags.filter((t: string) => t !== 'Imported' && t !== cleanType) : [])]
          };
        });

      setRecipes(userRecipes);

      let parsedBooks = defaultBooks;
      if (localBooks) {
        const parsed = JSON.parse(localBooks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedBooks = parsed;
        }
      }

      const userBooks = parsedBooks.filter((b: any) => {
        if (!b.userId && !b.createdBy) return true;
        if (b.userId) return b.userId === user.id;
        return b.createdBy === user.email || b.createdBy === user.id;
      });

      const booksWithCounts = userBooks.map((b: any) => ({
        ...b,
        recipeCount: userRecipes.filter((r: any) => r.bookId === b.id).length
      }));

      setBooks(booksWithCounts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeUser = getCurrentUser();
    if (activeUser && (activeUser.id || activeUser.email)) {
      // Prioritize activeUser.id ("usr_admin_1") over email
      const uKey = (activeUser.id || activeUser.email).trim();
      syncUserSavedRecipes(uKey).then((synced) => {
        if (Array.isArray(synced) && synced.length > 0) {
          setRecipes(synced);
        }
      }).catch(() => {});
    }

    const onRecipesUpdated = () => {
      const current = typeof getLocalRecipes === 'function' ? getLocalRecipes() : readLocalSavedRecipes();
      if (Array.isArray(current)) {
        setRecipes(current);
      }
    };
    window.addEventListener('zecratary_saved_recipes_updated', onRecipesUpdated);

    applyGlobalTheme();
    window.addEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_updated', applyGlobalTheme);
    window.addEventListener('storage', applyGlobalTheme);

    return () => {
      window.removeEventListener('zecratary_saved_recipes_updated', onRecipesUpdated);
      window.removeEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_updated', applyGlobalTheme);
      window.removeEventListener('storage', applyGlobalTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applyGlobalTheme]);

  useEffect(() => {
    document.title = `${t('savedRecipesTitle') || 'Saved Recipes'} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadData(user);

    const handleSync = () => {
      const activeUser = getCurrentUser();
      if (activeUser) {
        setCurrentUser(activeUser);
        loadData(activeUser);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_categories_changed', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_categories_changed', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadData, router, t]);

  const saveAllRecipes = (updatedUserList: any[]) => {
    if (!currentUser) return;
    try {
      const localRecipes = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      const allRecipes: any[] = localRecipes ? JSON.parse(localRecipes) : [];

      // Partition recipes by user ID
      const otherUsersRecipes = allRecipes.filter((r: any) => {
        if (r.userId) return r.userId !== currentUser.id;
        return r.createdBy !== currentUser.email && r.createdBy !== currentUser.id;
      });

      const updatedWithId = updatedUserList.map(r => ({
        ...r,
        userId: currentUser.id
      }));

      const merged = [...updatedWithId, ...otherUsersRecipes];
      setRecipes(updatedWithId);
      localStorage.setItem('zecratary_recipes', JSON.stringify(merged));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(merged));

      const updatedBooks = books.map((b: any) => ({
        ...b,
        recipeCount: updatedWithId.filter((r: any) => r.bookId === b.id).length
      }));
      setBooks(updatedBooks);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_recipes_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !selectedRecipe.isFavorite });
    }
  };

  const toggleCooked = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isCooked: !r.isCooked } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isCooked: !selectedRecipe.isCooked });
    }
  };

  const handleAssignToBook = (bookId: string) => {
    if (!selectedRecipe) return;
    const isRemoving = selectedRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...selectedRecipe, bookId: targetBookId };
    setSelectedRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === selectedRecipe.id ? updatedRecipe : r);
    saveAllRecipes(updatedList);

    const bookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    const recName = selectedRecipe.title || selectedRecipe.name;
    if (isRemoving) {
      const msg = (t('removedFromBookAlert') || 'Removed "{title}" from "{book}"')
        .replace('{title}', recName)
        .replace('{book}', bookTitle);
      alert(msg);
    } else {
      const msg = (t('assignedToBookAlert') || 'Added "{title}" to "{book}"!')
        .replace('{title}', recName)
        .replace('{book}', bookTitle);
      alert(msg);
    }
  };

  const openAddToPlanModal = () => {
    setPlanDate('2026-08-28');
    setPlanMealType('Dinner');
    setPlanTime('');
    setPlanNotes('');
    setShowAddToPlanModal(true);
  };

  const handleSaveToCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !currentUser) return;

    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const currentPlan = localPlan ? JSON.parse(localPlan) : [];

    const recName = selectedRecipe.title || selectedRecipe.name;
    const newPlanItem = {
      id: 'plan_' + Date.now(),
      userId: currentUser.id,
      createdBy: currentUser.email,
      creatorName: currentUser.name,
      date: planDate,
      recipeId: selectedRecipe.id,
      recipeName: recName,
      image: selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80',
      mealType: planMealType,
      time: planTime,
      notes: planNotes,
      isLeftover: false
    };

    localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, newPlanItem]));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    window.dispatchEvent(new Event('storage'));
    setShowAddToPlanModal(false);
    const alertMsg = (t('scheduledMealAlert') || 'Successfully scheduled "{title}" in your meal plan!')
      .replace('{title}', recName);
    alert(alertMsg);
  };

  const updateSelectedRecipeState = (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleDeleteRecipe = (id: string) => {
    if (!confirm(t('confirmDeleteRecipe') || 'Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveAllRecipes(updated);
    setSelectedRecipe(null);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (type === 'ingredients') {
      const list = [...editForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, ingredients: list });
      setDraggedIndex(index);
    } else {
      const list = [...editForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, instructions: list });
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const handleOpenEdit = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    const cleanType = getCleanRecipeType(selectedRecipe);

    setEditForm({
      title: selectedRecipe.title || selectedRecipe.name || '',
      description: selectedRecipe.description || '',
      recipeType: cleanType,
      sourceUrl: selectedRecipe.sourceUrl || '',
      servings: selectedRecipe.servings || 4,
      prepTimeMinutes: selectedRecipe.prepTimeMinutes || 30,
      cookTimeMinutes: selectedRecipe.cookTimeMinutes || 10,
      imageUrl: selectedRecipe.imageUrl || selectedRecipe.image || '',
      ingredients: selectedRecipe.ingredients
        ? selectedRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
          }))
        : [{ amount: '', unit: '', item: '', category: defaultCat }],
      instructions: selectedRecipe.instructions && selectedRecipe.instructions.length > 0
        ? [...selectedRecipe.instructions]
        : ['']
    });
    setEditTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      alert(t('enterRecipeTitleAlert') || 'Please enter a recipe title.');
      setEditTab('info');
      return;
    }

    const cleanType = getCleanRecipeType(editForm);

    const updatedRec = {
      ...selectedRecipe,
      ...editForm,
      userId: currentUser?.id || selectedRecipe.userId,
      recipeType: cleanType,
      category: cleanType,
      tags: [cleanType]
    };

    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditing(false);
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
    if (selectedItems.length === 0) {
      alert(t('noIngredientsSelectedAlert') || 'No ingredients selected.');
      return;
    }
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
    const alertMsg = (t('addedItemsShoppingAlert') || 'Added {count} items to your Shopping List!')
      .replace('{count}', String(selectedItems.length));
    alert(alertMsg);
  };

  const handleAddIngredientFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = ingredientQuery.trim();
    if (!clean) return;
    if (!selectedIngredientsList.includes(clean.toLowerCase())) {
      setSelectedIngredientsList([...selectedIngredientsList, clean.toLowerCase()]);
    }
    setIngredientQuery('');
  };

  const handleRemoveIngredientFilter = (ing: string) => {
    setSelectedIngredientsList(selectedIngredientsList.filter(i => i !== ing));
  };

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      const q = search.toLowerCase().trim();
      const title = (r.title || r.name || '').toLowerCase();
      if (q && !title.includes(q)) return false;

      if (filterFavorites && !r.isFavorite) return false;
      if (filterCooked && !r.isCooked) return false;

      if (selectedType !== 'All Types') {
        const type = getCleanRecipeType(r);
        if (type !== selectedType) return false;
      }

      if (selectedIngredientsList.length > 0) {
        const recipeIngNames = Array.isArray(r.ingredients) 
          ? r.ingredients.map((ing: any) => (typeof ing === 'string' ? ing : ing.item || ing.name || '').toLowerCase())
          : [];
        
        const hasAll = selectedIngredientsList.every(targetIng => 
          recipeIngNames.some(item => item.includes(targetIng))
        );
        if (!hasAll) return false;
      }

      if (selectedRating !== 'All Ratings') {
        const minRating = parseInt(selectedRating);
        if ((r.rating || 0) < minRating) return false;
      }

      if (selectedPrepTime !== 'All Prep Times') {
        const prep = r.prepTimeMinutes || 0;
        if (selectedPrepTime === 'Under 15m' && prep > 15) return false;
        if (selectedPrepTime === '15-30m' && (prep < 15 || prep > 30)) return false;
        if (selectedPrepTime === 'Over 30m' && prep < 30) return false;
      }

      if (selectedCookTime !== 'All Cook Times') {
        const cook = r.cookTimeMinutes || 0;
        if (selectedCookTime === 'Under 15m' && cook > 15) return false;
        if (selectedCookTime === '15-30m' && (cook < 15 || cook > 30)) return false;
        if (selectedCookTime === 'Over 30m' && cook < 30) return false;
      }

      return true;
    });
  }, [recipes, search, filterFavorites, filterCooked, selectedType, selectedIngredientsList, selectedRating, selectedPrepTime, selectedCookTime]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterFavorites, filterCooked, selectedType, selectedIngredientsList, selectedRating, selectedPrepTime, selectedCookTime, gridMode]);

  const itemsPerPage = GRID_CONFIG[gridMode].perPage;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRecipes = filtered.slice(startIndex, startIndex + itemsPerPage);

  const assignedBook = books.find(b => b.id === selectedRecipe?.bookId);
  const baseServings = selectedRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;
  const recipeCategoryBadge = selectedRecipe ? getCleanRecipeType(selectedRecipe) : 'Main Dish';

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-16 px-4 font-sans transition-colors duration-200" 
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
      onClick={() => setOpenDropdown(null)}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('savedRecipesTitle') || 'Saved Recipes'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {(t('savedRecipesSubtitle') || 'Your collection of favorite recipes ({count})').replace('{count}', String(recipes.length))}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div 
            className="flex items-center p-1 rounded-xl border shadow-sm"
            style={{
              backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            {(['3x3', '4x4', '5x5'] as GridMode[]).map((mode) => {
              const isActive = gridMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGridMode(mode)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  style={isActive ? {
                    backgroundColor: 'var(--color-primary, #E05638)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(224, 86, 56, 0.3)'
                  } : {
                    color: isDayMode ? '#64748b' : '#94a3b8',
                    backgroundColor: 'transparent'
                  }}
                  title={`Show ${GRID_CONFIG[mode].label} layout (${GRID_CONFIG[mode].perPage} per page)`}
                >
                  {mode === '3x3' && <Grid3X3 className="h-3.5 w-3.5" />}
                  {mode === '4x4' && <LayoutGrid className="h-3.5 w-3.5" />}
                  {mode === '5x5' && <Rows3 className="h-3.5 w-3.5" />}
                  <span>{GRID_CONFIG[mode].label}</span>
                </button>
              );
            })}
          </div>

          <Link 
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg"
            href="/manual"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <UploadCloud className="h-4 w-4"/> {t('createRecipe') || 'Create Recipe'}
          </Link>
        </div>
      </div>

      {/* Search & Filter Trigger Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-3.5 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}/>
            <input
              type="text"
              placeholder={t('searchByNamePlaceholder') || 'Search by name'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
            />
          </div>
          <button 
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            style={showFilters ? {
              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
              borderColor: 'var(--color-emerald, #10b981)',
              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
            } : {
              backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#64748b' : '#94a3b8'
            }}
          >
            <SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }}/> {t('filter') || 'Filter'}
          </button>
        </div>

        {/* Multi-Filter Pills Strip */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in text-xs font-semibold select-none">
            <button
              type="button"
              onClick={() => setFilterFavorites(!filterFavorites)}
              className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
              style={filterFavorites ? {
                backgroundColor: isDayMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
                borderColor: isDayMode ? '#f87171' : 'rgba(239, 68, 68, 0.6)',
                color: isDayMode ? '#b91c1c' : '#fca5a5'
              } : {
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#334155' : '#cbd5e1'
              }}
            >
              <Heart className={`h-3.5 w-3.5 ${filterFavorites ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}/>
              <span>{t('favorites') || 'Favorites'}</span>
            </button>

            {/* Ingredients Popover Filter */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'ingredients' ? null : 'ingredients')}
                className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
                style={selectedIngredientsList.length > 0 || openDropdown === 'ingredients' ? {
                  backgroundColor: 'rgba(224, 86, 56, 0.15)',
                  borderColor: 'var(--color-primary, #E05638)',
                  color: 'var(--color-primary, #E05638)'
                } : {
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#334155' : '#cbd5e1'
                }}
              >
                <Carrot className="h-3.5 w-3.5" style={{ color: isDayMode ? '#ea580c' : '#94a3b8' }}/>
                <span>{t('ingredientsFilter') || 'Ingredients'} {selectedIngredientsList.length > 0 ? `(${selectedIngredientsList.length})` : ''}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70"/>
              </button>

              {openDropdown === 'ingredients' && (
                <div 
                  className="absolute left-0 top-full mt-2 w-72 border rounded-2xl shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0e1015)',
                    borderColor: 'var(--color-primary, #E05638)'
                  }}
                >
                  <form onSubmit={handleAddIngredientFilter} className="flex items-center gap-2">
                    <div 
                      className="flex-1 border-2 rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #080a0e)',
                        borderColor: 'var(--color-primary, #E05638)'
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('searchIngredientsPlaceholder') || 'Search ingredients'}
                        value={ingredientQuery}
                        onChange={(e) => setIngredientQuery(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs outline-none"
                        style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="text-white p-2 rounded-xl transition flex items-center justify-center font-bold text-sm shadow-md cursor-pointer shrink-0"
                      style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                    >
                      <Plus className="h-4 w-4 stroke-[3]"/>
                    </button>
                  </form>

                  {selectedIngredientsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {selectedIngredientsList.map((ing) => (
                        <span
                          key={ing}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border"
                          style={{
                            backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #171c26)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#ffffff'
                          }}
                        >
                          <span className="capitalize">{ing}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientFilter(ing)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3"/>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] leading-tight pt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('recipesMustContainIngredients') || 'Recipes must contain all listed ingredients.'}
                  </p>
                </div>
              )}
            </div>

            {/* Recipe Type Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'recipeType' ? null : 'recipeType')}
                className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
                style={selectedType !== 'All Types' ? {
                  backgroundColor: 'rgba(224, 86, 56, 0.15)',
                  borderColor: 'var(--color-primary, #E05638)',
                  color: 'var(--color-primary, #E05638)'
                } : {
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#334155' : '#cbd5e1'
                }}
              >
                <Utensils className="h-3.5 w-3.5 opacity-70"/>
                <span>{selectedType === 'All Types' ? (t('recipeTypeLabel') || 'Recipe Type') : selectedType}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70"/>
              </button>

              {openDropdown === 'recipeType' && (
                <div 
                  className="absolute left-0 top-full mt-2 w-48 border rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a0d14)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  {RECIPE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setSelectedType(type); setOpenDropdown(null); }}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition"
                      style={selectedType === type ? {
                        backgroundColor: isDayMode ? '#fee2e2' : 'var(--color-inner-dark, #111726)',
                        color: isDayMode ? '#b91c1c' : '#ffffff',
                        border: '1px solid var(--color-primary, #E05638)'
                      } : {
                        color: isDayMode ? '#1e293b' : '#cbd5e1'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cooked Pill */}
            <button
              type="button"
              onClick={() => setFilterCooked(!filterCooked)}
              className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
              style={filterCooked ? {
                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
              } : {
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#334155' : '#cbd5e1'
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: filterCooked ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#64748b' : '#94a3b8') }}/>
              <span>{t('cooked') || 'Cooked'}</span>
            </button>

            {/* Rating Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
                style={selectedRating !== 'All Ratings' ? {
                  backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                  borderColor: isDayMode ? '#f59e0b' : 'rgba(245, 158, 11, 0.6)',
                  color: isDayMode ? '#b45309' : '#fbbf24'
                } : {
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#334155' : '#cbd5e1'
                }}
              >
                <Star className="h-3.5 w-3.5 opacity-70"/>
                <span>{selectedRating === 'All Ratings' ? (t('rating') || 'Rating') : selectedRating}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70"/>
              </button>

              {openDropdown === 'rating' && (
                <div 
                  className="absolute left-0 top-full mt-2 w-44 border rounded-2xl shadow-2xl p-1.5 z-50 space-y-1"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a0d14)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  {['All Ratings', '4+ Stars', '3+ Stars', '1+ Stars'].map((rat) => (
                    <button
                      key={rat}
                      type="button"
                      onClick={() => { setSelectedRating(rat); setOpenDropdown(null); }}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition"
                      style={selectedRating === rat ? {
                        backgroundColor: isDayMode ? '#fef3c7' : 'var(--color-inner-dark, #111726)',
                        color: isDayMode ? '#b45309' : '#ffffff',
                        border: '1px solid var(--color-border, #1e293b)'
                      } : {
                        color: isDayMode ? '#1e293b' : '#cbd5e1'
                      }}
                    >
                      {rat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Prep Time Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'prepTime' ? null : 'prepTime')}
                className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
                style={selectedPrepTime !== 'All Prep Times' ? {
                  backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'var(--color-emerald, #10b981)',
                  color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                } : {
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#334155' : '#cbd5e1'
                }}
              >
                <Hourglass className="h-3.5 w-3.5 opacity-70"/>
                <span>{selectedPrepTime === 'All Prep Times' ? (t('prepTime') || 'Prep Time') : selectedPrepTime}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70"/>
              </button>

              {openDropdown === 'prepTime' && (
                <div 
                  className="absolute left-0 top-full mt-2 w-44 border rounded-2xl shadow-2xl p-1.5 z-50 space-y-1"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a0d14)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  {['All Prep Times', 'Under 15m', '15-30m', 'Over 30m'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => { setSelectedPrepTime(time); setOpenDropdown(null); }}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition"
                      style={selectedPrepTime === time ? {
                        backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #111726)',
                        color: isDayMode ? '#0f172a' : '#ffffff',
                        border: '1px solid var(--color-border, #1e293b)'
                      } : {
                        color: isDayMode ? '#1e293b' : '#cbd5e1'
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cook Time Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'cookTime' ? null : 'cookTime')}
                className="px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 transition cursor-pointer"
                style={selectedCookTime !== 'All Cook Times' ? {
                  backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'var(--color-emerald, #10b981)',
                  color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                } : {
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#334155' : '#cbd5e1'
                }}
              >
                <Clock className="h-3.5 w-3.5 opacity-70"/>
                <span>{selectedCookTime === 'All Cook Times' ? (t('cookTime') || 'Cook Time') : selectedCookTime}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70"/>
              </button>

              {openDropdown === 'cookTime' && (
                <div 
                  className="absolute left-0 top-full mt-2 w-44 border rounded-2xl shadow-2xl p-1.5 z-50 space-y-1"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a0d14)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  {['All Cook Times', 'Under 15m', '15-30m', 'Over 30m'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => { setSelectedCookTime(time); setOpenDropdown(null); }}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition"
                      style={selectedCookTime === time ? {
                        backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #111726)',
                        color: isDayMode ? '#0f172a' : '#ffffff',
                        border: '1px solid var(--color-border, #1e293b)'
                      } : {
                        color: isDayMode ? '#1e293b' : '#cbd5e1'
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Recipe Card Grid */}
      {loading ? (
        <div className="text-xs py-12 text-center" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
          {t('loadingRecipes') || 'Loading recipes...'}
        </div>
      ) : (
        <div className={`grid ${GRID_CONFIG[gridMode].colsClass} gap-4 sm:gap-5`}>
          {paginatedRecipes.map((r) => {
            const cardBook = books.find(b => b.id === r.bookId);
            const cardTypeBadge = getCleanRecipeType(r);
            const cfg = GRID_CONFIG[gridMode];

            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRecipe(r);
                  setServingsMultiplier(1);
                  setCompletedSteps([]);
                  setNoteText(r.note || '');
                  setIsBookDropdownOpen(false);
                  setIsEditing(false);
                }}
                className="border rounded-2xl overflow-hidden transition cursor-pointer group shadow-sm hover:shadow-md relative flex flex-col justify-between"
                style={{
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #070b13)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                }}
              >
                <div>
                  <div className={`relative ${cfg.imgHeight} w-full overflow-hidden`} style={{ backgroundColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
                    <img
                      src={r.imageUrl || r.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'}
                      alt={r.title || r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => toggleCooked(e, r.id)}
                        className="p-1.5 rounded-full backdrop-blur-md transition shadow-md cursor-pointer"
                        style={r.isCooked ? {
                          backgroundColor: 'var(--color-emerald, #10b981)',
                          color: '#ffffff'
                        } : {
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#cbd5e1'
                        }}
                        title={r.isCooked ? "Marked as Cooked" : "Mark as Cooked"}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5"/>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, r.id)}
                        className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition shadow-md border border-slate-700/60 cursor-pointer"
                        title="Favorite"
                      >
                        <Heart 
                          className={`h-3.5 w-3.5 ${r.isFavorite ? 'fill-current' : ''}`}
                          style={{ color: r.isFavorite ? 'var(--color-primary, #E05638)' : '#ffffff' }}
                        />
                      </button>
                    </div>

                    {cardBook && gridMode !== '5x5' && (
                      <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-400/30 max-w-[80%] truncate">
                        <Book className="h-3 w-3 shrink-0"/> <span className="truncate">{cardBook.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <h3 
                      className={`font-bold ${cfg.titleSize} leading-snug line-clamp-2`}
                      style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                    >
                      {r.title || r.name}
                    </h3>
                  </div>
                </div>

                <div className="px-3.5 pb-3 pt-0 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                    >
                      {cardTypeBadge}
                    </span>

                    {(r.rating || 0) > 0 && gridMode !== '5x5' ? (
                      <span className="flex items-center gap-0.5 text-amber-500 text-[11px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-xs">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500"/> {r.rating}
                      </span>
                    ) : null}
                  </div>

                  <span className="text-[11px] flex items-center gap-1 shrink-0 font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    <Clock className="h-3 w-3"/> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 10)}m
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div 
          className="pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            {(t('showingRecipesRange') || 'Showing {start} - {end} of {total} recipes')
              .replace('{start}', String(startIndex + 1))
              .replace('{end}', String(Math.min(startIndex + itemsPerPage, filtered.length)))
              .replace('{total}', String(filtered.length))}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border disabled:opacity-30 transition cursor-pointer shadow-sm"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #07090e)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(num => num === 1 || num === totalPages || Math.abs(num - safeCurrentPage) <= 1)
              .map((num, i, arr) => {
                const prev = arr[i - 1];
                const showEllipsis = prev && num - prev > 1;

                return (
                  <div key={num} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-1 font-bold" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className="min-w-[32px] h-8 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-sm"
                      style={safeCurrentPage === num ? {
                        backgroundColor: 'var(--color-primary, #E05638)',
                        borderColor: 'var(--color-primary, #E05638)',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(224, 86, 56, 0.3)'
                      } : {
                        backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #07090e)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#cbd5e1'
                      }}
                    >
                      {num}
                    </button>
                  </div>
                );
              })}

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border disabled:opacity-30 transition cursor-pointer shadow-sm"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #07090e)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* RECIPE DETAILS & EDIT MODAL */}
      {selectedRecipe && (
        <div 
          onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button
              onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2 rounded-xl border transition cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'rgba(0, 0, 0, 0.7)',
                borderColor: isDayMode ? '#cbd5e1' : '#334155',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <X className="h-5 w-5"/>
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditing ? (
                /* RECIPE DETAILS VIEW */
                <div className="space-y-5 pb-6">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                    <img
                      src={selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                      alt={selectedRecipe.title || selectedRecipe.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {selectedRecipe.title || selectedRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="border text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/60 border-white/20">
                          <Clock className="h-3.5 w-3.5"/> {(t('cookTimePrefix') || 'Cook: {time} minutes').replace('{time}', String(selectedRecipe.cookTimeMinutes || 10))}
                        </span>
                        <span className="border text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/60 border-white/20">
                          <Clock className="h-3.5 w-3.5"/> {(t('prepTimePrefix') || 'Prep: {time} minutes').replace('{time}', String(selectedRecipe.prepTimeMinutes || 30))}
                        </span>
                        <span className="border text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/60 border-white/20">
                          <Utensils className="h-3.5 w-3.5"/> {recipeCategoryBadge}
                        </span>
                        
                        <button
                          onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow cursor-pointer"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-current' : 'text-slate-400'}`}/>
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
                        className="w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        style={assignedBook ? {
                          backgroundColor: 'rgba(224, 86, 56, 0.15)',
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        } : {
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        }}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary, #E05638)' }}/>
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : (t('addToBook') || 'Add to Book')}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5"/>
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div 
                            className="absolute left-0 top-full mt-2 w-64 border rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in" 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0d131f)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                            }}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 flex items-center justify-between" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                              <span>{t('selectCookbook') || 'Select Cookbook'}</span>
                              <Link 
                                className="hover:underline" 
                                href="/books"
                                style={{ color: 'var(--color-emerald, #10b981)' }}
                              >
                                {t('manage') || 'Manage'}
                              </Link>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs px-2.5 py-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('noCookbooksAvailable') || 'No cookbooks available'}</div>
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
                                      style={isAssigned ? {
                                        backgroundColor: 'rgba(224, 86, 56, 0.15)',
                                        color: 'var(--color-primary, #E05638)',
                                        border: '1px solid var(--color-primary, #E05638)'
                                      } : {
                                        color: isDayMode ? '#0f172a' : '#cbd5e1'
                                      }}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary, #E05638)' }}/>}
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
                      onClick={openAddToPlanModal}
                      className="border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      style={{
                        borderColor: 'var(--color-primary, #E05638)',
                        color: 'var(--color-primary, #E05638)'
                      }}
                    >
                      <CalendarPlus className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }}/> {t('addToPlan') || 'Add to Plan'}
                    </button>

                    <button
                      onClick={handleOpenShoppingModal}
                      className="border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      style={{
                        borderColor: 'var(--color-primary, #E05638)',
                        color: 'var(--color-primary, #E05638)'
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }}/> {t('shoppingList') || 'Shopping List'}
                    </button>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }} />

                  {/* Servings Stepper & Tools */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-xs font-bold flex items-center gap-1.5"
                        style={{ color: 'var(--color-primary, #E05638)' }}
                      >
                        <Users className="h-4 w-4"/> {t('servingsLabel') || 'Servings'}
                      </span>
                      <div 
                        className="flex items-center border rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                        }}
                      >
                        <button
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-2.5 py-1 font-bold cursor-pointer transition"
                          style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold min-w-[32px] text-center" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                          {currentTotalServings}
                        </span>
                        <button
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-2.5 py-1 font-bold cursor-pointer transition"
                          style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(t('timerSetAlert') || 'Kitchen Timer set for 15 minutes!')}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        }}
                      >
                        <Timer className="h-3.5 w-3.5"/> {t('timerBtn') || 'Timer'}
                      </button>
                      <button
                        onClick={handleOpenEdit}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5"/> {t('editBtn') || 'Edit'}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert(t('recipeLinkCopiedAlert') || 'Recipe link copied!');
                        }}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{
                          borderColor: 'var(--color-primary, #E05638)',
                          color: 'var(--color-primary, #E05638)'
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5"/> {t('shareRecipeBtn') || 'Share Recipe'}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-5 text-xs leading-relaxed" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>
                    {selectedRecipe.description}
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }} />

                  {/* Cooked Status / Star Rating / Note */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => updateSelectedRecipeState('isCooked', !selectedRecipe.isCooked)}
                        className="flex items-center gap-2.5 text-base font-extrabold group cursor-pointer select-none transition"
                        style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                      >
                        <span className="font-extrabold tracking-tight">
                          {selectedRecipe.isCooked ? (t('cooked') || 'Cooked') : (t('markAsCooked') || 'Mark as Cooked')}
                        </span>
                        
                        <span 
                          className="w-5 h-5 rounded-full flex items-center justify-center transition shadow-sm"
                          style={selectedRecipe.isCooked ? {
                            backgroundColor: 'var(--color-emerald, #10b981)',
                            color: '#ffffff'
                          } : {
                            border: isDayMode ? '1px solid #cbd5e1' : '1px solid var(--color-border, #1e293b)',
                            backgroundColor: 'transparent'
                          }}
                        >
                          {selectedRecipe.isCooked && <Check className="h-3.5 w-3.5 stroke-[3]"/>}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateSelectedRecipeState('rating', star)}
                            className="h-5 w-5 cursor-pointer transition"
                            style={{
                              color: (selectedRecipe.rating || 0) >= star ? 'var(--color-primary, #E05638)' : (isDayMode ? '#cbd5e1' : '#334155'),
                              fill: (selectedRecipe.rating || 0) >= star ? 'var(--color-primary, #E05638)' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-medium transition cursor-pointer"
                        style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                      >
                        <Edit3 className="h-3.5 w-3.5"/>
                        <span className="italic">{t('addANote') || 'Add a note'}</span>
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2 animate-in fade-in">
                          <input
                            type="text"
                            placeholder={t('addNotesPlaceholder') || 'Add notes...'}
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 border rounded-xl px-3 py-2 text-xs outline-none"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#0f172a' : '#ffffff'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm"
                            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                          >
                            {t('save') || 'Save'}
                          </button>
                        </div>
                      )}
                      {selectedRecipe.note && !isNoteOpen && (
                        <p 
                          className="text-xs italic"
                          style={{ color: 'var(--color-emerald, #10b981)' }}
                        >
                          Note: "{selectedRecipe.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }} />

                  {/* SOURCE SECTION */}
                  <div className="px-5 space-y-1 text-xs">
                    <h3 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('source') || 'Source'}</h3>
                    <div className="pt-0.5">
                      {selectedRecipe.sourceUrl ? (
                        <a
                          href={getSafeHref(selectedRecipe.sourceUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-sm hover:underline inline-flex items-center gap-1"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          <span className="underline">
                            {(t('visitSource') || 'Visit {domain}').replace('{domain}', getSafeHostname(selectedRecipe.sourceUrl))}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('createdManually') || 'Created manually'}</span>
                      )}
                    </div>
                    {selectedRecipe.sourceUrl && (
                      <p 
                        className="italic text-[11px] font-medium"
                        style={{ color: 'var(--color-emerald, #10b981)' }}
                      >
                        {t('recipeImportedExternal') || 'Recipe imported from external source'}
                      </p>
                    )}
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }} />

                  {/* INGREDIENTS SECTION */}
                  <div className="px-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('ingredientsHeading') || 'Ingredients'}</h3>
                      
                      <div 
                        className="flex items-center border rounded-lg overflow-hidden text-xs"
                        style={{
                          backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                        }}
                      >
                        <div className="px-2.5 py-1 border-r flex items-center justify-center" style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}>
                          <Type className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }}/>
                        </div>
                        <button
                          onClick={() => setFontSizeScale(Math.max(60, fontSizeScale - 10))}
                          className="px-2.5 py-1 font-bold cursor-pointer"
                          style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                        >
                          -
                        </button>
                        <span className="px-2.5 py-1 font-bold min-w-[42px] text-center" style={{ color: isDayMode ? '#0f172a' : '#e2e8f0' }}>
                          {fontSizeScale}%
                        </span>
                        <button
                          onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                          className="px-2.5 py-1 font-bold cursor-pointer"
                          style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
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
                            <span 
                              className="w-2 h-2 rounded-full inline-block shrink-0 mt-1.5"
                              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                            />
                            <span style={{ color: isDayMode ? '#334155' : '#e2e8f0' }}>
                              {(scaledAmt !== '' || unit) && (
                                <strong className="font-semibold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
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

                  <div className="border-t mx-5" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }} />

                  {/* INSTRUCTIONS SECTION */}
                  <div className="px-5 space-y-4">
                    <h3 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('instructionsHeading') || 'Instructions'}</h3>
                    
                    <div className="space-y-3.5" style={{ fontSize: `${fontSizeScale}%` }}>
                      {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, idx: number) => {
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
                            className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition select-none shadow-xs ${
                              isDone ? 'opacity-50' : ''
                            }`}
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                            }}
                          >
                            <div 
                              className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition"
                              style={isDone ? {
                                backgroundColor: 'var(--color-primary, #E05638)',
                                borderColor: 'var(--color-primary, #E05638)',
                                color: '#ffffff'
                              } : {
                                borderColor: 'var(--color-primary, #E05638)',
                                backgroundColor: 'transparent'
                              }}
                            >
                              {isDone && <Check className="h-3 w-3 stroke-[3]"/>}
                            </div>

                            <span 
                              className="font-extrabold shrink-0 text-sm"
                              style={{ color: 'var(--color-primary, #E05638)' }}
                            >
                              {idx + 1}.
                            </span>

                            <span 
                              className={`leading-relaxed flex-1 ${isDone ? 'line-through opacity-50' : ''}`}
                              style={{ color: isDayMode ? '#1e293b' : '#e2e8f0' }}
                            >
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }} />

                  {/* Delete Option */}
                  <div className="px-5 flex items-center justify-end text-xs">
                    <button
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="bg-red-950/60 border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-900/50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5"/> {t('deleteRecipeBtn') || 'Delete Recipe'}
                    </button>
                  </div>
                </div>
              ) : (
                /* EDIT RECIPE VIEW */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                    <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }}/> {t('editRecipeTitle') || 'Edit Recipe'}
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1 rounded-lg transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                    >
                      <X className="h-5 w-5"/>
                    </button>
                  </div>

                  <div 
                    className="flex p-1.5 rounded-2xl border"
                    style={{
                      backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    {[
                      { id: 'info', label: t('basicInfoTab') || 'Basic Info' },
                      { id: 'ingredients', label: t('ingredientsTab') || 'Ingredients' },
                      { id: 'steps', label: t('stepsTab') || 'Steps' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditTab(tab.id as any)}
                        className="flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer"
                        style={editTab === tab.id ? {
                          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                          color: isDayMode ? '#0f172a' : '#ffffff',
                          border: isDayMode ? '1px solid #cbd5e1' : '1px solid var(--color-border, #1e293b)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        } : {
                          color: isDayMode ? '#64748b' : '#94a3b8'
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
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px]"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {t('photoLabel') || 'Photo'}
                        </label>
                        <label 
                          className="border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group"
                          style={{
                            backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                          }}
                        >
                          {editForm.imageUrl ? (
                            <>
                              <img
                                src={editForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span 
                                  className="border text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                  style={{
                                    backgroundColor: 'rgba(17, 23, 38, 0.9)',
                                    borderColor: 'var(--color-border, #1e293b)'
                                  }}
                                >
                                  <ImagePlus className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }}/> {t('changePhoto') || 'Change Photo'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditForm({ ...editForm, imageUrl: '' });
                                  }}
                                  className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900 cursor-pointer"
                                >
                                  {t('removePhoto') || 'Remove'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 mx-auto transition" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}/>
                              <span className="text-xs font-bold block" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('addAPhoto') || 'Add a photo'}</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {t('recipeTitle') || 'Recipe Title'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full border rounded-xl p-3 text-sm outline-none"
                          style={{
                            backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#ffffff'
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                        />
                      </div>

                      <div>
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {t('description') || 'Description'}
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border rounded-xl p-3 text-xs outline-none resize-y leading-relaxed"
                          style={{
                            backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#ffffff'
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary, #E05638)' }}
                          >
                            {t('recipeTypeLabel') || 'Recipe Type'}
                          </label>
                          <select
                            value={editForm.recipeType}
                            onChange={(e) => setEditForm({ ...editForm, recipeType: e.target.value })}
                            className="w-full border rounded-xl p-3 text-xs outline-none cursor-pointer"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#0f172a' : '#ffffff'
                            }}
                          >
                            {RECIPE_TYPES.filter(t => t !== 'All Types').map((t) => (
                              <option key={t} value={t} style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary, #E05638)' }}
                          >
                            {t('servingsLabel') || 'Servings'}
                          </label>
                          <input
                            type="number"
                            value={editForm.servings}
                            onChange={(e) => setEditForm({ ...editForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#0f172a' : '#ffffff'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                          />
                        </div>
                      </div>

                      <div>
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {t('sourceUrlOptional') || 'Source URL (Optional)'}
                        </label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={editForm.sourceUrl || ''}
                          onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
                          className="w-full border rounded-xl p-3 text-xs outline-none"
                          style={{
                            backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#ffffff'
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary, #E05638)' }}
                          >
                            {t('prepTimeMins') || 'Preparation Time (mins)'}
                          </label>
                          <input
                            type="number"
                            value={editForm.prepTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#0f172a' : '#ffffff'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                          />
                        </div>

                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary, #E05638)' }}
                          >
                            {t('cookTimeMins') || 'Cooking Time (mins)'}
                          </label>
                          <input
                            type="number"
                            value={editForm.cookTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                              color: isDayMode ? '#0f172a' : '#ffffff'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-5 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer"
                          style={{
                            backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                            color: isDayMode ? '#475569' : '#cbd5e1'
                          }}
                        >
                          {t('cancel') || 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          onClick={handleSaveEdit}
                          className="px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg flex items-center gap-2 text-xs cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                        >
                          <Save className="h-4 w-4"/> {t('saveChanges') || 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editTab === 'ingredients' && (
                    <div 
                      className="border rounded-2xl p-5 space-y-4 animate-in fade-in text-xs"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                        borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h2 
                          className="text-sm font-bold uppercase tracking-wider"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {t('ingredientsHeading') || 'Ingredients'}
                        </h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                            style={isReorderingIngredients ? {
                              backgroundColor: 'var(--color-emerald, #10b981)',
                              color: '#ffffff',
                              borderColor: 'var(--color-emerald, #10b981)'
                            } : {
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                              color: isDayMode ? '#0f172a' : '#cbd5e1',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                            }}
                          >
                            {isReorderingIngredients ? (t('done') || 'Done') : (t('reorder') || 'Reorder')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              ingredients: [...editForm.ingredients, { amount: '', unit: '', item: '', category: categories[0] || 'Pantry Staples' }]
                            })}
                            className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                          >
                            <Plus className="h-3.5 w-3.5"/> {t('addIngredient') || 'Add Ingredient'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                            onDrop={handleDrop}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'cursor-grab' : ''
                            }`}
                            style={{
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                              borderColor: isReorderingIngredients ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')
                            }}
                          >
                            <input
                              type="text"
                              placeholder={t('amt') || 'Amt'}
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 border rounded-lg p-2 text-center font-bold outline-none"
                              style={{
                                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #090d16)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#0f172a' : '#ffffff'
                              }}
                            />
                            <input
                              type="text"
                              placeholder={t('unit') || 'Unit'}
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-20 border rounded-lg p-2 text-center outline-none"
                              style={{
                                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #090d16)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#0f172a' : '#cbd5e1'
                              }}
                            />
                            <input
                              type="text"
                              placeholder={t('ingredientNamePlaceholder') || 'Ingredient name...'}
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none outline-none px-2"
                              style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer"
                              style={{
                                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #090d16)',
                                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                color: isDayMode ? '#0f172a' : '#cbd5e1'
                              }}
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat} style={{ backgroundColor: isDayMode ? '#ffffff' : '#070b13', color: isDayMode ? '#0f172a' : '#ffffff' }}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 cursor-grab" style={{ color: 'var(--color-emerald, #10b981)' }}>
                                <GripVertical className="h-4 w-4"/>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  ingredients: editForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-500 hover:text-red-600 cursor-pointer"
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
                          className="font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                          style={{
                            backgroundColor: isDayMode ? '#e2e8f0' : 'var(--color-card, #111726)',
                            color: isDayMode ? '#0f172a' : '#cbd5e1'
                          }}
                        >
                          {t('backBtn') || '← Back'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTab('steps')}
                          className="text-white font-bold px-6 py-2 rounded-xl text-xs transition shadow-md cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                        >
                          {t('nextStepsBtn') || 'Next: Steps →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editTab === 'steps' && (
                    <div 
                      className="border rounded-2xl p-5 space-y-4 animate-in fade-in text-xs"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                        borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h2 
                          className="text-sm font-bold uppercase tracking-wider"
                          style={{ color: 'var(--color-primary, #E05638)' }}
                        >
                          {t('stepByStepInstructions') || 'Step-by-Step Instructions'}
                        </h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                            style={isReorderingSteps ? {
                              backgroundColor: 'var(--color-emerald, #10b981)',
                              color: '#ffffff',
                              borderColor: 'var(--color-emerald, #10b981)'
                            } : {
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                              color: isDayMode ? '#0f172a' : '#cbd5e1',
                              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                            }}
                          >
                            {isReorderingSteps ? (t('done') || 'Done') : (t('reorder') || 'Reorder')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              instructions: [...editForm.instructions, '']
                            })}
                            className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                          >
                            <Plus className="h-3.5 w-3.5"/> {t('addStep') || 'Add Step'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                            onDrop={handleDrop}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                              isReorderingSteps ? 'cursor-grab' : ''
                            }`}
                            style={{
                              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                              borderColor: isReorderingSteps ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')
                            }}
                          >
                            <span 
                              className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1"
                              style={{
                                backgroundColor: 'rgba(224, 86, 56, 0.2)',
                                color: 'var(--color-primary, #E05638)'
                              }}
                            >
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={(t('describeStepPlaceholder') || 'Describe step {n}...').replace('{n}', String(idx + 1))}
                              value={step}
                              onChange={(e) => {
                                const list = [...editForm.instructions];
                                list[idx] = e.target.value;
                                setEditForm({ ...editForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none outline-none resize-y"
                              style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 cursor-grab mt-1" style={{ color: 'var(--color-emerald, #10b981)' }}>
                                <GripVertical className="h-4 w-4"/>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  instructions: editForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-slate-400 hover:text-red-500 h-fit cursor-pointer"
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
                          className="font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                          style={{
                            backgroundColor: isDayMode ? '#e2e8f0' : 'var(--color-card, #111726)',
                            color: isDayMode ? '#0f172a' : '#cbd5e1'
                          }}
                        >
                          {t('backBtn') || '← Back'}
                        </button>
                        <button
                          type="submit"
                          onClick={handleSaveEdit}
                          className="text-white font-bold px-8 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                        >
                          <Save className="h-4 w-4"/> {t('saveChanges') || 'Save Changes'}
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

      {/* ADD TO PLAN MODAL */}
      {showAddToPlanModal && selectedRecipe && (
        <div 
          onClick={() => setShowAddToPlanModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0f1115)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowAddToPlanModal(false)} 
              className="absolute top-4 right-4 p-2 rounded-lg transition cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #1e2430)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <X className="h-4 w-4"/>
            </button>

            <div className="pr-6 space-y-1">
              <h2 
                className="text-xl font-black tracking-tight"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {t('addToCalendar') || 'Add to Calendar'}
              </h2>
              <p className="text-xs leading-snug" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {(t('scheduleRecipeInMealPlan') || 'Schedule {title} in your meal plan').replace('{title}', selectedRecipe.title || selectedRecipe.name)}
              </p>
            </div>

            <form onSubmit={handleSaveToCalendar} className="space-y-4 pt-1">
              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('date') || 'Date'}
                </label>
                <div className="relative flex items-center">
                  <Calendar className="h-4 w-4 absolute left-3.5 pointer-events-none" style={{ color: 'var(--color-primary, #E05638)' }}/>
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: 'var(--color-primary, #E05638)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('mealType') || 'Meal Type'}
                </label>
                <div className="relative flex items-center">
                  <select
                    value={planMealType}
                    onChange={(e) => setPlanMealType(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer appearance-none"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#e2e8f0'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  >
                    <option value="Breakfast" style={{ backgroundColor: isDayMode ? '#ffffff' : '#07090e', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('breakfast') || 'Breakfast'}</option>
                    <option value="Lunch" style={{ backgroundColor: isDayMode ? '#ffffff' : '#07090e', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('lunch') || 'Lunch'}</option>
                    <option value="Dinner" style={{ backgroundColor: isDayMode ? '#ffffff' : '#07090e', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('dinner') || 'Dinner'}</option>
                    <option value="Snack" style={{ backgroundColor: isDayMode ? '#ffffff' : '#07090e', color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('snack') || 'Snack'}</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}/>
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('time') || 'Time'}
                </label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 absolute left-3.5 pointer-events-none" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}/>
                  <input
                    type="time"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full border rounded-xl px-10 py-2.5 text-xs outline-none"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#e2e8f0'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    placeholder="--:-- --"
                  />
                  <Clock className="h-4 w-4 absolute right-3.5 pointer-events-none" style={{ color: 'var(--color-primary, #E05638)' }}/>
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold mb-1.5"
                  style={{ color: 'var(--color-primary, #E05638)' }}
                >
                  {t('notes') || 'Notes'}
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder={t('addNotesRemindersPlaceholder') || 'Add any notes or reminders...'}
                  rows={3}
                  className="w-full border rounded-xl p-3 text-xs outline-none resize-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#e2e8f0'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(false)}
                  className="px-5 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: 'var(--color-primary, #E05638)',
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #07090e)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  {t('addToCalendarBtn') || 'Add to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHOPPING LIST MODAL */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0c111d)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  <ShoppingCart className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }}/> {t('addToShoppingListTitle') || 'Add to Shopping List'}
                </h3>
                <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('selectOrEditItemsShopping') || 'Select or edit items to add directly to your list'}</p>
              </div>
              <button 
                onClick={() => setIsShoppingModalOpen(false)} 
                className="cursor-pointer transition"
                style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
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
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div
                    onClick={() => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].selected = !updated[idx].selected;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition"
                    style={ing.selected ? {
                      backgroundColor: 'var(--color-primary, #E05638)',
                      borderColor: 'var(--color-primary, #E05638)',
                      color: '#ffffff'
                    } : {
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)'
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
                      backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    placeholder={t('amt') || 'Amt'}
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
                      backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                    placeholder={t('unit') || 'Unit'}
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].name = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="flex-1 bg-transparent border-none outline-none px-2"
                    style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}
                    placeholder={t('ingredientNamePlaceholder') || 'Ingredient name...'}
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].category = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#cbd5e1'
                    }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} style={{ backgroundColor: isDayMode ? '#ffffff' : '#111726', color: isDayMode ? '#0f172a' : '#ffffff' }}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <button
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
                  color: isDayMode ? '#475569' : '#cbd5e1'
                }}
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
              >
                <ShoppingCart className="h-3.5 w-3.5"/> {t('addSelectedToList') || 'Add Selected to List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(page_code)
print(f"✓ Updated SavedRecipesPage to query and save using User ID at: {target_path}")

# 3. Migrate existing stored recipes in data files to assign userId: "usr_admin_1"
json_candidates = [
    'apps/web/data/saved_recipes.json',
    'data/saved_recipes.json'
]

for j_path in json_candidates:
    if os.path.exists(j_path) and not os.path.islink(j_path):
        try:
            with open(j_path, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
            
            modified = False
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        if not item.get('userId') or item.get('userId') != 'usr_admin_1':
                            item['userId'] = 'usr_admin_1'
                            modified = True
            
            if modified:
                with open(j_path, 'w', encoding='utf-8') as fp:
                    json.dump(data, fp, indent=2)
                print(f"✓ Backfilled userId='usr_admin_1' in {j_path}")
        except Exception as err:
            print(f"⚠️ Could not migrate {j_path}: {err}")

