'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wallet,
  CreditCard,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Gift,
  ShieldCheck,
  ArrowRight,
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  Layers,
  Coins,
  Shield,
  ExternalLink,
  Info,
  RotateCw
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/context/LanguageContext';

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
  amount: number;
  balance_after: number;
  type: string;
  gateway: string;
  gateway_tx_id?: string;
  status: string;
  description: string;
  created_at: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
};

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Active User & Balances
  const [user, setUser] = useState<User | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const [balance, setBalance] = useState<number>(0);

  // Concurrency & Idempotency Guards
  const verifyingIdRef = useRef<string | null>(null);
  const isFetchingWalletRef = useRef<boolean>(false);

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

  // Top-Up Form States
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe');

  // Ledger States
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ totalDeposited: 0, totalSpent: 0, totalEvents: 0 });

  const activeCurrencySymbol = useMemo(() => {
    return CURRENCY_SYMBOLS[settings.currency] || '$';
  }, [settings.currency]);

  // Handle Custom Amount input cleanly
  const handleCustomAmountChange = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
    setCustomAmount(formatted);
    if (formatted !== '') {
      setSelectedAmount(0);
    }
  };

  // Compute Active Deposit Amount with strict priority for customAmount
  const activeAmount = useMemo(() => {
    const clean = customAmount.trim().replace(/[^0-9.]/g, '');
    if (clean !== '') {
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount || 0;
  }, [customAmount, selectedAmount]);

  // Compute Tiered Bonus
  const activeBonus = useMemo(() => {
    if (!settings.bonus_rules || !Array.isArray(settings.bonus_rules)) return 0;
    let highestBonus = 0;
    for (const rule of settings.bonus_rules) {
      const threshold = parseFloat(rule.threshold as any || 0);
      const percent = parseFloat(rule.bonus_percent as any || 0);
      if (activeAmount >= threshold && percent > 0) {
        const bonus = activeAmount * (percent / 100);
        if (bonus > highestBonus) highestBonus = bonus;
      }
    }
    return highestBonus;
  }, [activeAmount, settings.bonus_rules]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load User & Balance Hydration
  const hydrateUser = useCallback(() => {
    initAuthStorage();
    let active = getCurrentUser();

    if (!active && typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('zecratary_user') || localStorage.getItem('currentUser');
      if (savedUserStr) {
        try {
          active = JSON.parse(savedUserStr);
        } catch (_) {}
      }
    }

    if (!active && typeof document !== 'undefined') {
      const authKeys = ['zecratary_session', 'zecratary_current_user', 'currentUser'];
      for (const k of authKeys) {
        const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)'));
        if (match && match[1]) {
          try {
            active = JSON.parse(decodeURIComponent(match[1]));
            if (active?.email || active?.id) break;
          } catch (_) {}
        }
      }
    }

    if (!active) {
      router.replace('/login');
      return;
    }

    currentUserRef.current = active;
    setUser(active);
    if ((active as any).wallet_balance) {
      setBalance(parseFloat((active as any).wallet_balance || 0));
    }
  }, [router]);

  const hydrateUserRef = useRef(hydrateUser);
  hydrateUserRef.current = hydrateUser;

  // Fetch Wallet Data & Ledger with concurrency guard
  const fetchWalletData = useCallback(async (
    targetPage = page,
    targetLimit = limit,
    targetSearch = debouncedSearch,
    targetType = typeFilter
  ) => {
    let active = currentUserRef.current || getCurrentUser();
    if (!active && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_user') || localStorage.getItem('currentUser');
        if (raw) active = JSON.parse(raw);
      } catch (_) {}
    }
    if (!active?.email && !active?.id) return;

    if (isFetchingWalletRef.current) return;
    isFetchingWalletRef.current = true;
    setTxLoading(true);

    try {
      const params = new URLSearchParams({
        email: active.email || '',
        userId: String(active.id || ''),
        page: String(targetPage),
        limit: String(targetLimit),
        search: targetSearch,
        type: targetType,
      });

      const res = await fetch(`/api/wallet?${params.toString()}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        if (data.settings) {
          setSettings({
            ...data.settings,
            min_topup: parseFloat(data.settings.min_topup || 5),
            max_topup: parseFloat(data.settings.max_topup || 1000),
          });
          if (Array.isArray(data.settings.allowed_gateways) && data.settings.allowed_gateways.length > 0) {
            setSelectedGateway((prev) =>
              data.settings.allowed_gateways.includes(prev) ? prev : data.settings.allowed_gateways[0]
            );
          }
        }
        if (typeof data.wallet_balance === 'number') {
          setBalance(data.wallet_balance);
        } else if (data.user && typeof data.user.wallet_balance !== 'undefined') {
          setBalance(parseFloat(data.user.wallet_balance || 0));
        }

        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : parseInt(data.totalCount || '0', 10));
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : Math.ceil((data.totalCount || 0) / targetLimit) || 1);
        setPage(data.page || targetPage);

        if (data.stats) {
          setStats({
            totalDeposited: Number(data.stats.totalDeposited || 0),
            totalSpent: Number(data.stats.totalSpent || 0),
            totalEvents: Number(data.stats.totalEvents || data.totalCount || 0),
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setTxLoading(false);
      setLoading(false);
      isFetchingWalletRef.current = false;
    }
  }, [page, limit, debouncedSearch, typeFilter]);

  const fetchWalletRef = useRef(fetchWalletData);
  fetchWalletRef.current = fetchWalletData;

  // Mount Lifecycle
  useEffect(() => {
    hydrateUserRef.current();
    fetchWalletRef.current(1, limit);

    const handleSync = () => {
      fetchWalletRef.current(page, limit, debouncedSearch, typeFilter);
    };
    window.addEventListener('zecratary_wallet_updated', handleSync);
    window.addEventListener('zecratary_wallet_settings_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_wallet_updated', handleSync);
      window.removeEventListener('zecratary_wallet_settings_updated', handleSync);
    };
  }, []);

  // Filter & Pagination effect
  useEffect(() => {
    if (currentUserRef.current) {
      fetchWalletRef.current(page, limit, debouncedSearch, typeFilter);
    }
  }, [page, limit, debouncedSearch, typeFilter]);

  // Handle Stripe Return Verification on Mount
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status');

    if (status === 'success' && sessionId) {
      if (verifyingIdRef.current === sessionId) return;
      verifyingIdRef.current = sessionId;

      const verifyCheckout = async () => {
        setSubmitting(true);
        setFeedback({
          type: 'info',
          msg: t('verifyingStripeSession', 'Confirming Stripe Payment and synchronizing your wallet balance...'),
        });

        const active = currentUserRef.current || getCurrentUser();

        try {
          const res = await fetch('/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify_stripe_session',
              sessionId,
              email: active?.email || '',
              userId: String(active?.id || ''),
            }),
          });
          const data = await res.json();

          if (data.success) {
            setFeedback({
              type: 'success',
              msg: data.message || t('topupSuccessMsg', 'Stripe checkout verified! Store credit added to your account.'),
            });
            if (typeof data.wallet_balance === 'number') {
              setBalance(data.wallet_balance);
            }
            if (Array.isArray(data.transactions)) {
              setTransactions(data.transactions);
              if (typeof data.totalCount === 'number') setTotalCount(data.totalCount);
              if (typeof data.totalPages === 'number') setTotalPages(data.totalPages);
              if (data.stats) setStats(data.stats);
            }
            fetchWalletRef.current(1, limit);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('zecratary_wallet_updated'));
              window.history.replaceState({}, '', '/wallet');
            }
          } else {
            setFeedback({
              type: 'error',
              msg: data.error || t('topupVerifyFailed', 'Could not verify Stripe payment session.'),
            });
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', '/wallet');
            }
          }
        } catch (err: any) {
          setFeedback({
            type: 'error',
            msg: err.message || t('topupVerifyConnError', 'Failed to connect to verification service.'),
          });
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/wallet');
          }
        } finally {
          setSubmitting(false);
        }
      };

      verifyCheckout();
    } else if (status === 'cancelled') {
      setFeedback({
        type: 'info',
        msg: t('topupCancelledMsg', 'Stripe Checkout was cancelled. No charges were made to your account.'),
      });
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/wallet');
      }
    }
  }, [searchParams, limit, t]);

  // Execute Deposit or Dispatch Stripe Checkout (Zero-Form Architecture)
  const handleExecuteTopup = async () => {
    setSubmitting(true);
    setFeedback(null);

    const active = currentUserRef.current || user || getCurrentUser();
    if (!active) {
      setFeedback({ type: 'error', msg: t('sessionExpiredMsg', 'Session expired. Please re-login.') });
      setSubmitting(false);
      return;
    }

    const cleanAmt = customAmount.trim().replace(/[^0-9.]/g, '');
    const depositAmt = cleanAmt !== '' ? parseFloat(cleanAmt) : selectedAmount;

    if (depositAmt < settings.min_topup) {
      setFeedback({
        type: 'error',
        msg: `${t('minDepositError', 'Minimum deposit allowed is')} ${activeCurrencySymbol}${settings.min_topup.toFixed(2)}.`,
      });
      setSubmitting(false);
      return;
    }

    if (depositAmt > settings.max_topup) {
      setFeedback({
        type: 'error',
        msg: `${t('maxDepositError', 'Maximum single deposit cap is')} ${activeCurrencySymbol}${settings.max_topup.toFixed(2)}.`,
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: String(active.id || ''),
          email: active.email,
          amount: depositAmt,
          gateway: selectedGateway,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          gatewayTxId: `gw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.checkoutUrl) {
          setFeedback({
            type: 'info',
            msg: t('redirectingToStripe', 'Redirecting to Stripe secure checkout...'),
          });
          window.location.href = data.checkoutUrl;
          return;
        }

        setFeedback({ type: 'success', msg: data.message });
        if (typeof data.wallet_balance === 'number') {
          setBalance(data.wallet_balance);
        }

        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (typeof data.totalCount === 'number') setTotalCount(data.totalCount);
          if (typeof data.totalPages === 'number') setTotalPages(data.totalPages);
          if (data.stats) setStats(data.stats);
        }

        setCustomAmount('');
        fetchWalletRef.current(1, limit);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
        }
      } else {
        setFeedback({ type: 'error', msg: data.error || t('topupFailed', 'Top-up transaction failed.') });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('gatewayConnError', 'Payment gateway connection error.') });
    } finally {
      setSubmitting(false);
    }
  };

  // Reconcile unrecorded Stripe payments manually
  const handleReconcilePayments = async () => {
    setReconciling(true);
    setFeedback({
      type: 'info',
      msg: t('reconcilingLedger', 'Scanning Stripe Payment Gateway and synchronizing unrecorded top-ups...'),
    });

    const active = currentUserRef.current || user || getCurrentUser();

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile_wallet',
          userId: String(active?.id || ''),
          email: active?.email || '',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          msg: data.message || t('reconcileSuccessMsg', 'Ledger is fully synchronized with Stripe.'),
        });
        if (typeof data.wallet_balance === 'number') {
          setBalance(data.wallet_balance);
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (typeof data.totalCount === 'number') setTotalCount(data.totalCount);
          if (typeof data.totalPages === 'number') setTotalPages(data.totalPages);
          if (data.stats) setStats(data.stats);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
        }
      } else {
        setFeedback({
          type: 'error',
          msg: data.error || t('reconcileFailed', 'Failed to synchronize with Stripe.'),
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || t('reconcileConnError', 'Connection error while synchronizing with Stripe.'),
      });
    } finally {
      setReconciling(false);
    }
  };

  // Safe Badge Renderer
  const renderWalletBadge = (type?: string) => {
    const rawType = String(type || '').toLowerCase().trim();
    if (rawType === 'topup') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowUpRight className="h-3 w-3" /> {t('badgeTopup', 'Deposit Top-Up')}
        </span>
      );
    }
    if (rawType === 'token_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Coins className="h-3 w-3" /> {t('badgeTokenPurchase', 'Token Purchase')}
        </span>
      );
    }
    if (rawType === 'plan_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> {t('badgePlanPurchase', 'Plan Subscription')}
        </span>
      );
    }
    if (rawType === 'admin_adjustment') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Shield className="h-3 w-3" /> {t('badgeAdminAdjustment', 'Admin Adjustment')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Activity className="h-3 w-3" /> {rawType ? rawType.replace(/_/g, ' ') : 'Operation'}
      </span>
    );
  };

  const getPageNumbers = (curr: number, total: number) => {
    const pages: number[] = [];
    let start = Math.max(1, curr - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary, #3b82f6)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto space-y-8 pb-24 px-2 sm:px-4 pt-4 font-sans transition-colors duration-200 min-h-screen"
      style={{ color: 'var(--color-text, #ffffff)', backgroundColor: 'var(--color-bg, #0f172a)' }}
    >
      {/* Balance Hero Card */}
      <div
        className="p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card, #1e293b)', borderColor: 'var(--color-border, #334155)' }}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary,#3b82f6)]">
              <Wallet className="w-4 h-4" />
              <span>{t('storeCreditWallet', 'Store Credit Wallet')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {t('activeAndPersistent', 'Active & Persistent')}
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-baseline gap-2">
              <span className="font-mono text-[var(--color-primary,#3b82f6)]" suppressHydrationWarning>
                {activeCurrencySymbol}{balance.toFixed(2)}
              </span>
              <span className="text-lg font-bold opacity-60 font-mono">{settings.currency}</span>
            </div>
            <p className="text-xs opacity-70">
              {t('walletDesc', 'Spendable across recipe purchases, meal plans, token bundles, and platform services.')}
            </p>
          </div>

          {/* Quick Metrics & Settlement */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <div
              className="flex-1 p-4 rounded-2xl border flex items-center gap-3 shadow-inner"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ArrowUpRight className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">{t('totalDeposited', 'Total Deposited')}</div>
                <div className="text-sm font-black font-mono text-emerald-400" suppressHydrationWarning>
                  +{activeCurrencySymbol}{stats.totalDeposited.toFixed(2)}
                </div>
              </div>
            </div>

            <div
              className="flex-1 p-4 rounded-2xl border flex items-center gap-3 shadow-inner"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ArrowDownLeft className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">{t('totalSpent', 'Total Spent')}</div>
                <div className="text-sm font-black font-mono text-rose-400" suppressHydrationWarning>
                  -{activeCurrencySymbol}{stats.totalSpent.toFixed(2)}
                </div>
              </div>
            </div>

            <div
              className="flex-1 p-4 rounded-2xl border flex items-center gap-3 shadow-inner"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">{t('settlement', 'Settlement')}</div>
                <div className="text-xs font-bold text-emerald-400">{t('encryptedInstant', 'Encrypted Instant')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : feedback.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : feedback.type === 'info' ? (
            <Info className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-semibold text-xs">{feedback.msg}</span>
        </div>
      )}

      {/* Top-Up Configuration Area (Zero-Form Architecture) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Presets / Custom & Gateway */}
        <div
          className="lg:col-span-2 p-6 sm:p-7 rounded-3xl border space-y-6 shadow-md transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card, #1e293b)', borderColor: 'var(--color-border, #334155)' }}
        >
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--color-primary,#3b82f6)]" />
              <span>{t('chooseTopupAmount', '1. Choose Top-Up Amount')}</span>
            </h2>
            <p className="text-xs opacity-60 mt-0.5">
              {t('minDepositNotice', 'Minimum deposit is')} {activeCurrencySymbol}{settings.min_topup.toFixed(2)} {settings.currency} ({t('maxNotice', 'Max')} {activeCurrencySymbol}{settings.max_topup.toFixed(2)}).
            </p>
          </div>

          {/* Presets Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(settings.preset_amounts || [10, 25, 50, 100, 250]).map((amt) => {
              const isSelected = !customAmount && selectedAmount === amt;
              let applicableBonusPercent = 0;
              if (Array.isArray(settings.bonus_rules)) {
                for (const r of settings.bonus_rules) {
                  if (amt >= r.threshold && r.bonus_percent > applicableBonusPercent) {
                    applicableBonusPercent = r.bonus_percent;
                  }
                }
              }

              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                    isSelected
                      ? 'border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/10 font-bold scale-[1.02] shadow-sm'
                      : 'hover:border-gray-500'
                  }`}
                  style={{
                    backgroundColor: isSelected ? undefined : 'var(--color-inner-dark, #0f172a)',
                    borderColor: isSelected ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                  }}
                >
                  <span className="text-lg font-bold font-mono">
                    {activeCurrencySymbol}{amt}
                  </span>
                  {applicableBonusPercent > 0 && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-bold">
                      <Gift className="w-3 h-3" />
                      +{applicableBonusPercent}% {t('bonus', 'Bonus')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase opacity-70 mb-2">
              {t('orEnterCustomAmount', 'Or Enter Custom Deposit Amount')} ({activeCurrencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-60 font-mono select-none">
                {activeCurrencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 5.00"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                onFocus={() => {
                  if (!customAmount) {
                    setSelectedAmount(0);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteTopup();
                  }
                }}
                className="w-full pl-9 pr-4 py-3 rounded-2xl border text-base font-bold font-mono outline-none focus:border-[var(--color-primary,#3b82f6)]"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: customAmount ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                }}
              />
            </div>
            {customAmount && (
              <div className="flex justify-between items-center mt-1.5 px-1 text-[11px] opacity-70 font-mono">
                <span>Custom Amount Active:</span>
                <span className="font-bold text-[var(--color-primary,#3b82f6)]">
                  {activeCurrencySymbol}{activeAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Payment Gateway Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase opacity-70 mb-3">
              {t('selectPaymentGateway', '2. Select Payment Gateway')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'stripe', label: t('gatewayStripe', 'Credit Card (Stripe)') },
                { id: 'paypal', label: t('gatewayPaypal', 'PayPal') },
                { id: 'manual', label: t('gatewayManual', 'Manual Settlement') },
              ]
                .filter((gw) => !settings.allowed_gateways || settings.allowed_gateways.includes(gw.id))
                .map((gw) => {
                  const isSelected = selectedGateway === gw.id;
                  return (
                    <div
                      key={gw.id}
                      onClick={() => setSelectedGateway(gw.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all select-none ${
                        isSelected
                          ? 'border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/10 font-bold'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? undefined : 'var(--color-inner-dark, #0f172a)',
                        borderColor: isSelected ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                      }}
                    >
                      <span className="text-xs font-semibold">{gw.label}</span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border ${
                          isSelected ? 'bg-[var(--color-primary,#3b82f6)] border-[var(--color-primary,#3b82f6)]' : 'border-gray-500'
                        }`}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Column: Deposit Summary & Trigger */}
        <div
          className="p-6 sm:p-7 rounded-3xl border flex flex-col justify-between space-y-6 shadow-md transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card, #1e293b)', borderColor: 'var(--color-border, #334155)' }}
        >
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--color-primary,#3b82f6)]" />
              <span>{t('depositSummary', 'Deposit Summary')}</span>
            </h3>

            <div className="space-y-2.5 text-sm pt-2">
              <div className="flex justify-between">
                <span className="opacity-70 text-xs">{t('topupBase', 'Top-Up Base:')}</span>
                <span className="font-semibold font-mono">{activeCurrencySymbol}{activeAmount.toFixed(2)}</span>
              </div>
              {activeBonus > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Gift className="w-4 h-4" />
                    {t('promotionalBonus', 'Promotional Bonus:')}
                  </span>
                  <span className="font-bold font-mono">+{activeCurrencySymbol}{activeBonus.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between opacity-70 text-xs">
                <span>{t('selectedGateway', 'Selected Gateway:')}</span>
                <span className="uppercase font-semibold font-mono">{selectedGateway}</span>
              </div>

              <div
                className="border-t pt-3 flex justify-between text-base font-bold"
                style={{ borderColor: 'var(--color-border, #334155)' }}
              >
                <span>{t('totalCredited', 'Total Credited:')}</span>
                <span className="text-[var(--color-primary,#3b82f6)] font-mono text-lg">
                  {activeCurrencySymbol}{(activeAmount + activeBonus).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExecuteTopup}
            disabled={submitting || activeAmount <= 0}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{selectedGateway === 'stripe' ? t('redirectingStripe', 'Connecting Stripe...') : t('processingTopup', 'Processing...')}</span>
              </>
            ) : (
              <>
                <span>{selectedGateway === 'stripe' ? t('checkoutWithStripe', 'Pay with Stripe Checkout') : t('completeTopup', 'Complete Top-Up')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Wallet Transactions Ledger & Stripe Reconcile */}
      <div
        className="p-6 sm:p-7 rounded-3xl border space-y-4 shadow-md transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card, #1e293b)', borderColor: 'var(--color-border, #334155)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border, #334155)' }}>
          <div className="space-y-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--color-primary,#3b82f6)]" />
              <span>{t('walletLedgerTitle', 'Wallet Transactions Ledger')}</span>
            </h3>
            <p className="text-xs opacity-60">
              {t('walletLedgerSubtitle', 'Audit trail of all store credit top-ups, token bundle purchases, and administrative adjustments.')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReconcilePayments}
              disabled={reconciling || txLoading}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer hover:border-emerald-500 text-emerald-400 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
              title={t('reconcileStripeTooltip', 'Check and reconcile any unrecorded Stripe checkout payments')}
            >
              <RotateCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              <span>{reconciling ? t('reconcilingBtn', 'Reconciling...') : t('reconcileStripeBtn', 'Reconcile Stripe')}</span>
            </button>

            <Link
              href="/transactions?tab=wallet"
              className="text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <span>{t('fullLedger', 'Full Ledger')}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>

            <button
              type="button"
              onClick={() => fetchWalletRef.current(page, limit, debouncedSearch, typeFilter)}
              disabled={txLoading}
              className="p-2 rounded-xl border flex items-center justify-center cursor-pointer transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
              title={t('refreshLedger', 'Refresh ledger')}
            >
              <RefreshCw className={`w-4 h-4 ${txLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary, #3b82f6)' }} />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder={t('searchMemoPlaceholder', 'Search memo, gateway ID or description...')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-semibold outline-none focus:border-[var(--color-primary,#3b82f6)]"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-primary,#3b82f6)] shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <option value="all">{t('allOperations', 'All Operations')}</option>
              <option value="topup">{t('topupDeposits', 'Top-Up Deposits')}</option>
              <option value="token_purchase">{t('tokenPurchases', 'Token Purchases')}</option>
              <option value="plan_purchase">{t('planSubscriptions', 'Plan Subscriptions')}</option>
              <option value="admin_adjustment">{t('adminAdjustments', 'Admin Adjustments')}</option>
            </select>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {/* Responsive Table with Gateway Badge and Transaction Number */}
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border, #334155)' }}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b font-extrabold uppercase text-[10px] tracking-wider opacity-70"
                style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
              >
                <th className="p-3.5">{t('colOperationType', 'Operation Type')}</th>
                <th className="p-3.5">{t('colAmount', 'Amount')}</th>
                <th className="p-3.5">{t('colBalanceAfter', 'Balance After')}</th>
                <th className="p-3.5">{t('colGateway', 'Gateway / Tx Ref')}</th>
                <th className="p-3.5">{t('colDescription', 'Description')}</th>
                <th className="p-3.5">{t('colTimestamp', 'Timestamp')}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #334155)' }}>
              {txLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-bold opacity-70">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary,#3b82f6)]" />
                      <span>{t('loadingWalletRecords', 'Loading wallet records...')}</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-semibold opacity-50">
                    {t('noWalletActivity', 'No wallet activity recorded matching your criteria.')}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isNeg = Number(tx.amount) < 0;
                  const txRef = tx.gateway_tx_id || tx.id;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-500/5 transition font-medium">
                      <td className="p-3.5">{renderWalletBadge(tx.type)}</td>
                      <td className="p-3.5">
                        <span className={`font-mono font-black text-xs ${isNeg ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isNeg ? '' : '+'}{activeCurrencySymbol}{Math.abs(Number(tx.amount)).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold opacity-90">
                        {activeCurrencySymbol}{parseFloat(tx.balance_after as any || 0).toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className="uppercase text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border tracking-wider"
                            style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
                          >
                            {tx.gateway || 'manual'}
                          </span>
                          {txRef && (
                            <span
                              className="text-[9px] font-mono opacity-60 truncate max-w-[130px] select-all cursor-copy"
                              title={txRef}
                            >
                              {txRef}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-[11px] opacity-80" title={tx.description}>
                        {tx.description || '-'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] whitespace-nowrap opacity-60">
                        <span suppressHydrationWarning>
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '-'} {tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs"
          style={{ borderColor: 'var(--color-border, #334155)' }}
        >
          <span className="opacity-70">
            {t('showingPageInfo', 'Showing')} <strong>{totalCount > 0 ? (page - 1) * limit + 1 : 0}</strong> - <strong>{Math.min(page * limit, totalCount)}</strong> {t('ofTotal', 'of')} <strong>{totalCount}</strong> {t('transactionsLabel', 'transactions')}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1 || txLoading}
              onClick={() => setPage(1)}
              className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page <= 1 || txLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers(page, totalPages).map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border cursor-pointer"
                style={
                  page === num
                    ? { backgroundColor: 'var(--color-primary, #3b82f6)', borderColor: 'var(--color-primary, #3b82f6)', color: '#fff' }
                    : { backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }
                }
              >
                {num}
              </button>
            ))}

            <button
              disabled={page >= totalPages || txLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages || txLoading}
              onClick={() => setPage(totalPages)}
              className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-primary, #3b82f6)', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}
