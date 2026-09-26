// Generated / Updated by AI Collaborator
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Coins, 
  Calendar, 
  Check, 
  ArrowUpRight, 
  Ban, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Wallet, 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  X
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser } from '@/lib/auth';

interface Transaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  failureReason?: string;
  isRecurring: boolean;
  recurringInterval: string;
  autoRenew: boolean;
  expiryDate?: string;
  createdAt: string;
}

interface PlanCatalog {
  id: string;
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  tokenLimit: number;
  tokenReimburseFrequency?: string;
  monthlyBadge?: string;
  annualBadge?: string;
  trialBadge?: string;
  description: string;
  descriptionMonthly?: string;
  descriptionAnnual?: string;
  features?: string[] | string;
  featuresText?: string;
  isFree?: boolean;
  buttonText?: string;
}

interface TokenIdentity {
  tokenName: string;
  tokenSymbol: string;
  tokenIcon?: string;
}

const DEFAULT_FALLBACK_PLANS: PlanCatalog[] = [
  {
    id: 'preset_taster',
    slug: 'taster',
    name: 'Taster',
    monthlyPrice: 0,
    annualPrice: 0,
    tokenLimit: 50000,
    trialBadge: 'Free Tier',
    description: 'Free tier with starter AI token quota and standard culinary features.',
    descriptionMonthly: 'Free tier with starter AI token quota and standard culinary features.',
    descriptionAnnual: 'Free tier with starter AI token quota and standard culinary features.',
    features: [
      'Create up to 5 AI-powered recipes per month',
      'Personal recipe library (25 total recipes)',
      'Smart ingredient repurposing',
      'Automated shopping list creation',
      'Meal planner & conversion tools'
    ],
    isFree: true
  },
  {
    id: 'preset_nutrition_pro',
    slug: 'nutrition-pro',
    name: 'Nutrition Pro',
    monthlyPrice: 8.99,
    annualPrice: 59.99,
    tokenLimit: 1000000,
    monthlyBadge: 'Popular',
    annualBadge: 'Save 44%',
    trialBadge: '7-Day Free Trial',
    description: 'Full premium culinary suite with advanced nutritional analysis and high token quotas.',
    descriptionMonthly: 'Full kitchen access, billed monthly',
    descriptionAnnual: 'Best value - all premium features, billed annually',
    features: [
      'Unlimited AI-powered recipe generation',
      'Unlimited personal recipe library',
      'Comprehensive nutritional analysis (macros, vitamins, calories)',
      'Priority AI model processing',
      'Cloud synchronization across devices'
    ],
    isFree: false
  }
];

const sanitizeSlug = (slug: string): string => {
  return (slug || '')
    .toLowerCase()
    .trim()
    .replace(/^(preset_|plan_)/i, '')
    .replace(/-(monthly|annual|year)$/i, '')
    .trim();
};

const normalizePlan = (raw: any): PlanCatalog => {
  const rawSlug = String(raw.slug || raw.id || 'plan').toLowerCase().trim();
  const baseSlug = rawSlug.replace(/^(preset_|plan_)/i, '').replace(/-(monthly|annual|year)$/i, '').trim();
  const rawName = String(raw.name || baseSlug || 'Plan').trim();

  const isFree = Boolean(
    raw.isFree === true ||
    raw.is_free === true ||
    baseSlug === 'taster' ||
    baseSlug === 'free' ||
    raw.id === 'preset_taster' ||
    (Number(raw.monthlyPriceDollars ?? raw.monthly_price_dollars ?? raw.monthlyPrice ?? raw.price ?? 0) === 0 &&
     Number(raw.annualPriceDollars ?? raw.annual_price_dollars ?? raw.annualPrice ?? 0) === 0)
  );

  const monthlyPrice = isFree ? 0 : Number(
    raw.monthlyPriceDollars ??
    raw.monthly_price_dollars ??
    raw.monthlyPrice ??
    (raw.priceCents ? raw.priceCents / 100 : undefined) ??
    (raw.price_cents ? raw.price_cents / 100 : undefined) ??
    (String(raw.interval || '').toLowerCase().includes('year') ? undefined : raw.price) ??
    0
  );

  let annualPrice = isFree ? 0 : Number(
    raw.annualPriceDollars ??
    raw.annual_price_dollars ??
    raw.annualPrice ??
    (String(raw.interval || '').toLowerCase().includes('year') ? raw.price : undefined) ??
    0
  );

  if (!isFree && annualPrice === 0 && monthlyPrice > 0) {
    annualPrice = Number((monthlyPrice * 10).toFixed(2));
  }

  const tokenLimit = Number(
    raw.tokenLimit ??
    raw.token_limit ??
    raw.monthly_tokens ??
    raw.tokenQuota ??
    (isFree ? 50000 : 500000)
  );

  const descMonthly = raw.descriptionMonthly || raw.description_monthly || raw.description || '';
  const descAnnual = raw.descriptionAnnual || raw.description_annual || raw.description || raw.descriptionMonthly || '';

  return {
    id: String(raw.id || baseSlug || `plan_${Date.now()}`),
    slug: baseSlug,
    name: rawName,
    monthlyPrice,
    annualPrice,
    tokenLimit,
    tokenReimburseFrequency: raw.tokenReimburseFrequency || raw.token_reimburse_frequency || 'monthly',
    monthlyBadge: raw.monthlyBadge || raw.monthly_badge || '',
    annualBadge: raw.annualBadge || raw.annual_badge || '',
    trialBadge: raw.trialBadge || raw.trial_badge || (isFree ? 'Free Tier' : ''),
    description: descMonthly || descAnnual || 'Subscription package tier',
    descriptionMonthly: descMonthly,
    descriptionAnnual: descAnnual,
    features: raw.featuresText || raw.features || [],
    featuresText: typeof raw.featuresText === 'string' ? raw.featuresText : (Array.isArray(raw.features) ? raw.features.join('\n') : ''),
    isFree,
    buttonText: raw.buttonText || raw.button_text || ''
  };
};

/**
 * Dynamic Token Icon renderer synchronizing directly with /admin/token-setting.
 * Supports unicode emojis (🪙, 💎, ⚡, ⭐), text symbols (TK, CRD), and Lucide vectors.
 */
function DynamicTokenIcon({ 
  symbolOrIcon, 
  className = "w-3.5 h-3.5",
  style = {} 
}: { 
  symbolOrIcon?: string; 
  className?: string; 
  style?: React.CSSProperties 
}) {
  const val = (symbolOrIcon || '').trim();

  const lower = val.toLowerCase();
  if (lower === 'coins' || lower === 'coin') {
    return <Coins className={className} style={style} />;
  }
  if (lower === 'sparkles' || lower === 'sparkle') {
    return <Sparkles className={className} style={style} />;
  }
  if (lower === 'zap' || lower === 'lightning' || lower === 'flash') {
    return <Zap className={className} style={style} />;
  }

  // Renders emoji glyph cleanly with vertical alignment
  if (val && !/^[a-zA-Z0-9_-]{4,}$/.test(val)) {
    return (
      <span 
        role="img" 
        aria-label="token-icon"
        className="inline-flex items-center justify-center select-none leading-none shrink-0" 
        style={{ fontSize: '1.05em', ...style }}
      >
        {val}
      </span>
    );
  }

  // Renders short text tokens (e.g. TK, CRD, PTS)
  if (val && val.length <= 4) {
    return (
      <span 
        className="inline-flex items-center justify-center font-black text-[10px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 leading-none shrink-0 font-mono"
        style={style}
      >
        {val}
      </span>
    );
  }

  return <Coins className={className} style={style} />;
}

export default function SubscriptionsPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plans, setPlans] = useState<PlanCatalog[]>(DEFAULT_FALLBACK_PLANS);
  const [billingInterval, setBillingInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  
  // Real-time Token Identity synchronized from /admin/token-setting
  const [tokenIdentity, setTokenIdentity] = useState<TokenIdentity>({ 
    tokenName: 'Tokens', 
    tokenSymbol: '🪙',
    tokenIcon: '🪙'
  });

  const [gatewayConfig, setGatewayConfig] = useState<any>({
    activeGateway: 'stripe',
    currency: 'USD',
    currencySymbol: '$',
    stripe: { enabled: true },
    paypal: { enabled: true },
    manual: { enabled: true }
  });

  const [walletConfig, setWalletConfig] = useState<any>({
    enabled: true,
    walletName: 'Store Wallet',
    allowSubscriptionPayment: true
  });

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [pendingPlanPayment, setPendingPlanPayment] = useState<{
    plan: PlanCatalog;
    interval: 'MONTH' | 'YEAR';
    amount: number;
    planSlugWithInterval: string;
    planDisplayName: string;
    tokensCredited: number;
  } | null>(null);

  const [autoRenewChoice, setAutoRenewChoice] = useState<boolean>(true);

  // Dynamic Theme Synchronization
  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('zecratary_theme_mode');
        const isDark = saved ? saved !== 'light' && saved !== 'day' : document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
      }
    };

    checkTheme();
    window.addEventListener('zecratary_theme_mode_changed', checkTheme);
    window.addEventListener('zecratary_theme_changed', checkTheme);
    window.addEventListener('zecratary_theme_updated', checkTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', checkTheme);
      window.removeEventListener('zecratary_theme_changed', checkTheme);
      window.removeEventListener('zecratary_theme_updated', checkTheme);
    };
  }, []);

  const normalizeTransaction = (tx: any): Transaction => ({
    id: tx.id || tx.transaction_id || `tx_${Date.now()}`,
    customerName: tx.customerName || tx.customer_name || tx.userName || '',
    customerEmail: tx.customerEmail || tx.customer_email || tx.userEmail || '',
    planName: tx.planName || tx.plan_name || 'Subscription Tier',
    planSlug: tx.planSlug || tx.plan_slug || '',
    amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0),
    currency: (tx.currency || 'USD').toUpperCase(),
    gateway: tx.gateway || tx.payment_method || 'wallet',
    status: (tx.status || 'succeeded').toLowerCase(),
    failureReason: tx.failureReason || tx.failure_reason,
    isRecurring: Boolean(tx.isRecurring ?? tx.is_recurring ?? true),
    recurringInterval: (tx.recurringInterval || tx.recurring_interval || tx.interval || 'MONTH').toUpperCase(),
    autoRenew: Boolean(tx.autoRenew ?? tx.auto_renew ?? true),
    expiryDate: tx.expiryDate || tx.expiry_date || tx.subscription_expiry_date || tx.plan_expiry,
    createdAt: tx.createdAt || tx.created_at || new Date().toISOString()
  });

  const normalizeUser = (rawUser: any) => {
    if (!rawUser) return null;
    const rawPlan = rawUser.subscription_plan || rawUser.subscriptionPlan || rawUser.plan_slug || rawUser.plan || 'taster';
    const rawInterval = rawUser.plan_interval || rawUser.planInterval || rawUser.recurring_interval;
    const inferredInterval = (rawPlan.includes('annual') || rawPlan.includes('year')) ? 'YEAR' : 'MONTH';

    return {
      ...rawUser,
      id: rawUser.id || rawUser.userId || '',
      name: rawUser.name || rawUser.user_name || rawUser.displayName || '',
      email: rawUser.email || rawUser.user_email || '',
      subscription_plan: rawPlan,
      plan_interval: (rawInterval || inferredInterval).toUpperCase(),
      token_balance: Number(rawUser.token_balance ?? rawUser.tokenBalance ?? 0),
      wallet_balance: Number(rawUser.wallet_balance ?? rawUser.walletBalance ?? 0),
      payment_method: rawUser.payment_method || rawUser.paymentMethod || 'wallet',
      expiry_date: rawUser.expiry_date || rawUser.expiryDate || rawUser.subscription_expiry_date
    };
  };

  const parsePlanFeatures = (features: any): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
      return features.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Authoritative live sync query across PostgreSQL, /api/billing, /api/wallet, and /api/admin/token-settings
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let userEmail = '';
      let userId = '';

      if (typeof window !== 'undefined') {
        try {
          const authUser = getCurrentUser();
          if (authUser?.email) userEmail = authUser.email;
          if (authUser?.id) userId = String(authUser.id);

          if (!userEmail || !userId) {
            const rawStored = localStorage.getItem('zecratary_user') || localStorage.getItem('zecratary_current_user') || localStorage.getItem('currentUser');
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (!userEmail && parsed?.email) userEmail = parsed.email;
              if (!userId && (parsed?.id || parsed?.userId)) userId = String(parsed.id || parsed.userId);
            }
          }
        } catch (_) {}
      }

      const params = new URLSearchParams();
      if (userEmail) params.append('email', userEmail);
      if (userId) params.append('userId', userId);
      params.append('t', String(Date.now()));
      const queryString = `?${params.toString()}`;

      // 1. Fetch user membership, billing configs, and transaction history
      let billingData: any = null;
      try {
        const res = await fetch(`/api/billing${queryString}`, { cache: 'no-store' });
        if (res.ok) {
          billingData = await res.json();
          if (billingData.success) {
            const normalizedU = normalizeUser(billingData.user);
            setUser(normalizedU);

            const rawTxList = Array.isArray(billingData.transactions) ? billingData.transactions : [];
            const normalizedTxList = rawTxList.map(normalizeTransaction);
            setTransactions(normalizedTxList);

            if (billingData.gatewayConfig) {
              setGatewayConfig((prev: any) => ({ ...prev, ...billingData.gatewayConfig }));
            }

            if (billingData.walletConfig) {
              setWalletConfig((prev: any) => ({ ...prev, ...billingData.walletConfig }));
            }

            if (billingData.tokenIdentity) {
              setTokenIdentity({
                tokenName: billingData.tokenIdentity.tokenName || 'Tokens',
                tokenSymbol: billingData.tokenIdentity.tokenSymbol || '🪙',
                tokenIcon: billingData.tokenIdentity.tokenIcon || billingData.tokenIdentity.tokenSymbol || '🪙'
              });
            }

            const activeTx = normalizedTxList.find((tx) => 
              ['active', 'succeeded', 'successful', 'paid', 'canceled'].includes(tx.status) &&
              (!tx.expiryDate || new Date(tx.expiryDate).getTime() > Date.now())
            );

            let detectedInterval = (activeTx?.recurringInterval || normalizedU?.plan_interval || '').toUpperCase();
            if (normalizedU?.subscription_plan && (normalizedU.subscription_plan.includes('annual') || normalizedU.subscription_plan.includes('year'))) {
              detectedInterval = 'YEAR';
            }

            if (detectedInterval === 'YEAR' || detectedInterval === 'ANNUAL') {
              setBillingInterval('YEAR');
            } else {
              setBillingInterval('MONTH');
            }
          }
        }
      } catch (_) {}

      // 2. Authoritative Token Settings synchronization from /admin/token-setting
      try {
        const tokenRes = await fetch(`/api/admin/token-settings?t=${Date.now()}`, { cache: 'no-store' });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const s = tokenData.settings || tokenData;
          if (s) {
            setTokenIdentity({
              tokenName: s.tokenName || s.token_name || 'Foodie Token',
              tokenSymbol: s.tokenSymbol || s.token_symbol || '🪙',
              tokenIcon: s.tokenIcon || s.token_icon || s.tokenSymbol || s.token_symbol || '🪙'
            });
          }
        } else {
          const pubTokenRes = await fetch(`/api/tokens?t=${Date.now()}`, { cache: 'no-store' });
          if (pubTokenRes.ok) {
            const pubData = await pubTokenRes.json();
            if (pubData.tokenSymbol || pubData.tokenName) {
              setTokenIdentity({
                tokenName: pubData.tokenName || 'Foodie Token',
                tokenSymbol: pubData.tokenSymbol || '🪙',
                tokenIcon: pubData.tokenIcon || pubData.tokenSymbol || '🪙'
              });
            }
          }
        }
      } catch (_) {}

      // 3. Authoritative Live Wallet Balance Synchronization from /api/wallet
      try {
        const walletRes = await fetch(`/api/wallet${queryString}`, { cache: 'no-store' });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          if (walletData.success) {
            const liveBal = typeof walletData.wallet_balance === 'number'
              ? walletData.wallet_balance
              : (walletData.user && typeof walletData.user.wallet_balance !== 'undefined'
                  ? parseFloat(walletData.user.wallet_balance || 0)
                  : (walletData.balance !== undefined ? parseFloat(walletData.balance) : null));

            if (liveBal !== null && !isNaN(liveBal)) {
              setUser((prev: any) => ({ ...(prev || {}), wallet_balance: liveBal }));

              if (typeof window !== 'undefined') {
                try {
                  const saved = localStorage.getItem('zecratary_user') || localStorage.getItem('zecratary_current_user');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    parsed.wallet_balance = liveBal;
                    parsed.walletBalance = liveBal;
                    localStorage.setItem('zecratary_user', JSON.stringify(parsed));
                  }
                } catch (_) {}
              }
            }

            if (walletData.settings) {
              setWalletConfig((prev: any) => ({
                ...prev,
                enabled: walletData.settings.is_enabled !== false,
                walletName: walletData.settings.wallet_name || prev?.walletName || 'Store Wallet',
                allowSubscriptionPayment: walletData.settings.allow_site_purchases !== false
              }));
            }
          }
        }
      } catch (_) {}

      // 4. Subscription plans synchronization from /api/admin/plans
      let rawAdminPlans: any[] = [];
      try {
        const adminPlansRes = await fetch(`/api/admin/plans?t=${Date.now()}`, { cache: 'no-store' });
        if (adminPlansRes.ok) {
          const plansData = await adminPlansRes.json();
          const list = Array.isArray(plansData)
            ? plansData
            : (plansData?.packages || plansData?.plans || plansData?.configs || plansData?.subscriptionPlans || plansData?.data);
          if (Array.isArray(list) && list.length > 0) {
            rawAdminPlans = [...list];
          }
        }
      } catch (_) {}

      if (rawAdminPlans.length === 0) {
        try {
          const publicPlansRes = await fetch(`/api/plans?t=${Date.now()}`, { cache: 'no-store' });
          if (publicPlansRes.ok) {
            const publicData = await publicPlansRes.json();
            const list = Array.isArray(publicData)
              ? publicData
              : (publicData?.packages || publicData?.plans || publicData?.configs || publicData?.subscriptionPlans || publicData?.data);
            if (Array.isArray(list) && list.length > 0) {
              rawAdminPlans = [...list];
            }
          }
        } catch (_) {}
      }

      if (billingData?.plans && Array.isArray(billingData.plans) && billingData.plans.length > 0) {
        const seen = new Set(rawAdminPlans.map((p: any) => String(p.slug || p.id || '').toLowerCase()));
        billingData.plans.forEach((bp: any) => {
          const key = String(bp.slug || bp.id || '').toLowerCase();
          if (!seen.has(key)) {
            rawAdminPlans.push(bp);
            seen.add(key);
          }
        });
      }

      if (rawAdminPlans.length > 0) {
        const parsed = rawAdminPlans.map(normalizePlan);
        const uniqueMap = new Map<string, PlanCatalog>();
        parsed.forEach((p) => {
          const baseKey = sanitizeSlug(p.slug || p.id);
          if (!uniqueMap.has(baseKey)) {
            uniqueMap.set(baseKey, p);
          }
        });

        let finalized = Array.from(uniqueMap.values());
        const hasFreeTier = finalized.some((p) => p.isFree || sanitizeSlug(p.slug) === 'taster');
        if (!hasFreeTier) {
          finalized.unshift(DEFAULT_FALLBACK_PLANS[0]);
        }
        setPlans(finalized);
      } else {
        setPlans(DEFAULT_FALLBACK_PLANS);
      }

    } catch (err: any) {
      setPlans(DEFAULT_FALLBACK_PLANS);
      setFeedback({ type: 'error', msg: err.message || t('failedLoadSubscriptionInfo', 'Failed to load subscription information') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();

    const handleSyncEvents = () => {
      fetchData();
    };

    window.addEventListener('zecratary_payment_updated', handleSyncEvents);
    window.addEventListener('zecratary_plans_updated', handleSyncEvents);
    window.addEventListener('zecratary_admin_settings_updated', handleSyncEvents);
    window.addEventListener('zecratary_payment_gateway_updated', handleSyncEvents);
    window.addEventListener('zecratary_wallet_updated', handleSyncEvents);
    window.addEventListener('zecratary_wallet_settings_updated', handleSyncEvents);
    window.addEventListener('zecratary_users_updated', handleSyncEvents);
    window.addEventListener('zecratary_token_settings_updated', handleSyncEvents);
    window.addEventListener('zecratary_tokens_updated', handleSyncEvents);

    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSyncEvents);
      window.removeEventListener('zecratary_plans_updated', handleSyncEvents);
      window.removeEventListener('zecratary_admin_settings_updated', handleSyncEvents);
      window.removeEventListener('zecratary_payment_gateway_updated', handleSyncEvents);
      window.removeEventListener('zecratary_wallet_updated', handleSyncEvents);
      window.removeEventListener('zecratary_wallet_settings_updated', handleSyncEvents);
      window.removeEventListener('zecratary_users_updated', handleSyncEvents);
      window.removeEventListener('zecratary_token_settings_updated', handleSyncEvents);
      window.removeEventListener('zecratary_tokens_updated', handleSyncEvents);
    };
  }, [fetchData]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const activeTransaction = useMemo(() => {
    return transactions.find((tx) => {
      const isPaidOrActive = ['active', 'succeeded', 'successful', 'paid', 'canceled'].includes(tx.status);
      if (!isPaidOrActive) return false;
      if (!tx.expiryDate) return true;
      return new Date(tx.expiryDate).getTime() > Date.now();
    });
  }, [transactions]);

  const activeUserPlan = useMemo(() => {
    if (activeTransaction && activeTransaction.planSlug) {
      return activeTransaction.planSlug.toLowerCase().trim();
    }
    return (user?.subscription_plan || 'taster').toLowerCase().trim();
  }, [activeTransaction, user?.subscription_plan]);

  const activeUserInterval = useMemo((): 'MONTH' | 'YEAR' => {
    if (activeTransaction?.recurringInterval) {
      const intv = activeTransaction.recurringInterval.toUpperCase();
      if (intv === 'YEAR' || intv === 'ANNUAL') return 'YEAR';
      if (intv === 'MONTH' || intv === 'MONTHLY') return 'MONTH';
    }
    const userPlan = (user?.subscription_plan || '').toLowerCase();
    if (userPlan.includes('annual') || userPlan.includes('year')) return 'YEAR';
    const uIntv = (user?.plan_interval || '').toUpperCase();
    if (uIntv === 'YEAR' || uIntv === 'ANNUAL') return 'YEAR';
    return 'MONTH';
  }, [activeTransaction, user?.subscription_plan, user?.plan_interval]);

  const isFreeUser = useMemo(() => {
    const base = sanitizeSlug(activeUserPlan);
    return !base || base === 'taster' || base === 'free';
  }, [activeUserPlan]);

  const getPlanStatus = useCallback((plan: PlanCatalog, currentInterval: 'MONTH' | 'YEAR') => {
    const isPlanFree = Boolean(plan.slug === 'taster' || plan.id === 'preset_taster' || plan.isFree || (plan.monthlyPrice === 0 && plan.annualPrice === 0));
    const planBase = sanitizeSlug(plan.slug || plan.id);
    const userBase = sanitizeSlug(activeUserPlan);

    const isMatchingTier = isFreeUser 
      ? isPlanFree 
      : (userBase === planBase || (userBase && planBase && (userBase.includes(planBase) || planBase.includes(userBase))));

    const isExactActive = isPlanFree 
      ? isFreeUser 
      : (isMatchingTier && activeUserInterval === currentInterval);

    return {
      isPlanFree,
      isMatchingTier,
      isExactActive
    };
  }, [activeUserPlan, activeUserInterval, isFreeUser]);

  const annualDiscountPercent = useMemo(() => {
    const paidPlans = plans.filter((p) => !p.isFree && p.monthlyPrice > 0 && p.annualPrice > 0);
    if (paidPlans.length === 0) return 20;
    const totalMonthly = paidPlans.reduce((sum, p) => sum + p.monthlyPrice * 12, 0);
    const totalAnnual = paidPlans.reduce((sum, p) => sum + p.annualPrice, 0);
    if (totalMonthly <= 0) return 20;
    const discount = Math.round(((totalMonthly - totalAnnual) / totalMonthly) * 100);
    return discount > 0 ? discount : 20;
  }, [plans]);

  const executePlanChange = async (
    planSlugWithInterval: string,
    planDisplayName: string,
    amount: number,
    interval: 'MONTH' | 'YEAR',
    tokensCredited: number,
    gateway: string = 'wallet'
  ) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_plan',
          email: user?.email,
          userId: user?.id,
          userName: user?.name,
          planSlug: planSlugWithInterval,
          planName: planDisplayName,
          amount,
          interval,
          tokenLimit: tokensCredited,
          gateway,
          currency: gatewayConfig?.currency || 'USD',
          autoRenew: autoRenewChoice
        })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ 
          type: 'success', 
          msg: data.message || `${t('successfullySwitchedTo', 'Successfully activated')} ${planDisplayName}` 
        });

        setShowPaymentModal(false);
        setPendingPlanPayment(null);

        if (typeof data.wallet_balance === 'number') {
          setUser((prev: any) => ({ ...prev, wallet_balance: data.wallet_balance }));
        }

        try {
          const raw = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user');
          if (raw) {
            const u = JSON.parse(raw);
            u.subscriptionPlan = planSlugWithInterval;
            u.subscription_plan = planSlugWithInterval;
            u.plan_interval = interval;
            if (typeof data.wallet_balance === 'number') {
              u.wallet_balance = data.wallet_balance;
              u.walletBalance = data.wallet_balance;
            } else if (gateway === 'wallet') {
              u.wallet_balance = Math.max(0, Number(u.wallet_balance || 0) - amount);
            }
            localStorage.setItem('zecratary_current_user', JSON.stringify(u));
            localStorage.setItem('zecratary_user', JSON.stringify(u));
          }
        } catch (_) {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
          window.dispatchEvent(new Event('zecratary_plans_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          window.dispatchEvent(new Event('zecratary_token_settings_updated'));
          window.dispatchEvent(new Event('zecratary_tokens_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || t('failedSwitchPlan', 'Failed to switch subscription plan'));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedSwitchPlan', 'Failed to switch subscription plan') });
    } finally {
      setProcessing(false);
    }
  };

  const handleSwitchPlan = async (plan: PlanCatalog, interval: 'MONTH' | 'YEAR') => {
    const isTargetFree = plan.slug === 'taster' || plan.id === 'preset_taster' || plan.isFree || (plan.monthlyPrice === 0 && plan.annualPrice === 0);
    const amount = isTargetFree ? 0 : (interval === 'YEAR' ? plan.annualPrice : plan.monthlyPrice);
    const planSlugWithInterval = isTargetFree ? 'taster' : `${plan.slug}-${interval.toLowerCase()}`;
    const planDisplayName = isTargetFree ? `${plan.name} (${t('freeLabel', 'Free')})` : `${plan.name} (${interval === 'YEAR' ? t('annualLabel', 'Annual') : t('monthlyLabel', 'Monthly')})`;
    const tokensCredited = plan.tokenLimit ?? (isTargetFree ? 50000 : 500000);

    if (isTargetFree) {
      const confirmPrompt = `${t('confirmDowngradeFreePrompt', 'Are you sure you want to switch your subscription to')} ${planDisplayName}?`;
      if (!window.confirm(confirmPrompt)) return;
      await executePlanChange(planSlugWithInterval, planDisplayName, 0, interval, tokensCredited, 'wallet');
      return;
    }

    setAutoRenewChoice(true);
    setPendingPlanPayment({
      plan,
      interval,
      amount,
      planSlugWithInterval,
      planDisplayName,
      tokensCredited,
    });

    setShowPaymentModal(true);
  };

  const handleCancelAutoRenew = async () => {
    if (!window.confirm(t('confirmCancelAutoRenewPrompt', 'Are you sure you want to cancel auto-renewal? You will retain all plan features until the end of your current billing cycle.'))) {
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_subscription',
          email: user?.email,
          userId: user?.id,
          transactionId: activeTransaction?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('autoRenewCancelledMsg', 'Auto-renewal has been cancelled. Your active features remain intact until expiry.') 
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || t('failedCancelAutoRenew', 'Failed to cancel auto-renewal'));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedCancelAutoRenew', 'Failed to cancel auto-renewal') });
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeAutoRenew = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume_subscription',
          email: user?.email,
          userId: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('autoRenewResumedMsg', 'Auto-renewal has been reactivated successfully!') 
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || t('failedReactivateAutoRenew', 'Failed to reactivate auto-renewal'));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedReactivateAutoRenew', 'Failed to reactivate auto-renewal') });
    } finally {
      setProcessing(false);
    }
  };

  const effectiveExpiry = activeTransaction?.expiryDate || user?.expiry_date;

  const displayActivePlanName = useMemo(() => {
    const matched = plans.find((p) => sanitizeSlug(p.slug || p.id) === sanitizeSlug(activeUserPlan));
    if (matched) {
      if (isFreeUser) return `${matched.name} (${t('freeLabel', 'Free')})`;
      return `${matched.name} (${activeUserInterval === 'YEAR' ? t('annualLabel', 'Annual') : t('monthlyLabel', 'Monthly')})`;
    }
    if (isFreeUser) return `Taster (${t('freeLabel', 'Free')})`;
    return activeUserPlan.replace(/-/g, ' ');
  }, [plans, activeUserPlan, isFreeUser, activeUserInterval, t]);

  const userBalance = Number(user?.wallet_balance || 0);
  const planCost = pendingPlanPayment?.amount || 0;
  const isWalletSufficient = userBalance >= planCost;

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f8fafc)'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Layers className="h-7 w-7" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('subscriptionsPageTitle', 'Subscriptions & Plans')}</span>
            </h1>
            <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              {t('subscriptionsPageSubtitle', 'Review your current plan tier, manage auto-renewal, and upgrade or switch packages.')}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer self-start sm:self-auto hover:opacity-80 active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f8fafc)'
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{t('refreshBtn', 'Refresh Status')}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className="p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-in fade-in transition"
            style={{
              backgroundColor: 'var(--color-inner-dark, #070b13)',
              borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
              color: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
            }}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* SECTION 1: BASIC INFORMATION & ACTIVE PLAN */}
        <div 
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-emerald, #10b981)',
                    color: 'var(--color-emerald, #10b981)'
                  }}
                >
                  {t('currentActiveTier', 'Current Active Tier')}
                </span>

                {activeTransaction?.autoRenew && activeTransaction.status !== 'canceled' && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{t('autoRenewOn', 'Auto-Renew ON')}</span>
                  </span>
                )}
                {activeTransaction?.status === 'canceled' && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{t('renewalCanceled', 'Renewal Canceled (Active Until Expiry)')}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black capitalize" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {displayActivePlanName}
              </h2>

              <p className="text-xs opacity-75 flex items-center gap-2" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>
                  {effectiveExpiry && !isFreeUser
                    ? `${t('planValidUntil', 'Active period ends on')} ${new Date(effectiveExpiry).toLocaleDateString()}`
                    : t('freePlanNoExpiry', 'Free Plan — Perpetual Access')}
                </span>
              </p>
            </div>

            {/* Quick Actions on Active Plan */}
            <div className="flex flex-wrap items-center gap-3">
              {activeTransaction && activeTransaction.status !== 'canceled' && !isFreeUser && (
                <button
                  type="button"
                  onClick={handleCancelAutoRenew}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  title={t('cancelAutoRenewBtn', 'Cancel Auto-Renewal')}
                >
                  <Ban className="w-4 h-4" />
                  <span>{t('cancelAutoRenewBtn', 'Cancel Auto-Renewal')}</span>
                </button>
              )}

              {activeTransaction && activeTransaction.status === 'canceled' && !isFreeUser && (
                <button
                  type="button"
                  onClick={handleResumeAutoRenew}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  title={t('reactivateAutoRenewBtn', 'Reactivate Auto-Renew')}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('reactivateAutoRenewBtn', 'Reactivate Auto-Renew')}</span>
                </button>
              )}

              <Link
                href="/billing"
                className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer hover:opacity-85"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)',
                  color: 'var(--color-text, #f8fafc)'
                }}
              >
                <CreditCard className="w-4 h-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>{t('invoicesBillingBtn', 'Invoices & Billing')}</span>
              </Link>
            </div>
          </div>

          {/* User Account, Quota & Wallet Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('accountLabel', 'Account')}</span>
              </div>
              <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {user?.name || user?.email || t('memberAccount', 'Logged-in Member')}
              </div>
              <div className="text-xs opacity-50 truncate" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {user?.email}
              </div>
            </div>

            {/* DYNAMIC TOKEN BALANCE CARD */}
            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <DynamicTokenIcon symbolOrIcon={tokenIdentity.tokenIcon || tokenIdentity.tokenSymbol} className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('availableTokensLabel', 'Available Tokens')}</span>
              </div>
              <div className="font-bold text-base flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
                <span>{Number(user?.token_balance || 0).toLocaleString()}</span>
                <span className="text-xs font-semibold opacity-75">{tokenIdentity.tokenSymbol}</span>
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('replenishedOnCycle', 'Replenished on every billing cycle')}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{walletConfig.walletName || t('walletBalanceLabel', 'Store Wallet')}</span>
              </div>
              <div className="font-bold text-base font-mono flex items-center gap-1" style={{ color: 'var(--color-emerald, #10b981)' }}>
                <span>{gatewayConfig.currencySymbol || '$'}</span>
                <span>{Number(user?.wallet_balance || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('availableForServices', 'Available for store & token top-ups')}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{t('billingIntervalLabel', 'Billing Interval')}</span>
              </div>
              <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {isFreeUser ? t('freeTierInterval', 'Perpetual') : (activeUserInterval === 'YEAR' ? t('annualLabel', 'Annual') : t('monthlyLabel', 'Monthly'))}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {activeTransaction?.isRecurring ? t('recurringActive', 'Recurring auto-renew') : t('oneOffCycle', 'Non-recurring cycle')}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t('paymentMethodLabel', 'Payment Source')}</span>
              </div>
              <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--color-emerald, #10b981)' }}>
                {user?.payment_method?.toLowerCase() === 'wallet' ? (walletConfig.walletName || t('storeWallet', 'Store Wallet')) : (user?.payment_method || 'Store Wallet')}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('storedCreditLedger', 'Debited from account balance')}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: UPGRADE / DOWNGRADE PLAN SELECTION */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('upgradeChangePlan', 'Upgrade or Change Plan')}
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('upgradeSubtitle', 'Select between monthly or annual billing to customize your features and token quotas.')}
              </p>
            </div>

            {/* Monthly / Annual Toggle */}
            <div 
              className="p-1 rounded-2xl border flex items-center self-start sm:self-auto shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--color-card, #0f172a)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <button
                type="button"
                onClick={() => setBillingInterval('MONTH')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingInterval === 'MONTH' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={billingInterval === 'MONTH' ? {
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  color: 'var(--color-emerald, #10b981)'
                } : {
                  color: 'var(--color-text-secondary, #94a3b8)'
                }}
              >
                {t('monthlyBilling', 'Monthly Billing')}
              </button>

              <button
                type="button"
                onClick={() => setBillingInterval('YEAR')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  billingInterval === 'YEAR' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={billingInterval === 'YEAR' ? {
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  color: 'var(--color-emerald, #10b981)'
                } : {
                  color: 'var(--color-text-secondary, #94a3b8)'
                }}
              >
                <span>{t('annualBilling', 'Annual Billing')}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t('saveUpToDiscount', 'Save ~{percent}%').replace('{percent}', String(annualDiscountPercent))}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Tier Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const { isPlanFree, isMatchingTier, isExactActive } = getPlanStatus(plan, billingInterval);
              const price = billingInterval === 'YEAR' ? plan.annualPrice : plan.monthlyPrice;
              
              const badge = isPlanFree 
                ? plan.trialBadge 
                : (billingInterval === 'YEAR' ? (plan.annualBadge || plan.trialBadge) : (plan.monthlyBadge || plan.trialBadge));

              const description = billingInterval === 'YEAR'
                ? (plan.descriptionAnnual || plan.description || plan.descriptionMonthly)
                : (plan.descriptionMonthly || plan.description || plan.descriptionAnnual);

              const parsedFeatures = parsePlanFeatures(plan.featuresText || plan.features);

              return (
                <div
                  key={plan.id || plan.slug}
                  className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                    isExactActive 
                      ? 'ring-2 ring-emerald-500/90 shadow-2xl shadow-emerald-500/15' 
                      : (isMatchingTier ? 'ring-1 ring-amber-500/50 shadow-md' : 'hover:shadow-lg')
                  }`}
                  style={{
                    backgroundColor: isExactActive 
                      ? (isDarkMode ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.04)')
                      : 'var(--color-card, #0f172a)',
                    borderColor: isExactActive 
                      ? 'var(--color-emerald, #10b981)' 
                      : (isMatchingTier ? 'rgba(245, 158, 11, 0.4)' : 'var(--color-border, #1e293b)')
                  }}
                >
                  {isExactActive ? (
                    <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-lg flex items-center gap-1.5 z-10 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950 text-emerald-500" />
                      <span>{t('currentSubscribedPlanBadge', 'Current Active Plan')}</span>
                    </div>
                  ) : isMatchingTier ? (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1 z-10">
                      <Sparkles className="w-3 h-3 fill-slate-950 text-amber-500" />
                      <span>{t('subscribedTierBadge', 'Subscribed ({interval})').replace('{interval}', activeUserInterval === 'YEAR' ? t('annualLabel', 'Annual') : t('monthlyLabel', 'Monthly'))}</span>
                    </div>
                  ) : badge ? (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md z-10">
                      {badge}
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black" style={{ color: 'var(--color-text, #f8fafc)' }}>
                        {plan.name}
                      </h4>
                      {isExactActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t('activePlanTag', 'Active Plan')}</span>
                        </span>
                      ) : isMatchingTier ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{t('currentTierTag', 'Current Tier')}</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed min-h-[36px]" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                      {description}
                    </p>

                    {/* Price Display */}
                    <div className="py-2 border-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--color-text, #f8fafc)' }}>
                          {isPlanFree ? t('freeLabel', 'Free') : `${gatewayConfig.currencySymbol || '$'}${price.toFixed(2)}`}
                        </span>
                        {!isPlanFree && (
                          <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                            /{billingInterval === 'YEAR' ? t('yearLabel', 'year') : t('monthLabel', 'month')}
                          </span>
                        )}
                      </div>

                      {/* DYNAMIC TOKEN QUOTA BADGE */}
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <DynamicTokenIcon symbolOrIcon={tokenIdentity.tokenIcon || tokenIdentity.tokenSymbol} className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {plan.tokenLimit === -1 
                            ? t('unlimitedTokens', 'Unlimited Tokens') 
                            : `+${(plan.tokenLimit ?? (isPlanFree ? 50000 : 500000)).toLocaleString()} ${tokenIdentity.tokenSymbol}`
                          } / {billingInterval === 'YEAR' && !isPlanFree ? t('yearLabel', 'year') : t('monthLabel', 'month')}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                        {t('includedFeatures', 'Included Features:')}
                      </span>
                      <ul className="space-y-2 text-xs">
                        {parsedFeatures.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                            <span style={{ color: 'var(--color-text, #f8fafc)' }}>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Plan CTA Action Button */}
                  <div className="pt-6 mt-6 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                    {isExactActive ? (
                      <button
                        type="button"
                        disabled={true}
                        aria-disabled="true"
                        className="w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-not-allowed opacity-90 border select-none transition shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-inner-dark, #070b13)',
                          borderColor: 'var(--color-emerald, #10b981)',
                          color: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{t('currentActivePlanBtn', 'Current Active Plan')}</span>
                      </button>
                    ) : isMatchingTier && !isPlanFree ? (
                      <button
                        type="button"
                        onClick={() => handleSwitchPlan(plan, billingInterval)}
                        disabled={processing}
                        className="w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md text-white hover:opacity-90 active:scale-98 disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                        <span>
                          {billingInterval === 'YEAR' 
                            ? t('switchToAnnualBilling', 'Switch to Annual Billing')
                            : t('switchToMonthlyBilling', 'Switch to Monthly Billing')}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchPlan(plan, billingInterval)}
                        disabled={processing}
                        className={`w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 ${
                          isPlanFree ? 'border hover:bg-white/5' : 'text-white hover:opacity-90 active:scale-98'
                        }`}
                        style={isPlanFree ? {
                          backgroundColor: 'var(--color-inner-dark, #070b13)',
                          borderColor: 'var(--color-border, #1e293b)',
                          color: 'var(--color-text, #f8fafc)'
                        } : {
                          backgroundColor: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>
                          {isPlanFree 
                            ? t('downgradeToFree', 'Downgrade to Free')
                            : (plan.buttonText || `${t('switchToPlan', 'Switch to')} ${plan.name} (${billingInterval === 'YEAR' ? t('annualLabel', 'Annual') : t('monthlyLabel', 'Monthly')})`)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: SUBSCRIPTION & BILLING TRANSACTION HISTORY */}
        <div 
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2.5" style={{ color: 'var(--color-text, #f8fafc)' }}>
                <History className="w-5 h-5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>{t('subscriptionHistoryTitle', 'Subscription History & Invoices')}</span>
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('subscriptionHistorySubtitle', 'Review your recent subscription transactions, renewal status, and invoices.')}
              </p>
            </div>

            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border hover:opacity-80 transition self-start sm:self-auto"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)',
                color: 'var(--color-text, #f8fafc)'
              }}
            >
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('fullInvoicesHub', 'Full Invoices Hub')}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div 
              className="p-8 rounded-2xl border text-center space-y-2"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <FileText className="w-8 h-8 mx-auto opacity-40" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('noTransactions', 'No subscription transactions recorded yet.')}
              </p>
              <p className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('noTransactionsSubtitle', 'When you subscribe or switch plan tiers, payment receipts will automatically appear here.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr 
                    className="border-b font-extrabold uppercase tracking-wider text-[10px]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)',
                      color: 'var(--color-text-secondary, #94a3b8)'
                    }}
                  >
                    <th className="px-4 py-3">{t('tablePlan', 'Plan & Tier')}</th>
                    <th className="px-4 py-3">{t('tableInterval', 'Interval')}</th>
                    <th className="px-4 py-3">{t('tableAmount', 'Amount')}</th>
                    <th className="px-4 py-3">{t('tablePaymentSource', 'Payment Source')}</th>
                    <th className="px-4 py-3">{t('tableStatus', 'Status')}</th>
                    <th className="px-4 py-3">{t('tableDate', 'Date & Period')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  {transactions.map((tx) => {
                    const isSucceeded = ['active', 'succeeded', 'successful', 'paid'].includes(tx.status);
                    const isCanceled = tx.status === 'canceled';

                    return (
                      <tr 
                        key={tx.id}
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{ color: 'var(--color-text, #f8fafc)' }}
                      >
                        <td className="px-4 py-3 font-bold">
                          <div className="flex items-center gap-2">
                            <span>{tx.planName}</span>
                            {tx.autoRenew && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                {t('autoBadge', 'Auto')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-50 font-mono block">ID: {tx.id.substring(0, 14)}...</span>
                        </td>

                        <td className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] opacity-80">
                          {tx.recurringInterval}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                          {tx.currency} {tx.amount.toFixed(2)}
                        </td>

                        <td className="px-4 py-3 font-medium uppercase text-[11px] opacity-75">
                          {tx.gateway?.toLowerCase() === 'wallet' ? (walletConfig.walletName || t('storeWallet', 'Store Wallet')) : tx.gateway}
                        </td>

                        <td className="px-4 py-3">
                          {isSucceeded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                          {isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              <Clock className="w-3 h-3" />
                              <span>{t('canceledStatus', 'Canceled')}</span>
                            </span>
                          )}
                          {!isSucceeded && !isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 opacity-75 text-[11px]">
                          <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                          {tx.expiryDate && (
                            <div className="text-[10px] opacity-60">
                              {t('expiresOn', 'Expires')}: {new Date(tx.expiryDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* DEDICATED STORE WALLET PAYMENT MODAL (DYNAMIC TOKEN ICON SYNC)   */}
        {/* ----------------------------------------------------------------- */}
        {showPaymentModal && pendingPlanPayment && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={() => !processing && setShowPaymentModal(false)}
          >
            <div 
              className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 transition-all duration-200 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--color-card, #0f172a)',
                borderColor: 'var(--color-border, #1e293b)',
                color: 'var(--color-text, #f8fafc)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: 'var(--color-text, #f8fafc)' }}>
                      {t('payWithWalletTitle', 'Subscribe via Store Wallet')}
                    </h3>
                    <p className="text-xs opacity-70" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                      {t('payWithWalletSubtitle', 'Pay and activate your subscription using your available store wallet balance.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processing}
                  className="p-1.5 rounded-xl border border-transparent hover:border-slate-700 hover:bg-white/5 opacity-70 hover:opacity-100 transition cursor-pointer"
                  title={t('closeModal', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Plan Summary Banner */}
              <div 
                className="p-4 rounded-2xl border flex items-center justify-between gap-4"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)'
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                      {pendingPlanPayment.plan.name}
                    </span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {pendingPlanPayment.interval === 'YEAR' ? t('annualLabel', 'Annual') : t('monthlyLabel', 'Monthly')}
                    </span>
                    {pendingPlanPayment.plan.trialBadge && (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {pendingPlanPayment.plan.trialBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-70 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                    <DynamicTokenIcon symbolOrIcon={tokenIdentity.tokenIcon || tokenIdentity.tokenSymbol} className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {pendingPlanPayment.tokensCredited === -1 
                        ? t('unlimitedTokens', 'Unlimited Tokens') 
                        : `+${pendingPlanPayment.tokensCredited.toLocaleString()} ${tokenIdentity.tokenSymbol}`
                      } {t('grantedPerCycle', 'per cycle')}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black font-mono" style={{ color: 'var(--color-emerald, #10b981)' }}>
                    {gatewayConfig.currencySymbol || '$'}{pendingPlanPayment.amount.toFixed(2)}
                  </div>
                  <div className="text-[10px] opacity-60 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                    /{pendingPlanPayment.interval === 'YEAR' ? t('yearLabel', 'year') : t('monthLabel', 'month')}
                  </div>
                </div>
              </div>

              {/* Auto-Renew Subscription Option */}
              <div 
                onClick={() => setAutoRenewChoice(!autoRenewChoice)}
                className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: autoRenewChoice ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border, #1e293b)'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    autoRenewChoice ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-transparent'
                  }`}>
                    {autoRenewChoice && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                      {t('autoRenewSubscription', 'Enable Automatic Subscription Renewal')}
                    </div>
                    <div className="text-[10px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                      {autoRenewChoice 
                        ? t('autoRenewSubscriptionDesc', 'Auto-renews at the end of cycle. Cancel anytime without penalties.') 
                        : t('oneTimeCycleNotice', 'One-time billing period. Will not auto-charge upon expiration.')}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase bg-emerald-500/10 text-emerald-400">
                  {autoRenewChoice ? t('activeOption', 'Auto-ON') : t('inactiveOption', 'One-Off')}
                </span>
              </div>

              {/* Real-time Wallet Deduction Breakdown */}
              <div 
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: isWalletSufficient ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>{walletConfig.walletName || t('storeWalletBalance', 'Store Wallet Balance')}</span>
                  </div>
                  {isWalletSufficient ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{t('walletBalanceSufficient', 'Sufficient Funds')}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{t('insufficientBalanceTag', 'Low Balance')}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center opacity-75">
                    <span>{t('currentBalanceLabel', 'Current Balance:')}</span>
                    <span>{gatewayConfig.currencySymbol || '$'}{userBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400 font-semibold">
                    <span>{t('planCostLabel', 'Subscription Plan Cost:')}</span>
                    <span>-{gatewayConfig.currencySymbol || '$'}{planCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-white/10 font-bold" style={{ color: isWalletSufficient ? 'var(--color-emerald, #10b981)' : '#f59e0b' }}>
                    <span>{t('balanceAfterPurchaseLabel', 'Balance After Activation:')}</span>
                    <span>{gatewayConfig.currencySymbol || '$'}{(userBalance - planCost).toFixed(2)}</span>
                  </div>
                </div>

                {!isWalletSufficient && (
                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-amber-400 leading-tight">
                      {t('walletShortfallMessage', 'Your wallet balance is short by {amount}. Please top up your wallet to activate this plan.')
                        .replace('{amount}', `${gatewayConfig.currencySymbol || '$'}${(planCost - userBalance).toFixed(2)}`)}
                    </p>
                    <Link
                      href="/wallet"
                      onClick={() => setShowPaymentModal(false)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shrink-0"
                    >
                      <span>{t('topUpWalletAction', 'Top Up Wallet')}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer hover:bg-white/5 disabled:opacity-50"
                  style={{
                    borderColor: 'var(--color-border, #1e293b)',
                    color: 'var(--color-text, #f8fafc)'
                  }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>

                <button
                  type="button"
                  disabled={processing || !isWalletSufficient}
                  onClick={() => {
                    executePlanChange(
                      pendingPlanPayment.planSlugWithInterval,
                      pendingPlanPayment.planDisplayName,
                      pendingPlanPayment.amount,
                      pendingPlanPayment.interval,
                      pendingPlanPayment.tokensCredited,
                      'wallet'
                    );
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer text-slate-950 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 active:scale-98"
                  style={{
                    backgroundColor: 'var(--color-emerald, #10b981)'
                  }}
                >
                  {processing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  )}
                  <span>
                    {processing
                      ? t('processingPayment', 'Processing Payment...')
                      : isWalletSufficient
                        ? `${t('payWithWalletAction', 'Confirm & Pay')} (${gatewayConfig.currencySymbol || '$'}${pendingPlanPayment.amount.toFixed(2)})`
                        : t('insufficientFundsAction', 'Insufficient Balance — Top Up Required')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
