'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ChefHat, 
  Sparkles, 
  Clock, 
  Flame, 
  Utensils, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Bookmark, 
  Users, 
  Star, 
  X, 
  Heart, 
  Coins, 
  ExternalLink, 
  Menu, 
  Sun, 
  Moon, 
  Globe, 
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  Sliders,
  PanelBottom
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { getSiteConfig, DEFAULT_SITE_NAME, DEFAULT_SITE_ICON } from '@/lib/siteConfig';
import { useTranslation } from '@/components/LanguageProvider';

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
  source_url?: string;
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
    descriptionMonthly: 'Essential AI cooking quota and pantry tracking for home cooks.',
    descriptionAnnual: 'Essential AI cooking quota and pantry tracking for home cooks.',
    allowedAiModels: ['gemini-3.5-flash-lite', 'gpt-3.5-turbo'],
    features: ['5 AI-powered recipes per month', 'Personal recipe library', 'Automated shopping list creation'],
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
    monthlyBadge: 'Most Popular',
    annualBadge: 'Save 44%',
    trialBadge: '7-Day Free Trial',
    descriptionMonthly: 'Complete culinary intelligence suite with unlimited AI recipes and deep macro telemetry.',
    descriptionAnnual: 'Best value - all premium culinary features, billed annually.',
    allowedAiModels: ['gemini-3.6-flash', 'gpt-4o'],
    features: ['Unlimited AI-powered recipe generation', 'Macro & vitamin nutrition breakdown', 'Priority Chef processing & cloud sync'],
    isFree: false
  }
];

export default function DynamicHomePage() {
  const { t, locale, setLanguage } = useTranslation();
  const params = useParams();
  const rawSlug = params?.slug ? (typeof params.slug === 'string' ? params.slug : params.slug[0]) : '';
  const routeSlug = rawSlug ? (rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`) : '/';

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [siteBranding, setSiteBranding] = useState<{
    siteName: string;
    titlebarEmoji: string;
    titlebarImage: string;
    tagline: string;
  }>({
    
    siteName: 'Zecratary',
    titlebarEmoji: '🍳',
    titlebarImage: '',
    tagline: 'Culinary AI',
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
          tagline: payload.tagline || payload.siteTagline || payload.site_tagline || 'Culinary AI',
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
          tagline: (cfg as any).tagline || (cfg as any).siteTagline || 'Culinary AI',
        });
      }
    } catch (_) {}
  }, []);
  const [allPages, setAllPages] = useState<FrontendPage[]>([]);
  const [activePage, setActivePage] = useState<FrontendPage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Dynamic Catalogs
  const [availablePlans, setAvailablePlans] = useState<PlanCatalog[]>(DEFAULT_FALLBACK_PLANS);
  const [allRecipesList, setAllRecipesList] = useState<SavedRecipeRecord[]>([]);
  const [planBillingInterval, setPlanBillingInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [recipeElementPages, setRecipeElementPages] = useState<Record<string, number>>({});

  // Recipe Modal
  const [activeRecipeModal, setActiveRecipeModal] = useState<SavedRecipeRecord | null>(null);
  const [modalServingsMultiplier, setModalServingsMultiplier] = useState<number>(1);
  const [modalCompletedSteps, setModalCompletedSteps] = useState<number[]>([]);
  const [modalFontSizeScale, setModalFontSizeScale] = useState<number>(100);

  // Sync Theme State & Body Class
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mode = localStorage.getItem('zecratary_theme_mode');
      const dark = mode !== 'light';
      setIsDarkMode(dark);
      document.documentElement.classList.toggle('dark', dark);
      document.body.classList.add('is-homepage-view');
      return () => {
        document.body.classList.remove('is-homepage-view');
      };
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zecratary_theme_mode', nextDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', nextDark);
      window.dispatchEvent(new Event('zecratary_theme_mode_changed'));
    }
  };

  // 1. Fetch Dynamic Pages from /api/admin/frontend
  const fetchFrontendSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/frontend', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pages)) {
          setAllPages(data.pages);

          let targetPage: FrontendPage | null = null;
          if (routeSlug && routeSlug !== '/') {
            targetPage = data.pages.find((p: FrontendPage) => p.slug === routeSlug) || null;
          }
          if (!targetPage) {
            targetPage = data.pages.find((p: FrontendPage) => p.is_default) || 
                         data.pages.find((p: FrontendPage) => p.slug === '/') || 
                         data.pages[0] || null;
          }
          setActivePage(targetPage);
          if (targetPage && typeof document !== 'undefined') {
            document.title = `${targetPage.title} - Zecratary`;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load frontend settings:', err);
    } finally {
      setLoading(false);
    }
  }, [routeSlug]);

  // 2. Fetch Subscription Plans
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
            descriptionMonthly: p.descriptionMonthly || p.description || 'Full kitchen intelligence access',
            descriptionAnnual: p.descriptionAnnual || 'Best value, billed annually',
            allowedAiModels: Array.isArray(p.allowedAiModels) ? p.allowedAiModels : ['gemini-3.6-flash', 'gpt-4o'],
            features: Array.isArray(p.features) ? p.features : ['AI-Powered Recipe Generation', 'Pantry Sync'],
            isFree: Boolean(p.isFree || (Number(p.monthlyPriceDollars) === 0 && Number(p.annualPriceDollars) === 0))
          }));
          setAvailablePlans(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // 3. Fetch Recipes from PostgreSQL
  const fetchAllRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/frontend?all_recipes=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.recipes)) {
          setAllRecipesList(data.recipes);
          return;
        }
      }
    } catch (_) {}

    // Fallback to /api/recipes/saved
    try {
      const res2 = await fetch('/api/recipes/saved', { cache: 'no-store' });
      if (res2.ok) {
        const data2 = await res2.json();
        const list2 = Array.isArray(data2) ? data2 : (data2?.recipes || []);
        if (Array.isArray(list2) && list2.length > 0) {
          setAllRecipesList(list2);
        }
      }
    } catch (_) {}
  }, []);

  // Hydration & Event Listeners
  useEffect(() => {
    initAuthStorage();
    setCurrentUser(getCurrentUser());
    fetchSiteBranding();
    fetchFrontendSettings();
    fetchLivePlans();
    fetchAllRecipes();

    const handleSync = (e?: any) => {
      if (e?.detail) {
        const detail = e.detail;
        if (detail.siteName || detail.titlebarEmoji || detail.titlebarImage !== undefined || detail.tagline !== undefined || detail.siteTagline !== undefined) {
          setSiteBranding((prev) => ({
            ...prev,
            siteName: detail.siteName || detail.site_name || prev.siteName,
            titlebarEmoji: detail.titlebarEmoji || detail.titlebar_emoji || prev.titlebarEmoji,
            titlebarImage: detail.titlebarImage !== undefined ? detail.titlebarImage : prev.titlebarImage,
            tagline: detail.tagline !== undefined ? detail.tagline : (detail.siteTagline !== undefined ? detail.siteTagline : prev.tagline)
          }));
        }
      }
      fetchSiteBranding();
      fetchFrontendSettings();
      fetchAllRecipes();
      fetchLivePlans();
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener('zecratary_frontend_pages_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_theme_updated', handleSync);
    window.addEventListener('zecratary_site_config_updated', handleSync);
    window.addEventListener('zecratary_site_settings_changed', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('zecratary_frontend_pages_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_theme_updated', handleSync);
      window.removeEventListener('zecratary_site_config_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchFrontendSettings, fetchLivePlans, fetchAllRecipes]);

  // Scaled Recipe Amount Helper
  const calculateScaledAmount = (rawAmt: any, baseServings: number, currentServings: number) => {
    if (!rawAmt || isNaN(Number(rawAmt))) return rawAmt;
    const num = Number(rawAmt);
    const scaled = (num / (baseServings || 2)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
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

  const renderDynamicBrandLogo = (sizeCls = 'w-10 h-10', iconCls = 'w-5 h-5') => {
    if (siteBranding.titlebarImage) {
      return (
        <img 
          src={siteBranding.titlebarImage} 
          alt={siteBranding.siteName} 
          className={`${sizeCls} rounded-2xl object-contain shadow-md`}
        />
      );
    }
    if (siteBranding.titlebarEmoji) {
      return (
        <div 
          className={`${sizeCls} rounded-2xl flex items-center justify-center text-white shadow-md text-xl`}
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          <span>{siteBranding.titlebarEmoji}</span>
        </div>
      );
    }
    return (
      <div 
        className={`${sizeCls} rounded-2xl flex items-center justify-center text-white shadow-md`}
        style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
      >
        <ChefHat className={iconCls} />
      </div>
    );
  };

  const menuPages = allPages.filter((p) => p.is_published);

  // Resolved Page Padding & Margin Values from /admin/frontend
  const padTop = activePage?.padding?.top || '2.5rem';
  const padBottom = activePage?.padding?.bottom || '4rem';
  const padLeft = activePage?.padding?.left || activePage?.padding?.x || '1.5rem';
  const padRight = activePage?.padding?.right || activePage?.padding?.x || '1.5rem';
  const maxWCls = activePage?.padding?.maxWidth || 'max-w-7xl';

  return (
    <div 
      id="zecratary-homepage-root"
      className="min-h-screen w-full transition-colors duration-200 flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f1f5f9)'
      }}
    >
      {/* Global CSS Reset for Homepage: Remove sidebar offsets & top clearance from layout shell */}
      <style dangerouslySetInnerHTML={{ __html: `
        body.is-homepage-view,
        body:has(#zecratary-homepage-root) {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }

        /* Strip outer layout shell classes so sidebar & topbar clearance don't push the homepage */
        body.is-homepage-view .md\:pl-64,
        body.is-homepage-view .md\:pl-20,
        body.is-homepage-view [class*="pl-64"],
        body.is-homepage-view [class*="pl-20"],
        body.is-homepage-view [class*="ml-64"],
        body.is-homepage-view [class*="ml-20"],
        body.is-homepage-view .md\:pt-16,
        body.is-homepage-view .md\:pt-20,
        body.is-homepage-view [class*="pt-16"],
        body.is-homepage-view [class*="pt-20"],
        body:has(#zecratary-homepage-root) .md\:pl-64,
        body:has(#zecratary-homepage-root) .md\:pl-20,
        body:has(#zecratary-homepage-root) [class*="pl-64"],
        body:has(#zecratary-homepage-root) [class*="pl-20"],
        body:has(#zecratary-homepage-root) [class*="ml-64"],
        body:has(#zecratary-homepage-root) [class*="ml-20"],
        body:has(#zecratary-homepage-root) .md\:pt-16,
        body:has(#zecratary-homepage-root) .md\:pt-20,
        body:has(#zecratary-homepage-root) [class*="pt-16"],
        body:has(#zecratary-homepage-root) [class*="pt-20"] {
          padding-left: 0 !important;
          padding-top: 0 !important;
          margin-left: 0 !important;
        }

        /* Outer layout wrapper reset - ONLY the outer layout wrapper, NOT the inner homepage canvas */
        body.is-homepage-view > div > main,
        body.is-homepage-view > div > div > main,
        body.is-homepage-view main:not(#zecratary-homepage-canvas),
        body.is-homepage-view [role="main"]:not(#zecratary-homepage-canvas),
        body:has(#zecratary-homepage-root) > div > main,
        body:has(#zecratary-homepage-root) > div > div > main,
        body:has(#zecratary-homepage-root) main:not(#zecratary-homepage-canvas),
        body:has(#zecratary-homepage-root) [role="main"]:not(#zecratary-homepage-canvas) {
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        /* Suppress dashboard sidebar and topbars on homepage */
        body.is-homepage-view aside,
        body.is-homepage-view #zecratary-desktop-topbar,
        body.is-homepage-view .zecratary-mobile-topbar,
        body:has(#zecratary-homepage-root) aside,
        body:has(#zecratary-homepage-root) #zecratary-desktop-topbar,
        body:has(#zecratary-homepage-root) .zecratary-mobile-topbar {
          display: none !important;
        }

        /* Enforce side margins & container width centering on the Homepage Canvas */
        #zecratary-homepage-canvas {
          margin-left: auto !important;
          margin-right: auto !important;
          box-sizing: border-box !important;
          width: 100% !important;
        }
      ` }} />

      {/* DYNAMIC TOP NAVIGATION MENU */}
      <header 
        className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors"
        style={{
          backgroundColor: isDarkMode ? 'rgba(11, 15, 23, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: 'var(--color-border, #1e293b)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            {renderDynamicBrandLogo('w-10 h-10', 'h-5 w-5')}
            <div>
              <span className="text-lg font-black tracking-tight" style={{ color: 'var(--color-text, #f1f5f9)' }}>
                {siteBranding.siteName || 'Zecratary'}
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-[var(--color-primary)] truncate max-w-[200px] sm:max-w-xs">
                {siteBranding.tagline || t('common.tagline', 'Culinary AI')}
              </span>
            </div>
          </Link>

          {/* Dynamic Menu items from /admin/frontend */}
          <nav className="hidden md:flex items-center gap-1.5">
            {menuPages.map((page) => {
              const isCurrent = (activePage?.slug === page.slug) || (page.is_default && activePage?.is_default);
              return (
                <Link
                  key={page.id}
                  href={page.is_default ? '/' : page.slug}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    isCurrent ? 'text-[var(--color-primary)] shadow-xs' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                  }`}
                  style={{ backgroundColor: isCurrent ? 'var(--color-inner-dark, #0e1422)' : 'transparent' }}
                >
                  {page.title}
                </Link>
              );
            })}
          </nav>

          <div className="hidden sm:flex items-center gap-2.5">
            {/* Language Picker */}
            <div className="relative group">
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-white/5"
                style={{ borderColor: 'var(--color-border, #1e293b)' }}
              >
                <Globe className="h-3.5 w-3.5 opacity-70" />
                <span className="uppercase">{locale || 'en'}</span>
              </button>
              <div 
                className="absolute right-0 mt-1 w-32 border rounded-2xl p-1.5 shadow-2xl hidden group-hover:block z-50 animate-in fade-in"
                style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}
              >
                {[
                  { code: 'en', label: 'English', flag: '🇺🇸' },
                  { code: 'es', label: 'Español', flag: '🇪🇸' },
                  { code: 'fr', label: 'Français', flag: '🇫🇷' },
                  { code: 'th', label: 'ไทย', flag: '🇹🇭' }
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage && setLanguage(l.code as any)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Day / Dark Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border transition cursor-pointer hover:bg-white/5"
              style={{ borderColor: 'var(--color-border, #1e293b)' }}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

            {/* Auth status action */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition hover:opacity-90 flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('dashboard') || 'Dashboard'}</span>
                </Link>
                {currentUser.role === 'admin' && (
                  <Link
                    href="/admin/frontend"
                    className="p-2 rounded-xl border text-xs font-bold transition hover:bg-white/10 text-amber-400 border-amber-500/30"
                    title="Edit in Admin Frontend Builder"
                  >
                    <Shield className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-3.5 py-2 rounded-xl text-xs font-bold border hover:bg-white/5" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  {t('signIn') || 'Sign In'}
                </Link>
                <Link href="/register" className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md hover:opacity-90" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                  {t('getStarted') || 'Get Started'}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" onClick={toggleTheme} className="p-2 rounded-xl border" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
            <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-xl border" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b p-4 space-y-3" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}>
            <div className="space-y-1">
              {menuPages.map((p) => (
                <Link key={p.id} href={p.is_default ? '/' : p.slug} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/10">
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* DYNAMIC CONTENT CANVAS (Applying Page Padding Settings) */}
      <div 
        id="zecratary-homepage-canvas"
        role="region"
        aria-label="Homepage Content"
        className={`${maxWCls} mx-auto w-full space-y-12 sm:space-y-16 flex-1`}
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
          boxSizing: 'border-box'
        }}
      >
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }} />
            <p className="text-xs opacity-60">Synchronizing settings from PostgreSQL...</p>
          </div>
        ) : !activePage || (activePage.elements && activePage.elements.length === 0) ? (
          <div className="py-24 text-center space-y-4">
            <ChefHat className="h-12 w-12 mx-auto text-[var(--color-primary)]" />
            <h2 className="text-2xl font-black">Welcome to Zecratary</h2>
            <p className="text-xs max-w-md mx-auto opacity-70">
              Customize this page layout, padding, and elements dynamically at <code className="font-mono text-amber-400">/admin/frontend</code>.
            </p>
          </div>
        ) : (
          activePage.elements.map((elem) => {
            const elemBg = elem.bgColor || 'transparent';
            const elemText = elem.textColor || 'inherit';
            const elemBorder = elem.borderColor || 'var(--color-border, #1e293b)';
            const elemAccent = elem.accentColor || 'var(--color-primary, #E05638)';

            // 1. TITLE
            if (elem.type === 'title') {
              const alignCls = elem.alignment === 'center' ? 'text-center' : elem.alignment === 'right' ? 'text-right' : 'text-left';
              return (
                <div key={elem.id} className={`space-y-3 py-6 px-4 rounded-3xl transition ${alignCls}`} style={{ backgroundColor: elemBg, color: elemText }}>
                  {elem.level === 'h1' ? (
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight" style={{ color: elemAccent }}>{elem.title}</h1>
                  ) : elem.level === 'h3' ? (
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{elem.title}</h3>
                  ) : (
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{elem.title}</h2>
                  )}
                  {elem.subtitle && <p className="text-sm sm:text-base max-w-3xl mx-auto opacity-80 leading-relaxed">{elem.subtitle}</p>}
                </div>
              );
            }

            // 2. TEXT CONTENT
            if (elem.type === 'content') {
              const alignCls = elem.alignment === 'center' ? 'text-center' : elem.alignment === 'right' ? 'text-right' : 'text-left';
              return (
                <div key={elem.id} className={`p-6 sm:p-8 rounded-3xl border space-y-3 shadow-lg ${alignCls}`} style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                  {elem.title && <h3 className="text-xl font-black" style={{ color: elemAccent }}>{elem.title}</h3>}
                  <p className="text-xs sm:text-sm leading-relaxed opacity-90 whitespace-pre-line">{elem.content}</p>
                </div>
              );
            }

            // 3. MULTI-COLUMN GRID
            if (elem.type === 'column') {
              const gridCols = elem.columnsCount === 2 ? 'sm:grid-cols-2' : elem.columnsCount === 4 ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-3';
              return (
                <div key={elem.id} className="space-y-6 py-2">
                  {elem.title && <h3 className="text-2xl font-black text-center tracking-tight" style={{ color: elemAccent }}>{elem.title}</h3>}
                  <div className={`grid grid-cols-1 ${gridCols} gap-5 sm:gap-6`}>
                    {(elem.columns || []).map((col) => (
                      <div key={col.id} className="p-6 rounded-3xl border space-y-2.5 shadow-md transition hover:-translate-y-1" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                        <h4 className="text-base font-bold" style={{ color: elemAccent }}>{col.title}</h4>
                        <p className="text-xs sm:text-sm leading-relaxed opacity-80">{col.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // 4. PICTURE
            if (elem.type === 'picture') {
              return (
                <div key={elem.id} className="space-y-3 py-2 p-2 rounded-3xl" style={{ backgroundColor: elemBg }}>
                  {elem.title && <h4 className="text-lg font-bold text-center mb-2" style={{ color: elemAccent }}>{elem.title}</h4>}
                  <div className="rounded-3xl overflow-hidden border max-h-[500px] w-full flex items-center justify-center bg-black/40 shadow-2xl" style={{ borderColor: elemBorder }}>
                    {elem.imageUrl ? <img src={elem.imageUrl} alt={elem.altText || 'Media'} className="w-full h-auto object-cover max-h-[500px]" /> : null}
                  </div>
                  {elem.caption && <p className="text-center text-xs italic opacity-75">{elem.caption}</p>}
                </div>
              );
            }

            // 5. CALLOUT BOX / CARD
            if (elem.type === 'box') {
              return (
                <div key={elem.id} className="p-7 sm:p-9 rounded-3xl border shadow-xl space-y-4 transition" style={{ backgroundColor: elem.bgColor || (elem.boxStyle === 'highlight' ? 'rgba(224, 86, 56, 0.08)' : 'var(--color-inner-dark, #0e1422)'), borderColor: elemBorder, color: elemText }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title}</h3>
                    {elem.badge && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {elem.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-90 max-w-3xl">{elem.content}</p>
                  {elem.buttonText && (
                    <Link href={elem.buttonUrl || '#'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition hover:opacity-90" style={{ backgroundColor: elemAccent }}>
                      <span>{elem.buttonText}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              );
            }

            // 6. RECIPE GRID WITH POPUP MODAL
            if (elem.type === 'recipe') {
              let list = allRecipesList;
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
              const gridColsCls = density === 2 ? 'grid-cols-1 sm:grid-cols-2' : density === 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

              return (
                <div key={elem.id} className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition" style={{ backgroundColor: elem.bgColor || 'var(--color-card, #0b0f17)', borderColor: elemBorder, color: elemText }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: elemBorder }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5" style={{ borderColor: elemAccent, color: elemAccent }}>
                          <Bookmark className="h-3 w-3" />
                          Community Recipes
                        </span>
                        <span className="text-xs font-bold opacity-60">({totalCount} dishes)</span>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight mt-1.5" style={{ color: elemAccent }}>
                        {elem.title || 'Community Recipes Gallery'}
                      </h3>
                      {elem.subtitle && <p className="text-xs opacity-75 mt-0.5 max-w-2xl">{elem.subtitle}</p>}
                    </div>

                    {elem.buttonText && (
                      <Link href={elem.buttonUrl || '/chef'} className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition hover:opacity-90 flex items-center gap-1.5 w-fit" style={{ backgroundColor: elemAccent }}>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{elem.buttonText}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  <div className={`grid ${gridColsCls} gap-4 sm:gap-5`}>
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
                          <div className="relative h-44 w-full overflow-hidden bg-black/20">
                            <img src={r.imageUrl || r.image || r.image_url || '/uploads/recipes/default.jpg'} alt={r.title || r.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                              {r.isCooked && <span className="p-1.5 rounded-full backdrop-blur-md shadow-md border text-white bg-emerald-500 border-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /></span>}
                              {r.isFavorite && <span className="p-1.5 rounded-full backdrop-blur-md shadow-md border" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: elemAccent, color: elemAccent }}><Heart className="h-3.5 w-3.5 fill-current" /></span>}
                            </div>
                          </div>
                          <div className="p-3.5 space-y-1.5">
                            <h4 className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--color-text, #f1f5f9)' }}>{r.title || r.name}</h4>
                            {r.description && <p className="text-[11px] line-clamp-2 opacity-75 leading-relaxed" style={{ color: 'var(--color-subtext, #94a3b8)' }}>{r.description}</p>}
                          </div>
                        </div>

                        <div className="px-3.5 pb-3.5 pt-0 flex items-center justify-between gap-1 border-t mt-2 pt-2.5" style={{ borderColor: elemBorder }}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: elemAccent }}>
                              {r.category || r.recipeType || 'Main Dish'}
                            </span>
                            {r.creatorName && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: elemBorder, color: 'var(--color-subtext, #94a3b8)' }}>
                                By {r.creatorName}
                              </span>
                            )}
                            {(r.rating || 0) > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-500 text-[11px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-xs">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500"/> {r.rating}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] flex items-center gap-1 shrink-0 font-semibold" style={{ color: 'var(--color-text, #f1f5f9)' }}>
                            <Clock className="h-3 w-3" style={{ color: elemAccent }}/> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 10)}m
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Bar */}
                  {totalPages > 1 && (
                    <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor: elemBorder }}>
                      <span style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                        Showing {startIndex + 1} - {endIndex} of {totalCount} recipes
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" disabled={currentPage <= 1} onClick={() => setRecipeElementPages((prev) => ({ ...prev, [elem.id]: Math.max(1, currentPage - 1) }))} className="p-2 rounded-xl border disabled:opacity-30 transition cursor-pointer" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: 'var(--color-text, #f1f5f9)' }}>
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                          <button key={num} type="button" onClick={() => setRecipeElementPages((prev) => ({ ...prev, [elem.id]: num }))} className="min-w-[32px] h-8 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer" style={currentPage === num ? { backgroundColor: elemAccent, borderColor: elemAccent, color: '#ffffff' } : { backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: 'var(--color-text, #f1f5f9)' }}>
                            {num}
                          </button>
                        ))}
                        <button type="button" disabled={currentPage >= totalPages} onClick={() => setRecipeElementPages((prev) => ({ ...prev, [elem.id]: Math.min(totalPages, currentPage + 1) }))} className="p-2 rounded-xl border disabled:opacity-30 transition cursor-pointer" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: 'var(--color-text, #f1f5f9)' }}>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // 7. SUBSCRIPTION PLANS
            if (elem.type === 'subscription') {
              const filteredPlans = elem.planSlug && elem.planSlug !== 'all' ? availablePlans.filter((p) => p.slug === elem.planSlug) : availablePlans;
              const interval = planBillingInterval;

              return (
                <div key={elem.id} className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition" style={{ backgroundColor: elem.bgColor || 'var(--color-card, #0b0f17)', borderColor: elemBorder, color: elemText }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: elemBorder }}>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title || 'Choose Your Culinary Plan'}</h3>
                      {elem.subtitle && <p className="text-xs opacity-75 mt-0.5">{elem.subtitle}</p>}
                    </div>
                    <div className="rounded-full p-1 border shadow-xs flex items-center self-start sm:self-auto" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder }}>
                      <button type="button" onClick={() => setPlanBillingInterval('MONTH')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${interval === 'MONTH' ? 'bg-[var(--color-primary,#E05638)] text-white shadow-sm' : 'opacity-70 hover:opacity-100'}`}>Monthly</button>
                      <button type="button" onClick={() => setPlanBillingInterval('YEAR')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${interval === 'YEAR' ? 'bg-[var(--color-primary,#E05638)] text-white shadow-sm' : 'opacity-70 hover:opacity-100'}`}>Annual</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto pt-2">
                    {filteredPlans.map((plan) => {
                      const isAnnual = interval === 'YEAR';
                      const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                      const badge = isAnnual ? (plan.annualBadge || plan.trialBadge) : (plan.monthlyBadge || plan.trialBadge);
                      const annualMonthlyEq = plan.annualPrice > 0 ? (plan.annualPrice / 12).toFixed(2) : '0.00';
                      const calculatedSavings = plan.monthlyPrice > 0 && plan.annualPrice > 0 ? Math.max(0, Math.round((1 - (plan.annualPrice / (plan.monthlyPrice * 12))) * 100)) : 0;

                      return (
                        <div key={plan.id} className="rounded-3xl border-2 p-6 sm:p-7 relative flex flex-col justify-between space-y-5 shadow-md transition hover:shadow-xl" style={{ backgroundColor: 'var(--color-inner-dark, #0e1422)', borderColor: plan.isFree ? elemBorder : elemAccent }}>
                          {badge && <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow-md" style={{ backgroundColor: plan.isFree ? '#10b981' : elemAccent }}>{badge}</div>}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-2xl font-black tracking-tight" style={{ color: elemAccent }}>{plan.name}</h4>
                                <span className="text-[10px] font-mono opacity-50 block mt-0.5 font-bold">ID: {plan.id || plan.slug}</span>
                              </div>
                              {elem.planShowTokens !== false && (
                                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs">
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>+{(plan.tokenLimit || 500000).toLocaleString()} 🪙 / {plan.tokenReimburseFrequency || 'cycle'}</span>
                                </span>
                              )}
                            </div>

                            <div className="py-2 border-y" style={{ borderColor: elemBorder }}>
                              {plan.isFree ? (
                                <div><div className="text-4xl font-black" style={{ color: elemAccent }}>Free</div><p className="text-xs opacity-70 mt-1">{plan.descriptionMonthly}</p></div>
                              ) : isAnnual ? (
                                <div>
                                  <div className="flex items-baseline gap-1"><span className="text-4xl font-black" style={{ color: elemAccent }}>${plan.annualPrice.toFixed(2)}</span><span className="text-xs opacity-60 font-semibold">/year</span></div>
                                  <div className="flex items-center gap-2 text-xs font-bold mt-1"><span className="text-emerald-400">${annualMonthlyEq}/mo eq.</span>{calculatedSavings > 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Save {calculatedSavings}%</span>}</div>
                                  <p className="text-xs opacity-70 mt-2">{plan.descriptionAnnual}</p>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-baseline gap-1"><span className="text-4xl font-black" style={{ color: elemAccent }}>${plan.monthlyPrice.toFixed(2)}</span><span className="text-xs opacity-60 font-semibold">/month</span></div>
                                  <p className="text-xs opacity-70 mt-2">{plan.descriptionMonthly}</p>
                                </div>
                              )}
                            </div>

                            {elem.planShowAiModels !== false && plan.allowedAiModels && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Allowed AI Models:</span>
                                <div className="flex flex-wrap gap-1">
                                  {plan.allowedAiModels.map((m, mIdx) => (
                                    <span key={mIdx} className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-slate-700 bg-black/40 text-slate-300 font-bold">{m}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2 pt-1 text-xs">
                              {plan.features.map((feat, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-2 opacity-90">
                                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                                  <span className="leading-snug">{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <Link href={elem.planCtaUrl || '/subscriptions'} className="w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 text-white shadow-lg transition hover:opacity-90 cursor-pointer" style={{ backgroundColor: plan.isFree ? '#10b981' : elemAccent }}>
                              <span>{elem.planCtaText || (plan.isFree ? 'Manage Plan' : 'Choose Plan')}</span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
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

      {/* DYNAMIC FOOTER (Rendered with active page footer settings) */}
      {activePage?.footer?.enabled !== false && (
        <footer 
          className="border-t transition-colors mt-16"
          style={{
            backgroundColor: activePage?.footer?.bgColor || 'var(--color-inner-dark, #0b0f17)',
            borderColor: activePage?.footer?.borderColor || 'var(--color-border, #1e293b)',
            color: activePage?.footer?.textColor || 'var(--color-text, #f1f5f9)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand and Description */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2.5">
                  {renderDynamicBrandLogo('w-9 h-9', 'h-4 w-4')}
                  <span className="text-lg font-black tracking-tight">
                    {siteBranding.siteName || 'Zecratary'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed opacity-75 max-w-md">
                  {activePage?.footer?.aboutText || siteBranding.tagline || t('admin.defaultTagline', 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.')}
                </p>

                {/* Social Links */}
                {activePage?.footer?.socials && Object.values(activePage.footer.socials).some(Boolean) && (
                  <div className="flex items-center gap-3 pt-2">
                    {activePage.footer.socials.twitter && (
                      <a href={activePage.footer.socials.twitter} target="_blank" rel="noreferrer" className="p-2 rounded-xl border hover:opacity-80 transition" style={{ borderColor: activePage.footer.borderColor || 'var(--color-border, #1e293b)' }} title="X / Twitter">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {activePage.footer.socials.github && (
                      <a href={activePage.footer.socials.github} target="_blank" rel="noreferrer" className="p-2 rounded-xl border hover:opacity-80 transition" style={{ borderColor: activePage.footer.borderColor || 'var(--color-border, #1e293b)' }} title="GitHub">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                      </a>
                    )}
                    {activePage.footer.socials.discord && (
                      <a href={activePage.footer.socials.discord} target="_blank" rel="noreferrer" className="p-2 rounded-xl border hover:opacity-80 transition" style={{ borderColor: activePage.footer.borderColor || 'var(--color-border, #1e293b)' }} title="Discord">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Footer Link Columns */}
              {(activePage?.footer?.columns || []).map((col) => (
                <div key={col.id} className="space-y-3">
                  <h4 
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: activePage?.footer?.accentColor || 'var(--color-primary, #E05638)' }}
                  >
                    {col.title}
                  </h4>
                  <ul className="space-y-2 text-xs opacity-75">
                    {col.links.map((link) => (
                      <li key={link.id}>
                        <Link href={link.url} className="hover:underline transition hover:opacity-100">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom Copyright & PostgreSQL Status Bar */}
            <div 
              className="border-t pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs opacity-60"
              style={{ borderColor: activePage?.footer?.borderColor || 'var(--color-border, #1e293b)' }}
            >
              <span>{activePage?.footer?.copyrightText || '© 2026 Zecratary. All rights reserved.'}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>PostgreSQL Synced & Active</span>
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* FULL RECIPE POPUP MODAL (Exact /saved consistency, read-only on frontend) */}
      {activeRecipeModal && (
        <div 
          onClick={() => setActiveRecipeModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card, #0b0f17)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f1f5f9)'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveRecipeModal(null)}
              className="absolute top-4 right-4 z-30 p-2 rounded-xl border transition cursor-pointer shadow-md hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card, #0b0f17)',
                borderColor: 'var(--color-border, #1e293b)',
                color: 'var(--color-text, #f1f5f9)'
              }}
            >
              <X className="h-5 w-5"/>
            </button>

            <div className="overflow-y-auto flex-1 space-y-5 pb-6">
              <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                <img
                  src={activeRecipeModal.imageUrl || activeRecipeModal.image || activeRecipeModal.image_url || '/uploads/recipes/default.jpg'}
                  alt={activeRecipeModal.title || activeRecipeModal.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="relative z-10 space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {activeRecipeModal.title || activeRecipeModal.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="border px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}>
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-bold">Cook: {activeRecipeModal.cookTime || `${activeRecipeModal.cookTimeMinutes || 20}m`}</span>
                    </span>
                    <span className="border px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}>
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      <span className="font-bold">Prep: {activeRecipeModal.prepTime || `${activeRecipeModal.prepTimeMinutes || 15}m`}</span>
                    </span>
                    <span className="border px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}>
                      <Utensils className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span className="font-bold">{activeRecipeModal.category || activeRecipeModal.recipeType || 'Main Dish'}</span>
                    </span>
                    {activeRecipeModal.calories && (
                      <span className="border px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md bg-amber-500/15 border-amber-500/30 text-amber-400">
                        <Flame className="h-3.5 w-3.5" />
                        <span className="font-bold">{activeRecipeModal.calories}</span>
                      </span>
                    )}
                    <span className="border px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md" style={{ backgroundColor: 'var(--color-card, #0b0f17)', borderColor: 'var(--color-border, #1e293b)' }}>
                      <Users className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span className="font-bold">By {activeRecipeModal.creatorName || 'Community Chef'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Servings Stepper */}
              <div className="px-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-[var(--color-primary)]">
                    <Users className="h-4 w-4"/> {t('servingsLabel') || 'Servings'}
                  </span>
                  <div className="flex items-center border rounded-lg overflow-hidden shadow-xs" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                    <button type="button" onClick={() => setModalServingsMultiplier(Math.max(1, modalServingsMultiplier - 1))} className="px-2.5 py-1 font-bold cursor-pointer hover:bg-white/10">-</button>
                    <span className="px-3 py-1 text-xs font-bold min-w-[32px] text-center">
                      {Number(activeRecipeModal.servings || 2) * modalServingsMultiplier}
                    </span>
                    <button type="button" onClick={() => setModalServingsMultiplier(modalServingsMultiplier + 1)} className="px-2.5 py-1 font-bold cursor-pointer hover:bg-white/10">+</button>
                  </div>
                </div>

                {(activeRecipeModal.rating || 0) > 0 && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4" style={{ color: (activeRecipeModal.rating || 0) >= star ? 'var(--color-primary, #E05638)' : 'var(--color-border, #1e293b)', fill: (activeRecipeModal.rating || 0) >= star ? 'var(--color-primary, #E05638)' : 'transparent' }} />
                    ))}
                  </div>
                )}
              </div>

              {activeRecipeModal.description && (
                <div className="px-6 text-xs leading-relaxed opacity-80" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
                  {activeRecipeModal.description}
                </div>
              )}

              <div className="border-t mx-6" style={{ borderColor: 'var(--color-border, #1e293b)' }} />

              {/* Ingredients */}
              <div className="px-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">{t('ingredientsHeading') || 'Ingredients'}</h3>
                  <div className="flex items-center border rounded-lg overflow-hidden text-xs shadow-xs" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                    <button type="button" onClick={() => setModalFontSizeScale(Math.max(70, modalFontSizeScale - 10))} className="px-2.5 py-1 font-bold cursor-pointer hover:bg-white/10">-</button>
                    <span className="px-2.5 py-1 font-bold min-w-[42px] text-center">{modalFontSizeScale}%</span>
                    <button type="button" onClick={() => setModalFontSizeScale(Math.min(130, modalFontSizeScale + 10))} className="px-2.5 py-1 font-bold cursor-pointer hover:bg-white/10">+</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5" style={{ fontSize: `${modalFontSizeScale}%` }}>
                  {Array.isArray(activeRecipeModal.ingredients) && activeRecipeModal.ingredients.map((ing: any, idx: number) => {
                    const rawAmt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                    const scaledAmt = calculateScaledAmount(rawAmt, Number(activeRecipeModal.servings || 2), Number(activeRecipeModal.servings || 2) * modalServingsMultiplier);
                    const unit = typeof ing === 'string' ? '' : ing.unit || '';
                    const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                    return (
                      <div key={idx} className="flex items-start gap-2.5 leading-snug">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0 mt-1.5" style={{ backgroundColor: 'var(--color-primary, #E05638)' }} />
                        <span>
                          {(scaledAmt !== '' || unit) && (
                            <strong className="font-semibold">{scaledAmt} {unit && unit !== 'unit' && unit !== 'Unit' ? unit : ''}{' '}</strong>
                          )}
                          <span>{name}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t mx-6" style={{ borderColor: 'var(--color-border, #1e293b)' }} />

              {/* Instructions */}
              <div className="px-6 space-y-4">
                <h3 className="text-lg font-black">{t('instructionsHeading') || 'Instructions'}</h3>
                <div className="space-y-3.5" style={{ fontSize: `${modalFontSizeScale}%` }}>
                  {Array.isArray(activeRecipeModal.instructions || activeRecipeModal.directions) && 
                   (activeRecipeModal.instructions || activeRecipeModal.directions).map((step: string, idx: number) => {
                    const isDone = modalCompletedSteps.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (modalCompletedSteps.includes(idx)) {
                            setModalCompletedSteps(modalCompletedSteps.filter(i => i !== idx));
                          } else {
                            setModalCompletedSteps([...modalCompletedSteps, idx]);
                          }
                        }}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition select-none shadow-xs ${isDone ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                      >
                        <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition" style={isDone ? { backgroundColor: 'var(--color-primary, #E05638)', borderColor: 'var(--color-primary, #E05638)', color: '#ffffff' } : { borderColor: 'var(--color-primary, #E05638)', backgroundColor: 'transparent' }}>
                          {isDone && <Check className="h-3.5 w-3.5 stroke-[3]"/>}
                        </div>
                        <span className="font-extrabold shrink-0 text-sm" style={{ color: 'var(--color-primary, #E05638)' }}>{idx + 1}.</span>
                        <span className={`leading-relaxed flex-1 ${isDone ? 'line-through opacity-50' : ''}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t mx-6" style={{ borderColor: 'var(--color-border, #1e293b)' }} />

              {/* Modal Footer */}
              <div className="px-6 flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                <Link href="/chef" className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-white transition shadow-md hover:opacity-90" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                  <Sparkles className="h-4 w-4" />
                  <span>{t('cookWithChef') || 'Cook with AI Chef'}</span>
                </Link>

                <div className="flex items-center gap-2 ml-auto text-xs">
                  <span className="font-semibold" style={{ color: 'var(--color-subtext, #94a3b8)' }}>Source:</span>
                  {activeRecipeModal.sourceUrl || activeRecipeModal.source_url ? (
                    <a href={activeRecipeModal.sourceUrl || activeRecipeModal.source_url || '#'} target="_blank" rel="noreferrer" className="font-bold text-xs hover:underline inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition shadow-xs text-[var(--color-primary)]" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                      <span>{getSafeHostname(activeRecipeModal.sourceUrl || activeRecipeModal.source_url || '')}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl border text-xs font-medium" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-subtext, #94a3b8)' }}>
                      Created manually
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
