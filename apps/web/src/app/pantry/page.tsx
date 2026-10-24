// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Package, Plus, Trash2, Camera, Search, ArrowUpDown, 
  Check, Edit3, X, Save, ChefHat, Calendar, Sparkles,
  CheckCircle2, AlertCircle, ChevronDown, Filter, ArrowRight
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useIngredientCategories, DEFAULT_CATEGORIES } from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';

interface PantryItem {
  id: string;
  userId: string;
  createdBy?: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  expiryDate: string;
}


const getCategoryName = (cat: any): string => {
  if (!cat) return '';
  if (typeof cat === 'string') {
    const trimmed = cat.trim();
    return trimmed === '[object Object]' ? 'Other' : trimmed;
  }
  if (typeof cat === 'object') {
    return (cat.name || cat.label || cat.title || cat.id || cat.slug || 'Other').trim();
  }
  return String(cat).trim();
};

const normalizeCategoriesList = (list: any[]): string[] => {
  if (!Array.isArray(list)) return [];
  const result: string[] = [];
  list.forEach((item) => {
    const name = getCategoryName(item);
    if (name && name !== 'All' && !result.includes(name)) {
      result.push(name);
    }
  });
  return result;
};

export default function PantryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const remoteCategories = useIngredientCategories();
  const categoriesList = useMemo(() => {
    return Array.isArray(remoteCategories) && remoteCategories.length > 0 
      ? remoteCategories 
      : DEFAULT_CATEGORIES;
  }, [remoteCategories]);

  const safeDefaultCategory = categoriesList[0] || 'Produce';

  // Add Modal State (Form-Free Container)
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(safeDefaultCategory);
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [expiryDate, setExpiryDate] = useState('');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Hidden Camera File Input Ref
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const calculateDaysLeft = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Fetch live pantry items from PostgreSQL /api/pantry
  const loadPantryData = useCallback(async (user: User | null) => {
    if (!user) return;
    const targetUserId = user.id || user.email || 'usr_admin_1';
    setLoading(true);

    try {
      let fetchedItems: PantryItem[] = [];
      const res = await fetch(`/api/pantry?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.items || data?.pantry || []);
        if (Array.isArray(list) && list.length > 0) {
          fetchedItems = list.map((item: any) => ({
            id: item.id || ('p_' + Math.random().toString(36).substring(2, 7)),
            userId: item.userId || item.user_id || targetUserId,
            createdBy: item.createdBy || item.created_by || user.email,
            name: item.name || item.item || 'Ingredient',
            quantity: String(item.quantity ?? '1'),
            unit: item.unit || 'Unit',
            category: item.category || 'Produce',
            expiryDate: item.expiryDate || item.expiry_date || ''
          }));
        }
      }

      // Offline localStorage fallback if API is unreachable
      if (fetchedItems.length === 0 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) fetchedItems = parsed;
        }
      }

      setPantryItems(fetchedItems);
    } catch (e) {
      console.warn('[PantryPage] Error loading pantry data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('pantryInventory', 'Pantry Inventory')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadPantryData(user);

    const handleSync = () => {
      const active = getCurrentUser();
      if (active) {
        setCurrentUser(active);
        loadPantryData(active);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_pantry_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadPantryData, router, t]);

  const savePantryList = async (updatedItems: PantryItem[]) => {
    if (!currentUser) return;
    const targetUserId = currentUser.id || 'usr_admin_1';
    setPantryItems(updatedItems);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_pantry_items', JSON.stringify(updatedItems));
        localStorage.setItem('zecratary_pantry', JSON.stringify(updatedItems));
      } catch (_) {}
    }

    try {
      await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, userEmail: currentUser.email, items: updatedItems })
      });
    } catch (_) {}

    window.dispatchEvent(new Event('zecratary_pantry_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  // Add Item
  const handleAddItem = async () => {
    if (!itemName.trim() || !currentUser) return;

    const newItem: PantryItem = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id || 'usr_admin_1',
      createdBy: currentUser.email || 'admin@zecratary.com',
      name: itemName.trim(),
      quantity: itemQuantity.trim() || '1',
      unit: itemUnit.trim() || 'Unit',
      category: itemCategory || safeDefaultCategory,
      expiryDate: expiryDate || ''
    };

    const updated = [newItem, ...pantryItems];
    await savePantryList(updated);

    setItemName('');
    setItemQuantity('1');
    setItemUnit('Unit');
    setExpiryDate('');
    setShowAddModal(false);
    showToast(t('pantryItemAddedToast', 'Ingredient added to your pantry!'));
  };

  // Update Item
  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.name.trim() || !currentUser) return;

    const updated = pantryItems.map(item => 
      item.id === editingItem.id 
        ? { ...editingItem, userId: currentUser.id || 'usr_admin_1', createdBy: currentUser.email } 
        : item
    );

    await savePantryList(updated);
    setEditingItem(null);
    showToast(t('pantryItemUpdatedToast', 'Ingredient updated successfully!'));
  };

  // Quick Inline Quantity Adjustment
  const handleAdjustQuantity = async (e: React.MouseEvent, id: string, delta: number) => {
    e.stopPropagation();
    const item = pantryItems.find(p => p.id === id);
    if (!item) return;

    const currentQty = parseFloat(item.quantity) || 1;
    const nextQty = Math.max(0, currentQty + delta);

    let updated: PantryItem[] = [];
    if (nextQty === 0) {
      updated = pantryItems.filter(p => p.id !== id);
      showToast(t('pantryItemDeletedToast', 'Ingredient removed from pantry.'));
    } else {
      updated = pantryItems.map(p => p.id === id ? { ...p, quantity: String(nextQty) } : p);
    }

    await savePantryList(updated);
  };

  // Delete Single Item
  const handleDeleteItem = async (id: string) => {
    const updated = pantryItems.filter(item => item.id !== id);
    await savePantryList(updated);
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));

    try {
      await fetch(`/api/pantry?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    showToast(t('pantryItemDeletedToast', 'Ingredient removed from pantry.'));
  };

  // Delete Selected
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmTemplate = t('confirmDeleteSelectedIngredients', 'Are you sure you want to delete {count} selected ingredient(s)?');
    if (!confirm(confirmTemplate.replace('{count}', String(selectedIds.length)))) return;

    const countDeleted = selectedIds.length;
    const updated = pantryItems.filter(item => !selectedIds.includes(item.id));
    await savePantryList(updated);

    try {
      await fetch('/api/pantry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
    } catch (_) {}

    setSelectedIds([]);
    showToast((t('pantrySelectedDeletedToast', '{count} ingredients removed from pantry.')).replace('{count}', String(countDeleted)));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Handoff to /chef for AI Recipe Generation with Selected Stock
  const handleDiscoverRecipes = () => {
    if (selectedIds.length === 0) {
      showToast(t('selectIngredientsPrompt', 'Please select at least one ingredient to discover recipes.'), 'error');
      return;
    }

    const selectedIngredients = pantryItems
      .filter(it => selectedIds.includes(it.id))
      .map(it => it.name.trim())
      .filter(Boolean);

    router.push(`/chef?prompt=${encodeURIComponent(`Create a customized chef recipe using these available pantry ingredients: ${selectedIngredients.join(', ')}`)}`);
  };

  // Direct Camera / Photo Scan Integration
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    router.push('/import');
  };

  const filteredItems = useMemo(() => {
    return pantryItems
      .filter(item => {
        if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const res = a.name.localeCompare(b.name);
        return sortAsc ? res : -res;
      });
  }, [pantryItems, search, selectedCategory, sortAsc]);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toastMessage.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: 'var(--color-text)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hidden Native File Input for Camera Photos */}
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleCameraCapture}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('pantryInventory', 'Pantry Inventory')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {currentUser?.name ? `${currentUser.name}${t('userStockSuffix', "'s private stock:")} ` : ''}
            {t('pantrySubtitle', 'Manage available ingredients, track expiry dates, and discover matching recipes.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-emerald)'
            }}
            title={t('takePhoto', 'Scan Photo / OCR')}
          >
            <Camera className="h-4 w-4" /> 
            <span>{t('takePhoto', 'Scan Photo / OCR')}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> 
            <span>{t('addIngredientBtn', 'Add Ingredient')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Department Filter Pills */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-4 rounded-3xl border space-y-3.5 shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search 
              className="h-4 w-4 absolute left-3.5 top-3.5 pointer-events-none opacity-60" 
              style={{ color: 'var(--color-emerald)' }}
            />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              spellCheck="false"
              placeholder={t('searchPantryPlaceholder', 'Search your pantry ingredients...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition font-medium"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <option value="All">{t('allCategories', 'All Categories')}</option>
              {categoriesList.map((cat: any, idx: number) => {
                  const catName = getCategoryName(cat);
                  if (!catName || catName === 'All') return null;
                  return (
                    <option key={`pantry_cat_${catName}_${idx}`} value={catName}>
                      {catName}
                    </option>
                  );
                })}
            </select>
          </div>
        </div>

        {/* Action Controls & Batch Operations */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={handleDiscoverRecipes}
            disabled={selectedIds.length === 0}
            className="font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-40"
            style={selectedIds.length > 0 ? {
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff'
            } : {
              backgroundColor: 'var(--color-inner-dark)',
              color: 'var(--color-text-secondary)',
              borderWidth: '1px',
              borderColor: 'var(--color-border)'
            }}
          >
            <ChefHat className="h-4 w-4" /> 
            <span>{(t('discoverRecipesWithCount', 'Discover Recipes with {count} Selected')).replace('{count}', String(selectedIds.length))}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 transition cursor-pointer hover:opacity-80"
              style={{ color: 'var(--color-emerald)' }}
              title={t('toggleSortTooltip', 'Toggle sorting direction')}
            >
              <ArrowUpDown className="h-3.5 w-3.5" /> <span>{sortAsc ? 'A-Z' : 'Z-A'}</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 transition cursor-pointer hover:underline text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span>{t('deleteSelected', 'Delete Selected')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleSelectAll}
              className="transition cursor-pointer hover:opacity-80"
              style={{ color: 'var(--color-text)' }}
            >
              {selectedIds.length === filteredItems.length && filteredItems.length > 0 
                ? t('deselectAll', 'Deselect All') 
                : t('selectAll', 'Select All')}
            </button>
          </div>
        </div>
      </div>

      {/* Pantry Items List */}
      <div 
        role="region"
        data-lpignore="true"
        className="border rounded-3xl p-5 space-y-3 shadow-xs transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {loading ? (
          <div className="p-12 text-center text-xs opacity-60">
            {t('pantryInventory', 'Loading pantry stock...')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div 
            className="p-12 text-center space-y-2 rounded-2xl border"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Package className="h-8 w-8 mx-auto opacity-40" />
            <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {t('noPantryIngredientsFound', 'No pantry ingredients found')}
            </h4>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('noPantryIngredientsSub', 'Add ingredients to your stock or adjust your search filter.')}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const daysLeft = calculateDaysLeft(item.expiryDate);
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelectOne(item.id)}
                className="flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer select-none shadow-xs"
                style={isSelected ? {
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-primary)'
                } : {
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-5 h-5 rounded-lg border flex items-center justify-center transition shadow-xs"
                    style={isSelected ? {
                      backgroundColor: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)',
                      color: '#ffffff'
                    } : {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-card)'
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border opacity-60" style={{ borderColor: 'var(--color-border)' }}>
                        {item.category}
                      </span>
                    </div>

                    {daysLeft !== null && (
                      <span 
                        className="inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border shadow-xs"
                        style={daysLeft < 0 ? {
                          backgroundColor: 'var(--color-inner-dark)',
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.4)'
                        } : daysLeft <= 3 ? {
                          backgroundColor: 'var(--color-inner-dark)',
                          color: '#f59e0b',
                          borderColor: 'rgba(245, 158, 11, 0.4)'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          color: 'var(--color-emerald)',
                          borderColor: 'var(--color-emerald)'
                        }}
                      >
                        {daysLeft < 0 
                          ? (t('expiredDaysAgo', 'Expired {days}d ago')).replace('{days}', String(Math.abs(daysLeft))) 
                          : daysLeft === 0 
                          ? t('expiresToday', 'Expires Today!') 
                          : (t('daysLeft', '{days}d left')).replace('{days}', String(daysLeft))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                  {/* Inline Quantity Stepper */}
                  <div className="flex items-center gap-1 border rounded-xl px-1 py-0.5 shadow-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                    <button
                      type="button"
                      onClick={(e) => handleAdjustQuantity(e, item.id, -1)}
                      className="w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-slate-800/30 cursor-pointer"
                      title="Decrease Quantity"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-bold font-mono text-xs" style={{ color: 'var(--color-text)' }}>
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleAdjustQuantity(e, item.id, 1)}
                      className="w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-slate-800/30 cursor-pointer"
                      title="Increase Quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="p-2 transition rounded-xl border cursor-pointer shadow-xs hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title={t('editItemTooltip', 'Edit item')}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 hover:text-red-500 transition rounded-xl border cursor-pointer shadow-xs hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                    title={t('deleteItemTooltip', 'Delete item')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD INGREDIENT MODAL (Accessible Form-Free Container) */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
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
              className="absolute top-4 right-4 p-2 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                <Plus className="h-5 w-5" /> {t('addPantryIngredientTitle', 'Add Pantry Ingredient')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('addPantryIngredientSubtitle', 'Track quantities, unit metrics, categories, and expiration dates')}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('ingredientNameLabel', 'Ingredient Name *')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('ingredientNamePlaceholder', 'e.g. Eggs, Olive Oil, Jasmine Rice...')}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition font-medium"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('quantityLabel', 'Quantity')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('unitLabel', 'Unit')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('categoryLabel', 'Category')}
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {categoriesList.map((cat: any, idx: number) => {
                  const catName = getCategoryName(cat);
                  if (!catName || catName === 'All') return null;
                  return (
                    <option key={`pantry_cat_${catName}_${idx}`} value={catName}>
                      {catName}
                    </option>
                  );
                })}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('expiryDateLabel', 'Expiry Date')}
                </label>
                <input
                  type="date"
                  autoComplete="off"
                  data-lpignore="true"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold transition cursor-pointer shadow-xs hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  disabled={!itemName.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl transition shadow-lg cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('addIngredientSubmit', 'Add to Pantry')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INGREDIENT MODAL */}
      {editingItem && (
        <div 
          onClick={() => setEditingItem(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                <Edit3 className="h-5 w-5" /> {t('editPantryIngredientTitle', 'Edit Pantry Ingredient')}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('ingredientNameLabel', 'Ingredient Name *')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdateItem();
                    }
                  }}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition font-medium"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('quantityLabel', 'Quantity')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('unitLabel', 'Unit')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('categoryLabel', 'Category')}
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {categoriesList.map((cat: any, idx: number) => {
                  const catName = getCategoryName(cat);
                  if (!catName || catName === 'All') return null;
                  return (
                    <option key={`pantry_cat_${catName}_${idx}`} value={catName}>
                      {catName}
                    </option>
                  );
                })}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('expiryDateLabel', 'Expiry Date')}
                </label>
                <input
                  type="date"
                  autoComplete="off"
                  data-lpignore="true"
                  value={editingItem.expiryDate}
                  onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border rounded-xl font-bold transition cursor-pointer shadow-xs hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateItem()}
                  className="px-5 py-2 text-white font-bold rounded-xl transition shadow-lg cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('saveChanges', 'Save Changes')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
