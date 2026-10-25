'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Layers, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, 
  Coins, Wallet, RefreshCw, Sparkles, Zap, Lock, Calendar, 
  HelpCircle, ChevronDown, Check, X, Search, ChevronLeft, ChevronRight,
  ExternalLink, CreditCard, Shield, AlertTriangle
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
  monthlyPriceDollars?: number | string;
  annual_price_dollars?: number | string;
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
}

interface PaymentTransaction {
  id: string;
  plan_name?: string;
  planName?: string;
  plan_slug?: string;
  planSlug?: string;
  amount: number | string;
  currency?: string;
  gateway?: string;
  status?: string;
  is_recurring?: boolean;
  isRecurring?: boolean;
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
    recipe_library_limit: 25,
    ai_recipe_limit: 5,
    can_view_macros: false,
    description_monthly: 'Explore foundational culinary features with initial free tokens.',
    description_annual: 'Explore foundational culinary features with initial free tokens.',
    features: ['5 AI Chef Recipes / month', '25 Saved Recipe Library Limit', 'Basic Nutritional Breakdown']
  },
  {
    id: 'plan_pro',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro',
    is_free: false,
    monthly_price_dollars: 9.99,
    annual_price_dollars: 95.88, // $7.99/mo equivalent
    token_limit: 500,
    recipe_library_limit: 500,
    ai_recipe_limit: 100,
    can_view_macros: true,
    popular: true,
    description_monthly: 'Full nutritional macros, weekly planning, and abundant AI Chef generation quotas.',
    description_annual: 'Full nutritional macros, weekly planning, and abundant AI Chef generation quotas with ~20% annual savings.',
    features: ['500 Tokens / month', 'Unlimited Recipe Storage', 'Advanced Nutritional Macros Tracking', 'Live Culinary Web & Scraping Engine']
  },
  {
    id: 'plan_gourmet',
    name: 'Chef Master',
    slug: 'chef-master',
    is_free: false,
    monthly_price_dollars: 19.99,
    annual_price_dollars: 191.88,
    token_limit: 1500,
    recipe_library_limit: 2000,
    ai_recipe_limit: 500,
    can_view_macros: true,
    description_monthly: 'Maximum AI generation tokens, high-priority processing, and community features.',
    description_annual: 'Maximum AI generation tokens, high-priority processing, and community features.',
    features: ['1500 Tokens / month', 'Unlimited Recipe Storage', 'Advanced Nutritional Macros Tracking', 'Unlimited AI Chef Access', 'Priority Support']
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
    .replace(/^preset_/, '')
    .replace(/^plan_/, '')
    .replace(/-monthly$/, '')
    .replace(/-annual$/, '');
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [activeTransaction, setActiveTransaction] = useState<PaymentTransaction | null>(null);

  // Interval Toggle: 'monthly' | 'annual'
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  // Balances & Currency
  const [tokenBalance, setTokenBalance] = useState<number>(50);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // Transaction History Filter & Pagination
  const [historySearch, setHistorySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upgrade / Payment Selection Modal State
  const [targetModalPlan, setTargetModalPlan] = useState<SubscriptionPlan | null>(null);

  // FAQ Accordion Toggle State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Re-entrancy and event throttle guards
  const isFetchingRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // 1. Fetch Plans, User Billing Status & Invoices
  const fetchSubscriptionData = useCallback(async (activeUser: User | null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    const targetUserId = activeUser?.id || 'usr_admin_1';
    const targetEmail = activeUser?.email || 'admin@zecratary.com';

    try {
      // Dynamic currency
      if (typeof window !== 'undefined') {
        const cur = localStorage.getItem('zecratary_currency') || 'USD';
        setCurrencySymbol(CURRENCY_SYMBOLS[cur] || '$');
      }

      // Fetch Plans from /api/admin/plans
      try {
        const pRes = await fetch(`/api/admin/plans?t=${Date.now()}`, { cache: 'no-store' });
        if (pRes.ok) {
          const pData = await pRes.json();
          const planList = Array.isArray(pData?.plans) ? pData.plans : (Array.isArray(pData) ? pData : []);
          if (planList.length > 0) {
            setPlans(planList);
          }
        }
      } catch (_) {}

      // Fetch User Billing Info, Token/Wallet Balances & Invoices
      try {
        const bRes = await fetch(`/api/billing?email=${encodeURIComponent(targetEmail)}&userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData.success) {
            if (Array.isArray(bData.transactions)) {
              setTransactions(bData.transactions);
              // Identify latest active transaction
              const activeTx = bData.transactions.find((tx: any) => {
                const st = (tx.status || '').toLowerCase();
                return st === 'succeeded' || st === 'active' || st === 'completed';
              });
              if (activeTx) {
                setActiveTransaction(activeTx);
                // Align interval toggle with user's active interval
                const txSlug = String(activeTx.plan_slug || activeTx.planSlug || '').toLowerCase();
                if (txSlug.includes('annual')) {
                  setBillingInterval('annual');
                } else if (txSlug.includes('monthly')) {
                  setBillingInterval('monthly');
                }
              }
            }
            if (bData.user) {
              if (bData.user.wallet_balance !== undefined) setWalletBalance(Number(bData.user.wallet_balance));
              if (bData.user.token_balance !== undefined) setTokenBalance(Number(bData.user.token_balance));
            }
          }
        }
      } catch (_) {}

      // Direct Token & Wallet Balance Hydration
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
      console.warn('[SubscriptionsPage] Read error:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Stable ref for fetchSubscriptionData to eliminate hook cascades
  const fetchRef = useRef(fetchSubscriptionData);
  useEffect(() => {
    fetchRef.current = fetchSubscriptionData;
  });

  // Isolated Document Title Effect
  useEffect(() => {
    document.title = `${t('subscriptionsTitle', 'Subscription Plans & Membership')} - Zecratary`;
  }, [t]);

  // Initial Mount Effect
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
    };
  }, []); // Mount strictly once: []

  // Check Expiry Urgency
  const expiryInfo = useMemo(() => {
    const rawDate = activeTransaction?.expiry_date || activeTransaction?.expiryDate;
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

  // Determine Active User Plan
  const activeUserSlug = useMemo(() => {
    return cleanSlug(currentUser?.subscription_plan || activeTransaction?.plan_slug || activeTransaction?.planSlug || 'taster');
  }, [currentUser, activeTransaction]);

  const activeUserInterval = useMemo<'monthly' | 'annual'>(() => {
    const raw = String(activeTransaction?.plan_slug || activeTransaction?.planSlug || '').toLowerCase();
    if (raw.includes('annual')) return 'annual';
    return 'monthly';
  }, [activeTransaction]);

  // Execute Plan Selection / Upgrade Action
  const handleSelectPlanAction = (plan: SubscriptionPlan) => {
    const planBase = cleanSlug(plan.slug);
    const isSameTier = planBase === activeUserSlug;
    const isSameInterval = isSameTier && billingInterval === activeUserInterval;

    if (isSameInterval) return; // Already on this exact plan and interval

    const isFree = Boolean(plan.is_free || plan.isFree || planBase === 'taster' || plan.monthly_price_dollars === 0);

    // If switching to Free tier, perform instant downgrade
    if (isFree) {
      executePlanSwitch(plan, 'free', 0);
      return;
    }

    // Open Payment Choice Modal for Paid Tiers
    setTargetModalPlan(plan);
  };

  const executePlanSwitch = async (plan: SubscriptionPlan, paymentMethod: string, amountToPay: number) => {
    if (!currentUser) return;
    setSubmitting(true);

    const targetUserId = currentUser.id || 'usr_admin_1';
    const planFullSlug = `${cleanSlug(plan.slug)}-${billingInterval}`;

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade_plan',
          planName: plan.name,
          planSlug: planFullSlug,
          interval: billingInterval === 'annual' ? 'YEAR' : 'MONTH',
          amount: amountToPay,
          currency: 'USD',
          paymentMethod: paymentMethod, // 'wallet' | 'stripe' | 'free'
          userEmail: currentUser.email,
          userId: targetUserId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      // If gateway returns Stripe Checkout URL
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Update Local State & Broadcast
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
        window.dispatchEvent(new Event('storage'));
      }

      showToast(
        (t('planSelectedSuccessToast', 'Successfully switched to {plan}!'))
          .replace('{plan}', plan.name),
        'success'
      );

      setTargetModalPlan(null);
      fetchRef.current(updatedUser);
    } catch (err: any) {
      showToast(err.message || 'Error switching plan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Auto-Renewal
  const handleToggleAutoRenew = async () => {
    if (!activeTransaction || !currentUser) return;

    const currentAutoRenew = Boolean(activeTransaction.auto_renew ?? activeTransaction.autoRenew ?? true);
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
          action: 'toggle_autorenew',
          transactionId: activeTransaction.id,
          autoRenew: !currentAutoRenew,
          userEmail: currentUser.email,
          userId: currentUser.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveTransaction(prev => prev ? { ...prev, auto_renew: !currentAutoRenew, autoRenew: !currentAutoRenew } : null);
        showToast(t('autoRenewUpdatedToast', 'Auto-renewal preference updated.'), 'success');
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      }
    } catch (_) {}
  };

  // Filtered Transaction History Pipeline
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const st = (tx.status || 'succeeded').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const pName = (tx.plan_name || tx.planName || '').toLowerCase();
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
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toastMessage.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: 'var(--color-text)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('subscriptionsTitle', 'Subscription Plans & Membership')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('subscriptionsSubtitle', 'Manage your active subscription, upgrade tiers, and review billing history.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRef.current(currentUser)}
            disabled={loading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('reloadBtn', 'Reload')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('reloadBtn', 'Reload')}</span>
          </button>

          <Link
            href="/token"
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-xs flex items-center gap-1.5 hover:opacity-80"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Coins className="h-4 w-4 text-amber-500" />
            <span>{tokenBalance} 🪙</span>
          </Link>
        </div>
      </div>

      {/* Renewal / Grace Period Alert Banners */}
      {expiryInfo.isExpiringSoon && (
        <div 
          className="p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
          style={{ backgroundColor: 'var(--color-card)', borderColor: '#f59e0b', color: 'var(--color-text)' }}
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
          style={{ backgroundColor: 'var(--color-card)', borderColor: '#ef4444', color: 'var(--color-text)' }}
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

      {/* 1. Account & Membership Overview Strip */}
      <div 
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
            {t('accountSummaryHeading', 'Membership Overview')}
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {currencySymbol}{walletBalance.toFixed(2)} Store Wallet
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('accountLabel', 'Account')}</span>
            <span className="font-bold truncate block">{currentUser?.email || 'Chef'}</span>
          </div>

          <div className="p-3.5 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('activePlanLabel', 'Active Plan')}</span>
            <span className="font-extrabold capitalize text-[var(--color-primary)] block">
              {activeUserSlug.replace(/-/g, ' ')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('billingIntervalLabel', 'Billing Interval')}</span>
            <span className="font-bold capitalize block">
              {activeUserSlug === 'taster' ? '—' : activeUserInterval}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('renewalDateLabel', 'Renewal / Expiry Date')}</span>
            <span className="font-bold block">
              {expiryInfo.dateStr || t('freePlanNoExpiry', 'Free Plan — No expiration date')}
            </span>
          </div>
        </div>

        {/* Auto-Renewal Control */}
        {activeUserSlug !== 'taster' && activeTransaction && (
          <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold">{t('autoRenewLabel', 'Auto-Renewal')}:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] border ${
                activeTransaction.auto_renew !== false ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-500 border-amber-500/30 bg-amber-500/10'
              }`}>
                {activeTransaction.auto_renew !== false ? t('autoRenewEnabled', 'Enabled (Active)') : t('autoRenewDisabled', 'Disabled (Cancels on Expiry)')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoRenew}
              className="text-xs font-bold hover:underline cursor-pointer"
              style={{ color: activeTransaction.auto_renew !== false ? '#ef4444' : 'var(--color-emerald)' }}
            >
              {activeTransaction.auto_renew !== false ? t('cancelSubscriptionBtn', 'Cancel Auto-Renewal') : t('reactivateSubscriptionBtn', 'Reactivate Auto-Renewal')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Billing Interval Switcher */}
      <div className="flex justify-center pt-2">
        <div 
          className="flex items-center p-1.5 rounded-2xl border shadow-xs"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={() => setBillingInterval('monthly')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              billingInterval === 'monthly' ? 'text-white shadow' : 'opacity-60 hover:opacity-100'
            }`}
            style={billingInterval === 'monthly' ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            {t('monthlyBilling', 'Monthly Billing')}
          </button>

          <button
            type="button"
            onClick={() => setBillingInterval('annual')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              billingInterval === 'annual' ? 'text-white shadow' : 'opacity-60 hover:opacity-100'
            }`}
            style={billingInterval === 'annual' ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            <span>{t('annualBilling', 'Annual Billing')}</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 border border-emerald-500/30">
              {t('saveDiscountBadge', 'Save ~20%')}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Tier Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map(plan => {
          const planBase = cleanSlug(plan.slug);
          const isSameTier = planBase === activeUserSlug;
          const isExactActive = isSameTier && (plan.is_free || plan.isFree || planBase === 'taster' || billingInterval === activeUserInterval);
          const isSubscribedAlternateInterval = isSameTier && !isExactActive;

          const isFree = Boolean(plan.is_free || plan.isFree || planBase === 'taster' || plan.monthly_price_dollars === 0);
          const rawPrice = billingInterval === 'annual' 
            ? (plan.annual_price_dollars || plan.annualPriceDollars || 0)
            : (plan.monthly_price_dollars || plan.monthlyPriceDollars || 0);
          const displayPrice = isFree ? '0.00' : Number(rawPrice).toFixed(2);
          const featuresList = parsePlanFeatures(plan.features);

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 border flex flex-col justify-between space-y-5 transition-all duration-200 relative ${
                isExactActive 
                  ? 'ring-2 ring-emerald-500/90 border-emerald-500 shadow-2xl shadow-emerald-500/15' 
                  : plan.popular 
                    ? 'border-[var(--color-primary)] shadow-md' 
                    : 'shadow-xs hover:shadow-md'
              }`}
              style={{
                backgroundColor: isExactActive ? 'var(--color-inner-dark)' : 'var(--color-card)',
                borderColor: isExactActive ? 'var(--color-emerald)' : plan.popular ? 'var(--color-primary)' : 'var(--color-border)'
              }}
            >
              <div className="space-y-4">
                {/* Header Tag Ribbons */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
                    {plan.name}
                  </span>

                  {isExactActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 border border-emerald-500/30">
                      {t('currentActivePlanBadge', 'Current Active Plan')}
                    </span>
                  ) : isSubscribedAlternateInterval ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/20 border border-amber-500/30">
                      {(t('subscribedTierBadge', 'Subscribed Tier ({interval})')).replace('{interval}', activeUserInterval)}
                    </span>
                  ) : plan.popular ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white bg-[var(--color-primary)]">
                      {t('popularPlanBadge', 'Most Popular')}
                    </span>
                  ) : isFree ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider opacity-60 border" style={{ borderColor: 'var(--color-border)' }}>
                      {t('freeTierBadge', 'Free Forever')}
                    </span>
                  ) : null}
                </div>

                {/* Pricing Display */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl sm:text-4xl font-black">
                      {currencySymbol}{displayPrice}
                    </span>
                    <span className="text-xs opacity-75 font-sans">
                      {isFree ? '' : billingInterval === 'annual' ? t('perYear', '/ year') : t('perMonth', '/ month')}
                    </span>
                  </div>
                  <p className="text-xs opacity-75 leading-relaxed min-h-[36px]">
                    {billingInterval === 'annual' 
                      ? (plan.description_annual || plan.descriptionAnnual || plan.description_monthly || plan.descriptionMonthly)
                      : (plan.description_monthly || plan.descriptionMonthly)}
                  </p>
                </div>

                {/* Included Features List */}
                <div className="pt-3 border-t space-y-2.5 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                    {t('includedFeaturesLabel', 'Included Features')}:
                  </span>
                  <ul className="space-y-2">
                    {featuresList.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 leading-relaxed">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="opacity-90">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="button"
                  onClick={() => handleSelectPlanAction(plan)}
                  disabled={isExactActive || submitting}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow ${
                    isExactActive 
                      ? 'border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 cursor-not-allowed opacity-90' 
                      : 'text-white hover:opacity-90'
                  }`}
                  style={!isExactActive ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  {isExactActive ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t('currentPlanBtn', 'Current Active Plan')}</span>
                    </>
                  ) : isSubscribedAlternateInterval ? (
                    <span>{(t('switchIntervalBtn', 'Switch to {interval} Billing')).replace('{interval}', billingInterval)}</span>
                  ) : isFree ? (
                    <span>{t('downgradeFreeBtn', 'Switch to Free Tier')}</span>
                  ) : (
                    <>
                      <span>{(t('upgradePlanBtn', 'Upgrade to {plan}')).replace('{plan}', plan.name)}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Subscription & Invoice History Ledger */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
            {t('subscriptionHistoryHeading', 'Subscription Transaction History')}
          </h3>

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
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(1); }}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="all">{t('allStatuses', 'All Statuses')}</option>
              <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
              <option value="canceled">{t('statusCanceled', 'Canceled')}</option>
              <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
              <option value="failed">{t('statusFailed', 'Failed')}</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {paginatedTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs opacity-50">
              {t('noHistoryFound', 'No subscription transactions found.')}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold opacity-70" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="py-2.5 px-3">{t('colDate', 'Date')}</th>
                  <th className="py-2.5 px-3">{t('colPlan', 'Plan Tier')}</th>
                  <th className="py-2.5 px-3">{t('colInterval', 'Interval')}</th>
                  <th className="py-2.5 px-3">{t('colGateway', 'Gateway')}</th>
                  <th className="py-2.5 px-3">{t('colStatus', 'Status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colAmount', 'Amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {paginatedTransactions.map(tx => {
                  const st = (tx.status || 'succeeded').toLowerCase();
                  const isSuccess = st === 'succeeded' || st === 'active';
                  const isCancel = st === 'canceled' || st === 'cancelled';
                  const isRefund = st === 'refunded';
                  const rawDate = tx.created_at || tx.createdAt || new Date().toISOString();

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-3 font-mono text-[11px] opacity-75">
                        {new Date(rawDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-bold capitalize">
                        {tx.plan_name || tx.planName || cleanSlug(tx.plan_slug || tx.planSlug)}
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-mono opacity-70">
                        {tx.plan_slug?.includes('annual') || tx.planSlug?.includes('annual') ? 'Annual' : 'Monthly'}
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold opacity-70">
                        {tx.gateway || 'Stripe'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isSuccess 
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                            : isCancel || isRefund 
                              ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' 
                              : 'text-red-400 border-red-500/30 bg-red-500/10'
                        }`}>
                          {tx.status || 'Succeeded'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {currencySymbol}{Number(tx.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalHistoryPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t text-xs" style={{ borderColor: 'var(--color-border)' }}>
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
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                title={t('prevPage', 'Previous')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setHistoryPage(Math.min(totalHistoryPages, safeHistoryPage + 1))}
                disabled={safeHistoryPage === totalHistoryPages}
                className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                title={t('nextPage', 'Next')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. FAQ Accordion Guide */}
      <div 
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
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
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
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
                  <div className="px-4 pb-4 text-xs leading-relaxed opacity-80 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PAYMENT METHOD SELECTION MODAL (Autofill Safe Container) */}
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
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
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
                  .replace('{interval}', billingInterval)}
              </p>

              {/* Price Calculation Card */}
              {(() => {
                const planPrice = billingInterval === 'annual'
                  ? Number(targetModalPlan.annual_price_dollars || targetModalPlan.annualPriceDollars || 0)
                  : Number(targetModalPlan.monthly_price_dollars || targetModalPlan.monthlyPriceDollars || 0);

                const hasWalletFunds = walletBalance >= planPrice;

                return (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                      <div className="flex justify-between items-center font-bold">
                        <span>Total Due:</span>
                        <span className="text-base font-black font-mono text-[var(--color-primary)]">
                          {currencySymbol}{planPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] opacity-75">
                        <span>Your Store Wallet Balance:</span>
                        <span className="font-mono font-bold">{currencySymbol}{walletBalance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Choice 1: Store Wallet */}
                    <button
                      type="button"
                      disabled={!hasWalletFunds || submitting}
                      onClick={() => executePlanSwitch(targetModalPlan, 'wallet', planPrice)}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-between px-4 transition cursor-pointer border shadow-sm ${
                        hasWalletFunds ? 'hover:border-emerald-500' : 'opacity-40 cursor-not-allowed'
                      }`}
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-400" />
                        <span>{t('payWithWalletBtn', 'Pay with Store Wallet')}</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-400">{currencySymbol}{planPrice.toFixed(2)}</span>
                    </button>

                    {!hasWalletFunds && (
                      <div className="p-2.5 rounded-xl border text-[10px] text-amber-500 flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: '#f59e0b' }}>
                        <span>Insufficient wallet funds.</span>
                        <Link href={`/wallet?amount=${(planPrice - walletBalance).toFixed(2)}`} className="font-bold underline">
                          {t('topUpWalletBtn', 'Top Up Wallet')}
                        </Link>
                      </div>
                    )}

                    {/* Choice 2: Stripe / External Gateway */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => executePlanSwitch(targetModalPlan, 'stripe', planPrice)}
                      className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>{(t('payWithGatewayBtn', 'Pay with {gateway}')).replace('{gateway}', 'Credit Card / Stripe')}</span>
                    </button>
                  </div>
                );
              })()}

              <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setTargetModalPlan(null)}
                  className="px-4 py-2 border rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
