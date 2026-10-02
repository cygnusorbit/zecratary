'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Settings,
  ShieldCheck,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  Gift,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  ChevronDown,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Landmark
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface SyncedGateway {
  id: string;
  name: string;
  description: string;
  enabledInGateway: boolean;
  isConfigured: boolean;
  isVerified?: boolean;
  keysVerifiedOnly?: boolean;
  testMode?: boolean;
  bankName?: string;
}

interface WalletConfig {
  is_enabled: boolean;
  currency: string;
  min_topup: number;
  max_topup: number;
  preset_amounts: number[];
  bonus_rules: Array<{ threshold: number; bonus_percent: number }>;
  allowed_gateways: string[];
  allow_site_purchases: boolean;
}

interface WalletTx {
  id: string;
  user_email: string;
  type: string;
  amount: number;
  balance_after: number;
  gateway: string;
  gateway_tx_id?: string;
  status: string;
  description: string;
  created_at: string;
}

interface AppUser {
  id: string;
  email: string;
  name?: string;
  wallet_balance?: number;
}

interface VisibleColumns {
  customer: boolean;
  type: boolean;
  amount: boolean;
  balanceAfter: boolean;
  gateway: boolean;
  description: boolean;
  date: boolean;
  actions: boolean;
}

const DEFAULT_COLUMNS: VisibleColumns = {
  customer: true,
  type: true,
  amount: true,
  balanceAfter: true,
  gateway: true,
  description: true,
  date: true,
  actions: true,
};

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
];

export default function AdminWalletSettingsPage() {
  const langContext = useTranslation();
  const translate = langContext?.t;
  const t = useCallback((key: string, fallback?: string) => {
    if (typeof translate === 'function') {
      const val = translate(key, fallback);
      if (val && val !== key) return val;
    }
    return fallback || '';
  }, [translate]);

  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  const handleModeChange = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const root = typeof document !== 'undefined' ? document.documentElement : null;
      const day = mode === 'light' || mode === 'day' || (root && root.classList.contains('light'));
      setIsDayMode(Boolean(day));
    } catch (_) {}
  }, []);

  useEffect(() => {
    handleModeChange();
    window.addEventListener('zecratary_theme_mode_changed', handleModeChange);
    window.addEventListener('zecratary_theme_changed', handleModeChange);
    window.addEventListener('zecratary_theme_updated', handleModeChange);
    window.addEventListener('storage', handleModeChange);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleModeChange);
      window.removeEventListener('zecratary_theme_changed', handleModeChange);
      window.removeEventListener('zecratary_theme_updated', handleModeChange);
      window.removeEventListener('storage', handleModeChange);
    };
  }, [handleModeChange]);

  const [activeTab, setActiveTab] = useState<'settings' | 'ledger'>('settings');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingGateways, setSyncingGateways] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [config, setConfig] = useState<WalletConfig>({
    is_enabled: true,
    currency: 'USD',
    min_topup: 5.00,
    max_topup: 1000.00,
    preset_amounts: [10, 25, 50, 100, 250],
    bonus_rules: [
      { threshold: 50, bonus_percent: 5 },
      { threshold: 100, bonus_percent: 10 }
    ],
    allowed_gateways: ['stripe', 'paypal', 'manual'],
    allow_site_purchases: true,
  });

  const [syncedGateways, setSyncedGateways] = useState<SyncedGateway[]>([
    {
      id: 'stripe',
      name: 'Stripe Gateway',
      description: 'Credit / Debit Cards, Apple Pay, Google Pay',
      enabledInGateway: true,
      isConfigured: true,
      isVerified: false,
      testMode: true
    },
    {
      id: 'paypal',
      name: 'PayPal Gateway',
      description: 'PayPal Digital Wallet, Venmo & Pay Later',
      enabledInGateway: false,
      isConfigured: false,
      testMode: true
    },
    {
      id: 'manual',
      name: 'Manual Settlement / Bank Wire',
      description: 'Direct Bank Wire Transfer with Admin Approval Queue',
      enabledInGateway: true,
      isConfigured: true
    }
  ]);

  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [presetInput, setPresetInput] = useState('10, 25, 50, 100, 250');

  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(DEFAULT_COLUMNS);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjEmail, setAdjEmail] = useState('');
  const [adjAmount, setAdjAmount] = useState<number>(10);
  const [adjReason, setAdjReason] = useState('Promotional deposit credit');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  const activeCurrencySymbol = useMemo(() => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === config.currency);
    return found ? found.symbol : '$';
  }, [config.currency]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet-settings?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.settings) {
          setConfig((prev) => ({
            ...prev,
            ...data.settings,
            min_topup: parseFloat(data.settings.min_topup || 5),
            max_topup: parseFloat(data.settings.max_topup || 1000),
          }));
          if (Array.isArray(data.settings.preset_amounts)) {
            setPresetInput(data.settings.preset_amounts.join(', '));
          }
          if (data.settings.ledger_columns && typeof data.settings.ledger_columns === 'object') {
            setVisibleColumns((prev) => ({ ...prev, ...data.settings.ledger_columns }));
          }
        }
        if (Array.isArray(data.available_gateways) && data.available_gateways.length > 0) {
          setSyncedGateways(data.available_gateways);
        }
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.users)) setUsers(data.users);

        if (isManualRefresh) {
          setFeedback({
            type: 'success',
            msg: t('walletDataRefreshed', 'Wallet configurations and payment gateways synchronized successfully.')
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to load wallet configuration.' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Mount & Real-time Cross-Module Synchronization with /admin/payment-gateway
  useEffect(() => {
    fetchData();

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchData();
      }, 300);
    };

    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    window.addEventListener('zecratary_wallet_settings_updated', handleSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
      window.removeEventListener('zecratary_wallet_settings_updated', handleSync);
    };
  }, [fetchData]);

  // Explicit Gateway Sync Trigger
  const handleSyncGateways = async () => {
    if (syncingGateways) return;
    setSyncingGateways(true);
    try {
      const res = await fetch('/api/admin/wallet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_payment_gateways' }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.available_gateways)) {
        setSyncedGateways(data.available_gateways);
        setFeedback({
          type: 'success',
          msg: data.message || t('gatewaysSyncedSuccess', 'Top-Up Gateways dynamically synced with /admin/payment-gateway!'),
        });
      } else {
        throw new Error(data.error || 'Failed to sync gateways');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || t('gatewaysSyncFailed', 'Error syncing with Payment Gateway engine.'),
      });
    } finally {
      setSyncingGateways(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setFeedback(null);

    const parsedPresets = presetInput
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const payload = {
      action: 'save_settings',
      ...config,
      preset_amounts: parsedPresets,
    };

    try {
      const res = await fetch('/api/admin/wallet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Wallet settings saved successfully to PostgreSQL!' });
        window.dispatchEvent(new Event('zecratary_wallet_settings_updated'));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Network error while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAdjustment = async () => {
    if (!adjEmail) return;
    setIsSubmittingAdj(true);
    try {
      const res = await fetch('/api/admin/wallet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_adjustment',
          user_email: adjEmail,
          amount: adjAmount,
          reason: adjReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: `Successfully adjusted balance for ${adjEmail}.` });
        setShowAdjModal(false);
        fetchData();
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Adjustment failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error executing adjustment.' });
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const toggleGateway = (gwId: string) => {
    setConfig((prev) => {
      const exists = prev.allowed_gateways.includes(gwId);
      return {
        ...prev,
        allowed_gateways: exists
          ? prev.allowed_gateways.filter((g) => g !== gwId)
          : [...prev.allowed_gateways, gwId],
      };
    });
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (tx) =>
        (tx.user_email && tx.user_email.toLowerCase().includes(q)) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.gateway && tx.gateway.toLowerCase().includes(q)) ||
        (tx.id && tx.id.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTransactions.length / limit));
  }, [filteredTransactions.length, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredTransactions.slice(startIndex, startIndex + limit);
  }, [filteredTransactions, page, limit]);

  const currentPageIds = useMemo(() => {
    return paginatedTransactions.map((tx) => tx.id);
  }, [paginatedTransactions]);

  const isAllCurrentPageSelected = useMemo(() => {
    if (currentPageIds.length === 0) return false;
    return currentPageIds.every((id) => selectedTxIds.includes(id));
  }, [currentPageIds, selectedTxIds]);

  const isIndeterminate = useMemo(() => {
    if (currentPageIds.length === 0) return false;
    const selectedCount = currentPageIds.filter((id) => selectedTxIds.includes(id)).length;
    return selectedCount > 0 && selectedCount < currentPageIds.length;
  }, [currentPageIds, selectedTxIds]);

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedTxIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedTxIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activeDataColumnCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length;
  }, [visibleColumns]);

  const activeColumnCount = useMemo(() => {
    let count = 1;
    if (visibleColumns.customer) count++;
    if (visibleColumns.type) count++;
    if (visibleColumns.amount) count++;
    if (visibleColumns.balanceAfter) count++;
    if (visibleColumns.gateway) count++;
    if (visibleColumns.description) count++;
    if (visibleColumns.date) count++;
    if (visibleColumns.actions) count++;
    return count;
  }, [visibleColumns]);

  const toggleColumn = (key: keyof VisibleColumns) => {
    if (visibleColumns[key] && activeDataColumnCount <= 1) return;
    const updated = { ...visibleColumns, [key]: !visibleColumns[key] };
    setVisibleColumns(updated);
    fetch('/api/admin/wallet-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_column_settings', ledger_columns: updated }),
    }).catch(() => {});
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    fetch('/api/admin/wallet-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_column_settings', ledger_columns: DEFAULT_COLUMNS }),
    }).catch(() => {});
  };

  const columnDefinitions: Array<{ key: keyof VisibleColumns; label: string }> = [
    { key: 'customer', label: t('customer', 'Customer') },
    { key: 'type', label: t('type', 'Type') },
    { key: 'amount', label: t('amount', 'Amount') },
    { key: 'balanceAfter', label: t('balanceAfter', 'Balance After') },
    { key: 'gateway', label: t('gateway', 'Gateway') },
    { key: 'description', label: t('description', 'Description') },
    { key: 'date', label: t('date', 'Date') },
    { key: 'actions', label: t('actions', 'Actions') },
  ];

  const handleDeleteSingle = async (txId: string) => {
    if (!window.confirm(t('confirmDeleteTx', 'Are you sure you want to delete this transaction record? This action cannot be undone.'))) {
      return;
    }
    setDeletingIds((prev) => [...prev, txId]);
    try {
      const res = await fetch(`/api/admin/wallet-settings?id=${encodeURIComponent(txId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
        setSelectedTxIds((prev) => prev.filter((id) => id !== txId));
        setFeedback({ type: 'success', msg: t('txDeletedSuccess', 'Transaction record deleted successfully.') });
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || t('txDeleteFailed', 'Failed to delete transaction.') });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('txDeleteFailed', 'Failed to delete transaction.') });
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== txId));
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedTxIds.length === 0) return;
    if (
      !window.confirm(
        t(
          'confirmDeleteBulkTx',
          `Are you sure you want to delete ${selectedTxIds.length} selected transaction(s)? This action cannot be undone.`
        )
      )
    ) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/wallet-settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTxIds }),
      });
      const data = await res.json();
      if (data.success) {
        const removedSet = new Set(selectedTxIds);
        setTransactions((prev) => prev.filter((tx) => !removedSet.has(tx.id)));
        setSelectedTxIds([]);
        setFeedback({
          type: 'success',
          msg: data.message || t('bulkDeleteSuccess', 'Successfully deleted selected transaction records.'),
        });
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || t('bulkDeleteFailed', 'Failed to delete selected transactions.') });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('bulkDeleteFailed', 'Error deleting transactions.') });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const getPageNumbers = (curr: number, total: number) => {
    const pages: number[] = [];
    let start = Math.max(1, curr - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-4 font-sans transition-colors duration-200"
      style={{
        color: 'var(--color-text, #ffffff)',
        transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .wallet-input:-webkit-autofill,
        .wallet-input:-webkit-autofill:hover,
        .wallet-input:-webkit-autofill:focus,
        .wallet-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-inner-dark, #0f172a) inset !important;
          box-shadow: 0 0 0 1000px var(--color-inner-dark, #0f172a) inset !important;
          -webkit-text-fill-color: var(--color-text, #ffffff) !important;
          caret-color: var(--color-text, #ffffff) !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
        .wallet-input:focus {
          border-color: var(--color-primary, #3b82f6) !important;
        }
      `}} />

      {/* Header */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-md transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card, #1e293b)',
          borderColor: 'var(--color-border, #334155)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-center transition-colors duration-200"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)',
              color: 'var(--color-primary, #3b82f6)',
            }}
          >
            <Wallet className="w-8 h-8" style={{ color: 'var(--color-primary, #3b82f6)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text, #ffffff)' }}>
                {t('walletSettingsTitle', 'Wallet Settings & Balance Engine')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                {t('gatewaySynced', 'Gateway Synced')}
              </span>
            </div>
            <p className="text-sm opacity-70 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              {t('walletSettingsSubtitle', 'Configure top-up limits, payment gateways, promotional bonuses, and customer store credit.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAdjEmail(users[0]?.email || '');
              setShowAdjModal(true);
            }}
            className="px-4 py-2.5 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
          >
            <Plus className="w-4 h-4" />
            {t('adjustBalance', 'Credit / Adjust Balance')}
          </button>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-2.5 rounded-xl border transition-all cursor-pointer hover:opacity-80"
            style={{
              borderColor: 'var(--color-border, #334155)',
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              color: 'var(--color-text, #ffffff)',
            }}
            title={t('refreshData', 'Refresh Data')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex border-b gap-3 text-sm font-medium transition-colors duration-200"
        style={{ borderColor: 'var(--color-border, #334155)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="pb-3 px-3 flex items-center gap-2 transition-all relative cursor-pointer"
          style={{
            color: activeTab === 'settings' ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #94a3b8)',
            opacity: activeTab === 'settings' ? 1 : 0.7,
            borderBottom: activeTab === 'settings' ? '2px solid var(--color-primary, #3b82f6)' : '2px solid transparent',
            fontWeight: activeTab === 'settings' ? 600 : 500,
          }}
        >
          <Settings className="w-4 h-4" style={{ color: activeTab === 'settings' ? 'var(--color-primary, #3b82f6)' : undefined }} />
          {t('walletConfig', 'Configuration & Rules')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className="pb-3 px-3 flex items-center gap-2 transition-all relative cursor-pointer"
          style={{
            color: activeTab === 'ledger' ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #94a3b8)',
            opacity: activeTab === 'ledger' ? 1 : 0.7,
            borderBottom: activeTab === 'ledger' ? '2px solid var(--color-primary, #3b82f6)' : '2px solid transparent',
            fontWeight: activeTab === 'ledger' ? 600 : 500,
          }}
        >
          <Sliders className="w-4 h-4" style={{ color: activeTab === 'ledger' ? 'var(--color-primary, #3b82f6)' : undefined }} />
          {t('walletLedger', 'Wallet Transactions Ledger')}
          <span
            className="ml-1.5 px-2 py-0.5 rounded-full text-xs border"
            style={{
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)',
            }}
          >
            {transactions.length}
          </span>
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
          {/* Section 1: Core System Parameters */}
          <div
            className="p-6 rounded-2xl border space-y-6 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <h2 className="text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--color-text, #ffffff)' }}>
              <ShieldCheck className="w-5 h-5" style={{ color: 'var(--color-primary, #3b82f6)' }} />
              {t('coreParameters', 'General Wallet Controls')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enable Wallet Toggle */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between transition-colors duration-200"
                style={{
                  borderColor: 'var(--color-border, #334155)',
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                }}
              >
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text, #ffffff)' }}>
                    {t('enableWallet', 'Enable Wallet System')}
                  </div>
                  <div className="text-xs opacity-60 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('enableWalletDesc', 'Allow customers to top up and hold on-site balance.')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors"
                    style={{
                      backgroundColor: config.is_enabled
                        ? 'color-mix(in srgb, var(--color-emerald, #10b981) 12%, transparent)'
                        : 'color-mix(in srgb, var(--color-text-secondary, #64748b) 12%, transparent)',
                      borderColor: config.is_enabled
                        ? 'color-mix(in srgb, var(--color-emerald, #10b981) 25%, transparent)'
                        : 'var(--color-border, #334155)',
                      color: config.is_enabled ? 'var(--color-emerald, #10b981)' : 'var(--color-text-secondary, #64748b)'
                    }}
                  >
                    {config.is_enabled ? t('systemActive', 'Enabled') : t('systemDisabled', 'Disabled')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.is_enabled}
                    onClick={() => setConfig(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: config.is_enabled
                        ? 'var(--color-emerald, #10b981)'
                        : isDayMode ? '#cbd5e1' : '#334155'
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        config.is_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Allow Site Purchases Toggle */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between transition-colors duration-200"
                style={{
                  borderColor: 'var(--color-border, #334155)',
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                }}
              >
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text, #ffffff)' }}>
                    {t('allowSitePurchases', 'Allow Balance for Purchases')}
                  </div>
                  <div className="text-xs opacity-60 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('allowSitePurchasesDesc', 'Permit wallet balance to pay for platform items & recipes.')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors"
                    style={{
                      backgroundColor: config.allow_site_purchases
                        ? 'color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent)'
                        : 'color-mix(in srgb, var(--color-text-secondary, #64748b) 12%, transparent)',
                      borderColor: config.allow_site_purchases
                        ? 'color-mix(in srgb, var(--color-primary, #3b82f6) 25%, transparent)'
                        : 'var(--color-border, #334155)',
                      color: config.allow_site_purchases ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #64748b)'
                    }}
                  >
                    {config.allow_site_purchases ? t('allowed', 'Allowed') : t('disallowed', 'Disallowed')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.allow_site_purchases}
                    onClick={() => setConfig(prev => ({ ...prev, allow_site_purchases: !prev.allow_site_purchases }))}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: config.allow_site_purchases
                        ? 'var(--color-primary, #3b82f6)'
                        : isDayMode ? '#cbd5e1' : '#334155'
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        config.allow_site_purchases ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('currency', 'Wallet Currency')}
                </label>
                <select
                  value={config.currency}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none cursor-pointer transition-colors duration-200"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>
                      {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets Input */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('presetTopups', 'Quick Top-Up Presets (Comma Separated)')}
                </label>
                <input
                  type="text"
                  value={presetInput}
                  onChange={(e) => setPresetInput(e.target.value)}
                  placeholder="10, 25, 50, 100, 250"
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors duration-200"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                />
              </div>

              {/* Minimum Top-Up */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('minTopUp', 'Minimum Top-Up Amount')} ({activeCurrencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={config.min_topup}
                  onChange={(e) => setConfig({ ...config, min_topup: parseFloat(e.target.value) || 0 })}
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors duration-200"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                />
              </div>

              {/* Maximum Top-Up */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('maxTopUp', 'Maximum Single Top-Up Cap')} ({activeCurrencySymbol})
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={config.max_topup}
                  onChange={(e) => setConfig({ ...config, max_topup: parseFloat(e.target.value) || 0 })}
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors duration-200"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: DYNAMICALLY SYNCED TOP-UP GATEWAYS */}
          <div
            className="p-6 rounded-2xl border space-y-5 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--color-text, #ffffff)' }}>
                  <CreditCard className="w-5 h-5" style={{ color: 'var(--color-primary, #3b82f6)' }} />
                  {t('allowedGateways', 'Accepted Top-Up Gateways')}
                </h2>
                <p className="text-xs opacity-70 mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('dynamicGatewaySyncNotice', 'Dynamically synchronized with /admin/payment-gateway. Enable or restrict gateway channels for store credit deposits.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncGateways}
                  disabled={syncingGateways}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer hover:border-blue-400 shadow-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-primary, #3b82f6)'
                  }}
                  title={t('syncGatewaysTooltip', 'Pull latest gateway status from /admin/payment-gateway')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGateways ? 'animate-spin' : ''}`} />
                  <span>{syncingGateways ? t('syncing', 'Syncing...') : t('syncPaymentGatewayBtn', 'Sync with Payment Gateway')}</span>
                </button>

                <Link
                  href="/admin/payment-gateway"
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-85 shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('manageGateways', 'Manage Gateways')}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Link>
              </div>
            </div>

            {/* Dynamic Synced Gateway Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {syncedGateways.map((gw) => {
                const isAllowedForWallet = config.allowed_gateways.includes(gw.id);
                const isEnabledInGateway = Boolean(gw.enabledInGateway);

                return (
                  <div
                    key={gw.id}
                    onClick={() => toggleGateway(gw.id)}
                    className="p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all select-none gap-3 shadow-xs"
                    style={{
                      borderColor: isAllowedForWallet
                        ? 'var(--color-primary, #3b82f6)'
                        : 'var(--color-border, #334155)',
                      backgroundColor: isAllowedForWallet
                        ? 'color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)'
                        : 'var(--color-inner-dark, #0f172a)',
                      opacity: isAllowedForWallet ? 1 : 0.75,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs"
                            style={{
                              backgroundColor: gw.id === 'stripe' ? '#635bff' : gw.id === 'paypal' ? '#ffc439' : 'var(--color-primary, #3b82f6)',
                              color: gw.id === 'paypal' ? '#0f172a' : '#ffffff'
                            }}
                          >
                            {gw.id === 'stripe' ? 'S' : gw.id === 'paypal' ? 'P' : <Landmark className="w-4 h-4" />}
                          </div>
                          <span className="text-sm font-bold" style={{ color: 'var(--color-text, #ffffff)' }}>{gw.name}</span>
                        </div>

                        <div
                          className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors"
                          style={{
                            backgroundColor: isAllowedForWallet ? 'var(--color-primary, #3b82f6)' : 'transparent',
                            borderColor: isAllowedForWallet ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                          }}
                        >
                          {isAllowedForWallet && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      <p className="text-xs opacity-70 mt-2" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                        {gw.description}
                      </p>
                    </div>

                    {/* Dynamic Gateway State Flags */}
                    <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--color-border, #334155)' }}>
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="opacity-60">{t('gatewayEngineStatus', 'Payment Gateway:')}</span>
                        {isEnabledInGateway ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {t('activeEnabled', 'Active / Enabled')}
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {t('disabledInEngine', 'Disabled')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="opacity-60">{t('walletChannelStatus', 'Wallet Top-Up:')}</span>
                        <span style={{ color: isAllowedForWallet ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #94a3b8)' }}>
                          {isAllowedForWallet ? t('acceptedForTopup', 'Accepted') : t('restricted', 'Restricted')}
                        </span>
                      </div>

                      {/* Mismatch Warning Alert if allowed in wallet but disabled globally */}
                      {isAllowedForWallet && !isEnabledInGateway && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="p-2 rounded-xl border mt-2 flex items-start gap-1.5 text-[10px] leading-tight"
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderColor: 'rgba(245, 158, 11, 0.3)',
                            color: '#fbbf24'
                          }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <div>
                            <span>{t('disabledGloballyNotice', 'Disabled globally in Payment Gateway. Users will not see this channel at checkout until activated.')} </span>
                            <Link href="/admin/payment-gateway" className="underline font-bold hover:text-white">
                              {t('activateInGateway', 'Activate in Gateway →')}
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bonus Rules Area */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold uppercase opacity-70" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('promotionalBonuses', 'Top-Up Bonus Incentives (Tiered Credit Rewards)')}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      bonus_rules: [...config.bonus_rules, { threshold: 150, bonus_percent: 15 }],
                    })
                  }
                  className="text-xs hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  style={{ color: 'var(--color-primary, #3b82f6)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addBonusTier', 'Add Bonus Tier')}
                </button>
              </div>

              <div className="space-y-3">
                {config.bonus_rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border flex flex-wrap items-center gap-4 text-sm transition-colors duration-200"
                    style={{
                      borderColor: 'var(--color-border, #334155)',
                      backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
                      <span className="opacity-70 text-xs" style={{ color: 'var(--color-text, #ffffff)' }}>Deposit ≥</span>
                      <input
                        type="number"
                        min="1"
                        value={rule.threshold}
                        onChange={(e) => {
                          const updated = [...config.bonus_rules];
                          updated[idx].threshold = parseFloat(e.target.value) || 0;
                          setConfig({ ...config, bonus_rules: updated });
                        }}
                        className="wallet-input w-24 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none transition-colors"
                        style={{
                          borderColor: 'var(--color-border, #334155)',
                          backgroundColor: 'var(--color-card, #1e293b)',
                          color: 'var(--color-text, #ffffff)',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-70 text-xs" style={{ color: 'var(--color-text, #ffffff)' }}>Give Bonus %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.bonus_percent}
                        onChange={(e) => {
                          const updated = [...config.bonus_rules];
                          updated[idx].bonus_percent = parseFloat(e.target.value) || 0;
                          setConfig({ ...config, bonus_rules: updated });
                        }}
                        className="wallet-input w-20 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none transition-colors"
                        style={{
                          borderColor: 'var(--color-border, #334155)',
                          backgroundColor: 'var(--color-card, #1e293b)',
                          color: 'var(--color-text, #ffffff)',
                        }}
                      />
                      <span className="text-xs opacity-60" style={{ color: 'var(--color-text, #ffffff)' }}>%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.bonus_rules.filter((_, i) => i !== idx);
                        setConfig({ ...config, bonus_rules: updated });
                      }}
                      className="ml-auto text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      {t('remove', 'Remove')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form-free Submit */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-3 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('saveWalletSettings', 'Save Wallet Configurations')}
            </button>
          </div>
        </div>
      ) : (
        /* Section: Wallet Transactions Ledger */
        <div
          className="p-6 rounded-2xl border space-y-4 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #1e293b)',
            borderColor: 'var(--color-border, #334155)',
          }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--color-text, #ffffff)' }} />
                <input
                  type="text"
                  placeholder={t('searchTransactions', 'Search by email, description or ID...')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="wallet-input w-full pl-10 pr-4 py-2 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                />
              </div>

              {/* Hide Columns Dropdown Popover */}
              <div className="relative" ref={columnDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnMenu((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                  title={t('customizeColumns', 'Toggle visible columns')}
                >
                  <Columns3 className="w-4 h-4" style={{ color: 'var(--color-primary, #3b82f6)' }} />
                  <span>{t('columns', 'Columns')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} />
                </button>

                {showColumnMenu && (
                  <div
                    className="absolute right-0 sm:left-0 mt-2 w-56 rounded-2xl border shadow-2xl p-3 z-30 space-y-2 animate-fade-in"
                    style={{
                      backgroundColor: 'var(--color-card, #1e293b)',
                      borderColor: 'var(--color-border, #334155)',
                      color: 'var(--color-text, #ffffff)',
                    }}
                  >
                    <div className="flex items-center justify-between pb-2 border-b text-xs font-bold" style={{ borderColor: 'var(--color-border, #334155)' }}>
                      <span>{t('toggleColumns', 'Toggle Columns')}</span>
                      <button
                        type="button"
                        onClick={resetColumns}
                        className="text-[11px] hover:underline cursor-pointer"
                        style={{ color: 'var(--color-primary, #3b82f6)' }}
                      >
                        {t('reset', 'Reset')}
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {columnDefinitions.map((col) => {
                        const isChecked = visibleColumns[col.key];
                        const isLast = isChecked && activeDataColumnCount <= 1;
                        return (
                          <label
                            key={col.key}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                              isLast ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                            }`}
                            style={{
                              backgroundColor: isChecked ? 'color-mix(in srgb, var(--color-inner-dark, #0f172a) 50%, transparent)' : 'transparent',
                            }}
                          >
                            <span style={{ color: 'var(--color-text, #ffffff)' }}>{col.label}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isLast}
                              onChange={() => toggleColumn(col.key)}
                              className="rounded cursor-pointer w-4 h-4"
                              style={{ accentColor: 'var(--color-primary, #3b82f6)' }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs opacity-60 self-center" style={{ color: 'var(--color-text, #ffffff)' }}>
              {t('showingTotal', 'Showing')} {filteredTransactions.length} {t('records', 'transactions')}
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedTxIds.length > 0 && (
            <div
              className="p-3 px-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-inner animate-fade-in"
              style={{
                borderColor: 'var(--color-border, #334155)',
                backgroundColor: 'var(--color-inner-dark, #0f172a)',
                color: 'var(--color-text, #ffffff)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }} />
                <span>
                  {selectedTxIds.length} {t('selectedRecords', 'transaction(s) selected')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxIds([])}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-card, #1e293b)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                >
                  {t('clearSelection', 'Clear Selection')}
                </button>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={handleDeleteBulk}
                  className="px-3.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isBulkDeleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{t('deleteSelected', 'Delete Selected')} ({selectedTxIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div
            className="overflow-x-auto rounded-xl border transition-colors duration-200"
            style={{ borderColor: 'var(--color-border, #334155)' }}
          >
            <table className="w-full text-left text-sm" style={{ color: 'var(--color-text, #ffffff)' }}>
              <thead
                className="border-b text-xs uppercase opacity-75 transition-colors"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                }}
              >
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded cursor-pointer w-4 h-4"
                      style={{ accentColor: 'var(--color-primary, #3b82f6)' }}
                      title={t('selectAllCurrentPage', 'Select all on this page')}
                    />
                  </th>
                  {visibleColumns.customer && <th className="py-3 px-4">{t('customer', 'Customer')}</th>}
                  {visibleColumns.type && <th className="py-3 px-4">{t('type', 'Type')}</th>}
                  {visibleColumns.amount && <th className="py-3 px-4">{t('amount', 'Amount')}</th>}
                  {visibleColumns.balanceAfter && <th className="py-3 px-4">{t('balanceAfter', 'Balance After')}</th>}
                  {visibleColumns.gateway && <th className="py-3 px-4">{t('gateway', 'Gateway')}</th>}
                  {visibleColumns.description && <th className="py-3 px-4">{t('description', 'Description')}</th>}
                  {visibleColumns.date && <th className="py-3 px-4">{t('date', 'Date')}</th>}
                  {visibleColumns.actions && <th className="py-3 px-4 text-center">{t('actions', 'Actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #334155)' }}>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={activeColumnCount} className="py-8 text-center text-sm opacity-50">
                      {t('noWalletTransactions', 'No wallet transactions recorded yet.')}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const isSelected = selectedTxIds.includes(tx.id);
                    const isDeleting = deletingIds.includes(tx.id);
                    const numAmount = parseFloat(tx.amount as any || 0);
                    const isNegative = numAmount < 0;

                    return (
                      <tr
                        key={tx.id}
                        className="transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)'
                            : 'transparent',
                        }}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(tx.id)}
                            className="rounded cursor-pointer w-4 h-4"
                            style={{ accentColor: 'var(--color-primary, #3b82f6)' }}
                          />
                        </td>
                        {visibleColumns.customer && (
                          <td className="py-3 px-4 font-medium" style={{ color: 'var(--color-text, #ffffff)' }}>{tx.user_email}</td>
                        )}
                        {visibleColumns.type && (
                          <td className="py-3 px-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--color-primary, #3b82f6) 25%, transparent)',
                                color: 'var(--color-primary, #3b82f6)',
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>
                        )}
                        {visibleColumns.amount && (
                          <td className="py-3 px-4 font-semibold font-mono">
                            <span style={{ color: isNegative ? '#f43f5e' : 'var(--color-emerald, #10b981)' }}>
                              {isNegative ? '-' : '+'}{activeCurrencySymbol}{Math.abs(numAmount).toFixed(2)}
                            </span>
                          </td>
                        )}
                        {visibleColumns.balanceAfter && (
                          <td className="py-3 px-4 opacity-80 font-mono" style={{ color: 'var(--color-text, #ffffff)' }}>
                            {activeCurrencySymbol}{parseFloat(tx.balance_after as any || 0).toFixed(2)}
                          </td>
                        )}
                        {visibleColumns.gateway && (
                          <td className="py-3 px-4">
                            <span
                              className="uppercase text-xs opacity-75 font-mono px-2 py-0.5 rounded border"
                              style={{
                                borderColor: 'var(--color-border, #334155)',
                                backgroundColor: 'var(--color-inner-dark, #0f172a)',
                                color: 'var(--color-text, #ffffff)',
                              }}
                            >
                              {tx.gateway || 'Manual'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.description && (
                          <td className="py-3 px-4 text-xs opacity-80 max-w-xs truncate" title={tx.description} style={{ color: 'var(--color-text, #ffffff)' }}>
                            {tx.description}
                          </td>
                        )}
                        {visibleColumns.date && (
                          <td className="py-3 px-4 text-xs opacity-60 whitespace-nowrap font-mono" style={{ color: 'var(--color-text, #ffffff)' }}>
                            {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteSingle(tx.id)}
                              className="p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                              title={t('deleteTransaction', 'Delete Transaction')}
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs transition-colors duration-200"
            style={{ borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
          >
            <div className="opacity-70">
              {t('showingPageInfo', 'Showing')}{' '}
              <strong>{filteredTransactions.length > 0 ? (page - 1) * limit + 1 : 0}</strong> -{' '}
              <strong>{Math.min(page * limit, filteredTransactions.length)}</strong>{' '}
              {t('ofTotal', 'of')} <strong>{filteredTransactions.length}</strong>{' '}
              {t('transactionsLabel', 'transactions')}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">{t('perPage', 'Per page:')}</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="wallet-input px-2 py-1 rounded-lg border text-xs font-bold outline-none cursor-pointer transition-colors"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                >
                  <option value={10} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>10</option>
                  <option value={25} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>25</option>
                  <option value={50} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>50</option>
                  <option value={100} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                  title={t('firstPage', 'First Page')}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                  title={t('prevPage', 'Previous Page')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers(page, totalPages).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: page === num ? 'var(--color-primary, #3b82f6)' : 'var(--color-inner-dark, #0f172a)',
                      borderColor: page === num ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                      color: page === num ? '#ffffff' : 'var(--color-text, #ffffff)',
                    }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                  title={t('nextPage', 'Next Page')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                  title={t('lastPage', 'Last Page')}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="max-w-md w-full p-6 rounded-2xl border shadow-2xl space-y-4 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)',
            }}
          >
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text, #ffffff)' }}>
              <DollarSign className="w-5 h-5" style={{ color: 'var(--color-primary, #3b82f6)' }} />
              {t('adjustWalletModal', 'Manual Balance Adjustment')}
            </h3>
            <p className="text-xs opacity-70" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              {t('adjustWalletDesc', 'Directly credit or debit a user wallet balance with full audit ledger tracking in PostgreSQL.')}
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-1" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('selectCustomer', 'Target User')}
                </label>
                <select
                  value={adjEmail}
                  onChange={(e) => setAdjEmail(e.target.value)}
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none cursor-pointer transition-colors"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.email} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>
                      {u.name ? `${u.name} (${u.email})` : u.email} — Balance: {activeCurrencySymbol}{parseFloat(u.wallet_balance as any || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-1" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('adjustmentAmount', 'Amount (+ to credit, - to debit)')} ({activeCurrencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-1" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('reason', 'Audit Memo / Reason')}
                </label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Promotional courtesy credit"
                  className="wallet-input w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    color: 'var(--color-text, #ffffff)',
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 rounded-xl border text-sm cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border, #334155)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text, #ffffff)',
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAdj}
                  onClick={handleExecuteAdjustment}
                  className="px-4 py-2 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
                >
                  {isSubmittingAdj ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {t('applyAdjustment', 'Apply Adjustment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
