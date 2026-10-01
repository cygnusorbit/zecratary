'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  CheckCircle2
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // Sync Theme State
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

  const fetchFrontendSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/frontend', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pages)) {
          setAllPages(data.pages);
          const defaultPage = data.pages.find((p: FrontendPage) => p.is_default) || 
                              data.pages.find((p: FrontendPage) => p.slug === '/') || 
                              data.pages[0] || null;
          setActivePage(defaultPage);
        }
      }
    } catch (err) {
      console.error('Failed to load frontend settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fetchAllRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/frontend?all_recipes=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.recipes)) {
          setAllRecipesList(data.recipes);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    initAuthStorage();
    setCurrentUser(getCurrentUser());
    fetchFrontendSettings();
    fetchLivePlans();
    fetchAllRecipes();

    const handleSync = () => {
      fetchFrontendSettings();
      fetchAllRecipes();
      fetchLivePlans();
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener('zecratary_frontend_pages_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_frontend_pages_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [fetchFrontendSettings, fetchLivePlans, fetchAllRecipes]);

  const menuPages = allPages.filter((p) => p.is_published);

  // Resolved Page Padding Values
  const padTop = activePage?.padding?.top || '2.5rem';
  const padBottom = activePage?.padding?.bottom || '4rem';
  const padX = activePage?.padding?.x || '1.5rem';
  const maxWCls = activePage?.padding?.maxWidth || 'max-w-7xl';

  return (
    <div 
      id="zecratary-homepage-root"
      className="min-h-screen w-full transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f1f5f9)'
      }}
    >
      {/* Global CSS Reset for Homepage: Remove sidebar offsets & top clearance */}
      <style dangerouslySetInnerHTML={{ __html: `
        body.is-homepage-view,
        body:has(#zecratary-homepage-root) {
          margin: 0 !important;
          padding: 0 !important;
        }
        body.is-homepage-view main,
        body.is-homepage-view [role="main"],
        body.is-homepage-view #zecratary-main-content,
        body.is-homepage-view .main-content,
        body:has(#zecratary-homepage-root) main,
        body:has(#zecratary-homepage-root) [role="main"],
        body:has(#zecratary-homepage-root) #zecratary-main-content,
        body:has(#zecratary-homepage-root) .main-content {
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        body.is-homepage-view aside,
        body.is-homepage-view #zecratary-desktop-topbar,
        body.is-homepage-view .zecratary-mobile-topbar,
        body:has(#zecratary-homepage-root) aside,
        body:has(#zecratary-homepage-root) #zecratary-desktop-topbar,
        body:has(#zecratary-homepage-root) .zecratary-mobile-topbar {
          display: none !important;
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
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight" style={{ color: 'var(--color-text, #f1f5f9)' }}>
                Zecratary
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-[var(--color-primary)]">
                Culinary AI
              </span>
            </div>
          </Link>

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
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border transition cursor-pointer hover:bg-white/5"
              style={{ borderColor: 'var(--color-border, #1e293b)' }}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

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
        </div>
      </header>

      {/* DYNAMIC CONTENT CANVAS (Applying page padding settings) */}
      <main 
        className={`${maxWCls} mx-auto space-y-12 sm:space-y-16`}
        style={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padX,
          paddingRight: padX
        }}
      >
        {activePage && activePage.elements && activePage.elements.map((elem) => {
          const elemBg = elem.bgColor || 'transparent';
          const elemText = elem.textColor || 'inherit';
          const elemBorder = elem.borderColor || 'var(--color-border, #1e293b)';
          const elemAccent = elem.accentColor || 'var(--color-primary, #E05638)';

          if (elem.type === 'title') {
            const alignCls = elem.alignment === 'center' ? 'text-center' : elem.alignment === 'right' ? 'text-right' : 'text-left';
            return (
              <div key={elem.id} className={`space-y-3 py-6 px-4 rounded-3xl transition ${alignCls}`} style={{ backgroundColor: elemBg, color: elemText }}>
                {elem.level === 'h1' ? (
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight" style={{ color: elemAccent }}>{elem.title}</h1>
                ) : (
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{elem.title}</h2>
                )}
                {elem.subtitle && <p className="text-sm sm:text-base max-w-3xl mx-auto opacity-80 leading-relaxed">{elem.subtitle}</p>}
              </div>
            );
          }

          if (elem.type === 'content') {
            return (
              <div key={elem.id} className="p-6 sm:p-8 rounded-3xl border space-y-3 shadow-lg" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                {elem.title && <h3 className="text-xl font-black" style={{ color: elemAccent }}>{elem.title}</h3>}
                <p className="text-xs sm:text-sm leading-relaxed opacity-90 whitespace-pre-line">{elem.content}</p>
              </div>
            );
          }

          if (elem.type === 'column') {
            const gridCols = elem.columnsCount === 2 ? 'sm:grid-cols-2' : elem.columnsCount === 4 ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-3';
            return (
              <div key={elem.id} className="space-y-6 py-2">
                {elem.title && <h3 className="text-2xl font-black text-center tracking-tight" style={{ color: elemAccent }}>{elem.title}</h3>}
                <div className={`grid grid-cols-1 ${gridCols} gap-5 sm:gap-6`}>
                  {(elem.columns || []).map((col) => (
                    <div key={col.id} className="p-6 rounded-3xl border space-y-2.5 shadow-md" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                      <h4 className="text-base font-bold" style={{ color: elemAccent }}>{col.title}</h4>
                      <p className="text-xs sm:text-sm leading-relaxed opacity-80">{col.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (elem.type === 'picture') {
            return (
              <div key={elem.id} className="space-y-3 py-2 p-2 rounded-3xl" style={{ backgroundColor: elemBg }}>
                {elem.title && <h4 className="text-lg font-bold text-center mb-2" style={{ color: elemAccent }}>{elem.title}</h4>}
                <div className="rounded-3xl overflow-hidden border max-h-[500px] w-full flex items-center justify-center bg-black/40 shadow-2xl" style={{ borderColor: elemBorder }}>
                  {elem.imageUrl ? <img src={elem.imageUrl} alt="Media" className="w-full h-auto object-cover max-h-[500px]" /> : null}
                </div>
              </div>
            );
          }

          if (elem.type === 'box') {
            return (
              <div key={elem.id} className="p-7 sm:p-9 rounded-3xl border shadow-xl space-y-4 transition" style={{ backgroundColor: elem.bgColor || 'var(--color-inner-dark, #0e1422)', borderColor: elemBorder, color: elemText }}>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: elemAccent }}>{elem.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed opacity-90 max-w-3xl">{elem.content}</p>
              </div>
            );
          }

          return null;
        })}
      </main>

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
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: activePage?.footer?.accentColor || 'var(--color-primary, #E05638)' }}
                  >
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-black tracking-tight">Zecratary</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed opacity-75 max-w-md">
                  {activePage?.footer?.aboutText || 'Autonomous culinary intelligence, precision meal planning, and pantry inventory tracking.'}
                </p>
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

            {/* Bottom Copyright & Status Bar */}
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
    </div>
  );
}
