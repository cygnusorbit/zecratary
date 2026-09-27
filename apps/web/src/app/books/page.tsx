// Generated / Updated by AI Collaborator
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Book, Plus, Trash2, Edit3, Search, X, Check, BookOpen,
  FolderPlus, ChevronRight, Utensils, Save, Sparkles, RefreshCw
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

const COVER_GRADIENTS = [
  { id: 'rose', label: 'Rose Pink', className: 'from-pink-600 via-rose-500 to-rose-600' },
  { id: 'orange', label: 'Sunset Orange', className: 'from-amber-500 via-orange-500 to-red-500' },
  { id: 'emerald', label: 'Fresh Emerald', className: 'from-emerald-500 via-teal-500 to-cyan-500' },
  { id: 'blue', label: 'Ocean Blue', className: 'from-blue-600 via-indigo-500 to-violet-600' },
  { id: 'purple', label: 'Royal Purple', className: 'from-purple-600 via-fuchsia-500 to-pink-500' },
  { id: 'slate', label: 'Dark Charcoal', className: 'from-slate-700 via-slate-800 to-slate-900' }
];

const isRecipeInBook = (rec: any, bookId: string): boolean => {
  if (!rec || !bookId) return false;
  return rec.bookId === bookId || rec.book_id === bookId;
};

export default function BooksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCoverGradient, setNewCoverGradient] = useState(COVER_GRADIENTS[0].className);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverGradient, setEditCoverGradient] = useState(COVER_GRADIENTS[0].className);

  const [selectedBook, setSelectedBook] = useState<any | null>(null);

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
    const activeUserId = user.id || user.email || 'usr_admin_1';
    setLoading(true);

    try {
      // 1. Fetch recipes to calculate real-time book recipe counts
      let loadedRecipes: any[] = [];
      try {
        const rRes = await fetch(`/api/recipes?userId=${encodeURIComponent(activeUserId)}`, { cache: 'no-store' });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (Array.isArray(rData.recipes)) loadedRecipes = rData.recipes;
          else if (Array.isArray(rData)) loadedRecipes = rData;
        }
      } catch (_) {}

      if (loadedRecipes.length === 0 && typeof window !== 'undefined') {
        try {
          const localR = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
          if (localR) {
            const arrR = JSON.parse(localR);
            if (Array.isArray(arrR)) loadedRecipes = arrR;
          }
        } catch (_) {}
      }
      setRecipes(loadedRecipes);

      // 2. Fetch live books from PostgreSQL
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

      // Fallback ONLY if network request failed (do not resurrect deleted books)
      if (!fetchSuccess && typeof window !== 'undefined') {
        try {
          const localB = localStorage.getItem('zecratary_recipe_books');
          if (localB) {
            const arrB = JSON.parse(localB);
            if (Array.isArray(arrB)) loadedBooks = arrB;
          }
        } catch (_) {}
      }

      // Recalculate recipe counts dynamically based on loadedRecipes
      const syncdBooks = loadedBooks.map((b: any) => ({
        ...b,
        recipeCount: loadedRecipes.filter((r: any) => isRecipeInBook(r, b.id)).length
      }));

      setBooks(syncdBooks);
    } catch (e) {
      console.error('[BooksPage] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('cookbooksTitle') || 'Recipe Cookbooks'} - FoodiePrep`;
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
    window.addEventListener('zecratary_recipe_books_updated', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipe_books_updated', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadData, router, t]);

  const handleCreateBook = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;

    const newBook = {
      id: 'book_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id || 'usr_admin_1',
      createdBy: currentUser.email || 'admin@zecratary.com',
      creatorName: currentUser.name || 'Chef',
      title: newTitle.trim(),
      description: newDescription.trim(),
      coverColor: newCoverGradient,
      recipeCount: 0,
      createdAt: new Date().toISOString()
    };

    const updated = [...books, newBook];
    setBooks(updated);

    try {
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });
      window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to create book in PostgreSQL:', err);
    }

    setNewTitle('');
    setNewDescription('');
    setNewCoverGradient(COVER_GRADIENTS[0].className);
    setShowAddModal(false);
  };

  const handleOpenEdit = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setEditingBookId(book.id);
    setEditTitle(book.title || '');
    setEditDescription(book.description || '');
    setEditCoverGradient(book.coverColor || COVER_GRADIENTS[0].className);
    setShowEditModal(true);
  };

  const handleUpdateBook = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!editingBookId || !editTitle.trim() || !currentUser) return;

    const target = books.find(b => b.id === editingBookId);
    if (!target) return;

    const updatedBook = {
      ...target,
      title: editTitle.trim(),
      description: editDescription.trim(),
      coverColor: editCoverGradient,
      userId: currentUser.id || target.userId,
      createdBy: currentUser.email || target.createdBy
    };

    const updated = books.map(b => b.id === editingBookId ? updatedBook : b);
    setBooks(updated);

    if (selectedBook?.id === editingBookId) {
      setSelectedBook(updatedBook);
    }

    try {
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      });
      window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to update book in PostgreSQL:', err);
    }

    setShowEditModal(false);
    setEditingBookId(null);
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

  const filteredBooks = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return books;
    return books.filter(b => 
      (b.title || '').toLowerCase().includes(q) || 
      (b.description || '').toLowerCase().includes(q)
    );
  }, [books, search]);

  const selectedBookRecipes = useMemo(() => {
    if (!selectedBook) return [];
    return recipes.filter(r => isRecipeInBook(r, selectedBook.id));
  }, [recipes, selectedBook]);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('cookbooksTitle') || 'Recipe Cookbooks'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {(t('cookbooksSubtitle') || 'Organize and group your saved recipes into custom collections ({count})').replace('{count}', String(books.length))}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(currentUser)}
            disabled={loading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title="Reload cookbooks from server"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <FolderPlus className="h-4 w-4" /> {t('newCookbookBtn') || 'New Cookbook'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search 
          className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" 
          style={{ color: 'var(--color-text-secondary)' }}
        />
        <input
          type="text"
          placeholder={t('searchCookbooksPlaceholder') || 'Search cookbooks by title or description...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-2xl pl-11 pr-4 py-2.5 text-sm outline-none transition shadow-xs"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)'
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Cookbook Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('loadingCookbooks') || 'Loading cookbooks...'}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div 
          className="text-center py-16 px-4 border border-dashed rounded-3xl space-y-3"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm"
            style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' }}
          >
            <Book className="h-6 w-6"/>
          </div>
          <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {t('noCookbooksFound') || 'No Cookbooks Found'}
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            {t('noCookbooksDesc') || 'Create your first cookbook collection to organize and categorize recipes.'}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> {t('createFirstCookbook') || 'Create First Cookbook'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBooks.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBook(b)}
              className="border rounded-2xl overflow-hidden transition cursor-pointer group shadow-sm hover:shadow-md flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div>
                <div className={`h-28 w-full bg-gradient-to-r ${b.coverColor || COVER_GRADIENTS[0].className} p-4 flex flex-col justify-between relative`}>
                  <div className="flex items-center justify-between text-white">
                    <span className="text-xs font-black uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-white/20">
                      <BookOpen className="h-3 w-3" /> {(t('recipesCountSuffix') || '{count} Recipes').replace('{count}', String(b.recipeCount || 0))}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(e, b)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer border border-white/20"
                        title={t('editCookbookTooltip') || 'Edit Cookbook'}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBook(e, b.id)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-red-600/80 text-white backdrop-blur-md transition cursor-pointer border border-white/20"
                        title={t('deleteCookbookTooltip') || 'Delete Cookbook'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-black text-lg truncate drop-shadow-md">
                    {b.title}
                  </h3>
                </div>

                <div className="p-4 space-y-2">
                  <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {b.description || t('noDescriptionProvided') || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div 
                className="px-4 py-2.5 border-t flex items-center justify-between text-xs font-bold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
              >
                <span>{t('viewRecipesInBook') || 'View Collection'}</span>
                <ChevronRight className="h-4 w-4 transition transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SELECTED BOOK DRAWER / MODAL */}
      {selectedBook && (
        <div 
          onClick={() => setSelectedBook(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className={`p-6 bg-gradient-to-r ${selectedBook.coverColor || COVER_GRADIENTS[0].className} text-white space-y-2 relative`}>
              <button 
                type="button"
                onClick={() => setSelectedBook(null)} 
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer border border-white/20"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                  {(t('recipesCountSuffix') || '{count} Recipes').replace('{count}', String(selectedBookRecipes.length))}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">{selectedBook.title}</h2>
              {selectedBook.description && (
                <p className="text-xs text-white/90 leading-relaxed max-w-lg">{selectedBook.description}</p>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {selectedBookRecipes.length === 0 ? (
                <div className="py-12 text-center text-xs space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Utensils className="h-8 w-8 mx-auto opacity-30" />
                  <p>{t('noRecipesInBookYet') || 'No recipes added to this cookbook yet.'}</p>
                  <Link 
                    href="/saved"
                    className="inline-block font-bold text-xs hover:underline pt-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('browseSavedToAssign') || 'Browse Saved Recipes to assign'}
                  </Link>
                </div>
              ) : (
                selectedBookRecipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => router.push('/saved')}
                    className="p-3 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer hover:scale-[1.01]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={r.imageUrl || r.image || '/uploads/recipes/default.jpg'} 
                        alt={r.title || r.name}
                        className="w-12 h-12 rounded-lg object-cover border shrink-0"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>
                          {r.title || r.name}
                        </h4>
                        <span className="text-[10px] block" style={{ color: 'var(--color-text-secondary)' }}>
                          {r.tags?.[0] || r.recipeType || 'Main Dish'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/saved');
                      }}
                      className="px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      {t('openRecipeBtn') || 'Open'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COOKBOOK MODAL (NO NATIVE FORM) */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowAddModal(false)} 
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <FolderPlus className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> 
                {t('createCookbookTitle') || 'Create New Cookbook'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('createCookbookSubtitle') || 'Add a customized recipe collection to categorize recipes'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('cookbookTitleLabel') || 'Cookbook Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('cookbookTitlePlaceholder') || 'e.g. Weeknight Dinners, Healthy Salads...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateBook();
                    }
                  }}
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
                  {t('descriptionLabel') || 'Description'}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('cookbookDescPlaceholder') || 'Short summary of recipes in this collection...'}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none transition resize-none"
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
                <label className="block font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('coverGradientLabel') || 'Cover Theme'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setNewCoverGradient(g.className)}
                      className={`h-10 rounded-xl bg-gradient-to-r ${g.className} transition flex items-center justify-center border-2 cursor-pointer shadow-xs`}
                      style={{
                        borderColor: newCoverGradient === g.className ? 'var(--color-primary)' : 'transparent'
                      }}
                      title={g.label}
                    >
                      {newCoverGradient === g.className && <Check className="h-4 w-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateBook()}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {t('createCookbookBtn') || 'Create Cookbook'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COOKBOOK MODAL (NO NATIVE FORM) */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowEditModal(false)} 
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> 
                {t('editCookbookTitle') || 'Edit Cookbook'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('editCookbookSubtitle') || 'Update title, description, and cover theme'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('cookbookTitleLabel') || 'Cookbook Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdateBook();
                    }
                  }}
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
                  {t('descriptionLabel') || 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none transition resize-none"
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
                <label className="block font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('coverGradientLabel') || 'Cover Theme'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setEditCoverGradient(g.className)}
                      className={`h-10 rounded-xl bg-gradient-to-r ${g.className} transition flex items-center justify-center border-2 cursor-pointer shadow-xs`}
                      style={{
                        borderColor: editCoverGradient === g.className ? 'var(--color-primary)' : 'transparent'
                      }}
                      title={g.label}
                    >
                      {editCoverGradient === g.className && <Check className="h-4 w-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateBook()}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  <Save className="h-4 w-4" /> {t('saveChanges') || 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
