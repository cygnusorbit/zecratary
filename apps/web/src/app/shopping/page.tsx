'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Check, Star, Copy, Edit3, X, Save, Search 
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { CATEGORIES } from '@/constants/categories';
import { useTranslation } from '@/components/LanguageProvider';

export default function ShoppingListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showStaplesOnly, setShowStaplesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Form states matching ingredient fields
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [itemCategory, setItemCategory] = useState<string>(CATEGORIES[0] || 'Produce');

  // Dynamic Theme Synchronization & Day Mode Inversion
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

  // Load shopping list without purging checked items on load
  const loadShoppingData = useCallback((user: User | null) => {
    if (!user || typeof window === 'undefined') return;

    try {
      const local = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_shopping');
      let allItems: any[] = local ? JSON.parse(local) : [];

      if (!Array.isArray(allItems) || allItems.length === 0) {
        allItems = [
          { 
            id: 's_1_' + user.id, 
            userId: user.id, 
            createdBy: user.email, 
            creatorName: user.name,
            name: 'lime', 
            amount: '1', 
            unit: '', 
            category: 'Produce', 
            staple: false, 
            checked: false,
            createdAt: new Date().toISOString()
          },
          { 
            id: 's_2_' + user.id, 
            userId: user.id, 
            createdBy: user.email, 
            creatorName: user.name,
            name: 'roasted peanuts', 
            amount: '¼', 
            unit: 'cup', 
            category: 'Snacks and Sweets', 
            staple: false, 
            checked: false,
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('zecratary_shopping_list', JSON.stringify(allItems));
        localStorage.setItem('zecratary_shopping', JSON.stringify(allItems));
      }

      const userItems = allItems.filter((i: any) => {
        return !i.userId || i.userId === user.id || i.createdBy === user.email;
      });

      setItems(userItems);
    } catch (e) {
      console.error('Failed to load shopping list', e);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('shoppingList') || 'Shopping List'} - FoodiePrep`;
    initAuthStorage();
    const user = getCurrentUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    setCurrentUser(user);
    loadShoppingData(user);

    const handleSync = () => {
      const active = getCurrentUser();
      if (active) {
        setCurrentUser(active);
        loadShoppingData(active);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_shopping_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_shopping_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [loadShoppingData, router, t]);

  const saveList = (updatedUserItems: any[]) => {
    if (!currentUser) return;

    try {
      const local = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_shopping');
      const allItems: any[] = local ? JSON.parse(local) : [];

      const otherUsersItems = allItems.filter((i: any) => {
        return i.userId && i.userId !== currentUser.id && i.createdBy !== currentUser.email;
      });

      const merged = [...updatedUserItems, ...otherUsersItems];
      localStorage.setItem('zecratary_shopping_list', JSON.stringify(merged));
      localStorage.setItem('zecratary_shopping', JSON.stringify(merged));

      setItems(updatedUserItems);

      window.dispatchEvent(new Event('zecratary_shopping_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save shopping list', e);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !currentUser) return;

    const newItem = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id,
      createdBy: currentUser.email,
      creatorName: currentUser.name,
      name: itemName.trim(),
      amount: itemAmount || '1',
      unit: itemUnit || '',
      category: itemCategory || 'Produce',
      staple: false,
      checked: false,
      createdAt: new Date().toISOString()
    };

    saveList([...items, newItem]);
    setItemName('');
    setItemAmount('1');
    setItemUnit('Unit');
    setItemCategory(CATEGORIES[0] || 'Produce');
    setShowAddModal(false);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim() || !currentUser) return;

    const updated = items.map((i) =>
      i.id === editingItem.id
        ? {
            ...editingItem,
            userId: currentUser.id,
            createdBy: currentUser.email,
            creatorName: currentUser.name,
          }
        : i
    );

    saveList(updated);
    setEditingItem(null);
  };

  const toggleCheck = (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i));
    saveList(updated);
  };

  const toggleStaple = (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, staple: !i.staple } : i));
    saveList(updated);
  };

  const handleCopySingleItem = (item: any) => {
    const text = item.name.trim();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    const template = t('copiedToClipboard') || 'Copied "{name}" to clipboard!';
    alert(template.replace('{name}', item.name));
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    saveList(updated);
  };

  const allCompleted = items.length > 0 && items.every((i) => i.checked);

  const toggleAllComplete = () => {
    if (items.length === 0) return;
    const targetState = !allCompleted;
    const updated = items.map((i) => ({ ...i, checked: targetState }));
    saveList(updated);
  };

  const handleRemoveCompleted = () => {
    const activeOnly = items.filter((i) => !i.checked);
    saveList(activeOnly);
  };

  const handleCopyList = () => {
    const activeList = items.filter((i) => !i.checked);
    if (activeList.length === 0) {
      alert(t('noActiveItemsToCopy') || 'No active items to copy!');
      return;
    }

    const categoriesList = Array.from(new Set(activeList.map((i) => i.category || 'Produce'))).sort();
    
    let textLines: string[] = [];
    categoriesList.forEach((cat) => {
      textLines.push(`[${cat}]`);
      const catItems = activeList.filter((i) => (i.category || 'Produce') === cat);
      catItems.forEach((item) => {
        textLines.push(`- ${item.name}`);
      });
      textLines.push('');
    });

    const finalText = textLines.join('\n').trim();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(finalText).then(() => {
        const msg = t('copiedListToClipboard') || 'Successfully copied {count} items to clipboard, sorted by category!';
        alert(msg.replace('{count}', String(activeList.length)));
      }).catch(() => {
        fallbackCopyText(finalText, activeList.length);
      });
    } else {
      fallbackCopyText(finalText, activeList.length);
    }
  };

  const fallbackCopyText = (text: string, count: number) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      const msg = t('copiedListToClipboard') || 'Successfully copied {count} items to clipboard, sorted by category!';
      alert(msg.replace('{count}', String(count)));
    } catch (err) {
      alert(t('failedToCopy') || 'Failed to copy to clipboard.');
    }
  };

  const completedCount = items.filter((i) => i.checked).length;

  const filteredItems = items.filter((i) => {
    const matchesSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesStaples = !showStaplesOnly || i.staple;
    return matchesSearch && matchesStaples;
  });

  const activeItems = filteredItems.filter((i) => !i.checked);
  const completedItems = filteredItems.filter((i) => i.checked);
  const categories = Array.from(new Set(activeItems.map((i) => i.category || 'Produce')));

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('shoppingList') || 'Shopping List'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {(t('shoppingItemsCompleted') || '{completed} of {total} items completed')
              .replace('{completed}', String(completedCount))
              .replace('{total}', String(items.length))}
          </p>
        </div>

        {/* TOP RIGHT BUTTON GROUP */}
        <div className="flex items-center gap-2.5">
          {/* COMPLETE ALL / INCOMPLETE ALL BUTTON */}
          <button
            type="button"
            onClick={toggleAllComplete}
            disabled={items.length === 0}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isDayMode ? '#ecfdf5' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#a7f3d0' : 'var(--color-border, #064e3b)',
              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
            }}
            title={allCompleted ? (t('deselectAllItemsTooltip') || 'Deselect all items') : (t('selectAllItemsTooltip') || 'Select all items')}
          >
            <Check className="h-4 w-4" style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }} />
            <span>{allCompleted ? (t('incompleteAll') || 'Incomplete All') : (t('completeAll') || 'Complete All')}</span>
          </button>

          {/* REMOVE COMPLETED BUTTON */}
          <button
            type="button"
            onClick={handleRemoveCompleted}
            disabled={completedItems.length === 0}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isDayMode ? '#fef2f2' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#fecaca' : 'var(--color-border, #064e3b)',
              color: isDayMode ? '#b91c1c' : '#f87171'
            }}
            title={t('removeCompletedTooltip') || 'Remove completed items'}
          >
            <Trash2 className="h-4 w-4" style={{ color: isDayMode ? '#b91c1c' : '#f87171' }} />
            <span>{t('removeCompleted') || 'Remove Completed'}</span>
          </button>
        </div>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search 
            className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" 
            style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
          />
          <input
            type="text"
            placeholder={t('searchItemsPlaceholder') || 'Search items...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none shadow-xs transition"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyList}
            className="flex-1 sm:flex-initial border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <Copy className="h-4 w-4" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} /> {t('copyList') || 'Copy List'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowStaplesOnly(!showStaplesOnly)}
            className="flex-1 sm:flex-initial border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{
              backgroundColor: showStaplesOnly 
                ? (isDayMode ? '#fff7ed' : 'rgba(234, 88, 12, 0.15)') 
                : (isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)'),
              borderColor: showStaplesOnly
                ? (isDayMode ? '#fdba74' : 'var(--color-border, #064e3b)')
                : (isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)'),
              color: showStaplesOnly && isDayMode ? '#c2410c' : (isDayMode ? '#0f172a' : '#ffffff')
            }}
          >
            <Star className="h-4 w-4 fill-[#E05638] text-[#E05638]" /> 
            {t('myStaples') || 'My Staples'}
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <Plus className="h-4 w-4" /> {t('addItemBtn') || 'Add Item(s)'}
          </button>
        </div>
      </div>

      {/* ACTIVE CATEGORY CARDS */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catItems = activeItems.filter((i) => (i.category || 'Produce') === cat);
          if (catItems.length === 0) return null;

          return (
            <div 
              key={cat} 
              className="border rounded-2xl p-5 space-y-3 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #064e3b)'
              }}
            >
              <h2 
                className="text-base font-bold tracking-wide"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {cat}
              </h2>

              <div className="space-y-3">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center justify-between py-1 transition cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-4 h-4 rounded mt-0.5 border flex items-center justify-center transition shrink-0"
                        style={{
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-primary, #E05638)',
                          backgroundColor: isDayMode ? '#f8fafc' : 'transparent'
                        }}
                      />

                      <div>
                        <h4 className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                          {item.name}
                        </h4>
                        {(item.amount || item.unit) && (
                          <span className="text-xs font-medium block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                            {item.amount} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleStaple(item.id)}
                        className="transition hover:opacity-80 cursor-pointer"
                        style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
                        title={t('markAsStapleTooltip') || 'Mark as Staple'}
                      >
                        <Star className={`h-4 w-4 ${item.staple ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopySingleItem(item)}
                        className="transition hover:opacity-80 cursor-pointer"
                        style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
                        title={t('copyItemTooltip') || 'Copy item'}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="transition hover:opacity-80 cursor-pointer"
                        style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
                        title={t('editItemTooltip') || 'Edit item'}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPLETED ITEMS SECTION */}
      {completedItems.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <h2 
              className="text-base font-extrabold whitespace-nowrap"
              style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
            >
              {t('completedItemsHeading') || 'Completed Items'}
            </h2>
            <div 
              className="h-px flex-1"
              style={{ backgroundColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #064e3b)' }}
            />
          </div>

          <div 
            className="border rounded-2xl p-5 space-y-3 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #064e3b)'
            }}
          >
            {completedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className="flex items-center justify-between py-1 transition cursor-pointer select-none"
              >
                <div className="flex items-start gap-3 flex-1 pr-4">
                  <div 
                    className="w-4 h-4 rounded mt-0.5 flex items-center justify-center text-white transition shrink-0"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>

                  <span 
                    className="text-sm font-semibold line-through leading-snug"
                    style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}
                  >
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleStaple(item.id)}
                    className="transition hover:opacity-80 cursor-pointer"
                    style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
                    title={t('markAsStapleTooltip') || 'Mark as Staple'}
                  >
                    <Star className={`h-4 w-4 ${item.staple ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="transition hover:opacity-80 cursor-pointer"
                    style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
                    title={t('editItemTooltip') || 'Edit item'}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-xs cursor-default animate-in fade-in transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <Plus className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('addShoppingItemTitle') || 'Add Shopping Item'}
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('itemNameLabel') || 'Item Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('itemNamePlaceholder') || 'e.g. lime, roasted peanuts...'}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('amountQtyLabel') || 'Amount / Qty'}
                  </label>
                  <input
                    type="text"
                    placeholder={t('amountQtyPlaceholder') || 'e.g. 1 or ¼'}
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('unitLabel') || 'Unit'}
                  </label>
                  <input
                    type="text"
                    placeholder={t('unitPlaceholder') || 'e.g. cup, tbsp, oz'}
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
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
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
                >
                  {CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat} style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #064e3b)' }}>
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
                  {t('addItemSubmit') || 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div 
          onClick={() => setEditingItem(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-xs cursor-default animate-in fade-in transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0a101d)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('editShoppingItemTitle') || 'Edit Shopping Item'}
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                  {t('itemNameLabel') || 'Item Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full border rounded-xl p-3 text-sm outline-none transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('amountLabel') || 'Amount'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.amount}
                    placeholder={t('amountQtyPlaceholder') || 'e.g. 1 or ¼'}
                    onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: isDayMode ? '#334155' : '#94a3b8' }}>
                    {t('unitLabel') || 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    placeholder={t('unitPlaceholder') || 'e.g. cup, tbsp, oz'}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
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
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #064e3b)')}
                >
                  {CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat} style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #064e3b)' }}>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.id)}
                  className="px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#fef2f2' : 'transparent',
                    color: isDayMode ? '#b91c1c' : '#f87171'
                  }}
                >
                  <Trash2 className="h-4 w-4" /> {t('deleteBtn') || 'Delete'}
                </button>
                <div className="flex gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
