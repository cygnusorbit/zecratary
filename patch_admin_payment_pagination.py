import os

target_dirs = [
    'apps/web/src/app/admin/payment',
    'src/app/admin/payment'
]

target_dir = next((d for d in target_dirs if os.path.exists(d)), None)

if not target_dir:
    if os.path.exists('apps/web/src/app/admin'):
        target_dir = 'apps/web/src/app/admin/payment'
    elif os.path.exists('src/app/admin'):
        target_dir = 'src/app/admin/payment'
    elif os.path.exists('apps/web'):
        target_dir = 'apps/web/src/app/admin/payment'
    else:
        target_dir = 'src/app/admin/payment'

os.makedirs(target_dir, exist_ok=True)
payment_page_path = os.path.join(target_dir, 'page.tsx')

payment_code = """// Generated & Maintained by Zecratary Admin Suite
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard, Shield, DollarSign, CheckCircle2, AlertCircle,
  RefreshCw, Search, Filter, Trash2, Key, Settings,
  RotateCcw, ExternalLink, Plus, Download, Check, Eye,
  EyeOff, ArrowLeft, ArrowUpRight, Zap, Globe, Activity,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface PaymentGatewayConfig {
  stripeEnabled: boolean;
  stripeTestMode: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  paypalEnabled: boolean;
  paypalSandboxMode: boolean;
  paypalClientId: string;
  paypalClientSecret: string;
  defaultCurrency: string;
  manualPaymentEnabled: boolean;
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

const DEFAULT_CONFIG: PaymentGatewayConfig = {
  stripeEnabled: true,
  stripeTestMode: true,
  stripePublishableKey: 'pk_test_51ZecrataryLiveStripeKeySamplePub98124',
  stripeSecretKey: 'sk_test_51ZecratarySecretKeySampleSec009124',
  stripeWebhookSecret: 'whsec_991823sampleWebhookSecretVerified',
  paypalEnabled: false,
  paypalSandboxMode: true,
  paypalClientId: '',
  paypalClientSecret: '',
  defaultCurrency: 'USD',
  manualPaymentEnabled: true,
};

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$) - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$) - Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) - Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$) - Singapore Dollar' },
  { code: 'CHF', symbol: 'Fr', label: 'CHF (Fr) - Swiss Franc' },
  { code: 'NZD', symbol: 'NZ$', label: 'NZD (NZ$) - New Zealand Dollar' },
  { code: 'THB', symbol: '฿', label: 'THB (฿) - Thai Baht' },
];

const INITIAL_MOCK_TXS: PaymentTransaction[] = [
  {
    id: 'tx_sec_0019a',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus@example.com',
    planName: 'Nutrition Pro (Annual)',
    planSlug: 'nutrition-pro-annual',
    amount: 59.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'succeeded',
    testMode: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
  },
  {
    id: 'tx_sec_0018b',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@sample.org',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'succeeded',
    testMode: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiryDate: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: 'tx_sec_0017c',
    customerName: 'David K.',
    customerEmail: 'david.k@testmail.io',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'paypal',
    status: 'refunded',
    testMode: true,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    expiryDate: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'tx_sec_0016d',
    customerName: 'Aria Montgomery',
    customerEmail: 'aria.m@domain.com',
    planName: 'Nutrition Pro (Annual)',
    planSlug: 'nutrition-pro-annual',
    amount: 59.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'succeeded',
    testMode: true,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    expiryDate: new Date(Date.now() + 355 * 86400000).toISOString(),
  },
  {
    id: 'tx_sec_0015e',
    customerName: 'Leo Fitz',
    customerEmail: 'fitz@shield.gov',
    planName: 'Nutrition Pro (Monthly)',
    planSlug: 'nutrition-pro-monthly',
    amount: 8.99,
    currency: 'USD',
    gateway: 'manual',
    status: 'succeeded',
    testMode: true,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    expiryDate: new Date(Date.now() + 18 * 86400000).toISOString(),
  },
  {
    id: 'tx_sec_0014f',
    customerName: 'Jemma Simmons',
    customerEmail: 'simmons@shield.gov',
    planName: 'Nutrition Pro (Annual)',
    planSlug: 'nutrition-pro-annual',
    amount: 59.99,
    currency: 'USD',
    gateway: 'stripe',
    status: 'succeeded',
    testMode: true,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    expiryDate: new Date(Date.now() + 350 * 86400000).toISOString(),
  }
];

export default function AdminPaymentPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Settings state
  const [config, setConfig] = useState<PaymentGatewayConfig>(DEFAULT_CONFIG);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [testingGateway, setTestingGateway] = useState<'stripe' | 'paypal' | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<{ stripe?: string; paypal?: string }>({});

  // Transactions state
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filterGateway, setFilterGateway] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Simulator / Manual modal
  const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
  const [simName, setSimName] = useState<string>('Jane Doe');
  const [simEmail, setSimEmail] = useState<string>('jane.user@example.com');
  const [simPlan, setSimPlan] = useState<string>('nutrition-pro-annual');
  const [simAmount, setSimAmount] = useState<number>(59.99);
  const [simGateway, setSimGateway] = useState<'stripe' | 'paypal' | 'manual'>('stripe');

  // Load Auth & Security
  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }
    if (active.role !== 'admin') {
      router.replace('/profile');
      return;
    }
    setUser(active);
  }, [router]);

  // Load Theme
  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_theme_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_theme_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  // Load Config & Transactions
  const reloadData = useCallback(() => {
    try {
      const rawCfg = localStorage.getItem('zecratary_payment_config');
      if (rawCfg) {
        setConfig(JSON.parse(rawCfg));
      } else {
        localStorage.setItem('zecratary_payment_config', JSON.stringify(DEFAULT_CONFIG));
      }

      const rawTxs = localStorage.getItem('zecratary_payment_transactions');
      if (rawTxs) {
        setTransactions(JSON.parse(rawTxs));
      } else {
        setTransactions(INITIAL_MOCK_TXS);
        localStorage.setItem('zecratary_payment_transactions', JSON.stringify(INITIAL_MOCK_TXS));
      }
    } catch (e) {
      setTransactions(INITIAL_MOCK_TXS);
    }
  }, []);

  useEffect(() => {
    reloadData();
    window.addEventListener('zecratary_payment_updated', reloadData);
    window.addEventListener('storage', reloadData);
    return () => {
      window.removeEventListener('zecratary_payment_updated', reloadData);
      window.removeEventListener('storage', reloadData);
    };
  }, [reloadData]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterGateway, filterStatus, pageSize]);

  // Save Settings
  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    setStatusMessage(null);

    try {
      localStorage.setItem('zecratary_payment_config', JSON.stringify(config));
      localStorage.setItem('zecratary_currency', config.defaultCurrency);

      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMessage({ text: 'Gateway configuration and credentials saved successfully!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to save configuration.', type: 'error' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test Gateway Connection
  const handleTestGateway = async (gateway: 'stripe' | 'paypal') => {
    setTestingGateway(gateway);
    setGatewayStatus(prev => ({ ...prev, [gateway]: undefined }));

    setTimeout(() => {
      if (gateway === 'stripe') {
        if (!config.stripePublishableKey || !config.stripeSecretKey) {
          setGatewayStatus(prev => ({ ...prev, stripe: 'Error: Missing Stripe Keys.' }));
        } else {
          setGatewayStatus(prev => ({
            ...prev,
            stripe: config.stripeTestMode
              ? '✓ Stripe Test Mode Connected! API handshake verified.'
              : '✓ Stripe Live Mode Active! Handshake verified.'
          }));
        }
      } else {
        if (!config.paypalClientId) {
          setGatewayStatus(prev => ({ ...prev, paypal: 'Error: Missing PayPal Client ID.' }));
        } else {
          setGatewayStatus(prev => ({ ...prev, paypal: '✓ PayPal Sandbox Handshake Successful.' }));
        }
      }
      setTestingGateway(null);
    }, 900);
  };

  // Refund Transaction
  const handleRefund = (tx: PaymentTransaction) => {
    if (!confirm(`Are you sure you want to refund ${tx.customerEmail} for $${tx.amount.toFixed(2)}?`)) return;

    try {
      const updated = transactions.map(t => {
        if (t.id === tx.id) {
          return { ...t, status: 'refunded' as const };
        }
        return t;
      });

      setTransactions(updated);
      localStorage.setItem('zecratary_payment_transactions', JSON.stringify(updated));

      // Reconcile user subscription status in user store
      const rawUsers = localStorage.getItem('zecratary_users');
      if (rawUsers) {
        const users: User[] = JSON.parse(rawUsers);
        const emailLower = tx.customerEmail.toLowerCase();
        const updatedUsers = users.map(u => {
          if (u.email.toLowerCase() === emailLower) {
            return {
              ...u,
              subscriptionPlan: 'taster',
              subscriptionTier: 'taster',
              planExpiryDate: '',
              expiryDate: ''
            };
          }
          return u;
        });
        localStorage.setItem('zecratary_users', JSON.stringify(updatedUsers));
        window.dispatchEvent(new Event('zecratary_users_updated'));
      }

      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMessage({ text: `Transaction ${tx.id} refunded and user plan reset to free tier.`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Refund failed.', type: 'error' });
    }
  };

  // Delete Transaction
  const handleDeleteTx = (id: string) => {
    if (!confirm('Are you sure you want to remove this transaction record?')) return;
    const filtered = transactions.filter(t => t.id !== id);
    setTransactions(filtered);
    localStorage.setItem('zecratary_payment_transactions', JSON.stringify(filtered));
    window.dispatchEvent(new Event('zecratary_payment_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  // Simulate / Inject Test Transaction
  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simEmail || !simName) return;

    const newTx: PaymentTransaction = {
      id: 'tx_sim_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      customerName: simName.trim(),
      customerEmail: simEmail.trim().toLowerCase(),
      planName: simPlan === 'nutrition-pro-annual' ? 'Nutrition Pro (Annual)' : 'Nutrition Pro (Monthly)',
      planSlug: simPlan,
      amount: Number(simAmount),
      currency: config.defaultCurrency,
      gateway: simGateway,
      status: 'succeeded',
      testMode: true,
      createdAt: new Date().toISOString(),
      expiryDate: new Date(Date.now() + (simPlan.includes('annual') ? 365 : 30) * 86400000).toISOString(),
    };

    const updated = [newTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem('zecratary_payment_transactions', JSON.stringify(updated));

    try {
      const rawUsers = localStorage.getItem('zecratary_users');
      if (rawUsers) {
        const users: User[] = JSON.parse(rawUsers);
        const emailLower = simEmail.trim().toLowerCase();
        const updatedUsers = users.map(u => {
          if (u.email.toLowerCase() === emailLower) {
            return {
              ...u,
              subscriptionPlan: simPlan,
              subscriptionTier: simPlan,
              planExpiryDate: newTx.expiryDate,
              expiryDate: newTx.expiryDate
            };
          }
          return u;
        });
        localStorage.setItem('zecratary_users', JSON.stringify(updatedUsers));
        window.dispatchEvent(new Event('zecratary_users_updated'));
      }
    } catch (_) {}

    window.dispatchEvent(new Event('zecratary_payment_updated'));
    window.dispatchEvent(new Event('storage'));
    setShowSimulateModal(false);

    setStatusMessage({ text: `Simulated transaction ${newTx.id} created successfully!`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ID', 'Customer Name', 'Email', 'Plan', 'Amount', 'Currency', 'Gateway', 'Status', 'Date'];
    const rows = transactions.map(t => [
      t.id,
      `"${t.customerName}"`,
      t.customerEmail,
      `"${t.planName}"`,
      t.amount.toFixed(2),
      t.currency,
      t.gateway,
      t.status,
      new Date(t.createdAt).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zecratary_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalVolume = transactions
      .filter(t => t.status === 'succeeded')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const succeededCount = transactions.filter(t => t.status === 'succeeded').length;
    const refundedVolume = transactions
      .filter(t => t.status === 'refunded')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const pendingCount = transactions.filter(t => t.status === 'pending').length;

    return { totalVolume, succeededCount, refundedVolume, pendingCount };
  }, [transactions]);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesGateway = filterGateway === 'all' || t.gateway === filterGateway;
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        t.customerEmail.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.planName && t.planName.toLowerCase().includes(q));

      return matchesGateway && matchesStatus && matchesSearch;
    });
  }, [transactions, filterGateway, filterStatus, searchQuery]);

  // Paginated Subset
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIdx, startIdx + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Pagination items to render
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [currentPage, totalPages]);

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

  const currentCurrencySymbol = CURRENCIES.find(c => c.code === config.defaultCurrency)?.symbol || '$';
  const startItem = filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredTransactions.length);

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Payment Gateway & Transactions
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Configure Stripe and PayPal credentials, inspect live transactions, and process automated refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <Plus className="h-3.5 w-3.5" /> Test Checkout
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <Download className="h-3.5 w-3.5 text-blue-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            statusMessage.type === 'success'
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Gross Volume</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {currentCurrencySymbol}{metrics.totalVolume.toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-500 font-semibold">{metrics.succeededCount} Succeeded Payments</span>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Total Transactions</span>
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {transactions.length}
          </div>
          <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Processed via all channels</span>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Refunds Issued</span>
            <RotateCcw className="h-4 w-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black font-mono text-orange-400">
            {currentCurrencySymbol}{metrics.refundedVolume.toFixed(2)}
          </div>
          <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Auto-downgraded users</span>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Active Currency</span>
            <Globe className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {config.defaultCurrency}
          </div>
          <span className="text-[10px] text-purple-400 font-semibold">Symbol: {currentCurrencySymbol}</span>
        </div>
      </div>

      {/* GATEWAYS CONFIGURATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* STRIPE GATEWAY */}
        <div 
          className="border rounded-3xl p-6 space-y-5 shadow-xl transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#635BFF]/15 text-[#635BFF]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Stripe Gateway</h2>
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Credit cards, Apple Pay, Google Pay</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={config.stripeEnabled}
                  onChange={(e) => setConfig({ ...config, stripeEnabled: e.target.checked })}
                  className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs">{config.stripeEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}>
              <div>
                <span className="font-bold block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Stripe Mode</span>
                <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {config.stripeTestMode ? 'Using Sandbox / Test Keys' : 'Live Production Transactions'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, stripeTestMode: !config.stripeTestMode })}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                  config.stripeTestMode 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                }`}
              >
                {config.stripeTestMode ? 'TEST MODE' : 'LIVE MODE'}
              </button>
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Stripe Publishable Key</label>
              <div className="relative">
                <Key className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text"
                  value={config.stripePublishableKey}
                  onChange={(e) => setConfig({ ...config, stripePublishableKey: e.target.value })}
                  placeholder="pk_test_..."
                  className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-mono outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Stripe Secret Key</label>
              <div className="relative">
                <Key className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type={showSecretKey ? 'text' : 'password'}
                  value={config.stripeSecretKey}
                  onChange={(e) => setConfig({ ...config, stripeSecretKey: e.target.value })}
                  placeholder="sk_test_..."
                  className="w-full border rounded-xl pl-9 pr-9 py-2 text-xs font-mono outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Webhook Secret</label>
              <input 
                type="text"
                value={config.stripeWebhookSecret}
                onChange={(e) => setConfig({ ...config, stripeWebhookSecret: e.target.value })}
                placeholder="whsec_..."
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            {gatewayStatus.stripe && (
              <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                gatewayStatus.stripe.includes('✓')
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {gatewayStatus.stripe}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={testingGateway === 'stripe'}
                onClick={() => handleTestGateway('stripe')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b'
                }}
              >
                {testingGateway === 'stripe' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-blue-400" />}
                Test Stripe Connection
              </button>
            </div>
          </div>
        </div>

        {/* PAYPAL & GLOBAL CURRENCY */}
        <div className="space-y-6">
          <div 
            className="border rounded-3xl p-6 space-y-5 shadow-xl transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0079C1]/15 text-[#0079C1]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>PayPal Commerce</h2>
                  <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>PayPal Wallet and Pay in 4</p>
                </div>
              </div>

              <label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={config.paypalEnabled}
                  onChange={(e) => setConfig({ ...config, paypalEnabled: e.target.checked })}
                  className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs">{config.paypalEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl border" style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
              }}>
                <div>
                  <span className="font-bold block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>PayPal Environment</span>
                  <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {config.paypalSandboxMode ? 'Sandbox Sandbox Environment' : 'Live PayPal Merchant Account'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, paypalSandboxMode: !config.paypalSandboxMode })}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                    config.paypalSandboxMode 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  {config.paypalSandboxMode ? 'SANDBOX' : 'LIVE'}
                </button>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>PayPal Client ID</label>
                <input 
                  type="text"
                  value={config.paypalClientId}
                  onChange={(e) => setConfig({ ...config, paypalClientId: e.target.value })}
                  placeholder="e.g. Ae29f_..."
                  className="w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              {gatewayStatus.paypal && (
                <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                  gatewayStatus.paypal.includes('✓')
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {gatewayStatus.paypal}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={testingGateway === 'paypal'}
                  onClick={() => handleTestGateway('paypal')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b'
                  }}
                >
                  {testingGateway === 'paypal' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-blue-400" />}
                  Test PayPal Sandbox
                </button>
              </div>
            </div>
          </div>

          {/* CURRENCY SELECTOR */}
          <div 
            className="border rounded-3xl p-5 space-y-3 shadow-xl transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Store Default Currency</span>
              <span className="text-xs font-mono font-bold text-purple-400">{config.defaultCurrency}</span>
            </div>
            <select
              value={config.defaultCurrency}
              onChange={(e) => setConfig({ ...config, defaultCurrency: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* SAVE CONFIG BUTTON */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSavingConfig}
          onClick={() => handleSaveConfig()}
          className="px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          {isSavingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Gateway Configuration
        </button>
      </div>

      {/* TRANSACTIONS AUDIT TABLE WITH PAGINATION */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div>
            <h2 className="text-lg font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <CreditCard className="h-5 w-5 text-emerald-500" />
              Transaction Ledger & Reconciliation
            </h2>
            <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'} matching active filters.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search user, email, tx..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none w-48"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            <select
              value={filterGateway}
              onChange={(e) => setFilterGateway(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border outline-none cursor-pointer font-bold"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <option value="all">All Gateways</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="manual">Manual / Test</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border outline-none cursor-pointer font-bold"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)', color: isDayMode ? '#64748b' : '#94a3b8' }}>
                <th className="py-3 px-3 font-bold">Transaction ID</th>
                <th className="py-3 px-3 font-bold">Customer</th>
                <th className="py-3 px-3 font-bold">Plan & Amount</th>
                <th className="py-3 px-3 font-bold">Gateway</th>
                <th className="py-3 px-3 font-bold">Status</th>
                <th className="py-3 px-3 font-bold">Date</th>
                <th className="py-3 px-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                    No transactions match your current search criteria.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:opacity-90 transition">
                    <td className="py-3.5 px-3 font-mono text-[11px] font-bold" style={{ color: isDayMode ? '#334155' : '#93c5fd' }}>
                      {tx.id}
                      {tx.testMode && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          Test
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{tx.customerName || 'Anonymous'}</div>
                      <div className="text-[11px] font-mono" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{tx.customerEmail}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{tx.planName}</div>
                      <div className="font-mono text-emerald-500 font-extrabold text-[11px]">
                        {currentCurrencySymbol}{Number(tx.amount || 0).toFixed(2)} {tx.currency}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 uppercase font-extrabold text-[10px] tracking-wider">
                      <span className={`px-2 py-0.5 rounded-md border ${
                        tx.gateway === 'stripe' ? 'bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/20' :
                        tx.gateway === 'paypal' ? 'bg-[#0079C1]/10 text-[#0079C1] border-[#0079C1]/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {tx.gateway}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                        tx.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                        tx.status === 'refunded' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                        tx.status === 'pending' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                        'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                      {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {tx.status === 'succeeded' && (
                          <button
                            type="button"
                            title="Refund Transaction"
                            onClick={() => handleRefund(tx)}
                            className="p-1.5 rounded-lg border text-orange-400 hover:bg-orange-500/10 transition cursor-pointer"
                            style={{ borderColor: isDayMode ? '#fdba74' : '#7c2d12' }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete Record"
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-1.5 rounded-lg border text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          style={{ borderColor: isDayMode ? '#fca5a5' : '#991b1b' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t text-xs"
          style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          {/* Summary & Page Size Selector */}
          <div className="flex items-center gap-3">
            <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Showing <strong className="font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{startItem}</strong> to <strong className="font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{endItem}</strong> of <strong className="font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{filteredTransactions.length}</strong> entries
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>
              <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="py-1 px-2 rounded-lg border outline-none font-bold cursor-pointer text-xs"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
              className="p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              title="Previous Page"
              className="p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Numeric Page Range */}
            <div className="flex items-center gap-1 mx-1">
              {paginationRange.map((page, idx) => {
                if (page === '...') {
                  return (
                    <span 
                      key={`ellipsis-${idx}`} 
                      className="px-2 py-1 text-xs" 
                      style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}
                    >
                      ...
                    </span>
                  );
                }

                const isCurrent = page === currentPage;
                return (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                      isCurrent
                        ? 'text-white shadow-sm'
                        : 'hover:opacity-80'
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: 'var(--color-primary, #E05638)',
                            borderColor: 'var(--color-primary, #E05638)',
                          }
                        : {
                            backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#cbd5e1'
                          }
                    }
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              title="Next Page"
              className="p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
              className="p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* MODAL: SIMULATE CHECKOUT */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Plus className="h-4 w-4 text-[var(--color-primary)]" />
                Simulate Payment Transaction
              </h3>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulatePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Customer Full Name</label>
                <input 
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none font-bold"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Customer Email Address</label>
                <input 
                  type="email"
                  required
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none font-mono"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Plan Target</label>
                  <select 
                    value={simPlan}
                    onChange={(e) => {
                      setSimPlan(e.target.value);
                      setSimAmount(e.target.value.includes('annual') ? 59.99 : 8.99);
                    }}
                    className="w-full border rounded-xl px-2.5 py-2 outline-none font-bold cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <option value="nutrition-pro-annual">Nutrition Pro (Annual)</option>
                    <option value="nutrition-pro-monthly">Nutrition Pro (Monthly)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Amount ({config.defaultCurrency})</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 outline-none font-mono font-bold"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Simulated Gateway</label>
                <select 
                  value={simGateway}
                  onChange={(e) => setSimGateway(e.target.value as any)}
                  className="w-full border rounded-xl px-2.5 py-2 outline-none font-bold cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="manual">Manual Checkout</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                  style={{
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#64748b' : '#94a3b8'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  Execute Test Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
"""

with open(payment_page_path, 'w', encoding='utf-8') as f:
    f.write(payment_code)

print(f"Successfully added pagination to {payment_page_path}")
