// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, Plus, Trash2, Camera, Search, ArrowUpDown, 
  Check, Edit3, X, Save, ChefHat, Calendar 
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { CATEGORIES } from '@/constants/categories';
import { useTranslation } from '@/components/LanguageProvider';

export default function PantryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  
  const safeDefaultCategory = (Array.isArray(CATEGORIES) && CATEGORIES.length > 0) ? CATEGORIES[0] : 'Produce';

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(safeDefaultCategory);
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [expiryDate, setExpiryDate] = useState('');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const applyGlobalTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (e) {}
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

  const loadPantryData = useCallback((user: User | null) => {
    if (!user || typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
      let allItems: any[] = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(allItems) || allItems.length === 0) {
        allItems = [
          { 
            id: 'p_1_' + user.id, 
            userId: user.id, 
            createdBy: user.email, 
            name: 'Eggs', 
            quantity: '6', 
            unit: 'units', 
            category: 'Dairy', 
            expiryDate: '2026-09-02' 
          },
          { 
            id: 'p_2_' + user.id, 
            userId: user.id, 
            createdBy: user.email, 
            name: 'Jasmine Rice', 
            quantity: '2', 
            unit: 'kg', 
            category: 'Grains and Pasta', 
            expiryDate: '2026-12-31' 
          },
          { 
            id: 'p_3_' + user.id, 
            userId: user.id, 
            createdBy: user.email, 
            name: 'Olive Oil', 
            quantity: '1', 
            unit: 'bottle', 
            category: 'Condiments and Sauces', 
            expiryDate: '2027-06-15' 
          }
        ];
        localStorage.setItem('zecratary_pantry_items', JSON.stringify(allItems));
        localStorage.setItem('zecratary_pantry', JSON.stringify(allItems));
      }

      const creatorItems = allItems.filter((item: any) => {
        return !item.userId || item.userId === user.id || item.createdBy === user.email;
      });

      setPantryItems(creatorItems);
    } catch (e) {
      console.error('Failed to load pantry data', e);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('pantryInventory') || 'Pantry Inventory'} - FoodiePrep`;
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

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadPantryData, router, t]);

  const savePantryList = (updatedCreatorItems: any[]) => {
    if (!currentUser) return;

    try {
      const raw = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
      const allItems: any[] = raw ? JSON.parse(raw) : [];

      const otherUsersItems = allItems.filter((item: any) => {
        return item.userId && item.userId !== currentUser.id && item.createdBy !== currentUser.email;
      });

      const merged = [...updatedCreatorItems, ...otherUsersItems];
      localStorage.setItem('zecratary_pantry_items', JSON.stringify(merged));
      localStorage.setItem('zecratary_pantry', JSON.stringify(merged));

      setPantryItems(updatedCreatorItems);

      window.dispatchEvent(new Event('zecratary_pantry_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save pantry items', e);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !currentUser) return;

    const newItem = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id,
      createdBy: currentUser.email,
      name: itemName.trim(),
      quantity: itemQuantity || '1',
      unit: itemUnit || 'Unit',
      category: itemCategory,
      expiryDate: expiryDate || ''
    };

    const updated = [newItem, ...pantryItems];
    savePantryList(updated);
    setItemName('');
    setItemQuantity('1');
    setExpiryDate('');
    setShowAddModal(false);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim() || !currentUser) return;

    const updated = pantryItems.map(item => 
      item.id === editingItem.id 
        ? { 
            ...editingItem, 
            userId: currentUser.id, 
            createdBy: currentUser.email 
          } 
        : item
    );

    savePantryList(updated);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    const updated = pantryItems.filter(item => item.id !== id);
    savePantryList(updated);
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const confirmTemplate = t('confirmDeleteSelectedIngredients') || 'Are you sure you want to delete {count} selected ingredient(s)?';
    if (!confirm(confirmTemplate.replace('{count}', String(selectedIds.length)))) return;
    const updated = pantryItems.filter(item => !selectedIds.includes(item.id));
    savePantryList(updated);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const calculateDaysLeft = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredItems = pantryItems
    .filter(item => !search.trim() || item.name.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      return sortAsc ? res : -res;
    });

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: brightness(0) saturate(100%) invert(48%) sepia(85%) saturate(1638%) hue-rotate(340deg) brightness(95%) contrast(92%);
          cursor: pointer;
          opacity: 0.95;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          transform: scale(1.15);
          opacity: 1;
        }
      `}} />

      {/* PAGE HEADER & DESCRIPTION */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
          {t('pantryInventory') || 'Pantry Inventory'}
        </h1>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {currentUser ? `${currentUser.name}${t('userStockSuffix') || "'s private stock:"} ` : ''}
          {t('pantrySubtitle') || 'Manage available ingredients, track expiry dates, and discover matching recipes.'}
        </p>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative flex-1 w-full">
          <Search 
            className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" 
            style={{ color: 'var(--color-emerald)' }}
          />
          <input
            type="text"
            placeholder={t('searchPantryPlaceholder') || 'Search your pantry ingredients...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => alert(t('photoScanActivated') || 'Camera photo scan activated!')}
            className="flex-1 sm:flex-initial border font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-emerald)'
            }}
          >
            <Camera className="h-4 w-4" /> {t('takePhoto') || 'Take Photo'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <Plus className="h-4 w-4" /> {t('addIngredientBtn') || 'Add Ingredient(s)'}
          </button>
        </div>
      </div>

      {/* ACTION BANNER */}
      <div 
        className="border rounded-3xl p-5 space-y-4 shadow-sm border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              const msg = t('discoveringRecipesAlert') || 'Discovering recipes with {count} selected ingredients!';
              alert(msg.replace('{count}', String(selectedIds.length)));
            }}
            className="font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-sm cursor-pointer"
            style={selectedIds.length > 0 ? {
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff'
            } : {
              backgroundColor: 'var(--color-inner-dark)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <ChefHat className="h-4 w-4" /> 
            {(t('discoverRecipesWithCount') || 'Discover Recipes with {count} Selected').replace('{count}', String(selectedIds.length))}
          </button>

          <div className="flex items-center gap-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 transition cursor-pointer"
              style={{ color: 'var(--color-emerald)' }}
              title={t('toggleSortTooltip') || 'Toggle sorting direction'}
            >
              <ArrowUpDown className="h-3.5 w-3.5" /> {sortAsc ? 'A-Z' : 'Z-A'}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 transition cursor-pointer hover:underline text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('deleteSelected') || 'Delete Selected'}
            </button>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="transition cursor-pointer"
              style={{ color: 'var(--color-text)' }}
            >
              {selectedIds.length === filteredItems.length && filteredItems.length > 0 
                ? (t('deselectAll') || 'Deselect All') 
                : (t('selectAll') || 'Select All')}
            </button>
          </div>
        </div>

        {/* INGREDIENTS LIST */}
        <div className="space-y-3 pt-2">
          {filteredItems.length === 0 ? (
            <div 
              className="p-12 text-center space-y-2 rounded-2xl border"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              <Package className="h-8 w-8 mx-auto" style={{ color: 'var(--color-text-secondary)' }} />
              <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{t('noPantryIngredientsFound') || 'No pantry ingredients found'}</h4>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('noPantryIngredientsSub') || 'Add ingredients to your stock or adjust your search filter.'}</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const daysLeft = calculateDaysLeft(item.expiryDate);
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectOne(item.id)}
                  className="flex items-center justify-between p-4 rounded-2xl border transition cursor-pointer select-none shadow-xs"
                  style={isSelected ? {
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)'
                  } : {
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center gap-3.5">
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

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                        {item.name}
                      </span>
                      {daysLeft !== null && (
                        <span 
                          className="px-2.5 py-0.5 rounded-full font-bold text-[10px] border shadow-xs"
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
                            ? (t('expiredDaysAgo') || 'Expired {days}d ago').replace('{days}', String(Math.abs(daysLeft))) 
                            : daysLeft === 0 
                            ? (t('expiresToday') || 'Expires Today!') 
                            : (t('daysLeft') || '{days}d left').replace('{days}', String(daysLeft))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="p-2 transition rounded-xl border cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                      title={t('editItemTooltip') || 'Edit item'}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 hover:text-red-500 transition rounded-xl border cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                      title={t('deleteItemTooltip') || 'Delete item'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADD INGREDIENT MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Plus className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('addPantryIngredientTitle') || 'Add Pantry Ingredient(s)'}
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('ingredientNameLabel') || 'Ingredient Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('ingredientNamePlaceholder') || 'e.g. Eggs, Olive Oil...'}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('quantityLabel') || 'Quantity'}
                  </label>
                  <input
                    type="text"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
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
                    {t('unitLabel') || 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
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
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('categoryLabel') || 'Category'}
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {(Array.isArray(CATEGORIES) ? CATEGORIES : ['Produce', 'Dairy', 'Other']).map((cat: string) => (
                    <option key={cat} value={cat} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date with Bright Calendar Icon */}
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('expiryDateLabel') || 'Expiry Date'}
                </label>
                <div className="relative flex items-center">
                  <Calendar 
                    className="h-4 w-4 absolute left-3.5 pointer-events-none" 
                    style={{ color: 'var(--color-primary)' }} 
                  />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3 py-3 text-sm outline-none cursor-pointer pantry-date-input transition"
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

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {t('addIngredientSubmit') || 'Add Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INGREDIENT MODAL */}
      {editingItem && (
        <div 
          onClick={() => setEditingItem(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('editPantryIngredientTitle') || 'Edit Pantry Ingredient'}
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('ingredientNameLabel') || 'Ingredient Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('quantityLabel') || 'Quantity'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
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
                    {t('unitLabel') || 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
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
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('categoryLabel') || 'Category'}
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full border rounded-xl p-3 text-sm outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {(Array.isArray(CATEGORIES) ? CATEGORIES : ['Produce', 'Dairy', 'Other']).map((cat: string) => (
                    <option key={cat} value={cat} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date with Bright Calendar Icon */}
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('expiryDateLabel') || 'Expiry Date'}
                </label>
                <div className="relative flex items-center">
                  <Calendar 
                    className="h-4 w-4 absolute left-3.5 pointer-events-none" 
                    style={{ color: 'var(--color-primary)' }} 
                  />
                  <input
                    type="date"
                    value={editingItem.expiryDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                    className="w-full border rounded-xl pl-10 pr-3 py-3 text-sm outline-none cursor-pointer pantry-date-input transition"
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

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  <Save className="h-4 w-4" /> {t('saveChanges') || 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
