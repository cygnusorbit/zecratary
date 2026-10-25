'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Receipt, CreditCard, Wallet, Search, RefreshCw, Printer, 
  ChevronLeft, ChevronRight, X, ExternalLink, ShieldCheck, 
  CheckCircle2, AlertCircle, FileText, Download, ArrowUpRight
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface InvoiceTransaction {
  id: string;
  customer_name?: string;
  customerName?: string;
  customer_email?: string;
  customerEmail?: string;
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
  gateway_transaction_id?: string;
  gatewayTransactionId?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥', THB: '฿'
};

export default function BillingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<InvoiceTransaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // Search & Filter
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceTransaction | null>(null);

  // Re-entrancy guards
  const isFetchingRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // 1. Fetch live billing transactions from PostgreSQL /api/billing
  const fetchBillingRecords = useCallback(async (user: User | null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    const targetUserId = user?.id || 'usr_admin_1';
    const targetEmail = user?.email || 'admin@zecratary.com';

    try {
      if (typeof window !== 'undefined') {
        const cur = localStorage.getItem('zecratary_currency') || 'USD';
        setCurrencySymbol(CURRENCY_SYMBOLS[cur] || '$');
      }

      const res = await fetch(`/api/billing?email=${encodeURIComponent(targetEmail)}&userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (data.user?.wallet_balance !== undefined) {
            setWalletBalance(Number(data.user.wallet_balance));
          }
        }
      }

      // Wallet Balance Hydration
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
      console.warn('[BillingPage] Read notice:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const fetchRef = useRef(fetchBillingRecords);
  useEffect(() => {
    fetchRef.current = fetchBillingRecords;
  });

  useEffect(() => {
    document.title = `${t('billingHistoryTitle', 'Billing & Invoicing History')} - Zecratary`;
  }, [t]);

  // Initial Mount
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
    window.addEventListener('zecratary_wallet_updated', handleDebouncedSync);
    window.addEventListener('zecratary_languages_updated', handleDebouncedSync);
    window.addEventListener('zecratary_dictionary_updated', handleDebouncedSync);
    window.addEventListener('zecratary_locale_changed', handleDebouncedSync);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      window.removeEventListener('storage', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_languages_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_dictionary_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_locale_changed', handleDebouncedSync);
    };
  }, []); // Strictly mount-only

  // Summary Telemetry
  const stats = useMemo(() => {
    let totalPaid = 0;
    let successfulCount = 0;

    transactions.forEach(tx => {
      const st = (tx.status || 'succeeded').toLowerCase();
      if (st === 'succeeded' || st === 'active' || st === 'completed') {
        totalPaid += Number(tx.amount || 0);
        successfulCount++;
      }
    });

    return {
      totalPaid: totalPaid.toFixed(2),
      invoiceCount: transactions.length,
      successfulCount
    };
  }, [transactions]);

  // Filtered Ledger Pipeline
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const st = (tx.status || 'succeeded').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const pName = (tx.plan_name || tx.planName || '').toLowerCase();
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

  const handlePrintReceipt = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

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
            {t('billingHistoryTitle', 'Billing & Invoicing History')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('billingHistorySubtitle', 'Review your payment receipts, subscription renewals, and transaction records.')}
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
            href="/subscriptions"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span>{t('manageSubscriptionLink', 'Manage Subscriptions')}</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 1. Invoicing & Payment KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('totalAmountPaid', 'Total Amount Paid')}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {currencySymbol}{stats.totalPaid}
          </div>
        </div>

        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
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
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('activeMembershipTier', 'Active Membership Tier')}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-base font-black capitalize truncate" style={{ color: 'var(--color-primary)' }}>
            {(currentUser?.subscription_plan || 'Taster').replace(/-/g, ' ')}
          </div>
        </div>

        <div 
          className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('storeWalletCredits', 'Store Wallet Balance')}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">
            {currencySymbol}{walletBalance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 2. Billing & Invoicing Ledger Table */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
            {t('billingHistoryTitle', 'Billing & Invoicing History')}
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
                placeholder={t('searchBillingPlaceholder', 'Search invoices by plan, gateway, or ID...')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none font-medium w-48 sm:w-64"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="all">{t('allStatusesFilter', 'All Statuses')}</option>
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
            <div className="py-12 text-center text-xs opacity-50">
              {t('noInvoicesFound', 'No billing transactions found matching your criteria.')}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold opacity-70" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="py-2.5 px-3">{t('colInvoiceDate', 'Date')}</th>
                  <th className="py-2.5 px-3">{t('colInvoiceId', 'Invoice ID')}</th>
                  <th className="py-2.5 px-3">{t('colPlan', 'Plan / Item')}</th>
                  <th className="py-2.5 px-3">{t('colGateway', 'Payment Gateway')}</th>
                  <th className="py-2.5 px-3">{t('colStatus', 'Status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colAmount', 'Amount')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {paginatedTransactions.map((tx) => {
                  const st = (tx.status || 'succeeded').toLowerCase();
                  const isSuccess = st === 'succeeded' || st === 'active' || st === 'completed';
                  const isCancel = st === 'canceled' || st === 'cancelled';
                  const isRefund = st === 'refunded';
                  const rawDate = tx.created_at || tx.createdAt || new Date().toISOString();

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-3 font-mono text-[11px] opacity-75">
                        {new Date(rawDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] opacity-60">
                        {tx.id.slice(0, 14)}...
                      </td>
                      <td className="py-3 px-3 font-bold capitalize">
                        {tx.plan_name || tx.planName || 'Plan Subscription'}
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
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(tx)}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition hover:opacity-80 cursor-pointer shadow-xs"
                          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                        >
                          {t('viewInvoiceBtn', 'View Invoice')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t text-xs" style={{ borderColor: 'var(--color-border)' }}>
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
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                title={t('prevPage', 'Previous')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
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

      {/* OFFICIAL INVOICE MODAL (Printable & Autofill-Safe) */}
      {selectedInvoice && (
        <div 
          onClick={() => setSelectedInvoice(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="region"
            data-lpignore="true"
            className="border rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {/* Modal Actions */}
            <div className="flex justify-between items-center border-b pb-3 print:hidden" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                  {t('invoiceDetailsModalTitle', 'Official Payment Invoice')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-emerald)' }}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{t('printInvoiceBtn', 'Print Receipt')}</span>
                </button>
                <button type="button" onClick={() => setSelectedInvoice(null)} className="p-1 rounded-lg hover:opacity-80">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Invoice Printable Sheet */}
            <div className="space-y-6">
              {/* Brand & Invoice Reference */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
                    ZECRATARY
                  </h2>
                  <p className="text-[11px] opacity-70">Autonomous AI Culinary OS</p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="font-mono text-[10px] font-bold block opacity-60 uppercase">{t('colInvoiceId', 'Invoice ID')}</span>
                  <span className="font-mono font-black text-xs block">{selectedInvoice.id}</span>
                  <span className="text-[11px] opacity-75 block">{new Date(selectedInvoice.created_at || selectedInvoice.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Billed To & Payment Gateway Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('billedToLabel', 'Billed To')}</span>
                  <span className="font-bold block truncate">{selectedInvoice.customer_email || selectedInvoice.customerEmail || currentUser?.email || 'Chef'}</span>
                  <span className="text-[11px] opacity-70 block">{selectedInvoice.customer_name || selectedInvoice.customerName || currentUser?.name || 'Authorized Member'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('paymentMethodLabel', 'Payment Method')}</span>
                  <span className="font-bold uppercase block">{selectedInvoice.gateway || 'Stripe Gateway'}</span>
                  <span className="text-[10px] font-mono opacity-60 block truncate">{selectedInvoice.gateway_transaction_id || selectedInvoice.gatewayTransactionId || 'Verified Transaction'}</span>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{t('itemDescriptionHeading', 'Item Description')}</span>
                <div className="border rounded-xl p-3 flex justify-between items-center" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <div>
                    <span className="font-bold block capitalize">{selectedInvoice.plan_name || selectedInvoice.planName || 'Plan Subscription'}</span>
                    <span className="text-[10px] opacity-70 block">
                      {selectedInvoice.plan_slug?.includes('annual') ? '12 Months Access' : 'Monthly Recurring Access'}
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm">
                    {currencySymbol}{Number(selectedInvoice.amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="pt-2 border-t space-y-1.5 text-right font-mono" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between text-xs opacity-75">
                  <span className="font-sans">{t('subtotalLabel', 'Subtotal')}:</span>
                  <span>{currencySymbol}{Number(selectedInvoice.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-75">
                  <span className="font-sans">{t('taxLabel', 'Tax / VAT (0%)')}:</span>
                  <span>{currencySymbol}0.00</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                  <span className="font-sans">{t('totalPaidLabel', 'Total Paid')}:</span>
                  <span>{currencySymbol}{Number(selectedInvoice.amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t flex justify-end print:hidden" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
