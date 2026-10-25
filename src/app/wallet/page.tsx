'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Wallet, CreditCard, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Gift, ShieldCheck, ArrowRight, Search, ChevronLeft, ChevronRight, 
  Coins, Sparkles, Check 
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface WalletSettings {
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
  amount: number | string;
  balance_after: number | string;
  type: string;
  gateway: string;
  gateway_tx_id?: string;
  status: string;
  description: string;
  created_at: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥', THB: '฿'
};

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User & Balances
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);

  // Concurrency and Loop Prevention Guards
  const isFetchingRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  // Settings
  const [settings, setSettings] = useState<WalletSettings>({
    is_enabled: true,
    currency: 'USD',
    min_topup: 5,
    max_topup: 1000,
    preset_amounts: [10, 25, 50, 100, 250],
    bonus_rules: [{ threshold: 50, bonus_percent: 5 }, { threshold: 100, bonus_percent: 10 }],
    allowed_gateways: ['stripe', 'paypal', 'manual'],
    allow_site_purchases: true,
  });

  // Top-Up Form States (Autofill Safe)
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe');

  // Ledger States
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalDeposited: 0, totalSpent: 0, totalEvents: 0 });

  const activeCurrencySymbol = useMemo(() => {
    return CURRENCY_SYMBOLS[settings.currency] || '$';
  }, [settings.currency]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Pure Local State & Storage Synchronization (NO RECURSIVE EVENT DISPATCHES)
  const syncLocalBalancePure = useCallback((newBal: number) => {
    setBalance(newBal);
    if (typeof window !== 'undefined') {
      try {
        const keys = ['zecratary_user', 'currentUser', 'zecratary_current_user', 'user'];
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const u = JSON.parse(raw);
            u.wallet_balance = newBal;
            localStorage.setItem(k, JSON.stringify(u));
          }
        }
      } catch (_) {}
    }
  }, []);

  // Fetch Wallet Data (Idempotent GET without self-triggering event broadcasts)
  const fetchWalletData = useCallback(async (activeUser: User | null, targetPage = page, search = searchQuery, filter = typeFilter) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    const userEmail = activeUser?.email || 'admin@zecratary.com';
    const userId = activeUser?.id || 'usr_admin_1';

    try {
      const qParams = new URLSearchParams({
        email: userEmail,
        userId: userId,
        page: String(targetPage),
        limit: '10',
        search: search,
        type: filter
      });

      const res = await fetch(`/api/wallet?${qParams.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const wBal = typeof data.wallet_balance === 'number' 
            ? data.wallet_balance 
            : (typeof data.balance === 'number' ? data.balance : Number(data.user?.wallet_balance || 0));
          syncLocalBalancePure(wBal);

          if (data.settings) {
            setSettings({
              is_enabled: data.settings.is_enabled !== false,
              currency: data.settings.currency || 'USD',
              min_topup: Number(data.settings.min_topup || 5),
              max_topup: Number(data.settings.max_topup || 1000),
              preset_amounts: Array.isArray(data.settings.preset_amounts) && data.settings.preset_amounts.length > 0 
                ? data.settings.preset_amounts.map(Number) 
                : [10, 25, 50, 100, 250],
              bonus_rules: Array.isArray(data.settings.bonus_rules) ? data.settings.bonus_rules : [],
              allowed_gateways: Array.isArray(data.settings.allowed_gateways) ? data.settings.allowed_gateways : ['stripe', 'paypal', 'manual'],
              allow_site_purchases: data.settings.allow_site_purchases !== false
            });
          }

          if (Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          }
          if (data.totalPages) setTotalPages(data.totalPages);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('[WalletPage] Read notice:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [syncLocalBalancePure, page, searchQuery, typeFilter]);

  // Stable ref for fetchWalletData to decouple primary lifecycle effect
  const fetchRef = useRef(fetchWalletData);
  useEffect(() => {
    fetchRef.current = fetchWalletData;
  });

  // Isolated Document Title Effect (Doesn't trigger data re-fetching)
  useEffect(() => {
    document.title = `${t('storeWalletTitle', 'Store Wallet')} - Zecratary`;
  }, [t]);

  // Initial Mount Effect (Executes Strictly Once)
  useEffect(() => {
    initAuthStorage();
    const u = getCurrentUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);

    // Read initial URL parameters safely
    const paramAmount = searchParams?.get('amount');
    if (paramAmount) {
      const parsedAmount = parseFloat(paramAmount);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        setCustomAmount(parsedAmount.toFixed(2));
        setSelectedAmount(0);
      }
    }

    const sessionId = searchParams?.get('session_id');
    const isSuccess = searchParams?.get('success') === 'true';
    if (sessionId || isSuccess) {
      showToast(t('paymentReconciledToast', 'Payment verified! Your wallet has been credited.'), 'success');
      // Clean query parameters from URL to avoid re-verification on reload
      try {
        window.history.replaceState({}, '', '/wallet');
      } catch (_) {}
    }

    // Execute initial load
    fetchRef.current(u);

    // Debounced listener for external window events (300ms throttle)
    const handleDebouncedSync = () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const active = getCurrentUser();
        if (active) {
          setUser(active);
          fetchRef.current(active);
        }
      }, 300);
    };

    window.addEventListener('zecratary_languages_updated', handleDebouncedSync);
    window.addEventListener('zecratary_dictionary_updated', handleDebouncedSync);
    window.addEventListener('zecratary_locale_changed', handleDebouncedSync);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      window.removeEventListener('zecratary_languages_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_dictionary_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_locale_changed', handleDebouncedSync);
    };
  }, []); // Strictly mount-only: []

  // Re-fetch only on explicit page, search, or type filter changes
  useEffect(() => {
    if (user) {
      fetchRef.current(user, page, searchQuery, typeFilter);
    }
  }, [page, searchQuery, typeFilter]);

  // Compute Active Deposit Amount and Bonus
  const finalDepositAmount = useMemo(() => {
    if (customAmount.trim()) {
      return parseFloat(customAmount) || 0;
    }
    return selectedAmount || 0;
  }, [customAmount, selectedAmount]);

  const activeBonusPercent = useMemo(() => {
    if (!settings.bonus_rules || settings.bonus_rules.length === 0) return 0;
    const sorted = [...settings.bonus_rules].sort((a, b) => b.threshold - a.threshold);
    const rule = sorted.find(r => finalDepositAmount >= r.threshold);
    return rule ? rule.bonus_percent : 0;
  }, [finalDepositAmount, settings.bonus_rules]);

  const bonusAmount = useMemo(() => {
    if (activeBonusPercent <= 0) return 0;
    return (finalDepositAmount * activeBonusPercent) / 100;
  }, [finalDepositAmount, activeBonusPercent]);

  // Execute User-Initiated Deposit Mutation (Broadcasts events ONLY on write)
  const handleDeposit = async () => {
    if (finalDepositAmount < settings.min_topup) {
      showToast((t('minTopupWarning', 'Minimum deposit is {min}')).replace('{min}', `${activeCurrencySymbol}${settings.min_topup}`), 'error');
      return;
    }
    if (finalDepositAmount > settings.max_topup) {
      showToast((t('maxTopupWarning', 'Maximum deposit is {max}')).replace('{max}', `${activeCurrencySymbol}${settings.max_topup}`), 'error');
      return;
    }
    if (!user || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'topup',
          amount: finalDepositAmount,
          bonus: bonusAmount,
          gateway: selectedGateway,
          email: user.email,
          userId: user.id || 'usr_admin_1',
          gatewayTxId: `gw_manual_${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to deposit funds');
      }

      if (data.checkoutUrl) {
        showToast(t('checkoutRedirectNotice', 'Redirecting to secure payment checkout...'));
        window.location.href = data.checkoutUrl;
        return;
      }

      const newBal = typeof data.wallet_balance === 'number' 
        ? data.wallet_balance 
        : (balance + finalDepositAmount + bonusAmount);
      
      syncLocalBalancePure(newBal);

      // Explicitly broadcast balance changes ONLY upon write actions
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
        window.dispatchEvent(new Event('storage'));
        try {
          const bc = new BroadcastChannel('zecratary_balance_channel');
          bc.postMessage({ type: 'WALLET_UPDATED', wallet: newBal });
          bc.close();
        } catch (_) {}
      }

      showToast(
        (t('depositSuccessToast', 'Successfully deposited {amount} into your wallet!'))
          .replace('{amount}', `${activeCurrencySymbol}${finalDepositAmount.toFixed(2)}`),
        'success'
      );

      setCustomAmount('');
      setSelectedAmount(settings.preset_amounts[0] || 50);
      fetchRef.current(user, page, searchQuery, typeFilter);
    } catch (err: any) {
      showToast(err.message || 'Deposit failed.', 'error');
    } finally {
      setSubmitting(false);
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
            {t('storeWalletTitle', 'Store Wallet')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('storeWalletSubtitle', 'Deposit funds to purchase AI tokens and subscriptions.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRef.current(user, page, searchQuery, typeFilter)}
            disabled={loading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('reloadBtn', 'Reload')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('reloadBtn', 'Reload')}</span>
          </button>

          <Link
            href="/token"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Coins className="h-4 w-4" />
            <span>{t('topUpTokens', 'Token Portal')}</span>
          </Link>
        </div>
      </div>

      {/* 1. Main Deposit Section & Available Balance Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Balance Card (4 Cols) */}
        <div 
          className="lg:col-span-4 p-6 rounded-3xl border shadow-sm space-y-5"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-75">{t('currentWalletBalance', 'Available Balance')}</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="h-6 w-6" />
            </div>
          </div>

          <div className="text-3xl font-black font-mono text-emerald-400">
            {activeCurrencySymbol}{balance.toFixed(2)}
          </div>

          <div className="pt-3 border-t space-y-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center opacity-80">
              <span>{t('totalDeposited', 'Total Deposited')}:</span>
              <span className="font-bold font-mono text-emerald-400">+{activeCurrencySymbol}{stats.totalDeposited.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center opacity-80">
              <span>{t('totalSpent', 'Total Spent')}:</span>
              <span className="font-bold font-mono text-rose-400">-{activeCurrencySymbol}{stats.totalSpent.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Top-Up Control Center (8 Cols) - FORM-FREE ACCESSIBLE CONTAINER */}
        <div 
          role="region"
          data-lpignore="true"
          className="lg:col-span-8 p-6 rounded-3xl border shadow-sm space-y-5 transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
              {t('depositFunds', 'Deposit Funds')}
            </h3>
            {activeBonusPercent > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1">
                <Gift className="h-3 w-3" />
                {(t('depositBonusBadge', '{percent}% Bonus Active')).replace('{percent}', String(activeBonusPercent))}
              </span>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold opacity-80">{t('selectPresetAmount', 'Select Preset Amount')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {settings.preset_amounts.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`py-2.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer shadow-xs ${
                    selectedAmount === amt && !customAmount ? 'text-white' : 'hover:border-[var(--color-primary)]'
                  }`}
                  style={selectedAmount === amt && !customAmount ? {
                    backgroundColor: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)'
                  } : {
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {activeCurrencySymbol}{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-xs font-bold mb-1 opacity-80">{t('orCustomAmount', 'Or enter custom amount')}</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold font-mono text-sm opacity-60">{activeCurrencySymbol}</span>
              <input
                type="number"
                min={settings.min_topup}
                max={settings.max_topup}
                step="0.01"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                placeholder="50.00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(0);
                }}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          {/* Payment Gateway Options with Check Icon */}
          <div className="space-y-2">
            <label className="block text-xs font-bold opacity-80">{t('paymentGateway', 'Payment Gateway')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {settings.allowed_gateways.includes('stripe') && (
                <button
                  type="button"
                  onClick={() => setSelectedGateway('stripe')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    selectedGateway === 'stripe' ? 'border-[var(--color-primary)] bg-[var(--color-inner-dark)]' : 'hover:border-slate-500'
                  }`}
                  style={{ borderColor: selectedGateway === 'stripe' ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-sky-400" />
                    <span>{t('stripeGateway', 'Stripe')}</span>
                  </span>
                  {selectedGateway === 'stripe' && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
                </button>
              )}

              {settings.allowed_gateways.includes('paypal') && (
                <button
                  type="button"
                  onClick={() => setSelectedGateway('paypal')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    selectedGateway === 'paypal' ? 'border-[var(--color-primary)] bg-[var(--color-inner-dark)]' : 'hover:border-slate-500'
                  }`}
                  style={{ borderColor: selectedGateway === 'paypal' ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>{t('paypalGateway', 'PayPal')}</span>
                  </span>
                  {selectedGateway === 'paypal' && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
                </button>
              )}

              {settings.allowed_gateways.includes('manual') && (
                <button
                  type="button"
                  onClick={() => setSelectedGateway('manual')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    selectedGateway === 'manual' ? 'border-[var(--color-primary)] bg-[var(--color-inner-dark)]' : 'hover:border-slate-500'
                  }`}
                  style={{ borderColor: selectedGateway === 'manual' ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>{t('manualGateway', 'Manual Settlement')}</span>
                  </span>
                  {selectedGateway === 'manual' && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
                </button>
              )}
            </div>
          </div>

          {/* Deposit Trigger Button */}
          <button
            type="button"
            onClick={handleDeposit}
            disabled={submitting || finalDepositAmount < settings.min_topup}
            className="w-full py-3 rounded-xl text-white font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {submitting ? t('processingDeposit', 'Processing Deposit...') : (
              <>
                <Plus className="h-4 w-4" />
                <span>
                  {t('addFundsBtn', 'Add Funds to Wallet')} ({activeCurrencySymbol}{finalDepositAmount.toFixed(2)}
                  {bonusAmount > 0 && ` + ${activeCurrencySymbol}${bonusAmount.toFixed(2)} Bonus`})
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Transaction Audit Ledger Table */}
      <div 
        role="region"
        data-lpignore="true"
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
            {t('walletLedgerTitle', 'Wallet Transaction Ledger')}
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
                placeholder={t('searchLedgerPlaceholder', 'Search transactions...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none font-medium w-48 sm:w-64"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="all">{t('allTypes', 'All Types')}</option>
              <option value="topup">{t('filterTopup', 'Deposits')}</option>
              <option value="purchase">{t('filterPurchase', 'Purchases')}</option>
              <option value="refund">{t('filterRefund', 'Refunds')}</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-xs opacity-50">
              {t('noTransactionsFound', 'No transactions found matching your criteria.')}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold opacity-70" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="py-2.5 px-3">{t('colDate', 'Date')}</th>
                  <th className="py-2.5 px-3">{t('colTxId', 'Transaction ID')}</th>
                  <th className="py-2.5 px-3">{t('colGateway', 'Gateway')}</th>
                  <th className="py-2.5 px-3">{t('colType', 'Type')}</th>
                  <th className="py-2.5 px-3">{t('colDescription', 'Description')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colAmount', 'Amount')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colBalanceAfter', 'Balance After')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {transactions.map((tx) => {
                  const isCredit = Number(tx.amount) > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-3 font-mono text-[11px] opacity-75">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] opacity-60">
                        {tx.id.slice(0, 14)}...
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold opacity-75">
                        {tx.gateway || 'Stripe'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border opacity-80" style={{ borderColor: 'var(--color-border)' }}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {tx.description}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold font-mono ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCredit ? `+${activeCurrencySymbol}${Number(tx.amount).toFixed(2)}` : `-${activeCurrencySymbol}${Math.abs(Number(tx.amount)).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold opacity-80">
                        {activeCurrencySymbol}{Number(tx.balance_after || 0).toFixed(2)}
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
              {(t('pageIndicator', 'Page {page} of {total}'))
                .replace('{page}', String(page))
                .replace('{total}', String(totalPages))}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                title={t('prevPage', 'Previous')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
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
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-xs opacity-50">
        Loading Wallet Portal...
      </div>
    }>
      <WalletContent />
    </Suspense>
  );
}
