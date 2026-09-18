// @ts-nocheck
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Book, Plus, Utensils, Trash2, Edit3, Save, X, 
  ArrowRight, Palette, Check, Clock, Timer, Share2, 
  CheckCircle2, CalendarPlus, ShoppingCart, 
  BookmarkPlus, Heart, Star, ChevronDown, ImagePlus,
  GripVertical, CheckSquare, ExternalLink, Users,
  Search, ChevronLeft, ChevronRight, Grid3X3, LayoutGrid, Rows3,
  Pipette
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

const COVER_GRADIENTS = [
  { label: 'Rose & Pink', value: 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600' },
  { label: 'Emerald Green', value: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
  { label: 'Sunset Orange', value: 'bg-gradient-to-r from-orange-500 to-amber-600' },
  { label: 'Royal Purple', value: 'bg-gradient-to-r from-purple-600 to-indigo-800' },
  { label: 'Ocean Blue', value: 'bg-gradient-to-r from-blue-600 to-cyan-600' },
  { label: 'Slate Charcoal', value: 'bg-gradient-to-r from-slate-700 to-slate-900' },
];

const DEFAULT_CATEGORIES = [
  'Produce', 'Meat and Seafood', 'Dairy', 
  'Grains and Pasta', 'Pantry Staples', 
  'Condiments and Sauces', 'Beverages'
];

type GridMode = '3x3' | '4x4' | '5x5';

const GRID_CONFIG: Record<GridMode, { colsClass: string; perPage: number; label: string; headerHeight: string; titleSize: string }> = {
  '3x3': {
    colsClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    perPage: 9,
    label: '3×3',
    headerHeight: 'h-36',
    titleSize: 'text-xl'
  },
  '4x4': {
    colsClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    perPage: 16,
    label: '4×4',
    headerHeight: 'h-28',
    titleSize: 'text-base'
  },
  '5x5': {
    colsClass: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    perPage: 25,
    label: '5×5',
    headerHeight: 'h-24',
    titleSize: 'text-sm'
  }
};

const isGradientClass = (color?: string) => {
  if (!color) return true;
  return color.startsWith('bg-') || color.startsWith('from-');
};

const getCoverBgStyle = (color?: string) => {
  if (!color || isGradientClass(color)) return undefined;
  return { backgroundColor: color };
};

export const isRecipeInBook = (rec: any, bookId: string): boolean => {
  if (!rec || !bookId) return false;
  return rec.bookId === bookId || rec.book_id === bookId;
};

export default function BooksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // Search, Grid Density & Pagination States
  const [search, setSearch] = useState('');
  const [gridMode, setGridMode] = useState<GridMode>('3x3');
  const [currentPage, setCurrentPage] = useState(1);

  // Cookbook Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // Form States for Cookbook Create
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCoverColor, setNewCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Form States for Cookbook Edit
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCoverColor, setEditCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Specific Recipe Popup State
  const [viewingRecipe, setViewingRecipe] = useState<any | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Recipe Editing State
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editRecipeTab, setEditRecipeTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editRecipeForm, setEditRecipeForm] = useState<any>({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    imageUrl: '',
    ingredients: [],
    instructions: []
  });
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  // Add to Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planMealTime, setPlanMealTime] = useState('19:00');

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

  const loadData = useCallback(async (user: User | null) => {
    if (!user) return;
    const activeUserId = user.id || 'usr_admin_1';

    let loadedRecipes: any[] = [];
    try {
      const rRes = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(activeUserId)}`, { cache: 'no-store' });
      if (rRes.ok) {
        const rData = await rRes.json();
        if (Array.isArray(rData.recipes)) {
          loadedRecipes = rData.recipes;
        }
      }
    } catch (_) {}

    if (loadedRecipes.length === 0 && typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
        if (local) {
          const arr = JSON.parse(local);
          if (Array.isArray(arr)) loadedRecipes = arr;
        }
      } catch (_) {}
    }
    setRecipes(loadedRecipes);

    let loadedBooks: any[] = [];
    let fetchSuccess = false;
    try {
      const bRes = await fetch(`/api/books?userId=${encodeURIComponent(activeUserId)}`, { cache: 'no-store' });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData.books)) {
          loadedBooks = bData.books;
          fetchSuccess = true;
        }
      }
    } catch (_) {}

    if (!fetchSuccess && typeof window !== 'undefined') {
      try {
        const localB = localStorage.getItem('zecratary_recipe_books');
        if (localB) {
          const arrB = JSON.parse(localB);
          if (Array.isArray(arrB)) loadedBooks = arrB;
        }
      } catch (_) {}
    }

    const syncdBooks = loadedBooks.map((b: any) => ({
      ...b,
      recipeCount: loadedRecipes.filter((r: any) => isRecipeInBook(r, b.id)).length
    }));

    setBooks(syncdBooks);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_recipe_books', JSON.stringify(syncdBooks));
        localStorage.setItem('zecratary_saved_recipes', JSON.stringify(loadedRecipes));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    document.title = `${t('recipeBooksTitle') || 'Recipe Books'} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    setCurrentUser(user);
    loadData(user);

    const handleSync = () => {
      const active = getCurrentUser();
      if (active) {
        setCurrentUser(active);
        loadData(active);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_recipe_books_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_recipe_books_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadData, router, t]);

  const saveBooks = async (updatedUserBooks: any[]) => {
    if (!currentUser) return;
    setBooks(updatedUserBooks);

    try {
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserBooks)
      });

      const raw = localStorage.getItem('zecratary_recipe_books');
      const allBooks: any[] = raw ? JSON.parse(raw) : [];
      const others = allBooks.filter((b: any) => b.userId !== currentUser.id && b.createdBy !== currentUser.email);
      localStorage.setItem('zecratary_recipe_books', JSON.stringify([...updatedUserBooks, ...others]));

      window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save books to PostgreSQL', e);
    }
  };

  const saveAllRecipes = async (updatedUserList: any[]) => {
    if (!currentUser) return;
    setRecipes(updatedUserList);

    try {
      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserList)
      });

      localStorage.setItem('zecratary_recipes', JSON.stringify(updatedUserList));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedUserList));

      const updatedBooks = books.map((b: any) => ({
        ...b,
        recipeCount: updatedUserList.filter((r: any) => isRecipeInBook(r, b.id)).length
      }));
      await saveBooks(updatedBooks);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_recipes_updated'));
        window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error('Failed to save recipes to PostgreSQL', e);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;

    const newBook = {
      id: 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id,
      createdBy: currentUser.email,
      creatorName: currentUser.name,
      title: newTitle.trim(),
      description: newDesc.trim() || (t('customRecipeCollection') || 'Custom recipe collection'),
      recipeCount: 0,
      coverColor: newCoverColor,
      createdAt: new Date().toISOString()
    };

    const updated = [...books, newBook];
    await saveBooks(updated);
    setNewTitle('');
    setNewDesc('');
    setNewCoverColor(COVER_GRADIENTS[0].value);
    setShowAddModal(false);
  };

  const openEditModal = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setEditingBook(book);
    setEditTitle(book.title || '');
    setEditDesc(book.description || '');
    setEditCoverColor(book.coverColor || COVER_GRADIENTS[0].value);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editTitle.trim() || !currentUser) return;

    const updated = books.map((b) =>
      b.id === editingBook.id
        ? {
            ...b,
            userId: currentUser.id,
            createdBy: currentUser.email,
            creatorName: currentUser.name,
            title: editTitle.trim(),
            description: editDesc.trim(),
            coverColor: editCoverColor,
          }
        : b
    );

    await saveBooks(updated);

    if (selectedBook?.id === editingBook.id) {
      setSelectedBook({
        ...selectedBook,
        userId: currentUser.id,
        createdBy: currentUser.email,
        creatorName: currentUser.name,
        title: editTitle.trim(),
        description: editDesc.trim(),
        coverColor: editCoverColor,
      });
    }

    setEditingBook(null);
  };

  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteBook') || 'Are you sure you want to delete this recipe book?')) return;
    
    try {
      const res = await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Failed to delete book from server, status:', res.status);
      }

      const updated = books.filter((b) => b.id !== id);
      setBooks(updated);

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('zecratary_recipe_books');
          if (raw) {
            const arr = JSON.parse(raw);
            const filtered = Array.isArray(arr) ? arr.filter((b: any) => b.id !== id) : [];
            localStorage.setItem('zecratary_recipe_books', JSON.stringify(filtered));
          }
        } catch (_) {}
      }

      const cleanedRecipes = recipes.map(r => (isRecipeInBook(r, id) ? { ...r, bookId: null, book_id: null } : r));
      setRecipes(cleanedRecipes);

      if (selectedBook?.id === id) setSelectedBook(null);
      
      window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error deleting book:', err);
    }
  };

  const handleOpenRecipePopup = (rec: any) => {
    setViewingRecipe(rec);
    setServingsMultiplier(1);
    setFontSizeScale(100);
    setCompletedSteps([]);
    setNoteText(rec.note || '');
    setIsNoteOpen(false);
    setIsBookDropdownOpen(false);
    setIsEditingRecipe(false);
  };

  const updateViewingRecipeState = async (key: string, val: any) => {
    if (!viewingRecipe) return;
    const updatedRec = { ...viewingRecipe, [key]: val };
    setViewingRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    await saveAllRecipes(updatedList);
  };

  const handleAssignToBook = async (bookId: string) => {
    if (!viewingRecipe) return;
    const isRemoving = isRecipeInBook(viewingRecipe, bookId);
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { 
      ...viewingRecipe, 
      bookId: targetBookId,
      book_id: targetBookId 
    };
    setViewingRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === viewingRecipe.id ? updatedRecipe : r);
    await saveAllRecipes(updatedList);

    const targetBookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    const recName = viewingRecipe.title || viewingRecipe.name;
    if (isRemoving) {
      const msg = (t('removedFromBookAlert') || 'Removed "{title}" from "{book}"')
        .replace('{title}', recName)
        .replace('{book}', targetBookTitle);
      alert(msg);
    } else {
      const msg = (t('assignedToBookAlert') || 'Assigned "{title}" to "{book}"!')
        .replace('{title}', recName)
        .replace('{book}', targetBookTitle);
      alert(msg);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm(t('confirmDeleteRecipe') || 'Are you sure you want to delete this recipe?')) return;
    try {
      await fetch(`/api/recipes/saved?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const updated = recipes.filter(r => r.id !== id);
      await saveAllRecipes(updated);
      setViewingRecipe(null);
      setIsEditingRecipe(false);
    } catch (err) {
      console.error('Error deleting recipe:', err);
    }
  };

  const toggleStepComplete = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(i => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const calculateScaledAmount = (baseAmount: any, baseServings: number, currentServings: number) => {
    if (!baseAmount || isNaN(Number(baseAmount))) return baseAmount;
    const num = Number(baseAmount);
    const scaled = (num / (baseServings || 4)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
  };

  const handleOpenEditRecipe = () => {
    if (!viewingRecipe) return;
    setEditRecipeForm({
      title: viewingRecipe.title || viewingRecipe.name || '',
      description: viewingRecipe.description || '',
      recipeType: viewingRecipe.recipeType || viewingRecipe.tags?.[0] || 'Main Dish',
      servings: viewingRecipe.servings || 4,
      prepTimeMinutes: viewingRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: viewingRecipe.cookTimeMinutes || 30,
      imageUrl: viewingRecipe.imageUrl || viewingRecipe.image || '',
      ingredients: viewingRecipe.ingredients
        ? viewingRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? 'Pantry Staples' : ing.category || 'Pantry Staples'
          }))
        : [{ amount: '', unit: '', item: '', category: 'Pantry Staples' }],
      instructions: viewingRecipe.instructions && viewingRecipe.instructions.length > 0
        ? [...viewingRecipe.instructions]
        : ['']
    });
    setEditRecipeTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditingRecipe(true);
  };

  const handleSaveRecipeEdit = async () => {
    if (!editRecipeForm.title.trim() || !currentUser) {
      alert(t('enterRecipeTitleAlert') || 'Please enter a recipe title.');
      setEditRecipeTab('info');
      return;
    }

    const updatedRec = {
      ...viewingRecipe,
      ...editRecipeForm,
      userId: currentUser.id,
      createdBy: currentUser.email,
      creatorName: currentUser.name,
      tags: [editRecipeForm.recipeType]
    };

    setViewingRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    await saveAllRecipes(updatedList);
    setIsEditingRecipe(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditRecipeForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (type === 'ingredients') {
      const list = [...editRecipeForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditRecipeForm({ ...editRecipeForm, ingredients: list });
    } else {
      const list = [...editRecipeForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditRecipeForm({ ...editRecipeForm, instructions: list });
    }
    setDraggedIndex(index);
  };
  const handleDrop = () => setDraggedIndex(null);

  const handleOpenShoppingModal = () => {
    if (!viewingRecipe) return;
    const items = (viewingRecipe.ingredients || []).map((ing: any, idx: number) => ({
      id: 'shop_item_' + idx,
      selected: true,
      amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
      unit: typeof ing === 'string' ? '' : ing.unit || '',
      name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
      category: typeof ing === 'string' ? 'Pantry Staples' : ing.category || 'Pantry Staples'
    }));
    setShoppingModalIngredients(items);
    setIsShoppingModalOpen(true);
  };

  const handleConfirmAddToShoppingList = () => {
    if (!currentUser) return;
    const selectedItems = shoppingModalIngredients.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert(t('noIngredientsSelectedAlert') || 'No ingredients selected.');
      return;
    }
    const local = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const current = local ? JSON.parse(local) : [];
    const formatted = selectedItems.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      userId: currentUser.id,
      createdBy: currentUser.email,
      creatorName: currentUser.name,
      name: i.name,
      quantity: i.amount || '1',
      unit: i.unit || 'item',
      category: i.category,
      checked: false,
      createdAt: new Date().toISOString()
    }));
    const updated = [...formatted, ...current];
    localStorage.setItem('zecratary_shopping', JSON.stringify(updated));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
    setIsShoppingModalOpen(false);
    const alertMsg = (t('addedIngredientsToShoppingAlert') || 'Added {count} ingredients to your Shopping List!')
      .replace('{count}', String(selectedItems.length));
    alert(alertMsg);
  };

  const handleConfirmAddToPlan = () => {
    if (!viewingRecipe || !currentUser) return;
    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const planItems = localPlan ? JSON.parse(localPlan) : [];
    const newMeal = {
      id: 'plan_' + Date.now(),
      userId: currentUser.id,
      createdBy: currentUser.email,
      creatorName: currentUser.name,
      date: planDate,
      recipeId: viewingRecipe.id,
      recipeName: viewingRecipe.title || viewingRecipe.name,
      image: viewingRecipe.imageUrl || viewingRecipe.image,
      mealType: planMealType,
      time: planMealTime,
      isLeftover: false,
      notes: '',
      createdAt: new Date().toISOString()
    };
    const updatedPlan = [...planItems, newMeal];
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updatedPlan));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    setIsPlanModalOpen(false);
    const alertMsg = (t('addedToMealPlanAlert') || 'Added "{title}" to meal plan on {date}!')
      .replace('{title}', viewingRecipe.title || viewingRecipe.name)
      .replace('{date}', planDate);
    alert(alertMsg);
  };

  const filteredBooks = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return books;
    return books.filter((b) =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q)
    );
  }, [books, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, gridMode]);

  const itemsPerPage = GRID_CONFIG[gridMode].perPage;
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + itemsPerPage);

  const baseServings = viewingRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;
  const assignedBook = books.find(b => isRecipeInBook(viewingRecipe, b.id));

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-16 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('recipeBooksTitle') || 'Recipe Books'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {currentUser 
              ? (t('recipeBooksSubtitleUser') || "{name}'s curated cookbooks ({count})")
                  .replace('{name}', currentUser.name)
                  .replace('{count}', String(books.length))
              : (t('recipeBooksSubtitleDefault') || 'Organize your saved recipes into curated digital cookbooks')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Density Selector */}
          <div 
            className="flex items-center p-1 rounded-xl border shadow-sm"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            {(['3x3', '4x4', '5x5'] as GridMode[]).map((mode) => {
              const isActive = gridMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGridMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer`}
                  style={isActive ? {
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(224, 86, 56, 0.3)'
                  } : {
                    color: 'var(--color-text-secondary)',
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

          <button
            onClick={() => setShowAddModal(true)}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <Plus className="h-4 w-4" /> {t('createRecipeBookBtn') || 'Create Recipe Book'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
        <input
          type="text"
          placeholder={t('searchCookbooksPlaceholder') || 'Search cookbooks by title or description...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)'
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 transition"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Books Grid */}
      {paginatedBooks.length === 0 ? (
        <div 
          className="p-12 rounded-3xl text-center space-y-2 border"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          <Book className="h-8 w-8 mx-auto" style={{ color: 'var(--color-text-secondary)' }} />
          <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{t('noCookbooksFound') || 'No cookbooks found'}</h4>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {search 
              ? (t('tryClearingSearch') || 'Try clearing your search query.') 
              : (t('createFirstCookbook') || 'Create your first cookbook collection using the button above.')}
          </p>
        </div>
      ) : (
        <div className={`grid ${GRID_CONFIG[gridMode].colsClass} gap-6`}>
          {paginatedBooks.map((book) => {
            const count = recipes.filter((r: any) => isRecipeInBook(r, book.id)).length;
            const cfg = GRID_CONFIG[gridMode];
            return (
              <div
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="rounded-3xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-sm hover:shadow-md border"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div 
                  className={`${cfg.headerHeight} w-full ${isGradientClass(book.coverColor) ? (book.coverColor || COVER_GRADIENTS[0].value) : ''} p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-inner`}
                  style={getCoverBgStyle(book.coverColor)}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/25 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
                      {t('cookbookBadge') || 'COOKBOOK'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-black/25 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                      <Book className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <h3 className={`font-black text-white ${cfg.titleSize} leading-snug drop-shadow-md z-10 truncate`}>
                    {book.title}
                  </h3>
                </div>

                <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs leading-relaxed line-clamp-2 min-h-[32px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {book.description || (t('customRecipeCollection') || 'Custom recipe collection')}
                  </p>

                  <div 
                    className="flex items-center justify-between pt-3 border-t text-xs"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span className="font-bold flex items-center gap-1.5 truncate pr-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <Utensils className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} /> 
                      {(t('recipesCountSuffix') || '{count} recipes').replace('{count}', String(count))}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(e, book)}
                        className="p-1.5 rounded-xl transition cursor-pointer"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title={t('editCookbookTooltip') || 'Edit Cookbook'}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBook(e, book.id)}
                        className="p-1.5 rounded-xl transition cursor-pointer hover:text-red-500"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title={t('deleteCookbookTooltip') || 'Delete Cookbook'}
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

      {/* Pagination Controls */}
      {filteredBooks.length > 0 && (
        <div 
          className="pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {t('showing') || 'Showing'} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{startIndex + 1}</strong> - <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{Math.min(startIndex + itemsPerPage, filteredBooks.length)}</strong> {t('of') || 'of'} <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{filteredBooks.length}</strong> {t('cookbooksSuffix') || 'cookbooks'}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border disabled:opacity-30 transition cursor-pointer shadow-sm"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              title={t('previousPageTooltip') || 'Previous Page'}
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
                    {showEllipsis && <span className="px-1 font-bold" style={{ color: 'var(--color-text-secondary)' }}>...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className="min-w-[32px] h-8 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-sm"
                      style={safeCurrentPage === num ? {
                        backgroundColor: 'var(--color-primary)',
                        borderColor: 'var(--color-primary)',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(224, 86, 56, 0.3)'
                      } : {
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
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
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              title={t('nextPageTooltip') || 'Next Page'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* EDIT BOOK MODAL */}
      {editingBook && (
        <div 
          onClick={() => setEditingBook(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs animate-in fade-in cursor-default border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              onClick={() => setEditingBook(null)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('editRecipeBookTitle') || 'Edit Recipe Book'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('editRecipeBookSub') || 'Update your cookbook title, description, and cover color.'}
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block font-bold mb-1.5 text-xs" style={{ color: 'var(--color-text)' }}>
                  {t('bookTitleLabel') || 'Book Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('bookTitlePlaceholderEdit') || 'e.g. Baking & Desserts'}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none"
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
                <label className="block font-bold mb-1.5 text-xs" style={{ color: 'var(--color-text)' }}>
                  {t('templateDescriptionLabel') || 'Description'}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('bookDescPlaceholder') || 'Short summary of this cookbook collection...'}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none resize-none leading-relaxed"
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
                <label className="block font-bold mb-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <Palette className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('backgroundColorLabel') || 'Background Color'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {COVER_GRADIENTS.map((g) => {
                    const isSelected = editCoverColor === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setEditCoverColor(g.value)}
                        className={`h-11 rounded-xl ${g.value} flex items-center justify-center transition border-2 cursor-pointer ${
                          isSelected ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={g.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div 
                  className="mt-3 p-3 rounded-2xl border flex items-center justify-between transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: !isGradientClass(editCoverColor) ? 'var(--color-primary)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="relative w-9 h-9 rounded-xl border-2 flex items-center justify-center overflow-hidden cursor-pointer shadow-md transition"
                      style={{
                        borderColor: !isGradientClass(editCoverColor) ? '#ffffff' : 'var(--color-border)',
                        backgroundColor: !isGradientClass(editCoverColor) ? editCoverColor : '#E05638'
                      }}
                    >
                      <input
                        type="color"
                        value={!isGradientClass(editCoverColor) && editCoverColor.startsWith('#') && editCoverColor.length === 7 ? editCoverColor : '#E05638'}
                        onChange={(e) => setEditCoverColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Pick custom color"
                      />
                      {!isGradientClass(editCoverColor) ? (
                        <Check className="h-4 w-4 text-white stroke-[3] drop-shadow pointer-events-none" />
                      ) : (
                        <Pipette className="h-4 w-4 text-white drop-shadow pointer-events-none" />
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>{t('customColorLabel') || 'Custom Color'}</span>
                      <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{t('customColorHint') || 'Click to pick color wheel or type hex'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>#</span>
                    <input
                      type="text"
                      placeholder="E05638"
                      value={!isGradientClass(editCoverColor) ? editCoverColor.replace('#', '') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.trim().replace('#', '');
                        setEditCoverColor('#' + raw);
                      }}
                      maxLength={6}
                      className="w-20 px-2.5 py-1.5 rounded-xl border text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold transition flex items-center gap-1.5 shadow-lg text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  <Save className="h-4 w-4" /> {t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BOOK MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs animate-in fade-in cursor-default border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Book className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('createRecipeBookTitle') || 'Create Recipe Book'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('createRecipeBookSub') || 'Create a new curated recipe collection.'}
              </p>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block font-bold mb-1.5 text-xs" style={{ color: 'var(--color-text)' }}>
                  {t('bookTitleLabel') || 'Book Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('bookTitlePlaceholder') || 'e.g. Weekend Baking & Desserts'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none"
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
                <label className="block font-bold mb-1.5 text-xs" style={{ color: 'var(--color-text)' }}>
                  {t('templateDescriptionLabel') || 'Description'}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('bookDescPlaceholder') || 'Short summary of this cookbook collection...'}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none resize-none leading-relaxed"
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
                <label className="block font-bold mb-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <Palette className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('backgroundColorLabel') || 'Background Color'}
                </label>
                
                <div className="grid grid-cols-3 gap-2.5">
                  {COVER_GRADIENTS.map((g) => {
                    const isSelected = newCoverColor === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setNewCoverColor(g.value)}
                        className={`h-11 rounded-xl ${g.value} flex items-center justify-center transition border-2 cursor-pointer ${
                          isSelected ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={g.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div 
                  className="mt-3 p-3 rounded-2xl border flex items-center justify-between transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: !isGradientClass(newCoverColor) ? 'var(--color-primary)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="relative w-9 h-9 rounded-xl border-2 flex items-center justify-center overflow-hidden cursor-pointer shadow-md transition"
                      style={{
                        borderColor: !isGradientClass(newCoverColor) ? '#ffffff' : 'var(--color-border)',
                        backgroundColor: !isGradientClass(newCoverColor) ? newCoverColor : '#E05638'
                      }}
                    >
                      <input
                        type="color"
                        value={!isGradientClass(newCoverColor) && newCoverColor.startsWith('#') && newCoverColor.length === 7 ? newCoverColor : '#E05638'}
                        onChange={(e) => setNewCoverColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Click to pick custom color"
                      />
                      {!isGradientClass(newCoverColor) ? (
                        <Check className="h-4 w-4 text-white stroke-[3] drop-shadow pointer-events-none" />
                      ) : (
                        <Pipette className="h-4 w-4 text-white drop-shadow pointer-events-none" />
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>{t('customColorLabel') || 'Custom Color'}</span>
                      <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{t('customColorHint') || 'Pick color wheel or enter hex'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>#</span>
                    <input
                      type="text"
                      placeholder="E05638"
                      value={!isGradientClass(newCoverColor) ? newCoverColor.replace('#', '') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.trim().replace('#', '');
                        setNewCoverColor('#' + raw);
                      }}
                      maxLength={6}
                      className="w-20 px-2.5 py-1.5 rounded-xl border text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white font-bold transition flex items-center gap-1.5 shadow-lg text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {t('createRecipeBookBtn') || 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BOOK DETAILS MODAL */}
      {selectedBook && (
        <div 
          onClick={() => setSelectedBook(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto cursor-default border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div 
              className={`h-32 w-full ${isGradientClass(selectedBook.coverColor) ? (selectedBook.coverColor || COVER_GRADIENTS[0].value) : ''} rounded-2xl p-6 flex flex-col justify-between text-white shadow-md`}
              style={getCoverBgStyle(selectedBook.coverColor)}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  {t('cookbookDetailsBadge') || 'Cookbook Details'}
                </span>
                <button
                  onClick={(e) => openEditModal(e, selectedBook)}
                  className="bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> {t('editBookBtn') || 'Edit Book'}
                </button>
              </div>
              <div>
                <h2 className="text-2xl font-black">{selectedBook.title}</h2>
                <p className="text-xs text-white/90 mt-0.5 line-clamp-1">{selectedBook.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {(t('recipesInThisBook') || 'Recipes in this Book ({count})')
                    .replace('{count}', String(recipes.filter((r: any) => isRecipeInBook(r, selectedBook.id)).length))}
                </h3>
                <Link
                  href="/saved"
                  className="text-xs font-bold hover:underline flex items-center gap-1"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('browseRecipes') || 'Browse Recipes'} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recipes.filter((r: any) => isRecipeInBook(r, selectedBook.id)).length === 0 ? (
                <div 
                  className="p-8 rounded-2xl text-center space-y-2 border"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <Utensils className="h-8 w-8 mx-auto" style={{ color: 'var(--color-text-secondary)' }} />
                  <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{t('noRecipesInBook') || 'No recipes in this book yet'}</h4>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('assignRecipeHint') || 'Open any saved recipe and assign it to this cookbook.'}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipes
                    .filter((r: any) => isRecipeInBook(r, selectedBook.id))
                    .map((rec: any) => (
                      <div 
                        key={rec.id} 
                        className="flex items-center justify-between p-3 rounded-xl border text-xs"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <img src={rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80'} alt={rec.title || rec.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold" style={{ color: 'var(--color-text)' }}>{rec.title || rec.name}</h4>
                            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                              {rec.recipeType || rec.tags?.[0] || 'Main Dish'} • {(t('servingsSuffix') || '{count} servings').replace('{count}', String(rec.servings || 4))}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenRecipePopup(rec)}
                          className="font-bold px-3 py-1.5 rounded-lg transition border cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        >
                          {t('viewBtn') || 'View'}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SPECIFIC RECIPE POPUP MODAL */}
      {viewingRecipe && (
        <div 
          onClick={() => { setViewingRecipe(null); setIsEditingRecipe(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              onClick={() => { setViewingRecipe(null); setIsEditingRecipe(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-xl border backdrop-blur-md transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditingRecipe ? (
                /* RECIPE DETAILS VIEW */
                <div className="space-y-5 pb-8">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                    <img
                      src={viewingRecipe.imageUrl || viewingRecipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                      alt={viewingRecipe.title || viewingRecipe.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {viewingRecipe.title || viewingRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="border text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/60 border-white/20">
                          <Clock className="h-3.5 w-3.5" /> 
                          {(t('cookTimePrefix') || 'Cook: {time} minutes').replace('{time}', String(viewingRecipe.cookTimeMinutes || 10))}
                        </span>
                        <span className="border text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/60 border-white/20">
                          <Clock className="h-3.5 w-3.5" /> 
                          {(t('prepTimePrefix') || 'Prep: {time} minutes').replace('{time}', String(viewingRecipe.prepTimeMinutes || 30))}
                        </span>
                        <span className="border text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/60 border-white/20">
                          <Utensils className="h-3.5 w-3.5" /> {viewingRecipe.tags?.[0] || viewingRecipe.recipeType || 'Main Dish'}
                        </span>
                        
                        <button
                          onClick={() => updateViewingRecipeState('isFavorite', !viewingRecipe.isFavorite)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow hover:scale-105 transition cursor-pointer"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <Heart className={`h-4 w-4 ${viewingRecipe.isFavorite ? 'fill-current' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
                    {/* Add to Book Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                        className="w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        style={assignedBook ? {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        } : {
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : (t('addToBook') || 'Add to Book')}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5" />
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div 
                            className="absolute left-0 top-full mt-2 w-64 border rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in"
                            style={{
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                              <span>{t('selectCookbook') || 'Select Cookbook'}</span>
                              <button 
                                onClick={() => { setSelectedBook(null); setIsBookDropdownOpen(false); }} 
                                className="hover:underline cursor-pointer"
                                style={{ color: 'var(--color-accent)' }}
                              >
                                {t('books') || 'Books'}
                              </button>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs px-2.5 py-2" style={{ color: 'var(--color-text-secondary)' }}>{t('noCookbooksAvailable') || 'No cookbooks available'}</div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = isRecipeInBook(viewingRecipe, b.id);
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
                                        backgroundColor: 'var(--color-inner-dark)',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--color-primary)'
                                      } : {
                                        color: 'var(--color-text)'
                                      }}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Add to Plan Trigger */}
                    <button
                      onClick={() => setIsPlanModalOpen(true)}
                      className="border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      style={{
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      <CalendarPlus className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('addToPlan') || 'Add to Plan'}
                    </button>

                    {/* Shopping List Trigger */}
                    <button
                      onClick={handleOpenShoppingModal}
                      className="border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      style={{
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('shoppingList') || 'Shopping List'}
                    </button>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Servings, Timer, Edit, Share Controls */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-xs font-bold flex items-center gap-1.5"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        <Users className="h-4 w-4" /> {t('servingsLabel') || 'Servings'}
                      </span>
                      <div 
                        className="flex items-center border rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <button
                          onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                          className="px-2.5 py-1 font-bold cursor-pointer transition"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold min-w-[32px] text-center" style={{ color: 'var(--color-text)' }}>
                          {currentTotalServings}
                        </span>
                        <button
                          onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                          className="px-2.5 py-1 font-bold cursor-pointer transition"
                          style={{ color: 'var(--color-text-secondary)' }}
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
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        <Timer className="h-3.5 w-3.5" /> {t('timerBtn') || 'Timer'}
                      </button>
                      <button
                        onClick={handleOpenEditRecipe}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" /> {t('editBtn') || 'Edit'}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert(t('recipeLinkCopiedAlert') || 'Recipe link copied!');
                        }}
                        className="border font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" /> {t('shareRecipeBtn') || 'Share Recipe'}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-5 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {viewingRecipe.description || (t('defaultRecipeDesc') || 'Authentic traditional recipe cooked to perfection.')}
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Ingredients & Steps Viewer */}
                  <div className="px-5 space-y-6">
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                      <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>{t('ingredientsHeading') || 'Ingredients'}</h3>
                      <div 
                        className="flex items-center border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <button
                          onClick={() => setFontSizeScale(Math.max(80, fontSizeScale - 10))}
                          className="px-2 py-1 font-bold cursor-pointer"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          -
                        </button>
                        <span className="px-2 py-1 font-bold" style={{ color: 'var(--color-text)' }}>{fontSizeScale}%</span>
                        <button
                          onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                          className="px-2 py-1 font-bold cursor-pointer"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3" style={{ fontSize: `${fontSizeScale}%` }}>
                      {Array.isArray(viewingRecipe.ingredients) && viewingRecipe.ingredients.map((ing: any, idx: number) => {
                        const amt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                        const unit = typeof ing === 'string' ? '' : ing.unit || '';
                        const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        const scaledAmount = calculateScaledAmount(amt, baseServings, currentTotalServings);
                        return (
                          <div key={idx} className="flex items-start gap-2.5 text-xs py-1">
                            <span 
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            />
                            <span style={{ color: 'var(--color-text)' }}>
                              {(scaledAmount || unit) && <strong className="font-bold" style={{ color: 'var(--color-text)' }}>{scaledAmount} {unit !== 'Unit' ? unit : ''} </strong>}
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 pt-2">
                      <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>{t('instructionsHeading') || 'Instructions'}</h3>
                      <div className="space-y-2.5" style={{ fontSize: `${fontSizeScale}%` }}>
                        {Array.isArray(viewingRecipe.instructions) && viewingRecipe.instructions.map((step: string, idx: number) => {
                          const isDone = completedSteps.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleStepComplete(idx)}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition shadow-xs ${
                                isDone ? 'opacity-50 line-through' : ''
                              }`}
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)'
                              }}
                            >
                              <span 
                                className="font-extrabold shrink-0"
                                style={{ color: 'var(--color-primary)' }}
                              >
                                {idx + 1}.
                              </span>
                              <span className="leading-relaxed flex-1" style={{ color: 'var(--color-text)' }}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Cooked & Rating */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateViewingRecipeState('isCooked', !viewingRecipe.isCooked)}
                        className="flex items-center gap-2 text-sm font-bold cursor-pointer"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {t('markAsCooked') || 'Mark as Cooked'}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          viewingRecipe.isCooked ? 'bg-[var(--color-emerald)] text-white' : 'border border-[var(--color-border)]'
                        }`}>
                          {viewingRecipe.isCooked && '✓'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateViewingRecipeState('rating', star)}
                            className="h-4 w-4 cursor-pointer transition"
                            style={{
                              color: (viewingRecipe.rating || 0) >= star ? 'var(--color-primary)' : 'var(--color-border)',
                              fill: (viewingRecipe.rating || 0) >= star ? 'var(--color-primary)' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Edit3 className="h-3.5 w-3.5" /> {t('addANote') || 'Add a note'}
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={t('addNotesPlaceholder') || 'Add notes...'}
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 border rounded-xl px-3 py-2 text-xs outline-none"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                          />
                          <button
                            onClick={() => {
                              updateViewingRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer shadow-sm"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            {t('save') || 'Save'}
                          </button>
                        </div>
                      )}
                      {viewingRecipe.note && !isNoteOpen && (
                        <p className="text-xs italic" style={{ color: 'var(--color-emerald)' }}>
                          Note: "{viewingRecipe.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t mx-5" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Source Footer & Delete Action */}
                  <div className="px-5 flex items-center justify-between text-xs">
                    <div>
                      <span className="block uppercase font-bold text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('sourceLabel') || 'Source'}
                      </span>
                      {viewingRecipe.sourceUrl ? (
                        <a
                          href={viewingRecipe.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold hover:underline flex items-center gap-1 mt-0.5"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {(t('visitSource') || 'Visit {domain}').replace('{domain}', new URL(viewingRecipe.sourceUrl).hostname.replace('www.', ''))} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {t('manualCustomRecipe') || 'Manual / Custom Recipe'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteRecipe(viewingRecipe.id)}
                      className="px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 border transition cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: '#ef4444'
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('deleteRecipeBtn') || 'Delete Recipe'}
                    </button>
                  </div>
                </div>
              ) : (
                /* RECIPE EDIT FORM */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                      <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('editRecipeTitle') || 'Edit Recipe'}
                    </h3>
                    <button
                      onClick={() => setIsEditingRecipe(false)}
                      className="p-1 rounded-lg transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div 
                    className="flex p-1.5 rounded-2xl border"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
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
                        onClick={() => setEditRecipeTab(tab.id as any)}
                        className="flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer"
                        style={editRecipeTab === tab.id ? {
                          backgroundColor: 'var(--color-card)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        } : {
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editRecipeTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px]"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {t('photoLabel') || 'Photo'}
                        </label>
                        <label 
                          className="border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          {editRecipeForm.imageUrl ? (
                            <>
                              <img
                                src={editRecipeForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span 
                                  className="border text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-border)'
                                  }}
                                >
                                  <ImagePlus className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('changePhoto') || 'Change Photo'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditRecipeForm({ ...editRecipeForm, imageUrl: '' });
                                  }}
                                  className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900 cursor-pointer"
                                >
                                  {t('removePhoto') || 'Remove'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 mx-auto transition" style={{ color: 'var(--color-text-secondary)' }} />
                              <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
                                {t('addAPhoto') || 'Add a photo'}
                              </span>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {t('recipeTitle') || 'Recipe Title'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editRecipeForm.title}
                          onChange={(e) => setEditRecipeForm({ ...editRecipeForm, title: e.target.value })}
                          className="w-full border rounded-xl p-3 text-sm outline-none"
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
                        <label 
                          className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {t('templateDescriptionLabel') || 'Description'}
                        </label>
                        <textarea
                          rows={3}
                          value={editRecipeForm.description}
                          onChange={(e) => setEditRecipeForm({ ...editRecipeForm, description: e.target.value })}
                          className="w-full border rounded-xl p-3 text-xs outline-none resize-y leading-relaxed"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {t('recipeType') || 'Recipe Type'}
                          </label>
                          <select
                            value={editRecipeForm.recipeType}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, recipeType: e.target.value })}
                            className="w-full border rounded-xl p-3 text-xs outline-none cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          >
                            <option value="Main Dish" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('mainDish') || 'Main Dish'}</option>
                            <option value="Appetizer" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Appetizer</option>
                            <option value="Dessert" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Dessert</option>
                            <option value="Side Dish" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Side Dish</option>
                            <option value="Beverage" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Beverage</option>
                          </select>
                        </div>

                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {t('servingsLabel') || 'Servings'}
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.servings}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {t('prepTimeMinsLabel') || 'Preparation Time (mins)'}
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.prepTimeMinutes}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none"
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
                          <label 
                            className="block font-bold uppercase tracking-wider text-[11px] mb-1.5"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {t('cookTimeMinsLabel') || 'Cooking Time (mins)'}
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.cookTimeMinutes}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-xl p-3 text-xs outline-none"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingRecipe(false)}
                          className="px-5 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="submit"
                          onClick={handleSaveRecipeEdit}
                          className="px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg flex items-center gap-2 text-xs cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                        >
                          <Save className="h-4 w-4" /> {t('saveChanges')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editRecipeTab === 'ingredients' && (
                    <div 
                      className="border rounded-2xl p-5 space-y-4 animate-in fade-in text-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h2 
                          className="text-sm font-bold uppercase tracking-wider"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {t('ingredientsHeading') || 'Ingredients'}
                        </h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                            style={isReorderingIngredients ? {
                              backgroundColor: 'var(--color-emerald)',
                              borderColor: 'var(--color-emerald)',
                              color: '#ffffff'
                            } : {
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            {isReorderingIngredients ? (t('done') || 'Done') : (t('reorderBtn') || 'Reorder')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRecipeForm({
                              ...editRecipeForm,
                              ingredients: [...editRecipeForm.ingredients, { amount: '', unit: '', item: '', category: DEFAULT_CATEGORIES[0] }]
                            })}
                            className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                          >
                            <Plus className="h-3.5 w-3.5" /> {t('addIngredientModalBtn') || 'Add Ingredient'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editRecipeForm.ingredients.map((ing: any, idx: number) => (
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
                              backgroundColor: 'var(--color-card)',
                              borderColor: isReorderingIngredients ? 'var(--color-emerald)' : 'var(--color-border)'
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Amt"
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
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
                                const list = [...editRecipeForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-20 border rounded-lg p-2 text-center outline-none"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-secondary)'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none outline-none px-2"
                              style={{ color: 'var(--color-text)' }}
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-secondary)'
                              }}
                            >
                              {DEFAULT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 cursor-grab" style={{ color: 'var(--color-emerald)' }}>
                                <GripVertical className="h-4 w-4" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecipeForm({
                                  ...editRecipeForm,
                                  ingredients: editRecipeForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-500 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('info')}
                          className="font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {t('backBtn') || '← Back'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('steps')}
                          className="text-white font-bold px-6 py-2 rounded-xl text-xs transition shadow-md cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                        >
                          {t('nextStepsBtn') || 'Next: Steps →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editRecipeTab === 'steps' && (
                    <div 
                      className="border rounded-2xl p-5 space-y-4 animate-in fade-in text-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h2 
                          className="text-sm font-bold uppercase tracking-wider"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {t('stepInstructionsHeading') || 'Step-by-Step Instructions'}
                        </h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                            style={isReorderingSteps ? {
                              backgroundColor: 'var(--color-emerald)',
                              borderColor: 'var(--color-emerald)',
                              color: '#ffffff'
                            } : {
                              backgroundColor: 'var(--color-card)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            {isReorderingSteps ? (t('done') || 'Done') : (t('reorderBtn') || 'Reorder')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRecipeForm({
                              ...editRecipeForm,
                              instructions: [...editRecipeForm.instructions, '']
                            })}
                            className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                          >
                            <Plus className="h-3.5 w-3.5" /> {t('addStepBtn') || 'Add Step'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editRecipeForm.instructions.map((step: string, idx: number) => (
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
                              backgroundColor: 'var(--color-card)',
                              borderColor: isReorderingSteps ? 'var(--color-emerald)' : 'var(--color-border)'
                            }}
                          >
                            <span 
                              className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                color: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)',
                                borderWidth: '1px'
                              }}
                            >
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={(t('describeStepPlaceholder') || 'Describe step {n}...').replace('{n}', String(idx + 1))}
                              value={step}
                              onChange={(e) => {
                                const list = [...editRecipeForm.instructions];
                                list[idx] = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none outline-none resize-y"
                              style={{ color: 'var(--color-text)' }}
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 cursor-grab mt-1" style={{ color: 'var(--color-emerald)' }}>
                                <GripVertical className="h-4 w-4" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecipeForm({
                                  ...editRecipeForm,
                                  instructions: editRecipeForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-slate-400 hover:text-red-500 h-fit cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('ingredients')}
                          className="font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {t('backBtn') || '← Back'}
                        </button>
                        <button
                          type="submit"
                          onClick={handleSaveRecipeEdit}
                          className="text-white font-bold px-8 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                        >
                          <Save className="h-4 w-4" /> {t('saveChanges')}
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

      {/* ADD TO SHOPPING LIST MODAL */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <ShoppingCart className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('addToShoppingListTitle') || 'Add to Shopping List'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('addToShoppingListSub') || 'Select or edit items to add directly to your list'}
                </p>
              </div>
              <button 
                onClick={() => setIsShoppingModalOpen(false)} 
                className="cursor-pointer transition"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X className="h-5 w-5" />
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
                    className="w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition"
                    style={ing.selected ? {
                      backgroundColor: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)',
                      color: '#ffffff'
                    } : {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-card)'
                    }}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
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
                      color: 'var(--color-text-secondary)'
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
                    className="flex-1 bg-transparent border-none outline-none px-2"
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
                    className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> {t('addSelectedToListBtn') || 'Add Selected to List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO MEAL PLAN MODAL */}
      {isPlanModalOpen && (
        <div 
          onClick={() => setIsPlanModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs cursor-default border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <CalendarPlus className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('addToMealPlanTitle') || 'Add to Meal Plan'}
              </h3>
              <button 
                onClick={() => setIsPlanModalOpen(false)} 
                className="cursor-pointer transition"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('dateLabel') || 'Date'}
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none"
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
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('mealTypeLabel') || 'Meal Type'}
                </label>
                <select
                  value={planMealType}
                  onChange={(e) => setPlanMealType(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none cursor-pointer"
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
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('timeLabel') || 'Time'}
                </label>
                <input
                  type="time"
                  value={planMealTime}
                  onChange={(e) => setPlanMealTime(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmAddToPlan}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-lg cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
              >
                {t('scheduleMealBtn') || 'Schedule Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
