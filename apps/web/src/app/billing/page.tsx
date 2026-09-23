// Generated / Updated by AI Collaborator
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CreditCard, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  Calendar,
  Sparkles,
  Ban,
  Building,
  Check,
  Coins,
  Zap,
  FileText,
  Printer,
  X,
  Clock,
  Lock,
  Gift
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

interface PlanCatalog {
  id: string;
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  tokenLimit: number;
  monthlyBadge?: string;
  annualBadge?: string;
  trialBadge?: string;
  description: string;
  features?: string[];
  isFree?: boolean;
}

interface TokenIdentity {
  tokenName: string;
  tokenSymbol: string;
}

interface TokenRewardInfo {
  monthlyTokens: number;
  tokenSymbol: string;
  tokenName: string;
  currentCycle: string;
  lastGrantCycle: string | null;
  lastGrantDate: string | null;
  nextGrantDate: string;
  isPaid: boolean;
  receivedThisMonth: boolean;
  status: 'active_paid' | 'paused_unpaid' | 'received_this_month' | 'eligible';
}

export default function UserBillingPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [activeTab, setActiveTab] = useState<'history' | 'methods' | 'subscriptions'>('history');
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [claimingTokens, setClaimingTokens] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plans, setPlans] = useState<PlanCatalog[]>([]);
  const [tokenIdentity, setTokenIdentity] = useState<TokenIdentity>({ tokenName: 'Tokens', tokenSymbol: '🪙' });
  const [tokenRewardInfo, setTokenRewardInfo] = useState<TokenRewardInfo | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<any>({
    activeGateway: 'stripe',
    currency: 'USD',
    currencySymbol: '$',
    stripe: { enabled: true },
    paypal: { enabled: true },
    manual: { enabled: true }
  });

  const [selectedMethod, setSelectedMethod] = useState<string>('stripe');

  // Search & Pagination for History Tab
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);

  // Search & Pagination for Subscriptions Tab
  const [planSearch, setPlanSearch] = useState('');
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(4);

  // Receipt Modal State
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);

  // Theme Sync
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const mode = localStorage.getItem('zecratary_theme_mode');
        setIsDayMode(mode === 'light' || mode === 'day');
      }
    };
    checkTheme();
    window.addEventListener('zecratary_theme_mode_changed', checkTheme);
    return () => window.removeEventListener('zecratary_theme_mode_changed', checkTheme);
  }, []);

  // Fetch initial data with active user session detection
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let emailParam = '';
      if (typeof window !== 'undefined') {
        try {
          const authUser = getCurrentUser();
          if (authUser?.email) {
            emailParam = `?email=${encodeURIComponent(authUser.email)}`;
          } else {
            const rawStored = localStorage.getItem('zecratary_current_user') || localStorage.getItem('zecratary_user') || localStorage.getItem('currentUser');
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (parsed?.email) emailParam = `?email=${encodeURIComponent(parsed.email)}`;
            }
          }
        } catch (_) {}
      }

      const res = await fetch(`/api/billing${emailParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setTransactions(data.transactions || []);
          setGatewayConfig(data.gatewayConfig || {});
          setPlans(data.plans || []);
          if (data.tokenIdentity) {
            setTokenIdentity(data.tokenIdentity);
          }
          if (data.tokenRewardInfo) {
            setTokenRewardInfo(data.tokenRewardInfo);
          }
          if (data.user?.payment_method) {
            setSelectedMethod(data.user.payment_method);
          }
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to load billing data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleSyncEvents = () => {
      fetchData();
    };

    window.addEventListener('zecratary_payment_updated', handleSyncEvents);
    window.addEventListener('zecratary_plans_updated', handleSyncEvents);
    window.addEventListener('zecratary_users_updated', handleSyncEvents);
    window.addEventListener('zecratary_token_settings_updated', handleSyncEvents);

    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSyncEvents);
      window.removeEventListener('zecratary_plans_updated', handleSyncEvents);
      window.removeEventListener('zecratary_users_updated', handleSyncEvents);
      window.removeEventListener('zecratary_token_settings_updated', handleSyncEvents);
    };
  }, [fetchData]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const activeTransaction = useMemo(() => {
    return transactions.find(
      (tx) => (tx.status === 'succeeded' || tx.status === 'successful' || tx.status === 'paid' || tx.status === 'canceled') &&
              (!tx.expiryDate || new Date(tx.expiryDate).getTime() > Date.now())
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return transactions.filter((tx) => {
      const matchesText = !q || 
        (tx.id && tx.id.toLowerCase().includes(q)) || 
        (tx.planName && tx.planName.toLowerCase().includes(q)) || 
        (tx.gateway && tx.gateway.toLowerCase().includes(q));

      const s = (tx.status || '').toLowerCase().trim();
      const filter = historyStatusFilter.toLowerCase().trim();

      let matchesStatus = filter === 'all';
      if (!matchesStatus) {
        if (filter === 'succeeded') matchesStatus = s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed';
        else if (filter === 'canceled') matchesStatus = s === 'canceled' || s === 'cancelled';
        else if (filter === 'refunded') matchesStatus = s === 'refunded';
        else if (filter === 'failed') matchesStatus = s === 'failed' || s === 'declined';
        else matchesStatus = s === filter;
      }

      return matchesText && matchesStatus;
    });
  }, [transactions, historySearch, historyStatusFilter]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTransactions.length / historyPageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredTransactions.slice(start, start + historyPageSize);
  }, [filteredTransactions, historyPage, historyPageSize]);

  const filteredPlans = useMemo(() => {
    const q = planSearch.toLowerCase().trim();
    return plans.filter((p) => {
      if (!q) return true;
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchSlug = p.slug && p.slug.toLowerCase().includes(q);
      const matchFeatures = Array.isArray(p.features) && p.features.some(f => f.toLowerCase().includes(q));
      return matchName || matchDesc || matchSlug || matchFeatures;
    });
  }, [plans, planSearch]);

  const totalPlanPages = Math.max(1, Math.ceil(filteredPlans.length / planPageSize));
  const paginatedPlans = useMemo(() => {
    const start = (planPage - 1) * planPageSize;
    return filteredPlans.slice(start, start + planPageSize);
  }, [filteredPlans, planPage, planPageSize]);

  const handleSavePaymentMethod = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_payment_method',
          email: user.email,
          paymentMethod: selectedMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: t('paymentMethodUpdatedMsg', 'Payment method preference saved successfully!') });
        fetchData();
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Could not save payment method' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm(t('confirmCancelSubMsg', 'Are you sure you want to cancel auto-renewal? You will continue to enjoy paid access until your current billing period ends.'))) {
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
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('renewalCancelledSuccess', 'Auto-renewal cancelled successfully.') 
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || t('cancelSubscriptionFailed', 'Failed to cancel subscription') });
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeSubscription = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume_subscription',
          email: user?.email
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('renewalResumedSuccess', 'Auto-renewal reactivated successfully!') 
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to reactivate subscription' });
    } finally {
      setProcessing(false);
    }
  };

  // Claim Monthly Tokens Manual Trigger
  const handleClaimMonthlyTokens = async () => {
    if (!user) return;
    setClaimingTokens(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_monthly_tokens',
          email: user.email
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Monthly tokens credited successfully!' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_token_settings_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
        }
        await fetchData();
      } else {
        throw new Error(data.error || 'Cannot claim monthly tokens');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Token grant failed' });
    } finally {
      setClaimingTokens(false);
    }
  };

  const handleSwitchPlan = async (plan: PlanCatalog, interval: 'MONTH' | 'YEAR') => {
    const amount = interval === 'YEAR' ? plan.annualPrice : plan.monthlyPrice;
    const planSlugWithInterval = plan.slug === 'taster' ? 'taster' : `${plan.slug}-${interval.toLowerCase()}`;
    const planDisplayName = plan.slug === 'taster' ? 'Taster (Free)' : `${plan.name} (${interval === 'YEAR' ? 'Annual' : 'Monthly'})`;
    const tokensCredited = plan.tokenLimit ?? (plan.slug === 'taster' ? 50 : 500);

    const tokenMsg = tokensCredited > 0 ? ` (+${tokensCredited.toLocaleString()} ${tokenIdentity.tokenSymbol}/mo while PAID)` : '';
    const confirmPrompt = `${t('confirmSwitchPlanPrompt', 'Purchase and activate')} ${planDisplayName} for ${gatewayConfig.currencySymbol}${amount.toFixed(2)}${tokenMsg}?`;
    if (!window.confirm(confirmPrompt)) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_plan',
          email: user?.email,
          userName: user?.name,
          planSlug: planSlugWithInterval,
          planName: planDisplayName,
          amount,
          interval,
          tokenLimit: tokensCredited,
          gateway: selectedMethod,
          currency: gatewayConfig?.currency || 'USD'
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || `Switched plan to ${planDisplayName}` });

        try {
          const raw = localStorage.getItem('zecratary_current_user');
          if (raw) {
            const u = JSON.parse(raw);
            u.subscriptionPlan = planSlugWithInterval;
            localStorage.setItem('zecratary_current_user', JSON.stringify(u));
          }
        } catch (_) {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_users_updated'));
          window.dispatchEvent(new Event('zecratary_plans_updated'));
          window.dispatchEvent(new Event('zecratary_token_settings_updated'));
        }

        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to switch subscription plan');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to switch subscription plan' });
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald, #10b981)', color: 'var(--color-emerald, #10b981)' }}>
          <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
          {t('statusSucceeded', 'Succeeded')}
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <Ban className="w-3.5 h-3.5 text-orange-400" />
          {t('statusCanceled', 'Canceled')}
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          {t('statusRefunded', 'Refunded')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        {status}
      </span>
    );
  };

  const isCurrentPlan = (planSlug: string, interval?: 'MONTH' | 'YEAR') => {
    const cleanPlanSlug = (planSlug || '').toLowerCase().trim().replace(/-(monthly|annual|year)$/i, '');
    const userPlan = (user?.subscription_plan || user?.plan_slug || '').toLowerCase().trim();
    const cleanUserBase = userPlan.replace(/-(monthly|annual|year)$/i, '');

    if (cleanPlanSlug === 'taster' || cleanPlanSlug === 'free') {
      return cleanUserBase === 'taster' || cleanUserBase === 'free' || !cleanUserBase;
    }

    const userInterval = (user?.plan_interval || (userPlan.includes('annual') || userPlan.includes('year') ? 'YEAR' : 'MONTH')).toUpperCase();

    if (!interval) {
      return cleanUserBase === cleanPlanSlug;
    }

    const isMatchingBase = cleanUserBase === cleanPlanSlug;
    const isMatchingInterval = (interval === 'YEAR' && (userInterval === 'YEAR' || userInterval === 'ANNUAL' || userPlan.includes('annual') || userPlan.includes('year'))) ||
                               (interval === 'MONTH' && (userInterval === 'MONTH' || (!userPlan.includes('annual') && !userPlan.includes('year'))));

    return isMatchingBase && isMatchingInterval;
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CreditCard className="h-7 w-7" style={{ color: 'var(--color-emerald, #10b981)' }} />
              {t('billingAndSubscriptionTitle', 'Billing & Subscriptions')}
            </h1>
            <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('billingPageSubtitle', 'Manage your payment history, payment methods, and subscription tiers.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald, #10b981)' }} />
              {t('refreshBtn', 'Refresh')}
            </button>
          </div>
        </div>

        {/* Quick User Entitlement Summary Strip */}
        {user && (
          <div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border shadow-sm text-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div>
              <span className="block opacity-60 uppercase text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>Account User</span>
              <span className="font-bold text-sm truncate block" style={{ color: 'var(--color-text)' }}>{user.name || user.email}</span>
            </div>
            <div>
              <span className="block opacity-60 uppercase text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>Subscription Plan</span>
              <span className="font-bold text-sm capitalize block" style={{ color: 'var(--color-emerald, #10b981)' }}>
                {user.subscription_plan?.replace(/-/g, ' ') || 'Taster (Free)'}
              </span>
            </div>
            <div>
              <span className="block opacity-60 uppercase text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>Token Balance</span>
              <span className="font-bold text-sm flex items-center gap-1" style={{ color: '#f59e0b' }}>
                <Coins className="w-3.5 h-3.5" />
                <span>{Number(user.token_balance || 0).toLocaleString()} {tokenIdentity.tokenSymbol}</span>
              </span>
            </div>
            <div>
              <span className="block opacity-60 uppercase text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>Next Renewal</span>
              <span className="font-bold text-sm block" style={{ color: 'var(--color-text)' }}>
                {activeTransaction?.expiryDate ? new Date(activeTransaction.expiryDate).toLocaleDateString() : 'Lifetime / Free'}
              </span>
            </div>
          </div>
        )}

        {/* MONTHLY TOKEN REWARD STATUS BANNER (Applies to all plans, stop if payment not PAID) */}
        {tokenRewardInfo && (
          <div 
            className="p-5 rounded-3xl border shadow-lg relative overflow-hidden transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: tokenRewardInfo.isPaid ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'
            }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    Monthly Plan Token Allowance ({tokenRewardInfo.monthlyTokens.toLocaleString()} {tokenRewardInfo.tokenSymbol} / mo)
                  </h3>
                  {tokenRewardInfo.isPaid ? (
                    tokenRewardInfo.receivedThisMonth ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald, #10b981)', color: 'var(--color-emerald, #10b981)' }}>
                        <CheckCircle className="w-3 h-3" /> Received for {tokenRewardInfo.currentCycle}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Gift className="w-3 h-3" /> Eligible for {tokenRewardInfo.currentCycle}
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Lock className="w-3 h-3" /> Token Reward Stopped (Unpaid)
                    </span>
                  )}
                </div>

                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tokenRewardInfo.isPaid ? (
                    tokenRewardInfo.receivedThisMonth ? (
                      <>You have received your monthly token reward for cycle <strong style={{ color: 'var(--color-text)' }}>{tokenRewardInfo.currentCycle}</strong>. Plan rewards are issued once per calendar month. Next reward scheduled on <strong style={{ color: 'var(--color-text)' }}>{new Date(tokenRewardInfo.nextGrantDate).toLocaleDateString()}</strong>.</>
                    ) : (
                      <>Your subscription payment is active and verified! Your monthly token reward for <strong style={{ color: 'var(--color-text)' }}>{tokenRewardInfo.currentCycle}</strong> is ready to be credited.</>
                    )
                  ) : (
                    <span className="text-rose-400 font-semibold">
                      Your subscription is currently not in PAID status. Token rewards are automatically stopped until an active payment transaction succeeds.
                    </span>
                  )}
                </p>
              </div>

              {tokenRewardInfo.isPaid && !tokenRewardInfo.receivedThisMonth && (
                <button
                  type="button"
                  onClick={handleClaimMonthlyTokens}
                  disabled={claimingTokens}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
                  style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
                >
                  {claimingTokens ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  <span>Claim Monthly Tokens (+{tokenRewardInfo.monthlyTokens} {tokenRewardInfo.tokenSymbol})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className="p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-in fade-in transition"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
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

        {/* Dynamic Navigation Tabs */}
        <div 
          className="flex border-b gap-2 sm:gap-6 overflow-x-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history' ? '' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'history' ? 'var(--color-emerald, #10b981)' : 'transparent',
              color: activeTab === 'history' ? 'var(--color-emerald, #10b981)' : 'var(--color-text-secondary)'
            }}
          >
            <DollarSign className="w-4 h-4" />
            {t('tabBillingHistory', 'Billing History')}
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'methods' ? '' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'methods' ? 'var(--color-emerald, #10b981)' : 'transparent',
              color: activeTab === 'methods' ? 'var(--color-emerald, #10b981)' : 'var(--color-text-secondary)'
            }}
          >
            <CreditCard className="w-4 h-4" />
            {t('tabPaymentMethod', 'Payment Method')}
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3.5 px-2 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'subscriptions' ? '' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'subscriptions' ? 'var(--color-emerald, #10b981)' : 'transparent',
              color: activeTab === 'subscriptions' ? 'var(--color-emerald, #10b981)' : 'var(--color-text-secondary)'
            }}
          >
            <Layers className="w-4 h-4" />
            {t('tabSubscriptions', 'Subscriptions')}
          </button>
        </div>

        {/* TAB 1: BILLING HISTORY */}
        {activeTab === 'history' && (
          <div 
            className="p-5 sm:p-7 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  placeholder={t('searchBillingPlaceholder', 'Search by plan, gateway, or transaction ID...')}
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={historyStatusFilter}
                  onChange={(e) => {
                    setHistoryStatusFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="all" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterAllStatus', 'All Statuses')}</option>
                  <option value="succeeded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterSucceeded', 'Succeeded')}</option>
                  <option value="canceled" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterCanceled', 'Canceled')}</option>
                  <option value="refunded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterRefunded', 'Refunded')}</option>
                  <option value="failed" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('filterFailed', 'Failed')}</option>
                </select>

                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    setHistoryPageSize(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value={5} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>5 / page</option>
                  <option value={10} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>10 / page</option>
                  <option value={20} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>20 / page</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr 
                    className="border-b text-xs font-bold uppercase tracking-wider opacity-70"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <th className="p-4">{t('colDate', 'Date')}</th>
                    <th className="p-4">{t('colPlan', 'Plan')}</th>
                    <th className="p-4">{t('colAmount', 'Amount')}</th>
                    <th className="p-4">{t('colGateway', 'Gateway')}</th>
                    <th className="p-4">{t('colStatus', 'Status')}</th>
                    <th className="p-4">{t('colExpiry', 'Billing Expiry')}</th>
                    <th className="p-4 text-right">{t('colReceipt', 'Receipt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('noTransactionsFound', 'No payment records found matching your query.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="transition hover:bg-white/[0.02]">
                        <td className="p-4 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold" style={{ color: 'var(--color-text)' }}>
                          {tx.planName}
                          <span className="block text-xs font-mono opacity-50" style={{ color: 'var(--color-text-secondary)' }}>{tx.id}</span>
                        </td>
                        <td className="p-4 font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                          {gatewayConfig.currencySymbol}{tx.amount.toFixed(2)} <span className="text-xs font-normal opacity-70" style={{ color: 'var(--color-text-secondary)' }}>{tx.currency}</span>
                        </td>
                        <td className="p-4 uppercase text-xs font-semibold tracking-wider" style={{ color: 'var(--color-text)' }}>
                          {tx.gateway}
                        </td>
                        <td className="p-4">
                          {statusBadge(tx.status)}
                        </td>
                        <td className="p-4 text-xs opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                          {tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(tx)}
                            className="p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs hover:opacity-85"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-85 pt-2" style={{ color: 'var(--color-text-secondary)' }}>
              <span>
                {t('showingPageInfo', 'Showing')} {Math.min(filteredTransactions.length, (historyPage - 1) * historyPageSize + 1)} - {Math.min(filteredTransactions.length, historyPage * historyPageSize)} {t('ofTotal', 'of')} {filteredTransactions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs hover:bg-emerald-500/10"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold" style={{ color: 'var(--color-text)' }}>
                  {historyPage} / {totalHistoryPages}
                </span>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage >= totalHistoryPages}
                  className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs hover:bg-emerald-500/10"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENT METHOD */}
        {activeTab === 'methods' && (
          <div 
            className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <CreditCard className="w-5 h-5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                {t('selectPaymentMethodTitle', 'Choose Preferred Payment Method')}
              </h2>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('paymentMethodAdminNotice', 'Available options are dynamically provisioned according to system administrative settings.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gatewayConfig?.stripe?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('stripe')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'stripe' ? 'shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: selectedMethod === 'stripe' ? 'var(--color-emerald, #10b981)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <CreditCard className="w-6 h-6" style={{ color: 'var(--color-emerald, #10b981)' }} />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: 'var(--color-text)' }}>Stripe / Credit Card</div>
                        <div className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>Visa, Mastercard, AMEX</div>
                      </div>
                    </div>
                    {selectedMethod === 'stripe' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}>
                        <Check className="w-3 h-3 stroke-[3]" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('stripeMethodDesc', 'Fast and secure card processing powered by Stripe encryption.')}
                  </div>
                </div>
              )}

              {gatewayConfig?.paypal?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('paypal')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'paypal' ? 'shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: selectedMethod === 'paypal' ? 'var(--color-emerald, #10b981)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <Sparkles className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: 'var(--color-text)' }}>PayPal Checkout</div>
                        <div className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>PayPal Balance & One-Touch</div>
                      </div>
                    </div>
                    {selectedMethod === 'paypal' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}>
                        <Check className="w-3 h-3 stroke-[3]" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('paypalMethodDesc', 'Pay securely through your connected PayPal account or balance.')}
                  </div>
                </div>
              )}

              {gatewayConfig?.manual?.enabled !== false && (
                <div
                  onClick={() => setSelectedMethod('manual')}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between gap-4 ${
                    selectedMethod === 'manual' ? 'shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: selectedMethod === 'manual' ? 'var(--color-emerald, #10b981)' : 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                        <Building className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: 'var(--color-text)' }}>Manual / Bank Transfer</div>
                        <div className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>Direct Wire & Corporate Invoicing</div>
                      </div>
                    </div>
                    {selectedMethod === 'manual' && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}>
                        <Check className="w-3 h-3 stroke-[3]" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('manualMethodDesc', 'Manual verification for corporate wire transfers and purchase orders.')}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={handleSavePaymentMethod}
                disabled={processing}
                className="px-6 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" style={{ color: '#ffffff' }} />}
                {t('savePaymentMethodBtn', 'Save Payment Method')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Current Active Plan Card */}
            <div 
              className="p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald, #10b981)', color: 'var(--color-emerald, #10b981)' }}>
                    {t('activePlanBadge', 'Current Active Plan')}
                  </span>
                  {activeTransaction?.autoRenew && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {t('autoRenewEnabledBadge', 'Auto-Renew ON')}
                    </span>
                  )}
                  {activeTransaction?.status === 'canceled' && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {t('renewalCancelledBadge', 'Renewal Canceled (Active Until Expiry)')}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black capitalize" style={{ color: 'var(--color-text)' }}>
                  {user?.subscription_plan?.replace(/-/g, ' ') || 'Taster (Free)'}
                </h2>
                <p className="text-xs opacity-70 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                  {activeTransaction?.expiryDate
                    ? `${t('billingPeriodEnds', 'Current period ends on')} ${new Date(activeTransaction.expiryDate).toLocaleDateString()}`
                    : t('freeTierNoExpiry', 'Free Tier — No expiration date')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {activeTransaction && activeTransaction.status !== 'canceled' && (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={processing}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('cancelPlanRenewalBtn', 'Cancel Renewal')}
                  </button>
                )}

                {activeTransaction && activeTransaction.status === 'canceled' && (
                  <button
                    type="button"
                    onClick={handleResumeSubscription}
                    disabled={processing}
                    className="px-4 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('resumePlanRenewalBtn', 'Reactivate Auto-Renew')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('catalog-table');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
                >
                  <ArrowUpRight className="w-4 h-4" style={{ color: '#ffffff' }} />
                  {t('upgradeOrDowngradeBtn', 'Change Plan Tier')}
                </button>
              </div>
            </div>

            {/* Catalog of Subscription Packages synced from /admin/plans */}
            <div 
              id="catalog-table"
              className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    {t('availablePlansTableTitle', 'Subscription Packages Catalog')}
                  </h3>
                  <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('availablePlansTableSubtitle', 'Compare tiers, token allowances, and smoothly upgrade or switch your subscription.')}
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="text"
                    placeholder={t('searchPlansPlaceholder', 'Search packages...')}
                    value={planSearch}
                    onChange={(e) => {
                      setPlanSearch(e.target.value);
                      setPlanPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs focus:outline-hidden"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr 
                      className="border-b text-xs font-bold uppercase tracking-wider opacity-70"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      <th className="p-4">{t('colPackage', 'Package')}</th>
                      <th className="p-4">{t('colTokenAllowance', 'Monthly Token Reward')}</th>
                      <th className="p-4">{t('colDescription', 'Features / Overview')}</th>
                      <th className="p-4">{t('colMonthlyPricing', 'Monthly')}</th>
                      <th className="p-4">{t('colAnnualPricing', 'Annual')}</th>
                      <th className="p-4 text-right">{t('colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {paginatedPlans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                          {t('noPlansFound', 'No subscription plans found matching your search.')}
                        </td>
                      </tr>
                    ) : (
                      paginatedPlans.map((plan) => {
                        const monthlyActive = isCurrentPlan(plan.slug, 'MONTH');
                        const annualActive = isCurrentPlan(plan.slug, 'YEAR');
                        const isFree = plan.slug === 'taster' || plan.isFree || (plan.monthlyPrice === 0 && plan.annualPrice === 0);

                        return (
                          <tr key={plan.id} className="transition hover:bg-white/[0.02]">
                            <td className="p-4 font-bold" style={{ color: 'var(--color-text)' }}>
                              <div className="flex items-center gap-2">
                                <span>{plan.name}</span>
                                {plan.annualBadge && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-amber-500/20 bg-amber-500/10 text-amber-400">
                                    {plan.annualBadge}
                                  </span>
                                )}
                              </div>
                              <span className="block text-xs font-mono opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                                {plan.slug}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>+{(plan.tokenLimit ?? (isFree ? 50 : 500)).toLocaleString()} {tokenIdentity.tokenSymbol}</span>
                                </span>
                                <span className="block text-[10px] opacity-60" style={{ color: 'var(--color-text-secondary)' }}>
                                  1x / month while PAID
                                </span>
                              </div>
                            </td>

                            <td className="p-4 text-xs opacity-75 max-w-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                              <p className="line-clamp-2">{plan.description}</p>
                              {Array.isArray(plan.features) && plan.features.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {plan.features.slice(0, 3).map((feat, fIdx) => (
                                    <span key={fIdx} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10">
                                      <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                      <span>{feat}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="p-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                              {plan.monthlyPrice > 0 
                                ? `${gatewayConfig.currencySymbol}${plan.monthlyPrice.toFixed(2)}/mo` 
                                : t('freePrice', 'Free')}
                            </td>

                            <td className="p-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                              {plan.annualPrice > 0 
                                ? `${gatewayConfig.currencySymbol}${plan.annualPrice.toFixed(2)}/yr` 
                                : t('freePrice', 'Free')}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isFree ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchPlan(plan, 'MONTH')}
                                    disabled={monthlyActive || processing}
                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                      monthlyActive
                                        ? 'opacity-60 cursor-default border'
                                        : 'border hover:bg-emerald-500 hover:text-white'
                                    }`}
                                    style={monthlyActive ? {
                                      backgroundColor: 'var(--color-inner-dark)',
                                      color: 'var(--color-emerald, #10b981)',
                                      borderColor: 'var(--color-emerald, #10b981)'
                                    } : {
                                      borderColor: 'var(--color-emerald, #10b981)',
                                      color: 'var(--color-emerald, #10b981)'
                                    }}
                                  >
                                    {monthlyActive ? t('activeLabel', 'Active') : t('downgradeToFreeBtn', 'Switch to Free')}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSwitchPlan(plan, 'MONTH')}
                                      disabled={monthlyActive || processing}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                        monthlyActive
                                          ? 'opacity-60 cursor-default border'
                                          : 'border hover:bg-emerald-500 hover:text-white'
                                      }`}
                                      style={monthlyActive ? {
                                        backgroundColor: 'var(--color-inner-dark)',
                                        color: 'var(--color-emerald, #10b981)',
                                        borderColor: 'var(--color-emerald, #10b981)'
                                      } : {
                                        borderColor: 'var(--color-emerald, #10b981)',
                                        color: 'var(--color-emerald, #10b981)'
                                      }}
                                    >
                                      {monthlyActive ? t('monthlyActive', 'Monthly Active') : t('chooseMonthlyBtn', 'Monthly')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSwitchPlan(plan, 'YEAR')}
                                      disabled={annualActive || processing}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                        annualActive
                                          ? 'opacity-60 cursor-default text-white'
                                          : 'text-white shadow-md'
                                      }`}
                                      style={{
                                        backgroundColor: 'var(--color-emerald, #10b981)'
                                      }}
                                    >
                                      {annualActive ? t('annualActive', 'Annual Active') : t('chooseAnnualBtn', 'Annual')}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-80 pt-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span>
                  {t('showingPageInfo', 'Showing')} {Math.min(filteredPlans.length, (planPage - 1) * planPageSize + 1)} - {Math.min(filteredPlans.length, planPage * planPageSize)} {t('ofTotal', 'of')} {filteredPlans.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlanPage((p) => Math.max(1, p - 1))}
                    disabled={planPage <= 1}
                    className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-bold" style={{ color: 'var(--color-text)' }}>
                    {planPage} / {totalPlanPages}
                  </span>
                  <button
                    onClick={() => setPlanPage((p) => Math.min(totalPlanPages, p + 1))}
                    disabled={planPage >= totalPlanPages}
                    className="p-2 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:bg-emerald-500/10"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* RECEIPT / INVOICE MODAL */}
      {viewingReceipt && (
        <div 
          onClick={() => setViewingReceipt(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              onClick={() => setViewingReceipt(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg border transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b pb-4 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span className="font-mono text-xs uppercase tracking-wider opacity-60">Payment Receipt</span>
              </div>
              <h3 className="text-xl font-black">{viewingReceipt.planName}</h3>
              <p className="text-xs font-mono opacity-50">Transaction ID: {viewingReceipt.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="opacity-50 block uppercase text-[10px] font-bold">Billing Customer</span>
                <span className="font-semibold block">{viewingReceipt.customerName || user?.name || 'Subscriber'}</span>
                <span className="font-mono opacity-70 block">{viewingReceipt.customerEmail}</span>
              </div>
              <div>
                <span className="opacity-50 block uppercase text-[10px] font-bold">Payment Date</span>
                <span className="font-semibold block">{new Date(viewingReceipt.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="opacity-50 block uppercase text-[10px] font-bold">Payment Gateway</span>
                <span className="font-semibold block uppercase">{viewingReceipt.gateway}</span>
              </div>
              <div>
                <span className="opacity-50 block uppercase text-[10px] font-bold">Payment Status</span>
                <div className="mt-0.5">{statusBadge(viewingReceipt.status)}</div>
              </div>
              <div>
                <span className="opacity-50 block uppercase text-[10px] font-bold">Billing Interval</span>
                <span className="font-semibold block">{viewingReceipt.recurringInterval || 'Monthly'}</span>
              </div>
              <div>
                <span className="opacity-50 block uppercase text-[10px] font-bold">Access Valid Until</span>
                <span className="font-semibold block">
                  {viewingReceipt.expiryDate ? new Date(viewingReceipt.expiryDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-xs uppercase tracking-wider">Total Amount Paid</span>
              <span className="text-xl font-black" style={{ color: 'var(--color-emerald, #10b981)' }}>
                {gatewayConfig.currencySymbol}{viewingReceipt.amount.toFixed(2)} {viewingReceipt.currency}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-5 py-2 rounded-xl text-white text-xs font-bold transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
