'use client';

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
    window.addEventListener('zecratary_theme_updated', handleThemeModeSync);
    window.addEventListener('storage', handleSiteSync);
    window.addEventListener('storage', handleLangSync);

    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('zecratary_auth_changed', handleAuthChange);
      window.removeEventListener('zecratary_site_settings_changed', handleSiteSync);
      window.removeEventListener('zecratary_languages_updated', handleLangSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeModeSync);
      window.removeEventListener('zecratary_theme_changed', handleThemeModeSync);
      window.removeEventListener('zecratary_theme_updated', handleThemeModeSync);
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
      window.dispatchEvent(new Event('zecratary_theme_updated'));
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

  // Active styles harmonize with dynamic primary color
  const navClass = (href: string) => `
    w-full flex items-center ${showCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 select-none
    ${isActive(href)
      ? isDarkMode
        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 shadow-md font-bold'
        : 'bg-[var(--color-primary)]/10 text-slate-900 border border-[var(--color-primary)]/40 shadow-sm font-bold'
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
              <Home className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
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
              <MessageSquare className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('chefAi')}</span>}
            </Link>
            <Link href="/import" className={navClass('/import')} title={t('import')}>
              <UploadCloud className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('import')}</span>}
            </Link>
            <Link href="/manual" className={navClass('/manual')} title={t('manual')}>
              <SquarePen className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
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
              <BookOpen className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('savedRecipes')}</span>}
            </Link>
            <Link href="/books" className={navClass('/books')} title={t('books')}>
              <Book className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('books')}</span>}
            </Link>
            <Link href="/pantry" className={navClass('/pantry')}>
              <Package className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
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
              <ShoppingCart className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('shoppingList')}</span>}
            </Link>
            <Link href="/planner" className={navClass('/planner')}>
              <Calendar className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('planner')}</span>}
            </Link>
            <Link href="/templates" className={navClass('/templates')}>
              <LayoutTemplate className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
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
              <div className={`relative flex items-center justify-center p-2 rounded-xl border border-[var(--color-border)] text-base cursor-pointer hover:border-[var(--color-primary)]/50 transition ${
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
                {isDarkMode ? <Moon className="h-4 w-4 text-[var(--color-primary)]" /> : <Sun className="h-4 w-4 text-amber-500" />}
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
                {isDarkMode ? <Moon className="h-4 w-4 text-[var(--color-primary)]" /> : <Sun className="h-4 w-4 text-amber-500" />}
              </button>
            </div>
          )}

                    <Link href="/profile" className={navClass('/profile')} title={t('profile')}>
            <Settings className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('profile')}</span>}
          </Link>

          <Link href="/billing" className={navClass('/billing')} title={t('billing') || 'Billing'}>
            <CreditCard className={`h-4 w-4 shrink-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('billing') || 'Billing'}</span>}
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
