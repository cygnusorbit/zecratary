'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ChefHat,
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
  Settings,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getSiteConfig } from '@/lib/siteConfig';

export type ElementType = 'title' | 'content' | 'column' | 'picture' | 'box' | 'recipe' | 'subscription';

export interface PagePaddingSettings {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
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
  name?: string;
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

  // Preview Enhancements: Viewport Switcher & Simulated Mode
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewIsDark, setPreviewIsDark] = useState<boolean>(true);

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
  const [siteBranding, setSiteBranding] = useState<{
    siteName: string;
    titlebarEmoji: string;
    titlebarImage: string;
  }>({
    siteName: 'Zecratary',
    titlebarEmoji: '🍳',
    titlebarImage: '',
  });

  const fetchSiteBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const payload = data.settings || data;
        setSiteBranding({
          siteName: payload.siteName || payload.site_name || 'Zecratary',
          titlebarEmoji: payload.titlebarEmoji || payload.titlebar_emoji || '🍳',
          titlebarImage: payload.titlebarImage || payload.titlebar_image || '',
        });
        return;
      }
    } catch (_) {}

    try {
      const cfg = getSiteConfig();
      if (cfg) {
        setSiteBranding({
          siteName: cfg.siteName || 'Zecratary',
          titlebarEmoji: cfg.titlebarEmoji || '🍳',
          titlebarImage: cfg.titlebarImage || '',
        });
      }
    } catch (_) {}
  }, []);

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
            clone.padding = { top: '2.5rem', bottom: '4rem', left: '1.5rem', right: '1.5rem', x: '1.5rem', maxWidth: 'max-w-7xl' };
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
    fetchSiteBranding();
    fetchLivePlans();
    fetchAllSavedRecipes();
  }, [fetchPages, fetchSiteBranding, fetchLivePlans, fetchAllSavedRecipes]);

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const target = pages.find((p) => p.id === id);
    if (target) {
      const clone = JSON.parse(JSON.stringify(target));
      if (!clone.padding) clone.padding = { top: '2.5rem', bottom: '4rem', left: '1.5rem', right: '1.5rem', x: '1.5rem', maxWidth: 'max-w-7xl' };
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
          ...(prev.padding || { top: '2.5rem', bottom: '4rem', left: '1.5rem', right: '1.5rem', x: '1.5rem', maxWidth: 'max-w-7xl' }),
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
          localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        }
      } else {
        setErrorMessage(data.error || 'Failed to save page configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while persisting page.');
    } finally {
      setSaving(false);
    }
  };

  // Add New Page Handler
  const handleCreateNewPage = async () => {
    if (!newPageTitle.trim()) {
      alert('Please enter a valid page title.');
      return;
    }
    let slug = newPageSlug.trim();
    if (!slug) {
      slug = '/' + newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (!slug.startsWith('/')) slug = `/${slug}`;

    const newPageObj: FrontendPage = {
      id: `page_${Date.now()}`,
      title: newPageTitle.trim(),
      slug,
      description: newPageDesc.trim(),
      is_default: false,
      is_published: true,
      elements: [
        {
          id: `elem_title_${Date.now()}`,
          type: 'title',
          title: newPageTitle.trim(),
          subtitle: newPageDesc.trim() || 'Welcome to this custom page.',
          level: 'h1',
          alignment: 'center'
        },
        {
          id: `elem_content_${Date.now()}`,
          type: 'content',
          title: 'Introduction',
          content: 'Customize the contents of this new page using the modular element editor.',
          alignment: 'left'
        }
      ],
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
        aboutText: 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.',
        copyrightText: '© 2026 Zecratary. All rights reserved.',
        columns: [
          {
            id: 'col_platform',
            title: 'Platform',
            links: [
              { id: 'l_1', label: 'AI Chef', url: '/chef' },
              { id: 'l_2', label: 'Saved Recipes', url: '/saved' }
            ]
          }
        ]
      }
    };

    try {
      setSaving(true);
      const res = await fetch('/api/admin/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_page', page: newPageObj })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewPageTitle('');
        setNewPageSlug('');
        setNewPageDesc('');
        setToastMessage('New page created successfully.');
        setTimeout(() => setToastMessage(null), 4000);
        await fetchPages(newPageObj.id);
        setActivePageTab('elements');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
          localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        }
      } else {
        alert(data.error || 'Failed to create page.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating page.');
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
          localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        }
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_frontend_pages_updated'));
          localStorage.setItem('zecratary_frontend_updated_at', Date.now().toString());
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting page.');
    } finally {
      setSaving(false);
    }
  };

  const getSafeHostname = (urlStr?: string | null) => {
    if (!urlStr || typeof urlStr !== 'string') return 'source link';
    try {
      const normalized = urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`;
      return new URL(normalized).hostname.replace('www.', '');
    } catch {
      return urlStr.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || 'source link';
    }
  };

  const calculateScaledAmount = (rawAmt: any, baseServings: number, currentServings: number) => {
    if (!rawAmt || isNaN(Number(rawAmt))) return rawAmt;
    const num = Number(rawAmt);
    const scaled = (num / (baseServings || 2)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
  };

  const renderDynamicBrandLogo = (sizeCls = 'w-8 h-8', iconCls = 'h-4 w-4') => {
    if (siteBranding.titlebarImage) {
      return (
        <img 
          src={siteBranding.titlebarImage} 
          alt={siteBranding.siteName} 
          className={`${sizeCls} rounded-xl object-contain shadow-md`}
        />
      );
    }
    if (siteBranding.titlebarEmoji) {
      return (
        <div 
          className={`${sizeCls} rounded-xl flex items-center justify-center text-white shadow-md text-base`}
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <span>{siteBranding.titlebarEmoji}</span>
        </div>
      );
    }
    return (
      <div 
        className={`${sizeCls} rounded-xl flex items-center justify-center text-white`}
        style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
      >
        <ChefHat className={iconCls} />
      </div>
    );
  };

  const publishedMenuPages = pages.filter((p) => p.is_published);

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
              Configure page properties, padding clearance, dynamic footers, and modular drag & drop blocks.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* ADD NEW PAGE BUTTON */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition shadow-xs cursor-pointer hover:bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)' }}
          >
            <Plus className="h-4 w-4" />
            <span>{t('addNewPageBtn') || 'Add New Page'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shadow-xs cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: previewMode ? 'var(--color-primary, #E05638)' : 'var(--color-card, #0b0f17)',
              borderColor: previewMode ? 'var(--color-primary, #E05638)' : 'var(--color-border, #1e293b)',
              color: previewMode ? '#ffffff' : 'var(--color-text, #f1f5f9)'
            }}
          >
            {previewMode ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4 text-blue-500" />}
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

      {/* PAGE SELECTOR TABS WITH INLINE ADD PAGE BUTTON */}
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

        {/* INLINE ADD NEW PAGE BUTTON */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer border border-dashed border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('addPage') || 'Add New Page'}</span>
        </button>
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div 
                className="p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-md"
                style={{
                  backgroundColor: 'var(--color-card, #0b0f17)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Live Client Preview:
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-slate-700">
                    {selectedPage.slug}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="border p-0.5 rounded-xl flex items-center gap-1 bg-black/30" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('desktop')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        previewViewport === 'desktop' ? 'bg-[var(--color-primary,#E05638)] text-white' : 'opacity-60 hover:opacity-100'
                      }`}
                      title="Desktop (100% width)"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[10px]">Desktop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewViewport('tablet')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        previewViewport === 'tablet' ? 'bg-[var(--color-primary,#E05638)] text-white' : 'opacity-60 hover:opacity-100'
                      }`}
                      title="Tablet (768px frame)"
                    >
                      <Tablet className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[10px]">Tablet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewViewport('mobile')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        previewViewport === 'mobile' ? 'bg-[var(--color-primary,#E05638)] text-white' : 'opacity-60 hover:opacity-100'
                      }`}
                      title="Mobile (390px frame)"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[10px]">Mobile</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewIsDark(!previewIsDark)}
                    className="p-2 rounded-xl border cursor-pointer hover:bg-white/5 transition"
                    style={{ borderColor: 'var(--color-border, #1e293b)' }}
                    title={previewIsDark ? 'Switch Preview to Day Mode' : 'Switch Preview to Night Mode'}
                  >
                    {previewIsDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-400" />}
                  </button>

                  <a
                    href={selectedPage.is_default ? '/' : selectedPage.slug}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border cursor-pointer hover:bg-white/5 transition text-xs font-bold flex items-center gap-1 text-[var(--color-primary)]"
                    style={{ borderColor: 'var(--color-border, #1e293b)' }}
                    title="Open Live URL in New Window"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* SIMULATED DEVICE FRAME CONTAINER */}
              <div className="flex justify-center w-full transition-all duration-300">
                <div 
                  className={`w-full transition-all duration-300 rounded-3xl border shadow-2xl overflow-hidden ${
                    previewViewport === 'mobile' 
                      ? 'max-w-[390px] border-4 border-slate-700 shadow-2xl' 
                      : previewViewport === 'tablet' 
                      ? 'max-w-[768px] border-4 border-slate-700 shadow-2xl' 
                      : 'max-w-full'
                  }`}
                  style={{
                    backgroundColor: previewIsDark ? '#070b13' : '#f8fafc',
                    color: previewIsDark ? '#f1f5f9' : '#0f172a',
                    borderColor: 'var(--color-border, #1e293b)'
                  }}
                >
                  <div 
                    className="h-14 border-b px-4 flex items-center justify-between transition-colors"
                    style={{
                      backgroundColor: previewIsDark ? 'rgba(11, 15, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                      borderColor: 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {renderDynamicBrandLogo('w-8 h-8', 'h-4 w-4')}
                      <span className="font-black text-sm tracking-tight">
                        {siteBranding.siteName || 'Zecratary'}
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
                      {publishedMenuPages.slice(0, 4).map((p) => (
                        <span key={p.id} className="opacity-70 px-2 py-1 rounded">
                          {p.title}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-3 py-1 rounded-xl bg-[var(--color-primary,#E05638)] text-white shadow-xs">
                        Dashboard
                      </span>
                    </div>
                  </div>

                  <div 
                    className={`${selectedPage.padding?.maxWidth || 'max-w-7xl'} mx-auto w-full space-y-10 sm:space-y-12 transition-all`}
                    style={{
                      paddingTop: selectedPage.padding?.top || '2.5rem',
                      paddingBottom: selectedPage.padding?.bottom || '4rem',
                      paddingLeft: selectedPage.padding?.left || selectedPage.padding?.x || '1.5rem',
                      paddingRight: selectedPage.padding?.right || selectedPage.padding?.x || '1.5rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    {selectedPage.elements.length === 0 ? (
                      <div className="py-20 text-center opacity-50 space-y-2">
                        <Layers className="h-10 w-10 mx-auto opacity-30" />
                        <p className="text-sm font-bold">This page does not contain any layout elements yet.</p>
                      </div>
                    ) : (
                      selectedPage.elements.map((elem) => {
                        const elemBg = elem.bgColor || 'transparent';
                        const elemText = elem.textColor || 'inherit';
                        const elemBorder = elem.borderColor || 'var(--color-border, #1e293b)';
                        const elemAccent = elem.accentColor || 'var(--color-primary, #E05638)';

                        if (elem.type === 'title') {
                          const alignCls = elem.alignment === 'center' ? 'text-center' : elem.alignment === 'right' ? 'text-right' : 'text-left';
                          return (
                            <div key={elem.id} className={`space-y-2 py-4 px-4 rounded-2xl ${alignCls}`} style={{ backgroundColor: elemBg, color: elemText }}>
                              {elem.level === 'h1' ? (
                                <h1 className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title}</h1>
                              ) : (
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{elem.title}</h2>
                              )}
                              {elem.subtitle && <p className="text-xs sm:text-sm max-w-3xl mx-auto opacity-80">{elem.subtitle}</p>}
                            </div>
                          );
                        }

                        if (elem.type === 'content') {
                          return (
                            <div key={elem.id} className="p-6 sm:p-7 rounded-3xl border space-y-2.5 shadow-sm" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                              {elem.title && <h3 className="text-lg sm:text-xl font-black" style={{ color: elemAccent }}>{elem.title}</h3>}
                              <p className="text-xs sm:text-sm leading-relaxed opacity-90 whitespace-pre-line">{elem.content}</p>
                            </div>
                          );
                        }

                        if (elem.type === 'column') {
                          const gridCols = elem.columnsCount === 2 ? 'sm:grid-cols-2' : elem.columnsCount === 4 ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-3';
                          return (
                            <div key={elem.id} className="space-y-4 py-2">
                              {elem.title && <h3 className="text-xl sm:text-2xl font-black text-center" style={{ color: elemAccent }}>{elem.title}</h3>}
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
                            <div key={elem.id} className="space-y-2.5 py-2 p-2 rounded-3xl" style={{ backgroundColor: elemBg }}>
                              {elem.title && <h4 className="text-base font-bold text-center mb-1" style={{ color: elemAccent }}>{elem.title}</h4>}
                              <div className="rounded-3xl overflow-hidden border max-h-[460px] w-full flex items-center justify-center bg-black/40 shadow-xl" style={{ borderColor: elemBorder }}>
                                {elem.imageUrl ? (
                                  <img src={elem.imageUrl} alt={elem.altText || 'Media'} className="w-full h-auto object-cover max-h-[460px]" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="py-16 text-center text-xs opacity-50">No picture provided</div>
                                )}
                              </div>
                              {elem.caption && <p className="text-center text-xs italic opacity-75">{elem.caption}</p>}
                            </div>
                          );
                        }

                        if (elem.type === 'box') {
                          return (
                            <div key={elem.id} className="p-6 sm:p-8 rounded-3xl border shadow-lg space-y-3" style={{ backgroundColor: elem.bgColor || (elem.boxStyle === 'highlight' ? 'rgba(224, 86, 56, 0.08)' : 'var(--color-inner-dark, #0e1422)'), borderColor: elemBorder, color: elemText }}>
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title}</h3>
                                {elem.badge && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    {elem.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm leading-relaxed opacity-90 max-w-3xl">{elem.content}</p>
                              {elem.buttonText && (
                                <div className="pt-1">
                                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white shadow-md cursor-pointer" style={{ backgroundColor: elemAccent }}>
                                    <span>{elem.buttonText}</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (elem.type === 'recipe') {
                          let list = savedRecipesList;
                          if (elem.recipeCategoryFilter && elem.recipeCategoryFilter !== 'all') {
                            const cat = elem.recipeCategoryFilter.toLowerCase().trim();
                            list = list.filter((r) => (r.category || r.recipeType || '').toLowerCase().includes(cat));
                          }
                          const totalCount = list.length;
                          const itemsPerPage = elem.recipeLimit ? Number(elem.recipeLimit) : 6;
                          const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
                          const currentPage = Math.min(Math.max(1, recipeElementPages[elem.id] || 1), totalPages);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
                          const paginatedSlice = list.slice(startIndex, endIndex);

                          const density = elem.recipeGridDensity || 3;
                          const gridColsCls = density === 2 ? 'grid-cols-1 sm:grid-cols-2' : density === 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

                          return (
                            <div key={elem.id} className="p-6 sm:p-7 rounded-3xl border shadow-lg space-y-6" style={{ backgroundColor: elem.bgColor || 'var(--color-card, #0b0f17)', borderColor: elemBorder, color: elemText }}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: elemBorder }}>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5" style={{ borderColor: elemAccent, color: elemAccent }}>
                                      <Bookmark className="h-3 w-3" />
                                      Community Recipes
                                    </span>
                                    <span className="text-xs font-bold opacity-60">({totalCount} dishes)</span>
                                  </div>
                                  <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5" style={{ color: elemAccent }}>
                                    {elem.title || 'Community Recipes Gallery'}
                                  </h3>
                                </div>
                              </div>

                              <div className={`grid ${gridColsCls} gap-4`}>
                                {paginatedSlice.map((r) => (
                                  <div
                                    key={r.id}
                                    onClick={() => {
                                      setActiveRecipeModal(r);
                                      setModalServingsMultiplier(1);
                                      setModalCompletedSteps([]);
                                      setModalFontSizeScale(100);
                                    }}
                                    className="border rounded-2xl overflow-hidden transition cursor-pointer group shadow-sm hover:shadow-md relative flex flex-col justify-between"
                                    style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder }}
                                  >
                                    <div>
                                      <div className="relative h-40 w-full overflow-hidden bg-black/20">
                                        <img src={r.imageUrl || r.image || '/uploads/recipes/default.jpg'} alt={r.title || r.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                      </div>
                                      <div className="p-3.5 space-y-1">
                                        <h4 className="font-bold text-xs leading-snug line-clamp-2">{r.title || r.name}</h4>
                                      </div>
                                    </div>

                                    <div className="px-3.5 pb-3 pt-0 flex items-center justify-between gap-1 border-t mt-2 pt-2" style={{ borderColor: elemBorder }}>
                                      <span className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: elemAccent }}>
                                        {r.category || r.recipeType || 'Main Dish'}
                                      </span>
                                      <span className="text-[10px] flex items-center gap-1 font-semibold opacity-75">
                                        <Clock className="h-3 w-3" style={{ color: elemAccent }}/> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 10)}m
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        if (elem.type === 'subscription') {
                          const filteredPlans = elem.planSlug && elem.planSlug !== 'all' ? availablePlans.filter((p) => p.slug === elem.planSlug) : availablePlans;
                          const interval = planPreviewInterval;

                          return (
                            <div key={elem.id} className="p-6 sm:p-7 rounded-3xl border shadow-lg space-y-5" style={{ backgroundColor: elem.bgColor || 'var(--color-card, #0b0f17)', borderColor: elemBorder, color: elemText }}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: elemBorder }}>
                                <div>
                                  <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title || 'Choose Your Culinary Plan'}</h3>
                                </div>
                                <div className="rounded-full p-1 border shadow-xs flex items-center bg-black/30" style={{ borderColor: elemBorder }}>
                                  <button type="button" onClick={() => setPlanPreviewInterval('MONTH')} className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${interval === 'MONTH' ? 'bg-[var(--color-primary,#E05638)] text-white' : 'opacity-70'}`}>Monthly</button>
                                  <button type="button" onClick={() => setPlanPreviewInterval('YEAR')} className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${interval === 'YEAR' ? 'bg-[var(--color-primary,#E05638)] text-white' : 'opacity-70'}`}>Annual</button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto pt-1">
                                {filteredPlans.map((plan) => {
                                  const isAnnual = interval === 'YEAR';
                                  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

                                  return (
                                    <div key={plan.id} className="rounded-3xl border-2 p-5 sm:p-6 relative flex flex-col justify-between space-y-4 shadow-md" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: plan.isFree ? elemBorder : elemAccent }}>
                                      <div className="space-y-3">
                                        <h4 className="text-xl font-black tracking-tight" style={{ color: elemAccent }}>{plan.name}</h4>
                                        <div className="py-2 border-y" style={{ borderColor: elemBorder }}>
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black" style={{ color: elemAccent }}>{plan.isFree ? 'Free' : `$${price.toFixed(2)}`}</span>
                                            {!plan.isFree && <span className="text-xs opacity-60">/{isAnnual ? 'year' : 'month'}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })
                    )}
                  </div>

                  {selectedPage.footer?.enabled !== false && (
                    <footer 
                      className="border-t pt-8 pb-5 px-6 sm:px-8 space-y-6 mt-12 transition-colors"
                      style={{
                        backgroundColor: selectedPage.footer?.bgColor || (previewIsDark ? '#0b0f17' : '#ffffff'),
                        borderColor: selectedPage.footer?.borderColor || 'var(--color-border, #1e293b)',
                        color: selectedPage.footer?.textColor || (previewIsDark ? '#f1f5f9' : '#0f172a')
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {renderDynamicBrandLogo('w-8 h-8', 'h-4 w-4')}
                        <span className="font-black text-sm">Zecratary</span>
                      </div>
                      <p className="text-xs opacity-75 max-w-sm">{selectedPage.footer?.aboutText}</p>
                    </footer>
                  )}
                </div>
              </div>
            </div>
          ) : activePageTab === 'elements' ? (
            /* ───────────────────────────────────────────────────────────── */
            /* "PAGE ELEMENTS & BLOCKS" TAB: BASIC SETTINGS + BLOCKS CANVAS  */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* PAGE BASIC PROPERTIES & ROUTING (MOVED HERE AS REQUESTED) */}
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

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                      {t('pageMetaDescription') || 'SEO & Meta Description'}
                    </label>
                    <input 
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      value={selectedPage.description || ''}
                      onChange={(e) => handleBasicPageChange('description', e.target.value)}
                      placeholder="Summarize this page for search indices and social sharing preview..."
                      className="w-full px-3.5 py-2 rounded-xl text-xs border font-medium outline-none"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f1f5f9)' }}
                    />
                  </div>
                </div>
              </div>

              {/* ELEMENT PALETTE TOOLBAR */}
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
                {selectedPage.elements.map((elem, index) => {
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
                })}
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────── */
            /* "SETTINGS" TAB: Spacing & Padding, Footer Settings            */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* PAGE SPACING & PADDING SETTINGS */}
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

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase opacity-60">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '1.5rem', bottom: '2.5rem', left: '1rem', right: '1rem', x: '1rem', maxWidth: 'max-w-6xl' }
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
                        padding: { top: '2.5rem', bottom: '4rem', left: '1.5rem', right: '1.5rem', x: '1.5rem', maxWidth: 'max-w-7xl' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 text-emerald-400 border-emerald-500/30"
                    >
                      Balanced (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '4rem', bottom: '6rem', left: '2.5rem', right: '2.5rem', x: '2.5rem', maxWidth: 'max-w-7xl' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 text-amber-400 border-amber-500/30"
                    >
                      Spacious
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPage({
                        ...selectedPage,
                        padding: { top: '0', bottom: '4rem', left: '0', right: '0', x: '0', maxWidth: 'max-w-full' }
                      })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10"
                      style={{ borderColor: 'var(--color-border, #1e293b)' }}
                    >
                      Full-Width Flush
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs pt-1">
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
                    <label className="block font-bold mb-1 opacity-70">Left Padding</label>
                    <input 
                      type="text" 
                      value={selectedPage.padding?.left || selectedPage.padding?.x || '1.5rem'}
                      onChange={(e) => {
                        handlePaddingChange('left', e.target.value);
                        handlePaddingChange('x', e.target.value);
                      }}
                      placeholder="e.g. 1.5rem or 24px"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold"
                      style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-70">Right Padding</label>
                    <input 
                      type="text" 
                      value={selectedPage.padding?.right || selectedPage.padding?.x || '1.5rem'}
                      onChange={(e) => handlePaddingChange('right', e.target.value)}
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

              {/* FOOTER SETTINGS & NAVIGATION COLUMNS */}
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
          )}
        </div>
      )}

      {/* CREATE NEW PAGE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div 
            className="w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f1f5f9)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} />
                <h3 className="text-base font-black">Create New Frontend Page</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="text-sm font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Page Title</label>
                <input 
                  type="text"
                  placeholder="e.g. About Us, Features, Pricing"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug('/' + e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">URL Slug</label>
                <input 
                  type="text"
                  placeholder="/about"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Description (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="Brief description for SEO and page metadata..."
                  value={newPageDesc}
                  onChange={(e) => setNewPageDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: 'var(--color-border, #1e293b)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-white/5 cursor-pointer"
                style={{ borderColor: 'var(--color-border, #1e293b)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewPage}
                disabled={saving || !newPageTitle.trim()}
                className="px-5 py-2 rounded-xl text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              >
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
