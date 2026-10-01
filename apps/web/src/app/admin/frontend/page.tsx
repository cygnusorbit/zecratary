'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  LayoutTemplate, 
  Plus, 
  GripVertical, 
  Trash2, 
  Copy, 
  Save, 
  Eye, 
  Edit3, 
  ChevronUp, 
  ChevronDown, 
  Type, 
  AlignLeft, 
  Columns, 
  Image as ImageIcon, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Upload, 
  Globe, 
  Home, 
  ChevronRight, 
  ChevronLeft,
  Utensils, 
  CreditCard, 
  Palette, 
  Clock, 
  Flame, 
  Check, 
  Sparkles, 
  Coins, 
  RotateCcw, 
  Bookmark, 
  ExternalLink,
  Users,
  Star,
  X,
  Heart,
  PanelBottom,
  Sliders,
  Settings
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export type ElementType = 'title' | 'content' | 'column' | 'picture' | 'box' | 'recipe' | 'subscription';

export interface PagePaddingSettings {
  top?: string;
  bottom?: string;
  x?: string;
  maxWidth?: 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
}

export interface FooterLink {
  id: string;
  label: string;
  url: string;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface PageFooterSettings {
  enabled?: boolean;
  aboutText?: string;
  copyrightText?: string;
  columns?: FooterColumn[];
  socials?: {
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

export interface SavedRecipeRecord {
  id: string;
  title: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  image_url?: string;
  prepTime?: string;
  cookTime?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  calories?: string | number;
  servings?: string | number;
  category?: string;
  recipeType?: string;
  ingredients?: any;
  instructions?: any;
  directions?: any;
  sourceUrl?: string;
  rating?: number;
  isFavorite?: boolean;
  isCooked?: boolean;
  creatorName?: string;
}

export interface PageElement {
  id: string;
  type: ElementType;
  title?: string;
  subtitle?: string;
  content?: string;
  level?: 'h1' | 'h2' | 'h3';
  alignment?: 'left' | 'center' | 'right';
  boxStyle?: 'highlight' | 'border' | 'subtle';
  badge?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  altText?: string;
  caption?: string;
  layout?: 'full' | 'card' | 'contained';
  columnsCount?: number;
  columns?: Array<{ id: string; title: string; content: string }>;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  borderColor?: string;
  recipeGridDensity?: number;
  recipeLimit?: number;
  recipeCategoryFilter?: string;
  planSlug?: string;
  planBillingInterval?: 'MONTH' | 'YEAR';
  planShowTokens?: boolean;
  planShowAiModels?: boolean;
  planCtaText?: string;
  planCtaUrl?: string;
}

export interface FrontendPage {
  id: string;
  title: string;
  slug: string;
  description: string;
  is_default: boolean;
  is_published: boolean;
  elements: PageElement[];
  padding?: PagePaddingSettings;
  footer?: PageFooterSettings;
  created_at?: string;
  updated_at?: string;
}

interface PlanCatalog {
  id: string;
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  tokenLimit: number;
  tokenReimburseFrequency?: string;
  monthlyBadge?: string;
  annualBadge?: string;
  trialBadge?: string;
  descriptionMonthly?: string;
  descriptionAnnual?: string;
  allowedAiModels?: string[];
  features: string[];
  isFree?: boolean;
}

const DEFAULT_FALLBACK_PLANS: PlanCatalog[] = [
  {
    id: 'preset_taster',
    slug: 'taster',
    name: 'Taster',
    monthlyPrice: 0,
    annualPrice: 0,
    tokenLimit: 50000,
    tokenReimburseFrequency: 'monthly',
    trialBadge: 'Free Tier',
    descriptionMonthly: 'Free plan with limited features for home cooks.',
    descriptionAnnual: 'Free plan with limited features for home cooks.',
    allowedAiModels: ['gemini-3.5-flash-lite', 'gpt-3.5-turbo'],
    features: ['Create up to 5 AI-powered recipes per month', 'Personal recipe library (25 total recipes)', 'Automated shopping list creation'],
    isFree: true
  },
  {
    id: 'preset_nutrition_pro',
    slug: 'nutrition-pro',
    name: 'Nutrition Pro',
    monthlyPrice: 8.99,
    annualPrice: 59.99,
    tokenLimit: 1000000,
    tokenReimburseFrequency: 'monthly',
    monthlyBadge: 'Billed Immediately',
    annualBadge: 'Save 44%',
    trialBadge: '7-Day Free Trial',
    descriptionMonthly: 'Full premium kitchen access, billed monthly.',
    descriptionAnnual: 'Best value - all premium features, billed annually.',
    allowedAiModels: ['gemini-3.6-flash', 'gpt-4o'],
    features: ['Unlimited AI-powered recipe generation', 'Unlimited personal recipe library', 'Priority AI Chef processing & cloud sync'],
    isFree: false
  }
];

export default function AdminFrontendSettingsPage() {
  const { t } = useTranslation();
  const [pages, setPages] = useState<FrontendPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<FrontendPage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Dedicated Workspace Sub-Tabs: 'elements' vs 'settings'
  const [activePageTab, setActivePageTab] = useState<'elements' | 'settings'>('elements');

  // Dynamic system catalogs
  const [availablePlans, setAvailablePlans] = useState<PlanCatalog[]>(DEFAULT_FALLBACK_PLANS);
  const [savedRecipesList, setSavedRecipesList] = useState<SavedRecipeRecord[]>([]);
  const [planPreviewInterval, setPlanPreviewInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [recipeElementPages, setRecipeElementPages] = useState<Record<string, number>>({});

  // Full Recipe Popup Modal States
  const [activeRecipeModal, setActiveRecipeModal] = useState<SavedRecipeRecord | null>(null);
  const [modalServingsMultiplier, setModalServingsMultiplier] = useState<number>(1);
  const [modalCompletedSteps, setModalCompletedSteps] = useState<number[]>([]);
  const [modalFontSizeScale, setModalFontSizeScale] = useState<number>(100);

  // New Page Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState<string>('');
  const [newPageSlug, setNewPageSlug] = useState<string>('');
  const [newPageDesc, setNewPageDesc] = useState<string>('');

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageUploadElementId, setActiveImageUploadElementId] = useState<{ id: string; target: 'imageUrl' } | null>(null);

  // 1. Fetch Subscription Plans
  const fetchLivePlans = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/plans', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.packages || data?.plans || data?.configs);
        if (Array.isArray(list) && list.length > 0) {
          const parsed: PlanCatalog[] = list.map((p: any) => ({
            id: String(p.id || p.slug || 'plan'),
            slug: String(p.slug || p.id || 'plan').toLowerCase().trim(),
            name: String(p.name || 'Subscription Plan'),
            monthlyPrice: Number(p.monthlyPriceDollars ?? p.monthlyPrice ?? 0),
            annualPrice: Number(p.annualPriceDollars ?? p.annualPrice ?? 0),
            tokenLimit: Number(p.tokenLimit ?? 500000),
            tokenReimburseFrequency: p.tokenReimburseFrequency || 'monthly',
            monthlyBadge: p.monthlyBadge || '',
            annualBadge: p.annualBadge || '',
            trialBadge: p.trialBadge || (p.isFree ? 'Free Tier' : ''),
            descriptionMonthly: p.descriptionMonthly || p.description || 'Full kitchen access, billed monthly',
            descriptionAnnual: p.descriptionAnnual || 'Best value - all premium features, billed annually',
            allowedAiModels: Array.isArray(p.allowedAiModels) ? p.allowedAiModels : ['gemini-3.6-flash'],
            features: Array.isArray(p.features) ? p.features : ['AI-Powered Recipe Generation'],
            isFree: Boolean(p.isFree || (Number(p.monthlyPriceDollars) === 0 && Number(p.annualPriceDollars) === 0))
          }));
          setAvailablePlans(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // 2. Fetch Recipes from PostgreSQL
  const fetchAllSavedRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/frontend?all_recipes=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.recipes || []);
        if (Array.isArray(list) && list.length > 0) {
          setSavedRecipesList(list);
        }
      }
    } catch (_) {}
  }, []);

  // 3. Fetch Admin Frontend Pages
  const fetchPages = useCallback(async (selectIdAfter?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/frontend', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.pages) {
        setPages(data.pages);
        const targetId = selectIdAfter || (data.pages.length > 0 ? data.pages[0].id : '');
        setSelectedPageId(targetId);
        const cur = data.pages.find((p: FrontendPage) => p.id === targetId) || data.pages[0] || null;
        if (cur) {
          const clone: FrontendPage = JSON.parse(JSON.stringify(cur));
          if (!clone.padding) {
            clone.padding = { top: '2.5rem', bottom: '4rem', x: '1.5rem', maxWidth: 'max-w-7xl' };
          }
          if (!clone.footer) {
            clone.footer = {
              enabled: true,
              aboutText: 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
              copyrightText: '© 2026 Zecratary. All rights reserved.',
              columns: [
                { id: 'col_platform', title: 'Platform', links: [{ id: 'l_1', label: 'AI Chef', url: '/chef' }, { id: 'l_2', label: 'Saved Recipes', url: '/saved' }] },
                { id: 'col_company', title: 'Company', links: [{ id: 'l_3', label: 'About Us', url: '/about' }, { id: 'l_4', label: 'Pricing Plans', url: '/subscriptions' }] }
              ],
              socials: { twitter: 'https://x.com', github: 'https://github.com' }
            };
          }
          setSelectedPage(clone);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading frontend pages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
    fetchLivePlans();
    fetchAllSavedRecipes();
  }, [fetchPages, fetchLivePlans, fetchAllSavedRecipes]);

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const target = pages.find((p) => p.id === id);
    if (target) {
      const clone = JSON.parse(JSON.stringify(target));
      if (!clone.padding) clone.padding = { top: '2.5rem', bottom: '4rem', x: '1.5rem', maxWidth: 'max-w-7xl' };
      if (!clone.footer) clone.footer = { enabled: true, columns: [] };
      setSelectedPage(clone);
      setExpandedElementId(null);
    }
  };

  const handleBasicPageChange = (field: keyof FrontendPage, value: any) => {
    if (!selectedPage) return;
    setSelectedPage((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handlePaddingChange = (field: keyof PagePaddingSettings, value: any) => {
    if (!selectedPage) return;
    setSelectedPage((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        padding: {
          ...(prev.padding || { top: '2.5rem', bottom: '4rem', x: '1.5rem', maxWidth: 'max-w-7xl' }),
          [field]: value
        }
      };
    });
  };

  const handleFooterChange = (field: keyof PageFooterSettings, value: any) => {
    if (!selectedPage) return;
    setSelectedPage((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        footer: {
          ...(prev.footer || { enabled: true, columns: [] }),
          [field]: value
        }
      };
    });
  };

  // Drag and Drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !selectedPage) return;
    const list = [...selectedPage.elements];
    const item = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, item);
    setSelectedPage({ ...selectedPage, elements: list });
    setDraggedIndex(index);
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const moveElement = (index: number, direction: 'up' | 'down') => {
    if (!selectedPage) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedPage.elements.length) return;
    const list = [...selectedPage.elements];
    const item = list[index];
    list.splice(index, 1);
    list.splice(newIndex, 0, item);
    setSelectedPage({ ...selectedPage, elements: list });
  };

  // Add Element
  const handleAddElement = (type: ElementType) => {
    if (!selectedPage) return;
    const id = `elem_${type}_${Date.now()}`;
    let newElem: PageElement = { id, type };

    if (type === 'title') {
      newElem = { id, type, title: 'New Section Header', subtitle: 'Add an informative subtitle describing this section of the page.', level: 'h2', alignment: 'center', accentColor: 'var(--color-primary, #E05638)' };
    } else if (type === 'content') {
      newElem = { id, type, title: 'Detailed Overview', content: 'Write rich, engaging content here to highlight unique features, instructions, or brand messaging.', alignment: 'left' };
    } else if (type === 'column') {
      newElem = {
        id, type, title: 'Core Highlights', columnsCount: 3,
        columns: [
          { id: `c_${Date.now()}_1`, title: 'Smart AI Chef', content: 'Tailored recipes from your pantry.' },
          { id: `c_${Date.now()}_2`, title: 'Macro Telemetry', content: 'Track real-time protein, carbs, and calories.' },
          { id: `c_${Date.now()}_3`, title: 'Automated Cart', content: 'Export necessary groceries instantly.' }
        ],
        accentColor: 'var(--color-primary, #E05638)'
      };
    } else if (type === 'picture') {
      newElem = { id, type, title: 'Showcase Media', imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80', caption: 'High resolution visual preview', layout: 'full' };
    } else if (type === 'box') {
      newElem = { id, type, title: 'Highlighted Callout', content: 'Spotlight promotions, seasonal meal routines, or account upgrade notices.', boxStyle: 'highlight', badge: 'Special Notice', buttonText: 'Learn More', buttonUrl: '/dashboard', accentColor: 'var(--color-primary, #E05638)' };
    } else if (type === 'recipe') {
      newElem = { id, type, title: 'Community Recipes Gallery', subtitle: 'Explore recipes synchronized directly from your saved library.', recipeGridDensity: 3, recipeLimit: 6, recipeCategoryFilter: 'all', buttonText: 'Cook with AI Chef', buttonUrl: '/chef', accentColor: 'var(--color-primary, #E05638)' };
    } else if (type === 'subscription') {
      newElem = { id, type, title: 'Choose Your Culinary Plan', subtitle: 'Unlock premium AI Chef recommendations and deep macro telemetry.', planSlug: 'all', planBillingInterval: 'MONTH', planShowTokens: true, planShowAiModels: true, planCtaText: 'Choose Plan', planCtaUrl: '/subscriptions', accentColor: 'var(--color-primary, #E05638)', borderColor: 'var(--color-border, #1e293b)' };
    }

    const updatedElements = [...selectedPage.elements, newElem];
    setSelectedPage({ ...selectedPage, elements: updatedElements });
    setExpandedElementId(id);
  };

  const handleUpdateElement = (index: number, updatedFields: Partial<PageElement>) => {
    if (!selectedPage) return;
    const list = [...selectedPage.elements];
    list[index] = { ...list[index], ...updatedFields };
    setSelectedPage({ ...selectedPage, elements: list });
  };

  const handleDeleteElement = (index: number) => {
    if (!selectedPage) return;
    const list = [...selectedPage.elements];
    list.splice(index, 1);
    setSelectedPage({ ...selectedPage, elements: list });
  };

  const handleDuplicateElement = (index: number) => {
    if (!selectedPage) return;
    const list = [...selectedPage.elements];
    const source = list[index];
    const copy: PageElement = { ...JSON.parse(JSON.stringify(source)), id: `elem_${source.type}_${Date.now()}` };
    list.splice(index + 1, 0, copy);
    setSelectedPage({ ...selectedPage, elements: list });
    setExpandedElementId(copy.id);
  };

  // Footer Column helpers
  const addFooterColumn = () => {
    if (!selectedPage) return;
    const cols = [...(selectedPage.footer?.columns || [])];
    cols.push({
      id: `col_${Date.now()}`,
      title: 'New Column',
      links: [{ id: `l_${Date.now()}_1`, label: 'Link Item', url: '#' }]
    });
    handleFooterChange('columns', cols);
  };

  const removeFooterColumn = (colIndex: number) => {
    if (!selectedPage) return;
    const cols = [...(selectedPage.footer?.columns || [])];
    cols.splice(colIndex, 1);
    handleFooterChange('columns', cols);
  };

  const addFooterLink = (colIndex: number) => {
    if (!selectedPage) return;
    const cols = [...(selectedPage.footer?.columns || [])];
    cols[colIndex].links.push({ id: `l_${Date.now()}`, label: 'New Link', url: '#' });
    handleFooterChange('columns', cols);
  };

  const removeFooterLink = (colIndex: number, linkIndex: number) => {
    if (!selectedPage) return;
    const cols = [...(selectedPage.footer?.columns || [])];
    cols[colIndex].links.splice(linkIndex, 1);
    handleFooterChange('columns', cols);
  };

  // Save Page to PostgreSQL
  const handleSavePage = async () => {
    if (!selectedPage) return;
    try {
      setSaving(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_page', page: selectedPage })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(t('pageSavedSuccess') || 'Page layout, padding settings, and footer saved to PostgreSQL.');
        setTimeout(() => setToastMessage(null), 4000);
        await fetchPages(selectedPage.id);
      } else {
        setErrorMessage(data.error || 'Failed to save page configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while persisting page.');
    } finally {
      setSaving(false);
    }
  };

  // Set Default Homepage
  const handleSetDefaultHomepage = async (pageId: string) => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default', newDefaultId: pageId })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage('Default homepage updated.');
        setTimeout(() => setToastMessage(null), 3000);
        await fetchPages(pageId);
      }
    } catch (err: any) {
      alert(err.message || 'Error setting default page.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Page
  const handleDeletePage = async (pageId: string) => {
    const pageToDelete = pages.find((p) => p.id === pageId);
    if (!pageToDelete) return;
    if (pageToDelete.is_default) {
      alert('The default homepage cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${pageToDelete.title}"?`)) return;

    try {
      setSaving(true);
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_page', id: pageId })
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage('Page deleted successfully.');
        setTimeout(() => setToastMessage(null), 3000);
        await fetchPages();
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting page.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 space-y-8 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f1f5f9)'
      }}
    >
      {/* HEADER BAR */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6"
        style={{ borderColor: 'var(--color-border, #1e293b)' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-3 rounded-2xl flex items-center justify-center border shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-primary, #E05638)'
            }}
          >
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">
                {t('frontendSettingsTitle') || 'Frontend Pages & Layout Builder'}
              </h1>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs"
                style={{
                  backgroundColor: 'rgba(224, 86, 56, 0.1)',
                  borderColor: 'var(--color-primary, #E05638)',
                  color: 'var(--color-primary, #E05638)'
                }}
              >
                PostgreSQL Synced
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
              Configure page padding, design dynamic footers, customize elements, and arrange with drag & drop.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shadow-xs cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f1f5f9)'
            }}
          >
            {previewMode ? <Edit3 className="h-4 w-4 text-amber-500" /> : <Eye className="h-4 w-4 text-blue-500" />}
            <span>{previewMode ? (t('editMode') || 'Canvas Editor') : (t('livePreview') || 'Live Preview')}</span>
          </button>

          <button
            type="button"
            onClick={handleSavePage}
            disabled={saving || loading || !selectedPage}
            className="px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition shadow-lg cursor-pointer text-white disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? (t('saving') || 'Saving...') : (t('savePage') || 'Save Page Changes')}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TOASTS */}
      {toastMessage && (
        <div className="p-4 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in transition bg-emerald-500/15 border-emerald-500 text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in transition text-red-400 bg-red-500/15 border-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PAGE SELECTOR TABS */}
      <div 
        className="p-3 rounded-2xl border flex items-center gap-2 overflow-x-auto shadow-sm"
        style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
      >
        <span className="text-[11px] font-bold px-2 uppercase tracking-wider shrink-0" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
          {t('availablePages') || 'Pages'}:
        </span>
        {pages.map((p) => {
          const isSelected = p.id === selectedPageId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPage(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer border ${
                isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: isSelected ? 'var(--color-inner-dark, #0e1422)' : 'transparent',
                borderColor: isSelected ? 'var(--color-primary, #E05638)' : 'transparent',
                color: isSelected ? 'var(--color-primary, #E05638)' : 'var(--color-text, #f1f5f9)'
              }}
            >
              {p.is_default ? <Home className="h-3.5 w-3.5 text-amber-400" /> : <Globe className="h-3.5 w-3.5 opacity-60" />}
              <span>{p.title}</span>
              {p.is_default && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Default
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedPage && (
        <div className="space-y-6">
          {/* WORKSPACE SUB-TABS: "Page Elements" vs "Settings" */}
          {!previewMode && (
            <div 
              className="flex items-center gap-2 border-b pb-3"
              style={{ borderColor: 'var(--color-border, #1e293b)' }}
            >
              <button
                type="button"
                onClick={() => setActivePageTab('elements')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border ${
                  activePageTab === 'elements'
                    ? 'text-white shadow-md'
                    : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: activePageTab === 'elements' ? 'var(--color-primary, #E05638)' : 'transparent',
                  borderColor: activePageTab === 'elements' ? 'var(--color-primary, #E05638)' : 'var(--color-border, #1e293b)'
                }}
              >
                <Layers className="h-4 w-4" />
                <span>{t('pageElementsTab') || 'Page Elements & Blocks'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 text-white font-mono font-bold">
                  {selectedPage.elements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActivePageTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border ${
                  activePageTab === 'settings'
                    ? 'text-white shadow-md'
                    : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: activePageTab === 'settings' ? 'var(--color-primary, #E05638)' : 'transparent',
                  borderColor: activePageTab === 'settings' ? 'var(--color-primary, #E05638)' : 'var(--color-border, #1e293b)'
                }}
              >
                <Sliders className="h-4 w-4" />
                <span>{t('settingsTab') || 'Settings'}</span>
                {(selectedPage.footer?.enabled !== false || selectedPage.padding) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>
          )}

          {/* VIEW MODE: LIVE PREVIEW */}
          {previewMode ? (
            /* LIVE PREVIEW CANVAS */
            <div 
              className="border rounded-3xl p-8 shadow-2xl space-y-12 animate-in fade-in"
              style={{
                backgroundColor: 'var(--color-card, #0b0f17)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Live Client View Preview</span>
                </div>
                <span className="text-xs font-mono opacity-60">{selectedPage.slug}</span>
              </div>

              {/* Page Container with applied padding settings */}
              <div 
                className={`${selectedPage.padding?.maxWidth || 'max-w-7xl'} mx-auto space-y-8`}
                style={{
                  paddingTop: selectedPage.padding?.top || '2.5rem',
                  paddingBottom: selectedPage.padding?.bottom || '4rem',
                  paddingLeft: selectedPage.padding?.x || '1.5rem',
                  paddingRight: selectedPage.padding?.x || '1.5rem'
                }}
              >
                {selectedPage.elements.map((elem) => {
                  const elemBg = elem.bgColor || 'transparent';
                  const elemText = elem.textColor || 'inherit';
                  const elemBorder = elem.borderColor || 'var(--color-border, #1e293b)';
                  const elemAccent = elem.accentColor || 'var(--color-primary, #E05638)';

                  if (elem.type === 'title') {
                    const alignCls = elem.alignment === 'center' ? 'text-center' : elem.alignment === 'right' ? 'text-right' : 'text-left';
                    return (
                      <div key={elem.id} className={`space-y-2 py-4 px-6 rounded-2xl ${alignCls}`} style={{ backgroundColor: elemBg, color: elemText }}>
                        {elem.level === 'h1' ? (
                          <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title}</h1>
                        ) : elem.level === 'h3' ? (
                          <h3 className="text-xl font-bold tracking-tight">{elem.title}</h3>
                        ) : (
                          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{elem.title}</h2>
                        )}
                        {elem.subtitle && <p className="text-sm max-w-3xl mx-auto opacity-80">{elem.subtitle}</p>}
                      </div>
                    );
                  }

                  if (elem.type === 'content') {
                    return (
                      <div key={elem.id} className="p-6 rounded-2xl border space-y-2 shadow-xs" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                        {elem.title && <h3 className="text-lg font-bold" style={{ color: elemAccent }}>{elem.title}</h3>}
                        <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line">{elem.content}</p>
                      </div>
                    );
                  }

                  if (elem.type === 'column') {
                    const gridCols = elem.columnsCount === 2 ? 'sm:grid-cols-2' : elem.columnsCount === 4 ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-3';
                    return (
                      <div key={elem.id} className="space-y-4 py-2">
                        {elem.title && <h3 className="text-lg font-black text-center" style={{ color: elemAccent }}>{elem.title}</h3>}
                        <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
                          {(elem.columns || []).map((col) => (
                            <div key={col.id} className="p-5 rounded-2xl border space-y-2 shadow-xs" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                              <h4 className="text-sm font-bold" style={{ color: elemAccent }}>{col.title}</h4>
                              <p className="text-xs leading-relaxed opacity-80">{col.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (elem.type === 'picture') {
                    return (
                      <div key={elem.id} className="space-y-2 py-2 p-4 rounded-3xl" style={{ backgroundColor: elemBg }}>
                        {elem.title && <h4 className="text-sm font-bold text-center mb-2" style={{ color: elemAccent }}>{elem.title}</h4>}
                        <div className="rounded-3xl overflow-hidden border max-h-96 w-full flex items-center justify-center bg-black/30" style={{ borderColor: elemBorder }}>
                          {elem.imageUrl ? <img src={elem.imageUrl} alt={elem.altText || 'Media'} className="w-full h-auto object-cover max-h-96" /> : <div className="py-16 text-center text-xs opacity-50">No picture provided</div>}
                        </div>
                      </div>
                    );
                  }

                  if (elem.type === 'box') {
                    return (
                      <div key={elem.id} className="p-6 rounded-3xl border shadow-lg space-y-3" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                        <h3 className="text-base font-black tracking-tight" style={{ color: elemAccent }}>{elem.title}</h3>
                        <p className="text-xs leading-relaxed opacity-85">{elem.content}</p>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Dynamic Footer in Live Preview */}
              {selectedPage.footer?.enabled !== false && (
                <footer 
                  className="border-t pt-8 pb-4 space-y-6 rounded-2xl p-6"
                  style={{
                    backgroundColor: selectedPage.footer?.bgColor || 'var(--color-inner-dark, #0e1422)',
                    borderColor: selectedPage.footer?.borderColor || 'var(--color-border, #1e293b)',
                    color: selectedPage.footer?.textColor || 'var(--color-text, #f1f5f9)'
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: selectedPage.footer?.accentColor || 'var(--color-primary, #E05638)' }}>
                          <Utensils className="h-4 w-4" />
                        </div>
                        <span className="font-black text-sm">Zecratary</span>
                      </div>
                      <p className="text-xs opacity-70 max-w-sm">{selectedPage.footer?.aboutText}</p>
                    </div>

                    {(selectedPage.footer?.columns || []).map((col) => (
                      <div key={col.id} className="space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: selectedPage.footer?.accentColor || 'var(--color-primary, #E05638)' }}>{col.title}</h4>
                        <ul className="space-y-1 text-xs opacity-75">
                          {col.links.map((l) => (
                            <li key={l.id}>{l.label}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 flex flex-wrap items-center justify-between text-[11px] opacity-60" style={{ borderColor: selectedPage.footer?.borderColor || 'var(--color-border, #1e293b)' }}>
                    <span>{selectedPage.footer?.copyrightText}</span>
                    <span>Preview Canvas Mode</span>
                  </div>
                </footer>
              )}
            </div>
          ) : activePageTab === 'settings' ? (
            /* ───────────────────────────────────────────────────────────── */
            /* "SETTINGS" TAB: Basic Properties, Spacing & Padding, Footer   */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* A. PAGE BASIC PROPERTIES & ROUTING */}
              <div 
                className="border rounded-3xl p-6 shadow-xl space-y-4"
                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                      {t('pageBasicSettings') || 'Page Properties & Routing'}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      Manage the routing slug, display title, and publication status for this view.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {!selectedPage.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultHomepage(selectedPage.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer hover:bg-amber-500/10 text-amber-400 border-amber-500/30"
                      >
                        <Home className="h-3.5 w-3.5" />
                        <span>Set as Default Homepage</span>
                      </button>
                    )}

                    {!selectedPage.is_default && (
                      <button
                        type="button"
                        onClick={() => handleDeletePage(selectedPage.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer text-red-400 border-red-500/30 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Page</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      {t('pageTitle') || 'Page Title'}
                    </label>
                    <input 
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      value={selectedPage.title}
                      onChange={(e) => handleBasicPageChange('title', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border font-bold outline-none"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f1f5f9)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      {t('pageSlug') || 'URL Slug / Route'}
                    </label>
                    <input 
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      disabled={selectedPage.is_default}
                      value={selectedPage.is_default ? '/' : selectedPage.slug}
                      onChange={(e) => handleBasicPageChange('slug', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border font-mono font-bold outline-none disabled:opacity-60"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f1f5f9)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      {t('publicationStatus') || 'Publication Status'}
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleBasicPageChange('is_published', !selectedPage.is_published)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                          selectedPage.is_published ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          selectedPage.is_published ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                      <span className="text-xs font-bold">
                        {selectedPage.is_published ? (t('published') || 'Live & Published') : (t('draft') || 'Draft (Hidden)')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* B. PAGE SPACING & PADDING SETTINGS */}
              <div 
                className="border rounded-3xl p-6 shadow-xl space-y-4"
                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      <Sliders className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                      Page Spacing & Padding Settings
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      Configure top, bottom, and horizontal margins and container width for this page.
                    </p>
                  </div>

                  {/* Quick Spacing Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase opacity-60">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '1.5rem', bottom: '2.5rem', x: '1rem', maxWidth: 'max-w-6xl' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10"
                      style={{ borderColor: 'var(--color-border, #1e293b)' }}
                    >
                      Compact
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '2.5rem', bottom: '4rem', x: '1.5rem', maxWidth: 'max-w-7xl' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 text-emerald-400 border-emerald-500/30"
                    >
                      Balanced (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '4rem', bottom: '6rem', x: '2rem', maxWidth: 'max-w-7xl' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 text-amber-400 border-amber-500/30"
                    >
                      Spacious
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '0', bottom: '4rem', x: '0', maxWidth: 'max-w-full' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10"
                      style={{ borderColor: 'var(--color-border, #1e293b)' }}
                    >
                      Full-Width Flush
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
                  <div>
                    <label className="block font-bold mb-1 opacity-70">Top Padding (Clearance)</label>
                    <input 
                      type="text" 
                      value={selectedPage.padding?.top || '2.5rem'}
                      onChange={(e) => handlePaddingChange('top', e.target.value)}
                      placeholder="e.g. 2.5rem or 40px"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-70">Bottom Padding</label>
                    <input 
                      type="text" 
                      value={selectedPage.padding?.bottom || '4rem'}
                      onChange={(e) => handlePaddingChange('bottom', e.target.value)}
                      placeholder="e.g. 4rem or 64px"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-70">Horizontal Padding (X)</label>
                    <input 
                      type="text" 
                      value={selectedPage.padding?.x || '1.5rem'}
                      onChange={(e) => handlePaddingChange('x', e.target.value)}
                      placeholder="e.g. 1.5rem or 24px"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-70">Container Max Width</label>
                    <select 
                      value={selectedPage.padding?.maxWidth || 'max-w-7xl'}
                      onChange={(e) => handlePaddingChange('maxWidth', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border font-bold"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                    >
                      <option value="max-w-5xl">5XL (1024px)</option>
                      <option value="max-w-6xl">6XL (1152px)</option>
                      <option value="max-w-7xl">7XL (1280px - Default)</option>
                      <option value="max-w-full">Full Width (100% Edge-to-Edge)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* C. FOOTER SETTINGS & NAVIGATION COLUMNS */}
              <div 
                className="border rounded-3xl p-6 shadow-xl space-y-4"
                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      <PanelBottom className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                      Footer Settings & Navigation Columns
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      Configure the footer banner, multi-column navigation links, and copyright statement.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleFooterChange('enabled', !(selectedPage.footer?.enabled !== false))}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        selectedPage.footer?.enabled !== false ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        selectedPage.footer?.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-xs font-bold">
                      {selectedPage.footer?.enabled !== false ? 'Footer Enabled' : 'Footer Hidden'}
                    </span>
                  </div>
                </div>

                {selectedPage.footer?.enabled !== false && (
                  <div className="space-y-5 text-xs pt-1">
                    {/* Brand About & Copyright */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-1 opacity-70">Brand Description / About</label>
                        <textarea 
                          rows={2}
                          value={selectedPage.footer?.aboutText || ''}
                          onChange={(e) => handleFooterChange('aboutText', e.target.value)}
                          placeholder="Brief company mission or platform statement..."
                          className="w-full px-3 py-2 rounded-xl border leading-relaxed"
                          style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1 opacity-70">Copyright Statement</label>
                        <input 
                          type="text" 
                          value={selectedPage.footer?.copyrightText || ''}
                          onChange={(e) => handleFooterChange('copyrightText', e.target.value)}
                          placeholder="© 2026 Zecratary. All rights reserved."
                          className="w-full px-3 py-2 rounded-xl border font-bold"
                          style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                        />
                      </div>
                    </div>

                    {/* Footer Colors */}
                    <div 
                      className="p-4 rounded-2xl border space-y-3"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-emerald-400" />
                        <span className="font-bold text-[11px] uppercase tracking-wider">Footer Color Customization</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold mb-1 opacity-70">Footer Background</label>
                          <input 
                            type="text" 
                            placeholder="Default / CSS"
                            value={selectedPage.footer?.bgColor || ''}
                            onChange={(e) => handleFooterChange('bgColor', e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border font-mono text-xs"
                            style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold mb-1 opacity-70">Footer Text</label>
                          <input 
                            type="text" 
                            placeholder="Default / CSS"
                            value={selectedPage.footer?.textColor || ''}
                            onChange={(e) => handleFooterChange('textColor', e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border font-mono text-xs"
                            style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold mb-1 opacity-70">Footer Border</label>
                          <input 
                            type="text" 
                            placeholder="Default / CSS"
                            value={selectedPage.footer?.borderColor || ''}
                            onChange={(e) => handleFooterChange('borderColor', e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border font-mono text-xs"
                            style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold mb-1 opacity-70">Accent Highlight</label>
                          <input 
                            type="text" 
                            placeholder="Default / CSS"
                            value={selectedPage.footer?.accentColor || ''}
                            onChange={(e) => handleFooterChange('accentColor', e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border font-mono text-xs"
                            style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Navigation Columns */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] uppercase tracking-wider opacity-80">Footer Navigation Columns</span>
                        <button
                          type="button"
                          onClick={addFooterColumn}
                          className="px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 hover:bg-white/10"
                          style={{ borderColor: 'var(--color-border, #1e293b)' }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Column</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(selectedPage.footer?.columns || []).map((col, colIdx) => (
                          <div 
                            key={col.id} 
                            className="p-4 rounded-2xl border space-y-3"
                            style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                          >
                            <div className="flex items-center justify-between gap-2 border-b pb-2" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                              <input 
                                type="text"
                                value={col.title}
                                onChange={(e) => {
                                  const cols = [...(selectedPage.footer?.columns || [])];
                                  cols[colIdx].title = e.target.value;
                                  handleFooterChange('columns', cols);
                                }}
                                className="font-bold text-xs px-2 py-1 rounded-lg border w-full max-w-xs"
                                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                              />
                              <button
                                type="button"
                                onClick={() => removeFooterColumn(colIdx)}
                                className="p-1 rounded text-red-400 hover:bg-red-500/10 cursor-pointer"
                                title="Remove Column"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Column Links */}
                            <div className="space-y-2">
                              {col.links.map((link, linkIdx) => (
                                <div key={link.id} className="flex items-center gap-2">
                                  <input 
                                    type="text"
                                    placeholder="Link Label"
                                    value={link.label}
                                    onChange={(e) => {
                                      const cols = [...(selectedPage.footer?.columns || [])];
                                      cols[colIdx].links[linkIdx].label = e.target.value;
                                      handleFooterChange('columns', cols);
                                    }}
                                    className="px-2 py-1 rounded-lg border text-xs w-1/2"
                                    style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                                  />
                                  <input 
                                    type="text"
                                    placeholder="URL (e.g. /about)"
                                    value={link.url}
                                    onChange={(e) => {
                                      const cols = [...(selectedPage.footer?.columns || [])];
                                      cols[colIdx].links[linkIdx].url = e.target.value;
                                      handleFooterChange('columns', cols);
                                    }}
                                    className="px-2 py-1 rounded-lg border text-xs font-mono w-1/2"
                                    style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeFooterLink(colIdx, linkIdx)}
                                    className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addFooterLink(colIdx)}
                                className="text-[10px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 pt-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Link to this column</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────── */
            /* "ELEMENTS & BLOCKS" TAB: Palette Toolbar + Canvas Reorder     */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div 
                className="p-4 rounded-3xl border shadow-md flex flex-wrap items-center justify-between gap-3"
                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                  <span className="text-xs font-black uppercase tracking-wider">{t('addElement') || 'Insert Page Element'}:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddElement('recipe')}
                    className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition cursor-pointer shadow-xs hover:bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)' }}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>+ Recipe Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddElement('subscription')}
                    className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition cursor-pointer shadow-xs hover:bg-blue-500/10 text-blue-400 border-blue-500/30"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)' }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>+ Plan Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddElement('title')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer hover:bg-white/5"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    <Type className="h-3.5 w-3.5 text-blue-400" />
                    <span>+ Title</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddElement('content')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer hover:bg-white/5"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    <AlignLeft className="h-3.5 w-3.5 text-purple-400" />
                    <span>+ Content</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddElement('column')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer hover:bg-white/5"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    <Columns className="h-3.5 w-3.5 text-amber-400" />
                    <span>+ Multi-Column</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddElement('picture')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer hover:bg-white/5"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                    <span>+ Picture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddElement('box')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer hover:bg-white/5"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    <Layers className="h-3.5 w-3.5 text-rose-400" />
                    <span>+ Box / Card</span>
                  </button>
                </div>
              </div>

              {/* Elements Draggable List */}
              <div className="space-y-3">
                {selectedPage.elements.length === 0 ? (
                  <div 
                    className="p-12 text-center rounded-3xl border border-dashed space-y-3"
                    style={{ borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    <LayoutTemplate className="h-10 w-10 mx-auto opacity-30" />
                    <p className="text-sm font-bold">This page does not contain any layout elements yet.</p>
                    <p className="text-xs opacity-60">Click on any block type in the toolbar above to append titles, recipe grids, subscription plans, columns, or media.</p>
                  </div>
                ) : (
                  selectedPage.elements.map((elem, index) => {
                    const isExpanded = expandedElementId === elem.id;
                    const isDragged = draggedIndex === index;

                    return (
                      <div
                        key={elem.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={handleDrop}
                        onDragEnd={handleDrop}
                        className={`rounded-2xl border transition-all duration-150 ${isDragged ? 'opacity-40 scale-[0.99] border-blue-500' : 'opacity-100'}`}
                        style={{
                          backgroundColor: 'var(--color-card, #0b0f17)',
                          borderColor: isExpanded ? 'var(--color-primary, #E05638)' : 'var(--color-border, #1e293b)'
                        }}
                      >
                        <div className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-200">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}>
                              {elem.type}
                            </span>
                            <span className="text-xs font-bold truncate max-w-xs sm:max-w-md">
                              {elem.title || `Unnamed ${elem.type}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => moveElement(index, 'up')} disabled={index === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => moveElement(index, 'down')} disabled={index === selectedPage.elements.length - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDuplicateElement(index)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDeleteElement(index)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400 cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setExpandedElementId(isExpanded ? null : elem.id)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer hover:bg-white/5" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}>
                              {isExpanded ? 'Done' : 'Configure'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-5 border-t space-y-4 text-xs" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}>
                            <div>
                              <label className="block font-bold mb-1 opacity-70">Element Title</label>
                              <input 
                                type="text" 
                                value={elem.title || ''}
                                onChange={(e) => handleUpdateElement(index, { title: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border font-bold"
                                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                              />
                            </div>

                            {(elem.type === 'title' || elem.type === 'content' || elem.type === 'box') && (
                              <div>
                                <label className="block font-bold mb-1 opacity-70">Content / Subtitle</label>
                                <textarea 
                                  rows={3}
                                  value={elem.content || elem.subtitle || ''}
                                  onChange={(e) => handleUpdateElement(index, elem.type === 'title' ? { subtitle: e.target.value } : { content: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border leading-relaxed"
                                  style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
