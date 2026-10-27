// Generated & Maintained by AI Collaborator - Production Build Compliant
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
  Layers, Check, Database, Receipt, Globe, Mail, ChevronRight,
  Plus, CheckCheck, HardDrive
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
  createdAt?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
  JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
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

const isImageIcon = (icon?: unknown): boolean =>
  typeof icon === 'string' && (
    icon.startsWith('/') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('data:image')
  );

/**
 * Universal Dynamic Token Icon Renderer
 */
function DynamicTokenIcon({ icon, symbol, size = 16, className = '' }: { icon?: any; symbol?: any; size?: number; className?: string }) {
  const iconStr = typeof icon === 'string' ? icon.trim() : '';
  const symStr = typeof symbol === 'string' ? symbol.trim() : '';

  if (isImageIcon(iconStr)) {
    return (
      <img 
        src={iconStr} 
        alt="Token" 
        className={`object-contain rounded shrink-0 ${className}`} 
        style={{ width: size, height: size }} 
      />
    );
  }
  if (iconStr && iconStr !== 'Coins' && iconStr !== '🪙') {
    return <span className={`shrink-0 leading-none select-none ${className}`} style={{ fontSize: size }}>{iconStr}</span>;
  }
  if (symStr && symStr !== '🪙' && symStr.length <= 3) {
    return <span className={`font-mono font-black text-amber-500 shrink-0 ${className}`} style={{ fontSize: size }}>{symStr}</span>;
  }
  return <Coins className={`text-amber-500 shrink-0 ${className}`} style={{ width: size, height: size }} />;
}

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

  // Topbar Dropdown Controls
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [dropdownLangExpanded, setDropdownLangExpanded] = useState<boolean>(false);

  // Synchronous Balances & Telemetry
  const [tokenBalance, setTokenBalance] = useState<number>(() => {
    try {
      const u = getCurrentUser();
      const val = Number(u?.token_balance ?? u?.tokenBalance ?? u?.tokens ?? 100);
      return isNaN(val) ? 100 : val;
    } catch (_) { return 100; }
  });
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenIcon, setTokenIcon] = useState<string>('🪙');

  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const u = getCurrentUser();
      const val = parseFloat(String(u?.wallet_balance ?? u?.walletBalance ?? 0));
      return isNaN(val) ? 0 : val;
    } catch (_) { return 0; }
  });
  const [walletCurrency, setWalletCurrency] = useState<string>('USD');
  const [walletSymbol, setWalletSymbol] = useState<string>('$');

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const topbarRef = useRef<HTMLDivElement>(null);

  // Comprehensive Telemetry & Balances Fetcher
  const fetchBalancesAndTelemetry = useCallback(async (activeU?: any) => {
    try {
      const u = activeU || getCurrentUser();
      const params = new URLSearchParams();
      if (u?.id) params.set('userId', String(u.id));
      if (u?.email) params.set('email', String(u.email));
      const qs = params.toString() ? `?${params.toString()}&t=${Date.now()}` : `?t=${Date.now()}`;

      const [tokRes, walRes, notifRes, cfgRes] = await Promise.allSettled([
        fetch(`/api/tokens${qs}`, { cache: 'no-store' }),
        fetch(`/api/wallet${qs}`, { cache: 'no-store' }),
        fetch(`/api/notifications${qs}`, { cache: 'no-store' }),
        fetch(`/api/admin/token-setting`, { cache: 'no-store' })
      ]);

      if (tokRes.status === 'fulfilled' && tokRes.value.ok) {
        const tData = await tokRes.value.json();
        const rawTok = tData.tokenBalance ?? tData.token_balance ?? tData.balance ?? tData.tokens;
        const numTok = Number(rawTok);
        if (!isNaN(numTok)) setTokenBalance(numTok);
        if (tData.tokenSymbol) setTokenSymbol(tData.tokenSymbol);
        if (tData.tokenIcon) setTokenIcon(tData.tokenIcon);
      }

      if (walRes.status === 'fulfilled' && walRes.value.ok) {
        const wData = await walRes.value.json();
        const rawWal = wData.wallet_balance ?? wData.walletBalance ?? wData.balance ?? wData.user?.wallet_balance;
        const numWal = parseFloat(String(rawWal ?? 0));
        if (!isNaN(numWal)) setWalletBalance(numWal);
        const curr = wData.currency || wData.settings?.currency || 'USD';
        setWalletCurrency(curr);
        setWalletSymbol(CURRENCY_SYMBOLS[curr.toUpperCase()] || wData.walletSymbol || '$');
      }

      if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
        const nData = await notifRes.value.json();
        if (Array.isArray(nData.notifications)) {
          setNotifications(nData.notifications);
          setUnreadCount(nData.unreadCount ?? nData.notifications.filter((x: any) => !x.isRead).length);
        }
      }

      if (cfgRes.status === 'fulfilled' && cfgRes.value.ok) {
        const cData = await cfgRes.value.json();
        const cfg = cData.settings || cData.config || cData;
        if (cfg?.tokenIcon) setTokenIcon(cfg.tokenIcon);
        if (cfg?.tokenSymbol) setTokenSymbol(cfg.tokenSymbol);
      }
    } catch (_) {}
  }, []);

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
        setWalletCurrency(cur);
        setWalletSymbol(CURRENCY_SYMBOLS[cur] || '$');

        const storedSections = localStorage.getItem('zecratary_sidebar_sections');
        if (storedSections) {
          try {
            setOpenSections(prev => ({ ...prev, ...JSON.parse(storedSections) }));
          } catch (_) {}
        }
      }

      if (u?.id || u?.email) {
        fetch(`/api/user/sidebar-settings?userId=${encodeURIComponent(u.id || u.email)}`)
          .then(res => res.json())
          .then(data => {
            if (data?.success && data?.sections) {
              setOpenSections(prev => ({ ...prev, ...data.sections }));
            }
          })
          .catch(() => {});
      }

      fetchBalancesAndTelemetry(u);
    } catch (_) {}
  }, [fetchBalancesAndTelemetry]);

  // Route Auto-Expansion: Synchronized with canonical /recipes route
  useEffect(() => {
    if (!pathname) return;
    if (['/chef', '/import', '/manual'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.create ? prev : { ...prev, create: true });
    } else if (['/recipes', '/books', '/pantry'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.manage ? prev : { ...prev, manage: true });
    } else if (['/shopping', '/planner', '/templates'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.plan ? prev : { ...prev, plan: true });
    } else if (['/token', '/wallet', '/subscriptions', '/billing'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      setOpenSections(prev => prev.finance ? prev : { ...prev, finance: true });
    } else if (pathname.startsWith('/admin')) {
      setOpenSections(prev => prev.admin ? prev : { ...prev, admin: true });
    }
  }, [pathname]);

  // Real-Time Event & Cross-Tab Subscriptions
  useEffect(() => {
    setMounted(true);
    syncUserState();

    const handleSync = () => syncUserState();
    const handleWalletUpdate = (e?: any) => {
      if (e?.detail) {
        const b = e.detail.wallet_balance ?? e.detail.walletBalance ?? e.detail.balance;
        if (b !== undefined && b !== null) {
          const parsed = parseFloat(String(b));
          if (!isNaN(parsed)) setWalletBalance(parsed);
        }
      }
      fetchBalancesAndTelemetry();
    };
    const handleTokensUpdate = (e?: any) => {
      if (e?.detail) {
        const b = e.detail.token_balance ?? e.detail.tokenBalance ?? e.detail.balance;
        if (b !== undefined && b !== null) {
          const parsed = Number(b);
          if (!isNaN(parsed)) setTokenBalance(parsed);
        }
      }
      fetchBalancesAndTelemetry();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);
    window.addEventListener('zecratary_site_settings_changed', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);
    window.addEventListener('zecratary_wallet_updated', handleWalletUpdate);
    window.addEventListener('zecratary_tokens_updated', handleTokensUpdate);
    window.addEventListener('zecratary_token_settings_updated', handleSync);
    window.addEventListener('focus', () => fetchBalancesAndTelemetry());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchBalancesAndTelemetry();
    });

    let balanceChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        balanceChannel = new BroadcastChannel('zecratary_balance_channel');
        balanceChannel.onmessage = (msg) => {
          if (msg.data?.wallet_balance !== undefined) {
            setWalletBalance(parseFloat(String(msg.data.wallet_balance)));
          }
          if (msg.data?.token_balance !== undefined || msg.data?.tokens !== undefined) {
            setTokenBalance(Number(msg.data.token_balance ?? msg.data.tokens));
          }
        };
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
      window.removeEventListener('zecratary_site_settings_changed', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleWalletUpdate);
      window.removeEventListener('zecratary_tokens_updated', handleTokensUpdate);
      window.removeEventListener('zecratary_token_settings_updated', handleSync);
      if (balanceChannel) balanceChannel.close();
    };
  }, [syncUserState, fetchBalancesAndTelemetry]);

  // Click Outside & Escape Key Listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
        setLangDropdownOpen(false);
        setProfileDropdownOpen(false);
        setDropdownLangExpanded(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
        } catch (_) {}
      }
      const u = getCurrentUser();
      const uId = u?.id || u?.email;
      if (uId) {
        fetch('/api/user/sidebar-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uId, sections: next })
        }).catch(() => {});
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

  const markAllNotificationsRead = async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      const u = getCurrentUser();
      const params = new URLSearchParams();
      if (u?.id) params.set('userId', String(u.id));
      if (u?.email) params.set('email', String(u.email));
      await fetch(`/api/notifications?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
    } catch (_) {}
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

  const isRouteActive = (route: string): boolean => {
    if (!pathname) return false;
    const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const cleanRoute = route === '/' ? '/' : route.replace(/\/+$/, '');

    if (cleanRoute === '/' || cleanRoute === '/admin') {
      return cleanPath === cleanRoute;
    }
    return cleanPath === cleanRoute || cleanPath.startsWith(`${cleanRoute}/`);
  };

  const navClass = (route: string) => {
    const active = isRouteActive(route);
    return `flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs transition duration-200 cursor-pointer ${
      active ? 'text-white shadow-xs' : 'hover:text-white hover:bg-slate-800/30'
    }`;
  };

  const navStyle = (route: string) => {
    const active = isRouteActive(route);
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
      {/* DESKTOP TOP BAR (Fixed Header with Real-Time Telemetry) */}
      <header
        id="zecratary-desktop-topbar"
        role="banner"
        aria-label="Application Header"
        data-lpignore="true"
        data-form-type="other"
        className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b z-40 items-center justify-between px-6 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)'
        }}
        ref={topbarRef}
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

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* 1. DEDICATED STORE WALLET CAPSULE + DIRECT BUTTON */}
          <div 
            className="flex items-center rounded-2xl border p-0.5 shadow-xs transition hover:border-[var(--color-primary)]/40"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Link 
              href="/wallet" 
              className="flex items-center gap-2 px-3 py-1 rounded-xl hover:opacity-85 transition group cursor-pointer"
              title={t('viewWalletBalance', 'View Wallet Balance & History')}
            >
              <Wallet className="h-4 w-4 text-[var(--color-primary)] group-hover:scale-110 transition-transform shrink-0" />
              <span 
                suppressHydrationWarning
                className="text-xs font-mono font-black" 
                style={{ color: 'var(--color-emerald)' }}
              >
                {walletSymbol}{Number(walletBalance || 0).toFixed(2)}
              </span>
              <span className="text-[10px] font-bold opacity-60 font-mono">
                {walletCurrency}
              </span>
            </Link>

            <Link
              href="/wallet"
              className="flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black transition cursor-pointer hover:opacity-90 active:scale-95 text-white shadow-xs shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title={t('topUpWallet', 'Top Up Wallet')}
              aria-label="Top Up Wallet"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </Link>
          </div>

          {/* 2. DEDICATED AI TOKEN CAPSULE + DIRECT BUTTON */}
          <div 
            className="flex items-center rounded-2xl border p-0.5 shadow-xs transition hover:border-[var(--color-primary)]/40"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Link 
              href="/token" 
              className="flex items-center gap-2 px-3 py-1 rounded-xl hover:opacity-85 transition group cursor-pointer"
              title={t('viewTokenBalance', 'View Token Balance & History')}
            >
              <DynamicTokenIcon icon={tokenIcon} symbol={tokenSymbol} size={16} className="group-hover:scale-110 transition-transform" />
              <span 
                suppressHydrationWarning
                className="text-xs font-mono font-black" 
                style={{ color: 'var(--color-emerald)' }}
              >
                {Number(tokenBalance || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-500 font-mono">
                {tokenSymbol}
              </span>
            </Link>

            <Link
              href="/token"
              className="flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black transition cursor-pointer hover:opacity-90 active:scale-95 text-white shadow-xs shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title={t('topUpTokens', 'Top Up Tokens')}
              aria-label="Top Up Tokens"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </Link>
          </div>

          {/* 3. NOTIFICATIONS BELL & POPOVER */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
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
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div
                role="region"
                aria-label="Notifications Panel"
                data-lpignore="true"
                data-form-type="other"
                className="absolute right-0 mt-2 w-80 border rounded-3xl p-4 shadow-2xl z-50 space-y-3 text-xs transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold uppercase tracking-wider text-xs">{t('topbarNotifications', 'Notifications')}</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold text-[10px]">
                        {unreadCount} {t('topbarUnreadCount', 'unread')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>{t('topbarMarkAllRead', 'Mark all read')}</span>
                      </button>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin/notification-settings"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-[10px] opacity-70 hover:opacity-100"
                      >
                        {t('settings', 'Settings')}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 opacity-60 text-xs">
                      {t('topbarNoNotifications', 'No unread notifications')}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-2xl border space-y-1 transition ${
                          n.isRead ? 'opacity-70' : 'border-[var(--color-primary)]/40 shadow-xs'
                        }`}
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: n.isRead ? 'var(--color-border)' : 'var(--color-primary)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{n.title}</span>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] opacity-80 leading-relaxed">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. QUICK LANGUAGE SELECTOR */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
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

          {/* 5. QUICK DAY / DARK TOGGLE */}
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

          {/* 6. USER PROFILE DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
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

                <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'var(--color-border)' }}>
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

      {/* MOBILE APPLICATION HEADER WITH COMPACT WALLET & TOKEN WIDGETS */}
      <header
        role="banner"
        aria-label="Mobile Application Header"
        data-lpignore="true"
        data-form-type="other"
        className="md:hidden fixed top-0 left-0 right-0 h-14 border-b z-40 flex items-center justify-between px-3 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)'
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-1.5 font-black text-sm text-[var(--color-primary)] truncate max-w-[110px]">
          {isImageIcon(siteIcon) ? (
            <img src={siteIcon} alt="Logo" className="w-6 h-6 rounded-md object-contain shrink-0" />
          ) : (
            <span className="text-xl shrink-0">{siteIcon || '🍳'}</span>
          )}
          <span className="truncate">{siteName || 'Zecratary'}</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Mobile Wallet Capsule */}
          <div 
            className="flex items-center rounded-xl border p-0.5 text-[11px] font-mono font-bold shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Link 
              href="/wallet" 
              className="flex items-center gap-1 px-1.5 py-0.5 hover:opacity-85 transition"
              title={t('wallet', 'Store Wallet')}
            >
              <Wallet className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
              <span suppressHydrationWarning style={{ color: 'var(--color-emerald)' }}>
                {walletSymbol}{Number(walletBalance || 0).toFixed(2)}
              </span>
            </Link>
            <Link 
              href="/wallet"
              className="w-5 h-5 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title={t('topUpWallet', 'Top Up Wallet')}
            >
              <Plus className="h-3 w-3 stroke-[3]" />
            </Link>
          </div>

          {/* Mobile Token Capsule */}
          <div 
            className="flex items-center rounded-xl border p-0.5 text-[11px] font-mono font-bold shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <Link 
              href="/token" 
              className="flex items-center gap-1 px-1.5 py-0.5 hover:opacity-85 transition"
              title={t('token', 'AI Tokens')}
            >
              <DynamicTokenIcon icon={tokenIcon} symbol={tokenSymbol} size={14} />
              <span suppressHydrationWarning style={{ color: 'var(--color-emerald)' }}>
                {Number(tokenBalance || 0).toLocaleString()}
              </span>
            </Link>
            <Link 
              href="/token"
              className="w-5 h-5 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title={t('topUpTokens', 'Top Up Tokens')}
            >
              <Plus className="h-3 w-3 stroke-[3]" />
            </Link>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
            title={isDarkMode ? 'Day Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl border cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* SIDEBAR NAVIGATION DRAWER */}
      <aside
        role="navigation"
        aria-label="Main Navigation Sidebar"
        data-lpignore="true"
        data-form-type="other"
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

          {/* 2. MANAGE ACCORDION (CANONICAL /recipes ROUTE) */}
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
                <Link href="/recipes" className={navClass('/recipes')} style={navStyle('/recipes')} title={t('savedRecipes', 'Saved Recipes')}>
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

          {/* 5. ADMIN MANAGEMENT ACCORDION (ALL 14 ORIGINAL + STORAGE SETTINGS) */}
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
                  <Link href="/admin/storage" className={navClass('/admin/storage')} style={navStyle('/admin/storage')} title={t('storageSettings', 'Storage Settings')}>
                    <HardDrive className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('storageSettings', 'Storage Settings')}</span>}
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

      {/* MOBILE APPLICATION DRAWER (CANONICAL /recipes ROUTE) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          data-lpignore="true"
          data-form-type="other"
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
              <Link href="/recipes" onClick={() => setMobileMenuOpen(false)} className={navClass('/recipes')} style={navStyle('/recipes')}>
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
