'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle, 
  AlertCircle, Calendar, LogOut, Check, CreditCard,
  Zap, Sparkles, CheckCircle2, RefreshCw, Shield,
  ArrowUpRight, Clock, Ban, AlertTriangle
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
  'Comprehensive nutritional analysis (calories, protein, fat, fiber, sugar, sodium, cholesterol, carbohydrates)'
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
    features: DEFAULT_TASTER_FEATURES
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
    features: DEFAULT_PRO_FEATURES
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
    features: DEFAULT_PRO_FEATURES
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
  const [selectedInterval, setSelectedInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Dynamic Theme Synchronization & Day Mode Inversion
  const applyGlobalTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      const c = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-card', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', c.innerDark || c.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', c.borderColor || c.cardBorder || '#1e293b');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', c.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', c.textSecondary || '#94a3b8');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }

      const curr = localStorage.getItem('zecratary_currency') || 'USD';
      setCurrencyCode(curr);
      const symbols: Record<string, string> = {
        USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
        JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
      };
      setCurrencySymbol(symbols[curr] || '$');
    } catch (e) {}
  }, []);

  useEffect(() => {
    applyGlobalTheme();
    window.addEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_updated', applyGlobalTheme);
    window.addEventListener('zecratary_payment_updated', applyGlobalTheme);
    window.addEventListener('storage', applyGlobalTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_updated', applyGlobalTheme);
      window.removeEventListener('zecratary_payment_updated', applyGlobalTheme);
      window.removeEventListener('storage', applyGlobalTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applyGlobalTheme]);

  // Fully dynamic synchronization supporting all 8+ plans without key collisions
  const syncPlansFromAdmin = useCallback(async () => {
    const plansMap = new Map<string, SubscriptionPlanItem>();

    try {
      const rawConfigs = localStorage.getItem('zecratary_subscription_configs');
      if (rawConfigs) {
        const configs = JSON.parse(rawConfigs);
        if (Array.isArray(configs) && configs.length > 0) {
          configs.forEach((cfg: any, idx: number) => {
            if (!cfg) return;
            const name = cfg.name || cfg.title || `Plan ${idx + 1}`;
            const rawSlug = (cfg.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
            const description = cfg.description || cfg.descriptionMonthly || cfg.descriptionAnnual || 'Subscription plan';
            const isFree = Boolean(cfg.isFree || (Number(cfg.monthlyPriceDollars || 0) === 0 && Number(cfg.annualPriceDollars || 0) === 0 && !cfg.monthlyPriceDollars && !cfg.annualPriceDollars));
            
            let planFeatures = Array.isArray(cfg.features) && cfg.features.length > 0 ? cfg.features : null;
            if (typeof cfg.featuresText === 'string' && cfg.featuresText.trim().length > 0) {
              planFeatures = cfg.featuresText.split('\n').map((s: string) => s.trim()).filter(Boolean);
            }
            if (!planFeatures || planFeatures.length === 0) {
              planFeatures = isFree ? DEFAULT_TASTER_FEATURES : DEFAULT_PRO_FEATURES;
            }

            const cleanBaseSlug = rawSlug.replace(/-(monthly|annual|free)$/i, '');

            if (isFree) {
              const freeSlug = cleanBaseSlug.includes('taster') ? 'taster' : cleanBaseSlug;
              plansMap.set(freeSlug, {
                id: cfg.id || freeSlug,
                name,
                slug: freeSlug,
                description,
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
              });
            } else {
              const mPrice = Number(cfg.monthlyPriceDollars ?? cfg.monthlyPrice ?? 0);
              const aPrice = Number(cfg.annualPriceDollars ?? cfg.annualPrice ?? 0);

              if (mPrice > 0 || (mPrice === 0 && aPrice === 0)) {
                const monthlySlug = `${cleanBaseSlug}-monthly-${idx}`;
                plansMap.set(monthlySlug, {
                  id: `${cfg.id || cleanBaseSlug}-monthly`,
                  name,
                  slug: `${cleanBaseSlug}-monthly`,
                  description: cfg.descriptionMonthly || description,
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
                });
              }

              if (aPrice > 0) {
                const annualSlug = `${cleanBaseSlug}-annual-${idx}`;
                const mEquivalent = (aPrice / 12).toFixed(2);
                plansMap.set(annualSlug, {
                  id: `${cfg.id || cleanBaseSlug}-annual`,
                  name,
                  slug: `${cleanBaseSlug}-annual`,
                  description: cfg.descriptionAnnual || description,
                  priceCents: Math.round(aPrice * 100),
                  priceFormatted: `${currencySymbol}${aPrice.toFixed(2)}/yr`,
                  interval: 'YEAR',
                  isFree: false,
                  badge: cfg.annualBadge || 'Best Value',
                  saveBadge: cfg.saveBadge || 'Save 44%',
                  subPrice: `${currencySymbol}${mEquivalent}/month`,
                  strikethroughPrice: mPrice > 0 ? `${currencySymbol}${mPrice.toFixed(2)}/month` : undefined,
                  buttonText: cfg.buttonText || (t('choosePlanBtn') || 'Choose Plan'),
                  buttonTheme: 'green',
                  features: planFeatures,
                  aiRecipeLimit: cfg.aiRecipeLimit,
                  recipeLibraryLimit: cfg.recipeLibraryLimit,
                  socialScrapeLimit: cfg.socialScrapeLimit,
                  canViewMacros: cfg.canViewMacros,
                });
              }
            }
          });
        }
      }
    } catch (e) {}

    if (plansMap.size === 0) {
      try {
        const rawPlans = localStorage.getItem('zecratary_subscription_plans');
        if (rawPlans) {
          const directPlans = JSON.parse(rawPlans);
          if (Array.isArray(directPlans) && directPlans.length > 0) {
            directPlans.forEach((p: any) => {
              const isFree = p.priceCents === 0 || p.isFree;
              plansMap.set(p.slug, {
                ...p,
                features: (Array.isArray(p.features) && p.features.length > 0) ? p.features : (isFree ? DEFAULT_TASTER_FEATURES : DEFAULT_PRO_FEATURES),
                priceFormatted: isFree ? 'Free' : `${currencySymbol}${(p.priceCents / 100).toFixed(2)} / ${(p.interval || 'MONTH').toLowerCase()}`
              });
            });
          }
        }
      } catch (e) {}
    }

    if (plansMap.size === 0) {
      DEFAULT_PLANS.forEach(p => {
        plansMap.set(p.slug, p);
      });
    }

    const mergedPlans = Array.from(plansMap.values());
    setPlans(mergedPlans);
  }, [currencySymbol, t]);

  const reloadActiveUser = useCallback(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) return;

    const rawUsers = localStorage.getItem('zecratary_users');
    let matchedUser = active;

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
        } else {
          if (userTxs.length > 0 && userTxs[0].status === 'refunded') {
            matchedUser.subscriptionPlan = 'taster';
            (matchedUser as any).expiryDate = '';
            (matchedUser as any).planExpiryDate = '';
          }
        }
      }
    } catch (_) {}

    setCurrentUser(matchedUser);
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
  }, []);

  useEffect(() => {
    document.title = `${t('accountProfileTitle') || 'Account Profile'} - Zecratary`;
    reloadActiveUser();
    syncPlansFromAdmin();

    const handleSyncEvent = () => {
      reloadActiveUser();
      syncPlansFromAdmin();
    };

    window.addEventListener('zecratary_plans_updated', handleSyncEvent);
    window.addEventListener('zecratary_users_updated', handleSyncEvent);
    window.addEventListener('zecratary_payment_updated', handleSyncEvent);
    window.addEventListener('zecratary_auth_changed', handleSyncEvent);
    window.addEventListener('storage', handleSyncEvent);

    return () => {
      window.removeEventListener('zecratary_plans_updated', handleSyncEvent);
      window.removeEventListener('zecratary_users_updated', handleSyncEvent);
      window.removeEventListener('zecratary_payment_updated', handleSyncEvent);
      window.removeEventListener('zecratary_auth_changed', handleSyncEvent);
      window.removeEventListener('storage', handleSyncEvent);
    };
  }, [reloadActiveUser, syncPlansFromAdmin]);

  const userPlanBadge = useMemo(() => {
    const rawKey = ((user as any)?.subscriptionPlan || (user as any)?.subscriptionTier || '').toLowerCase().trim();
    const planKey = sanitizeSinglePlan(rawKey);

    if (!planKey || planKey === 'taster' || planKey.includes('free')) {
      return {
        label: t('freeTierNoExpiry') || 'Taster (Free)',
        bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
        border: 'var(--color-emerald, #10b981)',
        color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
        icon: Sparkles
      };
    }

    const matched = plans.find(p => p.slug.toLowerCase() === planKey || p.id.toLowerCase() === planKey);

    if (matched) {
      if (matched.isFree) {
        return {
          label: `${matched.name} (Free)`,
          bg: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
          border: 'var(--color-emerald, #10b981)',
          color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)',
          icon: Sparkles
        };
      }
      if (matched.interval === 'YEAR' || planKey.includes('annual')) {
        return {
          label: `${matched.name} (Annual)`,
          bg: isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)',
          border: '#3b82f6',
          color: isDayMode ? '#1d4ed8' : '#60a5fa',
          icon: Zap
        };
      }
      return {
        label: `${matched.name} (Monthly)`,
        bg: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)',
        border: 'var(--color-primary, #E05638)',
        color: 'var(--color-primary, #E05638)',
        icon: Zap
      };
    }

    const formatted = planKey
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    if (planKey.includes('annual')) {
      return {
        label: formatted,
        bg: isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)',
        border: '#3b82f6',
        color: isDayMode ? '#1d4ed8' : '#60a5fa',
        icon: Zap
      };
    }

    return {
      label: formatted,
      bg: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)',
      border: 'var(--color-primary, #E05638)',
      color: 'var(--color-primary, #E05638)',
      icon: Zap
    };
  }, [user, plans, t, isDayMode]);

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
    window.dispatchEvent(new Event('zecratary_auth_changed'));
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
      const userEmail = user.email.toLowerCase();

      const currentActivePlan = sanitizeSinglePlan((user as any).subscriptionPlan);
      if (currentActivePlan === targetSlug) {
        setError(`You are already subscribed to ${plan.name}. Please select a different tier to change your plan.`);
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

      window.dispatchEvent(new Event('zecratary_auth_changed'));
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('storage'));

      const actionMsg = isFree 
        ? `Switched to the free ${plan.name} tier! Any previous subscription has been cancelled.` 
        : `Plan changed successfully to ${plan.name} (${plan.interval === 'YEAR' ? 'Annual' : 'Monthly'})! Previous plan was cancelled. Renewal date: ${new Date(newExpiryDate).toLocaleDateString()}.`;

      setSuccessMsg(actionMsg);
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
            {t('accountProfileSubtitle') || 'Manage your personal credentials, security password, and active subscription package'}
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
              <Shield className="h-3.5 w-3.5" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} /> {t('adminAccess') || 'Admin Access'}
            </Link>
            <Link
              href="/admin/payment"
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <CreditCard className="h-3.5 w-3.5 text-blue-500" /> {t('paymentGateway') || 'Payment & Gateway'}
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
              <Zap className="h-3.5 w-3.5 text-orange-500" /> {t('subscriptionPlans') || 'Subscription Plans'}
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in"
          style={{
            backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
            borderColor: 'var(--color-emerald, #10b981)',
            color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }} />
          <span>{successMsg}</span>
        </div>
      )}

      <div 
        className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl font-black shadow-xs"
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
                <h1 className="text-2xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{user.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-xs ${
                  user.role === 'admin'
                    ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400')
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
              <span className="font-semibold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('activeMembershipLabel') || 'Active Membership:'}</span>
              <span 
                className="font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase border shadow-xs inline-flex items-center gap-1"
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
              <div className="flex sm:justify-end items-center gap-1 text-[11px] font-semibold pt-0.5" style={{ color: isDayMode ? '#047857' : '#34d399' }}>
                <Clock className="h-3 w-3" />
                <span>{t('renewalExpiryPrefix') || 'Renewal / Expiry: '} {new Date(activeExpiryDate).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="flex sm:justify-end items-center gap-1 text-[11px] italic pt-0.5" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                <span>{t('freeTierNoExpiry') || 'Free Tier (No Expiry)'}</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs" autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('fullNameLabel') || 'Full Name *'}</label>
              <div className="relative">
                <UserIcon className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Smith"
                  className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition"
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
                <Mail className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition"
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
                {t('newPasswordLabel') || 'New Password'} <span className="font-normal" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>{t('leaveBlankCurrentPass') || '(leave blank to keep current)'}</span>
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition"
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
                {t('confirmPasswordLabel') || 'Confirm Password'} <span className="font-normal" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>{t('repeatNewPass') || '(repeat new password)'}</span>
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="profile-input w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition"
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
                backgroundColor: isDayMode ? '#fef2f2' : 'rgba(127, 29, 29, 0.3)',
                borderColor: isDayMode ? '#fca5a5' : 'rgba(153, 27, 27, 0.5)',
                color: isDayMode ? '#b91c1c' : '#fca5a5'
              }}
            >
              <LogOut className="h-4 w-4" /> {t('signOutBtn') || 'Sign Out'}
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

      <div 
        className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm transition-colors duration-200"
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
              backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedInterval('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedInterval === 'MONTH'
                  ? 'text-white shadow'
                  : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
              }`}
              style={{
                backgroundColor: selectedInterval === 'MONTH' ? 'var(--color-primary, #E05638)' : 'transparent'
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
                  : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
              }`}
              style={{
                backgroundColor: selectedInterval === 'YEAR' ? 'var(--color-primary, #E05638)' : 'transparent'
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
                className={`rounded-3xl p-6 border-2 relative flex flex-col justify-between shadow-sm transition-all duration-200 ${
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
                          className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border shadow-xs"
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

                  <div>
                    {isFree ? (
                      <div className="text-3xl font-black" style={{ color: 'var(--color-primary, #E05638)' }}>
                        {t('Free') || 'Free'}
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
                        <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#e2e8f0' }}>{plan.subPrice}</span>{' '}
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
                          <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} />
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
