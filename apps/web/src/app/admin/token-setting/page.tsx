'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  Coins, Sparkles, Plus, Trash2, Save, ArrowLeft,
  CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, 
  ChefHat, DownloadCloud, FileText, Camera, Tag, DollarSign,
  Search, Filter, ArrowUpRight, ArrowDownLeft, Calendar, User as UserIcon,
  Clock, Activity, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Columns3, Check, SlidersHorizontal, Eye, EyeOff, Wallet, CheckSquare, Square
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
}

interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  monthly_tokens?: number;
}

interface TokenTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  balance_after: number;
  user_total_tokens?: number;
  type: string;
  description: string;
  created_at: string;
}

interface TransactionStats {
  totalDeducted: number;
  totalGranted: number;
  activeUsers: number;
  totalTransactions: number;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export default function AdminTokenSettingPage() {
  const { t } = useTranslation();
  
  // Tab Navigation: 'settings' | 'transactions'
  const [activeTab, setActiveTab] = useState<'settings' | 'transactions'>('settings');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Token General Settings
  const [tokenName, setTokenName] = useState('Foodie Token');
  const [tokenSymbol, setTokenSymbol] = useState('🪙');
  const [isEnabled, setIsEnabled] = useState(true);

  // Per Feature Costs
  const [chefCost, setChefCost] = useState(1);
  const [importUrlCost, setImportUrlCost] = useState(2);
  const [importTextCost, setImportTextCost] = useState(1);
  const [importPhotoCost, setImportPhotoCost] = useState(3);

  // Packages
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  
  // Subscription Plan Monthly Tokens
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planAllocations, setPlanAllocations] = useState<{ [slug: string]: number }>({});

  // Transactions State
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(25);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotalCount, setTxTotalCount] = useState(0);
  const [txStats, setTxStats] = useState<TransactionStats>({
    totalDeducted: 0,
    totalGranted: 0,
    activeUsers: 0,
    totalTransactions: 0
  });

  // Selection & Deletion State
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Table Column Visibility Controller
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'user', label: 'User', visible: true },
    { key: 'user_total_tokens', label: 'User Total Tokens', visible: true },
    { key: 'service', label: 'Service / Operation', visible: true },
    { key: 'amount', label: 'Amount', visible: true },
    { key: 'balance_after', label: 'Balance After', visible: true },
    { key: 'description', label: 'Description', visible: true },
    { key: 'created_at', label: 'Timestamp', visible: true },
  ]);

  // Load Saved Column Visibility Preferences
  useEffect(() => {
    try {
      const stored = localStorage.getItem('zecratary_token_tx_columns');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(prev => prev.map(col => {
            const found = parsed.find((p: any) => p.key === col.key);
            return found ? { ...col, visible: Boolean(found.visible) } : col;
          }));
        }
      }
    } catch (_) {}
  }, []);

  // Handle Click Outside Column Picker Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    if (showColumnPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnPicker]);

  const toggleColumnVisibility = (key: string) => {
    setColumns(prev => {
      const target = prev.find(c => c.key === key);
      const activeCount = prev.filter(c => c.visible).length;
      if (target?.visible && activeCount <= 1) {
        return prev;
      }
      const updated = prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c);
      try {
        localStorage.setItem('zecratary_token_tx_columns', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const isColVisible = (key: string) => {
    const col = columns.find(c => c.key === key);
    return col ? col.visible : true;
  };

  const activeColumnCount = columns.filter(c => c.visible).length;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/token-settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setTokenName(data.settings.tokenName || 'Foodie Token');
        setTokenSymbol(data.settings.tokenSymbol || '🪙');
        setIsEnabled(data.settings.isEnabled ?? true);
        setChefCost(data.settings.chefCost ?? 1);
        setImportUrlCost(data.settings.importUrlCost ?? 2);
        setImportTextCost(data.settings.importTextCost ?? 1);
        setImportPhotoCost(data.settings.importPhotoCost ?? 3);
        setPackages(data.settings.packages || []);
      }
      if (data.plans) {
        setPlans(data.plans);
        const map: { [slug: string]: number } = {};
        data.plans.forEach((p: SubscriptionPlan) => {
          map[p.slug] = p.monthly_tokens ?? (p.slug.includes('pro') ? 500 : 50);
        });
        setPlanAllocations(map);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch token settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = useCallback(async (pageToLoad = 1, limitToUse = txLimit) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(limitToUse),
        search: txSearch,
        type: txTypeFilter
      });
      const res = await fetch(`/api/admin/token-transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setTxTotalCount(data.totalCount || 0);
        setTxTotalPages(data.totalPages || 1);
        setTxPage(data.page || 1);
        if (data.stats) {
          setTxStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('Failed loading token transactions:', err);
    } finally {
      setTxLoading(false);
    }
  }, [txSearch, txTypeFilter, txLimit]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions(txPage, txLimit);
    }
  }, [activeTab, fetchTransactions, txPage, txLimit]);

  // Select / Select All Calculation for the Current Page
  const allOnPageSelected = useMemo(() => {
    return transactions.length > 0 && transactions.every(tx => selectedTxIds.includes(tx.id));
  }, [transactions, selectedTxIds]);

  const someOnPageSelected = useMemo(() => {
    return transactions.some(tx => selectedTxIds.includes(tx.id)) && !allOnPageSelected;
  }, [transactions, selectedTxIds, allOnPageSelected]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someOnPageSelected;
    }
  }, [someOnPageSelected]);

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(transactions.map(tx => tx.id));
      setSelectedTxIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = transactions.map(tx => tx.id);
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedTxIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Delete Individual Transaction
  const handleDeleteTransaction = async (id: string, description?: string) => {
    const confirmMsg = t('confirmDeleteTokenTx', 'Are you sure you want to permanently delete this token transaction record?');
    if (!window.confirm(confirmMsg)) return;

    setDeletingTxId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/token-transactions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      setSelectedTxIds(prev => prev.filter(item => item !== id));
      setSuccessMsg(t('tokenTxDeletedSuccess', 'Transaction record deleted successfully from PostgreSQL.'));
      await fetchTransactions(txPage, txLimit);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('zecratary_token_settings_updated'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete transaction');
    } finally {
      setDeletingTxId(null);
    }
  };

  // Bulk Delete Selected Transactions
  const handleBulkDeleteTransactions = async () => {
    if (selectedTxIds.length === 0) return;
    const confirmTmpl = t('confirmBulkDeleteTokenTxs', 'Are you sure you want to permanently delete {count} selected transaction(s)? This action cannot be undone.');
    if (!window.confirm(confirmTmpl.replace('{count}', String(selectedTxIds.length)))) return;

    setBulkDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/token-transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTxIds })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete selected transactions');
      }

      const count = selectedTxIds.length;
      setSelectedTxIds([]);
      setSuccessMsg(t('bulkTokenTxDeletedSuccess', `Successfully deleted ${count} transaction record(s) from PostgreSQL.`));
      await fetchTransactions(txPage, txLimit);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('zecratary_token_settings_updated'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete selected transactions');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/token-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenName,
          tokenSymbol,
          chefCost: Number(chefCost),
          importUrlCost: Number(importUrlCost),
          importTextCost: Number(importTextCost),
          importPhotoCost: Number(importPhotoCost),
          isEnabled,
          packages,
          planAllocations
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed saving token configurations');
      }

      setSuccessMsg(t('tokenSettingsSavedSuccess', 'Token configuration saved and synchronized with PostgreSQL!'));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_token_settings_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPackage = () => {
    const newPkg: TokenPackage = {
      id: 'pkg_' + Date.now().toString(36),
      name: 'Custom Package',
      tokens: 250,
      price: 9.99,
      badge: 'Special',
      isPopular: false
    };
    setPackages([...packages, newPkg]);
  };

  const handleRemovePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const handlePackageChange = (id: string, field: keyof TokenPackage, value: any) => {
    setPackages(packages.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const renderServiceBadge = (type: string) => {
    if (type === 'usage_chef') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
          <ChefHat className="h-3 w-3" /> /chef AI Chat
        </span>
      );
    }
    if (type.startsWith('usage_import')) {
      const sub = type.replace('usage_import_', '');
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <DownloadCloud className="h-3 w-3" /> /import ({sub.toUpperCase()})
        </span>
      );
    }
    if (type === 'package_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <DollarSign className="h-3 w-3" /> Package Purchase
        </span>
      );
    }
    if (type === 'plan_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> Plan Purchase
        </span>
      );
    }
    if (type === 'plan_monthly_grant') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> Monthly Grant
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Activity className="h-3 w-3" /> {type.replace('_', ' ')}
      </span>
    );
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, txPage - Math.floor(maxVisible / 2));
    let end = Math.min(txTotalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen p-8 flex items-center justify-center font-sans transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <span className="text-xs font-bold">{t('loadingTokenSettings', 'Loading Token Settings...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6 pt-4 font-sans transition-colors duration-200 min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <Coins className="h-6 w-6 text-amber-500" /> {t('adminTokenSettingTitle', 'Token System Management')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('adminTokenSettingSubtitle', 'Configure token parameters, manage consumption for /chef and /import, and audit live user transactions.')}
          </p>
        </div>

        {activeTab === 'settings' ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> {t('saving', 'Saving to PostgreSQL...')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {t('saveTokenSettingsBtn', 'Save Configurations')}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fetchTransactions(txPage, txLimit)}
            disabled={txLoading}
            className="px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <RefreshCw className={`h-4 w-4 ${txLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('refreshTransactions', 'Refresh Ledger')}</span>
          </button>
        )}
      </div>

      {/* Tab Navigation Controls */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-inner-dark)',
          borderColor: 'var(--color-border)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'settings' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-emerald)',
            borderColor: 'var(--color-emerald)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary)'
          }}
        >
          <Coins className="h-4 w-4" />
          <span>{t('tokenSettingsTab', 'Token Configurations')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('transactions');
            fetchTransactions(1, txLimit);
          }}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'transactions' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-emerald)',
            borderColor: 'var(--color-emerald)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary)'
          }}
        >
          <Activity className="h-4 w-4" />
          <span>{t('tokenTransactionsTab', 'Token Transactions')}</span>
          {txTotalCount > 0 && (
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/10" style={{ borderColor: 'var(--color-border)' }}>
              {txTotalCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)' }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TOKEN SETTINGS CONFIGURATION                                       */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Section 1: Token Identity & System Status */}
          <div 
            className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('tokenIdentityHeading', 'Token Currency Identity & Master Toggle')}
                </h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                />
                <span style={{ color: isEnabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
                  {isEnabled ? t('tokenSystemActive', 'System Active') : t('tokenSystemDisabled', 'Bypass Consumption')}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tokenNameLabel', 'Token Name')}
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Foodie Token, Zecra Coin"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tokenSymbolLabel', 'Token Symbol / Emoji')}
                </label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="e.g. 🪙, CRD, TK"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Usage / Feature Costs */}
          <div 
            className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <Sparkles className="h-4 w-4 text-orange-400" />
              <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                {t('featureUsagePricingHeading', 'Feature Usage Consumption Costs (/chef & /import)')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Chef Chat Cost */}
              <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/chef (AI Chat)</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('chefCostDesc', 'Tokens deducted per generated response.')}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    value={chefCost}
                    onChange={(e) => setChefCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
                </div>
              </div>

              {/* Import URL Cost */}
              <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <DownloadCloud className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/import (URL)</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('importUrlCostDesc', 'Tokens deducted per recipe scraped from link.')}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    value={importUrlCost}
                    onChange={(e) => setImportUrlCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
                </div>
              </div>

              {/* Import Text Cost */}
              <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/import (Raw Text)</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('importTextCostDesc', 'Tokens deducted per recipe parsed from text.')}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    value={importTextCost}
                    onChange={(e) => setImportTextCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
                </div>
              </div>

              {/* Import Photo Cost */}
              <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/import (Photo OCR)</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('importPhotoCostDesc', 'Tokens deducted for Vision OCR recipe imports.')}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="0"
                    value={importPhotoCost}
                    onChange={(e) => setImportPhotoCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Token Purchase Packages */}
          <div 
            className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('tokenPackagesHeading', 'User Purchasable Token Packages')}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddPackage}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', borderColor: 'transparent' }}
              >
                <Plus className="h-3.5 w-3.5" /> {t('addPackageBtn', 'Add Package')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg, idx) => (
                <div 
                  key={pkg.id} 
                  className="border rounded-2xl p-4 space-y-3 relative shadow-md transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                      {t('packageNumber', 'Bundle')} #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePackage(pkg.id)}
                      className="text-red-400 hover:text-red-500 p-1 transition cursor-pointer"
                      title="Remove Package"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('packageNameLabel', 'Package Name')}
                    </label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => handlePackageChange(pkg.id, 'name', e.target.value)}
                      className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('packageTokensLabel', 'Tokens Granted')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.tokens}
                        onChange={(e) => handlePackageChange(pkg.id, 'tokens', parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('packagePriceLabel', 'Price ($ USD)')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pkg.price}
                        onChange={(e) => handlePackageChange(pkg.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('packageBadgeLabel', 'Badge Label (Optional)')}
                    </label>
                    <input
                      type="text"
                      value={pkg.badge || ''}
                      onChange={(e) => handlePackageChange(pkg.id, 'badge', e.target.value)}
                      placeholder="e.g. Popular, Best Value"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Subscription Plan Monthly Grants */}
          <div 
            className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <Layers className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                {t('planMonthlyGrantsHeading', 'Subscription Plan Monthly Included Tokens')}
              </h2>
            </div>

            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('planMonthlyGrantsSubtitle', 'Subscribers automatically receive these tokens every recurring monthly billing cycle.')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div 
                  key={p.slug}
                  className="p-4 rounded-2xl border space-y-2"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{p.name || p.slug}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/10" style={{ borderColor: 'var(--color-border)' }}>
                      {p.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="0"
                      value={planAllocations[p.slug] ?? 50}
                      onChange={(e) => setPlanAllocations({ ...planAllocations, [p.slug]: parseInt(e.target.value) || 0 })}
                      className="w-24 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                    <span className="text-xs font-bold text-amber-500">{tokenSymbol} / month</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TOKEN TRANSACTIONS AUDIT LEDGER                                    */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('totalDeductions', 'Total Consumed')}</span>
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-red-400">
                -{txStats.totalDeducted.toLocaleString()} <span className="text-xs text-amber-500">{tokenSymbol}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Tokens debited on /chef and /import</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('totalGranted', 'Total Granted / Bought')}</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                +{txStats.totalGranted.toLocaleString()} <span className="text-xs text-amber-500">{tokenSymbol}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Allocations from plans and packages</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('activeUsers', 'Active Transacting Users')}</span>
                <UserIcon className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: 'var(--color-text)' }}>
                {txStats.activeUsers.toLocaleString()}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Unique user accounts with activity</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('totalEvents', 'Total Transactions')}</span>
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: 'var(--color-text)' }}>
                {txStats.totalTransactions.toLocaleString()}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Immutable ledger rows in PostgreSQL</p>
            </div>
          </div>

          {/* Filtering, Search & Column Visibility Toolbar */}
          <div 
            className="border rounded-3xl p-5 shadow-xl space-y-4"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="h-4 w-4 absolute left-3.5 top-3" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  placeholder={t('searchTransactionsPlaceholder', 'Search by user email, user ID, or description...')}
                  className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Service Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 shrink-0 text-amber-500" />
                <select
                  value={txTypeFilter}
                  onChange={(e) => {
                    setTxTypeFilter(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full sm:w-48 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="all">All Services & Sources</option>
                  <option value="chef">/chef (AI Chat)</option>
                  <option value="import">/import (All Types)</option>
                  <option value="purchase">All Purchases (Plans & Packages)</option>
                  <option value="plan_purchase">Plan Purchases</option>
                  <option value="grant">Monthly Plan Grants</option>
                </select>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('rowsLabel', 'Rows:')}
                </span>
                <select
                  value={txLimit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setTxLimit(newLimit);
                    setTxPage(1);
                  }}
                  className="border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Column Hide/Show Dropdown Trigger */}
              <div className="relative w-full sm:w-auto" ref={columnPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnPicker(!showColumnPicker)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  style={{
                    backgroundColor: showColumnPicker ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: showColumnPicker ? '#ffffff' : 'var(--color-text)'
                  }}
                  title={t('customizeColumnsTooltip', 'Show or hide table columns')}
                >
                  <Columns3 className="h-4 w-4" />
                  <span>{t('columnsBtn', 'Columns')}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20">
                    {activeColumnCount}/{columns.length}
                  </span>
                </button>

                {/* Column Picker Modal / Popup */}
                {showColumnPicker && (
                  <div 
                    className="absolute right-0 mt-2 w-64 rounded-2xl border p-3.5 shadow-2xl z-50 space-y-2 animate-in fade-in slide-in-from-top-2"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                      <span className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                        <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                        {t('toggleColumnsHeader', 'Toggle Columns')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowColumnPicker(false)}
                        className="p-1 rounded hover:opacity-75 transition cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('toggleColumnsDesc', 'Select visible columns in the transaction ledger.')}
                    </p>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {columns.map((col) => (
                        <label 
                          key={col.key}
                          className="flex items-center justify-between p-2 rounded-xl border text-xs font-medium cursor-pointer transition hover:bg-slate-500/5"
                          style={{
                            backgroundColor: col.visible ? 'var(--color-inner-dark)' : 'transparent',
                            borderColor: col.visible ? 'var(--color-primary)' : 'var(--color-border)'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={col.visible}
                              onChange={() => toggleColumnVisibility(col.key)}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                              {col.label}
                            </span>
                          </div>
                          {col.visible ? (
                            <Eye className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)' }} />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Actions Banner */}
            {selectedTxIds.length > 0 && (
              <div 
                className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'rgba(239, 68, 68, 0.4)'
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>{selectedTxIds.length} {t('transactionsSelected', 'transaction(s) selected')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTxIds([])}
                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {t('clearSelection', 'Clear Selection')}
                  </button>
                  <button
                    type="button"
                    disabled={bulkDeleting}
                    onClick={handleBulkDeleteTransactions}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {bulkDeleting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>{t('deleteSelectedCount', `Delete Selected (${selectedTxIds.length})`)}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Transactions Table with Checkbox, Dynamic Columns and Actions */}
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {/* Select All Checkbox Header */}
                    <th className="p-3.5 w-10 text-center">
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded accent-primary cursor-pointer align-middle"
                        title={t('selectAllTooltip', 'Select all transactions on this page')}
                      />
                    </th>
                    {isColVisible('user') && <th className="p-3.5">{t('colUser', 'User')}</th>}
                    {isColVisible('user_total_tokens') && <th className="p-3.5">{t('colUserTotalTokens', 'User Total Tokens')}</th>}
                    {isColVisible('service') && <th className="p-3.5">{t('colService', 'Service / Operation')}</th>}
                    {isColVisible('amount') && <th className="p-3.5">{t('colAmount', 'Amount')}</th>}
                    {isColVisible('balance_after') && <th className="p-3.5">{t('colBalanceAfter', 'Balance After')}</th>}
                    {isColVisible('description') && <th className="p-3.5">{t('colDescription', 'Description')}</th>}
                    {isColVisible('created_at') && <th className="p-3.5">{t('colTimestamp', 'Timestamp')}</th>}
                    <th className="p-3.5 text-right w-16">{t('colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {txLoading ? (
                    <tr>
                      <td colSpan={activeColumnCount + 2} className="p-8 text-center text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
                          <span>{t('loadingLedger', 'Loading token transaction ledger...')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={activeColumnCount + 2} className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('noTransactionsFound', 'No transactions recorded matching your search parameters.')}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const isNegative = tx.amount < 0;
                      const isSelected = selectedTxIds.includes(tx.id);
                      return (
                        <tr 
                          key={tx.id} 
                          className={`transition font-medium ${isSelected ? 'bg-primary/10' : 'hover:bg-slate-500/5'}`}
                          style={{ color: 'var(--color-text)' }}
                        >
                          {/* Row Selection Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(tx.id)}
                              className="w-4 h-4 rounded accent-primary cursor-pointer align-middle"
                            />
                          </td>

                          {/* User Column */}
                          {isColVisible('user') && (
                            <td className="p-3.5">
                              <div className="font-bold truncate max-w-[180px]" title={tx.user_email}>
                                {tx.user_email || 'Anonymous'}
                              </div>
                              <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                                {tx.user_id}
                              </div>
                            </td>
                          )}

                          {/* User Total Token Column */}
                          {isColVisible('user_total_tokens') && (
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5 font-mono font-black text-xs" style={{ color: 'var(--color-text)' }}>
                                <Wallet className="h-3.5 w-3.5 text-amber-500" />
                                <span>{Number(tx.user_total_tokens ?? tx.balance_after).toLocaleString()}</span>
                                <span className="text-amber-500 text-[11px]">{tokenSymbol}</span>
                              </div>
                            </td>
                          )}

                          {/* Service / Operation */}
                          {isColVisible('service') && (
                            <td className="p-3.5">
                              {renderServiceBadge(tx.type)}
                            </td>
                          )}

                          {/* Amount */}
                          {isColVisible('amount') && (
                            <td className="p-3.5">
                              <span className={`font-mono font-black text-xs ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isNegative ? '' : '+'}{tx.amount} {tokenSymbol}
                              </span>
                            </td>
                          )}

                          {/* Balance After */}
                          {isColVisible('balance_after') && (
                            <td className="p-3.5 font-mono text-xs font-bold">
                              {tx.balance_after} <span className="text-amber-500">{tokenSymbol}</span>
                            </td>
                          )}

                          {/* Description */}
                          {isColVisible('description') && (
                            <td className="p-3.5 max-w-[240px] truncate text-[11px]" style={{ color: 'var(--color-text-secondary)' }} title={tx.description}>
                              {tx.description || '-'}
                            </td>
                          )}

                          {/* Timestamp */}
                          {isColVisible('created_at') && (
                            <td className="p-3.5 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                              {new Date(tx.created_at).toLocaleString()}
                            </td>
                          )}

                          {/* Actions Column */}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              disabled={deletingTxId === tx.id}
                              onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                              className="p-1.5 rounded-lg border text-red-400 hover:text-red-300 border-red-900/40 hover:bg-red-950/20 transition cursor-pointer disabled:opacity-50"
                              title={t('deleteTransactionTooltip', 'Delete Transaction')}
                            >
                              {deletingTxId === tx.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Comprehensive Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('showing', 'Showing')}{' '}
                <strong style={{ color: 'var(--color-text)' }}>
                  {txTotalCount > 0 ? (txPage - 1) * txLimit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong style={{ color: 'var(--color-text)' }}>
                  {Math.min(txPage * txLimit, txTotalCount)}
                </strong>{' '}
                {t('of', 'of')}{' '}
                <strong style={{ color: 'var(--color-text)' }}>{txTotalCount}</strong>{' '}
                {t('transactionsLabel', 'transactions')}
              </span>

              {/* Page Button Bar */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={txPage <= 1 || txLoading}
                  onClick={() => setTxPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={txPage <= 1 || txLoading}
                  onClick={() => setTxPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTxPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer shadow-sm"
                    style={txPage === num ? {
                      backgroundColor: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={txPage >= txTotalPages || txLoading}
                  onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={txPage >= txTotalPages || txLoading}
                  onClick={() => setTxPage(txTotalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-sm"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
