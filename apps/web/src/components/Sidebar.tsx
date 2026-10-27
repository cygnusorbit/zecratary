'use client';

import packageInfo from '../../package.json';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, MessageSquare, UploadCloud, SquarePen, BookOpen, 
  Book, Package, ShoppingCart, Calendar, LayoutTemplate, UserPlus, 
  ShieldCheck, CreditCard, Tag, Utensils, Settings, LogOut, 
  Menu, X, Wallet, Languages, Cpu, Moon, Sun, Key, Coins, 
  Bell, BellRing, User as UserIcon, ChevronDown, 
  Layers, Check, Database, Receipt, Globe, Mail, ChevronRight
} from 'lucide-react';
import { getCurrentUser, logoutUser, User } from '@/lib/auth';
import { getSiteName, getSiteIcon, DEFAULT_SITE_NAME, DEFAULT_SITE_ICON, updateFavicon } from '@/lib/siteConfig';
import { useTranslation } from '@/components/LanguageProvider';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent' | 'promo' | 'system';
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥'
};

const LANGUAGE_FLAG_MAP: Record<string, { flag: string; native: string }> = {
  en: { flag: '🇺🇸', native: 'English' },
  th: { flag: '🇹🇭', native: 'ไทย' },
  es: { flag: '🇪🇸', native: 'Español' },
  fr: { flag: '🇫🇷', native: 'Français' },
  de: { flag: '🇩🇪', native: 'Deutsch' },
  it: { flag: '🇮🇹', native: 'Italiano' },
  ja: { flag: '🇯🇵', native: '日本語' },
  zh: { flag: '🇨🇳', native: '中文' },
  ko: { flag: '🇰🇷', native: '한국어' },
  pt: { flag: '🇵🇹', native: 'Português' },
  ru: { flag: '🇷🇺', native: 'Русский' }
};

const getLanguageMeta = (code: string) => {
  const c = (code || 'en').toLowerCase().trim();
  return LANGUAGE_FLAG_MAP[c] || { flag: '🌐', native: code.toUpperCase() };
};

const isImageIcon = (icon?: unknown): icon is string =>
  typeof icon === 'string' && (
    icon.startsWith('/') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('data:image')
  );

export default function Sidebar() {
  const pathname = usePathname() || '';
  const langContext = useTranslation();
  const t = langContext?.t || ((k: string, fb?: string) => fb || k);
  const currentLanguage = (langContext as any)?.currentLanguage || (langContext as any)?.locale || (langContext as any)?.language || 'en';
  const changeLanguage = (langContext as any)?.changeLanguage || (langContext as any)?.setLocale || (langContext as any)?.setLanguage || (() => {});
  const availableLanguages = (langContext as any)?.availableLanguages || [
    { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' }
  ];

  const [mounted, setMounted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [siteIcon, setSiteIcon] = useState<string>(DEFAULT_SITE_ICON);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Accordion Sections
  const [openSections, setOpenSections] = useState<{
    create: boolean;
    manage: boolean;
    plan: boolean;
    finance: boolean;
    admin: boolean;
  }>({
    create: true,
    manage: true,
    plan: true,
    finance: true,
    admin: false,
  });

  // Top Bar Dropdowns
  const [walletDropdownOpen, setWalletDropdownOpen] = useState<boolean>(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [dropdownLangExpanded, setDropdownLangExpanded] = useState<boolean>(false);

  // Balances & Telemetry
  const [tokenBalance, setTokenBalance] = useState<number>(50);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const syncUserState = useCallback(() => {
    try {
      const u = getCurrentUser();
      setCurrentUser(u);
      if (typeof getSiteName === 'function') setSiteName(getSiteName());
      if (typeof getSiteIcon === 'function') {
        const icon = getSiteIcon();
        setSiteIcon(icon);
        updateFavicon(icon);
      }

      if (typeof window !== 'undefined') {
        const themeMode = localStorage.getItem('zecratary_theme_mode') || 'dark';
        setIsDarkMode(themeMode === 'dark');

        const cur = localStorage.getItem('zecratary_currency') || 'USD';
        setCurrencySymbol(CURRENCY_SYMBOLS[cur] || '$');

        const storedSections = localStorage.getItem('zecratary_sidebar_sections');
        if (storedSections) {
          try {
            setOpenSections(prev => ({ ...prev, ...JSON.parse(storedSections) }));
          } catch (_) {}
        }

        if (u) {
          const storedTokens = localStorage.getItem(`zecratary_tokens_${u.id}`);
          if (storedTokens !== null) setTokenBalance(Number(storedTokens) || 50);

          const storedWallet = localStorage.getItem(`zecratary_wallet_${u.id}`);
          if (storedWallet !== null) setWalletBalance(Number(storedWallet) || 0.00);
        }
      }
    } catch (_) {}
  }, []);

  // Route Auto-Expansion
  useEffect(() => {
    if (!pathname) return;
    if (['/chef', '/import', '/manual'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.create ? prev : { ...prev, create: true });
    } else if (['/saved', '/books', '/pantry'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.manage ? prev : { ...prev, manage: true });
    } else if (['/shopping', '/planner', '/templates'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.plan ? prev : { ...prev, plan: true });
    } else if (['/token', '/wallet', '/subscriptions', '/billing'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.finance ? prev : { ...prev, finance: true });
    } else if (pathname.startsWith('/admin')) {
      setOpenSections(prev => prev.admin ? prev : { ...prev, admin: true });
    }
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    syncUserState();

    const handleSync = () => syncUserState();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('zecratary_site_settings_changed', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);
    window.addEventListener('zecratary_wallet_updated', handleSync);
    window.addEventListener('zecratary_tokens_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('zecratary_site_settings_changed', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleSync);
      window.removeEventListener('zecratary_tokens_updated', handleSync);
    };
  }, [syncUserState]);

  // Click Outside and Escape Key Dismissal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
        setNotifDropdownOpen(false);
        setLangDropdownOpen(false);
        setProfileDropdownOpen(false);
        setDropdownLangExpanded(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWalletDropdownOpen(false);
        setNotifDropdownOpen(false);
        setLangDropdownOpen(false);
        setProfileDropdownOpen(false);
        setDropdownLangExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleSection = (sectionKey: keyof typeof openSections) => {
    setOpenSections(prev => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('zecratary_sidebar_sections', JSON.stringify(next));
          fetch('/api/user/sidebar-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sections: next }),
          }).catch(() => {});
        } catch (_) {}
      }
      return next;
    });
  };

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (typeof window !== 'undefined') {
      const modeStr = nextMode ? 'dark' : 'light';
      localStorage.setItem('zecratary_theme_mode', modeStr);
      if (nextMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      window.dispatchEvent(new CustomEvent('zecratary_theme_mode_changed', { detail: { mode: modeStr } }));
    }
  };

  const handleLogout = async () => {
    try {
      setProfileDropdownOpen(false);
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/login?logout=true');
      }
    }
  };

  const isAuthRoute = Boolean(
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password')
  );

  const isHomePage = Boolean(
    pathname === '/' ||
    pathname === '' ||
    pathname === '/index'
  );

  if (!mounted || isAuthRoute || isHomePage || !currentUser) {
    return null;
  }

  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.email === 'admin@zecratary.com' ||
    currentUser?.email?.includes('admin')
  );

  const navClass = (route: string) => {
    const active = pathname === route || (route !== '/' && pathname.startsWith(route));
    return `flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs transition duration-200 cursor-pointer ${
      active ? 'text-white shadow-xs' : 'hover:text-white hover:bg-slate-800/30'
    }`;
  };

  const navStyle = (route: string) => {
    const active = pathname === route || (route !== '/' && pathname.startsWith(route));
    return active
      ? { backgroundColor: 'var(--color-primary)', color: '#ffffff' }
      : { color: 'var(--color-text-secondary)', backgroundColor: 'transparent' };
  };

  const planBadgeText = isAdmin 
    ? t('topbarPlanAdmin', 'Admin Access')
    : currentUser?.subscription_plan === 'pro' 
      ? t('topbarPlanPro', 'Pro Plan') 
      : t('topbarPlanFree', 'Free Tier');

  return (
    <>
      {/* DESKTOP TOP BAR (Authenticated Workspace) */}
      <header
        id="zecratary-desktop-topbar"
        className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b z-40 items-center justify-between px-6 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)'
        }}
        ref={dropdownRef}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border hover:bg-slate-800/20 cursor-pointer transition mr-1"
            style={{ borderColor: 'var(--color-border)' }}
            title={isCollapsed ? t('expandSidebar', 'Expand Menu') : t('collapseSidebar', 'Collapse Menu')}
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2.5 font-black text-lg text-[var(--color-primary)]">
            {isImageIcon(siteIcon) ? (
              <img src={siteIcon} alt="Logo" className="w-7 h-7 rounded-lg object-contain" />
            ) : (
              <span className="text-2xl">{siteIcon || '🍳'}</span>
            )}
            <span>{siteName || 'Zecratary'}</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* 1. WALLET & TOKEN BALANCE PILL */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setWalletDropdownOpen(!walletDropdownOpen);
                setNotifDropdownOpen(false);
                setLangDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              title={t('topbarTokenTooltip', 'AI Token & Wallet Balance')}
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{tokenBalance.toLocaleString()}</span>
              <span className="opacity-40">|</span>
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              <span>{currencySymbol}{walletBalance.toFixed(2)}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {walletDropdownOpen && (
              <div
                role="menu"
                aria-label="Token & Wallet Summary"
                data-lpignore="true"
                data-form-type="other"
                className="absolute right-0 mt-2 w-64 border rounded-2xl p-3 shadow-xl z-50 space-y-2 text-xs transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <div className="font-extrabold text-[11px] uppercase tracking-wider text-[var(--color-primary)] px-1">
                  {t('tokenAndWallet', 'Token & Wallet Balance')}
                </div>
                <div className="p-2.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">{t('availableTokens', 'Tokens')}:</span>
                    <span className="font-bold text-amber-400">{tokenBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">{t('walletCredits', 'Credits')}:</span>
                    <span className="font-bold text-emerald-400">{currencySymbol}{walletBalance.toFixed(2)}</span>
                  </div>
                </div>
                <Link
                  href="/wallet"
                  onClick={() => setWalletDropdownOpen(false)}
                  className="block w-full py-2 text-center rounded-xl text-white font-bold text-xs transition shadow-xs"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('manageWallet', 'Top Up & Wallet Portal')}
                </Link>
                <Link
                  href="/token"
                  onClick={() => setWalletDropdownOpen(false)}
                  className="block w-full py-2 text-center rounded-xl font-bold text-xs transition border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-inner-dark)' }}
                >
                  {t('manageTokens', 'Token Bundles & Quotas')}
                </Link>
              </div>
            )}
          </div>

          {/* 2. NOTIFICATIONS BELL */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setWalletDropdownOpen(false);
                setLangDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="p-2 rounded-xl border transition cursor-pointer shadow-xs relative"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              title={t('topbarNotifications', 'Notifications')}
            >
              <Bell className="h-4 w-4" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            {notifDropdownOpen && (
              <div
                role="menu"
                aria-label="Notifications"
                data-lpignore="true"
                data-form-type="other"
                className="absolute right-0 mt-2 w-80 border rounded-2xl p-4 shadow-xl z-50 space-y-3 text-xs transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{t('topbarNotifications', 'Notifications')}</span>
                  {isAdmin && (
                    <Link
                      href="/admin/notification-settings"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-[10px] text-[var(--color-primary)] hover:underline"
                    >
                      {t('settings', 'Settings')}
                    </Link>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 opacity-60 text-xs">
                      {t('topbarNoNotifications', 'No unread notifications')}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-xl border space-y-1"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="font-bold text-xs">{n.title}</div>
                        <div className="text-[11px] opacity-80">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. QUICK LANGUAGE BUTTON */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setWalletDropdownOpen(false);
                setNotifDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              title={t('topbarLanguageSelector', 'Select Language')}
            >
              <span className="text-sm">{getLanguageMeta(currentLanguage).flag}</span>
              <span className="uppercase text-[11px] font-extrabold">{currentLanguage || 'EN'}</span>
            </button>

            {langDropdownOpen && (
              <div
                role="menu"
                aria-label="Language Selector"
                data-lpignore="true"
                data-form-type="other"
                className="absolute right-0 mt-2 w-48 border rounded-2xl p-2 shadow-xl z-50 space-y-1 text-xs transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {availableLanguages.map((lang: any) => {
                  const meta = getLanguageMeta(lang.code);
                  const isSelected = currentLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (typeof changeLanguage === 'function') changeLanguage(lang.code);
                        setLangDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/40 text-xs font-semibold cursor-pointer transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{meta.flag}</span>
                        <span>{lang.native || meta.native}</span>
                        <span className="text-[10px] opacity-60 uppercase font-mono">({lang.code})</span>
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. QUICK DAY / DARK TOGGLE */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title={isDarkMode ? t('switchToDayMode', 'Day Mode') : t('switchToDarkMode', 'Dark Mode')}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
          </button>

          {/* 5. RESTORED FULL PROFILE DROPDOWN MENU */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setWalletDropdownOpen(false);
                setNotifDropdownOpen(false);
                setLangDropdownOpen(false);
                setDropdownLangExpanded(false);
              }}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              aria-label={t('topbarUserMenu', 'User Menu')}
            >
              <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center font-black text-xs">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-bold max-w-[85px] truncate">{currentUser?.name || 'User'}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {profileDropdownOpen && (
              <div
                role="menu"
                aria-label="User Profile Dropdown"
                data-lpignore="true"
                data-form-type="other"
                className="absolute right-0 mt-2 w-64 border rounded-3xl p-2.5 shadow-2xl z-50 space-y-1.5 text-xs transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {/* User Identity Header */}
                <div className="px-3 py-2 border-b mb-1 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold truncate text-xs">{currentUser?.name || 'User'}</span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {planBadgeText}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-60 truncate">{currentUser?.email || ''}</div>
                </div>

                {/* Core Navigation Links */}
                <Link
                  href="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/40 font-bold transition"
                >
                  <UserIcon className="h-4 w-4 opacity-75" />
                  <span>{t('topbarProfile', 'User Profile')}</span>
                </Link>

                <Link
                  href="/subscriptions"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/40 font-bold transition"
                >
                  <Layers className="h-4 w-4 text-sky-400 opacity-80" />
                  <span>{t('topbarSubscriptions', 'Subscriptions')}</span>
                </Link>

                <Link
                  href="/billing"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/40 font-bold transition"
                >
                  <Receipt className="h-4 w-4 opacity-75" />
                  <span>{t('topbarBillingHistory', 'Billing History')}</span>
                </Link>

                <Link
                  href="/contacts"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/40 font-bold transition"
                >
                  <Mail className="h-4 w-4 opacity-75" />
                  <span>{t('contactSupport', 'Contact Support')}</span>
                </Link>

                {/* RESTORED PREFERENCES SECTION (Language & Day/Dark Mode) */}
                <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                  {/* Inline Language Selector */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setDropdownLangExpanded(!dropdownLangExpanded)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/40 font-bold transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Globe className="h-4 w-4 text-[var(--color-primary)]" />
                        <span>{t('interfaceLanguage', 'Language')}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs">{getLanguageMeta(currentLanguage).flag}</span>
                        <span className="text-[10px] font-mono uppercase opacity-75">{currentLanguage}</span>
                        <ChevronRight className={`h-3 w-3 opacity-60 transition-transform duration-200 ${dropdownLangExpanded ? 'rotate-90' : 'rotate-0'}`} />
                      </span>
                    </button>

                    {dropdownLangExpanded && (
                      <div 
                        className="my-1 ml-2 p-1.5 border rounded-2xl space-y-1 transition-colors duration-200"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        {availableLanguages.map((lang: any) => {
                          const meta = getLanguageMeta(lang.code);
                          const isSel = currentLanguage === lang.code;
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => {
                                if (typeof changeLanguage === 'function') changeLanguage(lang.code);
                                setDropdownLangExpanded(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/30 text-xs font-semibold cursor-pointer transition"
                            >
                              <span className="flex items-center gap-2">
                                <span>{meta.flag}</span>
                                <span>{lang.native || meta.native}</span>
                              </span>
                              {isSel && <Check className="h-3 w-3 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inline Day / Dark Mode Switcher */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/40 font-bold transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
                      <span>{t('themeMode', 'Theme Mode')}</span>
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-lg border text-[10px] font-bold"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-inner-dark)'
                      }}
                    >
                      {isDarkMode ? t('topbarThemeDark', 'Dark') : t('topbarThemeDay', 'Day')}
                    </span>
                  </button>
                </div>

                {/* Functional Logout Option */}
                <div className="pt-1.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 font-bold transition text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('logOut', 'Log Out')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE APPLICATION HEADER */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 border-b z-40 flex items-center justify-between px-4 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)'
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2 font-black text-sm text-[var(--color-primary)]">
          {isImageIcon(siteIcon) ? (
            <img src={siteIcon} alt="Logo" className="w-6 h-6 rounded-md object-contain" />
          ) : (
            <span className="text-xl">{siteIcon || '🍳'}</span>
          )}
          <span>{siteName || 'Zecratary'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border"
            style={{ borderColor: 'var(--color-border)' }}
            title={isDarkMode ? 'Day Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border cursor-pointer"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* AUTHENTICATED SIDEBAR NAVIGATION DRAWER */}
      <aside
        className={`hidden md:flex flex-col fixed top-16 bottom-0 left-0 border-r z-30 transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <Link
              href="/dashboard"
              className={navClass('/dashboard')}
              style={navStyle('/dashboard')}
              title={t('dashboard', 'Dashboard')}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t('dashboard', 'Dashboard')}</span>}
            </Link>
          </div>

          {/* 1. CREATE ACCORDION */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleSection('create')}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <span>{t('createSection', 'Create')}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.create ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="h-px bg-slate-800/40 my-2" />
            )}

            {(openSections.create || isCollapsed) && (
              <div className="space-y-0.5">
                <Link href="/chef" className={navClass('/chef')} style={navStyle('/chef')} title={t('aiChef', 'AI Assistant')}>
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('aiChef', 'AI Assistant')}</span>}
                </Link>
                <Link href="/manual" className={navClass('/manual')} style={navStyle('/manual')} title={t('manualEntry', 'Add Recipe')}>
                  <SquarePen className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('manualEntry', 'Add Recipe')}</span>}
                </Link>
                <Link href="/import" className={navClass('/import')} style={navStyle('/import')} title={t('importRecipe', 'Import Recipe')}>
                  <UploadCloud className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('importRecipe', 'Import Recipe')}</span>}
                </Link>
              </div>
            )}
          </div>

          {/* 2. MANAGE ACCORDION */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleSection('manage')}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <span>{t('manageSection', 'Manage')}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.manage ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="h-px bg-slate-800/40 my-2" />
            )}

            {(openSections.manage || isCollapsed) && (
              <div className="space-y-0.5">
                <Link href="/saved" className={navClass('/saved')} style={navStyle('/saved')} title={t('savedRecipes', 'Saved Recipes')}>
                  <BookOpen className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('savedRecipes', 'Saved Recipes')}</span>}
                </Link>
                <Link href="/books" className={navClass('/books')} style={navStyle('/books')} title={t('cookbooks', 'Cookbooks')}>
                  <Book className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('cookbooks', 'Cookbooks')}</span>}
                </Link>
                <Link href="/pantry" className={navClass('/pantry')} style={navStyle('/pantry')} title={t('pantryInventory', 'Pantry Inventory')}>
                  <Package className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('pantryInventory', 'Pantry Inventory')}</span>}
                </Link>
              </div>
            )}
          </div>

          {/* 3. PLAN ACCORDION */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleSection('plan')}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <span>{t('planSection', 'Plan')}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.plan ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="h-px bg-slate-800/40 my-2" />
            )}

            {(openSections.plan || isCollapsed) && (
              <div className="space-y-0.5">
                <Link href="/planner" className={navClass('/planner')} style={navStyle('/planner')} title={t('mealPlanner', 'Meal Planner')}>
                  <Calendar className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('mealPlanner', 'Meal Planner')}</span>}
                </Link>
                <Link href="/templates" className={navClass('/templates')} style={navStyle('/templates')} title={t('templates', 'Meal Blueprints')}>
                  <LayoutTemplate className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('templates', 'Meal Blueprints')}</span>}
                </Link>
                <Link href="/shopping" className={navClass('/shopping')} style={navStyle('/shopping')} title={t('shoppingList', 'Shopping List')}>
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('shoppingList', 'Shopping List')}</span>}
                </Link>
              </div>
            )}
          </div>

          {/* 4. FINANCIAL & UTILITY ACCORDION */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleSection('finance')}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <span>{t('financeSection', 'Finance & Hub')}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.finance ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="h-px bg-slate-800/40 my-2" />
            )}

            {(openSections.finance || isCollapsed) && (
              <div className="space-y-0.5">
                <Link href="/token" className={navClass('/token')} style={navStyle('/token')} title={t('tokenPortal', 'Token Portal')}>
                  <Coins className="h-4 w-4 shrink-0 text-amber-400" />
                  {!isCollapsed && <span>{t('tokenPortal', 'Token Portal')}</span>}
                </Link>
                <Link href="/wallet" className={navClass('/wallet')} style={navStyle('/wallet')} title={t('walletPortal', 'Store Wallet')}>
                  <Wallet className="h-4 w-4 shrink-0 text-emerald-400" />
                  {!isCollapsed && <span>{t('walletPortal', 'Store Wallet')}</span>}
                </Link>
                <Link href="/subscriptions" className={navClass('/subscriptions')} style={navStyle('/subscriptions')} title={t('subscriptions', 'Subscriptions')}>
                  <Layers className="h-4 w-4 shrink-0 text-sky-400" />
                  {!isCollapsed && <span>{t('subscriptions', 'Subscriptions')}</span>}
                </Link>
                <Link href="/billing" className={navClass('/billing')} style={navStyle('/billing')} title={t('billing', 'Billing History')}>
                  <Receipt className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{t('billing', 'Billing History')}</span>}
                </Link>
              </div>
            )}
          </div>

          {/* 5. ADMIN MANAGEMENT ACCORDION */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection('admin')}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:opacity-100 transition cursor-pointer"
                >
                  <span>{t('adminAccess', 'Admin Access')}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections.admin ? 'rotate-0' : '-rotate-90'}`} />
                </button>
              ) : (
                <div className="h-px bg-slate-800/40 my-2" />
              )}

              {(openSections.admin || isCollapsed) && (
                <div className="space-y-0.5">
                  <Link href="/admin" className={navClass('/admin')} style={navStyle('/admin')} title={t('adminOverview', 'Overview')}>
                    <Settings className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('adminOverview', 'Overview')}</span>}
                  </Link>
                  <Link href="/admin/frontend" className={navClass('/admin/frontend')} style={navStyle('/admin/frontend')} title={t('pageBuilder', 'Page Builder')}>
                    <Globe className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('pageBuilder', 'Page Builder')}</span>}
                  </Link>
                  <Link href="/admin/users" className={navClass('/admin/users')} style={navStyle('/admin/users')} title={t('users', 'Users')}>
                    <UserPlus className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('users', 'User Accounts')}</span>}
                  </Link>
                  <Link href="/admin/plans" className={navClass('/admin/plans')} style={navStyle('/admin/plans')} title={t('plans', 'Plans')}>
                    <CreditCard className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('plans', 'Subscription Plans')}</span>}
                  </Link>
                  <Link href="/admin/payment" className={navClass('/admin/payment')} style={navStyle('/admin/payment')} title={t('payments', 'Payments')}>
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('payments', 'Payment Gateway')}</span>}
                  </Link>
                  <Link href="/admin/token-setting" className={navClass('/admin/token-setting')} style={navStyle('/admin/token-setting')} title={t('tokens', 'Tokens')}>
                    <Coins className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('tokens', 'Token Pricing')}</span>}
                  </Link>
                  <Link href="/admin/wallet-settings" className={navClass('/admin/wallet-settings')} style={navStyle('/admin/wallet-settings')} title={t('wallet', 'Wallet')}>
                    <Wallet className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('wallet', 'Wallet Settings')}</span>}
                  </Link>
                  <Link href="/admin/notification-settings" className={navClass('/admin/notification-settings')} style={navStyle('/admin/notification-settings')} title={t('notifications', 'Alerts')}>
                    <BellRing className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('notifications', 'Notifications')}</span>}
                  </Link>
                  <Link href="/admin/ai-settings" className={navClass('/admin/ai-settings')} style={navStyle('/admin/ai-settings')} title={t('aiModels', 'AI Models')}>
                    <Cpu className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('aiModels', 'AI Engine')}</span>}
                  </Link>
                  <Link href="/admin/recipe-type" className={navClass('/admin/recipe-type')} style={navStyle('/admin/recipe-type')} title={t('recipeTypes', 'Recipe Types')}>
                    <Utensils className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('recipeTypes', 'Recipe Types')}</span>}
                  </Link>
                  <Link href="/admin/ingredient-categories" className={navClass('/admin/ingredient-categories')} style={navStyle('/admin/ingredient-categories')} title={t('categories', 'Categories')}>
                    <Tag className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('categories', 'Categories')}</span>}
                  </Link>
                  <Link href="/admin/social-login-setting" className={navClass('/admin/social-login-setting')} style={navStyle('/admin/social-login-setting')} title={t('socialLogin', 'OAuth')}>
                    <Key className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('socialLogin', 'Social Login')}</span>}
                  </Link>
                  <Link href="/admin/database" className={navClass('/admin/database')} style={navStyle('/admin/database')} title={t('database', 'Database')}>
                    <Database className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('database', 'Database')}</span>}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER CONTROLS */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/contacts" className={navClass('/contacts')} style={navStyle('/contacts')} title={t('contactSupport', 'Contact Support')}>
            <Mail className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t('contactSupport', 'Contact Support')}</span>}
          </Link>

          <div className="flex items-center justify-between pt-1 px-1 text-[10px] font-mono opacity-60">
            {!isCollapsed && <span>{t('version', 'App Version')}</span>}
            <span>v{packageInfo.version || '1.0.0'}</span>
          </div>
        </div>
      </aside>

      {/* MOBILE APPLICATION DRAWER */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full flex flex-col p-5 space-y-4 overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-text)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-extrabold text-sm">{siteName || 'Zecratary'}</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={navClass('/dashboard')} style={navStyle('/dashboard')}>
                <LayoutDashboard className="h-4 w-4" /> <span>{t('dashboard', 'Dashboard')}</span>
              </Link>
              <Link href="/chef" onClick={() => setMobileMenuOpen(false)} className={navClass('/chef')} style={navStyle('/chef')}>
                <MessageSquare className="h-4 w-4" /> <span>{t('aiChef', 'AI Assistant')}</span>
              </Link>
              <Link href="/saved" onClick={() => setMobileMenuOpen(false)} className={navClass('/saved')} style={navStyle('/saved')}>
                <BookOpen className="h-4 w-4" /> <span>{t('savedRecipes', 'Saved Recipes')}</span>
              </Link>
              <Link href="/books" onClick={() => setMobileMenuOpen(false)} className={navClass('/books')} style={navStyle('/books')}>
                <Book className="h-4 w-4" /> <span>{t('cookbooks', 'Cookbooks')}</span>
              </Link>
              <Link href="/pantry" onClick={() => setMobileMenuOpen(false)} className={navClass('/pantry')} style={navStyle('/pantry')}>
                <Package className="h-4 w-4" /> <span>{t('pantryInventory', 'Pantry Inventory')}</span>
              </Link>
              <Link href="/planner" onClick={() => setMobileMenuOpen(false)} className={navClass('/planner')} style={navStyle('/planner')}>
                <Calendar className="h-4 w-4" /> <span>{t('mealPlanner', 'Meal Planner')}</span>
              </Link>
              <Link href="/shopping" onClick={() => setMobileMenuOpen(false)} className={navClass('/shopping')} style={navStyle('/shopping')}>
                <ShoppingCart className="h-4 w-4" /> <span>{t('shoppingList', 'Shopping List')}</span>
              </Link>
              <Link href="/token" onClick={() => setMobileMenuOpen(false)} className={navClass('/token')} style={navStyle('/token')}>
                <Coins className="h-4 w-4 text-amber-400" /> <span>{t('tokenPortal', 'Token Portal')}</span>
              </Link>
              <Link href="/wallet" onClick={() => setMobileMenuOpen(false)} className={navClass('/wallet')} style={navStyle('/wallet')}>
                <Wallet className="h-4 w-4 text-emerald-400" /> <span>{t('walletPortal', 'Store Wallet')}</span>
              </Link>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className={navClass('/profile')} style={navStyle('/profile')}>
                <UserIcon className="h-4 w-4" /> <span>{t('topbarProfile', 'User Profile')}</span>
              </Link>
              <Link href="/contacts" onClick={() => setMobileMenuOpen(false)} className={navClass('/contacts')} style={navStyle('/contacts')}>
                <Mail className="h-4 w-4" /> <span>{t('contactSupport', 'Contact Support')}</span>
              </Link>
            </div>

            <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('logOut', 'Log Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
