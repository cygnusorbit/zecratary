// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingCart, Plus, Trash2, Check, CheckSquare, Square, 
  Search, Edit3, Share2, Copy, Filter, X, RefreshCw, 
  CheckCircle2, AlertCircle, Bookmark, Utensils, ArrowRight
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useIngredientCategories, DEFAULT_CATEGORIES } from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';

interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  item?: string;
  amount: string;
  unit: string;
  category: string;
  staple: boolean;
  checked: boolean;
  recipeId?: string;
  recipeTitle?: string;
}

export default function ShoppingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterStaplesOnly, setFilterStaplesOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const remoteCategories = useIngredientCategories();
  const categoriesList = useMemo(() => {
    return Array.isArray(remoteCategories) && remoteCategories.length > 0 
      ? remoteCategories 
      : DEFAULT_CATEGORIES;
  }, [remoteCategories]);

  const safeDefaultCategory = categoriesList[0] || 'Produce';

  // Add Item Modal State (Form-Free Container)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [itemName, setItemName] = useState<string>('');
  const [itemAmount, setItemAmount] = useState<string>('1');
  const [itemUnit, setItemUnit] = useState<string>('pkg');
  const [itemCategory, setItemCategory] = useState<string>(safeDefaultCategory);
  const [itemStaple, setItemStaple] = useState<boolean>(false);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch live items from PostgreSQL /api/shopping
  const loadShoppingData = useCallback(async (user: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';
    setLoading(true);

    try {
      let fetchedItems: ShoppingItem[] = [];
      const res = await fetch(`/api/shopping?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          fetchedItems = data.items;
        }
      }

      // Offline localStorage fallback
      if (fetchedItems.length === 0 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_shopping');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) fetchedItems = parsed;
        }
      }

      setItems(fetchedItems);
    } catch (e) {
      console.warn('[ShoppingPage] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('shoppingListTitle', 'Interactive Shopping List')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadShoppingData(user);

    const handleSync = (e: any) => {
      // Ignore local optimistic mutation triggers to prevent reverting checkboxes
      if (e?.detail?.source === 'local_mutation') return;
      const active = getCurrentUser();
      if (active) {
        setCurrentUser(active);
        loadShoppingData(active);
      }
    };

    window.addEventListener('zecratary_shopping_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_shopping_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadShoppingData, router, t]);

  const saveItemsList = async (updatedList: ShoppingItem[], notifyOtherTabs = true) => {
    setItems(updatedList);
    const targetUserId = currentUser?.id || 'usr_admin_1';

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_shopping_list', JSON.stringify(updatedList));
        localStorage.setItem('zecratary_shopping', JSON.stringify(updatedList));
      } catch (_) {}
    }

    try {
      await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, items: updatedList })
      });
    } catch (_) {}

    if (notifyOtherTabs) {
      window.dispatchEvent(new CustomEvent('zecratary_shopping_updated', { detail: { source: 'local_mutation' } }));
    }
  };

  // Toggle Checkbox Item
  const handleToggleCheck = async (id: string) => {
    const target = items.find(i => i.id === id);
    if (!target) return;
    const nextVal = !target.checked;

    const updated = items.map(i => i.id === id ? { ...i, checked: nextVal } : i);
    await saveItemsList(updated, true);
  };

  // Add Item
  const handleAddItem = async () => {
    if (!itemName.trim() || !currentUser) return;

    const newItem: ShoppingItem = {
      id: 'shop_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id || 'usr_admin_1',
      name: itemName.trim(),
      amount: itemAmount.trim() || '1',
      unit: itemUnit.trim() || '',
      category: itemCategory || safeDefaultCategory,
      staple: itemStaple,
      checked: false
    };

    const updated = [newItem, ...items];
    await saveItemsList(updated);

    setItemName('');
    setItemAmount('1');
    setItemUnit('pkg');
    setItemCategory(safeDefaultCategory);
    setItemStaple(false);
    setShowAddModal(false);
    showToast(t('itemAddedToast', 'Item added to your shopping list!'));
  };

  // Update Item
  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.name.trim() || !currentUser) return;

    const updated = items.map(i => i.id === editingItem.id ? editingItem : i);
    await saveItemsList(updated);
    setEditingItem(null);
    showToast(t('itemUpdatedToast', 'Item updated successfully!'));
  };

  // Delete Single Item
  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = items.filter(i => i.id !== id);
    await saveItemsList(updated);

    try {
      await fetch(`/api/shopping?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    showToast(t('itemDeletedToast', 'Item removed from shopping list.'));
  };

  // Clear All Completed Items
  const handleClearCompleted = async () => {
    const completedItems = items.filter(i => i.checked);
    if (completedItems.length === 0) return;
    if (!confirm(t('confirmClearCompleted', 'Are you sure you want to clear all completed items?'))) return;

    const remaining = items.filter(i => !i.checked);
    await saveItemsList(remaining);

    try {
      await fetch('/api/shopping', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_completed', ids: completedItems.map(i => i.id) })
      });
    } catch (_) {}

    showToast(t('completedClearedToast', 'Completed items cleared.'));
  };

  // Toggle Complete All / Incomplete All
  const handleToggleCompleteAll = async () => {
    const allChecked = items.length > 0 && items.every(i => i.checked);
    const nextVal = !allChecked;

    const updated = items.map(i => ({ ...i, checked: nextVal }));
    await saveItemsList(updated);

    showToast(nextVal ? t('allCompletedToast', 'All items marked as completed!') : t('allIncompletedToast', 'All items marked as active.'));
  };

  // Copy Shopping List to Clipboard
  const handleCopyList = async () => {
    if (items.length === 0) return;

    const activeList = items.filter(i => !i.checked);
    let text = `🛒 ${t('shoppingListTitle', 'Interactive Shopping List')}\n\n`;

    const groups: Record<string, ShoppingItem[]> = {};
    activeList.forEach(item => {
      const cat = item.category || 'Produce';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    for (const [cat, catItems] of Object.entries(groups)) {
      text += `📁 ${cat}:\n`;
      catItems.forEach(i => {
        text += `  • [ ] ${i.name} (${i.amount} ${i.unit})\n`;
      });
      text += '\n';
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast(t('listCopiedToast', 'Shopping list copied to clipboard!'));
    } catch (_) {
      showToast('Clipboard access unavailable.', 'error');
    }
  };

  // Filtered Pipeline
  const filteredActiveItems = useMemo(() => {
    return items.filter(i => {
      if (i.checked) return false;
      if (filterStaplesOnly && !i.staple) return false;
      if (selectedCategory !== 'All' && i.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterStaplesOnly, selectedCategory, search]);

  const filteredCompletedItems = useMemo(() => {
    return items.filter(i => {
      if (!i.checked) return false;
      if (filterStaplesOnly && !i.staple) return false;
      if (selectedCategory !== 'All' && i.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterStaplesOnly, selectedCategory, search]);

  // Group Active Items by Category
  const groupedActiveItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    filteredActiveItems.forEach(item => {
      const cat = item.category || 'Produce';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredActiveItems]);

  const totalActive = items.filter(i => !i.checked).length;
  const totalCompleted = items.filter(i => i.checked).length;

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

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('shoppingListTitle', 'Interactive Shopping List')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('shoppingListSubtitle', 'Organize your grocery checklist by category and track purchased ingredients.')}
          </p>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadShoppingData(currentUser)}
            disabled={loading}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('reloadBtn', 'Reload')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
          </button>

          <button
            type="button"
            onClick={handleCopyList}
            disabled={items.length === 0}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{t('exportListBtn', 'Copy List')}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleCompleteAll}
            disabled={items.length === 0}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <CheckSquare className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
            <span>{items.length > 0 && items.every(i => i.checked) ? t('incompleteAllBtn', 'Uncheck All') : t('completeAllBtn', 'Mark All Done')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" />
            <span>{t('addItemBtn', 'Add Item')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Category Filter Strip */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-4 rounded-3xl border space-y-3.5 shadow-sm transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none opacity-60" />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              spellCheck="false"
              placeholder={t('searchItemsPlaceholder', 'Search shopping items...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition font-medium"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer shadow-xs"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="All">{t('allCategories', 'All Categories')}</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setFilterStaplesOnly(!filterStaplesOnly)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                filterStaplesOnly ? 'text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={filterStaplesOnly ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>{t('staplesOnly', 'Household Staples')}</span>
            </button>
          </div>
        </div>

        {/* Counter Pills Strip */}
        <div className="flex items-center justify-between pt-2 border-t text-xs font-bold" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-[var(--color-primary)]">
            {(t('activeItemsCount', '{count} Items to Buy')).replace('{count}', String(totalActive))}
          </span>
          <span className="text-emerald-400">
            {(t('completedItemsCount', '{count} Items Purchased')).replace('{count}', String(totalCompleted))}
          </span>
        </div>
      </div>

      {/* Main Checklist Body */}
      {items.length === 0 ? (
        <div 
          className="text-center py-16 border rounded-3xl p-8 space-y-3 shadow-xs"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <ShoppingCart className="h-10 w-10 mx-auto opacity-30" />
          <h3 className="font-extrabold text-sm">{t('noShoppingItemsFound', 'Your shopping list is clear')}</h3>
          <p className="text-xs opacity-70 max-w-sm mx-auto">
            {t('noShoppingItemsDesc', 'Add custom items or import ingredients directly from recipes and meal plans.')}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> {t('addFirstItemBtn', 'Add First Item')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Items Grouped by Category */}
          {Object.keys(groupedActiveItems).length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupedActiveItems).map(([catName, catItems]) => (
                <div 
                  key={catName}
                  className="border rounded-3xl p-5 space-y-3 shadow-xs transition-colors duration-200"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-[var(--color-primary)]">
                      {catName} ({catItems.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {catItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheck(item.id)}
                        className="p-3 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer select-none hover:border-[var(--color-primary)] shadow-xs"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleCheck(item.id); }}
                            className="w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0"
                            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                          >
                            {item.checked && <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />}
                          </button>

                          <div className="space-y-0.5 min-w-0">
                            <span className="font-bold text-xs block truncate" style={{ color: 'var(--color-text)' }}>
                              {item.name}
                            </span>
                            {item.recipeTitle && (
                              <span className="text-[10px] opacity-60 block truncate">
                                {t('recipeTag', 'From recipe:')} {item.recipeTitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                            {item.amount} {item.unit}
                          </span>

                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg border transition hover:opacity-80"
                            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                            title={t('editItemTooltip', 'Edit item')}
                          >
                            <Edit3 className="h-3.5 w-3.5 opacity-70" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="p-1.5 rounded-lg border text-red-400 hover:bg-red-500/10 transition"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            title={t('deleteItemTooltip', 'Delete item')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Items Section */}
          {filteredCompletedItems.length > 0 && (
            <div 
              className="border rounded-3xl p-5 space-y-3 shadow-xs transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">
                  {t('completedItemsHeading', 'Completed Items')} ({filteredCompletedItems.length})
                </h3>
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-xs font-bold text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t('clearCompletedBtn', 'Clear Completed')}</span>
                </button>
              </div>

              <div className="space-y-2 opacity-60">
                {filteredCompletedItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className="p-3 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer select-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-5 h-5 rounded-lg border flex items-center justify-center bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shrink-0">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-bold text-xs line-through truncate">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs line-through opacity-75">
                        {item.amount} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, item.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300"
                        title={t('deleteItemTooltip', 'Delete item')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD ITEM (Autofill Safe Container) */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('addItemModalTitle', 'Add Shopping Item')}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('itemNameLabel', 'Item Name *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('itemNamePlaceholder', 'e.g. Eggs, Fresh Milk, Lettuce...')}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('amountLabel', 'Amount')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('unitLabel', 'Unit')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('categoryLabel', 'Category')}</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="stapleCheckbox"
                  checked={itemStaple}
                  onChange={(e) => setItemStaple(e.target.checked)}
                  className="rounded cursor-pointer"
                />
                <label htmlFor="stapleCheckbox" className="font-semibold text-xs cursor-pointer opacity-80">
                  {t('markAsStapleLabel', 'Household Staple (Regularly Purchased)')}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!itemName.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('saveItemBtn', 'Save Item')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ITEM */}
      {editingItem && (
        <div 
          onClick={() => setEditingItem(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('editItemModalTitle', 'Edit Shopping Item')}
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('itemNameLabel', 'Item Name *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('amountLabel', 'Amount')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={editingItem.amount}
                    onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('unitLabel', 'Unit')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('categoryLabel', 'Category')}</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editStapleCheckbox"
                  checked={editingItem.staple}
                  onChange={(e) => setEditingItem({ ...editingItem, staple: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <label htmlFor="editStapleCheckbox" className="font-semibold text-xs cursor-pointer opacity-80">
                  {t('markAsStapleLabel', 'Household Staple (Regularly Purchased)')}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUpdateItem}
                  disabled={!editingItem.name.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('saveItemBtn', 'Save Item')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
