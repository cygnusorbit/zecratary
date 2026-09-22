// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle, 
  AlertCircle, Calendar, LogOut, Check,
  Zap, Sparkles, RefreshCw, Shield,
  Clock, Coins, Link2, Unlink, Key, ArrowRight,
  ChefHat, DownloadCloud, DollarSign, Layers, 
  ArrowDownLeft, ArrowUpRight, Activity, Wallet,
  Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

type SocialProvider = 'google' | 'facebook' | 'apple';

interface TokenUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  monthlyLimit: number;
}

interface TokenSettingIdentity {
  tokenName: string;
  tokenSymbol: string;
}

interface UserTokenTransaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  created_at: string;
}

interface ExtendedUser extends User {
  linkedProviders?: SocialProvider[];
  linked_providers?: SocialProvider[];
  provider?: string;
  authProvider?: string;
  socialProvider?: string;
  loginMethod?: string;
  googleId?: string;
  facebookId?: string;
  appleId?: string;
  token_balance?: number;
  tokenBalance?: number;
  tokenUsage?: Partial<TokenUsageData>;
  token_usage?: Partial<TokenUsageData>;
  promptTokens?: number;
  prompt_tokens?: number;
  completionTokens?: number;
  completion_tokens?: number;
  totalTokens?: number;
  total_tokens?: number;
  requestCount?: number;
  request_count?: number;
  aiRequestsCount?: number;
  planExpiryDate?: string;
  expiryDate?: string;
}

interface SubscriptionPlanItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  priceFormatted?: string;
  interval: 'MONTH' | 'YEAR';
  aiRecipeLimit?: number;
  recipeLibraryLimit?: number;
  socialScrapeLimit?: number;
  canViewMacros?: boolean;
  allowedAiModels?: string[] | string;
  badge?: string;
  saveBadge?: string;
  features?: string[];
  isFree?: boolean;
  tokenLimit?: number;
}

interface PaymentTransaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug?: string;
  amount: number;
  currency: string;
  gateway: 'stripe' | 'paypal' | 'manual';
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  failureReason?: string;
  testMode?: boolean;
  createdAt: string;
  expiryDate?: string;
}

const SYSTEM_DEFAULT_FREE_PLAN: SubscriptionPlanItem = {
  id: 'preset_taster',
  name: 'Taster',
  slug: 'taster',
  description: 'Free tier with standard features',
  priceCents: 0,
  priceFormatted: 'Free',
  interval: 'MONTH',
  isFree: true,
  badge: '',
  saveBadge: '',
  features: [
    'Create up to 5 AI-powered recipes per month',
    'Personal recipe library (25 total recipes)',
    'Smart ingredient repurposing',
    'Automated shopping list creation',
    'Direct online grocery shopping links',
    'Meal planner',
    'Ingredient photo recognition'
  ],
  aiRecipeLimit: 5,
  recipeLibraryLimit: 25,
  socialScrapeLimit: 5,
  canViewMacros: false,
  allowedAiModels: 'gemini-1.5-flash,gpt-3.5-turbo',
  tokenLimit: 50000
};

const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  let raw = '';
  if (Array.isArray(planInput)) {
    raw = planInput[0] ? String(planInput[0]).trim() : '';
  } else if (typeof planInput === 'string') {
    if (planInput.includes(',')) {
      const parts = planInput.split(',').map(s => s.trim()).filter(Boolean);
      raw = parts[0] || '';
    } else {
      raw = planInput.trim();
    }
  } else {
    raw = String(planInput).trim();
  }
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

const calculateRenewalExpiry = (startDate: Date = new Date(), interval?: 'MONTH' | 'YEAR'): string => {
  if (!interval) return '';
  const d = new Date(startDate);
  if (interval === 'MONTH') {
    d.setMonth(d.getMonth() + 1);
  } else if (interval === 'YEAR') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString();
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

const extractUserTokenUsage = (u: any, planLimit: number = 50000): TokenUsageData => {
  if (!u) {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      monthlyLimit: planLimit
    };
  }

  const tu = u.tokenUsage || u.token_usage || {};
  const promptTokens = Number(tu.promptTokens ?? u.promptTokens ?? u.prompt_tokens ?? 0);
  const completionTokens = Number(tu.completionTokens ?? u.completionTokens ?? u.completion_tokens ?? 0);
  const totalTokens = Number(tu.totalTokens ?? u.totalTokens ?? u.total_tokens ?? (promptTokens + completionTokens));
  const requestCount = Number(tu.requestCount ?? u.requestCount ?? u.request_count ?? u.aiRequestsCount ?? 0);

  return {
    promptTokens: isNaN(promptTokens) ? 0 : promptTokens,
    completionTokens: isNaN(completionTokens) ? 0 : completionTokens,
    totalTokens: isNaN(totalTokens) ? 0 : totalTokens,
    requestCount: isNaN(requestCount) ? 0 : requestCount,
    monthlyLimit: planLimit
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const langContext = useTranslation();
  const rawT = langContext?.t;
  const currentLangCode = langContext?.locale || langContext?.currentLanguage || 'en';

  // Dynamic server-backed custom dictionary cache (from PostgreSQL)
  const [dynamicDict, setDynamicDict] = useState<Record<string, string>>({});
  const [, setRerenderTrigger] = useState(0);

  // Translation helper resolving: PostgreSQL dynamic phrases -> Context t() -> Fallback
  const t = useCallback((key: string, fallback?: string): string => {
    if (dynamicDict && dynamicDict[key]) {
      return dynamicDict[key];
    }
    if (typeof rawT === 'function') {
      const translated = rawT(key, fallback);
      if (translated && translated !== key) {
        return translated;
      }
    }
    return fallback || key;
  }, [dynamicDict, rawT]);

  // Tab Navigation: 'overview' | 'transactions'
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');

  const [user, setUserState] = useState<ExtendedUser | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [processingSocial, setProcessingSocial] = useState<SocialProvider | null>(null);

  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([SYSTEM_DEFAULT_FREE_PLAN]);
  const plansRef = useRef<SubscriptionPlanItem[]>([SYSTEM_DEFAULT_FREE_PLAN]);
  plansRef.current = plans;

  const isFetchingPlansRef = useRef(false);
  const isFetchingProfileRef = useRef(false);
  const isFetchingThemeRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Token usage state
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requestCount: 0,
    monthlyLimit: 50000
  });

  // Token identity synchronized from /admin/token-setting
  const [tokenIdentity, setTokenIdentity] = useState<TokenSettingIdentity>({
    tokenName: 'Tokens',
    tokenSymbol: '🪙'
  });

  // 1. Owner Token Balance State (Real-time balance from PostgreSQL users.token_balance)
  const [ownerTokenBalance, setOwnerTokenBalance] = useState<number>(0);

  // 2. Token Transactions & Summary State for Overview Card Preview
  const [recentTransactions, setRecentTransactions] = useState<UserTokenTransaction[]>([]);
  const [txSummaryStats, setTxSummaryStats] = useState({
    totalDeducted: 0,
    totalGranted: 0,
    totalEvents: 0
  });

  // 3. User Dedicated "Token Transactions" Tab State
  const [tabTransactions, setTabTransactions] = useState<UserTokenTransaction[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabSearch, setTabSearch] = useState('');
  const [tabTypeFilter, setTabTypeFilter] = useState('all');
  const [tabPage, setTabPage] = useState(1);
  const [tabLimit, setTabLimit] = useState(10);
  const [tabTotalPages, setTabTotalPages] = useState(1);
  const [tabTotalCount, setTabTotalCount] = useState(0);

  const activeLoginProvider = useMemo(() => getActiveLoginProvider(user), [user]);

  // Dynamic Localization Hydration & Global Events
  const loadDynamicDictionary = useCallback(async () => {
    try {
      const activeLocale = currentLangCode || 'en';
      const res = await fetch(`/api/admin/languages?code=${encodeURIComponent(activeLocale)}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.dictionary) {
          setDynamicDict(data.dictionary);
        }
      }
    } catch (_) {}
  }, [currentLangCode]);

  useEffect(() => {
    loadDynamicDictionary();
    const handleDictionarySync = () => {
      loadDynamicDictionary();
      setRerenderTrigger(v => v + 1);
    };

    window.addEventListener('zecratary_languages_updated', handleDictionarySync);
    window.addEventListener('zecratary_dictionary_updated', handleDictionarySync);
    window.addEventListener('zecratary_language_changed', handleDictionarySync);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleDictionarySync);
      window.removeEventListener('zecratary_dictionary_updated', handleDictionarySync);
      window.removeEventListener('zecratary_language_changed', handleDictionarySync);
    };
  }, [loadDynamicDictionary]);

  // Synchronize Token Identity & Settings with /admin/token-setting
  const syncTokenSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/token-setting', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const cfg = data.settings || data.config || data;
        if (cfg) {
          setTokenIdentity({
            tokenName: cfg.tokenName || cfg.name || 'Tokens',
            tokenSymbol: cfg.tokenSymbol || cfg.symbol || '🪙'
          });
        }
      }
    } catch (_) {}
  }, []);

  // Fetch Overview Token Balance & Summary from PostgreSQL
  const fetchOverviewTokenData = useCallback(async (targetUser: any) => {
    if (!targetUser?.id && !targetUser?.email) return;
    try {
      const queryParam = targetUser.id 
        ? `?userId=${encodeURIComponent(targetUser.id)}&email=${encodeURIComponent(targetUser.email || '')}&limit=5`
        : `?email=${encodeURIComponent(targetUser.email || '')}&limit=5`;
      
      const res = await fetch(`/api/tokens${queryParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof data.balance === 'number') {
            setOwnerTokenBalance(data.balance);
          }
          if (data.tokenSymbol || data.tokenName) {
            setTokenIdentity({
              tokenName: data.tokenName || 'Tokens',
              tokenSymbol: data.tokenSymbol || '🪙'
            });
          }
          const txList: UserTokenTransaction[] = Array.isArray(data.transactions) ? data.transactions : [];
          setRecentTransactions(txList);

          if (data.stats) {
            setTxSummaryStats({
              totalDeducted: Number(data.stats.totalDeducted || 0),
              totalGranted: Number(data.stats.totalGranted || 0),
              totalEvents: Number(data.stats.totalEvents || data.totalCount || 0)
            });
          }
        }
      }
    } catch (_) {}
  }, []);

  // Fetch Paginated User Transactions for "Token Transactions" Tab
  const fetchTabTransactions = useCallback(async (pageToLoad = 1, limitToUse = tabLimit, targetUser?: any) => {
    const activeUser = targetUser || user || getCurrentUser();
    if (!activeUser?.id && !activeUser?.email) return;
    setTabLoading(true);
    try {
      const params = new URLSearchParams({
        userId: activeUser.id || '',
        email: activeUser.email || '',
        page: String(pageToLoad),
        limit: String(limitToUse),
        search: tabSearch,
        type: tabTypeFilter
      });

      const res = await fetch(`/api/tokens?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTabTransactions(data.transactions || []);
          setTabTotalCount(data.totalCount || 0);
          setTabTotalPages(data.totalPages || 1);
          setTabPage(data.page || 1);
          if (typeof data.balance === 'number') {
            setOwnerTokenBalance(data.balance);
          }
          if (data.stats) {
            setTxSummaryStats({
              totalDeducted: Number(data.stats.totalDeducted || 0),
              totalGranted: Number(data.stats.totalGranted || 0),
              totalEvents: Number(data.stats.totalEvents || data.totalCount || 0)
            });
          }
        }
      }
    } catch (_) {
    } finally {
      setTabLoading(false);
    }
  }, [user, tabSearch, tabTypeFilter, tabLimit]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTabTransactions(tabPage, tabLimit);
    }
  }, [activeTab, fetchTabTransactions, tabPage, tabLimit]);

  useEffect(() => {
    syncTokenSettings();
    const handleTokenSettingsUpdate = () => {
      syncTokenSettings();
      if (user) {
        fetchOverviewTokenData(user);
        if (activeTab === 'transactions') fetchTabTransactions(tabPage, tabLimit);
      }
    };
    window.addEventListener('zecratary_token_settings_updated', handleTokenSettingsUpdate);
    window.addEventListener('zecratary_tokens_updated', handleTokenSettingsUpdate);
    return () => {
      window.removeEventListener('zecratary_token_settings_updated', handleTokenSettingsUpdate);
      window.removeEventListener('zecratary_tokens_updated', handleTokenSettingsUpdate);
    };
  }, [syncTokenSettings, fetchOverviewTokenData, fetchTabTransactions, user, activeTab, tabPage, tabLimit]);

  // Dynamic Theme & Settings Synchronization
  const applySavedTheme = useCallback(async () => {
    if (isFetchingThemeRef.current) return;
    isFetchingThemeRef.current = true;
    try {
      const res = await fetch('/api/system-settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.themeColors) {
            const root = document.documentElement;
            if (s.themeColors.primary || s.themeColors.primaryColor) {
              root.style.setProperty('--color-primary', s.themeColors.primary || s.themeColors.primaryColor);
            }
            if (s.themeColors.primaryHover) {
              root.style.setProperty('--color-primary-hover', s.themeColors.primaryHover);
            }
            if (s.themeColors.accentEmerald || s.themeColors.accentColor) {
              root.style.setProperty('--color-emerald', s.themeColors.accentEmerald || s.themeColors.accentColor);
            }
          }

          if (s.currency) {
            const symbols: Record<string, string> = {
              USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
              JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
            };
            setCurrencySymbol(symbols[s.currency] || '$');
          }
        }
      }
    } catch (_) {
    } finally {
      isFetchingThemeRef.current = false;
    }
  }, []);

  const applyThemeRef = useRef(applySavedTheme);
  applyThemeRef.current = applySavedTheme;

  useEffect(() => {
    applyThemeRef.current();

    const handleThemeEvent = () => {
      applyThemeRef.current();
    };

    window.addEventListener('zecratary_theme_mode_changed', handleThemeEvent);
    window.addEventListener('zecratary_theme_changed', handleThemeEvent);
    window.addEventListener('zecratary_theme_updated', handleThemeEvent);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleThemeEvent);
      window.removeEventListener('zecratary_theme_changed', handleThemeEvent);
      window.removeEventListener('zecratary_theme_updated', handleThemeEvent);
    };
  }, []);

  const checkIsCurrentPlan = useCallback((plan: SubscriptionPlanItem, targetUser: any = user): boolean => {
    if (!targetUser) return false;

    const rawUser = targetUser as any;
    const userPlanRaw = rawUser.subscriptionPlan || rawUser.planSlug || rawUser.planId || rawUser.subscriptionTier || '';
    const cleanUserPlan = sanitizeSinglePlan(userPlanRaw);
    const planSlug = sanitizeSinglePlan(plan.slug);
    const planId = sanitizeSinglePlan(plan.id);

    const isUserFree = !cleanUserPlan || cleanUserPlan === 'taster' || cleanUserPlan === 'free' || cleanUserPlan.includes('free');
    if (isUserFree && (plan.isFree || planSlug === 'taster' || planSlug === 'free')) {
      return true;
    }

    if (cleanUserPlan === planSlug || cleanUserPlan === planId) {
      return true;
    }

    const userInterval = (rawUser.planInterval || (cleanUserPlan.includes('annual') || cleanUserPlan.includes('year') ? 'YEAR' : 'MONTH')).toUpperCase();
    const planInterval = (plan.interval || (planSlug.includes('annual') || planSlug.includes('year') ? 'YEAR' : 'MONTH')).toUpperCase();

    const cleanUserBase = cleanUserPlan.replace(/-(monthly|annual|free)$/i, '');
    const cleanPlanBase = planSlug.replace(/-(monthly|annual|free)$/i, '');

    if (cleanUserBase && cleanPlanBase && cleanUserBase === cleanPlanBase) {
      if (plan.isFree) return true;
      return userInterval === planInterval;
    }

    return false;
  }, [user]);

  const syncActivePlanTokens = useCallback((activeUserPlanSlug: string, currentPlans: SubscriptionPlanItem[], targetUser: any = user) => {
    const cleanSlug = sanitizeSinglePlan(activeUserPlanSlug).toLowerCase();
    const matchedPlan = currentPlans.find(p => 
      p.slug.toLowerCase() === cleanSlug || 
      p.id.toLowerCase() === cleanSlug ||
      p.slug.toLowerCase().replace(/-(monthly|annual|free)$/i, '') === cleanSlug.replace(/-(monthly|annual|free)$/i, '')
    ) || SYSTEM_DEFAULT_FREE_PLAN;

    const assignedLimit = matchedPlan.tokenLimit !== undefined 
      ? Number(matchedPlan.tokenLimit) 
      : (matchedPlan.isFree ? 50000 : 1000000);

    setTokenUsage(prev => {
      const userSpecificTokens = extractUserTokenUsage(targetUser, assignedLimit);
      return {
        ...userSpecificTokens,
        monthlyLimit: assignedLimit
      };
    });
  }, [user]);

  const syncPlansFromAdmin = useCallback(async () => {
    if (isFetchingPlansRef.current) return;
    isFetchingPlansRef.current = true;

    let serverConfigs: any[] = [];
    try {
      const res = await fetch('/api/admin/plans', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.configs || data.plans || data.packages || data.subscriptionPlans);
        if (Array.isArray(list) && list.length > 0) {
          serverConfigs = list;
        }
      }
    } catch (_) {}
    finally {
      isFetchingPlansRef.current = false;
    }

    if (serverConfigs.length === 0 && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_subscription_configs');
        if (raw) serverConfigs = JSON.parse(raw);
      } catch (_) {}
    }

    const plansMap = new Map<string, SubscriptionPlanItem>();
    const configs: any[] = [...serverConfigs];

    const hasFree = configs.some((cfg: any) => 
      cfg && (
        cfg.isFree === true || 
        cfg.slug === 'taster' || 
        cfg.id === 'preset_taster' || 
        (Number(cfg.monthlyPriceDollars || 0) === 0 && Number(cfg.annualPriceDollars || 0) === 0)
      )
    );

    if (!hasFree) {
      configs.unshift({
        id: SYSTEM_DEFAULT_FREE_PLAN.id,
        name: SYSTEM_DEFAULT_FREE_PLAN.name,
        slug: SYSTEM_DEFAULT_FREE_PLAN.slug,
        isFree: true,
        isDefault: true,
        monthlyPriceDollars: 0,
        annualPriceDollars: 0,
        monthlyBadge: '',
        annualBadge: '',
        trialBadge: '',
        descriptionMonthly: SYSTEM_DEFAULT_FREE_PLAN.description,
        descriptionAnnual: SYSTEM_DEFAULT_FREE_PLAN.description,
        features: SYSTEM_DEFAULT_FREE_PLAN.features,
        tokenLimit: SYSTEM_DEFAULT_FREE_PLAN.tokenLimit,
        aiRecipeLimit: SYSTEM_DEFAULT_FREE_PLAN.aiRecipeLimit,
        recipeLibraryLimit: SYSTEM_DEFAULT_FREE_PLAN.recipeLibraryLimit,
        socialScrapeLimit: SYSTEM_DEFAULT_FREE_PLAN.socialScrapeLimit,
        canViewMacros: SYSTEM_DEFAULT_FREE_PLAN.canViewMacros,
        allowedAiModels: SYSTEM_DEFAULT_FREE_PLAN.allowedAiModels
      });
    }

    configs.forEach((cfg: any) => {
      if (!cfg || !cfg.name) return;

      let planFeatures: string[] = [];
      if (Array.isArray(cfg.features) && cfg.features.length > 0) {
        planFeatures = cfg.features.map((f: any) => String(f).trim()).filter(Boolean);
      } else if (typeof cfg.featuresText === 'string' && cfg.featuresText.trim()) {
        planFeatures = cfg.featuresText.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof cfg.descriptionMonthly === 'string' && cfg.descriptionMonthly.trim()) {
        planFeatures = [cfg.descriptionMonthly.trim()];
      }

      const isFree = Boolean(
        cfg.isFree || 
        ((Number(cfg.monthlyPriceDollars) === 0 || cfg.monthlyPriceDollars === undefined) && 
         (Number(cfg.annualPriceDollars) === 0 || cfg.annualPriceDollars === undefined))
      );

      const rawSlug = (cfg.slug || cfg.id || cfg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
      const cleanBaseSlug = rawSlug.replace(/-(monthly|annual|free)$/i, '');
      const tokenLimit = cfg.tokenLimit !== undefined ? Number(cfg.tokenLimit) : (isFree ? 50000 : 1000000);

      if (isFree) {
        const freeSlug = cleanBaseSlug || 'taster';
        plansMap.set(freeSlug, {
          id: cfg.id || freeSlug,
          name: cfg.name,
          slug: freeSlug,
          description: cfg.descriptionMonthly || cfg.descriptionAnnual || cfg.description || 'Free tier with standard features',
          priceCents: 0,
          priceFormatted: 'Free',
          interval: 'MONTH',
          isFree: true,
          badge: cfg.badge || cfg.monthlyBadge || '',
          saveBadge: '',
          features: planFeatures,
          aiRecipeLimit: cfg.aiRecipeLimit,
          recipeLibraryLimit: cfg.recipeLibraryLimit,
          socialScrapeLimit: cfg.socialScrapeLimit,
          canViewMacros: Boolean(cfg.canViewMacros),
          allowedAiModels: cfg.allowedAiModels,
          tokenLimit
        });
      } else {
        const hasMonthly = cfg.monthlyPriceDollars !== undefined && cfg.monthlyPriceDollars !== null && Number(cfg.monthlyPriceDollars) > 0;
        const hasAnnual = cfg.annualPriceDollars !== undefined && cfg.annualPriceDollars !== null && Number(cfg.annualPriceDollars) > 0;

        if (hasMonthly || !hasAnnual) {
          const mPrice = Number(cfg.monthlyPriceDollars || 0);
          const monthlySlug = `${cleanBaseSlug}-monthly`;
          plansMap.set(monthlySlug, {
            id: `${cfg.id || cleanBaseSlug}-monthly`,
            name: cfg.name,
            slug: monthlySlug,
            description: cfg.descriptionMonthly || cfg.description || `Full access to ${cfg.name}, billed monthly`,
            priceCents: Math.round(mPrice * 100),
            priceFormatted: `${currencySymbol}${mPrice.toFixed(2)}/mo`,
            interval: 'MONTH',
            isFree: false,
            badge: cfg.monthlyBadge || cfg.badge || 'Billed Monthly',
            saveBadge: '',
            features: planFeatures,
            aiRecipeLimit: cfg.aiRecipeLimit,
            recipeLibraryLimit: cfg.recipeLibraryLimit,
            socialScrapeLimit: cfg.socialScrapeLimit,
            canViewMacros: Boolean(cfg.canViewMacros),
            allowedAiModels: cfg.allowedAiModels,
            tokenLimit
          });
        }

        if (hasAnnual) {
          const aPrice = Number(cfg.annualPriceDollars || 0);
          const annualSlug = `${cleanBaseSlug}-annual`;
          plansMap.set(annualSlug, {
            id: `${cfg.id || cleanBaseSlug}-annual`,
            name: cfg.name,
            slug: annualSlug,
            description: cfg.descriptionAnnual || cfg.description || `Best value - all ${cfg.name} features, billed annually`,
            priceCents: Math.round(aPrice * 100),
            priceFormatted: `${currencySymbol}${aPrice.toFixed(2)}/yr`,
            interval: 'YEAR',
            isFree: false,
            badge: cfg.trialBadge || cfg.annualBadge || 'Best Value',
            saveBadge: cfg.annualBadge || '',
            features: planFeatures,
            aiRecipeLimit: cfg.aiRecipeLimit,
            recipeLibraryLimit: cfg.recipeLibraryLimit,
            socialScrapeLimit: cfg.socialScrapeLimit,
            canViewMacros: Boolean(cfg.canViewMacros),
            allowedAiModels: cfg.allowedAiModels,
            tokenLimit
          });
        }
      }
    });

    const dynamicPlans = Array.from(plansMap.values());
    plansRef.current = dynamicPlans;
    setPlans(prev => JSON.stringify(prev) === JSON.stringify(dynamicPlans) ? prev : dynamicPlans);

    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('zecratary_current_user') : null;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const uPlan = sanitizeSinglePlan(u.subscriptionPlan || u.subscriptionTier || u.planSlug || '');
        syncActivePlanTokens(uPlan, dynamicPlans, u);
      } catch (_) {}
    }
  }, [currencySymbol, syncActivePlanTokens]);

  const reloadActiveUser = useCallback(async () => {
    if (isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;
    try {
      initAuthStorage();
      let active = getCurrentUser() as ExtendedUser | null;

      if (!active && typeof document !== 'undefined') {
        let match: RegExpMatchArray | null = null;
        const authKeys = ['zecratary_session', 'zecratary_current_user', 'zecratary_auth_session', 'currentUser'];
        for (const k of authKeys) {
          const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)'));
          if (m && m[1]) {
            match = m;
            break;
          }
        }
        if (match && match[1]) {
          try {
            const cookieData = JSON.parse(decodeURIComponent(match[1]));
            if (cookieData && (cookieData.email || cookieData.id)) {
              active = {
                ...cookieData,
                id: cookieData.id || 'usr_standard_default',
                name: cookieData.name || 'Standard User',
                email: cookieData.email || 'user@foodieprep.com',
                role: cookieData.role || 'user',
                subscriptionPlan: cookieData.subscriptionPlan || cookieData.subscription_plan || 'taster'
              };
              if (typeof window !== 'undefined') {
                localStorage.setItem('zecratary_current_user', JSON.stringify(active));
              }
            }
          } catch (_) {}
        }
      }

      if (!active) {
        router.replace('/login');
        return;
      }

      let matchedUser: ExtendedUser = { ...active };

      try {
        const uRes = await fetch('/api/admin/users', { cache: 'no-store' });
        if (uRes.ok) {
          const uData = await uRes.json();
          const usersList: any[] = Array.isArray(uData.users) ? uData.users : Array.isArray(uData) ? uData : [];
          const fresh = usersList.find((u: any) => 
            (active?.id && u.id === active.id) || 
            (active?.email && u.email?.toLowerCase().trim() === active.email.toLowerCase().trim())
          );

          if (fresh) {
            const authoritativePlan = sanitizeSinglePlan(fresh.subscriptionPlan || fresh.subscription_plan || 'taster');
            matchedUser = {
              ...active,
              ...fresh,
              subscriptionPlan: authoritativePlan,
              planSlug: authoritativePlan,
              token_balance: fresh.token_balance ?? fresh.tokenBalance ?? (active as any)?.token_balance
            };
          }
        }
      } catch (_) {}

      const detectedSocial = detectUserSocialProviders(matchedUser);
      const activeSocial = getActiveLoginProvider(matchedUser);
      if (activeSocial && !detectedSocial.includes(activeSocial)) {
        detectedSocial.push(activeSocial);
      }
      matchedUser.linkedProviders = detectedSocial;
      matchedUser.linked_providers = detectedSocial;
      if (activeSocial && !matchedUser.provider && !matchedUser.authProvider) {
        matchedUser.provider = activeSocial;
        matchedUser.authProvider = activeSocial;
      }

      if (activeSocial && (!active?.linkedProviders?.includes(activeSocial) || !active?.linked_providers?.includes(activeSocial))) {
        try {
          fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...matchedUser,
              linkedProviders: detectedSocial,
              linked_providers: detectedSocial,
              auth_provider: activeSocial,
              provider: activeSocial
            })
          }).catch(() => {});
        } catch (_) {}
      }

      try {
        const txRes = await fetch('/api/admin/payment', { cache: 'no-store' });
        if (txRes.ok) {
          const txData = await txRes.json();
          const txList: PaymentTransaction[] = Array.isArray(txData.transactions) ? txData.transactions : [];
          const now = new Date();
          const userEmail = matchedUser.email.toLowerCase().trim();

          const userTxs = txList.filter((t) => (t.customerEmail || '').toLowerCase().trim() === userEmail);
          userTxs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          const latestActiveTx = userTxs.find((t) => 
            (t.status === 'succeeded' || (t.status as any) === 'paid') &&
            (!t.expiryDate || new Date(t.expiryDate).getTime() > now.getTime())
          );

          if (latestActiveTx && latestActiveTx.expiryDate) {
            (matchedUser as any).expiryDate = latestActiveTx.expiryDate;
            (matchedUser as any).planExpiryDate = latestActiveTx.expiryDate;
          } else if (matchedUser.subscriptionPlan && matchedUser.subscriptionPlan !== 'taster' && !matchedUser.subscriptionPlan.includes('free')) {
            const fallbackExpiry = (matchedUser as any).planExpiryDate || (matchedUser as any).expiryDate;
            if (!fallbackExpiry) {
              const calculatedExpiry = calculateRenewalExpiry(new Date(), matchedUser.subscriptionPlan.includes('annual') ? 'YEAR' : 'MONTH');
              (matchedUser as any).expiryDate = calculatedExpiry;
              (matchedUser as any).planExpiryDate = calculatedExpiry;
            }
          }
        }
      } catch (_) {}

      setUserState(prev => (prev && JSON.stringify(prev) === JSON.stringify(matchedUser) ? prev : matchedUser));
      setName(prev => (prev === (matchedUser.name || '') ? prev : (matchedUser.name || '')));
      setEmail(prev => (prev === (matchedUser.email || '') ? prev : (matchedUser.email || '')));

      if (matchedUser.token_balance !== undefined) {
        setOwnerTokenBalance(Number(matchedUser.token_balance));
      }

      try {
        localStorage.setItem('zecratary_current_user', JSON.stringify(matchedUser));
        localStorage.setItem('zecratary_user', JSON.stringify(matchedUser));
      } catch (_) {}

      const userPlan = sanitizeSinglePlan((matchedUser as any).subscriptionPlan || (matchedUser as any).planSlug || 'taster');
      syncActivePlanTokens(userPlan, plansRef.current, matchedUser);

      fetchOverviewTokenData(matchedUser);
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, [router, syncActivePlanTokens, fetchOverviewTokenData]);

  const syncPlansRef = useRef(syncPlansFromAdmin);
  syncPlansRef.current = syncPlansFromAdmin;

  const reloadUserRef = useRef(reloadActiveUser);
  reloadUserRef.current = reloadActiveUser;

  useEffect(() => {
    document.title = `${t('accountProfileTitle', 'Account Profile')} - Zecratary`;
  }, [t]);

  useEffect(() => {
    syncPlansRef.current();
    reloadUserRef.current();

    const handleDebouncedSync = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        syncPlansRef.current();
        reloadUserRef.current();
      }, 300);
    };

    window.addEventListener('zecratary_plans_updated', handleDebouncedSync);
    window.addEventListener('zecratary_users_updated', handleDebouncedSync);
    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_token_settings_updated', handleDebouncedSync);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('zecratary_plans_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_users_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_token_settings_updated', handleDebouncedSync);
    };
  }, []);

  const handleToggleSocialLink = async (provider: SocialProvider) => {
    if (!user) return;
    setProcessingSocial(provider);
    setError('');
    setSuccessMsg('');

    const isLinked = Boolean(user.linkedProviders?.includes(provider));
    const isLoginMethod = activeLoginProvider === provider;
    const provName = provider.charAt(0).toUpperCase() + provider.slice(1);

    if (!isLinked) {
      try {
        const sRes = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (sRes.ok) {
          const sData = await sRes.json();
          const socialCfg = sData?.settings?.socialLogin || sData?.socialLogin;
          if (socialCfg) {
            const isEnabled = provider === 'google' 
              ? socialCfg.googleEnabled !== false 
              : provider === 'facebook' 
              ? Boolean(socialCfg.facebookEnabled) 
              : Boolean(socialCfg.appleEnabled);

            if (!isEnabled) {
              setError(t('socialProviderDisabled', `${provName} connection is currently disabled by administrator.`));
              setProcessingSocial(null);
              return;
            }
          }
        }
      } catch (_) {}
    }

    let updatedLinked = [...(user.linkedProviders || [])];

    if (isLinked) {
      const otherLinked = updatedLinked.filter(p => p !== provider);
      const hasPassword = Boolean(user.password && user.password.length >= 4);

      if (isLoginMethod && !hasPassword && otherLinked.length === 0) {
        setError(t('cannotUnlinkActiveLogin', `Cannot unlink ${provName}: This is your active social login method. Please set a password first before disconnecting.`));
        setProcessingSocial(null);
        return;
      }
      if (updatedLinked.length === 1 && !hasPassword) {
        setError(t('cannotUnlinkOnlyLogin', `Cannot unlink ${provName}: This is your only login method. Set a password first.`));
        setProcessingSocial(null);
        return;
      }
      updatedLinked = otherLinked;
      setSuccessMsg(t('unlinkedSocialSuccess', `Unlinked ${provName} account successfully.`));
    } else {
      if (!updatedLinked.includes(provider)) {
        updatedLinked.push(provider);
      }
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

    try {
      localStorage.setItem('zecratary_current_user', JSON.stringify(updatedUser));
      localStorage.setItem('zecratary_user', JSON.stringify(updatedUser));
    } catch (_) {}

    setCurrentUser(updatedUser);
    setUserState(updatedUser);
    setProcessingSocial(null);
    window.dispatchEvent(new Event('zecratary_users_updated'));
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const userPlanBadge = useMemo(() => {
    const rawKey = ((user as any)?.subscriptionPlan || (user as any)?.subscriptionTier || (user as any)?.planSlug || (user as any)?.planId || '').toLowerCase().trim();
    const planKey = sanitizeSinglePlan(rawKey);

    const matched = plans.find(p => checkIsCurrentPlan(p));
    if (matched) {
      const isAnnual = matched.interval === 'YEAR' || matched.slug.includes('annual');
      const intervalText = matched.isFree 
        ? ` (${t('freePlanLabel', 'Free')})` 
        : isAnnual 
        ? ` (${t('annualPlanLabel', 'Annual')})` 
        : ` (${t('monthlyPlanLabel', 'Monthly')})`;

      return {
        label: `${matched.name}${intervalText}`,
        bg: 'var(--color-inner-dark)',
        border: matched.isFree ? 'var(--color-emerald)' : isAnnual ? '#3b82f6' : 'var(--color-primary)',
        color: matched.isFree ? 'var(--color-emerald)' : isAnnual ? '#60a5fa' : 'var(--color-primary)',
        icon: matched.isFree ? Sparkles : Zap,
        matchedPlan: matched
      };
    }

    if (!planKey || planKey === 'free' || planKey.includes('free') || planKey === 'taster') {
      return {
        label: t('freeTierNoExpiry', 'Taster (Free)'),
        bg: 'var(--color-inner-dark)',
        border: 'var(--color-emerald)',
        color: 'var(--color-emerald)',
        icon: Sparkles,
        matchedPlan: null
      };
    }

    const formatted = planKey
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      label: formatted,
      bg: 'var(--color-inner-dark)',
      border: 'var(--color-primary)',
      color: 'var(--color-primary)',
      icon: Zap,
      matchedPlan: null
    };
  }, [user, plans, checkIsCurrentPlan, t]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!user) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setError(t('nameAndEmailRequired', 'Full Name and Email Address are required.'));
      return;
    }

    if (password || confirmPassword) {
      if (password.length < 4) {
        setError(t('passwordLengthError', 'New password must be at least 4 characters long.'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('passwordMismatchError', 'New password and confirmation password do not match.'));
        return;
      }
    }

    const updatedUser: ExtendedUser = {
      ...user,
      name: cleanName,
      email: cleanEmail,
      password: password ? password : user.password,
    };

    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
    } catch (_) {}

    try {
      localStorage.setItem('zecratary_current_user', JSON.stringify(updatedUser));
      localStorage.setItem('zecratary_user', JSON.stringify(updatedUser));
    } catch (_) {}

    setCurrentUser(updatedUser);
    setUserState(updatedUser);
    setPassword('');
    setConfirmPassword('');

    window.dispatchEvent(new Event('zecratary_users_updated'));
    setSuccessMsg(t('profileSavedSuccess', 'Your profile changes have been saved successfully!'));
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm(t('confirmDeleteAccount', 'Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.'))) {
      return;
    }
    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const userId = user.id;

      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, email: cleanEmail }),
      }).catch(() => {});

      logoutUser();
      router.replace('/login');
    } catch (err: any) {
      alert(t('deleteAccountFailed', 'Failed to delete account: ') + (err?.message || 'Server error'));
    }
  };

  // Service Badge renderer matching /admin/token-setting
  const renderServiceBadge = (type: string) => {
    if (type === 'usage_chef') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
          <ChefHat className="h-3 w-3" /> /chef AI Chat
        </span>
      );
    }
    if (type.startsWith('usage_import')) {
      const sub = type.replace('usage_import_', '');
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <DownloadCloud className="h-3 w-3" /> /import ({sub.toUpperCase()})
        </span>
      );
    }
    if (type === 'package_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <DollarSign className="h-3 w-3" /> Package Purchase
        </span>
      );
    }
    if (type === 'plan_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> Plan Purchase
        </span>
      );
    }
    if (type === 'plan_monthly_grant') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> Monthly Grant
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Activity className="h-3 w-3" /> {type.replace('_', ' ')}
      </span>
    );
  };

  // Pagination Window Calculator
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, tabPage - Math.floor(maxVisible / 2));
    let end = Math.min(tabTotalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const PlanHeaderIcon = userPlanBadge.icon;
  const activeExpiryDate = (user as any).planExpiryDate || (user as any).expiryDate;

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ 
        color: 'var(--color-text)',
        backgroundColor: 'var(--color-bg)'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .profile-input:-webkit-autofill,
        .profile-input:-webkit-autofill:hover,
        .profile-input:-webkit-autofill:focus,
        .profile-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          -webkit-text-fill-color: var(--color-text) !important;
          caret-color: var(--color-text) !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
      `}} />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
             {t('accountProfileTitle', 'Account Profile')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('accountProfileSubtitle', 'Manage your credentials, active AI token quotas, and subscription plan')}
          </p>
        </div>

        {user.role === 'admin' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/token-setting"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Coins className="h-3.5 w-3.5 text-amber-500" /> {t('tokenSettings', 'Token Settings')}
            </Link>
            <Link
              href="/admin/social-login-setting"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Key className="h-3.5 w-3.5 text-orange-400" /> {t('socialSettings', 'Social Settings')}
            </Link>
            <Link
              href="/admin"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Shield className="h-3.5 w-3.5 text-emerald-400" /> {t('adminAccess', 'Admin Access')}
            </Link>
            <Link
              href="/admin/plans"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Zap className="h-3.5 w-3.5 text-orange-400" /> {t('subscriptionPlans', 'Subscription Plans')}
            </Link>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#ef4444'
          }}
        >
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-emerald)',
            color: 'var(--color-emerald)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB NAVIGATION: "Profile Overview" vs "Token Transactions" */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-inner-dark)',
          borderColor: 'var(--color-border)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'overview' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-emerald)',
            borderColor: 'var(--color-emerald)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary)'
          }}
        >
          <UserIcon className="h-4 w-4" />
          <span>{t('profileOverviewTab', 'Profile Overview')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('transactions');
            fetchTabTransactions(1, tabLimit);
          }}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'transactions' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-emerald)',
            borderColor: 'var(--color-emerald)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary)'
          }}
        >
          <Coins className="h-4 w-4 text-amber-500" />
          <span>{t('tokenTransactionsTab', 'Token Transactions')}</span>
          {txSummaryStats.totalEvents > 0 && (
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/10" style={{ borderColor: 'var(--color-border)' }}>
              {txSummaryStats.totalEvents}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE OVERVIEW (Credentials, Token Balance & Socials)            */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          {/* USER DETAILS & TOKEN BALANCE / SUMMARY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* MAIN PROFILE CARD */}
            <div 
              className="lg:col-span-7 border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200 flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-black shadow-inner"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>{user.name}</h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</p>
                    {user.id && (
                      <p className="text-[11px] font-mono tracking-tight" style={{ color: 'var(--color-text-secondary)' }}>
                        ID: {user.id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex sm:justify-end items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                    <span>{t('joinedPrefix', 'Joined: ')} {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : t('activeStatus', 'Active')}</span>
                  </div>
                  
                  <div className="flex sm:justify-end items-center gap-1.5 pt-0.5">
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('activeMembershipLabel', 'Membership:')}</span>
                    <span 
                      className="font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase border shadow-sm inline-flex items-center gap-1"
                      style={{
                        backgroundColor: userPlanBadge.bg,
                        borderColor: userPlanBadge.border,
                        color: userPlanBadge.color
                      }}
                    >
                      <PlanHeaderIcon className="h-3 w-3 shrink-0" />
                      {userPlanBadge.label}
                    </span>
                  </div>

                  {activeExpiryDate ? (
                    <div className="flex sm:justify-end items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{t('renewalExpiryPrefix', 'Expiry: ')} {new Date(activeExpiryDate).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className="flex sm:justify-end items-center gap-1 text-[11px] italic pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>{t('freeTierNoExpiry', 'Free Tier')}</span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs" autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('fullNameLabel', 'Full Name *')}</label>
                    <div className="relative">
                      <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: 'var(--color-text-secondary)' }} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('namePlaceholder', 'e.g. Jordan Smith')}
                        className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('emailAddressLabel', 'Email Address *')}</label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: 'var(--color-text-secondary)' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder', 'name@example.com')}
                        className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('newPasswordLabel', 'New Password')} <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{t('leaveBlankCurrentPass', '(leave blank)')}</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: 'var(--color-text-secondary)' }} />
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('confirmPasswordLabel', 'Confirm Password')} <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>{t('repeatNewPass', '(repeat)')}</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: 'var(--color-text-secondary)' }} />
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      logoutUser();
                      router.replace('/login');
                    }}
                    className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#ef4444'
                    }}
                  >
                    <LogOut className="h-4 w-4 text-red-500" /> {t('signOutBtn', 'Sign Out')}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs text-red-400 hover:text-red-300 border-red-900/60 hover:bg-red-950/30"
                    style={{ backgroundColor: 'var(--color-inner-dark)' }}
                  >
                    {t('deleteAccountBtn', 'Delete Account')}
                  </button>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                  >
                    <Check className="h-4 w-4" /> {t('saveProfileBtn', 'Save Profile')}
                  </button>
                </div>
              </form>
            </div>

            {/* TOKEN BALANCE & SUMMARY CARD */}
            <div 
              className="lg:col-span-5 border rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl transition-colors duration-200 flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="space-y-4">
                {/* Header: "Token Balance & Summary" */}
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                  <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <Coins className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>{t('tokenBalanceAndSummaryTitle', 'Token Balance & Summary')}</span>
                  </h2>
                  <span 
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg border font-bold shadow-xs uppercase tracking-wider"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    {tokenIdentity.tokenName}
                  </span>
                </div>

                {/* 1. Show Owner Token Balance */}
                <div 
                  className="border rounded-2xl p-4 space-y-2.5 shadow-inner"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      <Wallet className="h-4 w-4 text-amber-500" />
                      <span>{t('ownerTokenBalanceLabel', 'Owner Token Balance')}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {t('walletActive', 'Wallet Active')}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-3xl font-black font-mono" style={{ color: 'var(--color-emerald)' }}>
                      {ownerTokenBalance.toLocaleString()}
                    </span>
                    <span className="text-base font-black text-amber-500 font-mono">
                      {tokenIdentity.tokenSymbol}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {tokenIdentity.tokenName}
                    </span>
                  </div>
                </div>

                {/* 2. Token Transaction Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                      <Activity className="h-3.5 w-3.5 text-purple-400" />
                      <span>{t('tokenTransactionSummaryTitle', 'Token Transaction Summary')}</span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {txSummaryStats.totalEvents} {t('eventsLogged', 'logged')}
                    </span>
                  </div>

                  {/* Summary 3-KPI Row matching /admin/token-setting */}
                  <div className="grid grid-cols-3 gap-2">
                    <div 
                      className="border rounded-xl p-2.5 space-y-0.5 shadow-inner text-center"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <ArrowDownLeft className="h-3 w-3 text-red-500" />
                        <span>{t('consumed', 'Consumed')}</span>
                      </div>
                      <div className="text-xs font-black font-mono text-red-400">
                        -{txSummaryStats.totalDeducted.toLocaleString()} {tokenIdentity.tokenSymbol}
                      </div>
                    </div>

                    <div 
                      className="border rounded-xl p-2.5 space-y-0.5 shadow-inner text-center"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        <span>{t('granted', 'Granted')}</span>
                      </div>
                      <div className="text-xs font-black font-mono text-emerald-400">
                        +{txSummaryStats.totalGranted.toLocaleString()} {tokenIdentity.tokenSymbol}
                      </div>
                    </div>

                    <div 
                      className="border rounded-xl p-2.5 space-y-0.5 shadow-inner text-center"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <Activity className="h-3 w-3 text-purple-400" />
                        <span>{t('events', 'Events')}</span>
                      </div>
                      <div className="text-xs font-black font-mono" style={{ color: 'var(--color-text)' }}>
                        {txSummaryStats.totalEvents}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold block" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('recentTokenActivity', 'Recent Token Activity')}
                    </span>

                    {recentTransactions.length === 0 ? (
                      <div 
                        className="p-3.5 rounded-xl border text-center text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {t('noTokenTransactionsYet', 'No token transactions recorded yet. Use /chef or /import to begin!')}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                        {recentTransactions.slice(0, 4).map((tx) => {
                          const isNegative = Number(tx.amount) < 0;
                          return (
                            <div 
                              key={tx.id}
                              className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)'
                              }}
                            >
                              <div className="space-y-0.5">
                                <div>{renderServiceBadge(tx.type)}</div>
                                <div className="text-[10px] font-mono opacity-70 truncate max-w-[170px]" style={{ color: 'var(--color-text-secondary)' }} title={tx.description}>
                                  {tx.description || new Date(tx.created_at).toLocaleDateString()}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`font-mono font-black text-xs ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {isNegative ? '' : '+'}{tx.amount} {tokenIdentity.tokenSymbol}
                                </span>
                                <div className="text-[10px] font-mono opacity-60" style={{ color: 'var(--color-text-secondary)' }}>
                                  Bal: {tx.balance_after}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action: Switches to Token Transactions Tab */}
              <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {txSummaryStats.totalEvents} {t('totalLedgerItems', 'transactions in ledger')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('transactions');
                    fetchTabTransactions(1, tabLimit);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 hover:text-amber-400 transition cursor-pointer"
                >
                  <span>{t('viewAllTransactionsBtn', 'View Full Ledger in Tab')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* CONNECTED SOCIAL ACCOUNTS */}
          <div 
            className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Link2 className="h-5 w-5 text-[var(--color-primary)]" />
                {t('connectedSocialAccountsTitle', 'Connected Social Accounts')}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('connectedSocialAccountsSubtitle', 'Link external identities (Google, Facebook, Apple) to enable seamless one-click sign in.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {([
                {
                  id: 'google' as SocialProvider,
                  name: 'Google',
                  renderIcon: () => (
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
                  renderIcon: () => (
                    <svg className="w-5 h-5 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                    </svg>
                  )
                },
                {
                  id: 'apple' as SocialProvider,
                  name: 'Apple',
                  renderIcon: () => (
                    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                    </svg>
                  )
                }
              ]).map(({ id: provId, name: provName, renderIcon }) => {
                const isPrimary = activeLoginProvider === provId;
                const isLinked = Boolean(user.linkedProviders?.includes(provId)) || isPrimary;

                return (
                  <div 
                    key={provId}
                    className="border rounded-2xl p-4 flex items-center justify-between shadow-xs transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {renderIcon()}
                      <div>
                        <span className="block font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                          {t(provId + 'Provider', provName)}
                        </span>
                        <span className={`text-[10px] font-semibold ${isLinked ? 'text-[var(--color-emerald)]' : 'text-slate-500'}`}>
                          {isPrimary 
                            ? t('linkedLoginMethod', 'Linked (Login Method)') 
                            : isLinked 
                            ? t('linked', 'Linked') 
                            : t('notLinked', 'Not Linked')}
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
                      style={{
                        backgroundColor: isLinked ? 'transparent' : 'var(--color-primary)'
                      }}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER TOKEN TRANSACTIONS AUDIT LEDGER WITH PAGINATION               */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary KPI Cards for Logged-In User */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('myWalletBalance', 'My Token Balance')}</span>
                <Wallet className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {ownerTokenBalance.toLocaleString()} <span className="text-xs text-amber-500">{tokenIdentity.tokenSymbol}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Available for /chef and /import</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('totalDeductions', 'Total Consumed')}</span>
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-red-400">
                -{txSummaryStats.totalDeducted.toLocaleString()} <span className="text-xs text-amber-500">{tokenIdentity.tokenSymbol}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Tokens debited on AI operations</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('totalGranted', 'Total Granted / Bought')}</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                +{txSummaryStats.totalGranted.toLocaleString()} <span className="text-xs text-amber-500">{tokenIdentity.tokenSymbol}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>From plans, grants & packages</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('totalEvents', 'Total Transactions')}</span>
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: 'var(--color-text)' }}>
                {tabTotalCount.toLocaleString()}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Immutable ledger rows in PostgreSQL</p>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div 
            className="border rounded-3xl p-5 shadow-xl space-y-4"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="h-4 w-4 absolute left-3.5 top-3" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  value={tabSearch}
                  onChange={(e) => {
                    setTabSearch(e.target.value);
                    setTabPage(1);
                  }}
                  placeholder={t('searchMyTransactionsPlaceholder', 'Search by description or transaction ID...')}
                  className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Service Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 shrink-0 text-amber-500" />
                <select
                  value={tabTypeFilter}
                  onChange={(e) => {
                    setTabTypeFilter(e.target.value);
                    setTabPage(1);
                  }}
                  className="w-full sm:w-48 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="all">All Services & Sources</option>
                  <option value="chef">/chef (AI Chat)</option>
                  <option value="import">/import (All Types)</option>
                  <option value="purchase">All Purchases (Plans & Packages)</option>
                  <option value="plan_purchase">Plan Purchases</option>
                  <option value="grant">Monthly Plan Grants</option>
                </select>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('rowsLabel', 'Rows:')}
                </span>
                <select
                  value={tabLimit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setTabLimit(newLimit);
                    setTabPage(1);
                  }}
                  className="border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchTabTransactions(tabPage, tabLimit)}
                disabled={tabLoading}
                className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${tabLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
                <span>{t('refreshBtn', 'Refresh')}</span>
              </button>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <th className="p-3.5">Service / Operation</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Balance After</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {tabLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
                          <span>{t('loadingLedger', 'Loading your token transactions...')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : tabTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('noTransactionsFound', 'No transactions recorded matching your search parameters.')}
                      </td>
                    </tr>
                  ) : (
                    tabTransactions.map((tx) => {
                      const isNegative = Number(tx.amount) < 0;
                      return (
                        <tr 
                          key={tx.id} 
                          className="hover:bg-slate-500/5 transition font-medium"
                          style={{ color: 'var(--color-text)' }}
                        >
                          <td className="p-3.5">
                            {renderServiceBadge(tx.type)}
                          </td>

                          <td className="p-3.5">
                            <span className={`font-mono font-black text-xs ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isNegative ? '' : '+'}{tx.amount} {tokenIdentity.tokenSymbol}
                            </span>
                          </td>

                          <td className="p-3.5 font-mono text-xs font-bold">
                            {tx.balance_after} <span className="text-amber-500">{tokenIdentity.tokenSymbol}</span>
                          </td>

                          <td className="p-3.5 max-w-[280px] truncate text-[11px]" style={{ color: 'var(--color-text-secondary)' }} title={tx.description}>
                            {tx.description || '-'}
                          </td>

                          <td className="p-3.5 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('showing', 'Showing')}{' '}
                <strong style={{ color: 'var(--color-text)' }}>
                  {tabTotalCount > 0 ? (tabPage - 1) * tabLimit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong style={{ color: 'var(--color-text)' }}>
                  {Math.min(tabPage * tabLimit, tabTotalCount)}
                </strong>{' '}
                {t('of', 'of')}{' '}
                <strong style={{ color: 'var(--color-text)' }}>{tabTotalCount}</strong>{' '}
                {t('transactionsLabel', 'transactions')}
              </span>

              {/* Page Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={tabPage <= 1 || tabLoading}
                  onClick={() => setTabPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={tabPage <= 1 || tabLoading}
                  onClick={() => setTabPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTabPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-sm"
                    style={tabPage === num ? {
                      backgroundColor: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={tabPage >= tabTotalPages || tabLoading}
                  onClick={() => setTabPage(p => Math.min(tabTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={tabPage >= tabTotalPages || tabLoading}
                  onClick={() => setTabPage(tabTotalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
