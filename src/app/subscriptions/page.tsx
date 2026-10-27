// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Layers, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, 
  Coins, Wallet, RefreshCw, Sparkles, Zap, Lock, Calendar, 
  HelpCircle, ChevronDown, Check, X, Search, ChevronLeft, ChevronRight,
  ExternalLink, CreditCard, Shield, AlertTriangle, Clock, Ban
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  is_free?: boolean;
  isFree?: boolean;
  monthly_price_dollars?: number | string;
  monthlyPrice?: number | string;
  monthlyPriceDollars?: number | string;
  annual_price_dollars?: number | string;
  annualPrice?: number | string;
  annualPriceDollars?: number | string;
  description_monthly?: string;
  descriptionMonthly?: string;
  description_annual?: string;
  descriptionAnnual?: string;
  token_limit?: number;
  tokenLimit?: number;
  recipe_library_limit?: number;
  recipeLibraryLimit?: number;
  ai_recipe_limit?: number;
  aiRecipeLimit?: number;
  can_view_macros?: boolean;
  canViewMacros?: boolean;
  features?: any;
  popular?: boolean;
  trialBadge?: string;
  monthlyBadge?: string;
  annualBadge?: string;
}

interface PaymentTransaction {
  id: string;
  customerName?: string;
  customer_name?: string;
  customerEmail?: string;
  customer_email?: string;
  plan_name?: string;
  planName?: string;
  plan_slug?: string;
  planSlug?: string;
  amount: number | string;
  currency?: string;
  gateway?: string;
  payment_method?: string;
  status?: string;
  is_recurring?: boolean;
  isRecurring?: boolean;
  recurringInterval?: string;
  recurring_interval?: string;
  auto_renew?: boolean;
  autoRenew?: boolean;
  expiry_date?: string;
  expiryDate?: string;
  created_at?: string;
  createdAt?: string;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_taster',
    name: 'Taster',
    slug: 'taster',
    is_free: true,
    monthly_price_dollars: 0,
    annual_price_dollars: 0,
    token_limit: 50,
    trialBadge: 'Free Forever',
    description_monthly: 'Explore foundational culinary features with initial free tokens.',
    description_annual: 'Explore foundational culinary features with initial free tokens.',
    features: ['50 Foodie AI Tokens / month', 'Basic Recipe Generator', 'Standard Ingredient Conversion', 'Community Support']
  },
  {
    id: 'plan_pro',
    name: 'Foodie Pro',
    slug: 'foodie-pro',
    is_free: false,
    monthly_price_dollars: 9.99,
    annual_price_dollars: 95.88,
    token_limit: 600,
    popular: true,
    monthlyBadge: 'Popular',
    annualBadge: 'Save ~20%',
    description_monthly: 'Advanced AI cooking partner with abundant monthly tokens and smart meal planning.',
    description_annual: 'Advanced AI cooking partner with abundant monthly tokens and ~20% annual savings.',
    features: ['600 Foodie AI Tokens / month', 'Unlimited Recipe Storage', 'Advanced Nutritional Macros Tracking', 'Live Culinary Web & Scraping Engine', 'Priority AI Model Access']
  },
  {
    id: 'plan_chef',
    name: 'Master Kitchen',
    slug: 'master-chef',
    is_free: false,
    monthly_price_dollars: 24.99,
    annual_price_dollars: 239.88,
    token_limit: 1800,
    monthlyBadge: 'Pro Chef',
    annualBadge: 'Best Value',
    description_monthly: 'The ultimate culinary suite for food enthusiasts, culinary creators, and chefs.',
    description_annual: 'The ultimate culinary suite for food enthusiasts, culinary creators, and chefs.',
    features: ['1,800 Foodie AI Tokens / month', 'Unlimited Recipe Storage', 'High-Resolution AI Recipe Visualizer', 'Dedicated Priority Processing', '24/7 Dedicated Support']
  }
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥', THB: '฿'
};

function parsePlanFeatures(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (_) {
      return raw.split('\n').map(s => s.trim().replace(/^[•\-\*]\s*/, '')).filter(Boolean);
    }
  }
  return [];
}

function cleanSlug(slug?: string): string {
  if (!slug) return 'taster';
  return String(slug)
    .toLowerCase()
    .trim()
    .replace(/^(preset_|plan_)/, '')
    .replace(/-(monthly|annual|year)$/, '');
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [activeTransaction, setActiveTransaction] = useState<PaymentTransaction | null>(null);

  // Billing Interval: 'monthly' | 'annual'
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  // Balances & Currency
  const [tokenBalance, setTokenBalance] = useState<number>(50);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [tokenIdentity, setTokenIdentity] = useState<{ tokenName: string; tokenSymbol: string }>({ tokenName: 'Tokens', tokenSymbol: '🪙' });

  // Transaction Ledger Filters & Pagination
  const [historySearch, setHistorySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment Selection Modal
  const [targetModalPlan, setTargetModalPlan] = useState<SubscriptionPlan | null>(null);

  // FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const isFetchingRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Normalization helper for incoming transactions
  const normalizeTransaction = (tx: any): PaymentTransaction => ({
    id: tx.id || tx.transaction_id || `tx_${Date.now()}`,
    customerName: tx.customerName || tx.customer_name || tx.userName || '',
    customerEmail: tx.customerEmail || tx.customer_email || tx.userEmail || '',
    plan_name: tx.plan_name || tx.planName || 'Subscription Tier',
    plan_slug: tx.plan_slug || tx.planSlug || '',
    amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0),
    currency: (tx.currency || 'USD').toUpperCase(),
    gateway: tx.gateway || tx.payment_method || 'stripe',
    status: (tx.status || 'succeeded').toLowerCase(),
    is_recurring: Boolean(tx.is_recurring ?? tx.isRecurring ?? true),
    recurring_interval: (tx.recurring_interval ?? tx.recurringInterval ?? 'MONTH').toUpperCase(),
    auto_renew: Boolean(tx.auto_renew ?? tx.autoRenew ?? true),
    expiry_date: tx.expiry_date || tx.expiryDate || tx.subscription_expiry_date,
    created_at: tx.created_at || tx.createdAt || new Date().toISOString()
  });

  // Normalization helper for incoming plans
  const normalizePlan = (plan: any): SubscriptionPlan => ({
    id: plan.id || plan.slug,
    name: plan.name || 'Tier',
    slug: plan.slug || plan.id,
    is_free: Boolean(plan.is_free ?? plan.isFree ?? (plan.monthlyPrice === 0 || plan.monthly_price_dollars === 0)),
    monthly_price_dollars: Number(plan.monthly_price_dollars ?? plan.monthlyPrice ?? plan.monthlyPriceDollars ?? 0),
    annual_price_dollars: Number(plan.annual_price_dollars ?? plan.annualPrice ?? plan.annualPriceDollars ?? 0),
    token_limit: Number(plan.token_limit ?? plan.tokenLimit ?? 500),
    trialBadge: plan.trialBadge || (plan.is_free ? 'Free Tier' : undefined),
    monthlyBadge: plan.monthlyBadge || (plan.popular ? 'Popular' : undefined),
    annualBadge: plan.annualBadge || 'Save ~20%',
    description_monthly: plan.description_monthly || plan.descriptionMonthly || plan.description || '',
    description_annual: plan.description_annual || plan.descriptionAnnual || plan.description || '',
    features: parsePlanFeatures(plan.features),
    popular: Boolean(plan.popular)
  });

  // Fetch plans, user billing info, and balances
  const fetchSubscriptionData = useCallback(async (activeUser: User | null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    const targetUserId = activeUser?.id || 'usr_admin_1';
    const targetEmail = activeUser?.email || 'admin@zecratary.com';

    try {
      if (typeof window !== 'undefined') {
        const cur = localStorage.getItem('zecratary_currency') || 'USD';
        setCurrencySymbol(CURRENCY_SYMBOLS[cur] || '$');
      }

      // 1. Fetch Plans
      try {
        const pRes = await fetch(`/api/admin/plans?t=${Date.now()}`, { cache: 'no-store' });
        if (pRes.ok) {
          const pData = await pRes.json();
          const rawPlans = Array.isArray(pData?.plans) ? pData.plans : (Array.isArray(pData) ? pData : []);
          if (rawPlans.length > 0) {
            setPlans(rawPlans.map(normalizePlan));
          }
        }
      } catch (_) {}

      // 2. Fetch User Billing & Transactions
      try {
        const bRes = await fetch(`/api/billing?email=${encodeURIComponent(targetEmail)}&userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData.success) {
            if (Array.isArray(bData.transactions)) {
              const normalizedTxList = bData.transactions.map(normalizeTransaction);
              setTransactions(normalizedTxList);

              const activeTx = normalizedTxList.find((tx) => 
                ['succeeded', 'active', 'completed', 'canceled'].includes(tx.status) &&
                (!tx.expiry_date || new Date(tx.expiry_date).getTime() > Date.now())
              );

              if (activeTx) {
                setActiveTransaction(activeTx);
                const txSlug = String(activeTx.plan_slug || '').toLowerCase();
                const txIntv = String(activeTx.recurring_interval || '').toUpperCase();
                if (txSlug.includes('annual') || txIntv === 'YEAR' || txIntv === 'ANNUAL') {
                  setBillingInterval('annual');
                } else if (txSlug.includes('monthly') || txIntv === 'MONTH' || txIntv === 'MONTHLY') {
                  setBillingInterval('monthly');
                }
              }
            }

            if (bData.plans && Array.isArray(bData.plans) && bData.plans.length > 0) {
              setPlans(bData.plans.map(normalizePlan));
            }

            if (bData.tokenIdentity) {
              setTokenIdentity(bData.tokenIdentity);
            }

            if (bData.user) {
              if (bData.user.wallet_balance !== undefined) setWalletBalance(Number(bData.user.wallet_balance));
              if (bData.user.token_balance !== undefined) setTokenBalance(Number(bData.user.token_balance));
              if (bData.user.subscription_plan) {
                const uPlan = String(bData.user.subscription_plan).toLowerCase();
                if (uPlan.includes('annual') || uPlan.includes('year')) {
                  setBillingInterval('annual');
                }
              }
            }
          }
        }
      } catch (_) {}

      // 3. Fallback Wallet Balance Check
      try {
        const wRes = await fetch(`/api/wallet?email=${encodeURIComponent(targetEmail)}&userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (wRes.ok) {
          const wData = await wRes.json();
          const wBal = typeof wData.wallet_balance === 'number' 
            ? wData.wallet_balance 
            : (typeof wData.balance === 'number' ? wData.balance : Number(wData.user?.wallet_balance || 0));
          setWalletBalance(wBal);
          if (wData.settings?.currency) setCurrencySymbol(CURRENCY_SYMBOLS[wData.settings.currency] || '$');
        }
      } catch (_) {}

    } catch (err) {
      console.warn('[SubscriptionsPage] Ingestion error:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const fetchRef = useRef(fetchSubscriptionData);
  useEffect(() => {
    fetchRef.current = fetchSubscriptionData;
  });

  useEffect(() => {
    document.title = `${t('subscriptionsTitle', 'Subscription Plans & Membership')} - Zecratary`;
  }, [t]);

  useEffect(() => {
    initAuthStorage();
    const u = getCurrentUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setCurrentUser(u);
    fetchRef.current(u);

    const handleDebouncedSync = () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const active = getCurrentUser();
        if (active) {
          setCurrentUser(active);
          fetchRef.current(active);
        }
      }, 300);
    };

    window.addEventListener('storage', handleDebouncedSync);
    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_plans_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_updated', handleDebouncedSync);
    window.addEventListener('zecratary_tokens_updated', handleDebouncedSync);
    window.addEventListener('zecratary_languages_updated', handleDebouncedSync);
    window.addEventListener('zecratary_dictionary_updated', handleDebouncedSync);
    window.addEventListener('zecratary_locale_changed', handleDebouncedSync);
    window.addEventListener('zecratary_theme_mode_changed', handleDebouncedSync);
    window.addEventListener('zecratary_theme_changed', handleDebouncedSync);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      window.removeEventListener('storage', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_plans_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_tokens_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_languages_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_dictionary_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_locale_changed', handleDebouncedSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleDebouncedSync);
      window.removeEventListener('zecratary_theme_changed', handleDebouncedSync);
    };
  }, []);

  const expiryInfo = useMemo(() => {
    const rawDate = activeTransaction?.expiry_date;
    if (!rawDate) return { isExpired: false, isExpiringSoon: false, daysLeft: null, dateStr: null };

    const expDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isExpired: diffDays < 0,
      isExpiringSoon: diffDays >= 0 && diffDays <= 3,
      daysLeft: Math.max(0, diffDays),
      dateStr: expDate.toLocaleDateString()
    };
  }, [activeTransaction]);

  const activeUserSlug = useMemo(() => {
    return cleanSlug(currentUser?.subscription_plan || activeTransaction?.plan_slug || 'taster');
  }, [currentUser, activeTransaction]);

  const activeUserInterval = useMemo<'monthly' | 'annual'>(() => {
    if (activeTransaction?.recurring_interval) {
      const intv = activeTransaction.recurring_interval.toUpperCase();
      if (intv === 'YEAR' || intv === 'ANNUAL') return 'annual';
      if (intv === 'MONTH' || intv === 'MONTHLY') return 'monthly';
    }
    const raw = String(currentUser?.subscription_plan || activeTransaction?.plan_slug || '').toLowerCase();
    if (raw.includes('annual') || raw.includes('year')) return 'annual';
    return 'monthly';
  }, [currentUser, activeTransaction]);

  const isFreeUser = useMemo(() => {
    return !activeUserSlug || activeUserSlug === 'taster' || activeUserSlug === 'free';
  }, [activeUserSlug]);

  const handleSelectPlanAction = (plan: SubscriptionPlan) => {
    const planBase = cleanSlug(plan.slug);
    const isPlanFree = Boolean(plan.is_free || planBase === 'taster' || plan.monthly_price_dollars === 0);
    const isSameTier = isFreeUser ? isPlanFree : planBase === activeUserSlug;
    const isExactActive = isFreeUser ? isPlanFree : (isSameTier && billingInterval === activeUserInterval);

    if (isExactActive) return;

    if (isPlanFree) {
      executePlanSwitch(plan, 'free', 0);
      return;
    }

    setTargetModalPlan(plan);
  };

  const executePlanSwitch = async (plan: SubscriptionPlan, paymentMethod: string, amountToPay: number) => {
    if (!currentUser) return;
    setSubmitting(true);

    const targetUserId = currentUser.id || 'usr_admin_1';
    const planFullSlug = `${cleanSlug(plan.slug)}-${billingInterval}`;
    const planDisplayName = `${plan.name} (${billingInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly')})`;

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade_plan',
          planName: planDisplayName,
          planSlug: planFullSlug,
          interval: billingInterval === 'annual' ? 'YEAR' : 'MONTH',
          amount: amountToPay,
          currency: 'USD',
          paymentMethod: paymentMethod,
          gateway: paymentMethod,
          email: currentUser.email,
          userEmail: currentUser.email,
          userName: currentUser.name,
          userId: targetUserId,
          tokenLimit: plan.token_limit ?? 500
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('failedSwitchPlan', 'Failed to switch subscription plan'));
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      const updatedUser = {
        ...currentUser,
        subscription_plan: planFullSlug
      };
      setCurrentUser(updatedUser);

      if (paymentMethod === 'wallet' && typeof data.wallet_balance === 'number') {
        setWalletBalance(data.wallet_balance);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      showToast(
        (t('planSelectedSuccessToast', 'Successfully activated {plan}!'))
          .replace('{plan}', plan.name),
        'success'
      );

      setTargetModalPlan(null);
      fetchRef.current(updatedUser);
    } catch (err: any) {
      showToast(err.message || t('failedSwitchPlan', 'Failed to switch subscription plan'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!activeTransaction || !currentUser) return;

    const currentAutoRenew = Boolean(activeTransaction.auto_renew !== false);
    if (currentAutoRenew) {
      if (!confirm(t('confirmCancelSubscriptionPrompt', 'Are you sure you want to cancel auto-renewal? You will retain access until your current billing period ends.'))) {
        return;
      }
    }

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentAutoRenew ? 'cancel_subscription' : 'resume_subscription',
          transactionId: activeTransaction.id,
          autoRenew: !currentAutoRenew,
          email: currentUser.email,
          userEmail: currentUser.email,
          userId: currentUser.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveTransaction(prev => prev ? { ...prev, auto_renew: !currentAutoRenew } : null);
        showToast(
          currentAutoRenew 
            ? t('autoRenewCancelledMsg', 'Auto-renewal has been cancelled.') 
            : t('autoRenewResumedMsg', 'Auto-renewal has been reactivated!'),
          'success'
        );
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
      }
    } catch (_) {}
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const st = (tx.status || 'succeeded').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const pName = (tx.plan_name || '').toLowerCase();
        const gw = (tx.gateway || '').toLowerCase();
        const txId = (tx.id || '').toLowerCase();
        if (!pName.includes(q) && !gw.includes(q) && !txId.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const startIdx = (safeHistoryPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIdx, startIdx + pageSize);

  return (
    <div 
      className="min-h-screen w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 transition-colors duration-200"
      style={{
        boxSizing: 'border-box',
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f8fafc)'
      }}
    >
      <div 
        id="zecratary-subscriptions-canvas" 
        role="region" 
        aria-label={t('subscriptionsTitle', 'Subscription Plans & Membership')}
        data-lpignore="true" 
        className="w-full max-w-full space-y-8"
      >
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div 
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: toastMessage.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
              color: 'var(--color-text, #f8fafc)'
            }}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Layers className="h-7 w-7" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('subscriptionsTitle', 'Subscription Plans & Membership')}</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              {t('subscriptionsSubtitle', 'Manage your active subscription, upgrade tiers, and review billing history.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchRef.current(currentUser)}
              disabled={loading}
              className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80 active:scale-95"
              style={{ 
                backgroundColor: 'var(--color-card, #0f172a)', 
                borderColor: 'var(--color-border, #1e293b)', 
                color: 'var(--color-text, #f8fafc)' 
              }}
              title={t('reloadBtn', 'Refresh Status')}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('reloadBtn', 'Refresh Status')}</span>
            </button>

            <Link
              href="/token"
              className="px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-xs flex items-center gap-1.5 hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--color-card, #0f172a)', 
                borderColor: 'var(--color-border, #1e293b)', 
                color: 'var(--color-text, #f8fafc)' 
              }}
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span>{tokenBalance.toLocaleString()} {tokenIdentity.tokenSymbol}</span>
            </Link>
          </div>
        </div>

        {/* Expiry Alerts */}
        {expiryInfo.isExpiringSoon && (
          <div 
            className="p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: '#f59e0b', color: 'var(--color-text, #f8fafc)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-500">
                  {t('expiringSoonAlertTitle', 'Subscription Expiring Soon')}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {(t('expiringSoonAlertDesc', 'Your subscription will expire in {days} day(s). Renew or upgrade now to maintain uninterrupted access.'))
                    .replace('{days}', String(expiryInfo.daysLeft))}
                </p>
              </div>
            </div>
          </div>
        )}

        {expiryInfo.isExpired && (
          <div 
            className="p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: '#ef4444', color: 'var(--color-text, #f8fafc)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-red-500">
                  {t('expiredAlertTitle', 'Subscription Expired')}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {t('expiredAlertDesc', 'Your subscription has ended. Choose a plan below to restore premium features and token allocations.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: ACCOUNT & MEMBERSHIP OVERVIEW */}
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
                  {t('currentActivePlanBadge', 'Current Active Plan')}
                </span>

                {activeTransaction?.auto_renew !== false && !isFreeUser && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{t('autoRenewEnabled', 'Auto-Renew ON')}</span>
                  </span>
                )}
                {activeTransaction?.auto_renew === false && !isFreeUser && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{t('autoRenewDisabled', 'Renewal Canceled (Active Until Expiry)')}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black capitalize" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {isFreeUser ? 'Taster (Free)' : `${activeUserSlug.replace(/-/g, ' ')} (${activeUserInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly')})`}
              </h2>

              <p className="text-xs opacity-75 flex items-center gap-2" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>
                  {expiryInfo.dateStr && !isFreeUser
                    ? `${t('renewalDateLabel', 'Active period ends on')} ${expiryInfo.dateStr}`
                    : t('freePlanNoExpiry', 'Free Plan — No expiration date')}
                </span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {!isFreeUser && activeTransaction && (
                <button
                  type="button"
                  onClick={handleToggleAutoRenew}
                  disabled={submitting}
                  className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                    activeTransaction.auto_renew !== false 
                      ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' 
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {activeTransaction.auto_renew !== false ? (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>{t('cancelSubscriptionBtn', 'Cancel Auto-Renewal')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('reactivateSubscriptionBtn', 'Reactivate Auto-Renewal')}</span>
                    </>
                  )}
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
                <span>{t('fullInvoicesHub', 'Full Invoices Hub')}</span>
              </Link>
            </div>
          </div>

          {/* Telemetry Overview Cards */}
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
                {currentUser?.name || currentUser?.email || 'Logged-in Member'}
              </div>
              <div className="text-xs opacity-50 truncate" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {currentUser?.email}
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
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('availableTokensLabel', 'Available Tokens')}</span>
              </div>
              <div className="font-bold text-base flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
                <span>{tokenBalance.toLocaleString()}</span>
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
                <span>{t('walletBalanceLabel', 'Store Wallet')}</span>
              </div>
              <div className="font-bold text-base font-mono flex items-center gap-1" style={{ color: 'var(--color-emerald, #10b981)' }}>
                <span>{currencySymbol}</span>
                <span>{walletBalance.toFixed(2)}</span>
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
                {isFreeUser ? '—' : (activeUserInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly'))}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {activeTransaction?.is_recurring ? 'Auto-renew enabled' : 'Single billing cycle'}
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
                <span>{t('paymentGatewayLabel', 'Payment Gateway')}</span>
              </div>
              <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--color-emerald, #10b981)' }}>
                {activeTransaction?.gateway || 'Stripe'}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('pciEncrypted', 'Encrypted via PCI gateway')}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PLAN CATALOG SELECTION */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('subscriptionsTitle', 'Subscription Plans & Membership')}
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('subscriptionsSubtitle', 'Manage your active subscription, upgrade tiers, and review billing history.')}
              </p>
            </div>

            {/* Monthly / Annual Toggle Switch */}
            <div 
              className="p-1 rounded-2xl border flex items-center self-start sm:self-auto shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--color-card, #0f172a)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingInterval === 'monthly' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={billingInterval === 'monthly' ? {
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
                onClick={() => setBillingInterval('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  billingInterval === 'annual' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={billingInterval === 'annual' ? {
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  color: 'var(--color-emerald, #10b981)'
                } : {
                  color: 'var(--color-text-secondary, #94a3b8)'
                }}
              >
                <span>{t('annualBilling', 'Annual Billing')}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t('saveDiscountBadge', 'Save ~20%')}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const planBase = cleanSlug(plan.slug);
              const isPlanFree = Boolean(plan.is_free || planBase === 'taster' || plan.monthly_price_dollars === 0);
              const isSameTier = isFreeUser ? isPlanFree : planBase === activeUserSlug;
              const isExactActive = isFreeUser ? isPlanFree : (isSameTier && billingInterval === activeUserInterval);
              const isMatchingTierOtherInterval = isSameTier && !isExactActive;

              const price = billingInterval === 'annual' ? plan.annual_price_dollars : plan.monthly_price_dollars;
              const badge = isPlanFree 
                ? plan.trialBadge 
                : (billingInterval === 'annual' ? plan.annualBadge : plan.monthlyBadge);
              const featuresList = parsePlanFeatures(plan.features);

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                    isExactActive 
                      ? 'ring-2 ring-emerald-500/90 shadow-2xl shadow-emerald-500/15' 
                      : (isMatchingTierOtherInterval ? 'ring-1 ring-amber-500/50 shadow-md' : 'hover:shadow-lg')
                  }`}
                  style={{
                    backgroundColor: isExactActive 
                      ? 'rgba(16, 185, 129, 0.05)' 
                      : 'var(--color-card, #0f172a)',
                    borderColor: isExactActive 
                      ? 'var(--color-emerald, #10b981)' 
                      : (isMatchingTierOtherInterval ? 'rgba(245, 158, 11, 0.4)' : 'var(--color-border, #1e293b)')
                  }}
                >
                  {/* Badge Ribbon */}
                  {isExactActive ? (
                    <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-lg flex items-center gap-1.5 z-10 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950 text-emerald-500" />
                      <span>{t('currentActivePlanBadge', 'Current Active Plan')}</span>
                    </div>
                  ) : isMatchingTierOtherInterval ? (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1 z-10">
                      <Sparkles className="w-3 h-3 fill-slate-950 text-amber-500" />
                      <span>{(t('subscribedTierBadge', 'Subscribed Tier ({interval})')).replace('{interval}', activeUserInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly'))}</span>
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t('activePlanTag', 'Active Plan')}</span>
                        </span>
                      ) : isMatchingTierOtherInterval ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{t('currentTierTag', 'Current Tier')}</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed min-h-[36px]" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                      {billingInterval === 'annual' ? (plan.description_annual || plan.description_monthly) : plan.description_monthly}
                    </p>

                    {/* Price Tag */}
                    <div className="py-2 border-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--color-text, #f8fafc)' }}>
                          {isPlanFree ? '0.00' : `${currencySymbol}${Number(price || 0).toFixed(2)}`}
                        </span>
                        {!isPlanFree && (
                          <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                            {billingInterval === 'annual' ? t('perYear', '/ year') : t('perMonth', '/ month')}
                          </span>
                        )}
                      </div>

                      {/* Token Allowance Tag */}
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{(plan.token_limit ?? (isPlanFree ? 50 : 500)).toLocaleString()} {tokenIdentity.tokenSymbol} / {billingInterval === 'annual' && !isPlanFree ? 'year' : 'month'}</span>
                      </div>
                    </div>

                    {/* Features Matrix */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                        {t('includedFeaturesLabel', 'Included Features')}:
                      </span>
                      <ul className="space-y-2 text-xs">
                        {featuresList.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                            <span style={{ color: 'var(--color-text, #f8fafc)' }}>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Action Button */}
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
                        <span>{t('currentPlanBtn', 'Current Active Plan')}</span>
                      </button>
                    ) : isMatchingTierOtherInterval && !isPlanFree ? (
                      <button
                        type="button"
                        onClick={() => handleSelectPlanAction(plan)}
                        disabled={submitting}
                        className="w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md text-white hover:opacity-90 active:scale-98 disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                        <span>
                          {billingInterval === 'annual' 
                            ? (t('switchIntervalBtn', 'Switch to {interval} Billing')).replace('{interval}', t('annualBilling', 'Annual'))
                            : (t('switchIntervalBtn', 'Switch to {interval} Billing')).replace('{interval}', t('monthlyBilling', 'Monthly'))}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectPlanAction(plan)}
                        disabled={submitting}
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
                        <ArrowRight className="w-4 h-4" />
                        <span>
                          {isPlanFree 
                            ? t('downgradeFreeBtn', 'Switch to Free Tier')
                            : (t('upgradePlanBtn', 'Upgrade to {plan}')).replace('{plan}', plan.name)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: SUBSCRIPTION TRANSACTION HISTORY LEDGER */}
        <div 
          role="region"
          data-lpignore="true"
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2.5" style={{ color: 'var(--color-text, #f8fafc)' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>{t('subscriptionHistoryHeading', 'Subscription Transaction History')}</span>
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('noHistorySubtitle', 'When you subscribe or switch plan tiers, payment receipts will automatically appear here.')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 pointer-events-none opacity-60" />
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('searchHistoryPlaceholder', 'Search transactions by plan, gateway, or ID...')}
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  className="pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none font-medium w-48 sm:w-64"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
              >
                <option value="all">{t('allStatuses', 'All Statuses')}</option>
                <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
                <option value="canceled">{t('statusCanceled', 'Canceled')}</option>
                <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
                <option value="failed">{t('statusFailed', 'Failed')}</option>
              </select>
            </div>
          </div>

          {paginatedTransactions.length === 0 ? (
            <div 
              className="p-8 rounded-2xl border text-center space-y-2"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <CreditCard className="w-8 h-8 mx-auto opacity-40" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('noHistoryFound', 'No subscription transactions recorded yet.')}
              </p>
              <p className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('noHistorySubtitle', 'When you subscribe or switch plan tiers, payment receipts will automatically appear here.')}
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
                    <th className="px-4 py-3">{t('colDate', 'Date')}</th>
                    <th className="px-4 py-3">{t('colPlan', 'Plan Tier')}</th>
                    <th className="px-4 py-3">{t('colInterval', 'Interval')}</th>
                    <th className="px-4 py-3">{t('colGateway', 'Gateway')}</th>
                    <th className="px-4 py-3">{t('colStatus', 'Status')}</th>
                    <th className="px-4 py-3 text-right">{t('colAmount', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  {paginatedTransactions.map((tx) => {
                    const isSuccess = ['active', 'succeeded', 'successful', 'paid'].includes(tx.status || '');
                    const isCanceled = (tx.status || '').toLowerCase() === 'canceled';

                    return (
                      <tr 
                        key={tx.id}
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{ color: 'var(--color-text, #f8fafc)' }}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] opacity-75">
                          {new Date(tx.created_at || '').toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <div className="flex items-center gap-2">
                            <span>{tx.plan_name}</span>
                            {tx.auto_renew && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                Auto
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-50 font-mono block">ID: {tx.id.substring(0, 14)}...</span>
                        </td>

                        <td className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] opacity-80">
                          {tx.recurring_interval}
                        </td>

                        <td className="px-4 py-3 font-medium uppercase text-[11px] opacity-75">
                          {tx.gateway}
                        </td>

                        <td className="px-4 py-3">
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                          {isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              <Clock className="w-3 h-3" />
                              <span>{t('statusCanceled', 'Canceled')}</span>
                            </span>
                          )}
                          {!isSuccess && !isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertCircle className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                          {currencySymbol}{Number(tx.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t text-xs" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <span className="opacity-75">
                {(t('showingTransactionsRange', 'Showing {start} - {end} of {total} transactions'))
                  .replace('{start}', String(startIdx + 1))
                  .replace('{end}', String(Math.min(startIdx + pageSize, filteredTransactions.length)))
                  .replace('{total}', String(filteredTransactions.length))}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage(Math.max(1, safeHistoryPage - 1))}
                  disabled={safeHistoryPage === 1}
                  className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  title={t('prevPage', 'Previous')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPage(Math.min(totalHistoryPages, safeHistoryPage + 1))}
                  disabled={safeHistoryPage === totalHistoryPages}
                  className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  title={t('nextPage', 'Next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: FAQ ACCORDION */}
        <div 
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-4 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-emerald, #10b981)' }}>
            {t('faqTitle', 'Frequently Asked Questions')}
          </h3>

          <div className="space-y-2.5">
            {[
              { q: t('faqTokensQuestion', 'Do unused AI tokens roll over each month?'), a: t('faqTokensAnswer', 'Yes! Monthly plan token allocations are credited to your persistent token balance and remain available as long as your account is active.') },
              { q: t('faqCancelQuestion', 'Can I change or cancel my plan at any time?'), a: t('faqCancelAnswer', 'Absolutely. You can switch between Monthly and Annual billing or cancel auto-renewal at any time. When canceling, you retain full access until the end of your billing cycle.') }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="border rounded-2xl overflow-hidden transition"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs leading-relaxed opacity-80 pt-1 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PAYMENT METHOD SELECTION MODAL (Zero-Form Accessible Container) */}
        {targetModalPlan && (
          <div 
            onClick={() => setTargetModalPlan(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              role="region"
              data-lpignore="true"
              className="border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
            >
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-emerald, #10b981)' }}>
                  {t('walletDeductionModalTitle', 'Confirm Subscription Payment')}
                </h3>
                <button type="button" onClick={() => setTargetModalPlan(null)} className="p-1 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs opacity-80 leading-relaxed">
                  {(t('confirmSubscriptionPaymentDesc', 'You are subscribing to {plan} ({interval}). Select your preferred payment method.'))
                    .replace('{plan}', targetModalPlan.name)
                    .replace('{interval}', billingInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly'))}
                </p>

                {(() => {
                  const planPrice = billingInterval === 'annual'
                    ? Number(targetModalPlan.annual_price_dollars || 0)
                    : Number(targetModalPlan.monthly_price_dollars || 0);

                  const hasWalletFunds = walletBalance >= planPrice;

                  return (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                        <div className="flex justify-between items-center font-bold">
                          <span>{t('totalDue', 'Total Due')}:</span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            {currencySymbol}{planPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] opacity-75">
                          <span>{t('storeWalletBalance', 'Your Store Wallet Balance')}:</span>
                          <span className="font-mono font-bold">{currencySymbol}{walletBalance.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Store Wallet Payment */}
                      <button
                        type="button"
                        disabled={!hasWalletFunds || submitting}
                        onClick={() => executePlanSwitch(targetModalPlan, 'wallet', planPrice)}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-between px-4 transition cursor-pointer border shadow-sm ${
                          hasWalletFunds ? 'hover:border-emerald-500' : 'opacity-40 cursor-not-allowed'
                        }`}
                        style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                      >
                        <span className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-emerald-400" />
                          <span>{t('payWithWalletBtn', 'Pay with Store Wallet')}</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-400">{currencySymbol}{planPrice.toFixed(2)}</span>
                      </button>

                      {!hasWalletFunds && (
                        <div className="p-2.5 rounded-xl border text-[10px] text-amber-500 flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: '#f59e0b' }}>
                          <span>Insufficient wallet balance.</span>
                          <Link href={`/wallet?amount=${(planPrice - walletBalance).toFixed(2)}`} className="font-bold underline">
                            {t('topUpWalletBtn', 'Top Up Wallet')}
                          </Link>
                        </div>
                      )}

                      {/* External Gateway / Stripe */}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => executePlanSwitch(targetModalPlan, 'stripe', planPrice)}
                        className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>{(t('payWithGatewayBtn', 'Pay with {gateway}')).replace('{gateway}', 'Credit Card / Stripe')}</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  <button
                    type="button"
                    onClick={() => setTargetModalPlan(null)}
                    className="px-4 py-2 border rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    {t('cancelBtn', 'Cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
