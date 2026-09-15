import os
import glob
import re

# 1. Locate App and Components directories
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/admin/page.tsx', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        app_dir = os.path.dirname(os.path.dirname(matches[0]))

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')
components_dir = os.path.join(base_dir, 'components')
os.makedirs(lib_dir, exist_ok=True)
os.makedirs(components_dir, exist_ok=True)

# 2. Update lib/themeConfig.ts to include sidebarIconColor and --color-sidebar-icon token
theme_config_path = os.path.join(lib_dir, 'themeConfig.ts')
theme_config_code = """export interface ThemeColors {
  primary?: string;
  primaryColor?: string;
  primaryHover?: string;
  accentEmerald?: string;
  accentColor?: string;
  accent?: string;
  sidebarIcon?: string;
  sidebarIconColor?: string;
  backgroundColor?: string;
  backgroundDark?: string;
  cardBackground?: string;
  cardBorder?: string;
  textSecondary?: string;
}

export function applyThemeToDocument(colors: ThemeColors | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDayMode = localStorage.getItem('zecratary_theme_mode') === 'light';

  const primary = colors?.primary || colors?.primaryColor;
  const primaryHover = colors?.primaryHover;
  const accent = colors?.accentEmerald || colors?.accentColor || colors?.accent;
  const sidebarIcon = colors?.sidebarIconColor || colors?.sidebarIcon || accent || '#10b981';
  const bg = colors?.backgroundColor || colors?.backgroundDark;
  const card = colors?.cardBackground;
  const border = colors?.cardBorder;
  const textSec = colors?.textSecondary;

  if (primary) {
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--primary', primary);
  }
  if (primaryHover) {
    root.style.setProperty('--color-primary-hover', primaryHover);
    root.style.setProperty('--primary-hover', primaryHover);
  }
  if (accent) {
    root.style.setProperty('--color-emerald', accent);
    root.style.setProperty('--color-accent', accent);
    root.style.setProperty('--accent', accent);
  }
  if (sidebarIcon) {
    root.style.setProperty('--color-sidebar-icon', sidebarIcon);
    root.style.setProperty('--sidebar-icon', sidebarIcon);
  }

  if (isDayMode) {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.setProperty('--color-bg', '#f8fafc');
    root.style.setProperty('--color-bg-dark', '#f8fafc');
    root.style.setProperty('--color-card', '#ffffff');
    root.style.setProperty('--color-card-dark', '#ffffff');
    root.style.setProperty('--color-border', '#e2e8f0');
    root.style.setProperty('--color-border-dark', '#e2e8f0');
    root.style.setProperty('--color-text', '#0f172a');
    root.style.setProperty('--color-text-secondary', '#64748b');
    root.style.setProperty('--color-inner-dark', '#f1f5f9');
    if (document.body) {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    if (bg) {
      root.style.setProperty('--color-bg', bg);
      root.style.setProperty('--color-bg-dark', bg);
      root.style.setProperty('--color-inner-dark', bg);
      if (document.body) {
        document.body.style.backgroundColor = bg;
      }
    }
    if (card) {
      root.style.setProperty('--color-card', card);
      root.style.setProperty('--color-card-dark', card);
    }
    if (border) {
      root.style.setProperty('--color-border', border);
      root.style.setProperty('--color-border-dark', border);
    }
    if (textSec) {
      root.style.setProperty('--color-text-secondary', textSec);
    }
    if (document.body) {
      document.body.style.color = '#ffffff';
    }
  }
}

export function saveThemeColors(colors: ThemeColors): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
    localStorage.setItem('zecratary_theme_config', JSON.stringify(colors));
  } catch (_) {}

  applyThemeToDocument(colors);
  window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
  window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: colors }));
  window.dispatchEvent(new Event('storage'));

  try {
    fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors, settings: { themeColors: colors } })
    }).catch(() => {});
  } catch (_) {}
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const cached = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
    if (cached) {
      applyThemeToDocument(JSON.parse(cached));
    }
  } catch (_) {}

  try {
    const res = await fetch('/api/system-settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const colors = data?.settings?.themeColors || data?.themeColors;
      if (data.success && colors) {
        localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
        applyThemeToDocument(colors);
        window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
      }
    }
  } catch (_) {}
}
"""
with open(theme_config_path, 'w', encoding='utf-8') as f:
    f.write(theme_config_code)
print(f"✓ Updated themeConfig helper at: {theme_config_path}")

# 3. Locate and update Sidebar.tsx to bind all green navigation icons to var(--color-sidebar-icon)
sidebar_candidates = glob.glob('**/Sidebar.tsx', recursive=True)
sidebar_candidates = [f for f in sidebar_candidates if 'node_modules' not in f and '.next' not in f]

if not sidebar_candidates:
    sidebar_path = os.path.join(components_dir, 'Sidebar.tsx')
else:
    sidebar_path = sidebar_candidates[0]

sidebar_code = """'use client';
import packageInfo from '../../package.json';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  MessageSquare, 
  UploadCloud, 
  SquarePen, 
  BookOpen, 
  Book, 
  Package, 
  ShoppingCart, 
  Calendar, 
  LayoutTemplate, 
  UserPlus, 
  ShieldCheck, 
  CreditCard, 
  Tag, 
  Utensils, 
  Settings, 
  Mail, 
  LogOut, 
  Menu, 
  X, 
  Wallet, 
  Languages,
  Cpu,
  Moon,
  Sun,
  Key
} from 'lucide-react';
import { getCurrentUser, logoutUser, User } from '@/lib/auth';
import { getSiteName, getSiteIcon, DEFAULT_SITE_NAME, DEFAULT_SITE_ICON, updateFavicon } from '@/lib/siteConfig';
import { useTranslation } from '@/components/LanguageProvider';

// ISO Code to National Flag Emoji Fallback Map
const LANGUAGE_FLAG_MAP: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  th: '🇹🇭',
  de: '🇩🇪',
  it: '🇮🇹',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
  pt: '🇵🇹',
  ru: '🇷🇺',
  ar: '🇸🇦',
  nl: '🇳🇱',
  hi: '🇮🇳',
  vi: '🇻🇳',
  id: '🇮🇩',
  tr: '🇹🇷',
  sv: '🇸🇪',
  no: '🇳🇴',
  da: '🇩🇰',
  fi: '🇫🇮',
  pl: '🇵🇱',
  el: '🇬🇷',
  he: '🇮🇱'
};

const getLanguageFlag = (code: string): string => {
  if (!code) return '🌐';
  return LANGUAGE_FLAG_MAP[code.toLowerCase().trim()] || '🌐';
};

const isImageIcon = (icon?: unknown): icon is string =>
  typeof icon === 'string' && (
    icon.startsWith('/') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('data:image')
  );

export default function Sidebar() {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
  if (isAuthRoute) return null;
  const { t, locale, setLocale } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [siteIcon, setSiteIcon] = useState<string>(DEFAULT_SITE_ICON);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [availableLanguages, setAvailableLanguages] = useState<{ code: string; name: string; flag: string }[]>([
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  ]);

  const loadLanguagesFromAdmin = () => {
    try {
      const raw = localStorage.getItem('zecratary_languages');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const activeOnly = parsed
            .filter((item: any) => item.status === 'active')
            .map((item: any) => ({
              code: item.code,
              name: item.nativeName || item.name,
              flag: item.flag || getLanguageFlag(item.code)
            }));
          if (activeOnly.length > 0) {
            setAvailableLanguages(activeOnly);
          }
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    const name = getSiteName();
    const icon = getSiteIcon();
    setSiteName(name);
    setSiteIcon(icon);
    updateFavicon(icon);
    loadLanguagesFromAdmin();

    // Initialize Theme Mode (Dark / Day)
    const savedMode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
    if (savedMode) {
      const isDark = savedMode === 'dark';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);
    }

    // Initialize responsive collapse for tablet view
    const initialWidth = window.innerWidth;
    if (initialWidth >= 768 && initialWidth < 1024) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }

    let prevCategory: 'mobile' | 'tablet' | 'desktop' = 
      initialWidth < 768 ? 'mobile' : initialWidth < 1024 ? 'tablet' : 'desktop';

    const handleScreenResize = () => {
      const width = window.innerWidth;
      const currentCategory: 'mobile' | 'tablet' | 'desktop' = 
        width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

      if (currentCategory !== prevCategory) {
        if (currentCategory === 'tablet') {
          setIsCollapsed(true);
        } else if (currentCategory === 'desktop') {
          setIsCollapsed(false);
        }
        if (currentCategory !== 'mobile') {
          setIsOpen(false);
        }
        prevCategory = currentCategory;
      }
    };

    window.addEventListener('resize', handleScreenResize);

    const handleAuthChange = () => setUser(getCurrentUser());
    const handleSiteSync = () => {
      setSiteName(getSiteName());
      setSiteIcon(getSiteIcon());
      updateFavicon(getSiteIcon());
    };
    const handleLangSync = () => loadLanguagesFromAdmin();
    const handleThemeModeSync = () => {
      const isDark = localStorage.getItem('zecratary_theme_mode') !== 'light';
      setIsDarkMode(isDark);
    };

    window.addEventListener('zecratary_auth_changed', handleAuthChange);
    window.addEventListener('zecratary_site_settings_changed', handleSiteSync);
    window.addEventListener('zecratary_languages_updated', handleLangSync);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeModeSync);
    window.addEventListener('zecratary_theme_changed', handleThemeModeSync);
    window.addEventListener('storage', handleSiteSync);
    window.addEventListener('storage', handleLangSync);

    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('zecratary_auth_changed', handleAuthChange);
      window.removeEventListener('zecratary_site_settings_changed', handleSiteSync);
      window.removeEventListener('zecratary_languages_updated', handleLangSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeModeSync);
      window.removeEventListener('zecratary_theme_changed', handleThemeModeSync);
      window.removeEventListener('storage', handleSiteSync);
      window.removeEventListener('storage', handleLangSync);
    };
  }, []);

  const toggleThemeMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', nextMode);
      localStorage.setItem('zecratary_theme_mode', nextMode ? 'dark' : 'light');
      window.dispatchEvent(new Event('zecratary_theme_mode_changed'));
      window.dispatchEvent(new Event('zecratary_theme_changed'));
    }
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    return null;
  }

  const isAdmin = user && (
    user.role === 'admin' || 
    user.email === 'admin@foodieprep.com' || 
    user.email?.includes('admin')
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/chef') {
      return pathname === '/chef';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showCollapsed = isCollapsed && !isOpen;

  // Active styles harmonize with the dynamic sidebar icon color
  const navClass = (href: string) => `
    w-full flex items-center ${showCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 select-none
    ${isActive(href)
      ? isDarkMode
        ? 'bg-[var(--color-sidebar-icon,#10b981)]/15 text-[var(--color-sidebar-icon,#10b981)] border border-[var(--color-sidebar-icon,#10b981)]/30 shadow-md font-bold'
        : 'bg-[var(--color-sidebar-icon,#10b981)]/10 text-slate-900 border border-[var(--color-sidebar-icon,#10b981)]/40 shadow-sm font-bold'
      : isDarkMode
        ? 'text-slate-300 hover:text-white hover:bg-[#141b2d]/50'
        : 'text-slate-800 hover:text-slate-950 hover:bg-slate-200/80 font-bold'
    }
  `;

  const displayName = mounted ? siteName : DEFAULT_SITE_NAME;
  const displayIcon = mounted ? siteIcon : DEFAULT_SITE_ICON;

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between w-full">
        <Link href="/dashboard" className="flex items-center gap-2">
          {isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : <span className="text-2xl shrink-0">{displayIcon}</span>}
          <span className="text-lg font-black tracking-tight text-[var(--color-primary)] truncate max-w-[200px]">
            {displayName}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-xl border border-[var(--color-border)] transition cursor-pointer ${
            isDarkMode 
              ? 'bg-[#141b2d] text-slate-300 hover:text-white' 
              : 'bg-slate-200 text-slate-800 hover:text-slate-950'
          }`}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* MOBILE OVERLAY BACKDROP */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen bg-[var(--color-card)] border-r border-[var(--color-border)] 
        flex flex-col justify-between shrink-0 select-none transition-all duration-300 ease-in-out
        ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}
        ${isOpen ? 'translate-x-0 w-64 p-5' : '-translate-x-full md:translate-x-0'}
        ${!isOpen && showCollapsed ? 'md:w-20 p-3' : 'md:w-64 p-5'}
      `}>
        <div className="space-y-4 overflow-y-auto overflow-x-hidden pr-1">
          {/* TOP BAR / HAMBURGER TOGGLE */}
          {showCollapsed ? (
            <div className="flex flex-col items-center gap-3 pb-2 border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-[#141b2d]' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                }`}
                title="Expand navigation"
                aria-label="Expand navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/dashboard" className="flex items-center justify-center p-1" title={displayName}>
                {isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : <span className="text-2xl shrink-0">{displayIcon}</span>}
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-white hover:bg-[#141b2d]' 
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                  }`}
                  title="Collapse navigation"
                  aria-label="Collapse navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Link href="/dashboard" className="flex items-center gap-2 truncate">
                  {isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : <span className="text-2xl shrink-0">{displayIcon}</span>}
                  <span className="text-lg font-black tracking-tight text-[var(--color-primary)] truncate">
                    {displayName}
                  </span>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`md:hidden p-1.5 rounded-lg transition cursor-pointer ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <nav className="space-y-1">
            {/* DASHBOARD */}
            <Link href="/dashboard" className={navClass('/dashboard')} title={t('dashboard')}>
              <Home className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('dashboard')}</span>}
            </Link>

            {/* CREATE SECTION */}
            {showCollapsed ? (
              <div title={t('create')} />
            ) : (
              <div className={`pt-4 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider truncate ${
                isDarkMode ? 'text-slate-500' : 'text-slate-600'
              }`}>
                {t('create')}
              </div>
            )}
            <Link href="/chef" className={navClass('/chef')} title={t('chefAi')}>
              <MessageSquare className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('chefAi')}</span>}
            </Link>
            <Link href="/import" className={navClass('/import')} title={t('import')}>
              <UploadCloud className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('import')}</span>}
            </Link>
            <Link href="/manual" className={navClass('/manual')} title={t('manual')}>
              <SquarePen className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('manual')}</span>}
            </Link>

            {/* MANAGE SECTION */}
            {showCollapsed ? (
              <div title={t('manage')} />
            ) : (
              <div className={`pt-4 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider truncate ${
                isDarkMode ? 'text-slate-500' : 'text-slate-600'
              }`}>
                {t('manage')}
              </div>
            )}
            <Link href="/saved" className={navClass('/saved')} title={t('savedRecipes')}>
              <BookOpen className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('savedRecipes')}</span>}
            </Link>
            <Link href="/books" className={navClass('/books')} title={t('books')}>
              <Book className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('books')}</span>}
            </Link>
            <Link href="/pantry" className={navClass('/pantry')}>
              <Package className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('pantry')}</span>}
            </Link>

            {/* PLAN SECTION */}
            {showCollapsed ? (
              <div title={t('plan')} />
            ) : (
              <div className={`pt-4 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider truncate ${
                isDarkMode ? 'text-slate-500' : 'text-slate-600'
              }`}>
                {t('plan')}
              </div>
            )}
            <Link href="/shopping" className={navClass('/shopping')} title={t('shoppingList')}>
              <ShoppingCart className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('shoppingList')}</span>}
            </Link>
            <Link href="/planner" className={navClass('/planner')}>
              <Calendar className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('planner')}</span>}
            </Link>
            <Link href="/templates" className={navClass('/templates')}>
              <LayoutTemplate className="h-4 w-4 shrink-0" style={{ color: 'var(--color-sidebar-icon, #10b981)' }} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('templates')}</span>}
            </Link>

            {/* ADMIN ACCESS SECTION */}
            {isAdmin && (
              <div className="pt-2 space-y-1">
                {showCollapsed ? (
                  <div title={t('adminAccess') || 'Admin Access'} />
                ) : (
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-primary)] px-3 pt-2 truncate">
                    {t('adminAccess') || 'Admin Access'}
                  </span>
                )}
                <Link href="/admin" className={navClass('/admin')} title={t('adminSetting') || 'Admin Setting'}>
                  <ShieldCheck className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('adminSetting') || 'Admin Setting'}</span>}
                </Link>
                <Link href="/admin/ai-settings" className={navClass('/admin/ai-settings')} title="Ai Settings">
                  <Cpu className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Ai Settings</span>}
                </Link>
                <Link href="/admin/plans" className={navClass('/admin/plans')} title={t('subscriptionPlans') || 'Subscription Plans'}>
                  <CreditCard className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('subscriptionPlans') || 'Subscription Plans'}</span>}
                </Link>
                <Link href="/admin/payment" className={navClass('/admin/payment')} title={t('paymentGateway') || 'Payment Gateway'}>
                  <Wallet className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('paymentGateway') || 'Payment Gateway'}</span>}
                </Link>
                <Link 
                  href="/admin/social-login-setting" 
                  className={navClass('/admin/social-login-setting')} 
                  title="Social Login"
                >
                  <Key className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Social Login</span>}
                </Link>
                <Link href="/admin/users" className={navClass('/admin/users')} title={t('users') || 'Users'}>
                  <UserPlus className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('users') || 'Users'}</span>}
                </Link>
                <Link href="/admin/recipe-type" className={navClass('/admin/recipe-type')} title={t('recipeType') || 'Recipe Type'}>
                  <Utensils className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('recipeType') || 'Recipe Type'}</span>}
                </Link>
                <Link href="/admin/ingredient-categories" className={navClass('/admin/ingredient-categories')} title={t('ingredientCategory') || 'Ingredient Category'}>
                  <Tag className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('ingredientCategory') || 'Ingredient Category'}</span>}
                </Link>
                <Link href="/admin/language" className={navClass('/admin/language')} title={t('language') || 'Language'}>
                  <Languages className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">{t('language') || 'Language'}</span>}
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
          {/* QUICK LANGUAGE SELECTOR & DARK MODE TOGGLE */}
          {showCollapsed ? (
            <div className="flex flex-col items-center gap-2 p-1">
              <div className={`relative flex items-center justify-center p-2 rounded-xl border border-[var(--color-border)] text-base cursor-pointer hover:border-[var(--color-sidebar-icon,#10b981)]/50 transition ${
                isDarkMode ? 'bg-[#070b13]' : 'bg-slate-200'
              }`} title={availableLanguages.find((l) => l.code === locale)?.name || 'Language'}>
                <span>{availableLanguages.find((l) => l.code === locale)?.flag || '🌐'}</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Change language"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code} className={isDarkMode ? 'bg-[#111726] text-white' : 'bg-white text-slate-900'}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={toggleThemeMode}
                className={`p-2 rounded-xl border border-[var(--color-border)] transition-colors flex items-center justify-center cursor-pointer ${
                  isDarkMode ? 'bg-[#070b13] hover:bg-[#141b2d]' : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme Mode"
              >
                {isDarkMode ? <Moon className="h-4 w-4 text-[#E05638]" /> : <Sun className="h-4 w-4 text-amber-500" />}
              </button>
            </div>
          ) : (
            <div className="px-1 py-1 flex items-center gap-2">
              <div className={`flex-1 flex items-center border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 shadow-sm ${
                isDarkMode ? 'bg-[#070b13]' : 'bg-slate-200'
              }`}>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className={`w-full bg-transparent text-xs font-bold outline-none cursor-pointer ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code} className={isDarkMode ? 'bg-[#111726] text-white' : 'bg-white text-slate-900'}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={toggleThemeMode}
                className={`p-2 rounded-xl border border-[var(--color-border)] transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                  isDarkMode ? 'bg-[#070b13] hover:bg-[#141b2d]' : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme Mode"
              >
                {isDarkMode ? <Moon className="h-4 w-4 text-[#E05638]" /> : <Sun className="h-4 w-4 text-amber-500" />}
              </button>
            </div>
          )}

          <Link href="/profile" className={navClass('/profile')} title={t('profile')}>
            <Settings className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('profile')}</span>}
          </Link>

          <Link
            href="/contacts"
            className={`flex items-center ${showCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition ${
              isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-[#141b2d]/50' 
                : 'text-slate-800 hover:text-slate-950 hover:bg-slate-200/80 font-bold'
            }`}
            title={t('contactUs')}
          >
            <Mail className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-800'}`} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('contactUs')}</span>}
          </Link>

          <button
            onClick={() => {
              logoutUser();
              window.location.href = '/login';
            }}
            className={`w-full flex items-center ${showCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
              isDarkMode 
                ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/20' 
                : 'text-slate-800 hover:text-red-600 hover:bg-red-100/70 font-bold'
            }`}
            title={t('logout')}
          >
            <LogOut className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-800'}`} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('logout')}</span>}
          </button>
          {/* DYNAMIC VERSION BADGE */}
          <div className={`pt-2 select-none flex items-center ${showCollapsed ? 'justify-center text-[10px]' : 'px-3.5 justify-between text-[11px]'} font-mono ${
            isDarkMode ? 'text-slate-500' : 'text-slate-600'
          }`}>
            {!showCollapsed && <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75">Version</span>}
            <span className="font-semibold tracking-tight opacity-90">v{packageInfo.version || '1.0.0'}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
"""
with open(sidebar_path, 'w', encoding='utf-8') as f:
    f.write(sidebar_code)
print(f"✓ Updated Sidebar navigation icons to use var(--color-sidebar-icon) at: {sidebar_path}")

# 4. Update app/admin/page.tsx to provide the Sidebar Icon Color picker in the Theme Tab
admin_page_path = os.path.join(app_dir, 'admin', 'page.tsx')
admin_page_code = """'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Palette,
  Image as ImageIcon, 
  Smile, 
  Globe, 
  Cpu, 
  CreditCard, 
  Wallet, 
  Users, 
  Utensils, 
  Tag, 
  Key,
  Languages,
  LayoutGrid,
  BookOpen
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { 
  getSiteConfig, 
  saveSiteConfig, 
  updateFavicon, 
  SiteIdentityConfig, 
  DEFAULT_SITE_NAME, 
  DEFAULT_SITE_ICON 
} from '@/lib/siteConfig';
import { applyThemeToDocument, saveThemeColors } from '@/lib/themeConfig';
import { useTranslation } from '@/components/LanguageProvider';

const PRESET_PALETTES = [
  { 
    name: 'Zecratary Coral', 
    primary: '#E05638', 
    primaryHover: '#c94529', 
    accent: '#10b981', 
    sidebarIcon: '#10b981',
    background: '#070b13',
    card: '#0b0f17',
    border: '#1e293b',
    textSecondary: '#94a3b8'
  },
  { 
    name: 'Emerald Forest', 
    primary: '#10b981', 
    primaryHover: '#059669', 
    accent: '#3b82f6', 
    sidebarIcon: '#10b981',
    background: '#06130d',
    card: '#0a1d14',
    border: '#133526',
    textSecondary: '#86efac'
  },
  { 
    name: 'Cyber Blue', 
    primary: '#2563eb', 
    primaryHover: '#1d4ed8', 
    accent: '#10b981', 
    sidebarIcon: '#38bdf8',
    background: '#080d1a',
    card: '#0c152b',
    border: '#1e293b',
    textSecondary: '#93c5fd'
  },
  { 
    name: 'Royal Purple', 
    primary: '#8b5cf6', 
    primaryHover: '#7c3aed', 
    accent: '#ec4899', 
    sidebarIcon: '#c084fc',
    background: '#0f081c',
    card: '#180d2e',
    border: '#2a1650',
    textSecondary: '#d8b4fe'
  },
  { 
    name: 'Amber Gold', 
    primary: '#f59e0b', 
    primaryHover: '#d97706', 
    accent: '#10b981', 
    sidebarIcon: '#fbbf24',
    background: '#120d04',
    card: '#1c1507',
    border: '#36270a',
    textSecondary: '#fcd34d'
  },
  { 
    name: 'Deep Midnight', 
    primary: '#38bdf8', 
    primaryHover: '#0284c7', 
    accent: '#a855f7', 
    sidebarIcon: '#38bdf8',
    background: '#020617',
    card: '#080e22',
    border: '#172554',
    textSecondary: '#7dd3fc'
  },
];

export default function AdminSettingsPage() {
  const { t: translate } = useTranslation() || {};
  const t = useCallback((key: string, fallback: string) => {
    if (typeof translate === 'function') {
      const val = translate(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [translate]);

  const [activeTab, setActiveTab] = useState<'branding' | 'theme'>('branding');
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Site Identity State
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [titlebarEmoji, setTitlebarEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [titlebarImage, setTitlebarImage] = useState<string>('');
  const [faviconEmoji, setFaviconEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [faviconImage, setFaviconImage] = useState<string>('');

  // Extended Theme Color State
  const [primaryColor, setPrimaryColor] = useState<string>('#E05638');
  const [primaryHoverColor, setPrimaryHoverColor] = useState<string>('#c94529');
  const [accentColor, setAccentColor] = useState<string>('#10b981');
  const [sidebarIconColor, setSidebarIconColor] = useState<string>('#10b981');
  const [backgroundColor, setBackgroundColor] = useState<string>('#070b13');
  const [cardBackgroundColor, setCardBackgroundColor] = useState<string>('#0b0f17');
  const [cardBorderColor, setCardBorderColor] = useState<string>('#1e293b');
  const [secondaryTextColor, setSecondaryTextColor] = useState<string>('#94a3b8');

  const titlebarFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  // Decoupled state reference to avoid stale closures in listeners
  const colorsRef = useRef({
    primary: primaryColor,
    primaryHover: primaryHoverColor,
    accent: accentColor,
    sidebarIcon: sidebarIconColor,
    background: backgroundColor,
    card: cardBackgroundColor,
    border: cardBorderColor,
    textSecondary: secondaryTextColor,
  });

  useEffect(() => {
    colorsRef.current = {
      primary: primaryColor,
      primaryHover: primaryHoverColor,
      accent: accentColor,
      sidebarIcon: sidebarIconColor,
      background: backgroundColor,
      card: cardBackgroundColor,
      border: cardBorderColor,
      textSecondary: secondaryTextColor,
    };
  }, [primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor]);

  const applyColorsLocally = (
    primary: string, 
    hover: string, 
    accent: string, 
    sidebarIcon: string,
    bg: string,
    card: string,
    border: string,
    textSec: string
  ) => {
    applyThemeToDocument({
      primary,
      primaryColor: primary,
      primaryHover: hover,
      accentEmerald: accent,
      accentColor: accent,
      accent: accent,
      sidebarIconColor: sidebarIcon,
      sidebarIcon: sidebarIcon,
      backgroundColor: bg,
      backgroundDark: bg,
      cardBackground: card,
      cardBorder: border,
      textSecondary: textSec
    });
  };

  // Initial load: Auth, Site Config, Theme Colors
  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    setUser(active);

    const cfg = getSiteConfig();
    setSiteName(cfg.siteName);
    setTitlebarEmoji(cfg.titlebarEmoji);
    setTitlebarImage(cfg.titlebarImage);
    setFaviconEmoji(cfg.faviconEmoji);
    setFaviconImage(cfg.faviconImage);

    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}

    try {
      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        const p = c.primary || c.primaryColor || '#E05638';
        const ph = c.primaryHover || '#c94529';
        const ac = c.accentEmerald || c.accentColor || c.accent || '#10b981';
        const sbi = c.sidebarIconColor || c.sidebarIcon || ac || '#10b981';
        const bg = c.backgroundColor || c.backgroundDark || '#070b13';
        const card = c.cardBackground || '#0b0f17';
        const border = c.cardBorder || '#1e293b';
        const textSec = c.textSecondary || '#94a3b8';

        setPrimaryColor(p);
        setPrimaryHoverColor(ph);
        setAccentColor(ac);
        setSidebarIconColor(sbi);
        setBackgroundColor(bg);
        setCardBackgroundColor(card);
        setCardBorderColor(border);
        setSecondaryTextColor(textSec);

        applyThemeToDocument({
          primary: p,
          primaryColor: p,
          primaryHover: ph,
          accentEmerald: ac,
          accentColor: ac,
          accent: ac,
          sidebarIconColor: sbi,
          sidebarIcon: sbi,
          backgroundColor: bg,
          backgroundDark: bg,
          cardBackground: card,
          cardBorder: border,
          textSecondary: textSec,
        });
      }
    } catch (_) {}

    fetch('/api/system-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const tc = data?.settings?.themeColors || data?.themeColors;
        if (data?.success && tc) {
          const p = tc.primary || tc.primaryColor || '#E05638';
          const ph = tc.primaryHover || '#c94529';
          const ac = tc.accentEmerald || tc.accentColor || tc.accent || '#10b981';
          const sbi = tc.sidebarIconColor || tc.sidebarIcon || ac || '#10b981';
          const bg = tc.backgroundColor || tc.backgroundDark || '#070b13';
          const card = tc.cardBackground || '#0b0f17';
          const border = tc.cardBorder || '#1e293b';
          const textSec = tc.textSecondary || '#94a3b8';

          if (!localStorage.getItem('zecratary_theme_colors')) {
            setPrimaryColor(p);
            setPrimaryHoverColor(ph);
            setAccentColor(ac);
            setSidebarIconColor(sbi);
            setBackgroundColor(bg);
            setCardBackgroundColor(card);
            setCardBorderColor(border);
            setSecondaryTextColor(textSec);

            applyThemeToDocument({
              primary: p,
              primaryColor: p,
              primaryHover: ph,
              accentEmerald: ac,
              sidebarIconColor: sbi,
              sidebarIcon: sbi,
              backgroundColor: bg,
              cardBackground: card,
              cardBorder: border,
              textSecondary: textSec,
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Theme mode change listener
  useEffect(() => {
    const handleModeChange = () => {
      try {
        const mode = localStorage.getItem('zecratary_theme_mode');
        const day = mode === 'light';
        setIsDayMode(day);
        const cur = colorsRef.current;
        applyThemeToDocument({
          primary: cur.primary,
          primaryHover: cur.primaryHover,
          accentEmerald: cur.accent,
          accentColor: cur.accent,
          accent: cur.accent,
          sidebarIconColor: cur.sidebarIcon,
          sidebarIcon: cur.sidebarIcon,
          backgroundColor: cur.background,
          backgroundDark: cur.background,
          cardBackground: cur.card,
          cardBorder: cur.border,
          textSecondary: cur.textSecondary,
        });
      } catch (_) {}
    };

    window.addEventListener('zecratary_theme_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleModeChange);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'titlebar' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t('admin.fileSizeError', 'File size exceeds the 2MB limit.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        if (target === 'titlebar') {
          setTitlebarImage(result);
        } else {
          setFaviconImage(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setPrimaryColor(preset.primary);
    setPrimaryHoverColor(preset.primaryHover);
    setAccentColor(preset.accent);
    setSidebarIconColor(preset.sidebarIcon || preset.accent);
    setBackgroundColor(preset.background);
    setCardBackgroundColor(preset.card);
    setCardBorderColor(preset.border);
    setSecondaryTextColor(preset.textSecondary);

    applyColorsLocally(
      preset.primary, 
      preset.primaryHover, 
      preset.accent, 
      preset.sidebarIcon || preset.accent,
      preset.background,
      preset.card,
      preset.border,
      preset.textSecondary
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBranding: SiteIdentityConfig = {
      siteName: siteName.trim() || DEFAULT_SITE_NAME,
      titlebarEmoji: titlebarEmoji.trim() || DEFAULT_SITE_ICON,
      titlebarImage,
      faviconEmoji: faviconEmoji.trim() || DEFAULT_SITE_ICON,
      faviconImage
    };
    saveSiteConfig(updatedBranding);

    const themeColors = {
      primary: primaryColor,
      primaryColor: primaryColor,
      primaryHover: primaryHoverColor,
      accentEmerald: accentColor,
      accentColor: accentColor,
      accent: accentColor,
      sidebarIconColor: sidebarIconColor,
      sidebarIcon: sidebarIconColor,
      backgroundColor: backgroundColor,
      backgroundDark: backgroundColor,
      cardBackground: cardBackgroundColor,
      cardBorder: cardBorderColor,
      textSecondary: secondaryTextColor,
    };

    saveThemeColors(themeColors);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!confirm(t('admin.confirmReset', 'Reset branding and theme settings to defaults?'))) return;

    const defaultName = DEFAULT_SITE_NAME;
    const defaultIcon = DEFAULT_SITE_ICON;
    const defaultPrimary = '#E05638';
    const defaultPrimaryHover = '#c94529';
    const defaultAccent = '#10b981';
    const defaultSidebarIcon = '#10b981';
    const defaultBg = '#070b13';
    const defaultCard = '#0b0f17';
    const defaultBorder = '#1e293b';
    const defaultTextSec = '#94a3b8';

    setSiteName(defaultName);
    setTitlebarEmoji(defaultIcon);
    setTitlebarImage('');
    setFaviconEmoji(defaultIcon);
    setFaviconImage('');

    setPrimaryColor(defaultPrimary);
    setPrimaryHoverColor(defaultPrimaryHover);
    setAccentColor(defaultAccent);
    setSidebarIconColor(defaultSidebarIcon);
    setBackgroundColor(defaultBg);
    setCardBackgroundColor(defaultCard);
    setCardBorderColor(defaultBorder);
    setSecondaryTextColor(defaultTextSec);

    saveSiteConfig({
      siteName: defaultName,
      titlebarEmoji: defaultIcon,
      titlebarImage: '',
      faviconEmoji: defaultIcon,
      faviconImage: ''
    });

    const defaultColors = {
      primary: defaultPrimary,
      primaryColor: defaultPrimary,
      primaryHover: defaultPrimaryHover,
      accentEmerald: defaultAccent,
      accentColor: defaultAccent,
      accent: defaultAccent,
      sidebarIconColor: defaultSidebarIcon,
      sidebarIcon: defaultSidebarIcon,
      backgroundColor: defaultBg,
      backgroundDark: defaultBg,
      cardBackground: defaultCard,
      cardBorder: defaultBorder,
      textSecondary: defaultTextSec
    };

    saveThemeColors(defaultColors);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isTitlebarImageActive = !!titlebarImage;
  const isFaviconImageActive = !!faviconImage;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* HEADER */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              {t('admin.siteIdentity', 'Site Identity & Branding')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('admin.siteIdentityDesc', 'Configure application name, comprehensive color themes, backgrounds, titlebar logo, and browser tab favicon.')}
          </p>
        </div>

        {saved && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
            isDayMode 
              ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <CheckCircle2 className="h-4 w-4" /> {t('admin.settingsSaved', 'Settings Saved & Broadcasted')}
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div 
        className="flex items-center gap-2 border-b pb-3" 
        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border shadow-xs"
          style={{
            backgroundColor: activeTab === 'branding' 
              ? (isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)') 
              : 'transparent',
            borderColor: activeTab === 'branding' 
              ? (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)') 
              : 'transparent',
            color: activeTab === 'branding' 
              ? 'var(--color-primary, #E05638)' 
              : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{t('admin.tabBranding', 'Site Identity & Branding')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border shadow-xs"
          style={{
            backgroundColor: activeTab === 'theme' 
              ? (isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)') 
              : 'transparent',
            borderColor: activeTab === 'theme' 
              ? (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)') 
              : 'transparent',
            color: activeTab === 'theme' 
              ? 'var(--color-primary, #E05638)' 
              : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
          }}
        >
          <Palette className="h-4 w-4" />
          <span>{t('admin.tabTheme', 'Theme')}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BRANDING */}
        <div className={activeTab === 'branding' ? 'space-y-6' : 'hidden'}>
          {/* APPLICATION NAME */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('admin.appName', 'Application Name')}
            </h2>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('admin.displayName', 'Display Name')}
              </label>
              <input 
                type="text" 
                value={siteName} 
                onChange={(e) => setSiteName(e.target.value)} 
                placeholder="e.g. Zecratary" 
                className="w-full sm:w-1/2 border rounded-xl px-3.5 py-2 font-bold outline-none transition" 
                style={{ 
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                  color: isDayMode ? '#0f172a' : '#ffffff' 
                }} 
              />
            </div>
          </div>

          {/* TITLEBAR BRAND ICON */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {t('admin.titlebarIcon', 'Titlebar & Sidebar Brand Icon')}
                </h2>
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('admin.titlebarIconDesc', 'Upload an image logo. If no image is uploaded or if removed, the system defaults to the emoji below.')}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
                isTitlebarImageActive 
                  ? (isDayMode ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')
                  : (isDayMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400')
              }`}>
                {isTitlebarImageActive ? t('admin.activeUploadedImage', 'Active: Uploaded Image') : t('admin.activeDefaultEmoji', 'Active: Default Emoji')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.customLogoImage', 'Custom Logo Image (PNG, JPG, SVG, WebP)')}
                </label>
                <input 
                  type="file" 
                  ref={titlebarFileRef} 
                  onChange={(e) => handleFileUpload(e, 'titlebar')} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => titlebarFileRef.current?.click()}
                    className="px-4 py-2 border rounded-xl font-extrabold flex items-center gap-2 cursor-pointer transition hover:opacity-80"
                    style={{ 
                      backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <Upload className="h-4 w-4" /> {t('common.uploadImage', 'Upload Image')}
                  </button>
                  {titlebarImage && (
                    <button
                      type="button"
                      onClick={() => setTitlebarImage('')}
                      className={`px-3 py-2 border rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        isDayMode 
                          ? 'text-red-600 border-red-300 hover:bg-red-50' 
                          : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" /> {t('admin.revertToEmoji', 'Revert to Emoji')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.defaultEmojiFallback', 'Default Emoji (Fallback)')}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={titlebarEmoji} 
                    onChange={(e) => setTitlebarEmoji(e.target.value)} 
                    maxLength={4} 
                    className="w-20 text-center text-xl border rounded-xl py-1.5 font-bold outline-none" 
                    style={{ 
                      backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                      color: isDayMode ? '#0f172a' : '#ffffff' 
                    }} 
                  />
                  <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.defaultEmojiDesc', 'Used whenever no custom image is supplied.')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('admin.sidebarHeaderPreview', 'Sidebar & Header Preview:')}
              </span>
              <div 
                className="flex items-center gap-2.5 p-3 rounded-2xl border w-fit" 
                style={{ 
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                  borderColor: isDayMode ? '#e2e8f0' : '#1e293b' 
                }} 
              >
                {isTitlebarImageActive ? (
                  <img src={titlebarImage} alt="Titlebar Logo" className="w-7 h-7 object-contain rounded" />
                ) : (
                  <span className="text-2xl">{titlebarEmoji || DEFAULT_SITE_ICON}</span>
                )}
                <span className="text-base font-black tracking-tight text-[var(--color-primary)]">
                  {siteName || DEFAULT_SITE_NAME}
                </span>
              </div>
            </div>
          </div>

          {/* FAVICON */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {t('admin.browserFavicon', 'Browser Favicon')}
                </h2>
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {t('admin.browserFaviconDesc', 'Upload an icon for browser tabs (PNG, ICO, SVG). If no image is uploaded, defaults to emoji.')}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
                isFaviconImageActive 
                  ? (isDayMode ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')
                  : (isDayMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400')
              }`}>
                {isFaviconImageActive ? t('admin.activeUploadedFavicon', 'Active: Uploaded Favicon') : t('admin.activeDefaultEmoji', 'Active: Default Emoji')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.customFaviconImage', 'Custom Favicon Image (PNG, ICO, SVG, WebP)')}
                </label>
                <input 
                  type="file" 
                  ref={faviconFileRef} 
                  onChange={(e) => handleFileUpload(e, 'favicon')} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => faviconFileRef.current?.click()}
                    className="px-4 py-2 border rounded-xl font-extrabold flex items-center gap-2 cursor-pointer transition hover:opacity-80"
                    style={{ 
                      backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <Upload className="h-4 w-4" /> {t('common.uploadFavicon', 'Upload Favicon')}
                  </button>
                  {faviconImage && (
                    <button
                      type="button"
                      onClick={() => setFaviconImage('')}
                      className={`px-3 py-2 border rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        isDayMode 
                          ? 'text-red-600 border-red-300 hover:bg-red-50' 
                          : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" /> {t('admin.revertToEmoji', 'Revert to Emoji')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.defaultFaviconEmoji', 'Default Favicon Emoji (Fallback)')}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={faviconEmoji} 
                    onChange={(e) => setFaviconEmoji(e.target.value)} 
                    maxLength={4} 
                    className="w-20 text-center text-xl border rounded-xl py-1.5 font-bold outline-none" 
                    style={{ 
                      backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                      color: isDayMode ? '#0f172a' : '#ffffff' 
                    }} 
                  />
                  <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.defaultFaviconDesc', 'Converts dynamically into an SVG favicon if no image is uploaded.')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('admin.browserTabPreview', 'Browser Tab Appearance Preview:')}
              </span>
              <div 
                className="max-w-xs border rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm"
                style={{ 
                  backgroundColor: isDayMode ? '#e2e8f0' : '#141b2d', 
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  {isFaviconImageActive ? (
                    <img src={faviconImage} alt="Favicon Preview" className="w-4 h-4 object-contain rounded shrink-0" />
                  ) : (
                    <span className="text-sm shrink-0">{faviconEmoji || titlebarEmoji || DEFAULT_SITE_ICON}</span>
                  )}
                  <span className="text-xs font-bold truncate">
                    {siteName || DEFAULT_SITE_NAME}
                  </span>
                </div>
                <span className="text-xs opacity-50">✕</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: THEME */}
        <div className={activeTab === 'theme' ? 'space-y-6' : 'hidden'}>
          {/* THEME COLOR & PALETTE SETTINGS */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-6 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    {t('admin.themeSettings', 'Complete Theme Color & Palette Settings')}
                  </h2>
                </div>
                <p className="text-[11px] mt-1" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('admin.themeSettingsDesc', 'Customize primary accents, interactive hovers, navigation icons, surfaces, borders, and typography.')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.primary', 'Primary')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: primaryColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.accent', 'Accent')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: accentColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.sidebarIcon', 'Sidebar Icon')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: sidebarIconColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.bg', 'Bg')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: backgroundColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.card', 'Card')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: cardBackgroundColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block font-bold text-[11px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('admin.coordinatedPalettes', 'Coordinated Palettes & Tones')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {PRESET_PALETTES.map((preset) => {
                  const isSelected = primaryColor.toLowerCase() === preset.primary.toLowerCase() && backgroundColor.toLowerCase() === preset.background.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${
                        isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isSelected ? 'var(--color-primary)' : isDayMode ? '#cbd5e1' : '#1e293b'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.sidebarIcon || preset.accent }} />
                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.background, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
                      </div>
                      <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand & Interaction Colors */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>
                {t('admin.brandColors', 'Brand & Interaction Colors')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Primary Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.primaryBrandColor', 'Primary Brand Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryColor(val);
                        applyColorsLocally(val, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(val, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#E05638"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.primaryBrandColorDesc', 'Brand highlights, buttons, and headers.')}
                  </span>
                </div>

                {/* Primary Hover Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.primaryHoverColor', 'Primary Hover Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryHoverColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryHoverColor(val);
                        applyColorsLocally(primaryColor, val, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={primaryHoverColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryHoverColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, val, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#c94529"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.primaryHoverColorDesc', 'Hover and focus states for buttons.')}
                  </span>
                </div>

                {/* Accent Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.accentColor', 'Accent / Success Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccentColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, val, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={accentColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccentColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, val, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#10b981"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.accentColorDesc', 'Badges, success alerts, and secondary accents.')}
                  </span>
                </div>

                {/* Sidebar & Nav Icon Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.sidebarIconColor', 'Sidebar Icon Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={sidebarIconColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSidebarIconColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, val, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={sidebarIconColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSidebarIconColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, val, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#10b981"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.sidebarIconColorDesc', 'Icons for navigation and categories in the sidebar.')}
                  </span>
                </div>
              </div>
            </div>

            {/* Surfaces & Container Colors Group */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>
                {t('admin.surfacesBordersTypography', 'Surfaces, Borders & Typography')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Background Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.pageBackground', 'Page Background')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={backgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setBackgroundColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, val, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={backgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setBackgroundColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, val, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#070b13"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.pageBackgroundDesc', 'Root viewport background in night mode.')}
                  </span>
                </div>

                {/* Card / Surface Background */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.cardBackground', 'Card / Surface Background')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={cardBackgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBackgroundColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, val, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={cardBackgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBackgroundColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, val, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#0b0f17"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.cardBackgroundDesc', 'Cards, modals, and container panels.')}
                  </span>
                </div>

                {/* Card / Container Border Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.containerBorderColor', 'Container Border Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={cardBorderColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBorderColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, val, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={cardBorderColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBorderColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, val, secondaryTextColor);
                        }
                      }}
                      placeholder="#1e293b"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.containerBorderColorDesc', 'Borders, dividers, and outlines.')}
                  </span>
                </div>

                {/* Secondary Subtitle Text Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.mutedSubtitleText', 'Muted / Subtitle Text')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={secondaryTextColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSecondaryTextColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, val);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={secondaryTextColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSecondaryTextColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, val);
                        }
                      }}
                      placeholder="#94a3b8"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.mutedSubtitleTextDesc', 'Descriptions and helper captions.')}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Live Component Preview */}
            <div className="pt-3 border-t space-y-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-bold text-[11px] block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('admin.previewTitle', 'Full Interactive Component Preview:')}
              </span>
              <div 
                className="p-5 rounded-3xl border transition-colors space-y-3" 
                style={{ 
                  backgroundColor: isDayMode ? '#f8fafc' : backgroundColor, 
                  borderColor: isDayMode ? '#cbd5e1' : cardBorderColor 
                }}
              >
                {/* Surface Card Preview */}
                <div 
                  className="p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                  style={{ 
                    backgroundColor: isDayMode ? '#ffffff' : cardBackgroundColor, 
                    borderColor: isDayMode ? '#e2e8f0' : cardBorderColor 
                  }}
                >
                  <div className="space-y-0.5">
                    <div className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {t('admin.surfaceCardPreview', 'Surface Card Preview')}
                    </div>
                    <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : secondaryTextColor }}>
                      {t('admin.surfaceCardPreviewDesc', 'This demonstrates your secondary text color, card surface, and card border.')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div 
                      className="px-2.5 py-1 rounded-xl border text-[10px] font-extrabold flex items-center gap-1"
                      style={{ 
                        backgroundColor: `${accentColor}18`, 
                        borderColor: `${accentColor}40`, 
                        color: accentColor 
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> {t('common.active', 'Active')}
                    </div>
                    <button 
                      type="button" 
                      className="px-3.5 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = primaryHoverColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = primaryColor)}
                    >
                      {t('common.actionButton', 'Action Button')}
                    </button>
                  </div>
                </div>

                {/* Sidebar Navigation Item Live Preview */}
                <div 
                  className="p-3.5 rounded-2xl border transition-colors flex items-center justify-between gap-3 shadow-sm"
                  style={{ 
                    backgroundColor: isDayMode ? '#ffffff' : cardBackgroundColor, 
                    borderColor: isDayMode ? '#e2e8f0' : cardBorderColor 
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-xl flex items-center justify-center transition-colors shadow-xs"
                      style={{ 
                        backgroundColor: `${sidebarIconColor}18`,
                        border: `1px solid ${sidebarIconColor}33`,
                        color: sidebarIconColor 
                      }}
                    >
                      <Utensils className="h-4 w-4" style={{ color: sidebarIconColor }} />
                    </div>
                    <div>
                      <div className="text-xs font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {t('admin.sidebarIconPreview', 'Sidebar Icon Color Preview')}
                      </div>
                      <p className="text-[10px]" style={{ color: isDayMode ? '#64748b' : secondaryTextColor }}>
                        {t('admin.sidebarIconPreviewDesc', 'Reflects live on Dashboard, Chef, Pantry, and Plan icons.')}
                      </p>
                    </div>
                  </div>
                  <span 
                    className="text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold"
                    style={{ 
                      backgroundColor: `${sidebarIconColor}18`, 
                      color: sidebarIconColor,
                      border: `1px solid ${sidebarIconColor}33` 
                    }}
                  >
                    {sidebarIconColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 border rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition hover:opacity-80 shadow-xs"
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : '#0b0f17',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#334155' : '#e2e8f0'
            }}
          >
            <RefreshCw className="h-4 w-4" /> {t('admin.resetDefaults', 'Reset to Defaults')}
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <CheckCircle2 className="h-4 w-4" /> {activeTab === 'theme' ? t('admin.saveThemeSettings', 'Save Theme Settings') : t('admin.saveBrandingSettings', 'Save Branding Settings')}
          </button>
        </div>
      </form>
    </div>
  );
}
"""
with open(admin_page_path, 'w', encoding='utf-8') as f:
    f.write(admin_page_code)
print(f"✓ Updated /admin page with Sidebar Icon Color control at: {admin_page_path}")

# 5. Ensure global CSS token fallback is declared in globals.css
css_candidates = glob.glob('**/globals.css', recursive=True) + glob.glob('**/global.css', recursive=True)
css_candidates = [f for f in css_candidates if 'node_modules' not in f and '.next' not in f]

for css_file in css_candidates:
    try:
        with open(css_file, 'r', encoding='utf-8') as f:
            css_data = f.read()
        if '--color-sidebar-icon' not in css_data:
            css_addition = """
/* Dynamic Sidebar Navigation Icon Token */
:root {
  --color-sidebar-icon: #10b981;
}
"""
            with open(css_file, 'a', encoding='utf-8') as f:
                f.write(css_addition)
            print(f"✓ Registered --color-sidebar-icon default token in: {css_file}")
    except Exception:
        pass

print("\n🚀 Theme setting for sidebar icons successfully installed!")
