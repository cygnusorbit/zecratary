'use client';
// @ts-nocheck

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutTemplate, Layers, Sliders, Eye, Plus, Trash2, 
  MoveUp, MoveDown, Copy, Check, ExternalLink, Globe,
  RefreshCw, CheckCircle2, AlertCircle, Sparkles, BookOpen,
  CreditCard, Type, AlignLeft, Grid, Image as ImageIcon, Box
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export interface PageElement {
  id: string;
  type: 'title' | 'content' | 'column' | 'picture' | 'box' | 'recipe' | 'subscription';
  title?: string;
  subtitle?: string;
  content?: string;
  level?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center' | 'right';
  color?: string;
  columnsCount?: 2 | 3 | 4;
  columns?: Array<{ title: string; text: string; icon?: string }>;
  imageUrl?: string;
  altText?: string;
  caption?: string;
  badge?: string;
  buttonText?: string;
  buttonUrl?: string;
  recipeDensity?: 'compact' | 'normal' | 'relaxed';
  recipeLimit?: number;
  planBillingInterval?: 'monthly' | 'annual';
}

export interface PagePaddingSettings {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  x?: string;
  maxWidth?: 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
}

export interface FooterNavigationColumn {
  id: string;
  title: string;
  links: Array<{ label: string; url: string }>;
}

export interface DynamicFooterSettings {
  enabled: boolean;
  aboutText: string;
  copyrightText: string;
  columns: FooterNavigationColumn[];
  socialLinks: {
    twitter?: string;
    github?: string;
    discord?: string;
    instagram?: string;
    youtube?: string;
  };
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
}

export interface FrontendPageRecord {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: 'published' | 'draft';
  is_default: boolean;
  elements: PageElement[];
  padding?: PagePaddingSettings;
  footer?: DynamicFooterSettings;
}

const DEFAULT_PAGES_FALLBACK: FrontendPageRecord[] = [
  {
    id: 'page_home',
    title: 'Homepage',
    slug: 'home',
    description: 'Main public landing page and culinary platform showcase.',
    status: 'published',
    is_default: true,
    padding: {
      top: '2.5rem',
      bottom: '4rem',
      left: '1.5rem',
      right: '1.5rem',
      x: '1.5rem',
      maxWidth: 'max-w-7xl'
    },
    footer: {
      enabled: true,
      aboutText: 'Zecratary empowers home chefs and nutritionists with intelligent meal formulation, dynamic pantries, and automated shopping workflows.',
      copyrightText: '© 2026 Zecratary Inc. All rights reserved.',
      columns: [
        {
          id: 'col_platform',
          title: 'Platform',
          links: [
            { label: 'AI Chef', url: '/chef' },
            { label: 'Meal Planner', url: '/planner' },
            { label: 'Smart Pantry', url: '/pantry' }
          ]
        },
        {
          id: 'col_resources',
          title: 'Resources',
          links: [
            { label: 'Cookbooks', url: '/books' },
            { label: 'Saved Recipes', url: '/saved' },
            { label: 'API & Settings', url: '/admin' }
          ]
        }
      ],
      socialLinks: {
        twitter: 'https://twitter.com',
        github: 'https://github.com',
        discord: 'https://discord.com',
        instagram: 'https://instagram.com',
        youtube: 'https://youtube.com'
      }
    },
    elements: [
      {
        id: 'el_hero_title',
        type: 'title',
        level: 'h1',
        title: 'Formulate Gourmet Excellence with AI',
        subtitle: 'Precision culinary planning, ingredient analysis, and smart budgeting engineered for modern kitchens.',
        align: 'center'
      },
      {
        id: 'el_recipe_showcase',
        type: 'recipe',
        title: 'Featured Culinary Creations',
        recipeDensity: 'normal',
        recipeLimit: 6
      },
      {
        id: 'el_features_grid',
        type: 'column',
        title: 'Engineered for High-Performance Nutrition',
        columnsCount: 3,
        columns: [
          { title: 'Nutritional Telemetry', text: 'Granular macronutrient calculations and metabolic feedback on every generated meal.', icon: '⚡' },
          { title: 'Automated Shopping', text: 'Consolidate multiple recipe requirements into organized supermarket aisles instantly.', icon: '🛒' },
          { title: 'Pantry Spoilage Guard', text: 'Predictive expiry alerts prevent food waste and recommend recipes using ingredients on hand.', icon: '🛡️' }
        ]
      },
      {
        id: 'el_plans_showcase',
        type: 'subscription',
        title: 'Transparent Membership Tiers',
        subtitle: 'Select the optimal tier for your personal culinary regimen.',
        planBillingInterval: 'monthly'
      }
    ]
  }
];

export default function AdminFrontendPage() {
  const { t } = useTranslation();
  const [pages, setPages] = useState<FrontendPageRecord[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('page_home');
  const [activePageTab, setActivePageTab] = useState<'elements' | 'settings'>('elements');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal State for New Page Creation
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState<string>('');
  const [newPageSlug, setNewPageSlug] = useState<string>('');
  const [newPageDesc, setNewPageDesc] = useState<string>('');

  // Drag and drop tracking
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Active Selected Page Helper
  const activePage = pages.find((p) => p.id === selectedPageId) || pages[0] || DEFAULT_PAGES_FALLBACK[0];

  const setSelectedPage = (updated: FrontendPageRecord) => {
    setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Fetch all pages from PostgreSQL
  const loadFrontendPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/frontend?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const loaded: FrontendPageRecord[] = Array.isArray(data.pages) && data.pages.length > 0 
          ? data.pages 
          : DEFAULT_PAGES_FALLBACK;
        setPages(loaded);
        if (!loaded.some((p) => p.id === selectedPageId)) {
          const defaultPage = loaded.find((p) => p.is_default) || loaded[0];
          setSelectedPageId(defaultPage.id);
        }
      } else {
        setPages(DEFAULT_PAGES_FALLBACK);
      }
    } catch (err) {
      console.warn('Notice loading /admin/frontend pages:', err);
      setPages(DEFAULT_PAGES_FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [selectedPageId]);

  useEffect(() => {
    document.title = `${t('frontendPortalTitle', 'Frontend Page Builder & Management')} - Zecratary`;
    loadFrontendPages();

    const handleUpdate = () => loadFrontendPages();
    window.addEventListener('zecratary_languages_updated', handleUpdate);
    window.addEventListener('zecratary_dictionary_updated', handleUpdate);
    window.addEventListener('zecratary_locale_changed', handleUpdate);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleUpdate);
      window.removeEventListener('zecratary_dictionary_updated', handleUpdate);
      window.removeEventListener('zecratary_locale_changed', handleUpdate);
    };
  }, [loadFrontendPages, t]);

  // Persist current active page to PostgreSQL
  const handleSavePage = async () => {
    if (!activePage) return;
    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_page',
          page: activePage
        })
      });

      if (!res.ok) {
        throw new Error(t('pageSaveError', 'Failed to save page changes. Please try again.'));
      }

      // Broadcast update across all browser tabs and landing view
      window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
      localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());

      setStatus({
        type: 'success',
        msg: t('pageSavedToast', 'Frontend page changes saved & broadcasted successfully!')
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        msg: err.message || t('pageSaveError', 'Failed to save page changes. Please try again.')
      });
    } finally {
      setSaving(false);
    }
  };

  // Set default homepage atomically
  const handleSetDefaultHome = async () => {
    if (!activePage) return;
    try {
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_default',
          id: activePage.id
        })
      });

      if (res.ok) {
        setPages((prev) => prev.map((p) => ({
          ...p,
          is_default: p.id === activePage.id
        })));
        window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
        localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        setStatus({
          type: 'success',
          msg: `${activePage.title} is now the default homepage (/).`
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  // Delete page
  const handleDeletePage = async () => {
    if (!activePage || activePage.is_default) return;
    if (!window.confirm(t('deletePageConfirm', 'Are you sure you want to delete this page? This cannot be undone.'))) return;

    try {
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_page',
          id: activePage.id
        })
      });

      if (res.ok) {
        const remaining = pages.filter((p) => p.id !== activePage.id);
        setPages(remaining);
        setSelectedPageId(remaining[0]?.id || 'page_home');
        window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
        setStatus({
          type: 'success',
          msg: t('pageDeletedToast', 'Page deleted successfully!')
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  // Create new page
  const handleCreateNewPage = async () => {
    if (!newPageTitle.trim()) return;
    const slugFormatted = newPageSlug.trim().replace(/^\/+/, '') || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newRecord: FrontendPageRecord = {
      id: `page_${Date.now()}`,
      title: newPageTitle.trim(),
      slug: slugFormatted,
      description: newPageDesc.trim(),
      status: 'published',
      is_default: false,
      padding: {
        top: '2.5rem',
        bottom: '4rem',
        left: '1.5rem',
        right: '1.5rem',
        x: '1.5rem',
        maxWidth: 'max-w-7xl'
      },
      footer: {
        enabled: true,
        aboutText: 'Custom page built with Zecratary Page Builder.',
        copyrightText: '© 2026 Zecratary Inc. All rights reserved.',
        columns: [],
        socialLinks: {}
      },
      elements: [
        {
          id: `elem_${Date.now()}`,
          type: 'title',
          level: 'h1',
          title: newPageTitle.trim(),
          subtitle: 'Welcome to our new content section.',
          align: 'center'
        }
      ]
    };

    try {
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_page',
          page: newRecord
        })
      });

      if (res.ok) {
        setPages((prev) => [...prev, newRecord]);
        setSelectedPageId(newRecord.id);
        setShowCreateModal(false);
        setNewPageTitle('');
        setNewPageSlug('');
        setNewPageDesc('');
        window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
        setStatus({
          type: 'success',
          msg: t('pageCreatedToast', 'New page created and selected successfully!')
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  // Element actions
  const handleAddElement = (type: PageElement['type']) => {
    const newEl: PageElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      title: type === 'title' ? 'New Section Heading' : 
             type === 'recipe' ? 'Curated Recipe Showcase' :
             type === 'subscription' ? 'Membership & Token Plans' :
             type === 'column' ? 'Core Capabilities' :
             type === 'box' ? 'Featured Announcement' : 'New Content Block',
      subtitle: type === 'title' ? 'Descriptive subtitle providing additional context.' : undefined,
      content: type === 'content' ? 'Add rich informative prose, dietary guidelines, or culinary instructions here.' : undefined,
      level: 'h2',
      align: 'left',
      columnsCount: 3,
      columns: type === 'column' ? [
        { title: 'Column 1', text: 'Detailed feature description.', icon: '🌟' },
        { title: 'Column 2', text: 'Detailed feature description.', icon: '⚡' },
        { title: 'Column 3', text: 'Detailed feature description.', icon: '🎯' }
      ] : undefined,
      badge: type === 'box' ? 'New Feature' : undefined,
      buttonText: type === 'box' ? 'Explore Now' : undefined,
      buttonUrl: type === 'box' ? '/chef' : undefined,
      recipeDensity: 'normal',
      recipeLimit: 6,
      planBillingInterval: 'monthly'
    };

    setSelectedPage({
      ...activePage,
      elements: [...(activePage.elements || []), newEl]
    });
  };

  const handleUpdateElement = (index: number, updated: PageElement) => {
    const list = [...(activePage.elements || [])];
    list[index] = updated;
    setSelectedPage({ ...activePage, elements: list });
  };

  const handleDuplicateElement = (index: number) => {
    const list = [...(activePage.elements || [])];
    const source = list[index];
    const duplicate: PageElement = {
      ...source,
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: source.title ? `${source.title} (Copy)` : undefined
    };
    list.splice(index + 1, 0, duplicate);
    setSelectedPage({ ...activePage, elements: list });
  };

  const handleRemoveElement = (index: number) => {
    const list = [...(activePage.elements || [])];
    list.splice(index, 1);
    setSelectedPage({ ...activePage, elements: list });
  };

  const handleMoveElement = (index: number, direction: 'up' | 'down') => {
    const list = [...(activePage.elements || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    setSelectedPage({ ...activePage, elements: list });
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const list = [...(activePage.elements || [])];
    const item = list.splice(draggedIndex, 1)[0];
    list.splice(index, 0, item);
    setDraggedIndex(index);
    setSelectedPage({ ...activePage, elements: list });
  };

  // Spacing & padding change handler
  const handlePaddingChange = (key: keyof PagePaddingSettings, val: string) => {
    setSelectedPage({
      ...activePage,
      padding: {
        ...(activePage.padding || {}),
        [key]: val
      }
    });
  };

  // Footer change handler
  const handleFooterChange = (key: keyof DynamicFooterSettings, val: any) => {
    setSelectedPage({
      ...activePage,
      footer: {
        ...(activePage.footer || {
          enabled: true,
          aboutText: '',
          copyrightText: '',
          columns: [],
          socialLinks: {}
        }),
        [key]: val
      }
    });
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header with Telemetry Badges & Action Bar */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <LayoutTemplate className="h-6 w-6" /> {t('frontendPortalTitle', 'Frontend Page Builder & Management')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('frontendPortalSubtitle', 'Create and customize public landing pages, dynamic content blocks, layout padding, and site footers.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: isPreviewMode ? 'var(--color-primary)' : 'var(--color-text)'
            }}
          >
            <Eye className="h-4 w-4" />
            <span>{isPreviewMode ? t('btnEditCanvas', 'Edit Canvas') : t('btnLivePreview', 'Live Preview')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-emerald, #10b981)',
              color: 'var(--color-emerald, #10b981)'
            }}
          >
            <Plus className="h-4 w-4" />
            <span>{t('btnAddNewPage', 'Add New Page')}</span>
          </button>

          <button
            type="button"
            onClick={handleSavePage}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Check className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? t('savingChanges', 'Saving...') : t('btnSavePageChanges', 'Save Page Changes')}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Page Selector Tabs Bar */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {pages.map((p) => {
          const isSelected = p.id === activePage.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPageId(p.id);
                setStatus(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer border"
              style={isSelected ? {
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                borderColor: 'var(--color-primary)'
              } : {
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              <span>{p.title}</span>
              {p.is_default && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-black/30 text-white font-mono uppercase">
                  Home
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed transition hover:opacity-80 shrink-0 flex items-center gap-1.5 cursor-pointer"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)'
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add Page</span>
        </button>
      </div>

      {/* Main Formless Region Container (Constraint 9) */}
      <div 
        role="region"
        data-lpignore="true"
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Workspace Sub-Tabs (Elements vs Settings) */}
        {!isPreviewMode && (
          <div 
            className="flex p-1.5 rounded-2xl border transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <button
              type="button"
              onClick={() => setActivePageTab('elements')}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              style={activePageTab === 'elements' ? {
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderWidth: '1px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              } : {
                color: 'var(--color-text-secondary)'
              }}
            >
              <Layers className="h-4 w-4" />
              <span>{t('tabElements', 'Page Elements & Blocks')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePageTab('settings')}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              style={activePageTab === 'settings' ? {
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderWidth: '1px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              } : {
                color: 'var(--color-text-secondary)'
              }}
            >
              <Sliders className="h-4 w-4" />
              <span>{t('tabSettings', 'Page Spacing & Footer')}</span>
            </button>
          </div>
        )}

        {/* WORKSPACE 1: PAGE ELEMENTS TAB */}
        {!isPreviewMode && activePageTab === 'elements' && (
          <div className="space-y-6">
            {/* Page Basic Properties & Routing Card (pageBasicSettings) */}
            <div 
              className="p-5 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    {t('pagePropsTitle', 'Page Properties & Routing')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('pagePropsDesc', 'Configure title, URL route, publication status, and SEO meta descriptions.')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!activePage.is_default ? (
                    <button
                      type="button"
                      onClick={handleSetDefaultHome}
                      className="px-3 py-1.5 rounded-xl border text-[11px] font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/10 transition cursor-pointer"
                    >
                      {t('btnSetDefaultHome', 'Set as Default Homepage (/)')}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {t('btnCurrentDefaultHome', 'Default Homepage Active')}
                    </span>
                  )}

                  {!activePage.is_default && pages.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDeletePage}
                      className="p-1.5 rounded-xl border text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10 transition cursor-pointer"
                      title={t('btnDeletePage', 'Delete Page')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('pageTitleLabel', 'Page Title')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={activePage.title}
                    onChange={(e) => setSelectedPage({ ...activePage, title: e.target.value })}
                    placeholder={t('pageTitlePlaceholder', 'e.g. Gourmet Blueprint Guide')}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('pageSlugLabel', 'URL Route Slug')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    disabled={activePage.is_default}
                    value={activePage.is_default ? '/' : `/${activePage.slug}`}
                    onChange={(e) => setSelectedPage({
                      ...activePage,
                      slug: e.target.value.replace(/^\/+/, '')
                    })}
                    placeholder={t('pageSlugPlaceholder', 'e.g. /gourmet-guide')}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('statusLabel', 'Publication Status')}
                  </label>
                  <select
                    value={activePage.status}
                    onChange={(e) => setSelectedPage({ ...activePage, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="published">{t('statusPublished', 'Published')}</option>
                    <option value="draft">{t('statusDraft', 'Draft')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('metaDescLabel', 'SEO & Meta Description')}
                </label>
                <textarea
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  rows={2}
                  value={activePage.description || ''}
                  onChange={(e) => setSelectedPage({ ...activePage, description: e.target.value })}
                  placeholder={t('metaDescPlaceholder', 'Brief summary displayed in search engine results and social previews...')}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none font-medium"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>

            {/* Element Palette Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('elementPaletteHeading', 'Add Dynamic Page Elements')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('elementPaletteDesc', 'Click to append modular layout blocks to your current page canvas.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddElement('recipe')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('btnAddRecipeGrid', '+ Recipe Grid')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('subscription')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{t('btnAddPlanCard', '+ Plan Card')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('title')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Type className="h-3.5 w-3.5" />
                  <span>{t('btnAddTitle', '+ Title / Heading')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('content')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                  <span>{t('btnAddContent', '+ Content / Text')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('column')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Grid className="h-3.5 w-3.5" />
                  <span>{t('btnAddColumn', '+ Feature Columns')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('picture')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>{t('btnAddPicture', '+ Media Picture')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('box')}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>{t('btnAddBox', '+ Callout Box')}</span>
                </button>
              </div>
            </div>

            {/* Draggable & Reorderable Elements Canvas List */}
            <div className="space-y-4 pt-2">
              {(!activePage.elements || activePage.elements.length === 0) ? (
                <div 
                  className="p-12 text-center rounded-2xl border border-dashed space-y-2"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Layers className="h-8 w-8 mx-auto opacity-40" />
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('emptyCanvasTitle', 'No Elements on this Canvas')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('emptyCanvasDesc', 'Click any button from the palette above to insert titles, grids, recipes, or callout cards.')}
                  </p>
                </div>
              ) : (
                activePage.elements.map((elem, idx) => (
                  <div
                    key={elem.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    className="p-4 rounded-2xl border space-y-3 transition-shadow duration-150 shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    {/* Element Block Header with Type & Controls */}
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                          {elem.type}
                        </span>
                        <span className="text-xs font-bold truncate max-w-xs" style={{ color: 'var(--color-text)' }}>
                          {elem.title || 'Untitled Block'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveElement(idx, 'up')}
                          className="p-1 rounded-lg border hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title="Move Up"
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === activePage.elements.length - 1}
                          onClick={() => handleMoveElement(idx, 'down')}
                          className="p-1 rounded-lg border hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title="Move Down"
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateElement(idx)}
                          className="p-1 rounded-lg border hover:bg-white/10 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title="Duplicate Element"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveElement(idx)}
                          className="p-1 rounded-lg border text-red-400 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
                          title="Remove Element"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Config: Title */}
                    <div>
                      <input
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck="false"
                        value={elem.title || ''}
                        onChange={(e) => handleUpdateElement(idx, { ...elem, title: e.target.value })}
                        placeholder="Element Title / Heading"
                        className="w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    {/* Conditional Block Editors */}
                    {(elem.type === 'title' || elem.type === 'subscription') && (
                      <input
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck="false"
                        value={elem.subtitle || ''}
                        onChange={(e) => handleUpdateElement(idx, { ...elem, subtitle: e.target.value })}
                        placeholder="Subtitle description..."
                        className="w-full px-3 py-1.5 rounded-xl border text-xs outline-none"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    )}

                    {elem.type === 'content' && (
                      <textarea
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck="false"
                        rows={3}
                        value={elem.content || ''}
                        onChange={(e) => handleUpdateElement(idx, { ...elem, content: e.target.value })}
                        placeholder="Detailed body text content..."
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none font-medium"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    )}

                    {elem.type === 'picture' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          data-form-type="other"
                          value={elem.imageUrl || ''}
                          onChange={(e) => handleUpdateElement(idx, { ...elem, imageUrl: e.target.value })}
                          placeholder="Image URL (e.g. /banners/salmon.jpg or https://...)"
                          className="px-3 py-1.5 rounded-xl border font-mono outline-none"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        />
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          data-form-type="other"
                          value={elem.caption || ''}
                          onChange={(e) => handleUpdateElement(idx, { ...elem, caption: e.target.value })}
                          placeholder="Caption / Alt description"
                          className="px-3 py-1.5 rounded-xl border outline-none"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        />
                      </div>
                    )}

                    {elem.type === 'box' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          value={elem.badge || ''}
                          onChange={(e) => handleUpdateElement(idx, { ...elem, badge: e.target.value })}
                          placeholder="Badge label (e.g. Pro Highlight)"
                          className="px-3 py-1.5 rounded-xl border outline-none"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        />
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          value={elem.buttonText || ''}
                          onChange={(e) => handleUpdateElement(idx, { ...elem, buttonText: e.target.value })}
                          placeholder="CTA Button Label"
                          className="px-3 py-1.5 rounded-xl border outline-none"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        />
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          value={elem.buttonUrl || ''}
                          onChange={(e) => handleUpdateElement(idx, { ...elem, buttonUrl: e.target.value })}
                          placeholder="CTA URL Target (/chef)"
                          className="px-3 py-1.5 rounded-xl border font-mono outline-none"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* WORKSPACE 2: SETTINGS TAB (PAGE SPACING & FOOTER) */}
        {!isPreviewMode && activePageTab === 'settings' && (
          <div className="space-y-6">
            {/* Page Spacing & Padding Settings */}
            <div 
              className="p-5 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Sliders className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {t('paddingSettingsHeading', 'Page Spacing & Padding Settings')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('paddingSettingsDesc', 'Configure top clearance, bottom margin, horizontal gutters, and responsive container widths.')}
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedPage({
                    ...activePage,
                    padding: { top: '1.5rem', bottom: '2.5rem', left: '1rem', right: '1rem', x: '1rem', maxWidth: 'max-w-6xl' }
                  })}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {t('presetCompact', 'Compact')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPage({
                    ...activePage,
                    padding: { top: '2.5rem', bottom: '4rem', left: '1.5rem', right: '1.5rem', x: '1.5rem', maxWidth: 'max-w-7xl' }
                  })}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                >
                  {t('presetBalanced', 'Balanced (Default)')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPage({
                    ...activePage,
                    padding: { top: '4rem', bottom: '6rem', left: '2.5rem', right: '2.5rem', x: '2.5rem', maxWidth: 'max-w-7xl' }
                  })}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                >
                  {t('presetSpacious', 'Spacious')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPage({
                    ...activePage,
                    padding: { top: '0', bottom: '4rem', left: '0', right: '0', x: '0', maxWidth: 'max-w-full' }
                  })}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {t('presetFullWidth', 'Full-Width Flush')}
                </button>
              </div>

              {/* Individual Spacing Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs pt-1">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('padTopLabel', 'Top Padding (Clearance)')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={activePage.padding?.top || '2.5rem'}
                    onChange={(e) => handlePaddingChange('top', e.target.value)}
                    placeholder="2.5rem"
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('padBottomLabel', 'Bottom Padding')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={activePage.padding?.bottom || '4rem'}
                    onChange={(e) => handlePaddingChange('bottom', e.target.value)}
                    placeholder="4rem"
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('padLeftLabel', 'Left Padding')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={activePage.padding?.left || activePage.padding?.x || '1.5rem'}
                    onChange={(e) => {
                      handlePaddingChange('left', e.target.value);
                      handlePaddingChange('x', e.target.value);
                    }}
                    placeholder="1.5rem"
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('padRightLabel', 'Right Padding')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={activePage.padding?.right || activePage.padding?.x || '1.5rem'}
                    onChange={(e) => handlePaddingChange('right', e.target.value)}
                    placeholder="1.5rem"
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('padContainerWidthLabel', 'Container Max Width')}
                  </label>
                  <select
                    value={activePage.padding?.maxWidth || 'max-w-7xl'}
                    onChange={(e) => handlePaddingChange('maxWidth', e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="max-w-5xl">5XL (1024px)</option>
                    <option value="max-w-6xl">6XL (1152px)</option>
                    <option value="max-w-7xl">7XL (1280px - Default)</option>
                    <option value="max-w-full">Full Width (100% Flush)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Settings & Navigation Columns */}
            <div 
              className="p-5 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('footerSettingsHeading', 'Footer Settings & Navigation Columns')}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('footerSettingsDesc', 'Customize brand mission statement, copyright line, footer navigation directories, and social links.')}
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={activePage.footer?.enabled ?? true}
                    onChange={(e) => handleFooterChange('enabled', e.target.checked)}
                    className="rounded border"
                  />
                  <span>{t('footerEnabledLabel', 'Enable Footer on this Page')}</span>
                </label>
              </div>

              {(activePage.footer?.enabled ?? true) && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('footerAboutLabel', 'Brand Mission / About Statement')}
                      </label>
                      <textarea
                        autoComplete="off"
                        data-lpignore="true"
                        rows={2}
                        value={activePage.footer?.aboutText || ''}
                        onChange={(e) => handleFooterChange('aboutText', e.target.value)}
                        placeholder="Brand mission statement..."
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none font-medium"
                        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('footerCopyrightLabel', 'Copyright Notice')}
                      </label>
                      <textarea
                        autoComplete="off"
                        data-lpignore="true"
                        rows={2}
                        value={activePage.footer?.copyrightText || ''}
                        onChange={(e) => handleFooterChange('copyrightText', e.target.value)}
                        placeholder="© 2026 Zecratary Inc..."
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none font-medium"
                        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                  </div>

                  {/* Social Profile Links */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                      {t('footerSocialHeading', 'Social Media Profile Links')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      {['twitter', 'github', 'discord', 'instagram', 'youtube'].map((platform) => (
                        <input
                          key={platform}
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          value={(activePage.footer?.socialLinks as any)?.[platform] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleFooterChange('socialLinks', {
                              ...(activePage.footer?.socialLinks || {}),
                              [platform]: val
                            });
                          }}
                          placeholder={`https://${platform}.com/...`}
                          className="px-3 py-1.5 rounded-xl border outline-none"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORKSPACE 3: LIVE PREVIEW CANVAS */}
        {isPreviewMode && (
          <div 
            className="rounded-3xl border p-6 space-y-12 transition-colors duration-200 overflow-hidden shadow-inner"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <div 
              className={`${activePage.padding?.maxWidth || 'max-w-7xl'} mx-auto w-full space-y-10`}
              style={{
                paddingTop: activePage.padding?.top || '2.5rem',
                paddingBottom: activePage.padding?.bottom || '4rem',
                paddingLeft: activePage.padding?.left || activePage.padding?.x || '1.5rem',
                paddingRight: activePage.padding?.right || activePage.padding?.x || '1.5rem',
                boxSizing: 'border-box'
              }}
            >
              {(activePage.elements || []).map((el) => (
                <div 
                  key={el.id}
                  className="p-6 rounded-2xl border transition-colors duration-200 shadow-sm"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  {el.type === 'title' && (
                    <div className={el.align === 'center' ? 'text-center' : el.align === 'right' ? 'text-right' : 'text-left'}>
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                        {el.title}
                      </h2>
                      {el.subtitle && (
                        <p className="text-sm mt-1.5 max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                          {el.subtitle}
                        </p>
                      )}
                    </div>
                  )}

                  {el.type === 'content' && (
                    <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>
                      {el.content}
                    </div>
                  )}

                  {el.type === 'column' && (
                    <div className="space-y-4">
                      {el.title && <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{el.title}</h3>}
                      <div className={`grid grid-cols-1 sm:grid-cols-${el.columnsCount || 3} gap-4`}>
                        {(el.columns || []).map((c, i) => (
                          <div 
                            key={i} 
                            className="p-4 rounded-xl border space-y-1.5"
                            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                          >
                            <div className="text-xl">{c.icon || '✨'}</div>
                            <h4 className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{c.title}</h4>
                            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {el.type === 'picture' && (
                    <div className="text-center space-y-2">
                      <div className="max-h-80 overflow-hidden rounded-xl border flex items-center justify-center p-4 bg-black/10">
                        {el.imageUrl ? (
                          <img src={el.imageUrl} alt={el.altText || ''} className="max-h-72 object-contain rounded-lg" />
                        ) : (
                          <ImageIcon className="h-16 w-16 opacity-30" />
                        )}
                      </div>
                      {el.caption && <p className="text-[11px] font-mono opacity-60">{el.caption}</p>}
                    </div>
                  )}

                  {el.type === 'box' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        {el.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {el.badge}
                          </span>
                        )}
                        <h4 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{el.title}</h4>
                      </div>
                      {el.buttonText && (
                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow cursor-pointer"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          {el.buttonText}
                        </button>
                      )}
                    </div>
                  )}

                  {el.type === 'recipe' && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Sparkles className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                        {el.title}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[1, 2, 3].map((n) => (
                          <div 
                            key={n}
                            className="p-3.5 rounded-xl border space-y-2"
                            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                          >
                            <div className="h-24 rounded-lg bg-white/5 flex items-center justify-center text-2xl">🍳</div>
                            <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>Artisanal Dish #{n}</div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>25 Mins • 4 Servings • Pro Chef</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {el.type === 'subscription' && (
                    <div className="text-center space-y-4">
                      <div>
                        <h3 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{el.title}</h3>
                        {el.subtitle && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{el.subtitle}</p>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {['Culinary Starter', 'Gourmet Pro', 'Executive Nutrition'].map((tier, i) => (
                          <div 
                            key={tier}
                            className="p-5 rounded-2xl border space-y-3 text-left"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: i === 1 ? 'var(--color-primary)' : 'var(--color-border)',
                              borderWidth: i === 1 ? '2px' : '1px'
                            }}
                          >
                            <h4 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>{tier}</h4>
                            <div className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
                              ${i === 0 ? '0' : i === 1 ? '19' : '49'}<span className="text-xs font-normal opacity-70">/mo</span>
                            </div>
                            <ul className="text-[11px] space-y-1.5 opacity-80">
                              <li>✓ Unlimited Recipe Formulation</li>
                              <li>✓ AI Dietary Recommendations</li>
                              <li>✓ Automated Shopping Aisles</li>
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dynamic Preview Footer */}
            {activePage.footer?.enabled && (
              <footer 
                className="pt-8 border-t space-y-4 text-xs"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="max-w-xs space-y-1">
                    <div className="font-black text-sm" style={{ color: 'var(--color-primary)' }}>Zecratary</div>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {activePage.footer.aboutText}
                    </p>
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {activePage.footer.copyrightText}
                  </div>
                </div>
              </footer>
            )}
          </div>
        )}

        {/* Status Notification Toast Banner */}
        {status && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: status.type === 'success' ? 'var(--color-emerald, #10b981)' : 'rgba(239, 68, 68, 0.4)',
              color: status.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
            }}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{status.msg}</span>
          </div>
        )}
      </div>

      {/* CREATE NEW PAGE MODAL DIALOG */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>
                {t('modalCreatePageTitle', 'Create New Page')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('modalCreatePageDesc', 'Set up a new frontend page. You can add and rearrange content blocks immediately.')}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('pageTitleLabel', 'Page Title')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={newPageTitle}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNewPageTitle(title);
                    if (!newPageSlug || newPageSlug === newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                      setNewPageSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  placeholder={t('pageTitlePlaceholder', 'e.g. Gourmet Blueprint Guide')}
                  className="w-full px-3 py-2 rounded-xl border font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('pageSlugLabel', 'URL Route Slug')}
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 rounded-l-xl border border-r-0 font-mono text-xs opacity-60" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                    /
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.replace(/^\/+/, ''))}
                    placeholder="gourmet-guide"
                    className="w-full px-3 py-2 rounded-r-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('metaDescLabel', 'SEO & Meta Description')}
                </label>
                <textarea
                  autoComplete="off"
                  data-lpignore="true"
                  rows={2}
                  value={newPageDesc}
                  onChange={(e) => setNewPageDesc(e.target.value)}
                  placeholder={t('metaDescPlaceholder', 'Brief summary displayed in search engine results and social previews...')}
                  className="w-full px-3 py-2 rounded-xl border outline-none resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {t('btnCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreateNewPage}
                disabled={!newPageTitle.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('btnCreatePage', 'Create Page')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
