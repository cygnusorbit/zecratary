// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle, 
  AlertCircle, Calendar, LogOut, Check,
  Zap, Sparkles, RefreshCw, Shield,
  Clock, Coins, Link2, Unlink, ArrowRight,
  Wallet, Plus, Receipt, ArrowDownLeft, ArrowUpRight, Activity,
  Globe, Compass
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

type SocialProvider = 'google' | 'facebook' | 'apple';

interface TokenSettingIdentity {
  tokenName: string;
  tokenSymbol: string;
}

interface ExtendedUser extends User {
  password?: string;
  country?: string;
  timezone?: string;
  timeZone?: string;
  linkedProviders?: SocialProvider[];
  linked_providers?: SocialProvider[];
  provider?: string;
  authProvider?: string;
  auth_provider?: string;
  social_provider?: string;
  login_method?: string;
  google_id?: string;
  facebook_id?: string;
  apple_id?: string;
  token_balance?: number;
  wallet_balance?: number;
  planExpiryDate?: string;
  expiryDate?: string;
  [key: string]: any;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥'
};

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' }
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time - US & Canada)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time - US & Canada)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time - US & Canada)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time - US & Canada)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (Alaska Time)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (Hawaii Time)' },
  { value: 'America/Toronto', label: 'America/Toronto (Canada Eastern)' },
  { value: 'America/Vancouver', label: 'America/Vancouver (Canada Pacific)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (São Paulo, Brazil)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'America/Buenos_Aires (Argentina)' },
  { value: 'Europe/London', label: 'Europe/London (London, GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Paris, CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (Berlin, CET/CEST)' },
  { value: 'Europe/Rome', label: 'Europe/Rome (Rome)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (Madrid)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (Amsterdam)' },
  { value: 'Europe/Zurich', label: 'Europe/Zurich (Zurich)' },
  { value: 'Europe/Athens', label: 'Europe/Athens (Athens, EET/EEST)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (Cairo)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (South Africa)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (Gulf Standard Time)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India Standard Time)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (Bangkok, ICT)' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (Jakarta, WIB)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore Standard Time)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (Hong Kong Time)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (China Standard Time)' },
  { value: 'Asia/Taipei', label: 'Asia/Taipei (Taipei Time)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (Korea Standard Time)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan Standard Time)' },
  { value: 'Australia/Perth', label: 'Australia/Perth (Western Australia)' },
  { value: 'Australia/Adelaide', label: 'Australia/Adelaide (South Australia)' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (Queensland)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Sydney, AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (Melbourne)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (New Zealand Time)' }
];

const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  let raw = '';
  if (Array.isArray(planInput)) raw = planInput[0] ? String(planInput[0]).trim() : '';
  else raw = String(planInput).trim();
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

const detectUserSocialProviders = (u: any): SocialProvider[] => {
  if (!u) return [];
  const providers = new Set<SocialProvider>();

  const parseProviderList = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach((p: any) => {
        const low = String(p).toLowerCase().trim();
        if (low === 'google' || low === 'facebook' || low === 'apple') providers.add(low as SocialProvider);
      });
      return;
    }
    if (typeof val === 'string') {
      let str = val.trim();
      if (str.startsWith('{') && str.endsWith('}')) {
        str = str.slice(1, -1);
      }
      if (str.startsWith('[') && str.endsWith(']')) {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              const low = String(p).toLowerCase().trim();
              if (low === 'google' || low === 'facebook' || low === 'apple') providers.add(low as SocialProvider);
            });
            return;
          }
        } catch (_) {}
      }
      str.split(',').forEach(item => {
        const clean = item.replace(/["'{}]/g, '').toLowerCase().trim();
        if (clean === 'google' || clean === 'facebook' || clean === 'apple') {
          providers.add(clean as SocialProvider);
        }
      });
    }
  };

  parseProviderList(u.linkedProviders);
  parseProviderList(u.linked_providers);

  const mainProv = String(
    u.provider || u.authProvider || u.auth_provider || 
    u.socialProvider || u.social_provider || 
    u.oauthProvider || u.oauth_provider || 
    u.loginMethod || u.login_method || ''
  ).toLowerCase();
  if (mainProv.includes('google')) providers.add('google');
  if (mainProv.includes('facebook')) providers.add('facebook');
  if (mainProv.includes('apple')) providers.add('apple');

  const uid = String(u.id || '').toLowerCase();
  if (uid.startsWith('usr_g_') || uid.startsWith('usr_goog') || uid.startsWith('g_') || uid.includes('google')) providers.add('google');
  if (uid.startsWith('usr_fb_') || uid.startsWith('usr_f_') || uid.startsWith('fb_') || uid.includes('facebook')) providers.add('facebook');
  if (uid.startsWith('usr_apple') || uid.startsWith('usr_a_') || uid.startsWith('apple_') || uid.includes('apple')) providers.add('apple');

  if (u.googleId || u.google_id || u.google_sub) providers.add('google');
  if (u.facebookId || u.facebook_id || u.facebook_sub) providers.add('facebook');
  if (u.appleId || u.apple_id || u.apple_sub) providers.add('apple');

  return Array.from(providers);
};

const getActiveLoginProvider = (u: any): SocialProvider | null => {
  if (!u) return null;
  const mainProv = String(
    u.provider || u.authProvider || u.auth_provider || 
    u.socialProvider || u.social_provider || 
    u.oauthProvider || u.oauth_provider || 
    u.loginMethod || u.login_method || ''
  ).toLowerCase();
  if (mainProv.includes('google')) return 'google';
  if (mainProv.includes('facebook')) return 'facebook';
  if (mainProv.includes('apple')) return 'apple';

  const uid = String(u.id || '').toLowerCase();
  if (uid.startsWith('usr_g_') || uid.startsWith('usr_goog') || uid.startsWith('g_') || uid.includes('google')) return 'google';
  if (uid.startsWith('usr_fb_') || uid.startsWith('usr_f_') || uid.startsWith('fb_') || uid.includes('facebook')) return 'facebook';
  if (uid.startsWith('usr_apple') || uid.startsWith('usr_a_') || uid.startsWith('apple_') || uid.includes('apple')) return 'apple';

  if (u.googleId || u.google_id || u.google_sub) return 'google';
  if (u.facebookId || u.facebook_id || u.facebook_sub) return 'facebook';
  if (u.appleId || u.apple_id || u.apple_sub) return 'apple';

  const detected = detectUserSocialProviders(u);
  if (detected.length > 0 && (!u.password || u.password === '')) {
    return detected[0];
  }

  return null;
};

export default function ProfilePage() {
  const router = useRouter();
  const langContext = useTranslation();
  const rawT = langContext?.t;

  const t = useCallback((key: string, fallback?: string): string => {
    if (typeof rawT === 'function') {
      const val = rawT(key, fallback);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }, [rawT]);

  const [user, setUserState] = useState<ExtendedUser | null>(null);
  const currentUserRef = useRef<ExtendedUser | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('US');
  const [timezone, setTimezone] = useState('UTC');
  const [currentTimePreview, setCurrentTimePreview] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processingSocial, setProcessingSocial] = useState<SocialProvider | null>(null);

  // Token identity & Owner token balance
  const [tokenIdentity, setTokenIdentity] = useState<TokenSettingIdentity>({ tokenName: 'Tokens', tokenSymbol: '🪙' });
  const [ownerTokenBalance, setOwnerTokenBalance] = useState<number>(0);
  const [tokenStats, setTokenStats] = useState({ totalDeducted: 0, totalGranted: 0, totalEvents: 0 });

  // Wallet identity & Owner wallet balance
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [walletSymbol, setWalletSymbol] = useState('$');
  const [ownerWalletBalance, setOwnerWalletBalance] = useState<number>(0);
  const [walletStats, setWalletStats] = useState({ totalDeposited: 0, totalSpent: 0, totalEvents: 0 });

  // Guards
  const isFetchingProfileRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Time Zone Clock Formatter
  useEffect(() => {
    const updateClock = () => {
      try {
        const formatter = new Intl.DateTimeFormat(undefined, {
          timeZone: timezone || 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZoneName: 'short'
        });
        setCurrentTimePreview(formatter.format(new Date()));
      } catch (_) {
        setCurrentTimePreview(new Date().toUTCString());
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  // Format date helper respecting configured timezone
  const formatTzDate = useCallback((dInput?: string | Date | null) => {
    if (!dInput) return '-';
    try {
      const d = typeof dInput === 'string' ? new Date(dInput) : dInput;
      if (isNaN(d.getTime())) return String(dInput);
      return new Intl.DateTimeFormat(undefined, {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(d);
    } catch (_) {
      return new Date(dInput).toLocaleDateString();
    }
  }, [timezone]);

  // 1. Fetch Token High-Level Balance & Stats
  const fetchTokenSummary = useCallback(async () => {
    const active = currentUserRef.current || getCurrentUser();
    if (!active?.id && !active?.email) return;

    try {
      const params = new URLSearchParams({
        userId: active.id || '',
        email: active.email || '',
        page: '1',
        limit: '1'
      });
      const res = await fetch(`/api/tokens?${params.toString()}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof data.balance === 'number') setOwnerTokenBalance(data.balance);
          if (data.tokenSymbol || data.tokenName) {
            setTokenIdentity({
              tokenName: data.tokenName || 'Tokens',
              tokenSymbol: data.tokenSymbol || '🪙'
            });
          }
          if (data.stats) {
            setTokenStats({
              totalDeducted: Number(data.stats.totalDeducted || 0),
              totalGranted: Number(data.stats.totalGranted || 0),
              totalEvents: Number(data.stats.totalEvents || data.totalCount || 0)
            });
          }
        }
      }
    } catch (_) {}
  }, []);

  // 2. Fetch Wallet High-Level Balance & Stats
  const fetchWalletSummary = useCallback(async () => {
    const active = currentUserRef.current || getCurrentUser();
    if (!active?.id && !active?.email) return;

    try {
      const params = new URLSearchParams({
        userId: active.id || '',
        email: active.email || '',
        page: '1',
        limit: '1'
      });
      const res = await fetch(`/api/wallet?${params.toString()}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof data.wallet_balance === 'number') {
            setOwnerWalletBalance(data.wallet_balance);
          } else if (typeof data.balance === 'number') {
            setOwnerWalletBalance(data.balance);
          } else if (data.user && typeof data.user.wallet_balance !== 'undefined') {
            setOwnerWalletBalance(parseFloat(data.user.wallet_balance || 0));
          }
          if (data.settings?.currency) {
            setWalletCurrency(data.settings.currency);
            setWalletSymbol(CURRENCY_SYMBOLS[data.settings.currency] || '$');
          }
          if (data.stats) {
            setWalletStats({
              totalDeposited: Number(data.stats.totalDeposited || 0),
              totalSpent: Number(data.stats.totalSpent || 0),
              totalEvents: Number(data.stats.totalEvents || data.totalCount || 0)
            });
          }
        }
      }
    } catch (_) {}
  }, []);

  // 3. Reload Active User Record
  const reloadActiveUser = useCallback(async () => {
    if (isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;

    try {
      initAuthStorage();
      let active = getCurrentUser() as ExtendedUser | null;

      if (!active && typeof document !== 'undefined') {
        const authKeys = ['zecratary_session', 'zecratary_current_user', 'currentUser'];
        for (const k of authKeys) {
          const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)'));
          if (match && match[1]) {
            try {
              const parsed = JSON.parse(decodeURIComponent(match[1]));
              if (parsed?.email || parsed?.id) {
                active = parsed;
                break;
              }
            } catch (_) {}
          }
        }
      }

      if (!active) {
        router.replace('/login');
        return;
      }

      let freshUser = { ...active };
      try {
        const uRes = await fetch('/api/admin/users', { cache: 'no-store' });
        if (uRes.ok) {
          const uData = await uRes.json();
          const list: any[] = Array.isArray(uData.users) ? uData.users : Array.isArray(uData) ? uData : [];
          const found = list.find((u: any) => 
            (active?.id && u.id === active.id) || 
            (active?.email && u.email?.toLowerCase().trim() === active.email.toLowerCase().trim())
          );
          if (found) {
            freshUser = { ...freshUser, ...found };
            if (typeof found.token_balance === 'number') setOwnerTokenBalance(found.token_balance);
            if (typeof found.wallet_balance === 'number') setOwnerWalletBalance(found.wallet_balance);
          }
        }
      } catch (_) {}

      // Robust social provider detection
      const detectedSocial = detectUserSocialProviders(freshUser);
      const activeSocial = getActiveLoginProvider(freshUser);
      if (activeSocial && !detectedSocial.includes(activeSocial)) {
        detectedSocial.push(activeSocial);
      }

      freshUser.linkedProviders = detectedSocial;
      freshUser.linked_providers = detectedSocial;
      if (activeSocial && !freshUser.provider && !freshUser.authProvider) {
        freshUser.provider = activeSocial;
        freshUser.authProvider = activeSocial;
      }

      // Restore country and timezone preference
      const resolvedTz = freshUser.timezone || freshUser.timeZone || 
        (typeof window !== 'undefined' ? localStorage.getItem('zecratary_timezone') : null) || 
        (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      const resolvedCountry = freshUser.country || 
        (typeof window !== 'undefined' ? localStorage.getItem('zecratary_country') : null) || 'US';

      freshUser.timezone = resolvedTz;
      freshUser.country = resolvedCountry;

      currentUserRef.current = freshUser;
      setUserState(freshUser);
      setName(freshUser.name || '');
      setEmail(freshUser.email || '');
      setCountry(resolvedCountry);
      setTimezone(resolvedTz);

      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_timezone', resolvedTz);
        localStorage.setItem('zecratary_country', resolvedCountry);
      }

      fetchTokenSummary();
      fetchWalletSummary();
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, [router, fetchTokenSummary, fetchWalletSummary]);

  useEffect(() => {
    reloadActiveUser();

    const handleDebouncedSync = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchTokenSummary();
        fetchWalletSummary();
      }, 300);
    };

    window.addEventListener('zecratary_tokens_updated', handleDebouncedSync);
    window.addEventListener('zecratary_token_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_users_updated', handleDebouncedSync);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('zecratary_tokens_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_token_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_users_updated', handleDebouncedSync);
    };
  }, [reloadActiveUser, fetchTokenSummary, fetchWalletSummary]);

  // Auto-Detect Browser Time Zone
  const handleAutoDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(detected);
        setSuccessMsg(t('timezoneAutoDetected', `Auto-detected system timezone: ${detected}`));
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (_) {}
  };

  // Update Profile Action (Accessible <div>, No Form Autofill)
  const handleUpdateProfile = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!user) return;

    if (password && password.length < 4) {
      setError(t('passwordLengthError', 'Password must be at least 4 characters long.'));
      return;
    }
    if (password && password !== confirmPassword) {
      setError(t('passwordMismatchError', 'Passwords do not match.'));
      return;
    }

    const updatedUser: ExtendedUser = {
      ...user,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      country: country.trim(),
      timezone: timezone.trim(),
      timeZone: timezone.trim(),
      password: password ? password : (user as any)?.password,
    };

    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_timezone', timezone.trim());
        localStorage.setItem('zecratary_country', country.trim());
        localStorage.setItem('zecratary_current_user', JSON.stringify(updatedUser));
        localStorage.setItem('zecratary_user', JSON.stringify(updatedUser));
      }

      setCurrentUser(updatedUser);
      currentUserRef.current = updatedUser;
      setUserState(updatedUser);
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg(t('profileSavedSuccess', 'Profile changes and regional settings saved successfully!'));

      // Emit global timezone and user update events
      window.dispatchEvent(new CustomEvent('zecratary_timezone_updated', { detail: { timezone, country } }));
      window.dispatchEvent(new Event('zecratary_users_updated'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  // Connected Social Account Toggle (Google, Facebook, Apple)
  const handleToggleSocialLink = async (provider: SocialProvider) => {
    if (!user) return;
    setProcessingSocial(provider);
    setError('');
    setSuccessMsg('');

    const activeLogin = getActiveLoginProvider(user);
    const isPrimary = activeLogin === provider;
    const isLinked = Boolean(user.linkedProviders?.includes(provider)) || isPrimary;
    let updatedLinked = [...(user.linkedProviders || [])];
    const provName = provider.charAt(0).toUpperCase() + provider.slice(1);

    if (isLinked) {
      if ((isPrimary || updatedLinked.length === 1) && !user.password) {
        setError(t('cannotUnlinkOnlyLogin', `Cannot unlink ${provName}: this is your active login method. Please set a password first.`));
        setProcessingSocial(null);
        return;
      }
      updatedLinked = updatedLinked.filter(p => p !== provider);
      setSuccessMsg(t('unlinkedSocialSuccess', `Unlinked ${provName} account successfully.`));
    } else {
      updatedLinked.push(provider);
      setSuccessMsg(t('linkedSocialSuccess', `Successfully connected and linked ${provName}!`));
    }

    const updatedUser: ExtendedUser = {
      ...user,
      linkedProviders: updatedLinked,
      linked_providers: updatedLinked
    };

    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
    } catch (_) {}

    setCurrentUser(updatedUser);
    currentUserRef.current = updatedUser;
    setUserState(updatedUser);
    setProcessingSocial(null);
    window.dispatchEvent(new Event('zecratary_users_updated'));
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm(t('confirmDeleteAccount', 'Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.'))) {
      return;
    }
    try {
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, email: user.email.toLowerCase().trim() }),
      });
      logoutUser();
      router.replace('/login');
    } catch (err: any) {
      alert(t('deleteAccountFailed', 'Failed to delete account: ') + (err?.message || 'Server error'));
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const cleanPlanSlug = sanitizeSinglePlan(user.subscriptionPlan || 'taster');
  const isFreePlan = cleanPlanSlug === 'taster' || cleanPlanSlug === 'free' || cleanPlanSlug.includes('free');
  const activeExpiryDate = user.planExpiryDate || user.expiryDate;
  const activeLoginProvider = getActiveLoginProvider(user);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('accountProfileTitle', 'Account Profile')}
          </h1>
          <p className="text-xs opacity-70">
            {t('accountProfileSubtitle', 'Manage your credentials, country, time zone, active AI tokens, and store wallet')}
          </p>
        </div>

        
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in bg-[var(--color-inner-dark)] border-rose-500/40 text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in bg-[var(--color-inner-dark)] border-emerald-500/40 text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      
      

      {/* Profile Overview (Credentials, Regional Settings, Asset Summary, Socials) */}
      <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Profile Credentials & Regional Container (No Form) */}
          <div 
            className="lg:col-span-7 border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl flex flex-col justify-between"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-black shadow-inner bg-[var(--color-inner-dark)] border-[var(--color-border)] text-[var(--color-primary)]">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight">{user.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-[var(--color-inner-dark)] border-[var(--color-border)]">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs font-mono opacity-70">{user.email}</p>
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px] space-y-1 opacity-80">
                <div className="flex sm:justify-end items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  <span suppressHydrationWarning>{t('joinedPrefix', 'Joined: ')} {formatTzDate(user.createdAt)}</span>
                </div>
                <div className="flex sm:justify-end items-center gap-1.5 pt-0.5">
                  <span className="font-semibold">{t('activeMembershipLabel', 'Plan:')}</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-md text-[10px] uppercase border inline-flex items-center gap-1 ${
                    isFreePlan ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-primary/10 text-primary border-primary/30'
                  }`}>
                    {isFreePlan ? <Sparkles className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                    {cleanPlanSlug.toUpperCase()}
                  </span>
                </div>
                {activeExpiryDate && (
                  <div className="flex sm:justify-end items-center gap-1 text-[10px] text-emerald-400 font-semibold pt-0.5">
                    <Clock className="h-3 w-3" />
                    <span suppressHydrationWarning>Expires: {formatTzDate(activeExpiryDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5 opacity-80">{t('fullNameLabel', 'Full Name *')}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateProfile();
                      }
                    }}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 opacity-80">{t('emailAddressLabel', 'Email Address *')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateProfile();
                      }
                    }}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                  />
                </div>
              </div>

              {/* Country & Time Zone Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold opacity-80 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>{t('countryLabel', 'Country / Region')}</span>
                    </label>
                  </div>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)] cursor-pointer"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code} className="bg-[var(--color-card)] text-[var(--color-text)]">
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold opacity-80 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>{t('timeZoneLabel', 'System Time Zone')}</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetectTimezone}
                      className="text-[10px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Compass className="h-3 w-3" />
                      <span>{t('autoDetect', 'Auto-detect')}</span>
                    </button>
                  </div>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)] cursor-pointer"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-[var(--color-card)] text-[var(--color-text)]">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Live Time Preview Banner */}
              <div className="p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner bg-[var(--color-inner-dark)] border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-[11px]">
                    <span className="opacity-70 font-medium block sm:inline">{t('systemTimePreview', 'System Time Preview')}: </span>
                    <span className="font-mono font-bold text-emerald-400" suppressHydrationWarning>{currentTimePreview}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border opacity-80 self-start sm:self-auto bg-primary/10 border-primary/20 text-[var(--color-primary)]">
                  {timezone}
                </span>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5 opacity-80">{t('newPasswordLabel', 'New Password')}</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateProfile();
                      }
                    }}
                    placeholder="••••••••"
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 opacity-80">{t('confirmPasswordLabel', 'Confirm Password')}</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateProfile();
                      }
                    }}
                    placeholder="••••••••"
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => { logoutUser(); router.replace('/login'); }}
                    className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-red-400 border-red-900/40 hover:bg-red-950/20"
                  >
                    <LogOut className="h-4 w-4" /> {t('signOutBtn', 'Sign Out')}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-rose-400 border-rose-900/40 hover:bg-rose-950/30"
                  >
                    {t('deleteAccountBtn', 'Delete Account')}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateProfile()}
                  className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Check className="h-4 w-4" /> {t('saveProfileBtn', 'Save Profile & Settings')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Dual Asset Summary Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Token Summary Card */}
            <div 
              className="border rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col justify-between"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between border-b pb-3 border-[var(--color-border)]">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <span>{t('tokenBalanceAndSummaryTitle', 'Token Balance & Summary')}</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold bg-primary/10 text-primary border-primary/20">
                  {tokenIdentity.tokenName}
                </span>
              </div>

              <div className="border rounded-2xl p-4 shadow-inner flex items-baseline justify-between bg-[var(--color-inner-dark)] border-[var(--color-border)]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">{t('spendableBalanceLabel', 'Spendable Balance')}</span>
                  <div className="flex items-baseline gap-1.5 pt-0.5" suppressHydrationWarning>
                    <span className="text-3xl font-black font-mono text-emerald-400">{ownerTokenBalance.toLocaleString()}</span>
                    <span className="text-sm font-bold text-amber-500 font-mono">{tokenIdentity.tokenSymbol}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                    <ArrowDownLeft className="h-3 w-3" /> -{tokenStats.totalDeducted.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <ArrowUpRight className="h-3 w-3" /> +{tokenStats.totalGranted.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 text-xs">
                <span className="opacity-70 text-[11px] font-mono">{tokenStats.totalEvents} {t('recordedEvents', 'recorded events')}</span>
                <Link
                  href="/transactions?tab=tokens"
                  className="font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('viewTokenLedger', 'View Token Ledger')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Wallet Summary Card */}
            <div 
              className="border rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col justify-between"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between border-b pb-3 border-[var(--color-border)]">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>{t('storeWalletBalance', 'Store Wallet Balance')}</span>
                </h3>
                <Link href="/wallet" className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-primary/10 text-primary border-primary/20 flex items-center gap-1 hover:underline">
                  <Plus className="h-3 w-3" /> {t('topUp', 'Top Up')}
                </Link>
              </div>

              <div className="border rounded-2xl p-4 shadow-inner flex items-baseline justify-between bg-[var(--color-inner-dark)] border-[var(--color-border)]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">{t('storeCreditLabel', 'Store Credit')}</span>
                  <div className="flex items-baseline gap-1.5 pt-0.5" suppressHydrationWarning>
                    <span className="text-3xl font-black font-mono text-[var(--color-primary)]">{walletSymbol}{ownerWalletBalance.toFixed(2)}</span>
                    <span className="text-xs font-bold opacity-60 font-mono">{walletCurrency}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <ArrowUpRight className="h-3 w-3" /> +{walletSymbol}{walletStats.totalDeposited.toFixed(2)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                    <ArrowDownLeft className="h-3 w-3" /> -{walletSymbol}{walletStats.totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 text-xs">
                <span className="opacity-70 text-[11px] font-mono">{walletStats.totalEvents} {t('walletTransactionsCount', 'wallet transactions')}</span>
                <Link
                  href="/transactions?tab=wallet"
                  className="font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('viewWalletLedger', 'View Wallet Ledger')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Social Accounts Card */}
        <div 
          className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="border-b pb-4 border-[var(--color-border)]">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[var(--color-primary)]" />
              {t('connectedSocialAccountsTitle', 'Connected Social Accounts')}
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              {t('connectedSocialAccountsSubtitle', 'Link external identities (Google, Facebook, Apple) to enable seamless one-click sign in.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {[
              {
                id: 'google' as SocialProvider,
                name: 'Google',
                icon: (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )
              },
              {
                id: 'facebook' as SocialProvider,
                name: 'Facebook',
                icon: (
                  <svg className="w-5 h-5 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                  </svg>
                )
              },
              {
                id: 'apple' as SocialProvider,
                name: 'Apple',
                icon: (
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                  </svg>
                )
              }
            ].map(({ id: provId, name: provName, icon }) => {
              const isPrimary = activeLoginProvider === provId;
              const isLinked = Boolean(user.linkedProviders?.includes(provId)) || isPrimary;
              return (
                <div 
                  key={provId}
                  className="border rounded-2xl p-4 flex items-center justify-between shadow-xs transition bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-3">
                    {icon}
                    <div>
                      <span className="block font-bold text-xs">{provName}</span>
                      <span className={`text-[10px] font-semibold ${isLinked ? 'text-emerald-400' : 'opacity-50'}`}>
                        {isPrimary 
                          ? (t('linkedLoginMethod', 'Linked (Login Method)'))
                          : isLinked 
                          ? (t('linked', 'Connected'))
                          : (t('notLinked', 'Not linked'))}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={processingSocial !== null}
                    onClick={() => handleToggleSocialLink(provId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                      isLinked
                        ? 'border border-red-900/40 text-red-400 hover:bg-red-950/20'
                        : 'text-white shadow-xs'
                    }`}
                    style={{ backgroundColor: isLinked ? 'transparent' : 'var(--color-primary)' }}
                  >
                    {processingSocial === provId ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : isLinked ? (
                      <>
                        <Unlink className="h-3 w-3" /> {t('unlinkBtn', 'Unlink')}
                      </>
                    ) : (
                      <>
                        <Link2 className="h-3 w-3" /> {t('linkBtn', 'Link')}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
