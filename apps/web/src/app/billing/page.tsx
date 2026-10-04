// Generated / Updated by AI Collaborator
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Printer, 
  Eye, 
  X, 
  ExternalLink,
  ShieldCheck,
  DollarSign
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', JPY: '¥', THB: '฿'
};

const formatAmount = (val: any): string => {
  if (typeof val === 'number' && !isNaN(val)) return val.toFixed(2);
  const parsed = parseFloat(val);
  return (!isNaN(parsed) ? parsed : 0).toFixed(2);
};

export default function BillingPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);

  const [gatewayConfig, setGatewayConfig] = useState<any>({
    currency: 'USD',
    currencySymbol: '$'
  });

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const normalizeTransaction = (tx: any): Transaction => ({
    id: String(tx.id || tx.transaction_id || `tx_${Date.now()}`),
    customerName: tx.customerName || tx.customer_name || tx.userName || tx.user_name || 'Customer',
    customerEmail: tx.customerEmail || tx.customer_email || tx.userEmail || tx.user_email || '',
    planName: tx.planName || tx.plan_name || tx.description || 'Payment Transaction',
    planSlug: tx.planSlug || tx.plan_slug || '',
    amount: typeof tx.amount === 'number' ? tx.amount : (parseFloat(tx.amount || 0) || 0),
    currency: (tx.currency || 'USD').toUpperCase(),
    gateway: (tx.gateway || tx.payment_method || 'stripe').toLowerCase(),
    status: (tx.status || 'succeeded').toLowerCase(),
    failureReason: tx.failureReason || tx.failure_reason,
    isRecurring: Boolean(tx.isRecurring ?? tx.is_recurring ?? true),
    recurringInterval: (tx.recurringInterval || tx.recurring_interval || (String(tx.plan_slug || tx.planSlug || '').toLowerCase().includes('annual') ? 'YEAR' : 'MONTH')).toUpperCase(),
    autoRenew: Boolean(tx.autoRenew ?? tx.auto_renew ?? true),
    expiryDate: tx.expiryDate || tx.expiry_date,
    createdAt: tx.createdAt || tx.created_at || new Date().toISOString()
  });

  // Fetch all transactions from /admin/payment-gateway, /admin/payment, or /api/billing
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let rawList: any[] = [];
      let loadedGatewayConfig: any = null;

      // 1. Fetch from /api/admin/payment-gateway
      try {
        const gwRes = await fetch(`/api/admin/payment-gateway?t=${Date.now()}`, { cache: 'no-store' });
        if (gwRes.ok) {
          const gwData = await gwRes.json();
          if (gwData.success) {
            if (Array.isArray(gwData.transactions)) rawList = gwData.transactions;
            else if (Array.isArray(gwData.data)) rawList = gwData.data;
            if (gwData.gatewayConfig) loadedGatewayConfig = gwData.gatewayConfig;
          }
        }
      } catch (_) {}

      // 2. Fallback to /api/admin/payment
      if (rawList.length === 0) {
        try {
          const adminPayRes = await fetch(`/api/admin/payment?t=${Date.now()}`, { cache: 'no-store' });
          if (adminPayRes.ok) {
            const adminPayData = await adminPayRes.json();
            if (adminPayData.success) {
              if (Array.isArray(adminPayData.transactions)) rawList = adminPayData.transactions;
              else if (Array.isArray(adminPayData.data)) rawList = adminPayData.data;
              if (adminPayData.gatewayConfig && !loadedGatewayConfig) loadedGatewayConfig = adminPayData.gatewayConfig;
            }
          }
        } catch (_) {}
      }

      // 3. Fallback to /api/billing?all=true&source=gateway
      if (rawList.length === 0) {
        try {
          const billingRes = await fetch(`/api/billing?all=true&source=gateway&t=${Date.now()}`, { cache: 'no-store' });
          if (billingRes.ok) {
            const billingData = await billingRes.json();
            if (billingData.success) {
              if (Array.isArray(billingData.transactions)) rawList = billingData.transactions;
              if (billingData.gatewayConfig && !loadedGatewayConfig) loadedGatewayConfig = billingData.gatewayConfig;
            }
          }
        } catch (_) {}
      }

      setTransactions(rawList.map(normalizeTransaction));
      if (loadedGatewayConfig) {
        setGatewayConfig(loadedGatewayConfig);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('failedLoadBilling', 'Failed to load billing transactions') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();

    const handleSync = () => fetchData();
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_payment_gateway_updated', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_wallet_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_payment_gateway_updated', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleSync);
    };
  }, [fetchData]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Filtered & Paginated Computation
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((tx) => {
      const matchesSearch = !q ||
        tx.id.toLowerCase().includes(q) ||
        tx.customerName.toLowerCase().includes(q) ||
        tx.customerEmail.toLowerCase().includes(q) ||
        tx.planName.toLowerCase().includes(q) ||
        tx.planSlug.toLowerCase().includes(q) ||
        tx.gateway.toLowerCase().includes(q) ||
        tx.status.toLowerCase().includes(q);

      const s = tx.status.toLowerCase();
      let matchesStatus = statusFilter === 'all';
      if (!matchesStatus) {
        if (statusFilter === 'succeeded') matchesStatus = ['succeeded', 'successful', 'paid', 'active', 'completed'].includes(s);
        else if (statusFilter === 'canceled') matchesStatus = ['canceled', 'cancelled'].includes(s);
        else if (statusFilter === 'refunded') matchesStatus = s === 'refunded';
        else if (statusFilter === 'failed') matchesStatus = ['failed', 'declined'].includes(s);
        else matchesStatus = s === statusFilter;
      }

      const g = tx.gateway.toLowerCase();
      const matchesGateway = gatewayFilter === 'all' || g === gatewayFilter;

      return matchesSearch && matchesStatus && matchesGateway;
    });
  }, [transactions, searchQuery, statusFilter, gatewayFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalVolume = 0;
    let succeededCount = 0;
    const gatewaysSet = new Set<string>();

    transactions.forEach((tx) => {
      if (tx.gateway) gatewaysSet.add(tx.gateway.toUpperCase());
      const s = tx.status.toLowerCase();
      if (['succeeded', 'successful', 'paid', 'active', 'completed'].includes(s)) {
        totalVolume += Number(tx.amount || 0);
        succeededCount += 1;
      }
    });

    return {
      totalCount: transactions.length,
      totalVolume,
      succeededCount,
      gatewaysCount: gatewaysSet.size || 1
    };
  }, [transactions]);

  const getPageNumbers = (curr: number, total: number) => {
    const pages: number[] = [];
    let start = Math.max(1, curr - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f8fafc)'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CreditCard className="h-7 w-7" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('billingInvoicesTitle', 'Invoices & Receipts')}</span>
            </h1>
            <p className="text-xs sm:text-sm opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              {t('billingInvoicesSubtitle', 'Review official receipts, inspect transaction references, and audit all gateway payments.')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-85 shadow-xs"
              style={{
                backgroundColor: 'var(--color-card, #0f172a)',
                borderColor: 'var(--color-border, #1e293b)',
                color: 'var(--color-text, #f8fafc)'
              }}
            >
              <Layers className="w-4 h-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('subscriptionsPageBtn', 'Subscriptions & Plans')}</span>
            </Link>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-80 disabled:opacity-50 shadow-xs"
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

        {/* Gateway Overview KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            className="p-4 rounded-2xl border transition-colors shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              <span>{t('totalInvoicesCount', 'Total Transactions')}</span>
              <History className="w-4 h-4 text-purple-400" />
            </div>
            <div suppressHydrationWarning className="font-mono font-black text-2xl" style={{ color: 'var(--color-text, #f8fafc)' }}>
              {stats.totalCount}
            </div>
            <div className="text-[11px] opacity-60 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              All gateway transactions
            </div>
          </div>

          <div 
            className="p-4 rounded-2xl border transition-colors shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              <span>{t('totalBilledVolume', 'Settled Volume')}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div suppressHydrationWarning className="font-mono font-black text-2xl" style={{ color: 'var(--color-emerald, #10b981)' }}>
              {gatewayConfig.currencySymbol || '$'}{stats.totalVolume.toFixed(2)}
            </div>
            <div className="text-[11px] opacity-60 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              Total paid across channels
            </div>
          </div>

          <div 
            className="p-4 rounded-2xl border transition-colors shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              <span>{t('succeededInvoices', 'Succeeded Payments')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div suppressHydrationWarning className="font-mono font-black text-2xl text-emerald-400">
              {stats.succeededCount}
            </div>
            <div className="text-[11px] opacity-60 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              Completed receipts
            </div>
          </div>

          <div 
            className="p-4 rounded-2xl border transition-colors shadow-sm"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              <span>{t('activeGateways', 'Payment Gateways')}</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div suppressHydrationWarning className="font-mono font-black text-2xl text-blue-400">
              {stats.gatewaysCount}
            </div>
            <div className="text-[11px] opacity-60 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              Stripe, PayPal, Wallet & Manual
            </div>
          </div>
        </div>

        {/* INVOICES & RECEIPTS TABLE CONTAINER WITH SEARCH & PAGINATION */}
        <div 
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          {/* Search, Status Filter, Gateway Filter, and Rows Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                placeholder={t('searchInvoicesPlaceholder', 'Search by customer, email, plan, gateway, or transaction ID...')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)',
                  color: 'var(--color-text, #f8fafc)'
                }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 shrink-0" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-bold bg-transparent outline-none cursor-pointer"
                  style={{ color: 'var(--color-text, #f8fafc)' }}
                >
                  <option value="all" className="bg-slate-900 text-slate-100">{t('filterAllStatus', 'All Statuses')}</option>
                  <option value="succeeded" className="bg-slate-900 text-slate-100">{t('filterSucceeded', 'Succeeded / Paid')}</option>
                  <option value="canceled" className="bg-slate-900 text-slate-100">{t('filterCanceled', 'Canceled')}</option>
                  <option value="refunded" className="bg-slate-900 text-slate-100">{t('filterRefunded', 'Refunded')}</option>
                  <option value="failed" className="bg-slate-900 text-slate-100">{t('filterFailed', 'Failed')}</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 shrink-0" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                <span className="text-[11px] font-bold opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>Gateway:</span>
                <select
                  value={gatewayFilter}
                  onChange={(e) => {
                    setGatewayFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-bold bg-transparent outline-none cursor-pointer uppercase"
                  style={{ color: 'var(--color-text, #f8fafc)' }}
                >
                  <option value="all" className="bg-slate-900 text-slate-100">All Gateways</option>
                  <option value="stripe" className="bg-slate-900 text-slate-100">Stripe</option>
                  <option value="paypal" className="bg-slate-900 text-slate-100">PayPal</option>
                  <option value="wallet" className="bg-slate-900 text-slate-100">Store Wallet</option>
                  <option value="manual" className="bg-slate-900 text-slate-100">Manual Wire</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 shrink-0" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                <span className="text-[11px] font-bold opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="text-xs font-bold bg-transparent outline-none cursor-pointer"
                  style={{ color: 'var(--color-text, #f8fafc)' }}
                >
                  <option value={10} className="bg-slate-900 text-slate-100">10</option>
                  <option value={25} className="bg-slate-900 text-slate-100">25</option>
                  <option value={50} className="bg-slate-900 text-slate-100">50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
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
                  <th className="px-4 py-3.5">{t('tableInvoiceId', 'Invoice / Tx ID')}</th>
                  <th className="px-4 py-3.5">{t('tableCustomer', 'Customer')}</th>
                  <th className="px-4 py-3.5">{t('tablePlan', 'Plan & Description')}</th>
                  <th className="px-4 py-3.5">{t('tableInterval', 'Interval')}</th>
                  <th className="px-4 py-3.5">{t('tableAmount', 'Amount')}</th>
                  <th className="px-4 py-3.5">{t('tableSource', 'Gateway')}</th>
                  <th className="px-4 py-3.5">{t('tableStatus', 'Status')}</th>
                  <th className="px-4 py-3.5">{t('tableDate', 'Date')}</th>
                  <th className="px-4 py-3.5 text-right">{t('tableActions', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs font-bold opacity-70">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--color-emerald, #10b981)' }} />
                        <span>Loading transactions from payment gateways...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs font-semibold opacity-50">
                      {transactions.length === 0 
                        ? t('noInvoicesRecorded', 'No invoices or gateway payments recorded yet.')
                        : t('noMatchingTransactions', 'No transactions found matching your search.')}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const isSucceeded = ['active', 'succeeded', 'successful', 'paid', 'completed'].includes(tx.status);
                    const isCanceled = tx.status === 'canceled' || tx.status === 'cancelled';
                    const isRefunded = tx.status === 'refunded';

                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors" style={{ color: 'var(--color-text, #f8fafc)' }}>
                        <td className="px-4 py-3.5 font-mono text-[11px] font-bold">
                          <span className="opacity-90">{tx.id?.length > 18 ? `${tx.id.substring(0, 18)}...` : tx.id}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-xs">{tx.customerName || 'Subscriber'}</div>
                          <span className="text-[10px] opacity-60 font-mono block truncate max-w-[130px]">{tx.customerEmail || '—'}</span>
                        </td>

                        <td className="px-4 py-3.5 font-bold">
                          <span>{tx.planName}</span>
                          {tx.autoRenew && tx.status !== 'canceled' && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Auto
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 uppercase font-semibold text-[11px] opacity-80 font-mono">
                          {tx.recurringInterval}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                          {CURRENCY_SYMBOLS[tx.currency] || tx.currency} {formatAmount(tx.amount)}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-md border" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                            {tx.gateway}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
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
                          {isRefunded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <RefreshCw className="w-3 h-3" />
                              <span>{t('statusRefunded', 'Refunded')}</span>
                            </span>
                          )}
                          {!isSucceeded && !isCanceled && !isRefunded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-[11px] opacity-75 font-mono whitespace-nowrap">
                          <span suppressHydrationWarning>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}</span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition hover:bg-white/5 cursor-pointer shadow-xs"
                            style={{ borderColor: 'var(--color-border, #1e293b)' }}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t('viewReceipt', 'Receipt')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Navigation Bar */}
          {filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <span className="opacity-70" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('showingCountInfo', 'Showing {start} - {end} of {total} transactions')
                  .replace('{start}', String((page - 1) * pageSize + 1))
                  .replace('{end}', String(Math.min(page * pageSize, filteredTransactions.length)))
                  .replace('{total}', String(filteredTransactions.length))}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer hover:opacity-80 transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)',
                    color: 'var(--color-text, #f8fafc)'
                  }}
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer hover:opacity-80 transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)',
                    color: 'var(--color-text, #f8fafc)'
                  }}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers(page, totalPages).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border cursor-pointer transition"
                    style={page === num ? {
                      backgroundColor: 'var(--color-emerald, #10b981)',
                      borderColor: 'var(--color-emerald, #10b981)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)',
                      color: 'var(--color-text, #f8fafc)'
                    }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer hover:opacity-80 transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)',
                    color: 'var(--color-text, #f8fafc)'
                  }}
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer hover:opacity-80 transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-border, #1e293b)',
                    color: 'var(--color-text, #f8fafc)'
                  }}
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INVOICE / RECEIPT MODAL DIALOG (FORM-FREE) */}
        {selectedInvoice && (
          <div 
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setSelectedInvoice(null)}
          >
            <div 
              className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 relative transition-all"
              style={{
                backgroundColor: 'var(--color-card, #0f172a)',
                borderColor: 'var(--color-border, #1e293b)',
                color: 'var(--color-text, #f8fafc)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Receipt Header */}
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{t('paymentReceiptTitle', 'Payment Receipt')}</h3>
                    <p className="text-xs opacity-60 font-mono truncate max-w-[220px]">{selectedInvoice.id}</p>
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
                    <span className="font-semibold text-slate-200">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center opacity-70">
                    <span>{t('customerEmailLabel', 'Email Address:')}</span>
                    <span className="font-mono text-slate-200">{selectedInvoice.customerEmail || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center opacity-70">
                    <span>{t('paymentDateLabel', 'Payment Date:')}</span>
                    <span suppressHydrationWarning className="text-slate-200">{selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString() : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center opacity-70">
                    <span>{t('paymentMethodLabel', 'Payment Gateway:')}</span>
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
                      {t('subscriptionTierAccess', 'Payment processing and subscription quota invoice')}
                    </div>
                  </div>
                  <div className="text-xl font-black font-mono" style={{ color: 'var(--color-emerald, #10b981)' }}>
                    {CURRENCY_SYMBOLS[selectedInvoice.currency] || selectedInvoice.currency} {formatAmount(selectedInvoice.amount)}
                  </div>
                </div>
              </div>

              {/* Receipt Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
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
    </div>
  );
}
