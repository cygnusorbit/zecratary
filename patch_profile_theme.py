import os

target_paths = [
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx'
]

profile_path = next((p for p in target_paths if os.path.exists(p)), None)

if not profile_path:
    print("Error: Could not locate profile/page.tsx")
    exit(1)

fixed_content = """// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle, 
  AlertCircle, Calendar, LogOut, Check, CreditCard,
  Zap, Sparkles, CheckCircle2, RefreshCw, Shield,
  Clock, Activity, Cpu, Repeat
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

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

const DEFAULT_TASTER_FEATURES = [
  'Create up to 5 AI-powered recipes per month',
  'Personal recipe library (25 total recipes)',
  'Smart ingredient repurposing',
  'Automated shopping list creation',
  'Direct online grocery shopping links',
  'Meal planner',
  'Ingredient photo recognition'
];

const DEFAULT_PRO_FEATURES = [
  'Unlimited AI-powered recipe generation',
  'Unlimited recipe library',
  'Comprehensive nutritional analysis (calories, protein, fat, fiber, sugar, sodium, carbohydrates)'
];

const DEFAULT_PLANS: SubscriptionPlanItem[] = [
  {
    id: 'taster',
    name: 'Taster',
    slug: 'taster',
    description: 'Free tier with standard features',
    priceCents: 0,
    priceFormatted: 'Free',
    interval: 'MONTH',
    isFree: true,
    badge: '',
    saveBadge: '',
    buttonText: 'Active Plan',
    buttonTheme: 'orange',
    features: DEFAULT_TASTER_FEATURES,
    tokenLimit: 50000,
    tokenReimburseFrequency: 'monthly'
  },
  {
    id: 'nutrition-pro-monthly',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro-monthly',
    description: 'Full premium access, billed monthly',
    priceCents: 899,
    priceFormatted: '$8.99/mo',
    interval: 'MONTH',
    isFree: false,
    badge: 'Billed Immediately',
    saveBadge: '',
    buttonText: 'Choose Plan',
    buttonTheme: 'green',
    features: DEFAULT_PRO_FEATURES,
    tokenLimit: 1000000,
    tokenReimburseFrequency: 'monthly'
  },
  {
    id: 'nutrition-pro-annual',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro-annual',
    description: 'Best value - all premium features, billed annually',
    priceCents: 5999,
    priceFormatted: '$59.99/yr',
    interval: 'YEAR',
    isFree: false,
    badge: '7-Day Free Trial',
    saveBadge: 'Save 44%',
    subPrice: '$5.00/month',
    strikethroughPrice: '$8.99/month',
    buttonText: 'Choose Plan',
    buttonTheme: 'green',
    features: DEFAULT_PRO_FEATURES,
    tokenLimit: 1000000,
    tokenReimburseFrequency: 'monthly'
  }
];

const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  if (Array.isArray(planInput)) return planInput[0] ? String(planInput[0]).trim() : 'taster';
  if (typeof planInput === 'string') {
    if (planInput.includes(',')) {
      const parts = planInput.split(',').map(s => s.trim()).filter(Boolean);
      return parts[0] || 'taster';
    }
    return planInput.trim() || 'taster';
  }
  return 'taster';
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
  const [user, setUserState] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [plans, setPlans] = useState<SubscriptionPlanItem[]>(DEFAULT_PLANS);
  const plansRef = useRef<SubscriptionPlanItem[]>(DEFAULT_PLANS);
  plansRef.current = plans;

  const [selectedInterval, setSelectedInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
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

  // Dynamic Theme & Day/Night Mode Synchronization
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
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
    window.addEventListener('storage', applySavedTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('zecratary_payment_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
    };
  }, [applySavedTheme]);

  const syncPlansFromAdmin = useCallback(() => {
    const plansMap = new Map<string, SubscriptionPlanItem>();

    try {
      const rawConfigs = localStorage.getItem('zecratary_subscription_configs');
      if (rawConfigs) {
        const configs = JSON.parse(rawConfigs);
        if (Array.isArray(configs) && configs.length > 0) {
          configs.forEach((cfg: any) => {
            const rawSlug = (cfg.slug || cfg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
            if (rawSlug === 'pro-unlimited') return;

            const cleanBaseSlug = rawSlug.replace(/-(monthly|annual|free)$/i, '');
            const isFree = cfg.isFree || (Number(cfg.monthlyPriceDollars || 0) === 0 && Number(cfg.annualPriceDollars || 0) === 0);
            
            let planFeatures = Array.isArray(cfg.features) && cfg.features.length > 0 ? cfg.features : null;
            if (!planFeatures || planFeatures.length < (isFree ? 7 : 3)) {
              planFeatures = isFree ? DEFAULT_TASTER_FEATURES : DEFAULT_PRO_FEATURES;
            }

            const tokenLimit = cfg.tokenLimit !== undefined ? Number(cfg.tokenLimit) : (isFree ? 50000 : 1000000);
            const tokenReimburseFrequency = cfg.tokenReimburseFrequency || 'monthly';

            if (isFree) {
              const freeSlug = cleanBaseSlug.includes('taster') ? 'taster' : cleanBaseSlug;
              plansMap.set(freeSlug, {
                id: cfg.id || freeSlug,
                name: cfg.name,
                slug: freeSlug,
                description: cfg.description || 'Free tier with standard features',
                priceCents: 0,
                priceFormatted: 'Free',
                interval: 'MONTH',
                isFree: true,
                badge: cfg.badge || '',
                saveBadge: '',
                buttonText: cfg.buttonText || (t('switchToFreeBtn') || 'Switch to Free'),
                buttonTheme: 'orange',
                features: planFeatures,
                aiRecipeLimit: cfg.aiRecipeLimit,
                recipeLibraryLimit: cfg.recipeLibraryLimit,
                socialScrapeLimit: cfg.socialScrapeLimit,
                canViewMacros: cfg.canViewMacros,
                tokenLimit,
                tokenReimburseFrequency,
              });
            } else {
              if (cfg.monthlyPriceDollars !== undefined && cfg.monthlyPriceDollars !== null && Number(cfg.monthlyPriceDollars) > 0) {
                const monthlySlug = `${cleanBaseSlug}-monthly`;
                const mPrice = Number(cfg.monthlyPriceDollars);
                plansMap.set(monthlySlug, {
                  id: `${cfg.id || cleanBaseSlug}-monthly`,
                  name: cfg.name,
                  slug: monthlySlug,
                  description: cfg.description || `Full access to ${cfg.name}, billed monthly`,
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
                  canViewMacros: cfg.canViewMacros,
                  tokenLimit,
                  tokenReimburseFrequency,
                });
              }

              if (cfg.annualPriceDollars !== undefined && cfg.annualPriceDollars !== null && Number(cfg.annualPriceDollars) > 0) {
                const annualSlug = `${cleanBaseSlug}-annual`;
                const aPrice = Number(cfg.annualPriceDollars);
                const mEquivalent = (aPrice / 12).toFixed(2);
                plansMap.set(annualSlug, {
                  id: `${cfg.id || cleanBaseSlug}-annual`,
                  name: cfg.name,
                  slug: annualSlug,
                  description: cfg.description || `Best value - all ${cfg.name} features, billed annually`,
                  priceCents: Math.round(aPrice * 100),
                  priceFormatted: `${currencySymbol}${aPrice.toFixed(2)}/yr`,
                  interval: 'YEAR',
                  isFree: false,
                  badge: cfg.annualBadge || 'Best Value',
                  saveBadge: cfg.saveBadge || 'Save 44%',
                  subPrice: `${currencySymbol}${mEquivalent}/month`,
                  strikethroughPrice: cfg.monthlyPriceDollars ? `${currencySymbol}${Number(cfg.monthlyPriceDollars).toFixed(2)}/month` : undefined,
                  buttonText: cfg.buttonText || (t('choosePlanBtn') || 'Choose Plan'),
                  buttonTheme: 'green',
                  features: planFeatures,
                  aiRecipeLimit: cfg.aiRecipeLimit,
                  recipeLibraryLimit: cfg.recipeLibraryLimit,
                  socialScrapeLimit: cfg.socialScrapeLimit,
                  canViewMacros: cfg.canViewMacros,
                  tokenLimit,
                  tokenReimburseFrequency,
                });
              }
            }
          });
        }
      }
    } catch (e) {}

    if (plansMap.size === 0) {
      DEFAULT_PLANS.forEach(p => plansMap.set(p.slug, p));
    }

    const mergedPlans = Array.from(plansMap.values());
    plansRef.current = mergedPlans;
    setPlans(mergedPlans);
  }, [currencySymbol, t]);

  const syncActivePlanTokens = useCallback((activeUserPlanSlug: string, currentPlans: SubscriptionPlanItem[]) => {
    const cleanSlug = sanitizeSinglePlan(activeUserPlanSlug).toLowerCase();
    const matchedPlan = currentPlans.find(p => p.slug.toLowerCase() === cleanSlug || p.id.toLowerCase() === cleanSlug);

    let assignedLimit = 50000;
    let assignedFrequency: 'once' | 'weekly' | 'monthly' = 'monthly';

    if (matchedPlan) {
      if (matchedPlan.tokenLimit !== undefined) {
        assignedLimit = matchedPlan.tokenLimit;
      }
      if (matchedPlan.tokenReimburseFrequency) {
        assignedFrequency = matchedPlan.tokenReimburseFrequency;
      }
    } else if (cleanSlug.includes('pro') || cleanSlug.includes('annual')) {
      assignedLimit = 1000000;
    }

    try {
      const storedTokens = localStorage.getItem('zecratary_token_usage');
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
      localStorage.setItem('zecratary_token_usage', JSON.stringify(updated));
    } catch (_) {}
  }, []);

  const reloadActiveUser = useCallback(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }

    const rawUsers = localStorage.getItem('zecratary_users');
    let matchedUser = { ...active };

    if (rawUsers) {
      try {
        const usersList = JSON.parse(rawUsers);
        const fresh = usersList.find((u: any) => u.id === active.id || u.email.toLowerCase() === active.email.toLowerCase());
        if (fresh) {
          matchedUser = { 
            ...active, 
            ...fresh,
            subscriptionPlan: sanitizeSinglePlan(fresh.subscriptionPlan || (fresh.role === 'admin' ? 'nutrition-pro-annual' : 'taster'))
          };
          try {
            localStorage.setItem('zecratary_current_user', JSON.stringify(matchedUser));
            localStorage.setItem('zecratary_user', JSON.stringify(matchedUser));
          } catch (_) {}
        }
      } catch (e) {}
    }

    try {
      const localTxs = localStorage.getItem('zecratary_payment_transactions');
      if (localTxs) {
        const txList: PaymentTransaction[] = JSON.parse(localTxs);
        const now = new Date();
        const userEmail = matchedUser.email.toLowerCase();

        const userTxs = txList.filter((t) => t.customerEmail?.toLowerCase() === userEmail);
        userTxs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        const latestActiveTx = userTxs.find((t) => 
          (t.status === 'succeeded' || (t.status as any) === 'paid') &&
          (!t.expiryDate || new Date(t.expiryDate).getTime() > now.getTime())
        );

        if (latestActiveTx) {
          matchedUser.subscriptionPlan = sanitizeSinglePlan(latestActiveTx.planSlug || matchedUser.subscriptionPlan);
          (matchedUser as any).expiryDate = latestActiveTx.expiryDate;
          (matchedUser as any).planExpiryDate = latestActiveTx.expiryDate;
        } else if (userTxs.length > 0 && userTxs[0].status === 'refunded') {
          matchedUser.subscriptionPlan = 'taster';
          (matchedUser as any).expiryDate = '';
          (matchedUser as any).planExpiryDate = '';
        }
      }
    } catch (_) {}

    setUserState(matchedUser);
    setName(matchedUser.name || '');
    setEmail(matchedUser.email || '');

    const userPlan = sanitizeSinglePlan((matchedUser as any).subscriptionPlan || (matchedUser as any).subscriptionTier || '').toLowerCase();
    const userInterval = ((matchedUser as any).planInterval || '').toUpperCase();
    if (userInterval === 'YEAR' || userPlan.includes('annual') || userPlan.includes('year')) {
      setSelectedInterval('YEAR');
    } else if (userInterval === 'MONTH' || userPlan.includes('monthly')) {
      setSelectedInterval('MONTH');
    }

    syncActivePlanTokens(userPlan, plansRef.current.length > 0 ? plansRef.current : DEFAULT_PLANS);
  }, [router, syncActivePlanTokens]);

  useEffect(() => {
    document.title = `${t('accountProfileTitle') || 'Account Profile'} - Zecratary`;
    syncPlansFromAdmin();
    reloadActiveUser();

    const handleSyncEvent = () => {
      syncPlansFromAdmin();
      reloadActiveUser();
    };

    window.addEventListener('zecratary_plans_updated', handleSyncEvent);
    window.addEventListener('zecratary_users_updated', handleSyncEvent);
    window.addEventListener('zecratary_payment_updated', handleSyncEvent);
    window.addEventListener('storage', handleSyncEvent);

    return () => {
      window.removeEventListener('zecratary_plans_updated', handleSyncEvent);
      window.removeEventListener('zecratary_users_updated', handleSyncEvent);
      window.removeEventListener('zecratary_payment_updated', handleSyncEvent);
      window.removeEventListener('storage', handleSyncEvent);
    };
  }, [reloadActiveUser, syncPlansFromAdmin, t]);

  const userPlanBadge = useMemo(() => {
    const rawKey = ((user as any)?.subscriptionPlan || (user as any)?.subscriptionTier || '').toLowerCase().trim();
    const planKey = sanitizeSinglePlan(rawKey);

    if (!planKey || planKey === 'taster' || planKey.includes('free')) {
      return {
        label: t('freeTierNoExpiry') || 'Taster (Free)',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'var(--color-emerald, #10b981)',
        color: 'var(--color-emerald, #10b981)',
        icon: Sparkles
      };
    }

    const matched = plans.find(p => p.slug.toLowerCase() === planKey || p.id.toLowerCase() === planKey);

    if (matched) {
      if (matched.isFree) {
        return {
          label: `${matched.name} (Free)`,
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'var(--color-emerald, #10b981)',
          color: 'var(--color-emerald, #10b981)',
          icon: Sparkles
        };
      }
      if (matched.interval === 'YEAR' || planKey.includes('annual')) {
        return {
          label: `${matched.name} (Annual)`,
          bg: 'rgba(59, 130, 246, 0.15)',
          border: '#3b82f6',
          color: '#60a5fa',
          icon: Zap
        };
      }
      return {
        label: `${matched.name} (Monthly)`,
        bg: 'rgba(224, 86, 56, 0.15)',
        border: 'var(--color-primary, #E05638)',
        color: 'var(--color-primary, #E05638)',
        icon: Zap
      };
    }

    const formatted = planKey
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      label: formatted,
      bg: 'rgba(224, 86, 56, 0.15)',
      border: 'var(--color-primary, #E05638)',
      color: 'var(--color-primary, #E05638)',
      icon: Zap
    };
  }, [user, plans, t]);

  const checkIsCurrentPlan = (plan: SubscriptionPlanItem): boolean => {
    if (!user) return false;

    const rawUser = user as any;
    const userPlan = sanitizeSinglePlan(rawUser.subscriptionPlan || rawUser.subscriptionTier || '').toLowerCase().trim();
    const targetSlug = sanitizeSinglePlan(plan.slug || '').toLowerCase().trim();
    const isPlanFree = Boolean(plan.isFree || plan.priceCents === 0);

    const isUserFree = !userPlan || userPlan === 'taster' || userPlan === 'free' || userPlan.includes('free');
    if (isUserFree) {
      return isPlanFree || targetSlug === 'taster';
    }

    if (isPlanFree) return false;
    return userPlan === targetSlug;
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!user) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setError('Full Name and Email Address are required.');
      return;
    }

    if (password || confirmPassword) {
      if (password.length < 4) {
        setError('New password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('New password and confirmation password do not match.');
        return;
      }
    }

    const rawUsers = localStorage.getItem('zecratary_users');
    const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

    const emailTaken = users.some(u => u.id !== user.id && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setError('Another account with this email address already exists.');
      return;
    }

    const updatedUser: User = {
      ...user,
      name: cleanName,
      email: cleanEmail,
      password: password ? password : user.password,
    };

    const updatedList = users.map(u => u.id === user.id ? updatedUser : u);
    localStorage.setItem('zecratary_users', JSON.stringify(updatedList));

    setCurrentUser(updatedUser);
    setUserState(updatedUser);
    setPassword('');
    setConfirmPassword('');

    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));

    setSuccessMsg(t('profileSavedSuccess') || 'Your profile changes have been saved successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSelectPlan = async (plan: SubscriptionPlanItem) => {
    if (!user) return;
    setPaymentLoading(plan.id);
    setError('');
    setSuccessMsg('');

    try {
      const isFree = plan.priceCents === 0 || plan.isFree;
      const targetSlug = sanitizeSinglePlan(plan.slug);
      const currentPlanSlug = sanitizeSinglePlan((user as any).subscriptionPlan || (user as any).subscriptionTier);
      const userEmail = user.email.toLowerCase();

      if (currentPlanSlug === targetSlug) {
        setError(`You are already subscribed to ${plan.name}.`);
        setPaymentLoading(null);
        return;
      }

      const newExpiryDate = isFree ? '' : calculateRenewalExpiry(new Date(), plan.interval);

      try {
        const localTxsRaw = localStorage.getItem('zecratary_payment_transactions');
        const txs: PaymentTransaction[] = localTxsRaw ? JSON.parse(localTxsRaw) : [];

        const updatedTxs = txs.map((t) => {
          if (
            t.customerEmail?.toLowerCase() === userEmail &&
            (t.status === 'succeeded' || (t.status as any) === 'paid' || t.status === 'pending')
          ) {
            return {
              ...t,
              status: 'refunded' as const,
              expiryDate: new Date().toISOString()
            };
          }
          return t;
        });

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
            expiryDate: newExpiryDate,
          };
          updatedTxs.unshift(newTx);
        }

        localStorage.setItem('zecratary_payment_transactions', JSON.stringify(updatedTxs));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      } catch (_) {}

      const updatedUser: any = {
        ...user,
        subscriptionPlan: targetSlug,
        subscriptionTier: targetSlug,
        planName: `${plan.name}${isFree ? ' (Free)' : plan.interval === 'YEAR' ? ' (Annual)' : ' (Monthly)'}`,
        planInterval: plan.interval,
        subscriptionStatus: 'active',
        lastPaymentDate: isFree ? '' : new Date().toISOString(),
        planExpiryDate: newExpiryDate,
        expiryDate: newExpiryDate,
        updatedAt: new Date().toISOString()
      };

      const rawUsers = localStorage.getItem('zecratary_users');
      const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];
      const updatedList = users.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem('zecratary_users', JSON.stringify(updatedList));

      setCurrentUser(updatedUser);
      setUserState(updatedUser);

      syncActivePlanTokens(targetSlug, plans);

      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));

      setSuccessMsg(isFree 
        ? `Switched to free ${plan.name}!` 
        : `Plan changed successfully to ${plan.name} (${plan.interval === 'YEAR' ? 'Annual' : 'Monthly'})!`
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
  const filteredPlans = plans.filter(p => p.isFree || p.priceCents === 0 || p.interval === selectedInterval);
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
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .profile-input:-webkit-autofill,
        .profile-input:-webkit-autofill:hover,
        .profile-input:-webkit-autofill:focus,
        .profile-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)'} inset !important;
          box-shadow: 0 0 0 1000px ${isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)'} inset !important;
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
              href="/admin"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
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
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
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
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-black shadow-inner"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #111726)',
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
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
                onClick={logoutUser}
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
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
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
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
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

              {/* Progress bar */}
              <div 
                className="border rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : '#070b13',
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
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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

      {/* UPGRADE OR CHANGE MEMBERSHIP PLAN */}
      <div 
        className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
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
              {t('onePlanPerEmailSub') || 'Strictly 1 plan per email. Changing from Monthly to Annual or Annual to Monthly automatically cancels your prior plan and recalculates your expiry date.'}
            </p>
          </div>

          <div 
            className="flex items-center p-1 rounded-xl border text-xs font-bold self-start sm:self-auto shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
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
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
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
                        <CheckCircle2 className="h-3 w-3" /> {t('currentPlanBadge') || 'Current Plan'}
                      </>
                    ) : (
                      plan.saveBadge || plan.badge
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <span 
                          className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'var(--color-emerald, #10b981)',
                            color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                          }}
                        >
                          {t('activeStatus') || 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium mt-0.5 min-h-[32px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Token availability pill for this plan */}
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
      </div>

    </div>
  );
}
"""

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print(f"Successfully fixed Day/Night mode support in {profile_path}")
