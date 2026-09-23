'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  Coins, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  ShieldCheck, 
  CreditCard,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';
import { getCurrentUser, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
}

interface TokenTransaction {
  id: string | number;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  created_at: string;
  user_total_tokens?: number;
}

export default function TokenPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);

  // Live Token Balance & System Settings (Synchronized with /admin/token-setting)
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenName, setTokenName] = useState<string>('Foodie Token');
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  // Top Up Actions
  const [purchasingPkgId, setPurchasingPkgId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // KPI Stats
  const [stats, setStats] = useState({
    totalDeducted: 0,
    totalGranted: 0,
    totalEvents: 0
  });

  const isFetchingRef = useRef<boolean>(false);

  // 1. Initial Load & User Hydration
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem('zecratary_user');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (typeof cached.token_balance === 'number') {
            setTokenBalance(cached.token_balance);
          }
          if (typeof cached.wallet_balance === 'number') {
            setWalletBalance(cached.wallet_balance);
          }
        }
      } catch (_) {}
    }
  }, []);

  // 2. Fetch Data from /api/tokens (Backed by PostgreSQL)
  const fetchTokenData = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current && !isSilent) return;
    isFetchingRef.current = true;
    if (!isSilent) setLoadingTransactions(true);

    try {
      const currentUser = getCurrentUser();
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        type: typeFilter,
        search: searchQuery
      });

      if (currentUser?.id) params.append('userId', currentUser.id);
      if (currentUser?.email) params.append('email', currentUser.email);

      const res = await fetch(`/api/tokens?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch token records');
      const data = await res.json();

      if (data.success) {
        if (typeof data.balance === 'number') setTokenBalance(data.balance);
        if (typeof data.walletBalance === 'number') setWalletBalance(data.walletBalance);
        if (data.tokenSymbol) setTokenSymbol(data.tokenSymbol);
        if (data.tokenName) setTokenName(data.tokenName);

        // Dynamically sync and match packages configured in /admin/token-setting
        if (Array.isArray(data.packages)) {
          setPackages(data.packages);
          setSelectedPackageId(prev => {
            const exists = data.packages.some((p: TokenPackage) => p.id === prev);
            return exists ? prev : (data.packages[0]?.id || '');
          });
        }

        setTransactions(data.transactions || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);

        if (data.stats) {
          setStats({
            totalDeducted: Number(data.stats.totalDeducted) || 0,
            totalGranted: Number(data.stats.totalGranted) || 0,
            totalEvents: Number(data.stats.totalEvents) || 0
          });
        }
      }
    } catch (err: any) {
      console.error('Error loading token data:', err);
    } finally {
      if (!isSilent) setLoadingTransactions(false);
      isFetchingRef.current = false;
    }
  }, [currentPage, pageSize, typeFilter, searchQuery]);

  useEffect(() => {
    fetchTokenData();
  }, [fetchTokenData]);

  // Real-time Event Listener & Cross-Tab Synchronization
  useEffect(() => {
    const handleSync = () => fetchTokenData(true);

    window.addEventListener('zecratary_tokens_updated', handleSync);
    window.addEventListener('zecratary_token_settings_updated', handleSync);
    window.addEventListener('zecratary_wallet_updated', handleSync);

    // Cross-tab synchronization via storage event
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('token') || e.key.includes('settings')) {
        fetchTokenData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Window focus refresh
    const handleFocus = () => fetchTokenData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('zecratary_tokens_updated', handleSync);
      window.removeEventListener('zecratary_token_settings_updated', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchTokenData]);

  // 3. Purchase Package Handler (Atomic PostgreSQL Settlement)
  const handlePurchase = async (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;

    setPurchasingPkgId(pkgId);
    setFeedback(null);

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          packageId: pkgId,
          userId: user?.id || null,
          userEmail: user?.email || null,
          paymentMethod: 'wallet'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete token purchase.');
      }

      const newBal = typeof data.newBalance === 'number' ? data.newBalance : (tokenBalance + pkg.tokens);
      setTokenBalance(newBal);
      if (typeof data.walletBalance === 'number') {
        setWalletBalance(data.walletBalance);
      }

      setFeedback({
        type: 'success',
        message: data.message || `+${pkg.tokens.toLocaleString()} ${tokenSymbol} credited to your account!`
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
        window.dispatchEvent(new Event('zecratary_token_settings_updated'));
      }

      fetchTokenData(true);

      setTimeout(() => {
        setFeedback(null);
      }, 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error processing transaction.'
      });
    } finally {
      setPurchasingPkgId(null);
    }
  };

  const isAdmin = user && (user.role === 'admin' || user.email?.includes('admin'));

  const formatServiceType = (type: string) => {
    if (!type) return 'Operation';
    switch (type) {
      case 'usage_chef':
      case 'chef_prompt':
      case 'chef':
        return 'AI Chef Recipe Assistant';
      case 'usage_import_url':
      case 'import_url':
        return 'Import Recipe URL';
      case 'usage_import_text':
      case 'import_text':
        return 'Import Recipe Text';
      case 'usage_import_photo':
      case 'import_photo':
        return 'Import Recipe Photo';
      case 'package_purchase':
        return 'Token Bundle Purchase';
      case 'plan_purchase':
      case 'plan_monthly_grant':
        return 'Monthly Plan Allowance';
      case 'manual_credit':
        return 'Admin Credit';
      case 'manual_debit':
        return 'Admin Adjustment';
      default:
        return type.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)'
      }}
    >
      {/* 1. Header Bar */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <span>{tokenName}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-inner-dark)] text-amber-500">
                  {tokenSymbol}
                </span>
              </h1>
              <p className="text-xs font-semibold opacity-70">
                {t('tokenHubSubtitle', 'Manage your AI token credits, top up your wallet, and audit your usage transactions.')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Token Balance Pill */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border bg-[var(--color-inner-dark)] shadow-inner"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Coins className="h-5 w-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                {t('availableBalance', 'Available Balance')}
              </span>
              <span className="text-base font-black font-mono" style={{ color: 'var(--color-emerald)' }}>
                {tokenBalance.toLocaleString()} {tokenSymbol}
              </span>
            </div>
          </div>

          {/* Optional Wallet Balance Pill */}
          {walletBalance !== null && (
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border bg-[var(--color-inner-dark)] shadow-inner"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Wallet className="h-5 w-5 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {t('walletBalance', 'Store Wallet')}
                </span>
                <span className="text-base font-black font-mono text-blue-400">
                  ${walletBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {isAdmin && (
            <Link
              href="/admin/token-setting"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] text-xs font-bold transition bg-[var(--color-inner-dark)]"
              title="Admin Token Settings"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="hidden sm:inline">Configure Settings</span>
            </Link>
          )}
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div 
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in fade-in duration-200 ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="opacity-70 hover:opacity-100 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top-Up Package Catalog (Dynamic Match with /admin/token-setting) */}
      <div 
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>{t('topUpPackagesTitle', 'Top Up Token Bundles')}</span>
            </h2>
            <p className="text-xs opacity-70">
              {t('topUpPackagesSubtitle', 'Choose an instant token package to fuel AI cooking, recipe generation, and OCR imports. Bundles synchronize with admin settings.')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin/token-setting"
                className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                <span>{t('editPackagesAdmin', 'Edit in /admin/token-setting')}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <Link 
              href="/billing"
              className="text-xs font-bold flex items-center gap-1 hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>{t('viewMonthlyPlans', 'Looking for Monthly Subscriptions?')}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Dynamic Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {packages.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs opacity-60 space-y-2">
              <Coins className="h-8 w-8 mx-auto opacity-30 text-amber-500" />
              <p className="font-bold">{t('noPackagesConfigured', 'No token packages available at the moment.')}</p>
              {isAdmin && (
                <Link
                  href="/admin/token-setting"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 hover:underline"
                >
                  Configure Bundles in /admin/token-setting →
                </Link>
              )}
            </div>
          ) : (
            packages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const isBuying = purchasingPkgId === pkg.id;
              const isShort = walletBalance !== null && walletBalance < pkg.price;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative flex flex-col justify-between p-5 rounded-3xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 shadow-md' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 bg-[var(--color-inner-dark)] hover:shadow-xs'
                  }`}
                >
                  {/* Badge */}
                  {pkg.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs">
                        {pkg.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="pr-12">
                      <h3 className="text-sm font-black truncate">{pkg.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1 font-mono">
                        <span className="text-2xl font-black text-amber-500">+{pkg.tokens.toLocaleString()}</span>
                        <span className="text-xs font-bold opacity-75">{tokenSymbol}</span>
                      </div>
                    </div>

                    <p className="text-[11px] opacity-70">
                      Instantly adds <strong className="font-bold">{pkg.tokens.toLocaleString()}</strong> spendable AI tokens to your live wallet.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold opacity-60">Price</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black font-mono">${Number(pkg.price).toFixed(2)}</span>
                        {isShort && (
                          <span className="text-[10px] font-bold text-amber-500 font-mono">
                            Short ${(Number(pkg.price) - Number(walletBalance)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(purchasingPkgId)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(pkg.id);
                      }}
                      className="py-2 px-4 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {isBuying ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t('buyNow', 'Buy Now')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. 4-KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Spendable Balance */}
        <div 
          className="p-5 rounded-3xl border shadow-sm flex items-center gap-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Coins className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{t('myTokenBalance', 'Token Balance')}</p>
            <p className="text-xl font-black font-mono truncate" style={{ color: 'var(--color-emerald)' }}>
              {tokenBalance.toLocaleString()} {tokenSymbol}
            </p>
          </div>
        </div>

        {/* KPI 2: Total Consumed */}
        <div 
          className="p-5 rounded-3xl border shadow-sm flex items-center gap-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="p-3.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{t('totalConsumed', 'Total Consumed')}</p>
            <p className="text-xl font-black font-mono text-red-400 truncate">
              -{stats.totalDeducted.toLocaleString()} {tokenSymbol}
            </p>
          </div>
        </div>

        {/* KPI 3: Total Granted / Bought */}
        <div 
          className="p-5 rounded-3xl border shadow-sm flex items-center gap-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{t('totalGranted', 'Total Granted')}</p>
            <p className="text-xl font-black font-mono text-emerald-400 truncate">
              +{stats.totalGranted.toLocaleString()} {tokenSymbol}
            </p>
          </div>
        </div>

        {/* KPI 4: Total Events */}
        <div 
          className="p-5 rounded-3xl border shadow-sm flex items-center gap-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{t('totalEvents', 'Activity Events')}</p>
            <p className="text-xl font-black font-mono truncate">
              {stats.totalEvents.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Token Ledger & Transaction History */}
      <div 
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-primary)]" />
              <span>{t('tokenLedgerTitle', 'Token Audit Ledger')}</span>
            </h2>
            <p className="text-xs opacity-70">
              {t('tokenLedgerSubtitle', 'Detailed historical audit of token deductions, purchases, and promotional grants.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-[var(--color-inner-dark)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Search className="h-3.5 w-3.5 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('searchTransactions', 'Search operations...')}
                className="bg-transparent text-xs outline-none w-36 sm:w-44 font-semibold placeholder:opacity-50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs opacity-50 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>

            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-[var(--color-inner-dark)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Filter className="h-3.5 w-3.5 opacity-50" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">All Operations</option>
                <option value="chef">AI Chef Assistant</option>
                <option value="import">Recipe Imports</option>
                <option value="package_purchase">Package Purchases</option>
                <option value="plan">Monthly Plan Grants</option>
              </select>
            </div>

            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-[var(--color-inner-dark)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="text-[11px] font-bold opacity-60">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr 
                className="border-b uppercase font-mono text-[10px] tracking-wider opacity-60"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <th className="py-3 px-4">Service / Operation</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {loadingTransactions ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center opacity-60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                      <span>Loading token transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center opacity-60">
                    <Coins className="h-8 w-8 mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="font-bold">No token transactions found</p>
                    <p className="text-[11px] opacity-75 mt-1">
                      {searchQuery || typeFilter !== 'all' 
                        ? 'Try clearing your filters or search keywords.' 
                        : 'Your token activity ledger will appear here once you interact with AI tools or top up.'}
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCredit = Number(tx.amount) > 0;
                  return (
                    <tr 
                      key={tx.id}
                      className="hover:bg-[var(--color-inner-dark)]/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isCredit ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span>{formatServiceType(tx.type)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate opacity-85 font-medium">
                        {tx.description || 'Token Ledger Record'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black whitespace-nowrap">
                        <span className={isCredit ? 'text-emerald-400' : 'text-red-400'}>
                          {isCredit ? `+${Number(tx.amount).toLocaleString()}` : Number(tx.amount).toLocaleString()} {tokenSymbol}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap opacity-90">
                        {typeof tx.balance_after === 'number' ? `${tx.balance_after.toLocaleString()} ${tokenSymbol}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-[11px] opacity-60 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs font-mono opacity-60">
            Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} transactions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || loadingTransactions}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] hover:border-[var(--color-primary)] transition disabled:opacity-40 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold border border-[var(--color-border)] bg-[var(--color-inner-dark)]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || loadingTransactions}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-inner-dark)] hover:border-[var(--color-primary)] transition disabled:opacity-40 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
