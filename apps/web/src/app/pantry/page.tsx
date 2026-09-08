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
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  
  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0] || 'Produce');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [expiryDate, setExpiryDate] = useState('');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);

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
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
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
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      
      {/* Dynamic Date Picker Accent Style */}
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
        <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
          {currentUser ? `${currentUser.name}${t('userStockSuffix') || "'s private stock:"} ` : ''}
          {t('pantrySubtitle') || 'Manage available ingredients, track expiry dates, and discover matching recipes.'}
        </p>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative flex-1 w-full">
          <Search 
            className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" 
            style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
          />
          <input
            type="text"
            placeholder={t('searchPantryPlaceholder') || 'Search your pantry ingredients...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => alert(t('photoScanActivated') || 'Camera photo scan activated!')}
            className="flex-1 sm:flex-initial border font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)'
            }}
          >
            <Camera className="h-4 w-4" /> {t('takePhoto') || 'Take Photo'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <Plus className="h-4 w-4" /> {t('addIngredientBtn') || 'Add Ingredient(s)'}
          </button>
        </div>
      </div>

      {/* ACTION BANNER */}
      <div 
        className="border rounded-3xl p-5 space-y-4 shadow-sm border transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
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
              backgroundColor: 'var(--color-primary, #E05638)',
              color: '#ffffff'
            } : {
              backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
              color: isDayMode ? '#64748b' : '#94a3b8'
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
              style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
              title={t('toggleSortTooltip') || 'Toggle sorting direction'}
            >
              <ArrowUpDown className="h-3.5 w-3.5" /> {sortAsc ? 'A-Z' : 'Z-A'}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 transition cursor-pointer hover:underline"
              style={{ color: isDayMode ? '#dc2626' : '#f87171' }}
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('deleteSelected') || 'Delete Selected'}
            </button>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="transition cursor-pointer"
              style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
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
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <Package className="h-8 w-8 mx-auto" style={{ color: isDayMode ? '#94a3b8' : '#475569' }} />
              <h4 className="text-sm font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('noPantryIngredientsFound') || 'No pantry ingredients found'}</h4>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('noPantryIngredientsSub') || 'Add ingredients to your stock or adjust your search filter.'}</p>
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
                    backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.1)',
                    borderColor: 'var(--color-primary, #E05638)'
                  } : {
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="w-5 h-5 rounded-lg border flex items-center justify-center transition shadow-xs"
                      style={isSelected ? {
                        backgroundColor: 'var(--color-primary, #E05638)',
                        borderColor: 'var(--color-primary, #E05638)',
                        color: '#ffffff'
                      } : {
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)'
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm capitalize" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {item.name}
                      </span>
                      {daysLeft !== null && (
                        <span 
                          className="px-2.5 py-0.5 rounded-full font-bold text-[10px] border shadow-xs"
                          style={daysLeft < 0 ? {
                            backgroundColor: isDayMode ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)',
                            color: isDayMode ? '#b91c1c' : '#f87171',
                            borderColor: isDayMode ? '#fca5a5' : 'rgba(239, 68, 68, 0.3)'
                          } : daysLeft <= 3 ? {
                            backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                            color: isDayMode ? '#b45309' : '#fbbf24',
                            borderColor: isDayMode ? '#fde68a' : 'rgba(245, 158, 11, 0.3)'
                          } : {
                            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                            color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
                            borderColor: isDayMode ? '#a7f3d0' : 'rgba(16, 185, 129, 0.3)'
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
                    <span className="text-xs font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="p-2 transition rounded-xl border cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#64748b' : '#94a3b8'
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
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#64748b' : '#94a3b8'
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
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <Plus className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('addPantryIngredientTitle') || 'Add Pantry Ingredient(s)'}
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
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
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('quantityLabel') || 'Quantity'}
                  </label>
                  <input
                    type="text"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('unitLabel') || 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('categoryLabel') || 'Category'}
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                >
                  {CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat} style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date with Bright Calendar Icon */}
              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('expiryDateLabel') || 'Expiry Date'}
                </label>
                <div className="relative flex items-center">
                  <Calendar 
                    className="h-4 w-4 absolute left-3.5 pointer-events-none" 
                    style={{ color: 'var(--color-primary, #E05638)' }} 
                  />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3 py-3 text-sm outline-none cursor-pointer pantry-date-input transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff',
                      colorScheme: isDayMode ? 'light' : 'dark'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                    color: isDayMode ? '#475569' : '#cbd5e1'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
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
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('editPantryIngredientTitle') || 'Edit Pantry Ingredient'}
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('ingredientNameLabel') || 'Ingredient Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('quantityLabel') || 'Quantity'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('unitLabel') || 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('categoryLabel') || 'Category'}
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full border rounded-xl p-3 text-sm outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                >
                  {CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat} style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date with Bright Calendar Icon */}
              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('expiryDateLabel') || 'Expiry Date'}
                </label>
                <div className="relative flex items-center">
                  <Calendar 
                    className="h-4 w-4 absolute left-3.5 pointer-events-none" 
                    style={{ color: 'var(--color-primary, #E05638)' }} 
                  />
                  <input
                    type="date"
                    value={editingItem.expiryDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                    className="w-full border rounded-xl pl-10 pr-3 py-3 text-sm outline-none cursor-pointer pantry-date-input transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff',
                      colorScheme: isDayMode ? 'light' : 'dark'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                    color: isDayMode ? '#475569' : '#cbd5e1'
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
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
