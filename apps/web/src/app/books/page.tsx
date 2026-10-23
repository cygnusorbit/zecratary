'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Book, Plus, Trash2, Edit3, Search, Utensils, X, 
  BookOpen, ArrowRight, Palette, Check 
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser, User } from '@/lib/auth';

interface RecipeBook {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  description: string;
  coverColor?: string;
  cover_color?: string;
  recipeCount?: number;
  recipeIds?: string[];
  recipe_ids?: string[];
  created_at?: string;
}

// Curated theme color presets matching the application palette
const PRESET_COLORS = [
  { label: 'Emerald Teal', value: 'bg-gradient-to-r from-emerald-600 to-teal-600', hex: '#10b981' },
  { label: 'Sapphire Blue', value: 'bg-gradient-to-r from-blue-600 to-cyan-600', hex: '#2563eb' },
  { label: 'Sunset Amber', value: 'bg-gradient-to-r from-amber-500 to-yellow-500', hex: '#f59e0b' },
  { label: 'Ruby Coral', value: 'bg-gradient-to-r from-rose-500 to-red-600', hex: '#E05638' },
  { label: 'Royal Amethyst', value: 'bg-gradient-to-r from-purple-600 to-indigo-600', hex: '#8b5cf6' },
  { label: 'Charcoal Slate', value: 'bg-gradient-to-r from-slate-700 to-zinc-900', hex: '#334155' },
];

// Local helper (satisfies Next.js App Router export contract - unexported)
const isRecipeInBook = (rec: any, bookId: string, book?: any): boolean => {
  if (!rec || !bookId) return false;
  if (rec.bookId === bookId || rec.book_id === bookId) return true;
  if (book) {
    const ids = book.recipe_ids || book.recipeIds;
    if (Array.isArray(ids) && ids.includes(rec.id)) return true;
  }
  return false;
};

export default function BooksPage() {
  const { t } = useTranslation();

  const [mounted, setMounted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<RecipeBook[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<RecipeBook | null>(null);

  // Modal States: Title, Description, and Color Picker
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalDescription, setModalDescription] = useState<string>('');
  const [modalColor, setModalColor] = useState<string>(PRESET_COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Pure Database Hydration: Queries PostgreSQL Directly (NO LocalStorage)
  const loadData = useCallback(async (user?: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';

    try {
      // 1. Fetch live recipes directly from PostgreSQL
      const recRes = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      let loadedRecipes: any[] = [];
      if (recRes.ok) {
        const recData = await recRes.json();
        if (Array.isArray(recData.recipes)) {
          loadedRecipes = recData.recipes;
          setRecipes(loadedRecipes);
        }
      }

      // 2. Fetch live cookbooks directly from PostgreSQL
      const bRes = await fetch(`/api/books?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData.books)) {
          const syncedBooks = bData.books.map((b: RecipeBook) => ({
            ...b,
            recipeCount: loadedRecipes.filter((r: any) => isRecipeInBook(r, b.id, b)).length,
          }));
          setBooks(syncedBooks);

          if (selectedBook) {
            const refreshed = syncedBooks.find((sb: RecipeBook) => sb.id === selectedBook.id);
            if (refreshed) setSelectedBook(refreshed);
          }
        }
      }
    } catch (err) {
      console.error('[Books] Database fetch error:', err);
    }
  }, [selectedBook]);

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    setCurrentUser(u);
    loadData(u);

    const handleSync = () => loadData(getCurrentUser());
    window.addEventListener('zecratary_recipe_books_updated', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('zecratary_recipe_books_updated', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [loadData]);

  // Open Edit Modal with existing Cookbook Color
  const handleOpenEdit = (e: React.MouseEvent, book: RecipeBook) => {
    e.stopPropagation();
    setEditingBookId(book.id);
    setModalTitle(book.title);
    setModalDescription(book.description || '');
    setModalColor(book.cover_color || book.coverColor || PRESET_COLORS[0].value);
    setShowCreateModal(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBookId(null);
    setModalTitle('');
    setModalDescription('');
    setModalColor(PRESET_COLORS[0].value);
    setShowCreateModal(true);
  };

  // Save / Update Cookbook directly in PostgreSQL (Persisting Color)
  const handleSaveBook = async () => {
    if (!modalTitle.trim()) return;
    setIsSubmitting(true);

    const targetUserId = currentUser?.id || 'usr_admin_1';
    const bookId = editingBookId || ('book_' + Date.now().toString(36));

    const payload = {
      id: bookId,
      userId: targetUserId,
      user_id: targetUserId,
      title: modalTitle.trim(),
      description: modalDescription.trim(),
      cover_color: modalColor,
      coverColor: modalColor,
      createdBy: currentUser?.email || 'admin@zecratary.com',
      creatorName: currentUser?.name || 'Chef',
    };

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setEditingBookId(null);
        setModalTitle('');
        setModalDescription('');
        await loadData(currentUser);
        window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
      }
    } catch (err) {
      console.error('Failed to save cookbook to PostgreSQL:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Cookbook directly from PostgreSQL
  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteBook', 'Are you sure you want to delete this cookbook? Assigned recipes will remain in your saved library.'))) {
      return;
    }

    try {
      const res = await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedBook?.id === id) setSelectedBook(null);
        await loadData(currentUser);
        window.dispatchEvent(new Event('zecratary_recipe_books_updated'));
        window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      }
    } catch (err) {
      console.error('Error deleting cookbook from PostgreSQL:', err);
    }
  };

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [books, searchQuery]);

  const currentBookRecipes = useMemo(() => {
    if (!selectedBook) return [];
    return recipes.filter((r) => isRecipeInBook(r, selectedBook.id, selectedBook));
  }, [recipes, selectedBook]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full min-w-0" style={{ color: 'var(--color-text)' }}>
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            <Book className="h-4 w-4" />
            <span>{t('culinaryCollections', 'Culinary Collections')}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight pt-1">
            {t('cookbooks', 'Cookbooks')}
          </h1>
          <p className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('cookbooksSubtitle', 'Curate, organize, and categorize your saved recipes into dedicated digital books permanently stored in PostgreSQL.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchCookbooks', 'Search books...')}
              className="pl-9 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-hidden"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" />
            <span>{t('newCookbook', 'New Cookbook')}</span>
          </button>
        </div>
      </div>

      {/* ORIGINAL COOKBOOKS GRID WITH COLOR ACCENT BINDING */}
      {filteredBooks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border space-y-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <BookOpen className="h-12 w-12 mx-auto text-[var(--color-primary)] opacity-70" />
          <div className="space-y-1">
            <h3 className="text-base font-bold">{t('noCookbooksFound', 'No Cookbooks Found')}</h3>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('emptyCookbooksHint', 'Create your first cookbook collection to group and organize your dishes.')}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book: RecipeBook, idx: number) => {
            const count = book.recipeCount !== undefined 
              ? book.recipeCount 
              : (Array.isArray(book.recipe_ids) ? book.recipe_ids.length : 0);

            const cardColor = book.cover_color || book.coverColor || 'bg-gradient-to-r from-emerald-600 to-teal-600';
            const isCustomHex = cardColor.startsWith('#');

            return (
              <div
                key={book.id || `book_${idx}`}
                onClick={() => setSelectedBook(book)}
                className="rounded-3xl border cursor-pointer hover:shadow-lg transition flex flex-col justify-between overflow-hidden group"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {/* TOP COLOR ACCENT STRIP */}
                <div 
                  className={`h-2.5 w-full ${!isCustomHex ? cardColor : ''}`}
                  style={isCustomHex ? { backgroundColor: cardColor } : {}}
                />

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div 
                        className={`p-2.5 rounded-2xl text-white shadow-xs ${!isCustomHex ? cardColor : ''}`}
                        style={isCustomHex ? { backgroundColor: cardColor } : {}}
                      >
                        <Book className="h-5 w-5" />
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-text-secondary)' }}>
                        {count} {count === 1 ? 'recipe' : 'recipes'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black pt-2 line-clamp-1">{book.title}</h3>
                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {book.description || t('noDescription', 'Curated culinary collection.')}
                    </p>
                  </div>

                  <div className="pt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-bold text-[11px] text-[var(--color-primary)] flex items-center gap-1 group-hover:underline">
                      <span>{t('viewCollection', 'View Collection')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(e, book)}
                        className="p-1.5 rounded-lg border hover:bg-slate-800/20 cursor-pointer"
                        style={{ borderColor: 'var(--color-border)' }}
                        title={t('edit', 'Edit Cookbook')}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBook(e, book.id)}
                        className="p-1.5 rounded-lg border hover:bg-red-500/10 text-red-400 cursor-pointer"
                        style={{ borderColor: 'var(--color-border)' }}
                        title={t('delete', 'Delete')}
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

      {/* EDIT / CREATE COOKBOOK MODAL WITH COLOR PICKER (ZERO <form> TAGS) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border p-6 space-y-5 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowCreateModal(false);
              if (e.key === 'Enter' && e.ctrlKey) handleSaveBook();
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Book className="h-5 w-5 text-[var(--color-primary)]" />
                <span>{editingBookId ? t('editCookbook', 'Edit Cookbook') : t('createCookbook', 'New Cookbook')}</span>
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">{t('cookbookTitle', 'Cookbook Title')} *</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g., Weekend Baking & Desserts"
                  className="w-full px-3 py-2 rounded-xl border outline-hidden"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{t('description', 'Description')}</label>
                <textarea
                  rows={3}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Overview of the dishes in this collection..."
                  className="w-full px-3 py-2 rounded-xl border outline-hidden resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* INTEGRATED COLOR PICKER (PRESETS + CUSTOM PICKER) */}
              <div className="space-y-2">
                <label className="block font-bold flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  <span>{t('cookbookColor', 'Cookbook Color Theme')}</span>
                </label>

                {/* COLOR PRESETS */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_COLORS.map((preset) => {
                    const isSelected = modalColor === preset.value;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setModalColor(preset.value)}
                        className={`h-9 rounded-xl flex items-center justify-center transition border ${preset.value} cursor-pointer shadow-xs`}
                        style={{
                          borderColor: isSelected ? '#ffffff' : 'transparent',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        }}
                        title={preset.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                      </button>
                    );
                  })}
                </div>

                {/* CUSTOM COLOR INPUT */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={modalColor.startsWith('#') ? modalColor : '#10b981'}
                    onChange={(e) => setModalColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-transparent bg-transparent"
                    title={t('pickCustomColor', 'Pick custom color')}
                  />
                  <input
                    type="text"
                    value={modalColor}
                    onChange={(e) => setModalColor(e.target.value)}
                    placeholder="Custom color / class"
                    className="flex-1 px-3 py-1.5 rounded-xl border outline-hidden text-[11px]"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveBook}
                disabled={!modalTitle.trim() || isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition"
                style={{ backgroundColor: 'var(--color-primary)', opacity: modalTitle.trim() ? 1 : 0.5 }}
              >
                {t('saveCookbook', 'Save to PostgreSQL')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORIGINAL COOKBOOK RECIPE DRAWER / DETAILS MODAL */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 space-y-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-black text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>{selectedBook.title}</span>
                </h3>
                <p className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedBook.description || 'Collection of saved dishes'}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedBook(null)} className="p-1.5 rounded-lg border">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
                  {t('assignedRecipes', 'Assigned Recipes')} ({currentBookRecipes.length})
                </span>
                <Link href="/saved" className="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1">
                  <span>{t('browseMoreInSaved', 'Add More from Saved')}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentBookRecipes.length === 0 ? (
                  <div className="text-center py-8 text-xs opacity-60">
                    {t('noRecipesInBook', 'No recipes assigned to this cookbook yet. Assign them from the Saved Recipes page.')}
                  </div>
                ) : (
                  currentBookRecipes.map((rec: any, rIdx: number) => (
                    <div
                      key={rec.id || `rec_item_${rIdx}`}
                      className="flex items-center justify-between p-3 rounded-2xl border"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                          {rec.image || rec.image_url ? (
                            <img src={rec.image || rec.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">🍳</div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs line-clamp-1">{rec.title}</h4>
                          <p className="text-[11px] opacity-70 flex items-center gap-2 pt-0.5">
                            <span>⏱️ {rec.prep_time || '15m'}</span>
                            <span>•</span>
                            <span>👥 {rec.servings || 4} servings</span>
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/saved"
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold border hover:bg-slate-800/20"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {t('view', 'View')}
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('done', 'Done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
