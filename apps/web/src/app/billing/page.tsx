// Generated / Updated by AI Collaborator
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CreditCard, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  Calendar,
  Sparkles,
  Ban,
  Building,
  Check,
  Coins,
  Zap
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

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
  monthlyBadge?: string;
  annualBadge?: string;
  trialBadge?: string;
  description: string;
  features?: string[];
  isFree?: boolean;
}

interface TokenIdentity {
  tokenName: string;
  tokenSymbol: string;
}

export default function UserBillingPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [activeTab, setActiveTab] = useState<'history' | 'methods' | 'subscriptions'>('history');
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plans, setPlans] = useState<PlanCatalog[]>([]);
  const [tokenIdentity, setTokenIdentity] = useState<TokenIdentity>({ tokenName: 'Tokens', tokenSymbol: '🪙' });
  const [gatewayConfig, setGatewayConfig] = useState<any>({
    activeGateway: 'stripe',
    currency: 'USD',
    currencySymbol: '$',
    stripe: { enabled: true },
    paypal: { enabled: true },
    manual: { enabled: true }
  });

  const [selectedMethod, setSelectedMethod] = useState<string>('stripe');

  // Search & Pagination for History Tab
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);

  // Search & Pagination for Subscriptions Tab
  const [planSearch, setPlanSearch] = useState('');
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(4);

  // Theme Sync
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const mode = localStorage.getItem('zecratary_theme_mode');
        setIsDayMode(mode === 'light' || mode === 'day');
      }
    };
    checkTheme();
    window.addEventListener('zecratary_theme_mode_changed', checkTheme);
    return () => window.removeEventListener('zecratary_theme_mode_changed', checkTheme);
  }, []);

  // Fetch initial data with active user session detection
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let emailParam = '';
      if (typeof window !== 'undefined') {
        try {
          const storedUser = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user') || localStorage.getItem('currentUser');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.email) emailParam = `?email=${encodeURIComponent(parsed.email)}`;
          }
        } catch (_) {}
      }

      const res = await fetch(`/api/billing${emailParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setTransactions(data.transactions || []);
          setGatewayConfig(data.gatewayConfig || {});
          setPlans(data.plans || []);
          if (data.tokenIdentity) {
            setTokenIdentity(data.tokenIdentity);
          }
          if (data.user?.payment_method) {
            setSelectedMethod(data.user.payment_method);
          }
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to load billing data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleSyncEvents = () => {
      fetchData();
    };

    window.addEventListener('zecratary_payment_updated', handleSyncEvents);
    window.addEventListener('zecratary_plans_updated', handleSyncEvents);
    window.addEventListener('zecratary_users_updated', handleSyncEvents);
    window.addEventListener('zecratary_token_settings_updated', handleSyncEvents);

    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSyncEvents);
      window.removeEventListener('zecratary_plans_updated', handleSyncEvents);
      window.removeEventListener('zecratary_users_updated', handleSyncEvents);
      window.removeEventListener('zecratary_token_settings_updated', handleSyncEvents);
    };
  }, [fetchData]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const activeTransaction = useMemo(() => {
    return transactions.find(
      (tx) => (tx.status === 'succeeded' || tx.status === 'successful' || tx.status === 'paid' || tx.status === 'canceled') &&
              (!tx.expiryDate || new Date(tx.expiryDate).getTime() > Date.now())
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return transactions.filter((tx) => {
      const matchesText = !q || 
        (tx.id && tx.id.toLowerCase().includes(q)) || 
        (tx.planName && tx.planName.toLowerCase().includes(q)) || 
        (tx.gateway && tx.gateway.toLowerCase().includes(q));

      const s = (tx.status || '').toLowerCase().trim();
      const filter = historyStatusFilter.toLowerCase().trim();

      let matchesStatus = filter === 'all';
      if (!matchesStatus) {
        if (filter === 'succeeded') matchesStatus = s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed';
        else if (filter === 'canceled') matchesStatus = s === 'canceled' || s === 'cancelled';
        else if (filter === 'refunded') matchesStatus = s === 'refunded';
        else if (filter === 'failed') matchesStatus = s === 'failed' || s === 'declined';
        else matchesStatus = s === filter;
      }

      return matchesText && matchesStatus;
    });
  }, [transactions, historySearch, historyStatusFilter]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTransactions.length / historyPageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredTransactions.slice(start, start + historyPageSize);
  }, [filteredTransactions, historyPage, historyPageSize]);

  const filteredPlans = useMemo(() => {
    const q = planSearch.toLowerCase().trim();
    return plans.filter((p) => {
      if (!q) return true;
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchSlug = p.slug && p.slug.toLowerCase().includes(q);
      const matchFeatures = Array.isArray(p.features) && p.features.some(f => f.toLowerCase().includes(q));
      return matchName || matchDesc || matchSlug || matchFeatures;
    });
  }, [plans, planSearch]);

  const totalPlanPages = Math.max(1, Math.ceil(filteredPlans.length / planPageSize));
  const paginatedPlans = useMemo(() => {
    const start = (planPage - 1) * planPageSize;
    return filteredPlans.slice(start, start + planPageSize);
  }, [filteredPlans, planPage, planPageSize]);

  const handleSavePaymentMethod = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_payment_method',
          email: user.email,
          paymentMethod: selectedMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: t('paymentMethodUpdatedMsg', 'Payment method preference saved successfully!') });
        fetchData();
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Could not save payment method' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm(t('confirmCancelSubMsg', 'Are you sure you want to cancel auto-renewal? You will continue to enjoy paid access until your current billing period ends.'))) {
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
          transactionId: activeTransaction?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('renewalCancelledSuccess', 'Auto-renewal cancelled successfully.') 
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('cancelSubscriptionFailed', 'Failed to cancel subscription') });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Switch Plan with Dynamic Token Grant & PostgreSQL sync
  const handleSwitchPlan = async (plan: PlanCatalog, interval: 'MONTH' | 'YEAR') => {
    const amount = interval === 'YEAR' ? plan.annualPrice : plan.monthlyPrice;
    const planSlugWithInterval = plan.slug === 'taster' ? 'taster' : `${plan.slug}-${interval.toLowerCase()}`;
    const planDisplayName = plan.slug === 'taster' ? 'Taster (Free)' : `${plan.name} (${interval === 'YEAR' ? 'Annual' : 'Monthly'})`;
    const tokensCredited = plan.tokenLimit ?? (plan.slug === 'taster' ? 50 : 500);

    const tokenMsg = tokensCredited > 0 ? ` (+${tokensCredited.toLocaleString()} ${tokenIdentity.tokenSymbol})` : '';
    const confirmPrompt = `${t('confirmSwitchPlanPrompt', 'Purchase and activate')} ${planDisplayName} for ${gatewayConfig.currencySymbol}${amount.toFixed(2)}${tokenMsg}?`;
    if (!window.confirm(confirmPrompt)) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_plan',
          email: user?.email,
          userName: user?.name,
          planSlug: planSlugWithInterval,
          planName: planDisplayName,
          amount,
          interval,
          tokenLimit: tokensCredited,
          gateway: selectedMethod,
          currency: gatewayConfig?.currency || 'USD'
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || `Switched plan to ${planDisplayName}` });

        // Update local session cache if present
        try {
          const raw = localStorage.getItem('zecratary_current_user');
          if (raw) {
            const u = JSON.parse(raw);
            u.subscriptionPlan = planSlugWithInterval;
            localStorage.setItem('zecratary_current_user', JSON.stringify(u));
          }
        } catch (_) {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
          window.dispatchEvent(new Event('zecratary_plans_updated'));
          window.dispatchEvent(new Event('zecratary_token_settings_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to switch subscription plan');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to switch subscription plan' });
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)' }}>
          <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald)' }} />
          {t('statusSucceeded', 'Succeeded')}
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
          <Ban className="w-3.5 h-3.5 text-orange-500" />
          {t('statusCanceled', 'Canceled')}
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
          {t('statusRefunded', 'Refunded')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5 text-rose-500" />
        {status}
      </span>
    );
  };

  const isCurrentPlan = (planSlug: string, interval?: 'MONTH' | 'YEAR') => {
    const userPlan = (user?.subscription_plan || '').toLowerCase().trim();
    if (!interval) {
      return userPlan.includes(planSlug.toLowerCase().trim());
    }
    const expected = planSlug === 'taster' ? 'taster' : `${planSlug}-${interval.toLowerCase()}`;
    return userPlan === expected || userPlan === planSlug;
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CreditCard className="h-7 w-7" style={{ color: 'var(--color-emerald)' }} />
              {t('billingAndSubscriptionTitle', 'Billing & Subscriptions')}
            </h1>
            <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('billingPageSubtitle', 'Manage your payment history, payment methods, and subscription tiers.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald)' }} />
              {t('refreshBtn', 'Refresh')}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className="p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-in fade-in transition"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: feedback.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
              color: feedback.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
            }}
          >
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-emerald)' }} /> : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Dynamic Navigation Tabs */}
        <div 
          className="flex border-b gap-2 sm:gap-6 overflow-x-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history' ? '' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'history' ? 'var(--color-emerald)' : 'transparent',
              color: activeTab === 'history' ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
            }}
          >
            <DollarSign className="w-4 h-4" />
            {t('tabBillingHistory', 'Billing History')}
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'methods' ? '' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'methods' ? 'var(--color-emerald)' : 'transparent',
              color: activeTab === 'methods' ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
            }}
          >
            <CreditCard className="w-4 h-4" />
            {t('tabPaymentMethod', 'Payment Method')}
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'subscriptions' ? '' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'subscriptions' ? 'var(--color-emerald)' : 'transparent',
              color: activeTab === 'subscriptions' ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
            }}
          >
            <Layers className="w-4 h-4" />
            {t('tabSubscriptions', 'Subscriptions')}
          </button>
        </div>

        {/* TAB 1: BILLING HISTORY */}
        {activeTab === 'history' && (
          <div 
            className="p-5 sm:p-7 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  placeholder={t('searchBillingPlaceholder', 'Search by plan, gateway, or transaction ID...')}
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={historyStatusFilter}
                  onChange={(e) => {
                    setHistoryStatusFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="all" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterAllStatus', 'All Statuses')}</option>
                  <option value="succeeded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterSucceeded', 'Succeeded')}</option>
                  <option value="canceled" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterCanceled', 'Canceled')}</option>
                  <option value="refunded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterRefunded', 'Refunded')}</option>
                  <option value="failed" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterFailed', 'Failed')}</option>
                </select>

                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    setHistoryPageSize(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value={5} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>5 / page</option>
                  <option value={10} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>10 / page</option>
                  <option value={20} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>20 / page</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr 
                    className="border-b text-xs font-bold uppercase tracking-wider opacity-70"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <th className="p-4">{t('colDate', 'Date')}</th>
                    <th className="p-4">{t('colPlan', 'Plan')}</th>
                    <th className="p-4">{t('colAmount', 'Amount')}</th>
                    <th className="p-4">{t('colGateway', 'Gateway')}</th>
                    <th className="p-4">{t('colStatus', 'Status')}</th>
                    <th className="p-4">{t('colExpiry', 'Billing Expiry')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('noTransactionsFound', 'No payment records found matching your query.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="transition" style={{ backgroundColor: 'transparent' }}>
                        <td className="p-4 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold" style={{ color: 'var(--color-text)' }}>
                          {tx.planName}
                          <span className="block text-xs font-mono opacity-50" style={{ color: 'var(--color-text-secondary)' }}>{tx.id}</span>
                        </td>
                        <td className="p-4 font-bold" style={{ color: 'var(--color-emerald)' }}>
                          {gatewayConfig.currencySymbol}{tx.amount.toFixed(2)} <span className="text-xs font-normal opacity-70" style={{ color: 'var(--color-text-secondary)' }}>{tx.currency}</span>
                        </td>
                        <td className="p-4 uppercase text-xs font-semibold tracking-wider" style={{ color: 'var(--color-text)' }}>
                          {tx.gateway}
                        </td>
                        <td className="p-4">
                          {statusBadge(tx.status)}
                        </td>
                        <td className="p-4 text-xs opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                          {tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-85 pt-2" style={{ color: 'var(--color-text-secondary)' }}>
              <span>
                {t('showingPageInfo', 'Showing')} {Math.min(filteredTransactions.length, (historyPage - 1) * historyPageSize + 1)} - {Math.min(filteredTransactions.length, historyPage * historyPageSize)} {t('ofTotal', 'of')} {filteredTransactions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs hover:bg-emerald-500/10"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold" style={{ color: 'var(--color-text)' }}>
                  {historyPage} / {totalHistoryPages}
                </span>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage >= totalHistoryPages}
                  className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs hover:bg-emerald-500/10"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENT METHOD */}
        {activeTab === 'methods' && (
          <div 
            className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <CreditCard className="w-5 h-5" style={{ color: 'var(--color-emerald)' }} />
                {t('selectPaymentMethodTitle', 'Choose Preferred Payment Method')}
              </h2>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('paymentMethodAdminNotice', 'Available options are dynamically provisioned according to system administrative settings.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gatewayConfig?.stripe?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('stripe')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'stripe'
                      ? 'shadow-md'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: selectedMethod === 'stripe' ? 'var(--color-emerald)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <CreditCard className="w-6 h-6" style={{ color: 'var(--color-emerald)' }} />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: 'var(--color-text)' }}>Stripe / Credit Card</div>
                        <div className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>Visa, Mastercard, AMEX</div>
                      </div>
                    </div>
                    {selectedMethod === 'stripe' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-emerald)' }}>
                        <Check className="w-3 h-3 stroke-[3]" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('stripeMethodDesc', 'Fast and secure card processing powered by Stripe encryption.')}
                  </div>
                </div>
              )}

              {gatewayConfig?.paypal?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('paypal')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'paypal'
                      ? 'shadow-md'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: selectedMethod === 'paypal' ? 'var(--color-emerald)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <Sparkles className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: 'var(--color-text)' }}>PayPal Checkout</div>
                        <div className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>PayPal Balance & One-Touch</div>
                      </div>
                    </div>
                    {selectedMethod === 'paypal' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-emerald)' }}>
                        <Check className="w-3 h-3 stroke-[3]" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('paypalMethodDesc', 'Pay securely through your connected PayPal account or balance.')}
                  </div>
                </div>
              )}

              {gatewayConfig?.manual?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('manual')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'manual'
                      ? 'shadow-md'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: selectedMethod === 'manual' ? 'var(--color-emerald)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                        <Building className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: 'var(--color-text)' }}>Manual / Bank Transfer</div>
                        <div className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>Direct Wire & Corporate Invoicing</div>
                      </div>
                    </div>
                    {selectedMethod === 'manual' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-emerald)' }}>
                        <Check className="w-3 h-3 stroke-[3]" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('manualMethodDesc', 'Manual verification for corporate wire transfers and purchase orders.')}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={handleSavePaymentMethod}
                disabled={processing}
                className="px-6 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-emerald)' }}
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" style={{ color: '#ffffff' }} />}
                {t('savePaymentMethodBtn', 'Save Payment Method')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Current Active Plan Card */}
            <div 
              className="p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)' }}>
                    {t('activePlanBadge', 'Current Active Plan')}
                  </span>
                  {activeTransaction?.autoRenew && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {t('autoRenewEnabledBadge', 'Auto-Renew ON')}
                    </span>
                  )}
                  {activeTransaction?.status === 'canceled' && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {t('renewalCancelledBadge', 'Renewal Canceled (Active Until Expiry)')}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black capitalize" style={{ color: 'var(--color-text)' }}>
                  {user?.subscription_plan?.replace(/-/g, ' ') || 'Taster (Free)'}
                </h2>
                <p className="text-xs opacity-70 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald)' }} />
                  {activeTransaction?.expiryDate
                    ? `${t('billingPeriodEnds', 'Current period ends on')} ${new Date(activeTransaction.expiryDate).toLocaleDateString()}`
                    : t('freeTierNoExpiry', 'Free Tier — No expiration date')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {activeTransaction && activeTransaction.status !== 'canceled' && (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={processing}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('cancelPlanRenewalBtn', 'Cancel Renewal')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('catalog-table');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-emerald)' }}
                >
                  <ArrowUpRight className="w-4 h-4" style={{ color: '#ffffff' }} />
                  {t('upgradeOrDowngradeBtn', 'Change Plan Tier')}
                </button>
              </div>
            </div>

            {/* Catalog of Subscription Packages synced from /admin/plans */}
            <div 
              id="catalog-table"
              className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    {t('availablePlansTableTitle', 'Subscription Packages Catalog')}
                  </h3>
                  <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('availablePlansTableSubtitle', 'Compare tiers, token allowances, and smoothly upgrade or switch your subscription.')}
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="text"
                    placeholder={t('searchPlansPlaceholder', 'Search packages...')}
                    value={planSearch}
                    onChange={(e) => {
                      setPlanSearch(e.target.value);
                      setPlanPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs focus:outline-hidden"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr 
                      className="border-b text-xs font-bold uppercase tracking-wider opacity-70"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      <th className="p-4">{t('colPackage', 'Package')}</th>
                      <th className="p-4">{t('colTokenAllowance', 'AI Token Grant')}</th>
                      <th className="p-4">{t('colDescription', 'Features / Overview')}</th>
                      <th className="p-4">{t('colMonthlyPricing', 'Monthly')}</th>
                      <th className="p-4">{t('colAnnualPricing', 'Annual')}</th>
                      <th className="p-4 text-right">{t('colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {paginatedPlans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                          {t('noPlansFound', 'No subscription plans found matching your search.')}
                        </td>
                      </tr>
                    ) : (
                      paginatedPlans.map((plan) => {
                        const monthlyActive = isCurrentPlan(plan.slug, 'MONTH');
                        const annualActive = isCurrentPlan(plan.slug, 'YEAR');
                        const isFree = plan.slug === 'taster' || plan.isFree || (plan.monthlyPrice === 0 && plan.annualPrice === 0);

                        return (
                          <tr key={plan.id} className="transition" style={{ backgroundColor: 'transparent' }}>
                            <td className="p-4 font-bold" style={{ color: 'var(--color-text)' }}>
                              <div className="flex items-center gap-2">
                                <span>{plan.name}</span>
                                {plan.annualBadge && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                                    {plan.annualBadge}
                                  </span>
                                )}
                              </div>
                              <span className="block text-xs font-mono opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                                {plan.slug}
                              </span>
                            </td>

                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                                <Coins className="h-3.5 w-3.5" />
                                <span>+{(plan.tokenLimit ?? (isFree ? 50 : 500)).toLocaleString()} {tokenIdentity.tokenSymbol}</span>
                              </span>
                            </td>

                            <td className="p-4 text-xs opacity-75 max-w-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                              <p className="line-clamp-2">{plan.description}</p>
                              {Array.isArray(plan.features) && plan.features.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {plan.features.slice(0, 3).map((feat, fIdx) => (
                                    <span key={fIdx} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10">
                                      <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                      <span>{feat}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="p-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                              {plan.monthlyPrice > 0 
                                ? `${gatewayConfig.currencySymbol}${plan.monthlyPrice.toFixed(2)}/mo` 
                                : t('freePrice', 'Free')}
                            </td>

                            <td className="p-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                              {plan.annualPrice > 0 
                                ? `${gatewayConfig.currencySymbol}${plan.annualPrice.toFixed(2)}/yr` 
                                : t('freePrice', 'Free')}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isFree ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchPlan(plan, 'MONTH')}
                                    disabled={monthlyActive || processing}
                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                      monthlyActive
                                        ? 'opacity-60 cursor-default border'
                                        : 'border hover:bg-emerald-500 hover:text-white'
                                    }`}
                                    style={monthlyActive ? {
                                      backgroundColor: 'var(--color-inner-dark)',
                                      color: 'var(--color-emerald)',
                                      borderColor: 'var(--color-emerald)'
                                    } : {
                                      borderColor: 'var(--color-emerald)',
                                      color: 'var(--color-emerald)'
                                    }}
                                  >
                                    {monthlyActive ? t('activeLabel', 'Active') : t('downgradeToFreeBtn', 'Switch to Free')}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSwitchPlan(plan, 'MONTH')}
                                      disabled={monthlyActive || processing}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                        monthlyActive
                                          ? 'opacity-60 cursor-default border'
                                          : 'border hover:bg-emerald-500 hover:text-white'
                                      }`}
                                      style={monthlyActive ? {
                                        backgroundColor: 'var(--color-inner-dark)',
                                        color: 'var(--color-emerald)',
                                        borderColor: 'var(--color-emerald)'
                                      } : {
                                        borderColor: 'var(--color-emerald)',
                                        color: 'var(--color-emerald)'
                                      }}
                                    >
                                      {monthlyActive ? t('monthlyActive', 'Monthly Active') : t('chooseMonthlyBtn', 'Monthly')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSwitchPlan(plan, 'YEAR')}
                                      disabled={annualActive || processing}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                        annualActive
                                          ? 'opacity-60 cursor-default text-white'
                                          : 'text-white shadow-md'
                                      }`}
                                      style={{
                                        backgroundColor: 'var(--color-emerald)'
                                      }}
                                    >
                                      {annualActive ? t('annualActive', 'Annual Active') : t('chooseAnnualBtn', 'Annual')}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-80 pt-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span>
                  {t('showingPageInfo', 'Showing')} {Math.min(filteredPlans.length, (planPage - 1) * planPageSize + 1)} - {Math.min(filteredPlans.length, planPage * planPageSize)} {t('ofTotal', 'of')} {filteredPlans.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlanPage((p) => Math.max(1, p - 1))}
                    disabled={planPage <= 1}
                    className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-bold" style={{ color: 'var(--color-text)' }}>
                    {planPage} / {totalPlanPages}
                  </span>
                  <button
                    onClick={() => setPlanPage((p) => Math.min(totalPlanPages, p + 1))}
                    disabled={planPage >= totalPlanPages}
                    className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
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
