'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Utensils, Plus, Edit3, Trash2, Check, X, RotateCcw, 
  CheckCircle, ArrowLeft, MoreVertical, GripVertical, 
  ArrowUpDown, ArrowUp, ArrowDown, RefreshCw
} from 'lucide-react';
import { 
  getStoredRecipeTypes, 
  saveRecipeTypes, 
  setMemoryRecipeTypes, 
  DEFAULT_RECIPE_TYPES 
} from '@/lib/recipe-types';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

export default function RecipeTypeAdminPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);
  const version = langContext?.version;

  const [recipeTypes, setRecipeTypes] = useState<string[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Reposition / Reorder States
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync with global system dynamic CSS theme variables & Day Mode
  const applyGlobalTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light' || mode === 'day';
      setIsDayMode(isDay);

      const stored = typeof window !== 'undefined' 
        ? (localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config'))
        : null;
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
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applyGlobalTheme]);

  // Hydrate Recipe Types Exclusively from Server Storage
  const loadTypesFromServer = useCallback(async () => {
    setIsLoading(true);
    purgeLegacyBrowserAdminStorage();
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData && Array.isArray(serverData.recipeTypes) && serverData.recipeTypes.length > 0) {
        setRecipeTypes(serverData.recipeTypes);
        setMemoryRecipeTypes(serverData.recipeTypes);
      } else {
        const fallback = getStoredRecipeTypes();
        const activeList = fallback && fallback.length > 0 ? fallback : DEFAULT_RECIPE_TYPES;
        setRecipeTypes(activeList);
        setMemoryRecipeTypes(activeList);
      }
    } catch (err) {
      console.error('[RecipeTypeAdminPage] Error loading server recipe types:', err);
      const fallback = getStoredRecipeTypes();
      setRecipeTypes(fallback.length > 0 ? fallback : DEFAULT_RECIPE_TYPES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('recipeTypeTitle', 'Recipe Types')} - ${t('adminConsole', 'Admin Console')}`;
    loadTypesFromServer();

    const handleSync = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setRecipeTypes(e.detail);
      } else {
        loadTypesFromServer();
      }
    };

    window.addEventListener('zecratary_recipe_types_changed', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_recipe_types_changed', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, [t, version, loadTypesFromServer]);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Centralized Server-Backed Commit (Zero LocalStorage)
  const commitRecipeTypes = async (updated: string[]) => {
    setRecipeTypes(updated);
    setMemoryRecipeTypes(updated);
    await saveRecipeTypes(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const list = [...recipeTypes];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    setRecipeTypes(list);
    setDraggedIndex(index);
  };

  const handleDrop = () => {
    setDraggedIndex(null);
    commitRecipeTypes(recipeTypes);
  };

  const moveType = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= recipeTypes.length) return;

    const list = [...recipeTypes];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    commitRecipeTypes(list);
  };

  const toggleRepositionMode = () => {
    if (isReordering) {
      commitRecipeTypes(recipeTypes);
      notify(t('recipeTypeOrderSaved', 'Recipe type order saved successfully!'));
      setIsReordering(false);
    } else {
      setEditingIndex(null);
      setIsReordering(true);
    }
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTypeName.trim();
    if (!clean) return;

    if (recipeTypes.some((tKey) => tKey.toLowerCase() === clean.toLowerCase())) {
      alert(t('recipeTypeExists', 'This recipe type already exists.'));
      return;
    }

    const updated = [...recipeTypes, clean];
    commitRecipeTypes(updated);
    setNewTypeName('');
    notify(`${t('recipeTypeAdded', 'Added recipe type')} "${clean}"`);
  };

  const handleSaveEdit = (index: number) => {
    const clean = editingValue.trim();
    if (!clean) return;

    const duplicate = recipeTypes.some(
      (tKey, i) => i !== index && tKey.toLowerCase() === clean.toLowerCase()
    );
    if (duplicate) {
      alert(t('recipeTypeExists', 'This recipe type already exists.'));
      return;
    }

    const updated = [...recipeTypes];
    updated[index] = clean;
    commitRecipeTypes(updated);
    setEditingIndex(null);
    setEditingValue('');
    notify(`${t('recipeTypeUpdated', 'Updated recipe type')} "${clean}"`);
  };

  const handleDeleteType = (index: number, name: string) => {
    const confirmMsg = t('confirmDeleteRecipeType', 'Are you sure you want to delete recipe type');
    if (!confirm(`${confirmMsg} "${name}"?`)) return;
    const updated = recipeTypes.filter((_, i) => i !== index);
    commitRecipeTypes(updated);
    notify(`${t('recipeTypeRemoved', 'Removed recipe type')} "${name}"`);
  };

  const handleResetDefaults = () => {
    if (!confirm(t('resetRecipeTypesConfirm', 'Are you sure you want to reset recipe types to default?'))) return;
    commitRecipeTypes(DEFAULT_RECIPE_TYPES);
    setIsReordering(false);
    notify(t('resetRecipeTypesSuccess', 'Recipe types reset to default successfully!'));
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* HEADER */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 transition-colors duration-200"
        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('recipeTypeTitle', 'Recipe Types')}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('recipeTypeSubtitle', 'Manage custom recipe categories and types')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadTypesFromServer}
            disabled={isLoading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#334155' : '#cbd5e1'
            }}
            title="Reload from server store"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary, #E05638)' }} />
            <span>{t('refreshBtn', 'Reload')}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#334155' : '#cbd5e1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
              e.currentTarget.style.color = '#fbbf24';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)';
              e.currentTarget.style.color = isDayMode ? '#334155' : '#cbd5e1';
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
            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
            borderColor: 'var(--color-emerald, #10b981)',
            color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
          <span>{feedback}</span>
        </div>
      )}

      {/* REPOSITION INSTRUCTION BANNER */}
      {isReordering && (
        <div 
          className="p-4 rounded-2xl text-xs flex items-center justify-between shadow-inner border"
          style={{
            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)',
            borderColor: 'var(--color-emerald, #10b981)',
            color: isDayMode ? '#065f46' : '#d1fae5'
          }}
        >
          <div className="flex items-center gap-2.5">
            <MoreVertical className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{t('repositionBannerRecipeType', 'Drag items or use arrows to reorder recipe types. Click Done when finished.')}</span>
          </div>
          <button
            onClick={toggleRepositionMode}
            className="px-3 py-1 text-white font-bold rounded-lg transition text-[11px] shrink-0 cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
          >
            {t('done', 'Done')}
          </button>
        </div>
      )}

      {/* ADD RECIPE TYPE FORM */}
      {!isReordering && (
        <div 
          className="border rounded-3xl p-6 shadow-sm space-y-3 transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            <Plus className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('addNewRecipeType', 'Add New Recipe Type')}
          </h2>
          <form onSubmit={handleAddType} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder={t('recipeTypePlaceholder', 'e.g. Soup, Salad, Curry...')}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
            />
            <button
              type="submit"
              className="text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
            >
              <Plus className="h-4 w-4" /> {t('addRecipeTypeBtn', 'Add Recipe Type')}
            </button>
          </form>
        </div>
      )}

      {/* RECIPE TYPES GRID */}
      <div 
        className="border rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div 
          className="flex flex-wrap items-center justify-between border-b pb-3 gap-3"
          style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('activeRecipeTypes', 'Active Recipe Types')} ({recipeTypes.length})
            </span>
            <button
              type="button"
              onClick={toggleRepositionMode}
              className="font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs border"
              style={isReordering ? {
                backgroundColor: 'var(--color-emerald, #10b981)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: '#ffffff'
              } : {
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#334155' : '#cbd5e1'
              }}
            >
              {isReordering ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" /> {t('doneRepositioning', 'Done Repositioning')}
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('reposition', 'Reposition')}
                </>
              )}
            </button>
          </div>
          <span className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            {isReordering ? t('repositionActive', 'Repositioning Mode Active') : t('recipeTypeRealtimeSync', 'Changes sync in real-time across recipe forms')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recipeTypes.map((type, idx) => {
            const isEditing = editingIndex === idx;

            return (
              <div
                key={`${type}-${idx}`}
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
                  backgroundColor: isReordering 
                    ? (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.08)') 
                    : (isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)'),
                  borderColor: isReordering ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
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
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                        borderColor: 'var(--color-primary, #E05638)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      className="p-1.5 border rounded-lg transition cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                        borderColor: 'var(--color-emerald, #10b981)',
                        color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                      }}
                      title={t('save', 'Save')}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="p-1.5 border rounded-lg transition cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#334155' : '#cbd5e1'
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
                        <div className="flex items-center gap-1 shrink-0" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveType(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:text-black disabled:opacity-20 cursor-pointer"
                              title={t('moveUp', 'Move Up')}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveType(idx, 'down')}
                              disabled={idx === recipeTypes.length - 1}
                              className="p-0.5 hover:text-black disabled:opacity-20 cursor-pointer"
                              title={t('moveDown', 'Move Down')}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div 
                            className="cursor-grab active:cursor-grabbing p-1" 
                            style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }}
                            title={t('dragToReposition', 'Click and drag to reposition')}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      <span className="text-xs font-bold truncate" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                        {type}
                      </span>
                    </div>

                    {!isReordering && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingIndex(idx);
                            setEditingValue(type);
                          }}
                          className="p-1.5 rounded-lg border transition cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#334155' : '#cbd5e1'
                          }}
                          title={t('editRecipeTypeTooltip', 'Edit Recipe Type')}
                        >
                          <Edit3 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteType(idx, type)}
                          className="p-1.5 rounded-lg border transition cursor-pointer hover:text-red-500 shadow-xs"
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#64748b' : '#94a3b8'
                          }}
                          title={t('deleteRecipeTypeTooltip', 'Delete Recipe Type')}
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
