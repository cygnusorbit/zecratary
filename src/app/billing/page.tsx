// Generated / Updated by AI Collaborator - Production Build Ready
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  Ban, 
  Sparkles, 
  Coins, 
  Clock, 
  Wallet, 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  X,
  Printer,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';

interface NormalizedTransaction {
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
  gatewayTxId?: string;
}

export default function BillingPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<NormalizedTransaction | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const [gatewayConfig, setGatewayConfig] = useState<any>({
    currency: 'USD',
    currencySymbol: '$'
  });

  const [tokenIdentity, setTokenIdentity] = useState<any>({
    tokenName: 'Tokens',
    tokenSymbol: '🪙'
  });

  // Re-entrancy guard
  const isFetchingRef = useRef<boolean>(false);

  // Normalized Transaction Parser for DB & API cross-compatibility
  const normalizeTransaction = useCallback((raw: any): NormalizedTransaction => {
    return {
      id: String(raw.id || `tx_${Math.random().toString(36).substring(2, 9)}`),
      customerName: raw.customer_name || raw.customerName || user?.name || 'Member',
      customerEmail: raw.customer_email || raw.customerEmail || user?.email || '',
      planName: raw.plan_name || raw.planName || 'Plan Subscription',
      planSlug: raw.plan_slug || raw.planSlug || 'taster',
      amount: Number(raw.amount || 0),
      currency: raw.currency || gatewayConfig.currency || 'USD',
      gateway: raw.gateway || 'wallet',
      status: String(raw.status || 'succeeded').toLowerCase(),
      failureReason: raw.failure_reason || raw.failureReason,
      isRecurring: Boolean(raw.is_recurring ?? raw.isRecurring ?? true),
      recurringInterval: String(raw.recurring_interval || raw.recurringInterval || 'MONTH').toUpperCase(),
      autoRenew: Boolean(raw.auto_renew ?? raw.autoRenew ?? true),
      expiryDate: raw.expiry_date || raw.expiryDate,
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      gatewayTxId: raw.gateway_tx_id || raw.gatewayTxId || raw.gateway_transaction_id || raw.gatewayTransactionId
    };
  }, [user, gatewayConfig.currency]);

  // Dynamic Theme Synchronization
  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const _ = localStorage.getItem('zecratary_theme_mode');
      }
    };
    checkTheme();
    window.addEventListener('zecratary_theme_mode_changed', checkTheme);
    window.addEventListener('zecratary_theme_updated', checkTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', checkTheme);
      window.removeEventListener('zecratary_theme_updated', checkTheme);
    };
  }, []);

  // Fetch Billing Data
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      let userEmail = '';
      let userId = '';

      if (typeof window !== 'undefined') {
        initAuthStorage();
        const authUser = getCurrentUser();
        if (authUser?.email) userEmail = authUser.email;
        if (authUser?.id) userId = String(authUser.id);

        if (!userEmail || !userId) {
          const rawStored = localStorage.getItem('zecratary_user') || 
                            localStorage.getItem('zecratary_current_user') || 
                            localStorage.getItem('currentUser');
          if (rawStored) {
            try {
              const parsed = JSON.parse(rawStored);
              if (!userEmail && parsed?.email) userEmail = parsed.email;
              if (!userId && (parsed?.id || parsed?.userId)) userId = String(parsed.id || parsed.userId);
            } catch (_) {}
          }
        }
      }

      const params = new URLSearchParams();
      if (userEmail) params.append('email', userEmail);
      if (userId) params.append('userId', userId);
      params.append('t', String(Date.now()));

      const res = await fetch(`/api/billing?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          const rawTxList = Array.isArray(data.transactions) ? data.transactions : [];
          setTransactions(rawTxList.map(normalizeTransaction));
          if (data.gatewayConfig) setGatewayConfig(data.gatewayConfig);
          if (data.tokenIdentity) setTokenIdentity(data.tokenIdentity);
        }
      }

      // Concurrently synchronize live wallet ledger balance
      if (userEmail || userId) {
        try {
          const wRes = await fetch(`/api/wallet?${params.toString()}`, { cache: 'no-store' });
          if (wRes.ok) {
            const wData = await wRes.json();
            const liveBal = typeof wData.wallet_balance === 'number'
              ? wData.wallet_balance
              : (typeof wData.balance === 'number' ? wData.balance : Number(wData.user?.wallet_balance || 0));
            if (!isNaN(liveBal)) {
              setUser((prev: any) => prev ? { ...prev, wallet_balance: liveBal } : prev);
            }
          }
        } catch (_) {}
      }

    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedLoadBilling', 'Failed to load billing details') });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [t, normalizeTransaction]);

  useEffect(() => {
    fetchData();
    const handleSync = () => fetchData();
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_wallet_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
    };
  }, [fetchData]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Determine active transaction
  const activeTransaction = useMemo(() => {
    return transactions.find((tx) => {
      const isPaidOrActive = ['active', 'succeeded', 'successful', 'paid', 'canceled'].includes(tx.status);
      if (!isPaidOrActive) return false;
      if (!tx.expiryDate) return true;
      return new Date(tx.expiryDate).getTime() > Date.now();
    });
  }, [transactions]);

  const isFreePlan = useMemo(() => {
    const p = (user?.subscription_plan || 'taster').toLowerCase();
    return p === 'taster' || p === 'free';
  }, [user]);

  // KPI Calculations
  const stats = useMemo(() => {
    let totalPaid = 0;
    transactions.forEach(tx => {
      if (['succeeded', 'active', 'paid', 'completed'].includes(tx.status)) {
        totalPaid += Number(tx.amount || 0);
      }
    });
    return {
      totalPaid: totalPaid.toFixed(2),
      invoiceCount: transactions.length
    };
  }, [transactions]);

  // Filtered & Paginated Ledger
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const pName = (tx.planName || '').toLowerCase();
        const gw = (tx.gateway || '').toLowerCase();
        const txId = (tx.id || '').toLowerCase();
        if (!pName.includes(q) && !gw.includes(q) && !txId.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIdx, startIdx + pageSize);

  // Handle Cancel Auto-Renew
  const handleCancelAutoRenew = async () => {
    if (!window.confirm(t('confirmCancelAutoRenewPrompt', 'Are you sure you want to cancel auto-renewal? You will retain all plan features until the end of your billing cycle.'))) {
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
        setFeedback({ type: 'success', msg: data.message || t('autoRenewCancelledMsg', 'Auto-renewal has been cancelled.') });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }
        await fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedCancelAutoRenew', 'Failed to cancel auto-renewal') });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Resume Auto-Renew
  const handleResumeAutoRenew = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume_subscription',
          email: user?.email,
          transactionId: activeTransaction?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || t('autoRenewResumedMsg', 'Auto-renewal reactivated!') });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }
        await fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedReactivateAutoRenew', 'Failed to reactivate auto-renewal') });
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const currencySymbol = gatewayConfig.currencySymbol || '$';

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{
        boxSizing: 'border-box',
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f8fafc)'
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <CreditCard className="h-7 w-7" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{t('billingInvoicesTitle', 'Billing & Invoices')}</span>
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
            {t('billingInvoicesSubtitle', 'Manage recurring subscription payments, review transaction receipts, and audit store balances.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-85"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f8fafc)'
            }}
          >
            <Layers className="w-4 h-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{t('subscriptionsPageBtn', 'Change Plan Tier')}</span>
          </Link>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f8fafc)'
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{t('refreshBtn', 'Refresh')}</span>
          </button>
        </div>
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

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: 'var(--color-border, #1e293b)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('totalAmountPaid', 'Total Amount Paid')}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: 'var(--color-emerald, #10b981)' }}>
            {currencySymbol}{stats.totalPaid}
          </div>
        </div>

        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: 'var(--color-border, #1e293b)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('totalInvoices', 'Total Invoices Issued')}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">
            {stats.invoiceCount}
          </div>
        </div>

        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: 'var(--color-border, #1e293b)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('activeMembershipTier', 'Active Membership Tier')}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-base font-black capitalize truncate" style={{ color: 'var(--color-emerald, #10b981)' }}>
            {(activeTransaction?.planName || user?.plan_name || (isFreePlan ? 'Taster (Free)' : user?.subscription_plan || 'Taster')).replace(/-/g, ' ')}
          </div>
        </div>

        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: 'var(--color-border, #1e293b)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('storeWalletCredits', 'Store Wallet Balance')}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: 'var(--color-emerald, #10b981)' }}>
            {currencySymbol}{Number(user?.wallet_balance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'overview' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
          }`}
          style={activeTab === 'overview' ? {
            backgroundColor: 'var(--color-card, #0f172a)',
            color: 'var(--color-emerald, #10b981)',
            border: '1px solid var(--color-border, #1e293b)'
          } : {
            color: 'var(--color-text-secondary, #94a3b8)'
          }}
        >
          {t('subscriptionOverviewTab', 'Subscription Overview')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'invoices' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
          }`}
          style={activeTab === 'invoices' ? {
            backgroundColor: 'var(--color-card, #0f172a)',
            color: 'var(--color-emerald, #10b981)',
            border: '1px solid var(--color-border, #1e293b)'
          } : {
            color: 'var(--color-text-secondary, #94a3b8)'
          }}
        >
          {t('invoicesReceiptsTab', 'Invoices & Receipts')} ({transactions.length})
        </button>
      </div>

      {/* TAB 1: SUBSCRIPTION OVERVIEW */}
      {activeTab === 'overview' && (
        <div 
          role="region"
          aria-label={t('subscriptionOverviewTab', 'Subscription Overview')}
          data-lpignore="true"
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6"
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
                {activeTransaction?.planName || user?.plan_name || (isFreePlan ? 'Taster (Free)' : user?.subscription_plan)}
              </h2>

              <p className="text-xs opacity-75 flex items-center gap-2" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>
                  {activeTransaction?.expiryDate || user?.expiry_date
                    ? `${t('planValidUntil', 'Active period ends on')} ${new Date(activeTransaction?.expiryDate || user?.expiry_date).toLocaleDateString()}`
                    : t('freePlanNoExpiry', 'Free Plan — Perpetual Access')}
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {activeTransaction && activeTransaction.status !== 'canceled' && !isFreePlan && (
                <button
                  type="button"
                  onClick={handleCancelAutoRenew}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>{t('cancelAutoRenewBtn', 'Cancel Auto-Renewal')}</span>
                </button>
              )}

              {activeTransaction && activeTransaction.status === 'canceled' && !isFreePlan && (
                <button
                  type="button"
                  onClick={handleResumeAutoRenew}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('reactivateAutoRenewBtn', 'Reactivate Auto-Renew')}</span>
                </button>
              )}

              <Link
                href="/subscriptions"
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer text-slate-950 shadow-md hover:opacity-90"
                style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
              >
                <span>{t('switchOrUpgradePlan', 'Switch or Upgrade Plan')}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('subscriberAccount', 'Subscriber')}</span>
              </div>
              <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {user?.name || user?.email}
              </div>
              <div className="text-xs opacity-50 truncate" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {user?.email}
              </div>
            </div>

            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('storeWalletBalance', 'Store Wallet Balance')}</span>
              </div>
              <div className="font-bold text-base font-mono flex items-center gap-1" style={{ color: 'var(--color-emerald, #10b981)' }}>
                <span>{currencySymbol}</span>
                <span>{Number(user?.wallet_balance || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('availableForRenewals', 'Available for automated plan renewals')}
              </div>
            </div>

            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{t('billingFrequency', 'Billing Frequency')}</span>
              </div>
              <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {isFreePlan ? t('perpetualAccess', 'Perpetual') : (user?.plan_interval || 'MONTH')}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {activeTransaction?.isRecurring ? t('recurringActive', 'Recurring Auto-Renew') : t('oneOffCycle', 'One-off cycle')}
              </div>
            </div>

            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('tokenAllocation', 'Monthly Token Quota')}</span>
              </div>
              <div className="font-bold text-base flex items-center gap-1" style={{ color: '#f59e0b' }}>
                <span>{Number(user?.token_balance || 0).toLocaleString()}</span>
                <span className="text-xs opacity-75">{tokenIdentity.tokenSymbol}</span>
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('grantedPerCycle', 'Granted per active cycle')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES & RECEIPTS */}
      {activeTab === 'invoices' && (
        <div 
          role="region"
          aria-label={t('invoicesReceiptsTab', 'Invoices & Receipts')}
          data-lpignore="true"
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2.5" style={{ color: 'var(--color-text, #f8fafc)' }}>
                <History className="w-5 h-5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>{t('billingInvoicesTitle', 'Billing & Invoicing History')}</span>
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('billingInvoicesSubtitle', 'Review your payment receipts, subscription renewals, and transaction records.')}
              </p>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 pointer-events-none opacity-60" />
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  placeholder={t('searchBillingPlaceholder', 'Search invoices by plan, gateway, or ID...')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none font-medium w-48 sm:w-64"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)',
                    color: 'var(--color-text, #f8fafc)'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)',
                  color: 'var(--color-text, #f8fafc)'
                }}
              >
                <option value="all">{t('allStatusesFilter', 'All Statuses')}</option>
                <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
                <option value="canceled">{t('statusCanceled', 'Canceled')}</option>
                <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
                <option value="failed">{t('statusFailed', 'Failed')}</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div 
              className="p-8 rounded-2xl border text-center space-y-2"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <FileText className="w-8 h-8 mx-auto opacity-40" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('noInvoicesRecorded', 'No invoices or subscription payments recorded yet.')}
              </p>
              <p className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('invoicesAppearHere', 'When you activate or renew a paid package, your downloadable receipts will be listed here.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr 
                    className="border-b font-extrabold uppercase tracking-wider text-[10px]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)',
                      color: 'var(--color-text-secondary, #94a3b8)'
                    }}
                  >
                    <th className="px-4 py-3">{t('colInvoiceDate', 'Date')}</th>
                    <th className="px-4 py-3">{t('colInvoiceId', 'Invoice / Tx ID')}</th>
                    <th className="px-4 py-3">{t('colPlan', 'Plan & Tier')}</th>
                    <th className="px-4 py-3">{t('colInterval', 'Interval')}</th>
                    <th className="px-4 py-3">{t('colGateway', 'Payment Gateway')}</th>
                    <th className="px-4 py-3">{t('colStatus', 'Status')}</th>
                    <th className="px-4 py-3 text-right">{t('colAmount', 'Amount')}</th>
                    <th className="px-4 py-3 text-right">{t('colActions', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  {paginatedTransactions.map((tx) => {
                    const isSucceeded = ['active', 'succeeded', 'successful', 'paid'].includes(tx.status);
                    const isCanceled = tx.status === 'canceled' || tx.status === 'cancelled';

                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors" style={{ color: 'var(--color-text, #f8fafc)' }}>
                        <td className="px-4 py-3 font-mono text-[11px] opacity-75">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] font-bold">
                          {tx.id.substring(0, 16)}...
                        </td>
                        <td className="px-4 py-3 font-bold capitalize">
                          <span>{tx.planName}</span>
                        </td>
                        <td className="px-4 py-3 uppercase font-semibold text-[11px] opacity-80">
                          {tx.recurringInterval}
                        </td>
                        <td className="px-4 py-3 uppercase text-[11px] opacity-75 font-semibold">
                          {tx.gateway}
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
                              <span>{t('statusCanceled', 'Canceled')}</span>
                            </span>
                          )}
                          {!isSucceeded && !isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                          {currencySymbol}{Number(tx.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition hover:bg-white/5 cursor-pointer"
                            style={{ borderColor: 'var(--color-border, #1e293b)' }}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t('viewReceipt', 'Receipt')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t text-xs" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <span className="opacity-75">
                {(t('showingInvoicesRange', 'Showing {start} - {end} of {total} invoices'))
                  .replace('{start}', String(startIdx + 1))
                  .replace('{end}', String(Math.min(startIdx + pageSize, filteredTransactions.length)))
                  .replace('{total}', String(filteredTransactions.length))}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  title={t('prevPage', 'Previous')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold px-2">
                  {(t('pageIndicator', 'Page {page} of {total}'))
                    .replace('{page}', String(safePage))
                    .replace('{total}', String(totalPages))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
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
      )}

      {/* OFFICIAL INVOICE / RECEIPT MODAL DIALOG (FORM-FREE & PRINTABLE) */}
      {selectedInvoice && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setSelectedInvoice(null)}
        >
          <div 
            role="region"
            aria-label={t('paymentReceiptTitle', 'Payment Receipt')}
            data-lpignore="true"
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 relative transition-all"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)',
              color: 'var(--color-text, #f8fafc)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Receipt Header */}
            <div className="flex items-center justify-between pb-4 border-b print:hidden" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black">{t('paymentReceiptTitle', 'Payment Receipt')}</h3>
                  <p className="text-xs opacity-60 font-mono">{selectedInvoice.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-xl border border-transparent hover:bg-white/5 opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Details Breakdown */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl border space-y-2.5" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                <div className="flex justify-between items-center opacity-70">
                  <span>{t('billedToLabel', 'Billed To:')}</span>
                  <span className="font-semibold text-slate-200">{selectedInvoice.customerName || selectedInvoice.customerEmail}</span>
                </div>
                <div className="flex justify-between items-center opacity-70">
                  <span>{t('customerEmailLabel', 'Email Address:')}</span>
                  <span className="font-mono text-slate-200">{selectedInvoice.customerEmail}</span>
                </div>
                <div className="flex justify-between items-center opacity-70">
                  <span>{t('paymentDateLabel', 'Payment Date:')}</span>
                  <span className="text-slate-200">{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center opacity-70">
                  <span>{t('paymentMethodLabel', 'Payment Method:')}</span>
                  <span className="uppercase text-slate-200 font-semibold">{selectedInvoice.gateway}</span>
                </div>
                <div className="flex justify-between items-center opacity-70">
                  <span>{t('planTermLabel', 'Active Period:')}</span>
                  <span className="text-slate-200">{selectedInvoice.recurringInterval}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                <div>
                  <div className="font-bold text-sm" style={{ color: 'var(--color-text, #f8fafc)' }}>
                    {selectedInvoice.planName}
                  </div>
                  <div className="text-[11px] opacity-60">
                    {t('subscriptionTierAccess', 'Full subscription culinary & token quota access')}
                  </div>
                </div>
                <div className="text-xl font-black font-mono" style={{ color: 'var(--color-emerald, #10b981)' }}>
                  {currencySymbol}{Number(selectedInvoice.amount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t print:hidden" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:bg-white/5 cursor-pointer"
                style={{ borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('printReceiptBtn', 'Print Receipt')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-950 shadow-md hover:opacity-90"
                style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
              >
                {t('closeBtn', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
