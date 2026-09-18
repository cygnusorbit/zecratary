// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Tags, Plus, Edit3, Trash2, Check, X, RotateCcw, 
  CheckCircle, ArrowLeft, MoreVertical, GripVertical, 
  ArrowUpDown, ArrowUp, ArrowDown, Save, RefreshCw
} from 'lucide-react';
import { 
  getStoredCategories, 
  saveCategories, 
  setMemoryCategories, 
  DEFAULT_CATEGORIES 
} from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

export default function IngredientCategoryPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);
  const version = langContext?.version;

  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Reposition / Reorder States
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  // Hydrate Categories Exclusively from PostgreSQL Server Storage
  const loadCategoriesFromServer = useCallback(async () => {
    setIsLoading(true);
    purgeLegacyBrowserAdminStorage();

    let loadedCats: string[] | null = null;

    try {
      const res = await fetch('/api/admin/ingredient-categories?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.ingredientCategories || data?.categories);
        if (Array.isArray(list) && list.length > 0) {
          loadedCats = list;
        }
      }
    } catch (_) {}

    if (!loadedCats || loadedCats.length === 0) {
      try {
        const serverData = await fetchServerAdminSettings();
        const list = (Array.isArray(serverData) ? serverData : null) ||
                     (Array.isArray(serverData?.ingredientCategories) ? serverData.ingredientCategories : null) ||
                     (Array.isArray(serverData?.settings?.ingredientCategories) ? serverData.settings.ingredientCategories : null);
        if (Array.isArray(list) && list.length > 0) {
          loadedCats = list;
        }
      } catch (_) {}
    }

    if (loadedCats && loadedCats.length > 0) {
      setCategories(loadedCats);
      setMemoryCategories(loadedCats);
    } else {
      const fallback = getStoredCategories();
      const activeList = fallback && fallback.length > 0 ? fallback : DEFAULT_CATEGORIES;
      setCategories(activeList);
      setMemoryCategories(activeList);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    document.title = `${t('ingredientCatTitle', 'Ingredient Categories')} - ${t('adminConsole', 'Admin Console')}`;
    loadCategoriesFromServer();

    const handleSync = (e: any) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setCategories(e.detail);
        setMemoryCategories(e.detail);
      }
    };

    window.addEventListener('zecratary_categories_changed', handleSync);
    window.addEventListener('zecratary_ingredient_categories_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_categories_changed', handleSync);
      window.removeEventListener('zecratary_ingredient_categories_updated', handleSync);
    };
  }, [t, version, loadCategoriesFromServer]);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Centralized Server-Backed Commit (Zero LocalStorage)
  const commitCategories = async (updated: string[]) => {
    setCategories(updated);
    setMemoryCategories(updated);

    try {
      await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientCategories: updated })
      });

      await saveCategories(updated);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_categories_changed', { detail: updated }));
        window.dispatchEvent(new CustomEvent('zecratary_ingredient_categories_updated', { detail: updated }));
      }
    } catch (err: any) {
      console.error('[IngredientCategoryPage] Save error:', err);
      notify(t('errorSaving', 'Error saving to database'));
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const list = [...categories];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    setCategories(list);
    setDraggedIndex(index);
  };

  const handleDrop = () => {
    setDraggedIndex(null);
    commitCategories(categories);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    commitCategories(list);
  };

  const toggleRepositionMode = () => {
    if (isReordering) {
      commitCategories(categories);
      notify(t('orderSaved', 'Category order saved successfully!'));
      setIsReordering(false);
    } else {
      setEditingIndex(null);
      setIsReordering(true);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert(t('categoryExists', 'This category already exists.'));
      return;
    }

    const updated = [...categories, clean];
    commitCategories(updated);
    setNewCatName('');
    notify(`${t('categoryAdded', 'Added category')} "${clean}"`);
  };

  const handleSaveEdit = (index: number) => {
    const clean = editingValue.trim();
    if (!clean) return;

    const duplicate = categories.some(
      (c, i) => i !== index && c.toLowerCase() === clean.toLowerCase()
    );
    if (duplicate) {
      alert(t('categoryExists', 'This category already exists.'));
      return;
    }

    const updated = [...categories];
    updated[index] = clean;
    commitCategories(updated);
    setEditingIndex(null);
    setEditingValue('');
    notify(`${t('categoryUpdated', 'Updated category')} "${clean}"`);
  };

  const handleDeleteCategory = (index: number, name: string) => {
    const confirmMsg = t('confirmDeleteCat', 'Are you sure you want to delete category');
    if (!confirm(`${confirmMsg} "${name}"?`)) return;
    const updated = categories.filter((_, i) => i !== index);
    commitCategories(updated);
    notify(`${t('categoryRemoved', 'Removed category')} "${name}"`);
  };

  const handleResetDefaults = () => {
    if (!confirm(t('confirmResetCats', 'Are you sure you want to reset categories to default?'))) return;
    commitCategories(DEFAULT_CATEGORIES);
    setIsReordering(false);
    notify(t('resetCatsSuccess', 'Categories reset to default successfully!'));
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* HEADER */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 transition-colors duration-200"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('ingredientCatTitle', 'Ingredient Categories')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('ingredientCatSubtitle', 'Manage custom ingredient categories and pantry classification')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCategoriesFromServer}
            disabled={isLoading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title="Reload from server storage"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('refreshBtn', 'Reload')}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <RotateCcw className="h-4 w-4" /> {t('resetDefaults', 'Reset Defaults')}
          </button>
        </div>
      </div>

      {feedback && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-emerald)',
            color: 'var(--color-emerald)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
          <span>{feedback}</span>
        </div>
      )}

      {/* REPOSITION INSTRUCTION BANNER */}
      {isReordering && (
        <div 
          className="p-4 rounded-2xl text-xs flex items-center justify-between shadow-inner border"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-emerald)',
            color: 'var(--color-emerald)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <MoreVertical className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
            <span>{t('repositionBanner', 'Drag items or use arrows to reorder ingredient categories. Click Done when finished.')}</span>
          </div>
          <button
            onClick={toggleRepositionMode}
            className="px-3 py-1 text-white font-bold rounded-lg transition text-[11px] shrink-0 cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--color-emerald)' }}
          >
            {t('done', 'Done')}
          </button>
        </div>
      )}

      {/* ADD CATEGORY FORM */}
      {!isReordering && (
        <div 
          className="border rounded-3xl p-6 shadow-sm space-y-3 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Plus className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('addNewCategory', 'Add New Ingredient Category')}
          </h2>
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder={t('categoryPlaceholder', 'e.g. Spices, Grains, Produce...')}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
            <button
              type="submit"
              className="text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
            >
              <Plus className="h-4 w-4" /> {t('addCategoryBtn', 'Add Category')}
            </button>
          </form>
        </div>
      )}

      {/* CATEGORY GRID */}
      <div 
        className="border rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div 
          className="flex flex-wrap items-center justify-between border-b pb-3 gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold" style={{ color: 'var(--color-text)' }}>
              {t('activeCategories', 'Active Categories')} ({categories.length})
            </span>
            <button
              type="button"
              onClick={toggleRepositionMode}
              className="font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs border"
              style={isReordering ? {
                backgroundColor: 'var(--color-emerald)',
                borderColor: 'var(--color-emerald)',
                color: '#ffffff'
              } : {
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              {isReordering ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" /> {t('doneRepositioning', 'Done Repositioning')}
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> {t('reposition', 'Reposition')}
                </>
              )}
            </button>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {isReordering ? t('repositionActive', 'Repositioning Mode Active') : t('realtimeSync', 'Changes sync in real-time across ingredient forms')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat, idx) => {
            const isEditing = editingIndex === idx;

            return (
              <div
                key={`${cat}-${idx}`}
                draggable={isReordering}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={handleDrop}
                className={`p-3 rounded-2xl flex items-center justify-between gap-2 transition select-none shadow-xs ${
                  isReordering
                    ? 'border-2 cursor-grab active:cursor-grabbing'
                    : 'border'
                }`}
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: isReordering ? 'var(--color-emerald)' : 'var(--color-border)'
                }}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(idx);
                        if (e.key === 'Escape') setEditingIndex(null);
                      }}
                      className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      className="p-1.5 border rounded-lg transition cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-emerald)',
                        color: 'var(--color-emerald)'
                      }}
                      title={t('save', 'Save')}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="p-1.5 border rounded-lg transition cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                      title={t('cancel', 'Cancel')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      {isReordering && (
                        <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveCategory(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:text-black disabled:opacity-20 cursor-pointer"
                              title={t('moveUp', 'Move Up')}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCategory(idx, 'down')}
                              disabled={idx === categories.length - 1}
                              className="p-0.5 hover:text-black disabled:opacity-20 cursor-pointer"
                              title={t('moveDown', 'Move Down')}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div 
                            className="cursor-grab active:cursor-grabbing p-1" 
                            style={{ color: 'var(--color-emerald)' }}
                            title={t('dragToReposition', 'Click and drag to reposition')}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      <span className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>
                        {cat}
                      </span>
                    </div>

                    {!isReordering && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingIndex(idx);
                            setEditingValue(cat);
                          }}
                          className="p-1.5 rounded-lg border transition cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                          title={t('editCategoryTooltip', 'Edit Category')}
                        >
                          <Edit3 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(idx, cat)}
                          className="p-1.5 rounded-lg border transition cursor-pointer hover:text-red-500 shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                          title={t('deleteCategoryTooltip', 'Delete Category')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
