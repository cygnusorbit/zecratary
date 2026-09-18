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
  Check
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

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
  description: string;
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
  const [gatewayConfig, setGatewayConfig] = useState<any>({
    activeGateway: 'stripe',
    currency: 'USD',
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
          const storedUser = localStorage.getItem('zecratary_user') || localStorage.getItem('user') || localStorage.getItem('currentUser');
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
    return plans.filter((p) => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q)));
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

        // Broadcast cross-component synchronization events
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
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

  const handleSwitchPlan = async (plan: PlanCatalog, interval: 'MONTH' | 'YEAR') => {
    const amount = interval === 'YEAR' ? plan.annualPrice : plan.monthlyPrice;
    const planSlugWithInterval = plan.slug === 'taster' ? 'taster' : `${plan.slug}-${interval.toLowerCase()}`;
    const planDisplayName = plan.slug === 'taster' ? 'Taster (Free)' : `${plan.name} (${interval === 'YEAR' ? 'Annual' : 'Monthly'})`;

    const confirmPrompt = `${t('confirmSwitchPlanPrompt', 'Switch plan to')} ${planDisplayName} ($${amount})?`;
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
          gateway: selectedMethod,
          currency: gatewayConfig?.currency || 'USD'
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || `Switched plan to ${planDisplayName}` });
        fetchData();
      } else {
        throw new Error(data.error);
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle className="w-3.5 h-3.5" />
          {t('statusSucceeded', 'Succeeded')}
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
          <Ban className="w-3.5 h-3.5" />
          {t('statusCanceled', 'Canceled')}
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <RefreshCw className="w-3.5 h-3.5" />
          {t('statusRefunded', 'Refunded')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  const isCurrentPlan = (planSlug: string, interval?: 'MONTH' | 'YEAR') => {
    const userPlan = (user?.subscription_plan || '').toLowerCase();
    if (!interval) {
      return userPlan.includes(planSlug.toLowerCase());
    }
    const expected = planSlug === 'taster' ? 'taster' : `${planSlug}-${interval.toLowerCase()}`;
    return userPlan === expected;
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 transition-colors duration-200"
      style={{
        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-background, #0b0f17)',
        color: isDayMode ? '#0f172a' : 'var(--color-foreground, #f1f5f9)'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CreditCard className="h-7 w-7 text-emerald-500" />
              {t('billingAndSubscriptionTitle', 'Billing & Subscriptions')}
            </h1>
            <p className="text-sm opacity-70 mt-1">
              {t('billingPageSubtitle', 'Manage your payment history, payment methods, and subscription tiers.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('refreshBtn', 'Refresh')}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className="p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-in fade-in transition"
            style={feedback.type === 'success' ? {
              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
              borderColor: '#10b981',
              color: isDayMode ? '#065f46' : '#6ee7b7'
            } : {
              backgroundColor: isDayMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
              borderColor: '#ef4444',
              color: isDayMode ? '#991b1b' : '#fca5a5'
            }}
          >
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Dynamic Navigation Tabs */}
        <div 
          className="flex border-b gap-2 sm:gap-6 overflow-x-auto"
          style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            {t('tabBillingHistory', 'Billing History')}
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'methods'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {t('tabPaymentMethod', 'Payment Method')}
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
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
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
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
                    backgroundColor: isDayMode ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
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
                  className="px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-card, #111726)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <option value="all">{t('filterAllStatus', 'All Statuses')}</option>
                  <option value="succeeded">{t('filterSucceeded', 'Succeeded')}</option>
                  <option value="canceled">{t('filterCanceled', 'Canceled')}</option>
                  <option value="refunded">{t('filterRefunded', 'Refunded')}</option>
                  <option value="failed">{t('filterFailed', 'Failed')}</option>
                </select>

                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    setHistoryPageSize(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-card, #111726)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr 
                    className="border-b text-xs font-bold uppercase tracking-wider opacity-70"
                    style={{
                      backgroundColor: isDayMode ? '#f1f5f9' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
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
                <tbody className="divide-y" style={{ borderColor: isDayMode ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)' }}>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center opacity-50">
                        {t('noTransactionsFound', 'No payment records found matching your query.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-emerald-500/5 transition">
                        <td className="p-4 font-mono text-xs">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold">
                          {tx.planName}
                          <span className="block text-xs font-mono opacity-50">{tx.id}</span>
                        </td>
                        <td className="p-4 font-bold text-emerald-500">
                          ${tx.amount.toFixed(2)} <span className="text-xs font-normal opacity-70">{tx.currency}</span>
                        </td>
                        <td className="p-4 uppercase text-xs font-semibold tracking-wider">
                          {tx.gateway}
                        </td>
                        <td className="p-4">
                          {statusBadge(tx.status)}
                        </td>
                        <td className="p-4 text-xs opacity-70">
                          {tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-80 pt-2">
              <span>
                {t('showingPageInfo', 'Showing')} {Math.min(filteredTransactions.length, (historyPage - 1) * historyPageSize + 1)} - {Math.min(filteredTransactions.length, historyPage * historyPageSize)} {t('ofTotal', 'of')} {filteredTransactions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold">
                  {historyPage} / {totalHistoryPages}
                </span>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage >= totalHistoryPages}
                  className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
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
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                {t('selectPaymentMethodTitle', 'Choose Preferred Payment Method')}
              </h2>
              <p className="text-xs opacity-70 mt-1">
                {t('paymentMethodAdminNotice', 'Available options are dynamically provisioned according to system administrative settings.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gatewayConfig?.stripe?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('stripe')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'stripe'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
                      : 'border-transparent opacity-80 hover:opacity-100 hover:border-emerald-500/40'
                  }`}
                  style={{
                    backgroundColor: selectedMethod === 'stripe' ? undefined : (isDayMode ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)'),
                    borderColor: selectedMethod === 'stripe' ? '#10b981' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-black text-sm">Stripe / Credit Card</div>
                        <div className="text-xs opacity-60">Visa, Mastercard, AMEX</div>
                      </div>
                    </div>
                    {selectedMethod === 'stripe' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-60 leading-relaxed">
                    {t('stripeMethodDesc', 'Fast and secure card processing powered by Stripe encryption.')}
                  </div>
                </div>
              )}

              {gatewayConfig?.paypal?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('paypal')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'paypal'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
                      : 'border-transparent opacity-80 hover:opacity-100 hover:border-emerald-500/40'
                  }`}
                  style={{
                    backgroundColor: selectedMethod === 'paypal' ? undefined : (isDayMode ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)'),
                    borderColor: selectedMethod === 'paypal' ? '#10b981' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-black text-sm">PayPal Checkout</div>
                        <div className="text-xs opacity-60">PayPal Balance & One-Touch</div>
                      </div>
                    </div>
                    {selectedMethod === 'paypal' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-60 leading-relaxed">
                    {t('paypalMethodDesc', 'Pay securely through your connected PayPal account or balance.')}
                  </div>
                </div>
              )}

              {gatewayConfig?.manual?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('manual')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'manual'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
                      : 'border-transparent opacity-80 hover:opacity-100 hover:border-emerald-500/40'
                  }`}
                  style={{
                    backgroundColor: selectedMethod === 'manual' ? undefined : (isDayMode ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)'),
                    borderColor: selectedMethod === 'manual' ? '#10b981' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-black text-sm">Manual / Bank Transfer</div>
                        <div className="text-xs opacity-60">Direct Wire & Corporate Invoicing</div>
                      </div>
                    </div>
                    {selectedMethod === 'manual' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-60 leading-relaxed">
                    {t('manualMethodDesc', 'Manual verification for corporate wire transfers and purchase orders.')}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <button
                type="button"
                onClick={handleSavePaymentMethod}
                disabled={processing}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {t('savePaymentMethodBtn', 'Save Payment Method')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div 
              className="p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {t('activePlanBadge', 'Current Active Plan')}
                  </span>
                  {activeTransaction?.autoRenew && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                      {t('autoRenewEnabledBadge', 'Auto-Renew ON')}
                    </span>
                  )}
                  {activeTransaction?.status === 'canceled' && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                      {t('renewalCancelledBadge', 'Renewal Canceled (Active Until Expiry)')}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black capitalize">
                  {user?.subscription_plan?.replace(/-/g, ' ') || 'Taster (Free)'}
                </h2>
                <p className="text-xs opacity-70 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
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
                    className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  {t('upgradeOrDowngradeBtn', 'Change Plan Tier')}
                </button>
              </div>
            </div>

            <div 
              id="catalog-table"
              className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {t('availablePlansTableTitle', 'Subscription Packages Catalog')}
                  </h3>
                  <p className="text-xs opacity-70 mt-1">
                    {t('availablePlansTableSubtitle', 'Compare tiers and smoothly upgrade or downgrade your active subscription.')}
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
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
                      backgroundColor: isDayMode ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                    }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr 
                      className="border-b text-xs font-bold uppercase tracking-wider opacity-70"
                      style={{
                        backgroundColor: isDayMode ? '#f1f5f9' : 'rgba(255, 255, 255, 0.02)',
                        borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                      }}
                    >
                      <th className="p-4">{t('colPackage', 'Package')}</th>
                      <th className="p-4">{t('colDescription', 'Features / Overview')}</th>
                      <th className="p-4">{t('colMonthlyPricing', 'Monthly')}</th>
                      <th className="p-4">{t('colAnnualPricing', 'Annual')}</th>
                      <th className="p-4 text-right">{t('colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: isDayMode ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)' }}>
                    {paginatedPlans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center opacity-50">
                          {t('noPlansFound', 'No subscription plans found.')}
                        </td>
                      </tr>
                    ) : (
                      paginatedPlans.map((plan) => {
                        const monthlyActive = isCurrentPlan(plan.slug, 'MONTH');
                        const annualActive = isCurrentPlan(plan.slug, 'YEAR');
                        const isFree = plan.slug === 'taster' || plan.monthlyPrice === 0;

                        return (
                          <tr key={plan.id} className="hover:bg-emerald-500/5 transition">
                            <td className="p-4 font-bold">
                              {plan.name}
                              <span className="block text-xs font-mono opacity-50">{plan.slug}</span>
                            </td>
                            <td className="p-4 text-xs opacity-70 max-w-xs">
                              {plan.description}
                            </td>
                            <td className="p-4 font-mono font-bold">
                              {plan.monthlyPrice > 0 ? `$${plan.monthlyPrice.toFixed(2)}/mo` : t('freePrice', 'Free')}
                            </td>
                            <td className="p-4 font-mono font-bold">
                              {plan.annualPrice > 0 ? `$${plan.annualPrice.toFixed(2)}/yr` : t('freePrice', 'Free')}
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
                                        ? 'bg-emerald-500/20 text-emerald-500 opacity-60 cursor-default'
                                        : 'border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                    }`}
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
                                          ? 'bg-emerald-500/20 text-emerald-500 opacity-60 cursor-default'
                                          : 'border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                      }`}
                                    >
                                      {monthlyActive ? t('monthlyActive', 'Monthly Active') : t('chooseMonthlyBtn', 'Monthly')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSwitchPlan(plan, 'YEAR')}
                                      disabled={annualActive || processing}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                        annualActive
                                          ? 'bg-emerald-500/20 text-emerald-500 opacity-60 cursor-default'
                                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                      }`}
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

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-80 pt-2">
                <span>
                  {t('showingPageInfo', 'Showing')} {Math.min(filteredPlans.length, (planPage - 1) * planPageSize + 1)} - {Math.min(filteredPlans.length, planPage * planPageSize)} {t('ofTotal', 'of')} {filteredPlans.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlanPage((p) => Math.max(1, p - 1))}
                    disabled={planPage <= 1}
                    className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                    style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-bold">
                    {planPage} / {totalPlanPages}
                  </span>
                  <button
                    onClick={() => setPlanPage((p) => Math.min(totalPlanPages, p + 1))}
                    disabled={planPage >= totalPlanPages}
                    className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                    style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
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
