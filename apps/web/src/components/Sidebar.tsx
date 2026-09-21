// Generated / Updated by AI Collaborator
'use client';

import packageInfo from '../../package.json';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  Key,
  Coins,
  Bell,
  User as UserIcon,
  Plus,
  ChevronDown,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { getCurrentUser, logoutUser, User } from '@/lib/auth';
import { getSiteName, getSiteIcon, DEFAULT_SITE_NAME, DEFAULT_SITE_ICON, updateFavicon } from '@/lib/siteConfig';
import { useTranslation } from '@/components/LanguageProvider';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
}

const DEFAULT_FALLBACK_PACKAGES: TokenPackage[] = [
  { id: 'pkg_starter', name: 'Starter Pack', tokens: 250, price: 9.99, badge: 'Starter' },
  { id: 'pkg_pro', name: 'Chef Bundle', tokens: 600, price: 19.99, badge: 'Popular' },
  { id: 'pkg_power', name: 'Master Kitchen', tokens: 1500, price: 39.99, badge: 'Best Value' }
];

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

  // Live Token & Top Up state
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenName, setTokenName] = useState<string>('Foodie Token');
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [showTopUpMenu, setShowTopUpMenu] = useState<boolean>(false);
  const [showTopUpMobileMenu, setShowTopUpMobileMenu] = useState<boolean>(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string>('');
  const [topUpErrorMsg, setTopUpErrorMsg] = useState<string>('');

  // Notifications & Profile state
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Dropdown click-outside refs
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const topUpDropdownRef = useRef<HTMLDivElement>(null);
  const topUpMobileDropdownRef = useRef<HTMLDivElement>(null);

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

  const fetchUserTokenAndNotifications = useCallback(async (currentUser: any) => {
    if (!currentUser) return;
    try {
      let cfgRes = await fetch('/api/admin/token-setting', { cache: 'no-store' });
      if (!cfgRes.ok) {
        cfgRes = await fetch('/api/admin/token-settings', { cache: 'no-store' });
      }
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        const cfg = cfgData.settings || cfgData.config || cfgData;
        if (cfg) {
          if (cfg.tokenSymbol) setTokenSymbol(cfg.tokenSymbol);
          if (cfg.tokenName) setTokenName(cfg.tokenName);
          if (Array.isArray(cfg.packages) && cfg.packages.length > 0) {
            setTokenPackages(cfg.packages);
          }
        }
      }

      const queryParam = currentUser.id 
        ? `?userId=${encodeURIComponent(currentUser.id)}&email=${encodeURIComponent(currentUser.email || '')}`
        : `?email=${encodeURIComponent(currentUser.email || '')}`;
      
      const tokenRes = await fetch(`/api/tokens${queryParam}`, { cache: 'no-store' });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.success && typeof tokenData.balance === 'number') {
          setTokenBalance(tokenData.balance);
          if (tokenData.tokenSymbol) setTokenSymbol(tokenData.tokenSymbol);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);
    const name = getSiteName();
    const icon = getSiteIcon();
    setSiteName(name);
    setSiteIcon(icon);
    updateFavicon(icon);
    loadLanguagesFromAdmin();
    fetchUserTokenAndNotifications(currentUser);

    const savedMode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
    if (savedMode) {
      const isDark = savedMode === 'dark';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);
    }

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
        if (currentCategory === 'tablet') setIsCollapsed(true);
        else if (currentCategory === 'desktop') setIsCollapsed(false);
        if (currentCategory !== 'mobile') setIsOpen(false);
        prevCategory = currentCategory;
      }
    };

    window.addEventListener('resize', handleScreenResize);

    const handleAuthChange = () => {
      const updated = getCurrentUser();
      setUser(updated);
      fetchUserTokenAndNotifications(updated);
    };
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
    const handleTokenSync = () => {
      const u = getCurrentUser();
      if (u) fetchUserTokenAndNotifications(u);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (topUpDropdownRef.current && !topUpDropdownRef.current.contains(e.target as Node)) {
        setShowTopUpMenu(false);
      }
      if (topUpMobileDropdownRef.current && !topUpMobileDropdownRef.current.contains(e.target as Node)) {
        setShowTopUpMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('zecratary_auth_changed', handleAuthChange);
    window.addEventListener('zecratary_site_settings_changed', handleSiteSync);
    window.addEventListener('zecratary_languages_updated', handleLangSync);
    window.addEventListener('zecratary_theme_mode_changed', handleThemeModeSync);
    window.addEventListener('zecratary_theme_changed', handleThemeModeSync);
    window.addEventListener('zecratary_token_settings_updated', handleTokenSync);
    window.addEventListener('zecratary_tokens_updated', handleTokenSync);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('zecratary_auth_changed', handleAuthChange);
      window.removeEventListener('zecratary_site_settings_changed', handleSiteSync);
      window.removeEventListener('zecratary_languages_updated', handleLangSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeModeSync);
      window.removeEventListener('zecratary_theme_changed', handleThemeModeSync);
      window.removeEventListener('zecratary_token_settings_updated', handleTokenSync);
      window.removeEventListener('zecratary_tokens_updated', handleTokenSync);
    };
  }, [fetchUserTokenAndNotifications]);

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
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowTopUpMenu(false);
    setShowTopUpMobileMenu(false);
  }, [pathname]);

  const handlePurchasePackage = async (pkg: TokenPackage) => {
    if (!pkg) return;
    setPurchasingId(pkg.id);
    setTopUpErrorMsg('');
    setTopUpSuccessMsg('');

    try {
      const currentUser = getCurrentUser() || user;
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          packageId: pkg.id,
          tokens: Number(pkg.tokens),
          price: Number(pkg.price),
          packageName: pkg.name,
          userEmail: currentUser?.email,
          userId: currentUser?.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to complete token purchase');
      }

      const newBal = typeof data.balance === 'number' ? data.balance : (tokenBalance + Number(pkg.tokens));
      setTokenBalance(newBal);
      setTopUpSuccessMsg(
        t('tokenPurchasedSuccess', `Successfully added +${Number(pkg.tokens).toLocaleString()} ${tokenSymbol}!`)
      );

      window.dispatchEvent(new Event('zecratary_tokens_updated'));
      window.dispatchEvent(new Event('zecratary_token_settings_updated'));

      setTimeout(() => {
        setTopUpSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setTopUpErrorMsg(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasingId(null);
    }
  };

  const isAdmin = user && (
    user.role === 'admin' || 
    user.email === 'admin@foodieprep.com' || 
    user.email?.includes('admin')
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    if (href === '/admin') return pathname === '/admin';
    if (href === '/chef') return pathname === '/chef';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showCollapsed = isCollapsed && !isOpen;

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
  const iconStyle = { color: 'var(--color-sidebar-icon, var(--color-primary))' };

  const displayPackages = tokenPackages.length > 0 ? tokenPackages : DEFAULT_FALLBACK_PACKAGES;

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between w-full">
        <Link href="/dashboard" className="flex items-center gap-2">
          {isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : <span className="text-2xl shrink-0">{displayIcon}</span>}
          <span className="text-lg font-black tracking-tight text-[var(--color-primary)] truncate max-w-[120px]">
            {displayName}
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          {/* Mobile Token Balance & Top Up */}
          <div className="relative" ref={topUpMobileDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowTopUpMobileMenu(!showTopUpMobileMenu);
                setShowProfileMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[var(--color-border)] text-[11px] font-mono font-bold bg-[var(--color-inner-dark)] hover:border-[var(--color-primary)]/50 transition cursor-pointer"
            >
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span style={{ color: 'var(--color-emerald)' }}>{tokenBalance.toLocaleString()}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-[var(--color-primary)] text-white text-[10px] font-sans font-black flex items-center gap-0.5">
                <Plus className="h-2.5 w-2.5 stroke-[3]" />
                <span>Top Up</span>
              </span>
            </button>

            {/* Mobile Top Up Drawer */}
            {showTopUpMobileMenu && (
              <div 
                className="fixed inset-x-3 top-16 rounded-3xl border p-4 space-y-3 shadow-2xl z-50 animate-in fade-in max-h-[82vh] overflow-y-auto"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider">{t('topUpTokens') || 'Top Up Tokens'}</h3>
                      <p className="text-[10px] opacity-70">Balance: <span style={{ color: 'var(--color-emerald)' }}>{tokenBalance.toLocaleString()} {tokenSymbol}</span></p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowTopUpMobileMenu(false)}
                    className="p-1 rounded-lg border border-[var(--color-border)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {topUpSuccessMsg && (
                  <div className="p-2.5 rounded-xl border text-xs font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{topUpSuccessMsg}</span>
                  </div>
                )}
                {topUpErrorMsg && (
                  <div className="p-2.5 rounded-xl border text-xs font-bold text-red-400 border-red-500/30 bg-red-500/10 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{topUpErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {displayPackages.map((pkg) => (
                    <div 
                      key={pkg.id}
                      className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black truncate">{pkg.name}</span>
                          {pkg.badge && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-500/20 text-amber-500">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono font-bold" style={{ color: 'var(--color-emerald)' }}>
                          +{Number(pkg.tokens).toLocaleString()} {tokenSymbol}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-black">${Number(pkg.price).toFixed(2)}</span>
                        <button
                          type="button"
                          disabled={purchasingId === pkg.id}
                          onClick={() => handlePurchasePackage(pkg)}
                          className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white cursor-pointer disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          {purchasingId === pkg.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (t('buy') || 'Buy')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
                  <Link
                    href="/billing"
                    onClick={() => setShowTopUpMobileMenu(false)}
                    className="text-xs font-bold hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('viewSubscriptionPlans') || 'View Monthly Subscription Plans'}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Button */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowTopUpMobileMenu(false);
              }}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] hover:border-[var(--color-primary)]/50 transition cursor-pointer flex items-center justify-center"
              aria-label="User Profile"
            >
              <UserIcon className="h-4 w-4" style={iconStyle} />
            </button>

            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 rounded-2xl border p-2.5 space-y-2 shadow-2xl z-50 animate-in fade-in"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="px-2 py-1 border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-inner-dark)]">
                    <UserIcon className="w-3.5 h-3.5" style={iconStyle} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate" style={{ color: 'var(--color-text)' }}>
                      {user?.name || user?.email || 'User Account'}
                    </p>
                    <p className="text-[10px] opacity-60 truncate">{user?.email || 'Authenticated'}</p>
                  </div>
                </div>

                <div className="px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Languages className="h-3.5 w-3.5" style={iconStyle} />
                    <span>{t('language') || 'Language'}</span>
                  </div>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                    style={{ color: 'var(--color-primary)' }}
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
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-inner-dark)] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isDarkMode ? <Moon className="h-3.5 w-3.5" style={iconStyle} /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
                    <span>{isDarkMode ? (t('nightMode') || 'Dark Mode') : (t('dayMode') || 'Light Mode')}</span>
                  </div>
                  <span className="text-[10px] opacity-60 font-mono">{isDarkMode ? 'Dark' : 'Day'}</span>
                </button>

                <Link
                  href="/billing"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-inner-dark)] transition"
                >
                  <CreditCard className="h-3.5 w-3.5" style={iconStyle} />
                  <span>{t('billing') || 'Billing'}</span>
                </Link>

                <Link
                  href="/contacts"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-inner-dark)] transition"
                >
                  <Mail className="h-3.5 w-3.5" style={iconStyle} />
                  <span>{t('contactUs') || 'Contact'}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logoutUser();
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition cursor-pointer border-t border-[var(--color-border)] pt-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t('logout') || 'Logout'}</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-xl border border-[var(--color-border)] transition cursor-pointer ${
              isDarkMode ? 'bg-[#141b2d] text-slate-300 hover:text-white' : 'bg-slate-200 text-slate-800 hover:text-slate-950'
            }`}
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* DESKTOP TOP BAR */}
      <div 
        id="zecratary-desktop-topbar"
        className={`hidden md:flex fixed top-0 right-0 z-30 h-16 bg-[var(--color-card)] border-b border-[var(--color-border)] px-6 items-center justify-between transition-all duration-300 ${
          showCollapsed ? 'left-20' : 'left-64'
        }`}
        style={{
          height: '4rem',
          paddingTop: 0,
          paddingBottom: 0,
          boxSizing: 'border-box'
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-inner-dark)]" style={{ color: 'var(--color-primary)' }}>
            {pathname === '/' ? 'Dashboard' : pathname.replace('/', '').toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* TOKEN BALANCE & TOP UP WIDGET */}
          <div className="relative flex items-center" ref={topUpDropdownRef}>
            <div className="flex items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] p-0.5 shadow-xs transition hover:border-[var(--color-primary)]/40">
              <Link 
                href="/profile" 
                className="flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-[var(--color-card)]/60 transition group"
                title={t('viewTokenBalance') || 'View Token Balance & Summary'}
              >
                <Coins className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono font-black" style={{ color: 'var(--color-emerald)' }}>
                  {tokenBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-500 font-mono">
                  {tokenSymbol}
                </span>
              </Link>

              {/* Top Up Button with Dropdown Trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowTopUpMenu(!showTopUpMenu);
                  setShowNotifications(false);
                  setShowProfileMenu(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer hover:brightness-110 active:scale-95 text-white shadow-xs"
                style={{ backgroundColor: 'var(--color-primary)' }}
                title={t('topUpTokens') || 'Top Up Tokens'}
                aria-label="Top Up Tokens"
              >
                <Plus className="h-3 w-3 stroke-[3]" />
                <span>{t('topUp') || 'Top Up'}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showTopUpMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Top Up Dropdown Menu */}
            {showTopUpMenu && (
              <div 
                className="absolute right-0 top-full mt-2 w-88 sm:w-96 rounded-3xl border p-4 space-y-3.5 shadow-2xl z-50 animate-in fade-in"
                style={{ 
                  backgroundColor: 'var(--color-card)', 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)]">
                      <Coins className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                        {t('topUpTokens') || 'Top Up Tokens'}
                      </h3>
                      <p className="text-[10px] opacity-70">
                        {t('topUpSubtitle') || 'Add tokens directly to your balance'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] text-xs font-mono font-black" style={{ color: 'var(--color-emerald)' }}>
                    <span>{tokenBalance.toLocaleString()}</span>
                    <span className="text-amber-500 font-bold">{tokenSymbol}</span>
                  </div>
                </div>

                {topUpSuccessMsg && (
                  <div 
                    className="p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)' }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px]">{topUpSuccessMsg}</span>
                  </div>
                )}

                {topUpErrorMsg && (
                  <div 
                    className="p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px]">{topUpErrorMsg}</span>
                  </div>
                )}

                {/* Packages List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {displayPackages.map((pkg) => (
                    <div 
                      key={pkg.id}
                      className="p-3 rounded-2xl border transition flex items-center justify-between gap-3 group hover:border-[var(--color-primary)]/50"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black truncate" style={{ color: 'var(--color-text)' }}>
                            {pkg.name}
                          </span>
                          {pkg.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono font-black" style={{ color: 'var(--color-emerald)' }}>
                          <span>+{Number(pkg.tokens).toLocaleString()}</span>
                          <span className="text-amber-500 font-bold">{tokenSymbol}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-black" style={{ color: 'var(--color-text)' }}>
                          ${Number(pkg.price).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={purchasingId === pkg.id}
                          onClick={() => handlePurchasePackage(pkg)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-95 shadow-xs"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          {purchasingId === pkg.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              <span>{t('buy') || 'Buy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Links */}
                <div className="pt-2 border-t flex flex-col gap-1.5 text-[11px]" style={{ borderColor: 'var(--color-border)' }}>
                  <Link
                    href="/billing"
                    onClick={() => setShowTopUpMenu(false)}
                    className="flex items-center justify-between text-xs font-bold hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <span>{t('viewSubscriptionPlans') || 'View Monthly Subscription Plans'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/token-setting"
                      onClick={() => setShowTopUpMenu(false)}
                      className="flex items-center justify-between text-[10px] font-semibold opacity-70 hover:opacity-100 hover:underline"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <span>{t('adminManagePackages') || 'Admin: Manage Packages in /admin/token-setting'}</span>
                      <Settings className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification Icon with Dropdown */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
                setShowTopUpMenu(false);
              }}
              className="p-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] hover:border-[var(--color-primary)]/50 transition relative cursor-pointer flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" style={iconStyle} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-80 rounded-2xl border p-4 space-y-3 shadow-2xl z-50 animate-in fade-in"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                    Notifications
                  </h3>
                  <button 
                    onClick={() => { setUnreadCount(0); setShowNotifications(false); }}
                    className="text-[10px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                  <div className="p-2.5 rounded-xl border bg-[var(--color-inner-dark)] border-[var(--color-border)] space-y-1">
                    <p className="font-bold">🎉 Welcome to Zecratary!</p>
                    <p className="text-[11px] opacity-75">Your account has been initialized with free AI token credits.</p>
                  </div>
                  <div className="p-2.5 rounded-xl border bg-[var(--color-inner-dark)] border-[var(--color-border)] space-y-1">
                    <p className="font-bold">⚡ AI Model Updated</p>
                    <p className="text-[11px] opacity-75">Gemini models are fully synchronized and ready for your recipes.</p>
                  </div>
                  <div className="p-2.5 rounded-xl border bg-[var(--color-inner-dark)] border-[var(--color-border)] space-y-1">
                    <p className="font-bold">🔒 Security Secured</p>
                    <p className="text-[11px] opacity-75">PostgreSQL database storage connected successfully.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
                setShowTopUpMenu(false);
              }}
              className="p-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] hover:border-[var(--color-primary)]/50 transition relative cursor-pointer flex items-center justify-center"
              aria-label="User Profile Dropdown"
              title="Profile & Settings"
            >
              <UserIcon className="h-4 w-4" style={iconStyle} />
            </button>

            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl border p-3 space-y-2 shadow-2xl z-50 animate-in fade-in"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-inner-dark)] transition border-b border-[var(--color-border)] pb-3"
                >
                  <div className="w-8 h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] flex items-center justify-center">
                    <UserIcon className="w-4 h-4" style={iconStyle} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black truncate" style={{ color: 'var(--color-text)' }}>
                      {user?.name || user?.email || 'User Account'}
                    </p>
                    <p className="text-[11px] opacity-60 truncate">
                      {user?.email || t('viewProfile') || 'View Profile'}
                    </p>
                  </div>
                </Link>

                <div className="space-y-1 pt-1">
                  <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                      <Languages className="w-4 h-4" style={iconStyle} />
                      <span>{t('language') || 'Language'}</span>
                    </div>
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
                      className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                      style={{ color: 'var(--color-primary)' }}
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold hover:bg-[var(--color-inner-dark)] transition cursor-pointer text-left"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      {isDarkMode ? <Moon className="h-4 w-4" style={iconStyle} /> : <Sun className="h-4 w-4 text-amber-500" />}
                      <span>{isDarkMode ? (t('nightMode') || 'Dark Mode') : (t('dayMode') || 'Light Mode')}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 px-2 py-0.5 rounded-md border border-[var(--color-border)]">
                      {isDarkMode ? 'Dark' : 'Day'}
                    </span>
                  </button>

                  <Link
                    href="/billing"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold hover:bg-[var(--color-inner-dark)] transition"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <CreditCard className="h-4 w-4" style={iconStyle} />
                    <span>{t('billing') || 'Billing'}</span>
                  </Link>

                  <Link
                    href="/contacts"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold hover:bg-[var(--color-inner-dark)] transition"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Mail className="h-4 w-4" style={iconStyle} />
                    <span>{t('contactUs') || 'Contact Us'}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logoutUser();
                      window.location.href = '/login';
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition cursor-pointer text-left border-t border-[var(--color-border)] mt-1.5 pt-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('logout') || 'Logout'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
          {showCollapsed ? (
            <div className="flex flex-col items-center gap-3 pb-2 border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#141b2d]' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                }`}
                title="Expand navigation"
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
                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#141b2d]' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                  }`}
                  title="Collapse navigation"
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
                className="md:hidden p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <nav className="space-y-1">
            <Link href="/dashboard" className={navClass('/dashboard')} title={t('dashboard')}>
              <Home className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('dashboard')}</span>}
            </Link>

            {!showCollapsed && (
              <div className={`pt-4 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                {t('create')}
              </div>
            )}
            <Link href="/chef" className={navClass('/chef')} title={t('chefAi')}>
              <MessageSquare className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('chefAi')}</span>}
            </Link>
            <Link href="/import" className={navClass('/import')} title={t('import')}>
              <UploadCloud className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('import')}</span>}
            </Link>
            <Link href="/manual" className={navClass('/manual')} title={t('manual')}>
              <SquarePen className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('manual')}</span>}
            </Link>

            {!showCollapsed && (
              <div className={`pt-4 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                {t('manage')}
              </div>
            )}
            <Link href="/saved" className={navClass('/saved')} title={t('savedRecipes')}>
              <BookOpen className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('savedRecipes')}</span>}
            </Link>
            <Link href="/books" className={navClass('/books')} title={t('books')}>
              <Book className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('books')}</span>}
            </Link>
            <Link href="/pantry" className={navClass('/pantry')}>
              <Package className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('pantry')}</span>}
            </Link>

            {!showCollapsed && (
              <div className={`pt-4 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                {t('plan')}
              </div>
            )}
            <Link href="/shopping" className={navClass('/shopping')} title={t('shoppingList')}>
              <ShoppingCart className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('shoppingList')}</span>}
            </Link>
            <Link href="/planner" className={navClass('/planner')}>
              <Calendar className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('planner')}</span>}
            </Link>
            <Link href="/templates" className={navClass('/templates')}>
              <LayoutTemplate className="h-4 w-4 shrink-0" style={iconStyle} />
              {!showCollapsed && <span className="truncate whitespace-nowrap">{t('templates')}</span>}
            </Link>

            {isAdmin && (
              <div className="pt-2 space-y-1">
                {!showCollapsed && (
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-primary)] px-3 pt-2 truncate">
                    {t('adminAccess') || 'Admin Access'}
                  </span>
                )}
                <Link href="/admin" className={navClass('/admin')} title="Admin Setting">
                  <ShieldCheck className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Admin Setting</span>}
                </Link>
                <Link href="/admin/ai-settings" className={navClass('/admin/ai-settings')} title="Ai Settings">
                  <Cpu className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Ai Settings</span>}
                </Link>
                <Link href="/admin/token-setting" className={navClass('/admin/token-setting')} title="Token Settings">
                  <Coins className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Token Settings</span>}
                </Link>
                <Link href="/admin/plans" className={navClass('/admin/plans')} title="Subscription Plans">
                  <CreditCard className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Subscription Plans</span>}
                </Link>
                <Link href="/admin/payment" className={navClass('/admin/payment')} title="Payment Gateway">
                  <Wallet className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Payment Gateway</span>}
                </Link>
                <Link href="/admin/social-login-setting" className={navClass('/admin/social-login-setting')} title="Social Login">
                  <Key className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Social Login</span>}
                </Link>
                <Link href="/admin/users" className={navClass('/admin/users')} title="Users">
                  <UserPlus className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Users</span>}
                </Link>
                <Link href="/admin/recipe-type" className={navClass('/admin/recipe-type')} title="Recipe Type">
                  <Utensils className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Recipe Type</span>}
                </Link>
                <Link href="/admin/ingredient-categories" className={navClass('/admin/ingredient-categories')} title="Ingredient Category">
                  <Tag className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Ingredient Category</span>}
                </Link>
                <Link href="/admin/language" className={navClass('/admin/language')} title="Language">
                  <Languages className="h-4 w-4 shrink-0" style={iconStyle} />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Language</span>}
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
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
                title="Toggle Theme Mode"
              >
                {isDarkMode ? <Moon className="h-4 w-4 shrink-0" style={iconStyle} /> : <Sun className="h-4 w-4 text-amber-500 shrink-0" />}
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
                title="Toggle Theme Mode"
              >
                {isDarkMode ? <Moon className="h-4 w-4 shrink-0" style={iconStyle} /> : <Sun className="h-4 w-4 text-amber-500 shrink-0" />}
              </button>
            </div>
          )}

          <Link href="/profile" className={navClass('/profile')} title={t('profile')}>
            <Settings className="h-4 w-4 shrink-0" style={iconStyle} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('profile')}</span>}
          </Link>

          <Link href="/billing" className={navClass('/billing')} title={t('billing') || 'Billing'}>
            <CreditCard className="h-4 w-4 shrink-0" style={iconStyle} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('billing') || 'Billing'}</span>}
          </Link>

          <Link href="/contacts" className={navClass('/contacts')} title={t('contactUs')}>
            <Mail className="h-4 w-4 shrink-0" style={iconStyle} />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('contactUs')}</span>}
          </Link>

          <button
            onClick={() => {
              logoutUser();
              window.location.href = '/login';
            }}
            className={`w-full flex items-center ${showCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
              isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/20' : 'text-slate-800 hover:text-red-600 hover:bg-red-100/70 font-bold'
            }`}
            title={t('logout')}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!showCollapsed && <span className="truncate whitespace-nowrap">{t('logout')}</span>}
          </button>

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
