'use client';

// Generated / Updated by AI Collaborator
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Coins, Wallet, ArrowDownLeft, ArrowUpRight, Activity, Search, Filter, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, 
  ChefHat, DownloadCloud, DollarSign, Layers, Shield, Plus, ArrowLeft,
  User as UserIcon, CheckCircle, Ban, XCircle, Calendar, CreditCard
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { formatSystemTimestamp } from '@/lib/timezone';

type TabKey = 'tokens' | 'wallet' | 'subscriptions';

interface TokenSettingIdentity {
  tokenName: string;
  tokenSymbol: string;
}

interface UserTokenTransaction {
  id: string;
  amount: number | string;
  balance_after: number | string;
  user_total_tokens?: number | string;
  type: string;
  description: string;
  created_at: string;
}

interface UserWalletTransaction {
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

interface UserSubscriptionTransaction {
  id: string;
  customerName?: string;
  customerEmail?: string;
  planName: string;
  planSlug: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  failureReason?: string;
  testMode?: boolean;
  isRecurring?: boolean;
  recurringInterval?: string;
  autoRenew?: boolean;
  expiryDate?: string;
  createdAt: string;
}

interface ExtendedUser extends User {
  token_balance?: number;
  tokenBalance?: number;
  wallet_balance?: number;
  subscription_plan?: string;
  subscriptionPlan?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥', THB: '฿'
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    if (typeof formatSystemTimestamp === 'function') {
      return formatSystemTimestamp(dateStr);
    }
    return new Date(dateStr).toLocaleString();
  } catch (_) {
    return new Date(dateStr).toLocaleString();
  }
}

const normalizeSubTx = (r: any): UserSubscriptionTransaction => {
  const rawInterval = r.recurring_interval || r.recurringInterval || (String(r.plan_slug || r.planSlug || '').toLowerCase().includes('annual') ? 'YEAR' : 'MONTH');
  return {
    id: String(r.id || ''),
    customerName: r.customer_name || r.customerName || '',
    customerEmail: r.customer_email || r.customerEmail || '',
    planName: r.plan_name || r.planName || 'Subscription Plan',
    planSlug: r.plan_slug || r.planSlug || '',
    amount: Number(r.amount !== undefined ? r.amount : 0),
    currency: r.currency || 'USD',
    gateway: r.gateway || 'stripe',
    status: (r.status || 'succeeded').toLowerCase(),
    failureReason: r.failure_reason || r.failureReason,
    testMode: Boolean(r.test_mode !== undefined ? r.test_mode : r.testMode),
    isRecurring: Boolean(r.is_recurring !== undefined ? r.is_recurring : (r.isRecurring !== undefined ? r.isRecurring : true)),
    recurringInterval: rawInterval,
    autoRenew: Boolean(r.auto_renew !== undefined ? r.auto_renew : (r.autoRenew !== undefined ? r.autoRenew : true)),
    expiryDate: r.expiry_date || r.expiryDate || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString()
  };
};

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langContext = useTranslation();
  const rawT = langContext?.t;

  const t = useCallback((key: string, fallback?: string): string => {
    if (typeof rawT === 'function') {
      const val = rawT(key, fallback);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }, [rawT]);

  // Initial tab resolution (?tab=tokens | ?tab=wallet | ?tab=subscriptions)
  const initialTabParam = searchParams.get('tab')?.toLowerCase();
  const initialTab: TabKey = (initialTabParam === 'wallet' || initialTabParam === 'wallet-transactions')
    ? 'wallet'
    : (initialTabParam === 'subscription' || initialTabParam === 'subscriptions' || initialTabParam === 'subscription-history' || initialTabParam === 'plans')
    ? 'subscriptions'
    : 'tokens';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const activeTabRef = useRef<TabKey>(initialTab);
  activeTabRef.current = activeTab;

  // SSR-deterministic state initialization
  const [mounted, setMounted] = useState<boolean>(false);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const currentUserRef = useRef<ExtendedUser | null>(null);

  // Token identity & Owner token balance
  const [tokenIdentity, setTokenIdentity] = useState<TokenSettingIdentity>({ tokenName: 'Tokens', tokenSymbol: '🪙' });
  const [ownerTokenBalance, setOwnerTokenBalance] = useState<number>(0);

  // Wallet identity & Owner wallet balance
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [walletSymbol, setWalletSymbol] = useState('$');
  const [ownerWalletBalance, setOwnerWalletBalance] = useState<number>(0);

  // User Plan Identity
  const [userPlanName, setUserPlanName] = useState<string>('Taster (Free)');

  // Token Tab State
  const [tokenTransactions, setTokenTransactions] = useState<UserTokenTransaction[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenSearch, setTokenSearch] = useState('');
  const [debouncedTokenSearch, setDebouncedTokenSearch] = useState('');
  const [tokenTypeFilter, setTokenTypeFilter] = useState('all');
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenLimit, setTokenLimit] = useState(10);
  const [tokenTotalPages, setTokenTotalPages] = useState(1);
  const [tokenTotalCount, setTokenTotalCount] = useState(0);
  const [tokenSummaryStats, setTokenSummaryStats] = useState({ totalDeducted: 0, totalGranted: 0, totalEvents: 0 });

  // Wallet Tab State
  const [walletTransactions, setWalletTransactions] = useState<UserWalletTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSearch, setWalletSearch] = useState('');
  const [debouncedWalletSearch, setDebouncedWalletSearch] = useState('');
  const [walletTypeFilter, setWalletTypeFilter] = useState('all');
  const [walletPage, setWalletPage] = useState(1);
  const [walletLimit, setWalletLimit] = useState(10);
  const [walletTotalPages, setWalletTotalPages] = useState(1);
  const [walletTotalCount, setWalletTotalCount] = useState(0);
  const [walletSummaryStats, setWalletSummaryStats] = useState({ totalDeposited: 0, totalSpent: 0, totalEvents: 0 });

  // Subscriptions Tab State
  const [subscriptionTransactions, setSubscriptionTransactions] = useState<UserSubscriptionTransaction[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [debouncedSubscriptionSearch, setDebouncedSubscriptionSearch] = useState('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('all');
  const [subscriptionIntervalFilter, setSubscriptionIntervalFilter] = useState('all');
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionLimit, setSubscriptionLimit] = useState(10);

  // Concurrency Guards
  const isFetchingTokensRef = useRef(false);
  const isFetchingWalletRef = useRef(false);
  const isFetchingSubscriptionRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync tab with URL query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')?.toLowerCase();
    if (tabParam === 'wallet' || tabParam === 'wallet-transactions') {
      setActiveTab('wallet');
    } else if (tabParam === 'subscription' || tabParam === 'subscriptions' || tabParam === 'subscription-history' || tabParam === 'plans') {
      setActiveTab('subscriptions');
    } else if (tabParam === 'token' || tabParam === 'tokens' || tabParam === 'token-transactions') {
      setActiveTab('tokens');
    }
  }, [searchParams]);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTokenSearch(tokenSearch), 300);
    return () => clearTimeout(timer);
  }, [tokenSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWalletSearch(walletSearch), 300);
    return () => clearTimeout(timer);
  }, [walletSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSubscriptionSearch(subscriptionSearch), 300);
    return () => clearTimeout(timer);
  }, [subscriptionSearch]);

  // 1. Fetch Token Data
  const fetchTokenData = useCallback(async (
    pageToLoad = 1,
    limitToUse = 10,
    searchQuery = '',
    filterType = 'all'
  ) => {
    let active = currentUserRef.current || getCurrentUser();
    if (!active?.id && !active?.email && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_user') || localStorage.getItem('zecratary_current_user');
        if (raw) active = JSON.parse(raw);
      } catch (_) {}
      if (!active) {
        initAuthStorage();
        active = getCurrentUser();
      }
    }

    if (!active?.id && !active?.email) return;

    if (isFetchingTokensRef.current) return;
    isFetchingTokensRef.current = true;
    setTokenLoading(true);

    try {
      const params = new URLSearchParams({
        userId: active.id || '',
        email: active.email || '',
        page: String(pageToLoad),
        limit: String(limitToUse),
        search: searchQuery,
        type: filterType
      });

      const res = await fetch(`/api/tokens?${params.toString()}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const liveBalance = (typeof data.balance === 'number')
            ? data.balance
            : (typeof data.tokenBalance === 'number')
            ? data.tokenBalance
            : (typeof data.user_total_tokens === 'number')
            ? data.user_total_tokens
            : (Number(data.balance) || 0);

          setOwnerTokenBalance(liveBalance);

          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('zecratary_user');
              if (raw) {
                const u = JSON.parse(raw);
                u.token_balance = liveBalance;
                u.tokenBalance = liveBalance;
                localStorage.setItem('zecratary_user', JSON.stringify(u));
              }
            } catch (_) {}
          }

          if (data.tokenSymbol || data.tokenName) {
            setTokenIdentity({
              tokenName: data.tokenName || 'Tokens',
              tokenSymbol: data.tokenSymbol || '🪙'
            });
          }

          const rawList = Array.isArray(data.transactions)
            ? data.transactions
            : Array.isArray(data.transactions?.rows)
            ? data.transactions.rows
            : [];

          setTokenTransactions(rawList);

          const parsedCount = typeof data.totalCount === 'number'
            ? data.totalCount
            : parseInt(data.totalCount || '0', 10);
          setTokenTotalCount(parsedCount);

          const parsedPages = typeof data.totalPages === 'number'
            ? data.totalPages
            : Math.max(1, Math.ceil(parsedCount / limitToUse));
          setTokenTotalPages(parsedPages);

          if (data.stats) {
            setTokenSummaryStats({
              totalDeducted: Number(data.stats.totalDeducted || 0),
              totalGranted: Number(data.stats.totalGranted || 0),
              totalEvents: Number(data.stats.totalEvents || parsedCount || 0)
            });
          }
        }
      }
    } catch (_) {}
    finally {
      setTokenLoading(false);
      isFetchingTokensRef.current = false;
    }
  }, []);

  // 2. Fetch Wallet Data
  const fetchWalletData = useCallback(async (
    pageToLoad = 1,
    limitToUse = 10,
    searchQuery = '',
    filterType = 'all'
  ) => {
    let active = currentUserRef.current || getCurrentUser();
    if (!active?.id && !active?.email && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_user') || localStorage.getItem('zecratary_current_user');
        if (raw) active = JSON.parse(raw);
      } catch (_) {}
      if (!active) {
        initAuthStorage();
        active = getCurrentUser();
      }
    }

    if (!active?.id && !active?.email) return;

    if (isFetchingWalletRef.current) return;
    isFetchingWalletRef.current = true;
    setWalletLoading(true);

    try {
      const params = new URLSearchParams({
        userId: active.id || '',
        email: active.email || '',
        page: String(pageToLoad),
        limit: String(limitToUse),
        search: searchQuery,
        type: filterType
      });

      const res = await fetch(`/api/wallet?${params.toString()}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const liveWalletBal = (typeof data.wallet_balance === 'number')
            ? data.wallet_balance
            : (data.user && typeof data.user.wallet_balance !== 'undefined')
            ? parseFloat(data.user.wallet_balance || 0)
            : (parseFloat(data.wallet_balance) || 0);

          setOwnerWalletBalance(liveWalletBal);

          if (data.settings?.currency) {
            setWalletCurrency(data.settings.currency);
            setWalletSymbol(CURRENCY_SYMBOLS[data.settings.currency] || '$');
          }

          const rawList = Array.isArray(data.transactions)
            ? data.transactions
            : Array.isArray(data.transactions?.rows)
            ? data.transactions.rows
            : [];

          setWalletTransactions(rawList);

          const parsedCount = typeof data.totalCount === 'number'
            ? data.totalCount
            : parseInt(data.totalCount || '0', 10);
          setWalletTotalCount(parsedCount);

          const parsedPages = typeof data.totalPages === 'number'
            ? data.totalPages
            : Math.max(1, Math.ceil(parsedCount / limitToUse));
          setWalletTotalPages(parsedPages);

          if (data.stats) {
            setWalletSummaryStats({
              totalDeposited: Number(data.stats.totalDeposited || 0),
              totalSpent: Number(data.stats.totalSpent || 0),
              totalEvents: Number(data.stats.totalEvents || parsedCount || 0)
            });
          }
        }
      }
    } catch (_) {}
    finally {
      setWalletLoading(false);
      isFetchingWalletRef.current = false;
    }
  }, []);

  // 3. Fetch Subscription History Data
  const fetchSubscriptionData = useCallback(async () => {
    let active = currentUserRef.current || getCurrentUser();
    if (!active?.id && !active?.email && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_user') || localStorage.getItem('zecratary_current_user');
        if (raw) active = JSON.parse(raw);
      } catch (_) {}
      if (!active) {
        initAuthStorage();
        active = getCurrentUser();
      }
    }

    if (!active?.id && !active?.email) return;

    if (isFetchingSubscriptionRef.current) return;
    isFetchingSubscriptionRef.current = true;
    setSubscriptionLoading(true);

    try {
      const userEmail = active.email || '';
      const userId = active.id || '';
      
      let res = await fetch(`/api/billing?email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(userId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        res = await fetch(`/api/subscriptions?email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(userId)}&t=${Date.now()}`, { cache: 'no-store' });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.user) {
            const rawPlan = data.user.subscription_plan || data.user.subscriptionPlan || 'taster';
            const formattedPlan = rawPlan.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            setUserPlanName(formattedPlan);
          }

          const rawList = Array.isArray(data.transactions)
            ? data.transactions
            : Array.isArray(data.transactions?.rows)
            ? data.transactions.rows
            : [];

          const normalized = rawList.map(normalizeSubTx);
          setSubscriptionTransactions(normalized);
        }
      }
    } catch (_) {}
    finally {
      setSubscriptionLoading(false);
      isFetchingSubscriptionRef.current = false;
    }
  }, []);

  const fetchTokenRef = useRef(fetchTokenData);
  fetchTokenRef.current = fetchTokenData;
  const fetchWalletRef = useRef(fetchWalletData);
  fetchWalletRef.current = fetchWalletData;
  const fetchSubscriptionRef = useRef(fetchSubscriptionData);
  fetchSubscriptionRef.current = fetchSubscriptionData;

  // 4. Reload Active User Record (Client-Only)
  const reloadActiveUser = useCallback(async () => {
    initAuthStorage();
    let active = getCurrentUser() as ExtendedUser | null;

    if (!active && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_user') || localStorage.getItem('zecratary_current_user');
        if (raw) active = JSON.parse(raw);
      } catch (_) {}
    }

    if (!active && typeof document !== 'undefined') {
      const authKeys = ['zecratary_session', 'zecratary_current_user', 'currentUser'];
      for (const k of authKeys) {
        const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)'));
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(decodeURIComponent(match[1]));
            if (parsed?.email || parsed?.id) {
              active = parsed;
              break;
            }
          } catch (_) {}
        }
      }
    }

    if (!active) {
      router.replace('/login');
      return;
    }

    if (typeof active.token_balance === 'number') {
      setOwnerTokenBalance(active.token_balance);
    } else if (typeof active.tokenBalance === 'number') {
      setOwnerTokenBalance(active.tokenBalance);
    }
    if (typeof active.wallet_balance === 'number') {
      setOwnerWalletBalance(active.wallet_balance);
    }

    const currentPlan = (active.subscription_plan || active.subscriptionPlan || 'taster').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    setUserPlanName(currentPlan);

    currentUserRef.current = active;
    setUser(active);

    fetchTokenRef.current(1, tokenLimit, debouncedTokenSearch, tokenTypeFilter);
    fetchWalletRef.current(1, walletLimit, debouncedWalletSearch, walletTypeFilter);
    fetchSubscriptionRef.current();
  }, [router, tokenLimit, debouncedTokenSearch, tokenTypeFilter, walletLimit, debouncedWalletSearch, walletTypeFilter]);

  const reloadUserRef = useRef(reloadActiveUser);
  reloadUserRef.current = reloadActiveUser;

  // Mount Lifecycle
  useEffect(() => {
    setMounted(true);
    reloadUserRef.current();

    const handleDebouncedSync = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchTokenRef.current(tokenPage, tokenLimit, debouncedTokenSearch, tokenTypeFilter);
        fetchWalletRef.current(walletPage, walletLimit, debouncedWalletSearch, walletTypeFilter);
        fetchSubscriptionRef.current();
      }, 300);
    };

    window.addEventListener('zecratary_tokens_updated', handleDebouncedSync);
    window.addEventListener('zecratary_token_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_plans_updated', handleDebouncedSync);
    window.addEventListener('zecratary_users_updated', handleDebouncedSync);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('zecratary_tokens_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_token_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_plans_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_users_updated', handleDebouncedSync);
    };
  }, [tokenPage, tokenLimit, debouncedTokenSearch, tokenTypeFilter, walletPage, walletLimit, debouncedWalletSearch, walletTypeFilter]);

  // Tab Filtering & Pagination Effects
  useEffect(() => {
    if (mounted && activeTab === 'tokens') {
      fetchTokenRef.current(tokenPage, tokenLimit, debouncedTokenSearch, tokenTypeFilter);
    }
  }, [mounted, activeTab, tokenPage, tokenLimit, debouncedTokenSearch, tokenTypeFilter]);

  useEffect(() => {
    if (mounted && activeTab === 'wallet') {
      fetchWalletRef.current(walletPage, walletLimit, debouncedWalletSearch, walletTypeFilter);
    }
  }, [mounted, activeTab, walletPage, walletLimit, debouncedWalletSearch, walletTypeFilter]);

  useEffect(() => {
    if (mounted && activeTab === 'subscriptions') {
      fetchSubscriptionRef.current();
    }
  }, [mounted, activeTab]);

  // Filtered & Paginated Subscription History
  const filteredSubscriptionTransactions = useMemo(() => {
    const q = debouncedSubscriptionSearch.toLowerCase().trim();
    return subscriptionTransactions.filter((tx) => {
      const matchesSearch = !q ||
        tx.id.toLowerCase().includes(q) ||
        tx.planName.toLowerCase().includes(q) ||
        tx.planSlug.toLowerCase().includes(q) ||
        tx.gateway.toLowerCase().includes(q) ||
        tx.status.toLowerCase().includes(q);

      const s = tx.status.toLowerCase();
      const matchesStatus = subscriptionStatusFilter === 'all' ||
        (subscriptionStatusFilter === 'succeeded' && (s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed')) ||
        (subscriptionStatusFilter === 'canceled' && (s === 'canceled' || s === 'cancelled')) ||
        (subscriptionStatusFilter === 'refunded' && s === 'refunded') ||
        (subscriptionStatusFilter === 'failed' && (s === 'failed' || s === 'declined'));

      const interval = (tx.recurringInterval || '').toLowerCase();
      const matchesInterval = subscriptionIntervalFilter === 'all' ||
        (subscriptionIntervalFilter === 'year' && (interval.includes('year') || interval.includes('annual'))) ||
        (subscriptionIntervalFilter === 'month' && (interval.includes('month') || (!interval.includes('year') && !interval.includes('annual'))));

      return matchesSearch && matchesStatus && matchesInterval;
    });
  }, [subscriptionTransactions, debouncedSubscriptionSearch, subscriptionStatusFilter, subscriptionIntervalFilter]);

  const subTotalCount = filteredSubscriptionTransactions.length;
  const subTotalPages = Math.max(1, Math.ceil(subTotalCount / subscriptionLimit));
  const paginatedSubscriptionTransactions = useMemo(() => {
    const start = (subscriptionPage - 1) * subscriptionLimit;
    return filteredSubscriptionTransactions.slice(start, start + subscriptionLimit);
  }, [filteredSubscriptionTransactions, subscriptionPage, subscriptionLimit]);

  // Subscriptions KPI Stats
  const subSummaryStats = useMemo(() => {
    let totalSpent = 0;
    let activeTx: UserSubscriptionTransaction | null = null;
    const now = Date.now();

    for (const tx of subscriptionTransactions) {
      const s = tx.status.toLowerCase();
      const isPaid = s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed';
      if (isPaid) {
        totalSpent += Number(tx.amount || 0);
      }
      if (!activeTx && (isPaid || s === 'canceled' || s === 'active')) {
        if (!tx.expiryDate || new Date(tx.expiryDate).getTime() > now) {
          activeTx = tx;
        }
      }
    }

    return {
      totalSpent,
      totalEvents: subscriptionTransactions.length,
      activeTx,
      activeExpiryDate: activeTx?.expiryDate,
      isAutoRenew: Boolean(activeTx?.autoRenew && activeTx?.status !== 'canceled')
    };
  }, [subscriptionTransactions]);

  // Badges
  const renderTokenBadge = (type?: string) => {
    const raw = String(type || '').toLowerCase().trim();
    if (raw === 'usage_chef') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
          <ChefHat className="h-3 w-3" /> /chef AI Chat
        </span>
      );
    }
    if (raw.startsWith('usage_import')) {
      const sub = raw.replace('usage_import_', '');
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <DownloadCloud className="h-3 w-3" /> /import ({sub.toUpperCase()})
        </span>
      );
    }
    if (raw === 'package_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <DollarSign className="h-3 w-3" /> Package Purchase
        </span>
      );
    }
    if (raw === 'plan_purchase' || raw === 'plan_monthly_grant') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> Plan Grant
        </span>
      );
    }
    if (raw === 'admin_adjustment' || raw === 'admin_grant') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Shield className="h-3 w-3" /> Admin Adjustment
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Activity className="h-3 w-3" /> {raw ? raw.replace(/_/g, ' ') : 'Event'}
      </span>
    );
  };

  const renderWalletBadge = (type?: string) => {
    const raw = String(type || '').toLowerCase().trim();
    if (raw === 'topup') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowUpRight className="h-3 w-3" /> Deposit Top-Up
        </span>
      );
    }
    if (raw === 'token_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Coins className="h-3 w-3" /> Token Purchase
        </span>
      );
    }
    if (raw === 'plan_purchase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="h-3 w-3" /> Plan Subscription
        </span>
      );
    }
    if (raw === 'admin_adjustment') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Shield className="h-3 w-3" /> Admin Adjustment
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Activity className="h-3 w-3" /> {raw ? raw.replace(/_/g, ' ') : 'Operation'}
      </span>
    );
  };

  const renderSubscriptionStatusBadge = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'succeeded' || s === 'successful' || s === 'paid' || s === 'completed' || s === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="h-3 w-3" /> {t('statusSucceeded', 'Succeeded')}
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <Ban className="h-3 w-3" /> {t('statusCanceled', 'Canceled')}
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <RefreshCw className="h-3 w-3" /> {t('statusRefunded', 'Refunded')}
        </span>
      );
    }
    if (s === 'failed' || s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
          <XCircle className="h-3 w-3" /> {t('statusFailed', 'Failed')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Activity className="h-3 w-3" /> {s || 'Recorded'}
      </span>
    );
  };

  const renderIntervalBadge = (interval?: string) => {
    const raw = String(interval || '').toUpperCase().trim();
    if (raw === 'YEAR' || raw === 'ANNUAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Annual
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
        Monthly
      </span>
    );
  };

  // Pagination Helper
  const getPageNumbers = (curr: number, total: number) => {
    const pages: number[] = [];
    let start = Math.max(1, curr - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // SSR-Safe Loading Guard
  if (!mounted || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" 
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} 
        />
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200 min-h-screen"
      style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header with Live Token, Wallet, and Membership Badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/profile" 
              className="p-1.5 rounded-xl border transition hover:opacity-80 flex items-center justify-center bg-[var(--color-card)] border-[var(--color-border)]"
              title="Back to Profile"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              {t('transactionsTitle', 'Transactions')}
            </h1>
          </div>
          <p className="text-xs opacity-70">
            {t('transactionsSubtitle', 'Audit and track your AI token quota consumption, package purchases, store wallet cash ledgers, and membership subscriptions.')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Plan Pill */}
          <Link
            href="/subscriptions"
            className="border font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xs transition hover:border-purple-500/50"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('activePlanTier', 'Active Plan Tier')}
          >
            <Layers className="h-4 w-4 text-purple-400" />
            <span suppressHydrationWarning className="font-bold text-purple-400 capitalize">
              {userPlanName}
            </span>
          </Link>

          {/* User Live Token Balance Pill */}
          <div 
            className="border font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xs transition"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('userTokenBalance', 'User Token Balance')}
          >
            <Coins className="h-4 w-4 text-amber-500" />
            <span suppressHydrationWarning className="font-mono font-black text-emerald-400">
              {ownerTokenBalance.toLocaleString()}
            </span>
            <span className="text-xs text-amber-500 font-mono font-bold">
              {tokenIdentity.tokenSymbol}
            </span>
          </div>

          {/* User Live Wallet Balance Pill */}
          <div 
            className="border font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xs transition"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title={t('storeWalletBalance', 'Store Wallet Balance')}
          >
            <Wallet className="h-4 w-4 text-[var(--color-primary)]" />
            <span suppressHydrationWarning className="font-mono font-black text-[var(--color-primary)]">
              {walletSymbol}{ownerWalletBalance.toFixed(2)}
            </span>
            <span className="text-[10px] opacity-60 font-mono">
              {walletCurrency}
            </span>
          </div>

          <Link 
            href="/profile" 
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
          >
            <UserIcon className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>{t('profile', 'Account Profile')}</span>
          </Link>
          <Link 
            href="/wallet" 
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs text-white"
            style={{ backgroundColor: 'var(--color-primary)', borderColor: 'transparent' }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('walletTopUp', 'Top Up Wallet')}</span>
          </Link>
        </div>
      </div>

      {/* 3-Tab Segmented Navigator */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200 gap-1.5"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('tokens');
            setTokenPage(1);
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/transactions?tab=tokens');
            }
          }}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'tokens' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-emerald)',
            borderColor: 'var(--color-emerald)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary, #94a3b8)'
          }}
        >
          <Coins className="h-4 w-4 text-amber-500" />
          <span>{t('tokenTransactionsTab', 'Token Transactions')}</span>
          {tokenSummaryStats.totalEvents > 0 && (
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/10 border-[var(--color-border)]">
              {tokenSummaryStats.totalEvents}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('wallet');
            setWalletPage(1);
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/transactions?tab=wallet');
            }
          }}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'wallet' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary, #94a3b8)'
          }}
        >
          <Wallet className="h-4 w-4 text-[var(--color-primary)]" />
          <span>{t('walletTransactionsTab', 'Wallet Transactions')}</span>
          {walletSummaryStats.totalEvents > 0 && (
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-[var(--color-border)]">
              {walletSummaryStats.totalEvents}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('subscriptions');
            setSubscriptionPage(1);
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/transactions?tab=subscriptions');
            }
          }}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'subscriptions' ? {
            backgroundColor: 'var(--color-card)',
            color: '#c084fc',
            borderColor: '#a855f7',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : {
            color: 'var(--color-text-secondary, #94a3b8)'
          }}
        >
          <Layers className="h-4 w-4 text-purple-400" />
          <span>{t('subscriptionTransactionsTab', 'Subscription History')}</span>
          {subscriptionTransactions.length > 0 && (
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-[var(--color-border)]">
              {subscriptionTransactions.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TOKEN TRANSACTIONS AUDIT LEDGER                                   */}
      {/* ========================================================================= */}
      {activeTab === 'tokens' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('userTokenBalance', 'User Token Balance')}</span>
                <Coins className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 flex items-baseline gap-1.5">
                <span suppressHydrationWarning>{ownerTokenBalance.toLocaleString()}</span>
                <span className="text-xs text-amber-500 font-bold">{tokenIdentity.tokenSymbol}</span>
              </div>
              <p className="text-[10px] opacity-60">{t('spendableTokensDesc', 'Active spendable AI tokens for /chef & /import')}</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalDeductions', 'Total Consumed')}</span>
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-red-400">
                <span suppressHydrationWarning>-{tokenSummaryStats.totalDeducted.toLocaleString()}</span> <span className="text-xs text-amber-500">{tokenIdentity.tokenSymbol}</span>
              </div>
              <p className="text-[10px] opacity-60">Debited on AI operations</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalGranted', 'Total Granted / Bought')}</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                <span suppressHydrationWarning>+{tokenSummaryStats.totalGranted.toLocaleString()}</span> <span className="text-xs text-amber-500">{tokenIdentity.tokenSymbol}</span>
              </div>
              <p className="text-[10px] opacity-60">From plans, grants & packages</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalEvents', 'Total Token Events')}</span>
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <div suppressHydrationWarning className="text-2xl font-black font-mono">
                {tokenSummaryStats.totalEvents || tokenTotalCount}
              </div>
              <p className="text-[10px] opacity-60">PostgreSQL token_transactions</p>
            </div>
          </div>

          {/* Filtering and Controls */}
          <div className="border rounded-3xl p-5 shadow-xl space-y-4 bg-[var(--color-card)] border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="h-4 w-4 absolute left-3.5 top-3 opacity-50" />
                <input
                  type="text"
                  value={tokenSearch}
                  onChange={(e) => {
                    setTokenSearch(e.target.value);
                    setTokenPage(1);
                  }}
                  placeholder={t('searchMyTransactionsPlaceholder', 'Search token transactions...')}
                  className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-amber-500 shrink-0" />
                <select
                  value={tokenTypeFilter}
                  onChange={(e) => {
                    setTokenTypeFilter(e.target.value);
                    setTokenPage(1);
                  }}
                  className="w-full sm:w-48 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="all">All Services & Sources</option>
                  <option value="chef">/chef (AI Chat)</option>
                  <option value="import">/import (All Types)</option>
                  <option value="purchase">All Purchases</option>
                  <option value="grant">Monthly Grants</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold whitespace-nowrap opacity-70">Rows:</span>
                <select
                  value={tokenLimit}
                  onChange={(e) => {
                    setTokenLimit(parseInt(e.target.value, 10));
                    setTokenPage(1);
                  }}
                  className="border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => fetchTokenRef.current(tokenPage, tokenLimit, debouncedTokenSearch, tokenTypeFilter)}
                disabled={tokenLoading}
                className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-[var(--color-inner-dark)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${tokenLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
                <span>{t('refreshBtn', 'Refresh')}</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider bg-[var(--color-inner-dark)] border-[var(--color-border)] opacity-70">
                    <th className="p-3.5">{t('serviceOperation', 'Service / Operation')}</th>
                    <th className="p-3.5">{t('amount', 'Amount')}</th>
                    <th className="p-3.5">{t('userTokensRemaining', 'User Tokens / Balance After')}</th>
                    <th className="p-3.5">{t('description', 'Description')}</th>
                    <th className="p-3.5">{t('timestamp', 'Timestamp')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {tokenLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-bold opacity-70">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                          <span>Loading token transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : tokenTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-semibold opacity-50">
                        No token transactions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    tokenTransactions.map((tx) => {
                      const numAmount = Number(tx.amount || 0);
                      const isNeg = numAmount < 0;
                      const numBalanceAfter = Number(tx.balance_after || 0);

                      return (
                        <tr key={tx.id} className="hover:bg-slate-500/5 transition font-medium">
                          <td className="p-3.5">{renderTokenBadge(tx.type)}</td>
                          <td className="p-3.5">
                            <span className={`font-mono font-black text-xs ${isNeg ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isNeg ? '' : '+'}{numAmount.toLocaleString()} {tokenIdentity.tokenSymbol}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-xs font-bold">
                            <div className="flex items-center gap-1">
                              <Coins className="h-3.5 w-3.5 text-amber-500" />
                              <span>{numBalanceAfter.toLocaleString()}</span>
                              <span className="text-amber-500 text-[11px]">{tokenIdentity.tokenSymbol}</span>
                            </div>
                          </td>
                          <td className="p-3.5 max-w-xs truncate text-[11px] opacity-80" title={tx.description}>
                            {tx.description || '-'}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] whitespace-nowrap opacity-60">
                            <span suppressHydrationWarning>{formatDate(tx.created_at)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs">
              <span className="opacity-70">
                Showing <strong>{tokenTotalCount > 0 ? (tokenPage - 1) * tokenLimit + 1 : 0}</strong> - <strong>{Math.min(tokenPage * tokenLimit, tokenTotalCount)}</strong> of <strong>{tokenTotalCount}</strong> transactions
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={tokenPage <= 1 || tokenLoading}
                  onClick={() => setTokenPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={tokenPage <= 1 || tokenLoading}
                  onClick={() => setTokenPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers(tokenPage, tokenTotalPages).map(num => (
                  <button
                    key={num}
                    onClick={() => setTokenPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border cursor-pointer"
                    style={tokenPage === num ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' } : { backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  disabled={tokenPage >= tokenTotalPages || tokenLoading}
                  onClick={() => setTokenPage(p => Math.min(tokenTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  disabled={tokenPage >= tokenTotalPages || tokenLoading}
                  onClick={() => setTokenPage(tokenTotalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: WALLET TRANSACTIONS AUDIT LEDGER                                  */}
      {/* ========================================================================= */}
      {activeTab === 'wallet' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('storeWalletBalance', 'Store Wallet Balance')}</span>
                <Wallet className="h-4 w-4 text-[var(--color-primary)]" />
              </div>
              <div className="text-2xl font-black font-mono text-[var(--color-primary)]">
                <span suppressHydrationWarning>{walletSymbol}{ownerWalletBalance.toFixed(2)}</span> <span className="text-xs font-bold opacity-60 font-mono">{walletCurrency}</span>
              </div>
              <p className="text-[10px] opacity-60">Spendable for token bundles & plans</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalDeposited', 'Total Deposited')}</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                <span suppressHydrationWarning>+{walletSymbol}{walletSummaryStats.totalDeposited.toFixed(2)}</span>
              </div>
              <p className="text-[10px] opacity-60">Settled via Stripe, PayPal & manual</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalSpent', 'Total Spent / Debited')}</span>
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-red-400">
                <span suppressHydrationWarning>-{walletSymbol}{walletSummaryStats.totalSpent.toFixed(2)}</span>
              </div>
              <p className="text-[10px] opacity-60">Used for token packages & plans</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalWalletEvents', 'Total Wallet Events')}</span>
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <div suppressHydrationWarning className="text-2xl font-black font-mono">
                {walletSummaryStats.totalEvents || walletTotalCount}
              </div>
              <p className="text-[10px] opacity-60">PostgreSQL wallet_transactions</p>
            </div>
          </div>

          {/* Filtering and Controls */}
          <div className="border rounded-3xl p-5 shadow-xl space-y-4 bg-[var(--color-card)] border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="h-4 w-4 absolute left-3.5 top-3 opacity-50" />
                <input
                  type="text"
                  value={walletSearch}
                  onChange={(e) => {
                    setWalletSearch(e.target.value);
                    setWalletPage(1);
                  }}
                  placeholder={t('searchWalletPlaceholder', 'Search by memo, gateway ID or description...')}
                  className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                <select
                  value={walletTypeFilter}
                  onChange={(e) => {
                    setWalletTypeFilter(e.target.value);
                    setWalletPage(1);
                  }}
                  className="w-full sm:w-48 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="all">All Wallet Operations</option>
                  <option value="topup">Deposits & Top-Ups</option>
                  <option value="token_purchase">Token Package Purchases</option>
                  <option value="plan_purchase">Plan Subscriptions</option>
                  <option value="admin_adjustment">Admin Adjustments</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold whitespace-nowrap opacity-70">Rows:</span>
                <select
                  value={walletLimit}
                  onChange={(e) => {
                    setWalletLimit(parseInt(e.target.value, 10));
                    setWalletPage(1);
                  }}
                  className="border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/wallet"
                  className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-white shadow-xs"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('topUp', 'Top Up')}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => fetchWalletRef.current(walletPage, walletLimit, debouncedWalletSearch, walletTypeFilter)}
                  disabled={walletLoading}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-[var(--color-inner-dark)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${walletLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
                  <span>{t('refreshBtn', 'Refresh')}</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider bg-[var(--color-inner-dark)] border-[var(--color-border)] opacity-70">
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Balance After</th>
                    <th className="p-3.5">Gateway</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {walletLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-bold opacity-70">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                          <span>Loading wallet ledger...</span>
                        </div>
                      </td>
                    </tr>
                  ) : walletTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-semibold opacity-50">
                        No wallet transactions recorded matching your search.
                      </td>
                    </tr>
                  ) : (
                    walletTransactions.map((tx) => {
                      const numAmount = Number(tx.amount || 0);
                      const isNeg = numAmount < 0;
                      const numBalanceAfter = parseFloat(String(tx.balance_after || 0));

                      return (
                        <tr key={tx.id} className="hover:bg-slate-500/5 transition font-medium">
                          <td className="p-3.5">{renderWalletBadge(tx.type)}</td>
                          <td className="p-3.5">
                            <span className={`font-mono font-black text-xs ${isNeg ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isNeg ? '' : '+'}{walletSymbol}{Math.abs(numAmount).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-xs font-bold">
                            {walletSymbol}{numBalanceAfter.toFixed(2)}
                          </td>
                          <td className="p-3.5">
                            <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-md border bg-[var(--color-inner-dark)] border-[var(--color-border)]">
                              {tx.gateway || 'manual'}
                            </span>
                          </td>
                          <td className="p-3.5 max-w-xs truncate text-[11px] opacity-80" title={tx.description}>
                            {tx.description || '-'}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] whitespace-nowrap opacity-60">
                            <span suppressHydrationWarning>{formatDate(tx.created_at)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs">
              <span className="opacity-70">
                Showing <strong>{walletTotalCount > 0 ? (walletPage - 1) * walletLimit + 1 : 0}</strong> - <strong>{Math.min(walletPage * walletLimit, walletTotalCount)}</strong> of <strong>{walletTotalCount}</strong> transactions
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={walletPage <= 1 || walletLoading}
                  onClick={() => setWalletPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={walletPage <= 1 || walletLoading}
                  onClick={() => setWalletPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers(walletPage, walletTotalPages).map(num => (
                  <button
                    key={num}
                    onClick={() => setWalletPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border cursor-pointer"
                    style={walletPage === num ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' } : { backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  disabled={walletPage >= walletTotalPages || walletLoading}
                  onClick={() => setWalletPage(p => Math.min(walletTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  disabled={walletPage >= walletTotalPages || walletLoading}
                  onClick={() => setWalletPage(walletTotalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: SUBSCRIPTION HISTORY AUDIT LEDGER                                 */}
      {/* ========================================================================= */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('activePlanTier', 'Active Plan Tier')}</span>
                <Layers className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-xl font-black capitalize text-purple-400 truncate">
                <span suppressHydrationWarning>{userPlanName}</span>
              </div>
              <p className="text-[10px] opacity-60">
                {subSummaryStats.activeExpiryDate 
                  ? `Renews/Expires: ${formatDate(subSummaryStats.activeExpiryDate)}`
                  : 'Standard tier features'}
              </p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalSubPayments', 'Total Billed')}</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                <span suppressHydrationWarning>${subSummaryStats.totalSpent.toFixed(2)}</span> <span className="text-xs font-bold opacity-60 font-mono">USD</span>
              </div>
              <p className="text-[10px] opacity-60">Settled via Stripe, PayPal & Wallet</p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('membershipStanding', 'Renewal Standing')}</span>
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-xl font-black flex items-center gap-1.5">
                {subSummaryStats.isAutoRenew ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Auto-Renew ON
                  </span>
                ) : (
                  <span className="text-orange-400 flex items-center gap-1">
                    <Ban className="h-4 w-4" /> Canceled / Inactive
                  </span>
                )}
              </div>
              <p className="text-[10px] opacity-60">
                {subSummaryStats.isAutoRenew ? 'Recurring membership active' : 'Plan reverts to Free on expiry'}
              </p>
            </div>

            <div className="border rounded-2xl p-4 shadow-md space-y-1 bg-[var(--color-card)] border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>{t('totalSubInvoices', 'Total Plan Invoices')}</span>
                <Activity className="h-4 w-4 text-amber-400" />
              </div>
              <div suppressHydrationWarning className="text-2xl font-black font-mono">
                {subSummaryStats.totalEvents}
              </div>
              <p className="text-[10px] opacity-60">PostgreSQL payment_transactions</p>
            </div>
          </div>

          {/* Filtering and Controls */}
          <div className="border rounded-3xl p-5 shadow-xl space-y-4 bg-[var(--color-card)] border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="h-4 w-4 absolute left-3.5 top-3 opacity-50" />
                <input
                  type="text"
                  value={subscriptionSearch}
                  onChange={(e) => {
                    setSubscriptionSearch(e.target.value);
                    setSubscriptionPage(1);
                  }}
                  placeholder={t('searchSubscriptionsPlaceholder', 'Search by plan name, ID, or gateway...')}
                  className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-purple-400 shrink-0" />
                <select
                  value={subscriptionStatusFilter}
                  onChange={(e) => {
                    setSubscriptionStatusFilter(e.target.value);
                    setSubscriptionPage(1);
                  }}
                  className="w-full sm:w-40 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="all">All Statuses</option>
                  <option value="succeeded">Succeeded / Paid</option>
                  <option value="canceled">Canceled</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={subscriptionIntervalFilter}
                  onChange={(e) => {
                    setSubscriptionIntervalFilter(e.target.value);
                    setSubscriptionPage(1);
                  }}
                  className="w-full sm:w-32 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="all">All Cycles</option>
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold whitespace-nowrap opacity-70">Rows:</span>
                <select
                  value={subscriptionLimit}
                  onChange={(e) => {
                    setSubscriptionLimit(parseInt(e.target.value, 10));
                    setSubscriptionPage(1);
                  }}
                  className="border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/subscriptions"
                  className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-white shadow-xs shrink-0"
                  style={{ backgroundColor: '#a855f7' }}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{t('manageSubscriptions', 'Manage Plans')}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => fetchSubscriptionRef.current()}
                  disabled={subscriptionLoading}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-[var(--color-inner-dark)] border-[var(--color-border)] hover:border-purple-500/50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${subscriptionLoading ? 'animate-spin' : ''}`} style={{ color: '#a855f7' }} />
                  <span>{t('refreshBtn', 'Refresh')}</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider bg-[var(--color-inner-dark)] border-[var(--color-border)] opacity-70">
                    <th className="p-3.5">{t('colPlan', 'Plan & Reference')}</th>
                    <th className="p-3.5">{t('colInterval', 'Interval')}</th>
                    <th className="p-3.5">{t('colAmount', 'Amount')}</th>
                    <th className="p-3.5">{t('colGateway', 'Gateway')}</th>
                    <th className="p-3.5">{t('colStatus', 'Status')}</th>
                    <th className="p-3.5">{t('colAutoRenew', 'Auto-Renew')}</th>
                    <th className="p-3.5">{t('colExpiry', 'Billing Expiry')}</th>
                    <th className="p-3.5">{t('colDate', 'Timestamp')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {subscriptionLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs font-bold opacity-70">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                          <span>Loading subscription transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSubscriptionTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs font-semibold opacity-50">
                        No subscription transactions recorded matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedSubscriptionTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-500/5 transition font-medium">
                        <td className="p-3.5">
                          <div className="font-bold flex items-center gap-1.5 text-xs">
                            <Layers className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span>{tx.planName}</span>
                          </div>
                          <span className="font-mono text-[10px] opacity-50 block truncate max-w-[140px]" title={tx.id}>
                            {tx.id}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {renderIntervalBadge(tx.recurringInterval)}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-black text-xs text-emerald-400">
                            {CURRENCY_SYMBOLS[tx.currency] || '$'}{Number(tx.amount || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] opacity-60 ml-1 font-mono uppercase">{tx.currency}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-md border bg-[var(--color-inner-dark)] border-[var(--color-border)]">
                            {tx.gateway || 'stripe'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {renderSubscriptionStatusBadge(tx.status)}
                        </td>
                        <td className="p-3.5">
                          {tx.autoRenew && tx.status !== 'canceled' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle className="h-3 w-3" /> ON
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-50">
                              <Ban className="h-3 w-3 text-orange-400" /> OFF
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] whitespace-nowrap opacity-75">
                          <span suppressHydrationWarning>{tx.expiryDate ? formatDate(tx.expiryDate) : '—'}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] whitespace-nowrap opacity-60">
                          <span suppressHydrationWarning>{formatDate(tx.createdAt)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs">
              <span className="opacity-70">
                Showing <strong>{subTotalCount > 0 ? (subscriptionPage - 1) * subscriptionLimit + 1 : 0}</strong> - <strong>{Math.min(subscriptionPage * subscriptionLimit, subTotalCount)}</strong> of <strong>{subTotalCount}</strong> subscription transactions
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={subscriptionPage <= 1 || subscriptionLoading}
                  onClick={() => setSubscriptionPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={subscriptionPage <= 1 || subscriptionLoading}
                  onClick={() => setSubscriptionPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers(subscriptionPage, subTotalPages).map(num => (
                  <button
                    key={num}
                    onClick={() => setSubscriptionPage(num)}
                    className="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border cursor-pointer"
                    style={subscriptionPage === num ? { backgroundColor: '#a855f7', borderColor: '#a855f7', color: '#fff' } : { backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    {num}
                  </button>
                ))}

                <button
                  disabled={subscriptionPage >= subTotalPages || subscriptionLoading}
                  onClick={() => setSubscriptionPage(p => Math.min(subTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  disabled={subscriptionPage >= subTotalPages || subscriptionLoading}
                  onClick={() => setSubscriptionPage(subTotalPages)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer bg-[var(--color-inner-dark)] border-[var(--color-border)]"
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
