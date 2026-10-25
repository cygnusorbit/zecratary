'use client';
// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Tags, Plus, Search, GripVertical, Pencil, Trash2, Check,
  CheckCircle2, AlertCircle, RefreshCw, X, ArrowUpDown, 
  ChevronUp, ChevronDown, RotateCcw
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface IngredientCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  order?: number;
}

const DEFAULT_CATEGORIES: IngredientCategoryItem[] = [
  { id: 'cat_produce', name: 'Produce', slug: 'produce', icon: '🥬', description: 'Fresh vegetables, fruits, and culinary herbs', isActive: true, order: 1 },
  { id: 'cat_meat', name: 'Meat & Poultry', slug: 'meat-poultry', icon: '🥩', description: 'Fresh meats, cuts, beef, poultry, and bacon', isActive: true, order: 2 },
  { id: 'cat_seafood', name: 'Seafood', slug: 'seafood', icon: '🐟', description: 'Fresh fish, fillets, shrimp, and shellfish', isActive: true, order: 3 },
  { id: 'cat_dairy', name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🧀', description: 'Milk, cheeses, butter, cream, and fresh eggs', isActive: true, order: 4 },
  { id: 'cat_pantry', name: 'Pantry Staples', slug: 'pantry-staples', icon: '🌾', description: 'Flour, rice, grains, pasta, sugar, and legumes', isActive: true, order: 5 },
  { id: 'cat_bakery', name: 'Bakery & Bread', slug: 'bakery-bread', icon: '🍞', description: 'Artisan loaves, tortillas, pitas, and baked goods', isActive: true, order: 6 },
  { id: 'cat_canned', name: 'Canned Goods', slug: 'canned-goods', icon: '🥫', description: 'Canned tomatoes, broths, beans, and preserved foods', isActive: true, order: 7 },
  { id: 'cat_frozen', name: 'Frozen Foods', slug: 'frozen-foods', icon: '🧊', description: 'Frozen veggies, berries, prepared sides, and ice cream', isActive: true, order: 8 },
  { id: 'cat_spices', name: 'Spices & Seasonings', slug: 'spices-seasonings', icon: '🧂', description: 'Dried seasonings, sea salt, pepper, and spice rubs', isActive: true, order: 9 },
  { id: 'cat_oils', name: 'Oils & Vinegars', slug: 'oils-vinegars', icon: '🫒', description: 'Olive oil, toasted sesame, balsamic, and vinegars', isActive: true, order: 10 },
  { id: 'cat_condiments', name: 'Condiments & Sauces', slug: 'condiments-sauces', icon: '🍯', description: 'Mustards, soy sauce, hot sauces, and dressings', isActive: true, order: 11 },
  { id: 'cat_beverages', name: 'Beverages', slug: 'beverages', icon: '🍹', description: 'Juices, soda, sparkling water, tea, and specialty drinks', isActive: true, order: 12 },
  { id: 'cat_snacks', name: 'Snacks & Sweets', slug: 'snacks-sweets', icon: '🍪', description: 'Nuts, dried fruits, crackers, and snacks', isActive: true, order: 13 }
];

export default function AdminIngredientCategoriesPage() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<IngredientCategoryItem[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [reorderMode, setReorderMode] = useState<boolean>(false);
  const [hasReordered, setHasReordered] = useState<boolean>(false);

  // Inline editing state (pencil -> checkmark)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = useState<string>('');

  // Modal Dialog States (Autofill Safe Accessible <div> Containers)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<IngredientCategoryItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    icon: string;
    description: string;
    isActive: boolean;
  }>({
    name: '',
    slug: '',
    icon: '🥬',
    description: '',
    isActive: true
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<IngredientCategoryItem | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Self-update guard to prevent race conditions
  const isSelfUpdatingRef = useRef<boolean>(false);
  const draggedIndexRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchCategories = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/admin/ingredient-categories?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) 
          ? data 
          : Array.isArray(data?.categories) 
            ? data.categories 
            : Array.isArray(data?.ingredientCategories) 
              ? data.ingredientCategories 
              : [];
        if (rawList.length > 0) {
          const normalized = rawList.map((item: any, idx: number) => {
            if (typeof item === 'string') {
              const slug = item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              return {
                id: `cat_${slug || idx + 1}`,
                name: item,
                slug: slug || `category-${idx + 1}`,
                icon: '🥬',
                description: '',
                isActive: true,
                order: idx + 1
              };
            }
            const name = item.name || item.title || item.label || 'Untitled';
            const slug = (item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '');
            return {
              id: item.id || `cat_${slug || idx + 1}`,
              name,
              slug: slug || `category-${idx + 1}`,
              icon: item.icon || '🥬',
              description: item.description || '',
              isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
              order: item.order !== undefined ? Number(item.order) : idx + 1
            };
          });
          setCategories(normalized);
          setHasReordered(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch ingredient categories:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('ingredientCategoriesTitle', 'Ingredient Categories')} - Zecratary Admin`;
    fetchCategories();

    const handleExternalUpdates = () => {
      if (isSelfUpdatingRef.current) return;
      fetchCategories(true);
    };

    window.addEventListener('zecratary_ingredient_categories_updated', handleExternalUpdates);
    window.addEventListener('zecratary_admin_settings_updated', handleExternalUpdates);
    window.addEventListener('storage', handleExternalUpdates);

    return () => {
      window.removeEventListener('zecratary_ingredient_categories_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_admin_settings_updated', handleExternalUpdates);
      window.removeEventListener('storage', handleExternalUpdates);
    };
  }, [fetchCategories, t]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.slug.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.isActive).length;
    return { total, active };
  }, [categories]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      slug: '',
      icon: '🥬',
      description: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: IngredientCategoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      icon: item.icon || '🥬',
      description: item.description || '',
      isActive: item.isActive
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormData(prev => {
      const isAutoSlug = !editingItem || prev.slug === editingItem.slug || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newSlug = isAutoSlug ? val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : prev.slug;
      return { ...prev, name: val, slug: newSlug };
    });
  };

  // Quick Add Input submission
  const handleQuickAdd = async () => {
    const cleanName = quickAddName.trim();
    if (!cleanName) return;

    const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newItem: IngredientCategoryItem = {
      id: `cat_${Date.now().toString(36)}`,
      name: cleanName,
      slug: cleanSlug || `cat-${Date.now()}`,
      icon: '🥬',
      description: '',
      isActive: true,
      order: categories.length + 1
    };

    const updatedList = [...categories, newItem];
    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedList, ingredientCategories: updatedList })
      });

      if (!res.ok) throw new Error(t('categorySaveError', 'Failed to save ingredient category.'));

      setCategories(updatedList);
      setQuickAddName('');
      showToast(t('categorySavedSuccess', 'Ingredient category saved successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || t('categorySaveError', 'Failed to save ingredient category.'), 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  // Inline editing submission (pencil -> checkmark)
  const handleSaveInlineEdit = async (item: IngredientCategoryItem) => {
    const cleanName = inlineEditingName.trim();
    if (!cleanName || cleanName === item.name) {
      setInlineEditingId(null);
      return;
    }

    const updatedList = categories.map(cat => 
      cat.id === item.id ? { ...cat, name: cleanName } : cat
    );

    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedList, ingredientCategories: updatedList })
      });

      if (!res.ok) throw new Error('Failed to update category');

      setCategories(updatedList);
      setInlineEditingId(null);
      showToast(t('categorySavedSuccess', 'Ingredient category saved successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || 'Failed to update category', 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  // Full Modal Save
  const handleSaveModal = async () => {
    const cleanName = formData.name.trim();
    if (!cleanName) return;

    let cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!cleanSlug) cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newItem: IngredientCategoryItem = {
      id: editingItem ? editingItem.id : `cat_${Date.now().toString(36)}`,
      name: cleanName,
      slug: cleanSlug,
      icon: formData.icon.trim() || '🥬',
      description: formData.description.trim(),
      isActive: formData.isActive,
      order: editingItem?.order !== undefined ? editingItem.order : categories.length + 1
    };

    let updatedList: IngredientCategoryItem[] = [];
    if (editingItem) {
      updatedList = categories.map(it => it.id === editingItem.id ? newItem : it);
    } else {
      updatedList = [...categories, newItem];
    }

    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedList, ingredientCategories: updatedList })
      });

      if (!res.ok) throw new Error(t('categorySaveError', 'Failed to save ingredient category.'));

      setCategories(updatedList);
      setIsModalOpen(false);
      showToast(t('categorySavedSuccess', 'Ingredient category saved successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || t('categorySaveError', 'Failed to save ingredient category.'), 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const updatedList = categories.filter(it => it.id !== itemToDelete.id);
    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch(`/api/admin/ingredient-categories?id=${encodeURIComponent(itemToDelete.id)}&slug=${encodeURIComponent(itemToDelete.slug)}&name=${encodeURIComponent(itemToDelete.name)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete ingredient category');

      setCategories(updatedList);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      showToast(t('categoryDeletedSuccess', 'Ingredient category deleted successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  const handleToggleStatus = async (item: IngredientCategoryItem) => {
    const updated = categories.map(it => it.id === item.id ? { ...it, isActive: !it.isActive } : it);
    setCategories(updated);
    isSelfUpdatingRef.current = true;

    try {
      await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updated, ingredientCategories: updated })
      });
      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (_) {} finally {
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  // Reset to default categories
  const handleResetDefaults = async () => {
    if (!confirm(t('confirmResetDefaults', 'Are you sure you want to reset all ingredient categories to default system categories?'))) return;

    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      if (!res.ok) throw new Error('Failed to reset categories');

      setCategories(DEFAULT_CATEGORIES);
      setHasReordered(false);
      showToast(t('categoriesResetSuccess', 'Ingredient categories reset to default successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || 'Failed to reset categories', 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  // Reordering controls (Touch Steppers & HTML5 Drag)
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reordered = list.map((it, idx) => ({ ...it, order: idx + 1 }));
    setCategories(reordered);
    setHasReordered(true);
  };

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndexRef.current === null || draggedIndexRef.current === index) return;

    const list = [...categories];
    const [dragged] = list.splice(draggedIndexRef.current, 1);
    list.splice(index, 0, dragged);
    draggedIndexRef.current = index;

    const reordered = list.map((it, idx) => ({ ...it, order: idx + 1 }));
    setCategories(reordered);
    setHasReordered(true);
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/ingredient-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories, ingredientCategories: categories })
      });

      if (!res.ok) throw new Error('Failed to save order');

      setHasReordered(false);
      showToast(t('categoryOrderSuccess', 'Display order updated successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_ingredient_categories_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || 'Failed to save order', 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Toast Alert Banner */}
      {toast && (
        <div 
          className="fixed top-20 right-4 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toast.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: toast.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--color-primary)' }}>
            <Tags className="h-6 w-6" />
            <span>{t('ingredientCategoriesTitle', 'Ingredient Categories')}</span>
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {t('ingredientCategoriesSubtitle', 'Manage ingredient categories and department classifications for pantry and shopping lists.')}
          </p>
        </div>

        {/* Global Statistics Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{t('totalCategoriesBadge', 'Total Categories')}:</span>
            <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{stats.total}</span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{t('activeCategoriesBadge', 'Active')}:</span>
            <span className="font-mono text-emerald-500">{stats.active}</span>
          </div>
        </div>
      </div>

      {/* Quick Add Bar & Search Controls (Autofill Safe Accessible <div> Container) */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-4 rounded-3xl border shadow-sm space-y-3.5 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Quick Add Input */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              spellCheck="false"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
              placeholder={t('quickAddPlaceholder', 'Enter new category name...')}
              className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl border outline-none transition"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
            <button
              type="button"
              disabled={saving || !quickAddName.trim()}
              onClick={handleQuickAdd}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:opacity-95 transition disabled:opacity-40 cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{t('addCategoryBtn', 'Add Category')}</span>
            </button>
          </div>

          {/* Detailed Add Modal Trigger */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            + {t('addNewCategoryModalTitle', 'Add New Category')}
          </button>
        </div>

        {/* Search, Reorder Toggle, and Defaults Reset */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              data-lpignore="true"
              data-form-type="other"
              autoComplete="off"
              spellCheck="false"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchIngredientCategoriesPlaceholder', 'Search ingredient categories...')}
              className="w-full pl-10 pr-9 py-2 text-xs font-medium rounded-xl border outline-none transition"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setReorderMode(!reorderMode)}
              className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              style={reorderMode ? {
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                color: '#ffffff'
              } : {
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{t('reorderModeBtn', 'Reorder Mode')}</span>
            </button>

            {hasReordered && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveOrder}
                className="px-3.5 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:opacity-95 transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-emerald)' }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{saving ? t('savingOrder', 'Saving Order...') : t('saveOrderBtn', 'Save Order')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition opacity-70 hover:opacity-100 cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title={t('resetToDefaultsBtn', 'Reset Defaults')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t('resetToDefaultsBtn', 'Reset Defaults')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Grid View (Autofill Safe Container) */}
      <div 
        role="region"
        data-lpignore="true"
        className="rounded-3xl border shadow-xl overflow-hidden transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Loading ingredient categories...
            </p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <Tags className="h-10 w-10 mx-auto stroke-1" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {t('noIngredientCategoriesFound', 'No ingredient categories found matching your search.')}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('clearSearchBtn', 'Clear Search')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr 
                  className="border-b transition-colors"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {reorderMode && <th className="p-3.5 w-12 text-center">#</th>}
                  <th className="p-3.5 font-bold">{t('categoryNameColumn', 'Category Name')}</th>
                  <th className="p-3.5 font-bold">{t('categorySlugColumn', 'Slug / Identifier')}</th>
                  <th className="p-3.5 font-bold text-center w-28">{t('categoryStatusActive', 'Status')}</th>
                  <th className="p-3.5 font-bold text-right pr-6 w-32">{t('actionsColumn', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredCategories.map((item, idx) => {
                  const isInlineEditing = inlineEditingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      draggable={reorderMode}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className="group transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {/* Reorder Touch & Drag Controls */}
                      {reorderMode && (
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <GripVertical className="h-4 w-4 cursor-grab text-gray-400" />
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveItem(idx, 'up')}
                                title={t('moveUpTooltip', 'Move Up')}
                                className="p-0.5 hover:text-white rounded disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === filteredCategories.length - 1}
                                onClick={() => moveItem(idx, 'down')}
                                title={t('moveDownTooltip', 'Move Down')}
                                className="p-0.5 hover:text-white rounded disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Name & Icon with Inline Editing Support */}
                      <td className="p-3.5 font-semibold">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl border flex items-center justify-center text-sm shadow-xs shrink-0"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            {item.icon || '🥬'}
                          </span>

                          {isInlineEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                              <input
                                type="text"
                                autoFocus
                                autoComplete="off"
                                data-lpignore="true"
                                data-form-type="other"
                                value={inlineEditingName}
                                onChange={(e) => setInlineEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit(item);
                                  if (e.key === 'Escape') setInlineEditingId(null);
                                }}
                                className="px-2.5 py-1 text-xs rounded-lg border outline-none font-bold flex-1"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-primary)',
                                  color: 'var(--color-text)'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(item)}
                                className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                title="Save"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineEditingId(null)}
                                className="p-1 rounded-lg border text-gray-400 hover:text-white cursor-pointer"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                                {item.name}
                              </span>
                              {item.description && (
                                <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                                  {item.description}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="p-3.5 font-mono text-[11px]" style={{ color: 'var(--color-primary)' }}>
                        {item.slug}
                      </td>

                      {/* Status Toggle */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                          style={item.isActive ? {
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--color-emerald)',
                            borderColor: 'var(--color-emerald)',
                            borderWidth: '1px'
                          } : {
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            borderWidth: '1px'
                          }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          <span>{item.isActive ? t('activeCategoriesBadge', 'Active') : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setInlineEditingId(item.id);
                              setInlineEditingName(item.name);
                            }}
                            className="p-1.5 rounded-xl border transition hover:opacity-90 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                            title="Quick Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-xl border transition hover:opacity-90 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                            title={t('editCategoryModalTitle', 'Edit Category')}
                          >
                            <Tags className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                            title={t('deleteCategoryModalTitle', 'Delete Category')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal (Accessible <div> Container) */}
      {isModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsModalOpen(false);
          }}
        >
          <div 
            role="region"
            data-lpignore="true"
            data-form-type="other"
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                <Tags className="h-5 w-5" />
                <span>{editingItem ? t('editCategoryModalTitle', 'Edit Category') : t('addNewCategoryModalTitle', 'Add New Category')}</span>
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Category Name */}
              <div>
                <label className="block mb-1.5">{t('categoryNameLabel', 'Category Name *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('categoryNamePlaceholder', 'e.g., Produce, Dairy, Spices & Seasonings')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-medium"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Slug & Icon Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5">{t('categorySlugLabel', 'Slug Identifier *')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder={t('categorySlugPlaceholder', 'e.g., produce, dairy-eggs, spices')}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px]"
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
                  <label className="block mb-1.5">{t('categoryIconLabel', 'Icon / Emoji')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder={t('categoryIconPlaceholder', 'e.g., 🥬, 🥩, 🧀, 🧂')}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-center font-emoji"
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

              {/* Description */}
              <div>
                <label className="block mb-1.5">{t('categoryDescriptionLabel', 'Description (Optional)')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('categoryDescriptionPlaceholder', 'Department description or shelf location...')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none resize-none font-normal"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="cat-active-checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded cursor-pointer accent-[var(--color-primary)] h-4 w-4"
                />
                <label htmlFor="cat-active-checkbox" className="cursor-pointer text-xs font-semibold">
                  {t('categoryStatusActive', 'Active (Available in pantry & shopping lists)')}
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={saving || !formData.name.trim()}
                onClick={handleSaveModal}
                className="px-5 py-2 rounded-xl text-white text-xs font-black shadow-md transition disabled:opacity-50 hover:opacity-95"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? '...' : t('saveBtn', 'Save Category')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Accessible <div> Container) */}
      {isDeleteModalOpen && itemToDelete && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsDeleteModalOpen(false);
          }}
        >
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="flex items-center gap-3 text-red-500">
              <Trash2 className="h-6 w-6 shrink-0" />
              <h2 className="text-sm font-black">{t('deleteCategoryModalTitle', 'Delete Category')}</h2>
            </div>

            <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('deleteCategoryConfirmMsg', 'Are you sure you want to delete this category? Ingredients and pantry items assigned to this category will remain intact.')}
            </p>

            <div 
              className="p-3 rounded-xl border font-bold text-xs flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <span>{itemToDelete.icon}</span>
              <span style={{ color: 'var(--color-text)' }}>{itemToDelete.name}</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-primary)' }}>({itemToDelete.slug})</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {saving ? '...' : t('confirmDeleteBtn', 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
