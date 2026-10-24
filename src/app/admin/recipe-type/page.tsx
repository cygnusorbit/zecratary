// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UtensilsCrossed, Plus, Search, GripVertical, Pencil, Trash2, 
  CheckCircle2, AlertCircle, RefreshCw, X, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface RecipeTypeItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  order?: number;
}

const DEFAULT_RECIPE_TYPES: RecipeTypeItem[] = [
  { id: 'rt_1', name: 'Breakfast', slug: 'breakfast', icon: '🍳', description: 'Morning meals, smoothies, eggs, and breakfast bowls', isActive: true, order: 1 },
  { id: 'rt_2', name: 'Lunch', slug: 'lunch', icon: '🥪', description: 'Midday plates, wraps, light meals, and express bowls', isActive: true, order: 2 },
  { id: 'rt_3', name: 'Dinner', slug: 'dinner', icon: '🍽️', description: 'Substantial evening entrees, roasts, and hearty dishes', isActive: true, order: 3 },
  { id: 'rt_4', name: 'Main Dish', slug: 'main-dish', icon: '🥩', description: 'Culinary centerpieces and hero protein plates', isActive: true, order: 4 },
  { id: 'rt_5', name: 'Appetizer', slug: 'appetizer', icon: '🥟', description: 'Finger foods, starters, tapas, and hors d’oeuvres', isActive: true, order: 5 },
  { id: 'rt_6', name: 'Side Dish', slug: 'side-dish', icon: '🥔', description: 'Vegetables, grains, rice, and accompanying sides', isActive: true, order: 6 },
  { id: 'rt_7', name: 'Salad', slug: 'salad', icon: '🥗', description: 'Fresh leafy bowls, grain salads, and vinaigrettes', isActive: true, order: 7 },
  { id: 'rt_8', name: 'Soup', slug: 'soup', icon: '🍲', description: 'Warm broths, chowders, stews, and bisques', isActive: true, order: 8 },
  { id: 'rt_9', name: 'Dessert', slug: 'dessert', icon: '🍰', description: 'Pastries, cakes, puddings, sweets, and confections', isActive: true, order: 9 },
  { id: 'rt_10', name: 'Snacks', slug: 'snacks', icon: '🥨', description: 'Quick bites, chips, dips, and energy fuel', isActive: true, order: 10 },
  { id: 'rt_11', name: 'Beverages', slug: 'beverages', icon: '🍹', description: 'Cocktails, mocktails, juices, teas, and specialty drinks', isActive: true, order: 11 }
];

export default function AdminRecipeTypePage() {
  const { t } = useTranslation();

  const [recipeTypes, setRecipeTypes] = useState<RecipeTypeItem[]>(DEFAULT_RECIPE_TYPES);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reorderMode, setReorderMode] = useState<boolean>(false);
  const [hasReordered, setHasReordered] = useState<boolean>(false);

  // Modal Dialog States (Autofill Safe Accessible <div> Containers)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<RecipeTypeItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    icon: string;
    description: string;
    isActive: boolean;
  }>({
    name: '',
    slug: '',
    icon: '🍽️',
    description: '',
    isActive: true
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<RecipeTypeItem | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Self-update guard to prevent race conditions from own window events
  const isSelfUpdatingRef = useRef<boolean>(false);
  const draggedIndexRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchRecipeTypes = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/admin/recipe-type?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const types = Array.isArray(data) 
          ? data 
          : Array.isArray(data?.types) 
            ? data.types 
            : Array.isArray(data?.recipeTypes) 
              ? data.recipeTypes 
              : [];
        if (types.length > 0) {
          const normalized = types.map((item: any, idx: number) => ({
            id: item.id || `rt_${idx + 1}`,
            name: typeof item === 'string' ? item : item.name || item.title || item.label || 'Untitled',
            slug: typeof item === 'string' 
              ? item.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
              : item.slug || item.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `type-${idx + 1}`,
            icon: typeof item === 'object' && item.icon ? item.icon : '🍽️',
            description: typeof item === 'object' && item.description ? item.description : '',
            isActive: typeof item === 'object' && item.isActive !== undefined ? Boolean(item.isActive) : true,
            order: typeof item === 'object' && item.order !== undefined ? Number(item.order) : idx + 1
          }));
          setRecipeTypes(normalized);
          setHasReordered(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch recipe types:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('recipeTypesTitle', 'Recipe Types')} - Zecratary Admin`;
    fetchRecipeTypes();

    const handleExternalUpdates = () => {
      if (isSelfUpdatingRef.current) return;
      fetchRecipeTypes(true);
    };

    window.addEventListener('zecratary_recipe_types_updated', handleExternalUpdates);
    window.addEventListener('zecratary_admin_settings_updated', handleExternalUpdates);
    window.addEventListener('storage', handleExternalUpdates);

    return () => {
      window.removeEventListener('zecratary_recipe_types_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_admin_settings_updated', handleExternalUpdates);
      window.removeEventListener('storage', handleExternalUpdates);
    };
  }, [fetchRecipeTypes, t]);

  const filteredTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recipeTypes;
    return recipeTypes.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.slug.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }, [recipeTypes, searchQuery]);

  const stats = useMemo(() => {
    const total = recipeTypes.length;
    const active = recipeTypes.filter(t => t.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [recipeTypes]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      slug: '',
      icon: '🍽️',
      description: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: RecipeTypeItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      icon: item.icon || '🍽️',
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

  const handleSaveModal = async () => {
    const cleanName = formData.name.trim();
    if (!cleanName) return;

    let cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!cleanSlug) cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newItem: RecipeTypeItem = {
      id: editingItem ? editingItem.id : `rt_${Date.now().toString(36)}`,
      name: cleanName,
      slug: cleanSlug,
      icon: formData.icon.trim() || '🍽️',
      description: formData.description.trim(),
      isActive: formData.isActive,
      order: editingItem?.order !== undefined ? editingItem.order : recipeTypes.length + 1
    };

    let updatedList: RecipeTypeItem[] = [];
    if (editingItem) {
      updatedList = recipeTypes.map(it => it.id === editingItem.id ? newItem : it);
    } else {
      updatedList = [...recipeTypes, newItem];
    }

    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/recipe-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeTypes: updatedList })
      });

      if (!res.ok) throw new Error(t('recipeTypeSaveError', 'Failed to save recipe type.'));

      setRecipeTypes(updatedList);
      setIsModalOpen(false);
      showToast(t('recipeTypeSavedSuccess', 'Recipe type saved successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_recipe_types_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || t('recipeTypeSaveError', 'Failed to save recipe type.'), 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const updatedList = recipeTypes.filter(it => it.id !== itemToDelete.id);
    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch(`/api/admin/recipe-type?id=${encodeURIComponent(itemToDelete.id)}&slug=${encodeURIComponent(itemToDelete.slug)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete recipe type');

      setRecipeTypes(updatedList);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      showToast(t('recipeTypeDeletedSuccess', 'Recipe type deleted successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_recipe_types_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete recipe type', 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  const handleToggleStatus = async (item: RecipeTypeItem) => {
    const updated = recipeTypes.map(it => it.id === item.id ? { ...it, isActive: !it.isActive } : it);
    setRecipeTypes(updated);
    isSelfUpdatingRef.current = true;

    try {
      await fetch('/api/admin/recipe-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeTypes: updated })
      });
      window.dispatchEvent(new Event('zecratary_recipe_types_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (_) {} finally {
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  // Accessible Touch-Friendly Reordering Controls
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= recipeTypes.length) return;

    const list = [...recipeTypes];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reordered = list.map((it, idx) => ({ ...it, order: idx + 1 }));
    setRecipeTypes(reordered);
    setHasReordered(true);
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndexRef.current === null || draggedIndexRef.current === index) return;

    const list = [...recipeTypes];
    const [dragged] = list.splice(draggedIndexRef.current, 1);
    list.splice(index, 0, dragged);
    draggedIndexRef.current = index;

    const reordered = list.map((it, idx) => ({ ...it, order: idx + 1 }));
    setRecipeTypes(reordered);
    setHasReordered(true);
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/recipe-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeTypes })
      });

      if (!res.ok) throw new Error('Failed to save order');

      setHasReordered(false);
      showToast(t('recipeTypeOrderSuccess', 'Display order updated successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_recipe_types_updated'));
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
            <UtensilsCrossed className="h-6 w-6" />
            <span>{t('recipeTypesTitle', 'Recipe Types')}</span>
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {t('recipeTypesSubtitle', 'Manage recipe types and meal categories across the culinary platform.')}
          </p>
        </div>

        {/* Global Statistics Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{t('totalTypesBadge', 'Total Types')}:</span>
            <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{stats.total}</span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{t('activeTypesBadge', 'Active')}:</span>
            <span className="font-mono text-emerald-500">{stats.active}</span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{t('inactiveTypesBadge', 'Inactive')}:</span>
            <span className="font-mono text-amber-500">{stats.inactive}</span>
          </div>
        </div>
      </div>

      {/* Action Bar (Search, Reorder Toggle, and Add Type) */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
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
            placeholder={t('searchRecipeTypesPlaceholder', 'Search recipe types by name or slug...')}
            className="w-full pl-10 pr-9 py-2.5 text-xs font-medium rounded-xl border outline-none transition"
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReorderMode(!reorderMode)}
            className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
            <ArrowUpDown className="h-4 w-4" />
            <span>{t('reorderModeBtn', 'Reorder Mode')}</span>
          </button>

          {hasReordered && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveOrder}
              className="px-3.5 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:opacity-95 transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-emerald)' }}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{saving ? t('savingOrder', 'Saving Order...') : t('saveOrderBtn', 'Save Order')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:opacity-95 transition cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{t('addRecipeTypeBtn', 'Add Recipe Type')}</span>
          </button>
        </div>
      </div>

      {/* Main Table / Card View (Autofill Safe Container) */}
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
              Loading recipe types...
            </p>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <UtensilsCrossed className="h-10 w-10 mx-auto stroke-1" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {t('noRecipeTypesFound', 'No recipe types found matching your search.')}
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
                  <th className="p-3.5 font-bold">{t('typeNameColumn', 'Type Name')}</th>
                  <th className="p-3.5 font-bold">{t('slugColumn', 'Slug / Identifier')}</th>
                  <th className="p-3.5 font-bold hidden md:table-cell">{t('descriptionColumn', 'Description')}</th>
                  <th className="p-3.5 font-bold text-center w-28">{t('statusColumn', 'Status')}</th>
                  <th className="p-3.5 font-bold text-right pr-6 w-32">{t('actionsColumn', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredTypes.map((item, idx) => (
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
                              disabled={idx === filteredTypes.length - 1}
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

                    {/* Name & Icon */}
                    <td className="p-3.5 font-semibold">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl border flex items-center justify-center text-sm shadow-xs shrink-0"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          {item.icon || '🍽️'}
                        </span>
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="p-3.5 font-mono text-[11px]" style={{ color: 'var(--color-primary)' }}>
                      {item.slug}
                    </td>

                    {/* Description */}
                    <td className="p-3.5 hidden md:table-cell max-w-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.description || '—'}
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
                        <span>{item.isActive ? t('activeTypesBadge', 'Active') : t('inactiveTypesBadge', 'Inactive')}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-xl border transition hover:opacity-90 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(item);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Recipe Type Modal (Accessible <div> Container) */}
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
                <UtensilsCrossed className="h-5 w-5" />
                <span>{editingItem ? t('editTypeModalTitle', 'Edit Recipe Type') : t('addNewTypeModalTitle', 'Add New Recipe Type')}</span>
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
              {/* Type Name */}
              <div>
                <label className="block mb-1.5">{t('typeNameLabel', 'Recipe Type Name *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('typeNamePlaceholder', 'e.g., Breakfast, Main Dish, Dessert')}
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
                  <label className="block mb-1.5">{t('typeSlugLabel', 'Slug Identifier *')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder={t('typeSlugPlaceholder', 'e.g., breakfast, main-dish, dessert')}
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
                  <label className="block mb-1.5">{t('typeIconLabel', 'Icon / Emoji')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder={t('typeIconPlaceholder', 'e.g., 🍳, 🥗, 🍰')}
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
                <label className="block mb-1.5">{t('typeDescriptionLabel', 'Description (Optional)')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('typeDescriptionPlaceholder', 'Brief summary of this recipe type...')}
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
                  id="recipe-type-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded cursor-pointer accent-[var(--color-primary)] h-4 w-4"
                />
                <label htmlFor="recipe-type-active" className="cursor-pointer text-xs font-semibold">
                  {t('typeStatusActive', 'Active (Visible in recipe creators & filters)')}
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
                {saving ? '...' : t('saveBtn', 'Save Recipe Type')}
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
              <h2 className="text-sm font-black">{t('deleteTypeModalTitle', 'Delete Recipe Type')}</h2>
            </div>

            <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('deleteTypeConfirmMsg', 'Are you sure you want to delete this recipe type? Recipes associated with this type will remain intact.')}
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
