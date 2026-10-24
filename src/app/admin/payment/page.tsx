// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, RefreshCw, 
  Search, ArrowDownLeft, XCircle, Check, Eye, EyeOff, Globe, Zap, 
  History, Sliders, Filter, PlusCircle, X, User as UserIcon, 
  Activity, Calendar, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, 
  ChevronsRight, ShieldAlert, Ban, ArrowUpRight, AlertTriangle, 
  Repeat, RotateCcw, ShieldCheck, Download, Wallet, Database
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface PaymentTransaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug?: string;
  amount: number;
  currency: string;
  gateway: 'stripe' | 'paypal' | 'manual' | 'wallet';
  status: 'succeeded' | 'failed' | 'refunded' | 'pending' | 'canceled';
  failureReason?: string;
  testMode?: boolean;
  createdAt: string;
  expiryDate?: string;
  isRecurring?: boolean;
  recurringInterval?: 'MONTH' | 'YEAR';
  autoRenew?: boolean;
  notes?: string;
}

interface GatewayConfig {
  activeGateway: 'stripe' | 'paypal' | 'both';
  currency: string;
  testMode: boolean;
  stripeConnected?: boolean;
  stripe: {
    enabled: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  paypal: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    webhookId: string;
    environment: 'sandbox' | 'live';
  };
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  priceFormatted: string;
  priceDollars: number;
  interval?: string;
  isFree?: boolean;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionPlan?: string;
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD - United States Dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR - Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP - British Pound (£)', symbol: '£' },
  { code: 'CAD', label: 'CAD - Canadian Dollar ($)', symbol: 'CA$' },
  { code: 'AUD', label: 'AUD - Australian Dollar ($)', symbol: 'A$' },
  { code: 'JPY', label: 'JPY - Japanese Yen (¥)', symbol: '¥' },
  { code: 'SGD', label: 'SGD - Singapore Dollar ($)', symbol: 'S$' },
  { code: 'CHF', label: 'CHF - Swiss Franc (Fr)', symbol: 'Fr' },
  { code: 'NZD', label: 'NZD - New Zealand Dollar ($)', symbol: 'NZ$' },
  { code: 'THB', label: 'THB - Thai Baht (฿)', symbol: '฿' }
];

const parseAmount = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

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

const normalizeTransaction = (raw: any, defaultCurrency: string = 'USD'): PaymentTransaction => {
  return {
    id: String(raw.id || ('tx_' + Math.random().toString(36).substring(2, 8))),
    customerName: String(raw.customerName || raw.customer_name || 'Customer'),
    customerEmail: String(raw.customerEmail || raw.customer_email || '').toLowerCase().trim(),
    planName: String(raw.planName || raw.plan_name || 'Subscription Plan'),
    planSlug: sanitizeSinglePlan(raw.planSlug || raw.plan_slug || ''),
    amount: parseAmount(raw.amount),
    currency: String(raw.currency || defaultCurrency || 'USD'),
    gateway: (raw.gateway || 'stripe') as any,
    status: (raw.status || 'succeeded') as any,
    failureReason: raw.failureReason || raw.failure_reason || undefined,
    testMode: Boolean(raw.testMode !== undefined ? raw.testMode : raw.test_mode),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    expiryDate: raw.expiryDate || raw.expiry_date || undefined,
    isRecurring: raw.isRecurring !== undefined ? Boolean(raw.isRecurring) : true,
    recurringInterval: raw.recurringInterval || raw.recurring_interval || (String(raw.planSlug || raw.plan_slug || '').includes('annual') ? 'YEAR' : 'MONTH'),
    autoRenew: raw.autoRenew !== undefined ? Boolean(raw.autoRenew) : true,
    notes: raw.notes || undefined
  };
};

export default function AdminPaymentPage() {
  const { t, locale } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [activeTab, setActiveTab] = useState<'ledger' | 'settings'>('ledger');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [togglingTxId, setTogglingTxId] = useState<string | null>(null);

  // Selection & Export State
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Filtering & Pagination State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'plans' | 'wallet'>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Add Payment Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<'subscription' | 'wallet'>('subscription');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('8.99');
  const [gatewayInput, setGatewayInput] = useState<'stripe' | 'paypal' | 'manual' | 'wallet'>('stripe');
  const [statusInput, setStatusInput] = useState<'succeeded' | 'pending' | 'failed'>('succeeded');
  const [notesInput, setNotesInput] = useState<string>('');
  const [recordingPayment, setRecordingPayment] = useState<boolean>(false);

  // Gateway Settings State
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({
    activeGateway: 'both',
    currency: 'USD',
    testMode: true,
    stripeConnected: true,
    stripe: {
      enabled: true,
      publishableKey: 'pk_test_sample',
      secretKey: 'sk_test_sample',
      webhookSecret: 'whsec_sample'
    },
    paypal: {
      enabled: true,
      clientId: 'sandbox_client_id',
      clientSecret: 'sandbox_client_secret',
      webhookId: 'webhook_sample',
      environment: 'sandbox'
    }
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch transactions, plans, and users from backend APIs
  const loadPaymentData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, plansRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/payment?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/admin/plans?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/admin/users?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/admin/payment-gateway?t=' + Date.now(), { cache: 'no-store' }).catch(() => null)
      ]);

      let loadedCurrency = 'USD';

      // 1. Parse Gateway Settings
      if (settingsRes && settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.gatewayConfig) {
          setGatewayConfig(sData.gatewayConfig);
          if (sData.gatewayConfig.currency) loadedCurrency = sData.gatewayConfig.currency;
        }
      }

      // 2. Parse Plans
      if (plansRes.ok) {
        const pData = await plansRes.json();
        const pList = Array.isArray(pData) ? pData : (pData.plans || pData.configs || []);
        const validPlans: PlanOption[] = [];
        pList.forEach((p: any) => {
          const mPrice = Number(p.monthlyPriceDollars ?? p.monthly_price ?? p.price ?? 0);
          const aPrice = Number(p.annualPriceDollars ?? p.annual_price ?? 0);
          const cleanSlug = (p.slug || p.id || 'plan').toLowerCase();
          if (mPrice > 0) {
            validPlans.push({
              id: `${cleanSlug}-monthly`,
              name: `${p.name} (Monthly)`,
              slug: `${cleanSlug}-monthly`,
              priceFormatted: `$${mPrice.toFixed(2)}/mo`,
              priceDollars: mPrice,
              interval: 'MONTH'
            });
          }
          if (aPrice > 0) {
            validPlans.push({
              id: `${cleanSlug}-annual`,
              name: `${p.name} (Annual)`,
              slug: `${cleanSlug}-annual`,
              priceFormatted: `$${aPrice.toFixed(2)}/yr`,
              priceDollars: aPrice,
              interval: 'YEAR'
            });
          }
        });
        setAvailablePlans(validPlans);
        if (validPlans[0] && !selectedPlanSlug) {
          setSelectedPlanSlug(validPlans[0].slug);
          setAmountInput(String(validPlans[0].priceDollars));
        }
      }

      // 3. Parse Users
      if (usersRes.ok) {
        const uData = await usersRes.json();
        const uList = Array.isArray(uData) ? uData : (uData.users || []);
        setRegisteredUsers(uList);
        if (uList[0] && !selectedUserEmail) {
          setSelectedUserEmail(uList[0].email);
        }
      }

      // 4. Parse Transactions
      if (txRes.ok) {
        const tData = await txRes.json();
        const rawTxs: any[] = Array.isArray(tData.transactions) ? tData.transactions : [];
        const normalized = rawTxs.map(tx => normalizeTransaction(tx, loadedCurrency));
        setTransactions(normalized);
      }
    } catch (err) {
      console.warn('Notice loading /admin/payment data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlanSlug, selectedUserEmail]);

  useEffect(() => {
    document.title = tr('adminPayDocTitle', 'Payment History & Gateway - Admin Console');
    loadPaymentData();

    const handleSync = () => loadPaymentData();
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadPaymentData, tr]);

  // Synchronize amount when selected plan changes in the Add Payment modal
  useEffect(() => {
    if (paymentType === 'subscription') {
      const matched = availablePlans.find(p => p.slug === selectedPlanSlug);
      if (matched) {
        setAmountInput(String(matched.priceDollars));
      }
    }
  }, [selectedPlanSlug, paymentType, availablePlans]);

  // Interactive Auto-Renew Toggle
  const handleToggleAutoRenew = async (tx: PaymentTransaction) => {
    setTogglingTxId(tx.id);
    const nextAutoRenew = !tx.autoRenew;
    const updatedTx = { ...tx, autoRenew: nextAutoRenew };

    setTransactions(prev => prev.map(t => t.id === tx.id ? updatedTx : t));

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_transaction',
          transaction: updatedTx
        })
      });

      if (!res.ok) throw new Error('Failed to update renewal status.');

      window.dispatchEvent(new Event('zecratary_payment_updated'));
      showToast('success', `Auto-renew for ${tx.customerEmail} set to ${nextAutoRenew ? 'Active' : 'Off'}.`);
    } catch (err: any) {
      setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
      showToast('error', err.message || 'Error updating renewal.');
    } finally {
      setTogglingTxId(null);
    }
  };

  // Refund transaction
  const handleRefundTransaction = async (tx: PaymentTransaction) => {
    if (!confirm(tr('adminPayConfirmRefund', 'Are you sure you want to refund this transaction and downgrade the customer\'s plan?'))) return;

    try {
      const refundedTx = {
        ...tx,
        status: 'refunded',
        expiryDate: new Date().toISOString()
      };

      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_transaction',
          transaction: refundedTx
        })
      });

      if (!res.ok) throw new Error('Failed to refund transaction.');

      setTransactions(prev => prev.map(t => t.id === tx.id ? refundedTx : t));
      window.dispatchEvent(new Event('zecratary_payment_updated'));
      showToast('success', tr('adminPaySuccessRefunded', 'Transaction marked as refunded and customer notified.'));
    } catch (err: any) {
      showToast('error', err.message || 'Error processing refund.');
    }
  };

  // Delete transaction record
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm(tr('adminPayConfirmDelete', 'Are you sure you want to permanently delete this transaction record?'))) return;

    try {
      const res = await fetch(`/api/admin/payment?id=${encodeURIComponent(txId)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete transaction.');

      setTransactions(prev => prev.filter(t => t.id !== txId));
      setSelectedTxIds(prev => prev.filter(id => id !== txId));
      window.dispatchEvent(new Event('zecratary_payment_updated'));
      showToast('success', tr('adminPaySuccessDeleted', 'Transaction record deleted successfully.'));
    } catch (err: any) {
      showToast('error', err.message || 'Error deleting transaction.');
    }
  };

  // Submit new payment or wallet credit
  const handleRecordPayment = async () => {
    if (!selectedUserEmail) {
      alert('Please select a customer.');
      return;
    }

    setRecordingPayment(true);
    const parsedAmt = parseFloat(amountInput) || 0;
    const matchedUser = registeredUsers.find(u => u.email.toLowerCase() === selectedUserEmail.toLowerCase());
    const matchedPlan = availablePlans.find(p => p.slug === selectedPlanSlug);

    const isSub = paymentType === 'subscription';
    const planTitle = isSub ? (matchedPlan?.name || 'Pro Subscription') : 'Wallet Top-Up / Adjustment';
    const planSlugTarget = isSub ? (matchedPlan?.slug || 'nutrition-pro-monthly') : 'wallet-credit';

    // Compute expiry for recurring subscription
    const expiry = new Date();
    if (isSub && matchedPlan?.interval === 'YEAR') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else if (isSub) {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const newTx: PaymentTransaction = {
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      customerName: matchedUser?.name || selectedUserEmail.split('@')[0],
      customerEmail: selectedUserEmail.toLowerCase().trim(),
      planName: planTitle,
      planSlug: planSlugTarget,
      amount: parsedAmt,
      currency: gatewayConfig.currency || 'USD',
      gateway: gatewayInput,
      status: statusInput,
      testMode: gatewayConfig.testMode,
      createdAt: new Date().toISOString(),
      expiryDate: isSub ? expiry.toISOString() : undefined,
      isRecurring: isSub,
      recurringInterval: isSub ? (matchedPlan?.interval as any || 'MONTH') : undefined,
      autoRenew: isSub,
      notes: notesInput.trim() || undefined
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_transaction',
          transaction: newTx
        })
      });

      if (!res.ok) throw new Error('Failed to record payment in database.');

      setTransactions(prev => [newTx, ...prev]);
      setShowAddModal(false);
      setNotesInput('');

      // Dispatch global events for live UI synchronization
      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('zecratary_wallet_settings_updated'));

      showToast('success', tr('adminPaySuccessRecorded', 'Payment recorded and customer account updated successfully!'));
    } catch (err: any) {
      showToast('error', err.message || 'Error recording payment.');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Save Gateway Configurations
  const handleSaveGatewaySettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayConfig
        })
      });

      if (!res.ok) throw new Error('Failed to save gateway settings.');

      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      showToast('success', tr('adminPaySuccessSettings', 'Payment gateway configurations saved and broadcasted!'));
    } catch (err: any) {
      showToast('error', err.message || 'Error saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered and Search-Matched Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Text Search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchName = (t.customerName || '').toLowerCase().includes(query);
        const matchEmail = (t.customerEmail || '').toLowerCase().includes(query);
        const matchPlan = (t.planName || '').toLowerCase().includes(query);
        const matchId = (t.id || '').toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchPlan && !matchId) return false;
      }

      // 2. Category Filter
      const isWallet = (t.planSlug || '').includes('wallet') || (t.planName || '').toLowerCase().includes('wallet');
      if (categoryFilter === 'plans' && isWallet) return false;
      if (categoryFilter === 'wallet' && !isWallet) return false;

      // 3. Gateway Filter
      if (gatewayFilter !== 'all' && t.gateway !== gatewayFilter) return false;

      // 4. Status Filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      return true;
    });
  }, [transactions, search, categoryFilter, gatewayFilter, statusFilter]);

  // Aggregate Telemetry Metrics
  const metrics = useMemo(() => {
    let revenue = 0;
    let successfulCount = 0;
    let activeSubsCount = 0;
    let walletCreditsCount = 0;

    transactions.forEach(t => {
      if (t.status === 'succeeded') {
        revenue += t.amount || 0;
        successfulCount++;
        if (t.autoRenew && t.isRecurring) activeSubsCount++;
        if ((t.planSlug || '').includes('wallet') || (t.planName || '').toLowerCase().includes('wallet')) {
          walletCreditsCount++;
        }
      }
    });

    return { revenue, successfulCount, activeSubsCount, walletCreditsCount };
  }, [transactions]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTxs = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Selection toggle
  const toggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isAllOnPageSelected = paginatedTxs.length > 0 && paginatedTxs.every(t => selectedTxIds.includes(t.id));
  const handleToggleSelectAll = () => {
    const pageIds = paginatedTxs.map(t => t.id);
    if (isAllOnPageSelected) {
      setSelectedTxIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'json') => {
    const targets = selectedTxIds.length > 0 
      ? transactions.filter(t => selectedTxIds.includes(t.id)) 
      : filteredTransactions;

    if (targets.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(targets, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const headers = ['Transaction ID', 'Customer Name', 'Customer Email', 'Item / Plan', 'Amount', 'Currency', 'Gateway', 'Status', 'Created At', 'Expiry Date', 'Auto Renew'];
      const rows = targets.map(t => [
        `"${t.id}"`,
        `"${t.customerName}"`,
        `"${t.customerEmail}"`,
        `"${t.planName}"`,
        t.amount.toFixed(2),
        t.currency,
        t.gateway,
        t.status,
        `"${t.createdAt}"`,
        `"${t.expiryDate || ''}"`,
        t.autoRenew ? 'Yes' : 'No'
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return { label: tr('adminPayStatusSucceeded', 'Succeeded'), bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--color-emerald, #10b981)', color: 'var(--color-emerald, #10b981)' };
      case 'pending':
        return { label: tr('adminPayStatusPending', 'Pending'), bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', color: '#f59e0b' };
      case 'refunded':
        return { label: tr('adminPayStatusRefunded', 'Refunded'), bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6', color: '#a78bfa' };
      case 'failed':
      case 'canceled':
      default:
        return { label: status.toUpperCase(), bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', color: '#ef4444' };
    }
  };

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header & Telemetry Badges */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <CreditCard className="h-6 w-6" /> {tr('adminPayTitle', 'Payment Ledger & Gateway Management')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('adminPaySubtitle', 'Audit transaction histories, manage Stripe & PayPal gateways, and record manual payments or wallet credits.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>PostgreSQL & MySQL Synced</span>
          </div>

          <button
            type="button"
            onClick={loadPaymentData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{tr('adminPayReloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{tr('adminPayExportCsv', 'Export CSV')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{tr('adminPayExportJson', 'Export JSON')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <PlusCircle className="h-4 w-4" />
            <span>{tr('adminPayAddPaymentBtn', '+ Add Payment / Credit')}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: tr('adminPayMetricTotalRevenue', 'Total Gross Revenue'), value: `$${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Zap, color: 'var(--color-primary)' },
          { label: tr('adminPayMetricSuccessful', 'Successful Transactions'), value: metrics.successfulCount, icon: CheckCircle2, color: 'var(--color-emerald, #10b981)' },
          { label: tr('adminPayMetricActiveSubs', 'Active Recurring Subscriptions'), value: metrics.activeSubsCount, icon: Repeat, color: '#3b82f6' },
          { label: tr('adminPayMetricWalletCredits', 'Wallet Top-Ups / Adjustments'), value: metrics.walletCreditsCount, icon: Wallet, color: '#a855f7' }
        ].map((card, i) => (
          <div
            key={i}
            className="p-4 rounded-3xl border shadow-sm space-y-1 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{card.label}</span>
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
            </div>
            <div className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Workspace Tabs (Ledger vs Gateway Settings) */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'ledger' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <History className="h-4 w-4" />
          <span>{tr('adminPayTabLedger', 'Transaction Ledger')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'settings' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Sliders className="h-4 w-4" />
          <span>{tr('adminPayTabSettings', 'Gateway & Currency Settings')}</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filters Bar (Autofill Safe Guardrail - Constraint 9) */}
          <div 
            role="region"
            data-lpignore="true"
            className="p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-3 shadow-md transition-colors"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="relative w-full md:w-96">
              <Search className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                placeholder={tr('adminPaySearchPlaceholder', 'Search by customer name, email, plan, or transaction ID...')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full border rounded-2xl pl-10 pr-3.5 py-2 text-xs outline-none transition"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value as any); setCurrentPage(1); }}
                className="px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="all">{tr('adminPayFilterCategoryAll', 'All Categories')}</option>
                <option value="plans">{tr('adminPayFilterCategoryPlans', 'Plan Subscriptions')}</option>
                <option value="wallet">{tr('adminPayFilterCategoryWallet', 'Wallet Transactions')}</option>
              </select>

              <select
                value={gatewayFilter}
                onChange={(e) => { setGatewayFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="all">{tr('adminPayFilterGatewayAll', 'All Gateways')}</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="wallet">Wallet Balance</option>
                <option value="manual">Manual Settlement</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="all">{tr('adminPayFilterStatusAll', 'All Statuses')}</option>
                <option value="succeeded">{tr('adminPayStatusSucceeded', 'Succeeded')}</option>
                <option value="pending">{tr('adminPayStatusPending', 'Pending')}</option>
                <option value="refunded">{tr('adminPayStatusRefunded', 'Refunded')}</option>
                <option value="failed">{tr('adminPayStatusFailed', 'Failed')}</option>
              </select>
            </div>
          </div>

          {/* Selection Actions Banner */}
          {selectedTxIds.length > 0 && (
            <div 
              className="p-3.5 px-5 rounded-2xl flex items-center justify-between text-xs border shadow-lg animate-in fade-in"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-text)' }}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  {tr('adminPaySelectedCount', '{count} transaction(s) selected').replace('{count}', String(selectedTxIds.length))}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTxIds([])}
                  className="text-[11px] underline cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {tr('adminPayClearSelection', 'Clear selection')}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="px-3 py-1.5 rounded-xl text-white font-bold flex items-center gap-1.5 cursor-pointer shadow text-xs hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="px-3 py-1.5 rounded-xl font-bold border cursor-pointer text-xs"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div 
            className="border rounded-3xl overflow-hidden shadow-xl transition-colors"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead 
                  className="border-b uppercase font-bold text-[10px] tracking-wider"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <tr>
                    <th className="w-10 px-4 py-4 text-center">
                      <input type="checkbox" checked={isAllOnPageSelected} onChange={handleToggleSelectAll} className="rounded cursor-pointer" />
                    </th>
                    <th className="px-5 py-4">{tr('adminPayColTxId', 'Transaction ID')}</th>
                    <th className="px-5 py-4">{tr('adminPayColCustomer', 'Customer')}</th>
                    <th className="px-5 py-4">{tr('adminPayColItem', 'Package / Item')}</th>
                    <th className="px-5 py-4">{tr('adminPayColAmount', 'Amount')}</th>
                    <th className="px-5 py-4">{tr('adminPayColGateway', 'Gateway')}</th>
                    <th className="px-5 py-4">{tr('adminPayColStatus', 'Status')}</th>
                    <th className="px-5 py-4">{tr('adminPayColDate', 'Date & Expiry')}</th>
                    <th className="px-5 py-4 text-center">{tr('adminPayColRenewal', 'Auto-Renew')}</th>
                    <th className="px-5 py-4 text-right">{tr('adminPayColActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {paginatedTxs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                        {tr('adminPayNoTransactions', 'No transactions found matching criteria.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedTxs.map((tx) => {
                      const isSelected = selectedTxIds.includes(tx.id);
                      const isWallet = (tx.planSlug || '').includes('wallet') || (tx.planName || '').toLowerCase().includes('wallet');
                      const statusBadge = getStatusBadge(tx.status);
                      return (
                        <tr 
                          key={tx.id} 
                          className="transition"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: isSelected ? 'var(--color-inner-dark)' : undefined
                          }}
                        >
                          <td className="w-10 px-4 py-4 text-center">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectTx(tx.id)} className="rounded cursor-pointer" />
                          </td>

                          <td className="px-5 py-4 font-mono font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                            <div className="flex items-center gap-1.5">
                              <span>{tx.id}</span>
                              {tx.testMode && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                  {tr('adminPayBadgeTest', 'TEST')}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{tx.customerName}</div>
                            <div className="font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{tx.customerEmail}</div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold" style={{ color: 'var(--color-text)' }}>{tx.planName}</span>
                              {isWallet && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                                  {tr('adminPayBadgeWallet', 'Wallet')}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono font-black text-sm" style={{ color: 'var(--color-text)' }}>
                            ${tx.amount.toFixed(2)} <span className="text-[10px] font-normal opacity-70">{tx.currency}</span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 rounded-lg border font-mono text-[10px] font-bold uppercase" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                              {tx.gateway}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span 
                              className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit"
                              style={{ backgroundColor: statusBadge.bg, borderColor: statusBadge.border, color: statusBadge.color }}
                            >
                              {statusBadge.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            <div>{new Date(tx.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            {tx.expiryDate && (
                              <div className="font-mono text-[10px] opacity-75">
                                Exp: {new Date(tx.expiryDate).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            {tx.isRecurring && !isWallet ? (
                              <button
                                type="button"
                                disabled={togglingTxId === tx.id || tx.status !== 'succeeded'}
                                onClick={() => handleToggleAutoRenew(tx)}
                                className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition cursor-pointer hover:scale-105 disabled:opacity-40"
                                style={tx.autoRenew ? {
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  borderColor: 'var(--color-emerald, #10b981)',
                                  color: 'var(--color-emerald, #10b981)'
                                } : {
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  borderColor: '#ef4444',
                                  color: '#ef4444'
                                }}
                                title={tr('adminPayToggleRenewTooltip', 'Toggle Subscription Auto-Renewal')}
                              >
                                {tx.autoRenew ? tr('adminPayAutoRenewActive', 'Active') : tr('adminPayAutoRenewOff', 'Off')}
                              </button>
                            ) : (
                              <span className="text-[10px] opacity-40">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {tx.status === 'succeeded' && (
                                <button
                                  type="button"
                                  onClick={() => handleRefundTransaction(tx)}
                                  className="p-1.5 rounded-xl border text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer transition shadow-xs"
                                  title={tr('adminPayRefundTooltip', 'Issue Refund & Cancel')}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="p-1.5 rounded-xl border text-red-400 border-red-500/30 hover:bg-red-500/10 cursor-pointer transition shadow-xs"
                                title={tr('adminPayDeleteTooltip', 'Delete Transaction Record')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredTransactions.length > itemsPerPage && (
              <div 
                className="px-5 py-3.5 border-t flex items-center justify-between text-xs transition-colors"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <span>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} records
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="font-bold px-2" style={{ color: 'var(--color-text)' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GATEWAY & CURRENCY SETTINGS */}
      {activeTab === 'settings' && (
        <div 
          role="region"
          data-lpignore="true"
          className="rounded-3xl p-6 border shadow-xl space-y-6 transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <ShieldCheck className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              {tr('adminPaySettingsHeading', 'Payment Gateway Configurations')}
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {tr('adminPaySettingsSubtitle', 'Manage primary processing currencies and API credentials for Stripe and PayPal.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('adminPayLabelCurrency', 'System Processing Currency')}
              </label>
              <select
                value={gatewayConfig.currency}
                onChange={(e) => setGatewayConfig({ ...gatewayConfig, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <div>
                <span className="font-bold block" style={{ color: 'var(--color-text)' }}>{tr('adminPayLabelTestMode', 'Global Test / Sandbox Mode')}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{tr('adminPayDescTestMode', 'When active, charges are simulated without billing real credit cards.')}</span>
              </div>
              <input
                type="checkbox"
                checked={gatewayConfig.testMode}
                onChange={(e) => setGatewayConfig({ ...gatewayConfig, testMode: e.target.checked })}
                className="rounded cursor-pointer h-4 w-4"
              />
            </div>
          </div>

          {/* Stripe Config */}
          <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                {tr('adminPayStripeHeading', 'Stripe Gateway Integration')}
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={gatewayConfig.stripe.enabled}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    stripe: { ...gatewayConfig.stripe, enabled: e.target.checked }
                  })}
                  className="rounded"
                />
                <span>Enable Stripe</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1 opacity-75">{tr('adminPayLabelPublishableKey', 'Stripe Publishable Key')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={gatewayConfig.stripe.publishableKey}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    stripe: { ...gatewayConfig.stripe, publishableKey: e.target.value }
                  })}
                  placeholder="pk_test_..."
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-75">{tr('adminPayLabelSecretKey', 'Stripe Secret Key')}</label>
                <input
                  type="password"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={gatewayConfig.stripe.secretKey}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    stripe: { ...gatewayConfig.stripe, secretKey: e.target.value }
                  })}
                  placeholder="sk_test_..."
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-75">{tr('adminPayLabelWebhookSecret', 'Stripe Webhook Secret')}</label>
                <input
                  type="password"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={gatewayConfig.stripe.webhookSecret}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    stripe: { ...gatewayConfig.stripe, webhookSecret: e.target.value }
                  })}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>

          {/* PayPal Config */}
          <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                {tr('adminPayPaypalHeading', 'PayPal Gateway Integration')}
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={gatewayConfig.paypal.enabled}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    paypal: { ...gatewayConfig.paypal, enabled: e.target.checked }
                  })}
                  className="rounded"
                />
                <span>Enable PayPal</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1 opacity-75">{tr('adminPayLabelClientId', 'PayPal Client ID')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={gatewayConfig.paypal.clientId}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    paypal: { ...gatewayConfig.paypal, clientId: e.target.value }
                  })}
                  placeholder="client_id_..."
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-75">{tr('adminPayLabelClientSecret', 'PayPal Secret Key')}</label>
                <input
                  type="password"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={gatewayConfig.paypal.clientSecret}
                  onChange={(e) => setGatewayConfig({
                    ...gatewayConfig,
                    paypal: { ...gatewayConfig.paypal, clientSecret: e.target.value }
                  })}
                  placeholder="secret_key_..."
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={handleSaveGatewaySettings}
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Save className={`h-4 w-4 ${savingSettings ? 'animate-spin' : ''}`} />
              <span>{savingSettings ? tr('adminPaySavingSettings', 'Saving Settings...') : tr('adminPayBtnSaveSettings', 'Save Gateway Settings')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ADD PAYMENT MODAL (Accessible & Form-Free Container - Constraint 9) */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md cursor-pointer transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-text-secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                <PlusCircle className="h-5 w-5" /> {tr('adminPayModalAddTitle', 'Record Payment / Wallet Credit')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('adminPayModalAddSubtitle', 'Manually credit a user wallet or activate an official subscription tier.')}
              </p>
            </div>

            {/* Type Switcher */}
            <div 
              className="flex p-1 rounded-xl border"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => setPaymentType('subscription')}
                className="flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer"
                style={paymentType === 'subscription' ? {
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-primary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                } : { color: 'var(--color-text-secondary)' }}
              >
                {tr('adminPayTypeSubscription', 'Subscription Plan')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('wallet')}
                className="flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer"
                style={paymentType === 'wallet' ? {
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-primary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                } : { color: 'var(--color-text-secondary)' }}
              >
                {tr('adminPayTypeWallet', 'Wallet Credit / Top-Up')}
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminPayLabelCustomer', 'Select Customer *')}
                </label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="">{tr('adminPayPlaceholderSelectCustomer', '-- Choose Customer --')}</option>
                  {registeredUsers.map(u => (
                    <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {paymentType === 'subscription' && (
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPayLabelPlan', 'Select Subscription Plan *')}
                  </label>
                  <select
                    value={selectedPlanSlug}
                    onChange={(e) => setSelectedPlanSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {availablePlans.map(p => (
                      <option key={p.id} value={p.slug}>{p.name} - {p.priceFormatted}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPayLabelAmount', 'Payment Amount ({currency}) *').replace('{currency}', gatewayConfig.currency || 'USD')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPayLabelGateway', 'Payment Gateway *')}
                  </label>
                  <select
                    value={gatewayInput}
                    onChange={(e) => setGatewayInput(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="stripe">{tr('adminPayGatewayStripe', 'Stripe')}</option>
                    <option value="paypal">{tr('adminPayGatewayPaypal', 'PayPal')}</option>
                    <option value="wallet">{tr('adminPayGatewayWallet', 'Store Wallet Balance')}</option>
                    <option value="manual">{tr('adminPayGatewayManual', 'Manual Settlement')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminPayLabelNotes', 'Internal Administrative Notes')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder={tr('adminPayPlaceholderNotes', 'e.g. Bank wire transfer confirmation #12345')}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {tr('adminPayBtnCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={recordingPayment || !selectedUserEmail}
                className="px-5 py-2 text-white font-bold rounded-xl shadow-md transition hover:opacity-90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Check className={`h-4 w-4 ${recordingPayment ? 'animate-spin' : ''}`} />
                <span>{recordingPayment ? tr('adminPayRecording', 'Recording...') : tr('adminPayBtnRecord', 'Record Payment & Activate')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast Notification */}
      {feedback && (
        <div
          className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : 'rgba(239, 68, 68, 0.4)',
            color: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}
    </div>
  );
}
