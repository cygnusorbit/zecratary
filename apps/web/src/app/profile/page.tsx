// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle, 
  AlertCircle, Calendar, LogOut, Check, CreditCard,
  Zap, Sparkles, CheckCircle2, RefreshCw, Shield,
  Clock, Cpu, Repeat, Link2, Unlink, Key
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

type SocialProvider = 'google' | 'facebook' | 'apple';

interface ExtendedUser extends User {
  linkedProviders?: SocialProvider[];
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
  stripePriceId?: string;
  badge?: string;
  saveBadge?: string;
  subPrice?: string;
  strikethroughPrice?: string;
  buttonText?: string;
  buttonTheme?: 'orange' | 'green';
  features?: string[];
  isFree?: boolean;
  tokenLimit?: number;
  tokenReimburseFrequency?: 'once' | 'weekly' | 'monthly';
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

interface TokenUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  monthlyLimit: number;
  reimburseFrequency: 'once' | 'weekly' | 'monthly';
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
  buttonText: 'Switch to Free',
  buttonTheme: 'orange',
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
  allowedAiModels: 'gemini-3.5-flash-lite,gpt-3.5-turbo',
  tokenLimit: 50000,
  tokenReimburseFrequency: 'monthly'
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

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUserState] = useState<ExtendedUser | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

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

  const [selectedInterval, setSelectedInterval] = useState<'ALL' | 'MONTH' | 'YEAR'>('ALL');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const [tokenUsage, setTokenUsage] = useState<TokenUsageData>({
    promptTokens: 1420,
    completionTokens: 850,
    totalTokens: 2270,
    requestCount: 14,
    monthlyLimit: 50000,
    reimburseFrequency: 'monthly'
  });
  const [activeModelName, setActiveModelName] = useState('gemini-1.5-flash');

  const applySavedTheme = useCallback(async () => {
    try {
      try {
        const res = await fetch('/api/system-settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            if (s.themeMode && !localStorage.getItem('zecratary_theme_mode')) {
              localStorage.setItem('zecratary_theme_mode', s.themeMode);
            }
            if (s.themeColors && !localStorage.getItem('zecratary_theme_colors')) {
              localStorage.setItem('zecratary_theme_colors', JSON.stringify(s.themeColors));
            }
            if (s.currency && !localStorage.getItem('zecratary_currency')) {
              localStorage.setItem('zecratary_currency', s.currency);
            }
          }
        }
      } catch (_) {}

      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light' || mode === 'day';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        const root = document.documentElement;
        if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
        if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
        if (c.accentEmerald || c.accentColor) {
          root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
          root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor);
        }
      }

      const curr = localStorage.getItem('zecratary_currency') || 'USD';
      setCurrencyCode(curr);
      const symbols: Record<string, string> = {
        USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
        JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
      };
      setCurrencySymbol(symbols[curr] || '$');

      const aiConfigRaw = localStorage.getItem('zecratary_chef_ai_settings') || localStorage.getItem('zecratary_engine_config');
      if (aiConfigRaw) {
        const aiCfg = JSON.parse(aiConfigRaw);
        if (aiCfg.model) setActiveModelName(aiCfg.model);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('zecratary_payment_updated', applySavedTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_payment_updated', applySavedTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applySavedTheme]);

  // Synchronized plan matcher aligning with /admin/users logic
  const checkIsCurrentPlan = useCallback((plan: SubscriptionPlanItem): boolean => {
    if (!user) return false;

    const rawUser = user as any;
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

  const syncActivePlanTokens = useCallback((activeUserPlanSlug: string, currentPlans: SubscriptionPlanItem[]) => {
    const cleanSlug = sanitizeSinglePlan(activeUserPlanSlug).toLowerCase();
    const matchedPlan = currentPlans.find(p => 
      p.slug.toLowerCase() === cleanSlug || 
      p.id.toLowerCase() === cleanSlug ||
      p.slug.toLowerCase().replace(/-(monthly|annual|free)$/i, '') === cleanSlug.replace(/-(monthly|annual|free)$/i, '')
    );

    let assignedLimit = 50000;
    let assignedFrequency: 'once' | 'weekly' | 'monthly' = 'monthly';

    if (matchedPlan) {
      if (matchedPlan.tokenLimit !== undefined) {
        assignedLimit = matchedPlan.tokenLimit;
      }
      if (matchedPlan.tokenReimburseFrequency) {
        assignedFrequency = matchedPlan.tokenReimburseFrequency;
      }
    }

    try {
      const storedTokens = typeof window !== 'undefined' ? localStorage.getItem('zecratary_token_usage') : null;
      const parsed = storedTokens ? JSON.parse(storedTokens) : {};
      const updated = {
        promptTokens: parsed.promptTokens || 1420,
        completionTokens: parsed.completionTokens || 850,
        totalTokens: (parsed.promptTokens || 1420) + (parsed.completionTokens || 850),
        requestCount: parsed.requestCount || 14,
        monthlyLimit: assignedLimit,
        reimburseFrequency: assignedFrequency
      };
      setTokenUsage(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_token_usage', JSON.stringify(updated));
      }
    } catch (_) {}
  }, []);

  // Synchronize available subscription plans dynamically from /api/admin/plans with /admin/users interval naming
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
          if (typeof window !== 'undefined') {
            localStorage.setItem('zecratary_subscription_configs', JSON.stringify(serverConfigs));
          }
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
        buttonText: t('switchToFreeBtn') || 'Switch to Free',
        features: SYSTEM_DEFAULT_FREE_PLAN.features,
        tokenLimit: SYSTEM_DEFAULT_FREE_PLAN.tokenLimit,
        tokenReimburseFrequency: SYSTEM_DEFAULT_FREE_PLAN.tokenReimburseFrequency,
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
      const tokenReimburseFrequency = cfg.tokenReimburseFrequency || 'monthly';

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
          buttonText: cfg.buttonText || (t('switchToFreeBtn') || 'Switch to Free'),
          buttonTheme: 'orange',
          features: planFeatures,
          aiRecipeLimit: cfg.aiRecipeLimit,
          recipeLibraryLimit: cfg.recipeLibraryLimit,
          socialScrapeLimit: cfg.socialScrapeLimit,
          canViewMacros: Boolean(cfg.canViewMacros),
          allowedAiModels: cfg.allowedAiModels,
          tokenLimit,
          tokenReimburseFrequency,
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
            buttonText: cfg.buttonText || (t('choosePlanBtn') || 'Choose Plan'),
            buttonTheme: 'green',
            features: planFeatures,
            aiRecipeLimit: cfg.aiRecipeLimit,
            recipeLibraryLimit: cfg.recipeLibraryLimit,
            socialScrapeLimit: cfg.socialScrapeLimit,
            canViewMacros: Boolean(cfg.canViewMacros),
            allowedAiModels: cfg.allowedAiModels,
            tokenLimit,
            tokenReimburseFrequency,
          });
        }

        if (hasAnnual) {
          const aPrice = Number(cfg.annualPriceDollars || 0);
          const annualSlug = `${cleanBaseSlug}-annual`;
          const mEquivalent = (aPrice / 12).toFixed(2);
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
            subPrice: `${currencySymbol}${mEquivalent}/month`,
            strikethroughPrice: hasMonthly ? `${currencySymbol}${Number(cfg.monthlyPriceDollars).toFixed(2)}/month` : undefined,
            buttonText: cfg.buttonText || (t('choosePlanBtn') || 'Choose Plan'),
            buttonTheme: 'green',
            features: planFeatures,
            aiRecipeLimit: cfg.aiRecipeLimit,
            recipeLibraryLimit: cfg.recipeLibraryLimit,
            socialScrapeLimit: cfg.socialScrapeLimit,
            canViewMacros: Boolean(cfg.canViewMacros),
            allowedAiModels: cfg.allowedAiModels,
            tokenLimit,
            tokenReimburseFrequency,
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
        syncActivePlanTokens(uPlan, dynamicPlans);
      } catch (_) {}
    }
  }, [currencySymbol, syncActivePlanTokens, t]);

  // Authoritative PostgreSQL hydration synchronized with /admin/users
  const reloadActiveUser = useCallback(async () => {
    if (isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;
    try {
    initAuthStorage();
    let active = getCurrentUser() as ExtendedUser | null;

    if (!active && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)zecratary_session=([^;]+)/);
      if (match && match[1]) {
        try {
          const cookieData = JSON.parse(decodeURIComponent(match[1]));
          if (cookieData && (cookieData.email || cookieData.id)) {
            active = {
              id: cookieData.id || 'usr_standard_default',
              name: cookieData.name || 'Standard User',
              email: cookieData.email || 'user@foodieprep.com',
              role: cookieData.role || 'user',
              subscriptionPlan: 'taster'
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

    // 1. Fetch authoritative user record from PostgreSQL API (/api/admin/users)
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
            planSlug: authoritativePlan
          };
        }
      }
    } catch (_) {}

    if (!matchedUser.linkedProviders) {
      const initialLinked: SocialProvider[] = [];
      if (matchedUser.id.startsWith('usr_google_')) initialLinked.push('google');
      if (matchedUser.id.startsWith('usr_facebook_')) initialLinked.push('facebook');
      if (matchedUser.id.startsWith('usr_apple_')) initialLinked.push('apple');
      matchedUser.linkedProviders = initialLinked;
    }

    // 2. Fetch payment transactions for renewal/expiry date alignment without reverting user plan
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

    setUserState(prev => JSON.stringify(prev) === JSON.stringify(matchedUser) ? prev : matchedUser);
    setName(matchedUser.name || '');
    setEmail(matchedUser.email || '');

    try {
      localStorage.setItem('zecratary_current_user', JSON.stringify(matchedUser));
      localStorage.setItem('zecratary_user', JSON.stringify(matchedUser));
    } catch (_) {}

    const userPlan = sanitizeSinglePlan((matchedUser as any).subscriptionPlan || (matchedUser as any).planSlug || 'taster');
    syncActivePlanTokens(userPlan, plansRef.current);
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, [router, syncActivePlanTokens]);

    // Decoupled document title
  useEffect(() => {
    document.title = `${t('accountProfileTitle') || 'Account Profile'} - Zecratary`;
  }, [t]);

  // Mount-only data initialization with debounced event listener
  useEffect(() => {
    syncPlansFromAdmin();
    reloadActiveUser();

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleSyncEvent = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncPlansFromAdmin();
        reloadActiveUser();
      }, 300);
    };

    window.addEventListener('zecratary_plans_updated', handleSyncEvent);
    window.addEventListener('zecratary_payment_updated', handleSyncEvent);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_plans_updated', handleSyncEvent);
      window.removeEventListener('zecratary_payment_updated', handleSyncEvent);
    };
  }, []);

  const handleToggleSocialLink = async (provider: SocialProvider) => {
    if (!user) return;
    setProcessingSocial(provider);
    setError('');
    setSuccessMsg('');

    const isLinked = Boolean(user.linkedProviders?.includes(provider));
    let updatedLinked = [...(user.linkedProviders || [])];

    if (isLinked) {
      if (updatedLinked.length === 1 && !user.password) {
        setError(`Cannot unlink ${provider.toUpperCase()}: this is your only login method. Set a password first.`);
        setProcessingSocial(null);
        return;
      }
      updatedLinked = updatedLinked.filter(p => p !== provider);
      setSuccessMsg(`Unlinked ${provider.toUpperCase()} account successfully.`);
    } else {
      updatedLinked.push(provider);
      setSuccessMsg(`Successfully connected and linked ${provider.toUpperCase()}!`);
    }

    const updatedUser: ExtendedUser = {
      ...user,
      linkedProviders: updatedLinked
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
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const userPlanBadge = useMemo(() => {
    const rawKey = ((user as any)?.subscriptionPlan || (user as any)?.subscriptionTier || (user as any)?.planSlug || (user as any)?.planId || '').toLowerCase().trim();
    const planKey = sanitizeSinglePlan(rawKey);

    const matched = plans.find(p => checkIsCurrentPlan(p));
    if (matched) {
      const isAnnual = matched.interval === 'YEAR' || matched.slug.includes('annual');
      return {
        label: `${matched.name}${matched.isFree ? ' (Free)' : isAnnual ? ' (Annual)' : ' (Monthly)'}`,
        bg: matched.isFree 
          ? (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)') 
          : isAnnual 
          ? (isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)') 
          : (isDayMode ? '#fff7ed' : 'rgba(224, 86, 56, 0.15)'),
        border: matched.isFree 
          ? (isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)') 
          : isAnnual 
          ? (isDayMode ? '#bfdbfe' : '#3b82f6') 
          : (isDayMode ? '#fdba74' : 'var(--color-primary, #E05638)'),
        color: matched.isFree 
          ? (isDayMode ? '#047857' : 'var(--color-emerald, #10b981)') 
          : isAnnual 
          ? (isDayMode ? '#1d4ed8' : '#60a5fa') 
          : (isDayMode ? '#c2410c' : 'var(--color-primary, #E05638)'),
        icon: matched.isFree ? Sparkles : Zap,
        matchedPlan: matched
      };
    }

    if (!planKey || planKey === 'free' || planKey.includes('free') || planKey === 'taster') {
      return {
        label: t('freeTierNoExpiry') || 'Taster (Free)',
        bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
        border: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
        color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
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
      bg: isDayMode ? '#fff7ed' : 'rgba(224, 86, 56, 0.15)',
      border: isDayMode ? '#fdba74' : 'var(--color-primary, #E05638)',
      color: isDayMode ? '#c2410c' : 'var(--color-primary, #E05638)',
      icon: Zap,
      matchedPlan: null
    };
  }, [user, plans, checkIsCurrentPlan, isDayMode, t]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!user) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setError(t('nameAndEmailRequired') || 'Full Name and Email Address are required.');
      return;
    }

    if (password || confirmPassword) {
      if (password.length < 4) {
        setError(t('passwordLengthError') || 'New password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError(t('passwordMismatchError') || 'New password and confirmation password do not match.');
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
    setSuccessMsg(t('profileSavedSuccess') || 'Your profile changes have been saved successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm(t('confirmDeleteAccount') || 'Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.')) {
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
      alert('Failed to delete account: ' + (err?.message || 'Server error'));
    }
  };

  // CHANGE PLAN LOGIC: Fully synchronized with /admin/users & PostgreSQL
  const handleSelectPlan = async (plan: SubscriptionPlanItem) => {
    if (!user) return;
    setPaymentLoading(plan.id);
    setError('');
    setSuccessMsg('');

    try {
      const isFree = Boolean(plan.priceCents === 0 || plan.isFree);
      const targetSlug = sanitizeSinglePlan(plan.slug);
      const userEmail = user.email.toLowerCase().trim();

      if (checkIsCurrentPlan(plan)) {
        setError(t('alreadySubscribedToPlan') || `You are already subscribed to ${plan.name}.`);
        setPaymentLoading(null);
        return;
      }

      const newExpiryDate = isFree ? '' : calculateRenewalExpiry(new Date(), plan.interval);

      // 1. Cancel prior active transactions in PostgreSQL /api/admin/payment
      try {
        const txRes = await fetch('/api/admin/payment', { cache: 'no-store' });
        if (txRes.ok) {
          const txData = await txRes.json();
          const existingList: any[] = Array.isArray(txData.transactions) ? txData.transactions : [];
          const userActiveTxs = existingList.filter((tx: any) => {
            const em = (tx.customerEmail || tx.customer_email || '').toLowerCase().trim();
            const st = (tx.status || '').toLowerCase();
            return em === userEmail && (st === 'succeeded' || st === 'paid' || st === 'active');
          });

          for (const oldTx of userActiveTxs) {
            const cancelledTx = {
              ...oldTx,
              status: 'refunded',
              expiryDate: new Date().toISOString()
            };
            await fetch('/api/admin/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update_transaction', transaction: cancelledTx })
            }).catch(() => {});
          }
        }
      } catch (_) {}

      // 2. Record new transaction in PostgreSQL /api/admin/payment if paid plan
      if (!isFree) {
        const newTx: PaymentTransaction = {
          id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          customerName: user.name,
          customerEmail: userEmail,
          planName: `${plan.name} (${plan.interval === 'YEAR' ? 'Annual' : 'Monthly'})`,
          planSlug: targetSlug,
          amount: plan.priceCents / 100,
          currency: currencyCode || 'USD',
          gateway: 'stripe',
          status: 'succeeded',
          testMode: true,
          createdAt: new Date().toISOString(),
          expiryDate: newExpiryDate
        };

        await fetch('/api/admin/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_transaction', transaction: newTx })
        }).catch(() => {});
      }

      // 3. Update user account in PostgreSQL /api/admin/users
      const finalPlanSlug = isFree ? 'taster' : targetSlug;
      const updatedUserPayload: ExtendedUser = {
        ...user,
        subscriptionPlan: finalPlanSlug,
        subscriptionTier: finalPlanSlug,
        planSlug: finalPlanSlug,
        planId: plan.id,
        planName: `${plan.name}${isFree ? ' (Free)' : plan.interval === 'YEAR' ? ' (Annual)' : ' (Monthly)'}`,
        planInterval: plan.interval,
        subscriptionStatus: 'active',
        lastPaymentDate: isFree ? '' : new Date().toISOString(),
        planExpiryDate: newExpiryDate,
        expiryDate: newExpiryDate,
        updatedAt: new Date().toISOString()
      } as any;

      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserPayload)
      }).catch(() => {});

      // 4. Update local state & storage
      try {
        localStorage.setItem('zecratary_current_user', JSON.stringify(updatedUserPayload));
        localStorage.setItem('zecratary_user', JSON.stringify(updatedUserPayload));
      } catch (_) {}

      setCurrentUser(updatedUserPayload);
      setUserState(updatedUserPayload);
      syncActivePlanTokens(finalPlanSlug, plansRef.current);

      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_users_updated'));

      setSuccessMsg(
        isFree 
          ? (t('switchedToFreeNotice') || `Switched to ${plan.name} (Free)! Previous subscription was cancelled.`)
          : (t('planSubscribedNotice') || `Plan changed successfully to ${plan.name} (${plan.interval === 'YEAR' ? 'Annual' : 'Monthly'})!`)
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setPaymentLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const PlanHeaderIcon = userPlanBadge.icon;
  const filteredPlans = plans.filter(p => {
    if (selectedInterval === 'ALL') return true;
    return p.isFree || p.priceCents === 0 || p.interval === selectedInterval;
  });
  const activeExpiryDate = (user as any).planExpiryDate || (user as any).expiryDate;

  const isUnlimited = tokenUsage.monthlyLimit === -1;
  const tokenPercentage = isUnlimited ? 5 : Math.min(Math.round((tokenUsage.totalTokens / tokenUsage.monthlyLimit) * 100), 100);

  const getReimburseScheduleText = (freq: string) => {
    switch(freq) {
      case 'once': return 'Reimbursed: Once (Non-recurring)';
      case 'weekly': return 'Reimbursed: Every Week from purchase date';
      case 'monthly': return 'Reimbursed: Every Month from purchase date';
      default: return 'Reimbursed: Monthly';
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ 
        color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)',
        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .profile-input:-webkit-autofill,
        .profile-input:-webkit-autofill:hover,
        .profile-input:-webkit-autofill:focus,
        .profile-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'} inset !important;
          box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'} inset !important;
          -webkit-text-fill-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          caret-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
      `}} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
             {t('accountProfileTitle') || 'Account Profile'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('accountProfileSubtitle') || 'Manage your credentials, active AI token quotas, and subscription plan'}
          </p>
        </div>

        {user.role === 'admin' && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/social-login-setting"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <Key className="h-3.5 w-3.5 text-orange-400" /> Social Settings
            </Link>
            <Link
              href="/admin"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <Shield className="h-3.5 w-3.5 text-emerald-400" /> {t('adminAccess') || 'Admin Access'}
            </Link>
            <Link
              href="/admin/plans"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <Zap className="h-3.5 w-3.5 text-orange-400" /> {t('subscriptionPlans') || 'Subscription Plans'}
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-300 font-semibold flex items-center gap-2 shadow-lg">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{
            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
            borderColor: 'var(--color-emerald, #10b981)',
            color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* USER DETAILS & TOKEN USAGE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MAIN PROFILE CARD */}
        <div 
          className="lg:col-span-7 border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200 flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-black shadow-inner"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: 'var(--color-primary, #E05638)'
                }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{user.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    user.role === 'admin'
                      ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400')
                      : (isDayMode ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300')
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-xs font-mono" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{user.email}</p>
                {user.id && (
                  <p className="text-[11px] font-mono tracking-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    ID: {user.id}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right text-[11px] space-y-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <div className="flex sm:justify-end items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                <span>{t('joinedPrefix') || 'Joined: '} {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (t('activeStatus') || 'Active')}</span>
              </div>
              
              <div className="flex sm:justify-end items-center gap-1.5 pt-0.5">
                <span className="font-semibold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('activeMembershipLabel') || 'Membership:'}</span>
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
                  <span>{t('renewalExpiryPrefix') || 'Expiry: '} {new Date(activeExpiryDate).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="flex sm:justify-end items-center gap-1 text-[11px] italic pt-0.5" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                  <span>{t('freeTierNoExpiry') || 'Free Tier'}</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs" autoComplete="off">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('fullNameLabel') || 'Full Name *'}</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jordan Smith"
                    className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('emailAddressLabel') || 'Email Address *'}</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('newPasswordLabel') || 'New Password'} <span className="font-normal" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>{t('leaveBlankCurrentPass') || '(leave blank)'}</span>
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }} />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('confirmPasswordLabel') || 'Confirm Password'} <span className="font-normal" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>{t('repeatNewPass') || '(repeat)'}</span>
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }} />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  router.replace('/login');
                }}
                className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: isDayMode ? '#fef2f2' : 'rgba(127, 29, 29, 0.2)',
                  borderColor: isDayMode ? '#fca5a5' : 'rgba(153, 27, 27, 0.5)',
                  color: isDayMode ? '#b91c1c' : '#fca5a5'
                }}
              >
                <LogOut className="h-4 w-4 text-red-500" /> {t('signOutBtn') || 'Sign Out'}
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto px-4 py-2 border font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs text-red-400 hover:text-red-300 border-red-900/60 hover:bg-red-950/30"
              >
                Delete Account
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
              >
                <Check className="h-4 w-4" /> {t('saveProfileBtn') || 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* AI TOKEN USAGE & CONSUMPTION CARD */}
        <div 
          className="lg:col-span-5 border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200 flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Cpu className="h-5 w-5 text-orange-400" /> AI Token Usage & Quota
              </h2>
              <span 
                className="text-[10px] font-mono px-2.5 py-1 rounded-lg border font-bold shadow-xs"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#0B101D',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: '#f97316'
                }}
              >
                {activeModelName}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Token Allocation Limit</span>
                <span className="text-sm font-black font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {tokenUsage.totalTokens.toLocaleString()}{' '}
                  <span className="text-[11px]" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                    / {isUnlimited ? '∞ Unlimited' : tokenUsage.monthlyLimit.toLocaleString()}
                  </span>
                </span>
              </div>

              <div 
                className="border rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : '#0B101D',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b'
                }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: isUnlimited ? '100%' : `${tokenPercentage}%`,
                    backgroundColor: isUnlimited ? '#10b981' : tokenPercentage > 85 ? '#ef4444' : tokenPercentage > 60 ? '#f59e0b' : 'var(--color-primary, #E05638)'
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px]">
                <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{isUnlimited ? 'Unlimited Tokens Tier' : `${tokenPercentage}% of quota used`}</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-semibold">{tokenUsage.requestCount} AI Requests</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div 
                className="border rounded-2xl p-3.5 space-y-1 shadow-inner"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                }}
              >
                <span className="text-[10px] uppercase tracking-wider font-bold block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Prompt Input</span>
                <span className="text-base font-black font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{tokenUsage.promptTokens.toLocaleString()}</span>
                <span className="text-[10px] block" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>Tokens (User & Context)</span>
              </div>

              <div 
                className="border rounded-2xl p-3.5 space-y-1 shadow-inner"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                }}
              >
                <span className="text-[10px] uppercase tracking-wider font-bold block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Completion Output</span>
                <span className="text-base font-black text-emerald-500 dark:text-emerald-400 font-mono">{tokenUsage.completionTokens.toLocaleString()}</span>
                <span className="text-[10px] block" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>Tokens (Generated Reply)</span>
              </div>
            </div>
          </div>

          <div 
            className="p-4 rounded-2xl border text-[11px] space-y-2 shadow-inner"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#64748b' : '#94a3b8'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                <Repeat className="h-3.5 w-3.5 text-orange-400" /> Reimburse Schedule
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {tokenUsage.reimburseFrequency || 'monthly'}
              </span>
            </div>
            <p className="leading-relaxed">
              {getReimburseScheduleText(tokenUsage.reimburseFrequency)}. Quotas are automatically reimbursed based on your initial subscription purchase date.
            </p>
          </div>
        </div>

      </div>

      {/* CONNECTED SOCIAL ACCOUNTS */}
      <div 
        className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            <Link2 className="h-5 w-5 text-[var(--color-primary)]" />
            Connected Social Accounts
          </h2>
          <p className="text-xs mt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            Link external identities (Google, Facebook, Apple) to enable seamless one-click sign in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Google */}
          <div 
            className="border rounded-2xl p-4 flex items-center justify-between shadow-xs transition"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <div>
                <span className="block font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google</span>
                <span className={`text-[10px] font-semibold ${user.linkedProviders?.includes('google') ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {user.linkedProviders?.includes('google') ? 'Connected' : 'Not linked'}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={processingSocial !== null}
              onClick={() => handleToggleSocialLink('google')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                user.linkedProviders?.includes('google')
                  ? 'border border-red-900/40 text-red-400 hover:bg-red-950/20'
                  : 'text-white shadow-xs'
              }`}
              style={{
                backgroundColor: user.linkedProviders?.includes('google') ? 'transparent' : 'var(--color-primary, #E05638)'
              }}
            >
              {processingSocial === 'google' ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : user.linkedProviders?.includes('google') ? (
                <>
                  <Unlink className="h-3 w-3" /> Unlink
                </>
              ) : (
                <>
                  <Link2 className="h-3 w-3" /> Link
                </>
              )}
            </button>
          </div>

          {/* Facebook */}
          <div 
            className="border rounded-2xl p-4 flex items-center justify-between shadow-xs transition"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
              </svg>
              <div>
                <span className="block font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Facebook</span>
                <span className={`text-[10px] font-semibold ${user.linkedProviders?.includes('facebook') ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {user.linkedProviders?.includes('facebook') ? 'Connected' : 'Not linked'}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={processingSocial !== null}
              onClick={() => handleToggleSocialLink('facebook')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                user.linkedProviders?.includes('facebook')
                  ? 'border border-red-900/40 text-red-400 hover:bg-red-950/20'
                  : 'text-white shadow-xs'
              }`}
              style={{
                backgroundColor: user.linkedProviders?.includes('facebook') ? 'transparent' : 'var(--color-primary, #E05638)'
              }}
            >
              {processingSocial === 'facebook' ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : user.linkedProviders?.includes('facebook') ? (
                <>
                  <Unlink className="h-3 w-3" /> Unlink
                </>
              ) : (
                <>
                  <Link2 className="h-3 w-3" /> Link
                </>
              )}
            </button>
          </div>

          {/* Apple */}
          <div 
            className="border rounded-2xl p-4 flex items-center justify-between shadow-xs transition"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
              </svg>
              <div>
                <span className="block font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Apple</span>
                <span className={`text-[10px] font-semibold ${user.linkedProviders?.includes('apple') ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {user.linkedProviders?.includes('apple') ? 'Connected' : 'Not linked'}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={processingSocial !== null}
              onClick={() => handleToggleSocialLink('apple')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                user.linkedProviders?.includes('apple')
                  ? 'border border-red-900/40 text-red-400 hover:bg-red-950/20'
                  : 'text-white shadow-xs'
              }`}
              style={{
                backgroundColor: user.linkedProviders?.includes('apple') ? 'transparent' : 'var(--color-primary, #E05638)'
              }}
            >
              {processingSocial === 'apple' ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : user.linkedProviders?.includes('apple') ? (
                <>
                  <Unlink className="h-3 w-3" /> Unlink
                </>
              ) : (
                <>
                  <Link2 className="h-3 w-3" /> Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* UPGRADE OR CHANGE MEMBERSHIP PLAN */}
      <div 
        className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <CreditCard className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} />
              {t('upgradeChangePlanTitle') || 'Upgrade or Change Membership Plan'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              {t('onePlanPerEmailSub') || 'Strictly 1 plan per email. Changing plans automatically cancels your prior plan and recalculates your expiry date.'}
            </p>
          </div>

          <div 
            className="flex items-center p-1 rounded-xl border text-xs font-bold self-start sm:self-auto shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedInterval('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedInterval === 'ALL'
                  ? 'text-white shadow'
                  : ''
              }`}
              style={selectedInterval === 'ALL' ? {
                backgroundColor: 'var(--color-primary, #E05638)'
              } : {
                color: isDayMode ? '#64748b' : '#94a3b8'
              }}
            >
              All Plans ({plans.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedInterval('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedInterval === 'MONTH'
                  ? 'text-white shadow'
                  : ''
              }`}
              style={selectedInterval === 'MONTH' ? {
                backgroundColor: 'var(--color-primary, #E05638)'
              } : {
                color: isDayMode ? '#64748b' : '#94a3b8'
              }}
            >
              {t('monthlyBtn') || 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedInterval('YEAR')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedInterval === 'YEAR'
                  ? 'text-white shadow'
                  : ''
              }`}
              style={selectedInterval === 'YEAR' ? {
                backgroundColor: 'var(--color-primary, #E05638)'
              } : {
                color: isDayMode ? '#64748b' : '#94a3b8'
              }}
            >
              {t('annualSaveLabel') || 'Annual (Save up to 44%)'}
            </button>
          </div>
        </div>

        {/* ACTIVE MEMBERSHIP PLAN CARD BANNER */}
        <div 
          className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition"
          style={{
            backgroundColor: isDayMode ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)',
            borderColor: 'var(--color-emerald, #10b981)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--color-emerald, #10b981)'
              }}
            >
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Your Current Selected Plan
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <h4 className="text-base font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                {userPlanBadge.label}
              </h4>
            </div>
          </div>

          <div className="text-xs sm:text-right" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            <span className="block font-medium">
              {activeExpiryDate 
                ? `Renewal / Expiry: ${new Date(activeExpiryDate).toLocaleDateString()}` 
                : 'Free Tier (No Expiration)'}
            </span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {tokenUsage.monthlyLimit === -1 ? 'Unlimited AI Tokens' : `${tokenUsage.monthlyLimit.toLocaleString()} Monthly Tokens`}
            </span>
          </div>
        </div>

        {/* ALL AVAILABLE PLANS GRID */}
        {filteredPlans.length === 0 ? (
          <div 
            className="p-8 text-center rounded-2xl border text-xs"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#64748b' : '#94a3b8'
            }}
          >
            No plans configured in admin yet. Go to <Link href="/admin/plans" className="font-bold underline text-[var(--color-primary)]">Admin Plans</Link> to create plans.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredPlans.map((plan) => {
              const isCurrent = checkIsCurrentPlan(plan);
              const isFree = plan.priceCents === 0 || plan.isFree;

              return (
                <div 
                  key={plan.id || plan.slug}
                  className={`rounded-3xl p-6 border-2 relative flex flex-col justify-between shadow-xl transition-all duration-200 ${
                    isCurrent 
                      ? 'ring-4 ring-emerald-500/25 scale-[1.02]' 
                      : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isCurrent 
                      ? 'var(--color-emerald, #10b981)' 
                      : (plan.badge ? 'var(--color-primary, #E05638)' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'))
                  }}
                >
                  {(isCurrent || plan.saveBadge || plan.badge) && (
                    <div 
                      className="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-md flex items-center gap-1 z-10"
                      style={{
                        backgroundColor: isCurrent 
                          ? 'var(--color-emerald, #10b981)' 
                          : (plan.saveBadge ? 'var(--color-emerald, #10b981)' : 'var(--color-primary, #E05638)')
                      }}
                    >
                      {isCurrent ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> {t('currentPlanBadge') || 'Current Active Plan'}
                        </>
                      ) : (
                        plan.saveBadge || plan.badge
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                            {plan.name}
                          </h3>
                          <span 
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: isDayMode ? '#f1f5f9' : '#0B101D',
                              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                              color: isDayMode ? '#475569' : '#94a3b8'
                            }}
                          >
                            {plan.isFree ? 'Free' : plan.interval === 'YEAR' ? 'Annual' : 'Monthly'}
                          </span>
                        </div>

                        {isCurrent ? (
                          <span 
                            className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1"
                            style={{
                              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: 'var(--color-emerald, #10b981)',
                              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {t('activeStatus') || 'Active'}
                          </span>
                        ) : (
                          <span 
                            className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: isDayMode ? '#f8fafc' : 'rgba(148, 163, 184, 0.1)',
                              borderColor: isDayMode ? '#e2e8f0' : '#1e293b',
                              color: isDayMode ? '#64748b' : '#94a3b8'
                            }}
                          >
                            Available
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium mt-1 min-h-[32px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-orange-400 bg-orange-950/40 border border-orange-500/30 px-3 py-1.5 rounded-xl w-fit shadow-xs">
                      <Cpu className="h-3.5 w-3.5" />
                      <span>{plan.tokenLimit === -1 ? 'Unlimited Tokens' : `${(plan.tokenLimit || 0).toLocaleString()} Tokens`}</span>
                      <span className="text-[10px] font-sans font-normal" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                        ({plan.tokenReimburseFrequency === 'once' ? 'Once' : plan.tokenReimburseFrequency === 'weekly' ? 'Weekly' : 'Monthly'})
                      </span>
                    </div>

                    <div>
                      {isFree ? (
                        <div className="text-3xl font-black" style={{ color: 'var(--color-primary, #E05638)' }}>
                          {t('free') || 'Free'}
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black" style={{ color: 'var(--color-primary, #E05638)' }}>
                            {currencySymbol}{(plan.priceCents / 100).toFixed(2)}
                          </span>
                          <span className="text-xs font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                            /{plan.interval === 'YEAR' ? (t('perYear') || 'year') : (t('perMonth') || 'month')}
                          </span>
                        </div>
                      )}

                      {!isFree && plan.interval === 'YEAR' && plan.subPrice && (
                        <div className="text-[11px] font-medium mt-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                          <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>{plan.subPrice}</span>{' '}
                          {plan.strikethroughPrice && (
                            <span className="line-through" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>{plan.strikethroughPrice}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t space-y-2 text-xs font-semibold" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)', color: isDayMode ? '#334155' : '#cbd5e1' }}>
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />
                            <span className="leading-snug">{f}</span>
                          </div>
                        ))
                      ) : (
                        <div className="italic text-[11px]" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>{t('includesFullTierFeatureAccess') || 'Includes full tier feature access.'}</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                    <button
                      type="button"
                      disabled={isCurrent || paymentLoading === plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full py-3 rounded-2xl text-xs font-black text-white transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: isCurrent 
                          ? 'var(--color-emerald, #10b981)' 
                          : 'var(--color-primary, #E05638)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)';
                      }}
                    >
                      {paymentLoading === plan.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> {t('processing') || 'Processing...'}
                        </>
                      ) : isCurrent ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> {t('currentActivePlan') || 'Current Active Plan'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" /> {isFree ? (t('switchToFreeBtn') || 'Switch to Free') : `${t('changeToPlanPrefix') || 'Change to '}${plan.name}`}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
