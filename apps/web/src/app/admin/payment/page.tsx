// Generated / Updated by AI Collaborator
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Search, ArrowDownLeft, XCircle, 
  Check, Eye, EyeOff, Globe, Zap, History, Sliders, Filter,
  PlusCircle, X, User as UserIcon, Activity, Calendar,
  Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ShieldAlert, Ban, ArrowUpRight, AlertTriangle, Repeat, RotateCcw,
  ShieldCheck, CheckCheck, Columns3, Coins
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

interface PaymentTransaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug?: string;
  amount: number;
  currency: string;
  gateway: 'stripe' | 'paypal' | 'manual';
  status: 'succeeded' | 'failed' | 'refunded' | 'pending' | 'canceled';
  failureReason?: string;
  testMode?: boolean;
  createdAt: string;
  expiryDate?: string;
  isRecurring?: boolean;
  recurringInterval?: 'MONTH' | 'YEAR';
  autoRenew?: boolean;
  gatewayTransactionId?: string;
  confirmedAmount?: number;
  confirmedAt?: string;
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
  tokenLimit?: number;
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
  { code: 'THB', label: 'THB - Thai Baht (฿)', symbol: '฿' },
];

const DEFAULT_COLUMNS = {
  customer: true,
  plan: true,
  amount: true,
  status: true,
  recurring: true,
  date: true,
  expiryDate: true,
  actions: true,
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

const parseAmount = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const isSucceeded = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'succeeded' || s === 'succeded' || s === 'success' || s === 'paid' || s === 'completed';
};

const isRefunded = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'refunded' || s === 'refund';
};

const isCanceled = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'canceled' || s === 'cancelled';
};

const isFailed = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'failed' || s === 'declined' || s === 'fail' || s === 'error';
};

const isPending = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'pending' || s === 'processing';
};

const calculateDefaultExpiry = (startDateStr: string, interval?: string): string => {
  if (!interval) return '';
  const date = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(date.getTime())) return '';
  if (interval === 'MONTH') {
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  }
  if (interval === 'YEAR') {
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }
  return '';
};

const normalizeTransaction = (raw: any, defaultCurrency: string): PaymentTransaction => {
  const rawRecurring = raw.isRecurring !== undefined ? raw.isRecurring : raw.is_recurring;
  const isRecurring = rawRecurring !== undefined 
    ? (rawRecurring === true || rawRecurring === 'true' || rawRecurring === 't' || rawRecurring === 1 || rawRecurring === '1')
    : true;

  const rawAutoRenew = raw.autoRenew !== undefined ? raw.autoRenew : raw.auto_renew;
  const autoRenew = rawAutoRenew !== undefined 
    ? (rawAutoRenew === true || rawAutoRenew === 'true' || rawAutoRenew === 't' || rawAutoRenew === 1 || rawAutoRenew === '1')
    : isRecurring;

  return {
    id: String(raw.id || 'tx_' + Math.random().toString(36).substring(2, 8)),
    customerName: String(raw.customerName || raw.customer_name || 'Customer'),
    customerEmail: String(raw.customerEmail || raw.customer_email || '').toLowerCase().trim(),
    planName: String(raw.planName || raw.plan_name || 'Plan'),
    planSlug: sanitizeSinglePlan(raw.planSlug || raw.plan_slug || ''),
    amount: parseAmount(raw.amount),
    currency: String(raw.currency || defaultCurrency || 'USD'),
    gateway: (raw.gateway || 'stripe') as any,
    status: (raw.status || 'succeeded') as any,
    failureReason: raw.failureReason || raw.failure_reason || undefined,
    testMode: Boolean(raw.testMode !== undefined ? raw.testMode : raw.test_mode),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    expiryDate: raw.expiryDate || raw.expiry_date || undefined,
    isRecurring,
    recurringInterval: raw.recurringInterval || raw.recurring_interval || (String(raw.planSlug || raw.plan_slug || '').includes('annual') ? 'YEAR' : 'MONTH'),
    autoRenew,
    gatewayTransactionId: raw.gatewayTransactionId || raw.gateway_transaction_id || raw.transaction_id || undefined,
    confirmedAmount: raw.confirmedAmount !== undefined ? parseAmount(raw.confirmedAmount) : (raw.confirmed_amount !== undefined ? parseAmount(raw.confirmed_amount) : undefined),
    confirmedAt: raw.confirmedAt || raw.confirmed_at || undefined,
  };
};

export default function AdminPaymentPage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);
  const version = langContext?.version;

  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [refundingTxId, setRefundingTxId] = useState<string | null>(null);
  const [togglingTxId, setTogglingTxId] = useState<string | null>(null);

  // Table Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_COLUMNS);
  const [showColumnPopup, setShowColumnPopup] = useState<boolean>(false);
  const columnPopupRef = useRef<HTMLDivElement>(null);

  // Selection state
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'failed' | 'refunded' | 'pending' | 'canceled'>('all');
  const [gatewayFilter, setGatewayFilter] = useState<'all' | 'stripe' | 'paypal' | 'manual'>('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Gateway Settings State
  const [config, setConfig] = useState<GatewayConfig>({
    activeGateway: 'stripe',
    currency: 'USD',
    testMode: true,
    stripeConnected: false,
    stripe: {
      enabled: true,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
    },
    paypal: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      webhookId: '',
      environment: 'sandbox',
    },
  });

  const transactionsRef = useRef<PaymentTransaction[]>([]);
  const configRef = useRef<GatewayConfig>(config);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Load Saved Column Visibility Preferences
  useEffect(() => {
    try {
      const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('zecratary_payment_columns') : null;
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        setVisibleColumns((prev) => ({ ...prev, ...parsed }));
      }
      fetchServerAdminSettings().then((serverData) => {
        const remoteCols = serverData?.settings?.paymentTableColumns || serverData?.paymentTableColumns;
        if (remoteCols && typeof remoteCols === 'object') {
          setVisibleColumns((prev) => ({ ...prev, ...remoteCols }));
          if (typeof window !== 'undefined') {
            localStorage.setItem('zecratary_payment_columns', JSON.stringify(remoteCols));
          }
        }
      }).catch(() => {});
    } catch (_) {}
  }, []);

  // Click outside to dismiss column popup
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (columnPopupRef.current && !columnPopupRef.current.contains(event.target as Node)) {
        setShowColumnPopup(false);
      }
    };
    if (showColumnPopup) {
      document.addEventListener('mousedown', handlePointerDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showColumnPopup]);

  const toggleColumnVisibility = async (colKey: string) => {
    const nextState = {
      ...visibleColumns,
      [colKey]: !visibleColumns[colKey]
    };
    if (!Object.values(nextState).some(Boolean)) return;

    setVisibleColumns(nextState);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_payment_columns', JSON.stringify(nextState));
      }
      await persistServerAdminSettings({ paymentTableColumns: nextState });
    } catch (_) {}
  };

  const resetColumnVisibility = async () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_payment_columns', JSON.stringify(DEFAULT_COLUMNS));
      }
      await persistServerAdminSettings({ paymentTableColumns: DEFAULT_COLUMNS });
    } catch (_) {}
  };

  const activeColumnCount = useMemo(() => {
    let count = 1;
    if (visibleColumns.customer) count++;
    if (visibleColumns.plan) count++;
    if (visibleColumns.amount) count++;
    if (visibleColumns.status) count++;
    if (visibleColumns.recurring) count++;
    if (visibleColumns.date) count++;
    if (visibleColumns.expiryDate) count++;
    if (visibleColumns.actions) count++;
    return count;
  }, [visibleColumns]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentGateway, setPaymentGateway] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [paymentStatus, setPaymentStatus] = useState<'succeeded' | 'failed' | 'refunded' | 'pending' | 'canceled'>('succeeded');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentExpiryDate, setPaymentExpiryDate] = useState<string>('');
  const [isPaymentRecurring, setIsPaymentRecurring] = useState<boolean>(true);
  const [failureReason, setFailureReason] = useState('');
  const [syncUserPlan, setSyncUserPlan] = useState(true);
  const [modalError, setModalError] = useState('');
  const [addGatewayTxId, setAddGatewayTxId] = useState('');
  const [addGatewayConfirmed, setAddGatewayConfirmed] = useState(true);

  // Edit Modal States
  const [editingTx, setEditingTx] = useState<PaymentTransaction | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editPlanSlug, setEditPlanSlug] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editGateway, setEditGateway] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [editStatus, setEditStatus] = useState<'succeeded' | 'failed' | 'refunded' | 'pending' | 'canceled'>('succeeded');
  const [editDate, setEditDate] = useState<string>('');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [editIsRecurring, setEditIsRecurring] = useState<boolean>(true);
  const [editFailureReason, setEditFailureReason] = useState('');
  const [editSyncUserPlan, setEditSyncUserPlan] = useState(false);
  const [editGatewayTxId, setEditGatewayTxId] = useState('');
  const [editGatewayConfirmed, setEditGatewayConfirmed] = useState(false);

  // Confirm Gateway Modal States
  const [confirmingTx, setConfirmingTx] = useState<PaymentTransaction | null>(null);
  const [confirmGatewayTxId, setConfirmGatewayTxId] = useState('');
  const [confirmAmount, setConfirmAmount] = useState<number>(0);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [confirmSyncPlan, setConfirmSyncPlan] = useState(true);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Clean, Non-Looping Theme Synchronization
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
    window.addEventListener('storage', handleModeChange);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleModeChange);
      window.removeEventListener('zecratary_theme_changed', handleModeChange);
      window.removeEventListener('storage', handleModeChange);
    };
  }, [handleModeChange]);

  const getCurrencySymbol = useCallback((currencyCode?: string) => {
    const code = currencyCode || configRef.current?.currency || 'USD';
    const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return found ? found.symbol : '$';
  }, []);

  const activeCurrencySymbol = useMemo(() => {
    return getCurrencySymbol(config.currency);
  }, [config.currency, getCurrencySymbol]);

  const allowedGateways = useMemo(() => {
    const list: Array<{ id: 'stripe' | 'paypal' | 'manual'; label: string }> = [];
    const stripeActive = config.activeGateway === 'stripe' || config.activeGateway === 'both' || config.stripe.enabled;
    const paypalActive = config.activeGateway === 'paypal' || config.activeGateway === 'both' || config.paypal.enabled;

    if (stripeActive) list.push({ id: 'stripe', label: `Stripe ${config.testMode ? `(${t('sandboxTest', 'Test Mode')})` : `(${t('liveProduction', 'Live')})`}` });
    if (paypalActive) list.push({ id: 'paypal', label: `PayPal ${config.paypal.environment === 'sandbox' ? '(Sandbox)' : '(Live)'}` });
    list.push({ id: 'manual', label: t('gatewayManual', 'Manual') });
    return list;
  }, [config, t]);

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Synchronize ONLY Plans with actual price (> 0) from /admin/plans
  const loadPlans = useCallback(async (currencyOverride?: string) => {
    let parsedPlans: PlanOption[] = [];
    const symbol = getCurrencySymbol(currencyOverride || configRef.current.currency);
    let rawPlansList: any[] = [];

    try {
      const res = await fetch('/api/admin/plans?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : (data.configs || data.plans || data.packages || data.subscriptionPlans || data.data);
        if (Array.isArray(list) && list.length > 0) {
          rawPlansList = [...list];
        }
      }
    } catch (_) {}

    if (rawPlansList.length > 0) {
      rawPlansList.forEach((cfg: any) => {
        if (!cfg) return;
        const rawSlug = String(cfg.slug || cfg.id || '').toLowerCase().trim();
        const baseSlug = rawSlug.replace(/-(monthly|annual|free)$/, '');
        const rawName = String(cfg.name || baseSlug || '').trim();
        const baseName = rawName.replace(/\s*\((Monthly|Annual|Free)\)/i, '').trim();

        // Check if plan is explicitly free or has no positive pricing
        const isFreeTier = Boolean(
          cfg.isFree === true || cfg.is_free === true || cfg.free === true ||
          baseSlug === 'taster' || baseSlug === 'free'
        );
        if (isFreeTier) return; // Do NOT add free plans into payment recording dropdown

        const tokenLimit = cfg.tokenLimit !== undefined 
          ? Number(cfg.tokenLimit) 
          : (cfg.token_limit !== undefined ? Number(cfg.token_limit) : 500);

        const monthlyPrice = Number(cfg.monthlyPriceDollars ?? cfg.monthly_price_dollars ?? (cfg.interval === 'MONTH' ? cfg.price : 0) ?? 0);
        const annualPrice = Number(cfg.annualPriceDollars ?? cfg.annual_price_dollars ?? (cfg.interval === 'YEAR' ? cfg.price : 0) ?? 0);

        // ONLY add Monthly if explicitly priced > 0
        if (monthlyPrice > 0) {
          parsedPlans.push({
            id: cfg.monthlyPlanId || `${cfg.id || baseSlug}-monthly`,
            name: `${baseName} (Monthly)`,
            slug: `${baseSlug}-monthly`,
            priceFormatted: `${symbol}${monthlyPrice.toFixed(2)}/mo`,
            priceDollars: monthlyPrice,
            interval: 'MONTH',
            isFree: false,
            tokenLimit
          });
        }

        // ONLY add Annual if explicitly priced > 0
        if (annualPrice > 0) {
          parsedPlans.push({
            id: cfg.annualPlanId || `${cfg.id || baseSlug}-annual`,
            name: `${baseName} (Annual)`,
            slug: `${baseSlug}-annual`,
            priceFormatted: `${symbol}${annualPrice.toFixed(2)}/yr`,
            priceDollars: annualPrice,
            interval: 'YEAR',
            isFree: false,
            tokenLimit
          });
        }
      });
    }

    // Filter strictly for options with valid positive price
    const validPricedPlans = parsedPlans.filter((p) => p.priceDollars > 0 && !p.isFree);

    const uniquePlans: PlanOption[] = [];
    const seenSlugs = new Set<string>();
    for (const p of validPricedPlans) {
      if (!seenSlugs.has(p.slug)) {
        seenSlugs.add(p.slug);
        uniquePlans.push(p);
      }
    }

    const fallbackList: PlanOption[] = uniquePlans.length > 0 ? uniquePlans : [
      { id: 'nutrition-pro-monthly', name: 'Nutrition Pro (Monthly)', slug: 'nutrition-pro-monthly', priceFormatted: `${symbol}8.99/mo`, priceDollars: 8.99, interval: 'MONTH', tokenLimit: 500 },
      { id: 'nutrition-pro-annual', name: 'Nutrition Pro (Annual)', slug: 'nutrition-pro-annual', priceFormatted: `${symbol}59.99/yr`, priceDollars: 59.99, interval: 'YEAR', tokenLimit: 500 },
    ];

    setAvailablePlans(fallbackList);
  }, [getCurrencySymbol]);

  const validateAndSyncUserPlans = useCallback((usersList: AppUser[], txList: PaymentTransaction[]): AppUser[] => {
    const now = new Date();
    return usersList.map((u) => {
      const currentPlan = sanitizeSinglePlan(u.subscriptionPlan);
      if (currentPlan === 'taster' || currentPlan === 'free') {
        return { ...u, subscriptionPlan: 'taster' };
      }

      const uEmail = (u.email || '').toLowerCase().trim();
      const currentBase = currentPlan.replace(/-(monthly|annual|free)$/, '');

      const userTx = txList.find((tx) => {
        const txEmail = (tx.customerEmail || '').toLowerCase().trim();
        const matchesEmail = txEmail === uEmail && txEmail !== '';
        
        const statusLower = String(tx.status || '').toLowerCase().trim();
        const isValidStatus = isSucceeded(statusLower) || isCanceled(statusLower);
        const notExpired = !tx.expiryDate || new Date(tx.expiryDate).getTime() > now.getTime();
        
        const txSlug = sanitizeSinglePlan((tx.planSlug || tx.plan_slug || 'taster'));
        const txBase = txSlug.replace(/-(monthly|annual|free)$/, '');

        const matchesPlan = (txSlug === currentPlan) || 
                            (txBase === currentBase && currentBase !== '') ||
                            (tx.planName && (tx.planName || tx.plan_name || '').toLowerCase().includes(currentBase.replace(/-/g, ' ')));
        return matchesEmail && isValidStatus && matchesPlan && notExpired;
      });

      if (!userTx) {
        return { ...u, subscriptionPlan: 'taster' };
      }

      return u;
    });
  }, []);

  const loadUsers = useCallback(async (currentTxs?: PaymentTransaction[]) => {
    try {
      const res = await fetch('/api/admin/users?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const normalized = data.users.map((u: any) => ({
            ...u,
            subscriptionPlan: sanitizeSinglePlan(u.subscriptionPlan)
          }));
          const targetTxList = currentTxs || transactionsRef.current;
          const validated = validateAndSyncUserPlans(normalized, targetTxList);
          setRegisteredUsers(validated);
          setSelectedUserId((prev) => {
            if (!prev && validated.length > 0) {
              return validated[0].id;
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load users from server:', e);
    }
  }, [validateAndSyncUserPlans]);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    purgeLegacyBrowserAdminStorage();
    try {
      const res = await fetch('/api/admin/payment?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          let normalizedList: PaymentTransaction[] = [];
          const curr = configRef.current.currency || 'USD';
          if (Array.isArray(data.transactions)) {
            normalizedList = data.transactions.map((tItem: any) => normalizeTransaction(tItem, curr));
            if (JSON.stringify(transactionsRef.current) !== JSON.stringify(normalizedList)) {
              transactionsRef.current = normalizedList;
              setTransactions(normalizedList);
            }
          }
          if (data.settings) {
            const merged = { ...configRef.current, ...data.settings };
            if (JSON.stringify(configRef.current) !== JSON.stringify(merged)) {
              configRef.current = merged;
              setConfig(merged);
            }
          }
          await loadUsers(normalizedList);
        }
      }
    } catch (e) {
      console.error('Failed to load server payment data:', e);
    } finally {
      isFetchingRef.current = false;
    }
  }, [loadUsers]);

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const loadPlansRef = useRef(loadPlans);
  loadPlansRef.current = loadPlans;

  useEffect(() => {
    document.title = `${t('paymentManagerTitle', 'Payment Manager')} - Admin`;
    fetchDataRef.current();
    loadPlansRef.current();

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleDebouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchDataRef.current();
        loadPlansRef.current();
      }, 300);
    };

    window.addEventListener('zecratary_plans_updated', handleDebouncedSync);
    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_admin_settings_updated', handleDebouncedSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_plans_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
    };
  }, [t, version]);

  const currentSelectedUser = useMemo(() => {
    return registeredUsers.find((u) => u.id === selectedUserId) || null;
  }, [registeredUsers, selectedUserId]);

  // Plan Transition and Exclusivity Analyzer: Enforces No Concurrent Monthly & Annual for Same Plan
  const planTransitionInfo = useMemo(() => {
    if (!showAddModal || !selectedUserId || !currentSelectedUser) return null;

    // Resolve user's current active transaction plan if active in history
    const userEmailClean = (currentSelectedUser.email || '').toLowerCase().trim();
    const activeTx = transactionsRef.current.find(
      (t) => (t.customerEmail || '').toLowerCase().trim() === userEmailClean && isSucceeded(t.status)
    );

    const activePlanSlug = sanitizeSinglePlan(activeTx?.planSlug || currentSelectedUser.subscriptionPlan || 'taster');
    const chosenPlanSlug = sanitizeSinglePlan(selectedPlanSlug);

    const getBase = (slug: string) => slug.replace(/-(monthly|annual|free)$/, '');
    const activeBase = getBase(activePlanSlug);
    const chosenBase = getBase(chosenPlanSlug);

    const activeInterval = (activePlanSlug.includes('annual') || (activeTx && activeTx.recurringInterval === 'YEAR')) ? 'YEAR' : 'MONTH';
    const chosenInterval = (chosenPlanSlug.includes('annual') || chosenPlanSlug.includes('yr')) ? 'YEAR' : 'MONTH';

    const matchedChosen = availablePlans.find((p) => p.slug === chosenPlanSlug);
    const matchedActive = availablePlans.find((p) => p.slug === activePlanSlug);

    // Case 1: Same Plan and Same Interval -> Subscription Renewal
    if (activePlanSlug === chosenPlanSlug && chosenPlanSlug !== 'taster' && chosenPlanSlug !== 'free') {
      const intervalName = chosenInterval === 'YEAR' ? 'Annual' : 'Monthly';
      return {
        isRenewal: true,
        isIntervalSwitch: false,
        isPlanSwitch: false,
        isUpgrade: false,
        isDowngrade: false,
        fromPlan: matchedActive?.name || activePlanSlug,
        toPlan: matchedChosen?.name || chosenPlanSlug,
        message: `User "${currentSelectedUser.name}" currently holds "${matchedActive?.name || chosenPlanSlug}". Recording this payment will renew their ${intervalName} subscription and extend active validity.`
      };
    }

    // Case 2: Same Plan, Different Interval -> Mutual Exclusivity Switch (Monthly <-> Annual Upgrade or Downgrade)
    if (activeBase === chosenBase && activePlanSlug !== 'taster' && chosenPlanSlug !== 'taster' && activeInterval !== chosenInterval) {
      const isUpgrade = chosenInterval === 'YEAR' && activeInterval === 'MONTH';
      const fromIntervalName = activeInterval === 'YEAR' ? 'Annual' : 'Monthly';
      const toIntervalName = chosenInterval === 'YEAR' ? 'Annual' : 'Monthly';

      return {
        isRenewal: false,
        isIntervalSwitch: true,
        isPlanSwitch: false,
        isUpgrade,
        isDowngrade: !isUpgrade,
        fromPlan: `${activeBase} (${fromIntervalName})`,
        toPlan: `${chosenBase} (${toIntervalName})`,
        fromInterval: fromIntervalName,
        toInterval: toIntervalName,
        message: isUpgrade
          ? `Plan Upgrade (${fromIntervalName} → ${toIntervalName}): User cannot hold both Monthly and Annual subscriptions for ${activeBase}. The previous ${fromIntervalName} plan will be automatically CANCELLED (Status: Cancelled, Recurring: OFF) and replaced with this Annual plan.`
          : `Plan Downgrade (${fromIntervalName} → ${toIntervalName}): User cannot hold both Monthly and Annual subscriptions for ${activeBase}. The previous ${fromIntervalName} plan will be automatically CANCELLED (Status: Cancelled, Recurring: OFF) and replaced with this Monthly plan.`
      };
    }

    // Case 3: Completely Different Plan -> Plan Switch (Upgrade / Downgrade)
    if (activePlanSlug !== 'taster' && chosenPlanSlug !== 'taster' && activeBase !== chosenBase) {
      return {
        isRenewal: false,
        isIntervalSwitch: false,
        isPlanSwitch: true,
        isUpgrade: (matchedChosen?.priceDollars || 0) >= (matchedActive?.priceDollars || 0),
        isDowngrade: (matchedChosen?.priceDollars || 0) < (matchedActive?.priceDollars || 0),
        fromPlan: matchedActive?.name || activePlanSlug,
        toPlan: matchedChosen?.name || chosenPlanSlug,
        message: `Plan Switch: Switching "${currentSelectedUser.name}" from "${matchedActive?.name || activePlanSlug}" to "${matchedChosen?.name || chosenPlanSlug}". Previous plan subscription will be automatically CANCELLED.`
      };
    }

    return null;
  }, [showAddModal, selectedUserId, currentSelectedUser, selectedPlanSlug, availablePlans]);

  // TOGGLE RECURRING HANDLER
  const handleToggleRecurring = async (tx: PaymentTransaction) => {
    const nextState = !tx.isRecurring;
    setTogglingTxId(tx.id);

    setTransactions((prev) =>
      prev.map((tItem) =>
        tItem.id === tx.id
          ? { ...tItem, isRecurring: nextState, autoRenew: nextState }
          : tItem
      )
    );

    const updatedTx: PaymentTransaction = {
      ...tx,
      isRecurring: nextState,
      autoRenew: nextState,
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_transaction', transaction: updatedTx }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update recurring setting');
      }

      setFeedback({
        type: 'success',
        msg: nextState
          ? t('recurringTurnedOnMsg', `Recurring renewal turned ON for ${tx.customerName} (${tx.planName})`)
          : t('recurringTurnedOffMsg', `Recurring renewal turned OFF for ${tx.customerName} (${tx.planName})`),
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      }
    } catch (err: any) {
      setTransactions((prev) =>
        prev.map((tItem) =>
          tItem.id === tx.id
            ? { ...tItem, isRecurring: tx.isRecurring, autoRenew: tx.autoRenew }
            : tItem
        )
      );
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to update recurring status.',
      });
    } finally {
      setTogglingTxId(null);
    }
  };

  // TRIGGER GATEWAY REFUND HANDLER
  const handleRefundTransaction = async (tx: PaymentTransaction) => {
    const symbol = getCurrencySymbol(tx.currency || config.currency);
    const amountStr = `${symbol}${parseAmount(tx.amount).toFixed(2)}`;
    const confirmMsg = t('confirmRefundPayment', 'Are you sure you want to process a gateway refund for');
    
    if (!window.confirm(`${confirmMsg} ${tx.customerName} (${amountStr})?\n\nThis will trigger an automatic refund via ${tx.gateway.toUpperCase()}, turn off recurring, and immediately revoke active subscription privileges.`)) {
      return;
    }

    setRefundingTxId(tx.id);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund_transaction',
          id: tx.id,
          transaction: {
            ...tx,
            status: 'refunded',
            isRecurring: false,
            autoRenew: false,
            expiryDate: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to trigger gateway refund.');
      }

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: data.message || `Payment of ${amountStr} refunded successfully via ${tx.gateway.toUpperCase()} for ${tx.customerName}.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Payment gateway refund failed. Please verify gateway keys.'
      });
    } finally {
      setRefundingTxId(null);
    }
  };

  // OPEN CONFIRM PAYMENT FROM GATEWAY MODAL
  const handleOpenConfirmModal = (tx: PaymentTransaction) => {
    setModalError('');
    setConfirmingTx(tx);
    setConfirmGatewayTxId(tx.gatewayTransactionId || '');
    setConfirmAmount(parseAmount(tx.amount));
    setConfirmCheckbox(false);
    setConfirmSyncPlan(true);
  };

  // SUBMIT CONFIRM PAYMENT FROM GATEWAY
  const handleConfirmPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingTx) return;
    setModalError('');

    if (!confirmCheckbox) {
      setModalError(t('mustConfirmGatewayAmountError', 'Please check the box confirming you have verified the transaction amount from the payment gateway.'));
      return;
    }

    const cleanAmount = parseAmount(confirmAmount);
    if (cleanAmount <= 0) {
      setModalError(t('amountMustBePositive', 'Confirmed payment amount must be greater than zero.'));
      return;
    }

    setIsSubmittingConfirm(true);
    const nowIso = new Date().toISOString();
    const cleanEmail = (confirmingTx.customerEmail || '').toLowerCase().trim();
    const singlePlanSlug = sanitizeSinglePlan(confirmingTx.planSlug);

    const existingExpiry = confirmingTx.expiryDate;
    const fallbackExpiry = calculateDefaultExpiry(nowIso.slice(0, 10), confirmingTx.recurringInterval || 'MONTH');
    const finalExpiryDate = existingExpiry || (fallbackExpiry ? new Date(`${fallbackExpiry}T23:59:59Z`).toISOString() : undefined);

    const updatedTx: PaymentTransaction = {
      ...confirmingTx,
      amount: cleanAmount,
      status: 'succeeded',
      gatewayTransactionId: confirmGatewayTxId.trim() || confirmingTx.gatewayTransactionId,
      confirmedAmount: cleanAmount,
      confirmedAt: nowIso,
      expiryDate: finalExpiryDate,
      isRecurring: confirmingTx.isRecurring !== undefined ? confirmingTx.isRecurring : true,
      autoRenew: confirmingTx.autoRenew !== undefined ? confirmingTx.autoRenew : true,
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'confirm_payment', 
          id: confirmingTx.id,
          transaction: updatedTx 
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to confirm transaction with gateway.');
      }

      const targetUser = registeredUsers.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);

      if (confirmSyncPlan && singlePlanSlug && targetUser) {
        await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...targetUser, 
            subscriptionPlan: singlePlanSlug,
            planExpiryDate: finalExpiryDate,
            expiryDate: finalExpiryDate
          }),
        }).catch(() => {});
      }

      // Credit tokens associated with plan in /admin/plans
      const matchedPlan = availablePlans.find((p) => p.slug === singlePlanSlug);
      if (matchedPlan?.tokenLimit && matchedPlan.tokenLimit > 0 && targetUser) {
        await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'grant',
            userId: targetUser.id,
            email: cleanEmail,
            amount: matchedPlan.tokenLimit,
            type: 'plan_purchase',
            description: `Token grant for confirming ${confirmingTx.planName}`
          })
        }).catch(() => {});
      }

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('zecratary_token_settings_updated'));
      }

      setConfirmingTx(null);
      setFeedback({
        type: 'success',
        msg: t('paymentConfirmedSuccess', `Payment amount of ${getCurrencySymbol(updatedTx.currency)}${cleanAmount.toFixed(2)} confirmed via ${updatedTx.gateway.toUpperCase()}! Status set to Succeeded.`),
      });
    } catch (err: any) {
      setModalError(err.message || 'Failed to confirm gateway payment');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    const updatedConfig: GatewayConfig = {
      ...config,
      currency: newCurrency,
    };
    setConfig(updatedConfig);
    configRef.current = updatedConfig;
    loadPlans(newCurrency);

    await persistServerAdminSettings({ currency: newCurrency, paymentSettings: updatedConfig });
    try {
      await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: `Processing currency updated to ${newCurrency} (${getCurrencySymbol(newCurrency)}) and saved to server!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: `Failed to persist currency: ${err.message || 'Server error'}`,
      });
    }
  };

  const handleUserSelectChange = (userId: string) => {
    setSelectedUserId(userId);
    setModalError('');
    const target = registeredUsers.find((u) => u.id === userId);
    if (target) {
      const userPlan = sanitizeSinglePlan(target.subscriptionPlan);
      // Intelligently default to the user's active plan if available and has a price, or the first available plan with price
      const matched = availablePlans.find((p) => p.slug === userPlan && p.priceDollars > 0) ||
                      availablePlans.find((p) => p.slug.replace(/-(monthly|annual)$/, '') === userPlan.replace(/-(monthly|annual)$/, '') && p.priceDollars > 0) ||
                      availablePlans[0];
      if (matched && matched.priceDollars > 0) {
        setSelectedPlanSlug(matched.slug);
        setPaymentAmount(matched.priceDollars);
        setPaymentExpiryDate(calculateDefaultExpiry(paymentDate, matched.interval));
      }
    }
  };

  // Sync plan and price cleanly
  const handlePlanSelectChange = (slug: string) => {
    const singleSlug = sanitizeSinglePlan(slug);
    setSelectedPlanSlug(singleSlug);
    const matched = availablePlans.find((p) => p.slug === singleSlug);
    if (matched && matched.priceDollars > 0) {
      setPaymentAmount(matched.priceDollars);
      setIsPaymentRecurring(true);
      const calculatedExpiry = calculateDefaultExpiry(paymentDate, matched.interval);
      setPaymentExpiryDate(calculatedExpiry);
    }
  };

  const handlePaymentDateChange = (newDate: string) => {
    setPaymentDate(newDate);
    const matched = availablePlans.find((p) => p.slug === selectedPlanSlug);
    if (matched && matched.interval) {
      setPaymentExpiryDate(calculateDefaultExpiry(newDate, matched.interval));
    }
  };

  // Validates selectedPlanSlug against availablePlans (strictly plans with price)
  useEffect(() => {
    if (availablePlans.length > 0) {
      const exists = availablePlans.some((p) => p.slug === selectedPlanSlug && p.priceDollars > 0);
      if (!exists) {
        const first = availablePlans.find((p) => p.priceDollars > 0) || availablePlans[0];
        if (first) {
          setSelectedPlanSlug(first.slug);
          setPaymentAmount(first.priceDollars);
          setPaymentExpiryDate(calculateDefaultExpiry(paymentDate, first.interval));
        }
      }
    }
  }, [availablePlans, selectedPlanSlug, paymentDate]);

  const handleOpenAddModal = async () => {
    loadPlans();
    await loadUsers();
    setModalError('');
    const today = new Date().toISOString().slice(0, 10);
    setPaymentDate(today);

    const targetUser = registeredUsers[0] || null;
    if (targetUser) {
      setSelectedUserId(targetUser.id);
    }

    const userCurrentPlan = targetUser ? sanitizeSinglePlan(targetUser.subscriptionPlan) : '';
    
    // Choose active user plan if available and priced, or first available plan with price
    const matchedPlan = availablePlans.find((p) => p.slug === userCurrentPlan && p.priceDollars > 0) ||
                        availablePlans.find((p) => p.slug.replace(/-(monthly|annual)$/, '') === userCurrentPlan.replace(/-(monthly|annual)$/, '') && p.priceDollars > 0) ||
                        availablePlans[0];

    const initialSlug = sanitizeSinglePlan(matchedPlan?.slug || 'nutrition-pro-monthly');
    setSelectedPlanSlug(initialSlug);
    setPaymentAmount(matchedPlan?.priceDollars || 8.99);
    setPaymentExpiryDate(calculateDefaultExpiry(today, matchedPlan?.interval || 'MONTH'));
    setIsPaymentRecurring(true);

    if (config.activeGateway === 'paypal' && (config.paypal.enabled || config.activeGateway === 'paypal')) {
      setPaymentGateway('paypal');
    } else {
      setPaymentGateway('stripe');
    }

    setPaymentStatus('succeeded');
    setFailureReason('');
    setSyncUserPlan(true);
    setAddGatewayTxId('');
    setAddGatewayConfirmed(true);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (tx: PaymentTransaction) => {
    loadPlans();
    setModalError('');
    setEditingTx(tx);
    setEditCustomerName(tx.customerName || '');
    setEditCustomerEmail(tx.customerEmail || '');

    const rawSlug = sanitizeSinglePlan((tx.planSlug || tx.plan_slug || 'taster') || '');
    const matched = availablePlans.find((p) => p.slug === rawSlug) ||
                    availablePlans.find((p) => p.id === (tx.planSlug || tx.plan_slug || 'taster')) ||
                    availablePlans.find((p) => p.slug.replace(/-(monthly|annual)$/, '') === rawSlug.replace(/-(monthly|annual)$/, ''));

    const resolvedSlug = matched ? matched.slug : rawSlug;
    setEditPlanSlug(resolvedSlug);
    setEditPlanName(matched ? matched.name : (tx.planName || ''));
    setEditAmount(parseAmount(tx.amount));
    setEditGateway(tx.gateway || 'stripe');
    setEditStatus(isSucceeded(tx.status) ? 'succeeded' : isFailed(tx.status) ? 'failed' : isRefunded(tx.status) ? 'refunded' : isCanceled(tx.status) ? 'canceled' : 'pending');
    setEditFailureReason(tx.failureReason || '');
    setEditDate(tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditExpiryDate(tx.expiryDate ? new Date(tx.expiryDate).toISOString().slice(0, 10) : '');
    setEditIsRecurring(tx.isRecurring !== undefined ? Boolean(tx.isRecurring) : true);
    setEditSyncUserPlan(false);
    setEditGatewayTxId(tx.gatewayTransactionId || '');
    setEditGatewayConfirmed(isSucceeded(tx.status));
  };

  const handleEditPlanSelectChange = (slug: string) => {
    const singleSlug = sanitizeSinglePlan(slug);
    setEditPlanSlug(singleSlug);
    const matched = availablePlans.find((p) => p.slug === singleSlug);
    if (matched && matched.priceDollars > 0) {
      setEditPlanName(matched.name);
      setEditAmount(matched.priceDollars);
      if (matched.interval && !editExpiryDate) {
        setEditExpiryDate(calculateDefaultExpiry(editDate || new Date().toISOString().slice(0, 10), matched.interval));
      }
    }
  };

  const handleCancelPlan = async (tx: PaymentTransaction) => {
    const confirmMsg = t('confirmCancelPlanFor', 'Are you sure you want to cancel plan');
    if (!window.confirm(`${confirmMsg} "${tx.planName}" for ${tx.customerName}? Recurring will be turned OFF and status set to "cancelled", keeping the current plan active until expiration.`)) {
      return;
    }

    const now = new Date();
    const hasUnreachedExpiry = Boolean(tx.expiryDate && new Date(tx.expiryDate).getTime() > now.getTime());

    const updatedTx: PaymentTransaction = { 
      ...tx, 
      status: 'canceled', 
      isRecurring: false,
      autoRenew: false,
      expiryDate: hasUnreachedExpiry ? tx.expiryDate : now.toISOString() 
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_transaction', transaction: updatedTx, id: tx.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel plan');
      }

      const cleanEmail = (tx.customerEmail || '').toLowerCase().trim();
      const targetUser = registeredUsers.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);
      if (targetUser) {
        if (hasUnreachedExpiry) {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ...targetUser, 
              subscriptionPlan: targetUser.subscriptionPlan || (tx.planSlug || tx.plan_slug || 'taster'), 
              planExpiryDate: tx.expiryDate, 
              expiryDate: tx.expiryDate 
            }),
          }).catch(() => {});
        } else {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...targetUser, subscriptionPlan: 'taster', planExpiryDate: null, expiryDate: null }),
          }).catch(() => {});
        }
      }

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: hasUnreachedExpiry
          ? `Recurring turned OFF and status set to "cancelled" for ${tx.customerName}. Current plan remains ACTIVE until ${new Date(tx.expiryDate!).toLocaleDateString()}.`
          : `Plan cancelled and user subscription reverted to Free (Taster) for ${tx.customerName}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to cancel plan',
      });
    }
  };

  const handleUpdatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setModalError('');

    if (!editCustomerName.trim() || !editCustomerEmail.trim()) {
      setModalError(t('customerNameEmailRequired', 'Please enter customer name and valid email.'));
      return;
    }

    const cleanAmount = parseAmount(editAmount);
    const normalizedStatus = editStatus.toLowerCase();
    const singlePlanSlug = sanitizeSinglePlan(editPlanSlug);
    const cleanEmail = editCustomerEmail.trim().toLowerCase();

    // Enforce gateway verification for automated processors, permit manual
    if (isSucceeded(normalizedStatus) && !isSucceeded(editingTx.status) && editGateway !== 'manual' && !editGatewayConfirmed) {
      setModalError(t('requireGatewayConfirmToUpdateSucceeded', 'Confirmation required: You must confirm the transaction amount from the payment gateway to mark status as Succeeded.'));
      return;
    }

    const formattedCreatedAt = editDate 
      ? new Date(`${editDate}T12:00:00Z`).toISOString() 
      : editingTx.createdAt;

    const formattedExpiryDate = editExpiryDate 
      ? new Date(`${editExpiryDate}T23:59:59Z`).toISOString() 
      : undefined;

    const detectedInterval = (singlePlanSlug.includes('annual') || editPlanName.toLowerCase().includes('annual')) ? 'YEAR' : 'MONTH';
    const isStatusCanceled = isCanceled(normalizedStatus);
    const finalRecurring = isStatusCanceled ? false : editIsRecurring;

    const updatedTx: PaymentTransaction = {
      ...editingTx,
      customerName: editCustomerName.trim(),
      customerEmail: cleanEmail,
      planName: editPlanName.trim() || editingTx.planName,
      planSlug: singlePlanSlug,
      amount: cleanAmount,
      currency: editingTx.currency || config.currency,
      gateway: editGateway,
      status: normalizedStatus as any,
      failureReason: normalizedStatus === 'failed' ? editFailureReason || 'Declined by issuer' : undefined,
      isRecurring: finalRecurring,
      recurringInterval: detectedInterval as any,
      autoRenew: finalRecurring,
      createdAt: formattedCreatedAt,
      expiryDate: formattedExpiryDate,
      gatewayTransactionId: editGatewayTxId.trim() || editingTx.gatewayTransactionId,
      confirmedAmount: isSucceeded(normalizedStatus) ? cleanAmount : editingTx.confirmedAmount,
      confirmedAt: isSucceeded(normalizedStatus) ? (editingTx.confirmedAt || new Date().toISOString()) : undefined,
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_transaction', transaction: updatedTx }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      if (isStatusCanceled) {
        const targetUser = registeredUsers.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);
        if (targetUser) {
          const now = new Date();
          const hasUnreachedExpiry = Boolean(formattedExpiryDate && new Date(formattedExpiryDate).getTime() > now.getTime());
          if (hasUnreachedExpiry) {
            await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                ...targetUser, 
                subscriptionPlan: singlePlanSlug || targetUser.subscriptionPlan,
                planExpiryDate: formattedExpiryDate,
                expiryDate: formattedExpiryDate
              }),
            }).catch(() => {});
          } else {
            await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                ...targetUser, 
                subscriptionPlan: 'taster',
                planExpiryDate: null,
                expiryDate: null
              }),
            }).catch(() => {});
          }
        }
      } else if (editSyncUserPlan && isSucceeded(normalizedStatus) && singlePlanSlug) {
        const targetUser = registeredUsers.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);
        if (targetUser) {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ...targetUser, 
              subscriptionPlan: singlePlanSlug,
              planExpiryDate: formattedExpiryDate,
              expiryDate: formattedExpiryDate
            }),
          }).catch(() => {});
        }
      }

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setEditingTx(null);
      setFeedback({
        type: 'success',
        msg: `Transaction updated! Status: ${normalizedStatus.toUpperCase()}, Recurring: ${finalRecurring ? 'ON' : 'OFF'}.`,
      });
    } catch (err: any) {
      setModalError(err.message || 'Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (id: string, customerName: string) => {
    const confirmMsg = t('confirmDeletePaymentFor', 'Are you sure you want to delete payment record for');
    if (!window.confirm(`${confirmMsg} ${customerName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/payment?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      await fetchData();
      setSelectedTxIds((prev) => prev.filter((item) => item !== id));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: `Payment record deleted successfully and user plans re-verified in PostgreSQL.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to delete transaction',
      });
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedTxIds.length === 0) return;
    const confirmTmpl = t('confirmRemovePayments', 'Are you sure you want to remove {count} selected payment record(s)?');
    if (!window.confirm(confirmTmpl.replace('{count}', String(selectedTxIds.length)))) {
      return;
    }

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTxIds })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove selected records.');
      }

      const count = selectedTxIds.length;
      setSelectedTxIds([]);
      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: `Successfully removed ${count} selected payment record(s) and re-verified user plans.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to remove selected records.',
      });
    }
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const targetUser = registeredUsers.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      setModalError(t('selectValidUserError', 'Please select a valid user.'));
      return;
    }

    const customerName = targetUser.name || 'Customer';
    const customerEmail = (targetUser.email || '').trim().toLowerCase();
    const singlePlanSlug = sanitizeSinglePlan(selectedPlanSlug);
    const matchedPlan = availablePlans.find((p) => p.slug === singlePlanSlug);
    const planName = matchedPlan ? matchedPlan.name : singlePlanSlug;
    const cleanAmount = parseAmount(paymentAmount);
    const normalizedStatus = paymentStatus.toLowerCase();

    // Enforce gateway verification for automated processors, permit manual
    if (isSucceeded(normalizedStatus) && paymentGateway !== 'manual' && !addGatewayConfirmed) {
      setModalError(t('requireGatewayConfirmToAddSucceeded', 'Confirmation required: Please verify and confirm the transaction amount from the payment gateway to record as Succeeded.'));
      return;
    }

    const formattedCreatedAt = paymentDate 
      ? new Date(`${paymentDate}T12:00:00Z`).toISOString() 
      : new Date().toISOString();

    const formattedExpiryDate = paymentExpiryDate 
      ? new Date(`${paymentExpiryDate}T23:59:59Z`).toISOString() 
      : undefined;

    const detectedInterval = (matchedPlan?.interval || (singlePlanSlug.includes('annual') ? 'YEAR' : 'MONTH')) as any;

    // Mutual Exclusivity: Automatically CANCEL previous subscriptions when upgrading, downgrading, or switching intervals
    if (isSucceeded(normalizedStatus)) {
      const isSwitchOrUpgradeDowngrade = Boolean(
        planTransitionInfo?.isIntervalSwitch || planTransitionInfo?.isPlanSwitch
      );

      const existingUserActiveTxs = transactionsRef.current.filter((tItem) => {
        const matchesEmail = (tItem.customerEmail || '').toLowerCase().trim() === customerEmail;
        return matchesEmail && (isSucceeded(tItem.status) || isPending(tItem.status));
      });

      for (const oldTx of existingUserActiveTxs) {
        // If switching between Monthly & Annual or switching plans, cancel previous plan completely!
        const shouldCancelStatus = isSwitchOrUpgradeDowngrade || (oldTx.planSlug !== singlePlanSlug);
        
        const updatedOldTx: PaymentTransaction = { 
          ...oldTx, 
          status: shouldCancelStatus ? 'canceled' : oldTx.status,
          isRecurring: false,
          autoRenew: false,
          expiryDate: shouldCancelStatus ? new Date().toISOString() : oldTx.expiryDate
        };

        await fetch('/api/admin/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: shouldCancelStatus ? 'cancel_transaction' : 'update_transaction', 
            transaction: updatedOldTx, 
            id: oldTx.id 
          }),
        }).catch(() => {});
      }
    }

    const newTx: PaymentTransaction = {
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      customerName,
      customerEmail,
      planName,
      planSlug: singlePlanSlug,
      amount: cleanAmount,
      currency: config.currency,
      gateway: paymentGateway,
      status: normalizedStatus as any,
      testMode: config.testMode,
      failureReason: normalizedStatus === 'failed' ? failureReason || 'Transaction declined by issuer' : undefined,
      isRecurring: isPaymentRecurring,
      recurringInterval: detectedInterval,
      autoRenew: isPaymentRecurring,
      createdAt: formattedCreatedAt,
      expiryDate: formattedExpiryDate,
      gatewayTransactionId: addGatewayTxId.trim() || undefined,
      confirmedAmount: isSucceeded(normalizedStatus) ? cleanAmount : undefined,
      confirmedAt: isSucceeded(normalizedStatus) ? new Date().toISOString() : undefined,
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_transaction', transaction: newTx }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record transaction in database');
      }

      // Update user plan entitlement in PostgreSQL
      const finalPlanToSync = (syncUserPlan && isSucceeded(normalizedStatus) && singlePlanSlug) 
        ? singlePlanSlug 
        : (targetUser.subscriptionPlan || 'taster');

      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...targetUser, 
          subscriptionPlan: finalPlanToSync,
          planExpiryDate: formattedExpiryDate || null,
          expiryDate: formattedExpiryDate || null
        }),
      }).catch(() => {});

      // Credit tokens associated with this plan in /admin/plans
      if (isSucceeded(normalizedStatus) && matchedPlan?.tokenLimit && matchedPlan.tokenLimit > 0) {
        await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'grant',
            userId: targetUser.id,
            email: customerEmail,
            amount: matchedPlan.tokenLimit,
            type: 'plan_purchase',
            description: `Token grant for purchasing ${planName}`
          })
        }).catch(() => {});
      }

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('zecratary_token_settings_updated'));
      }

      setShowAddModal(false);
      const isRenewal = planTransitionInfo?.isRenewal;
      const isSwitched = planTransitionInfo?.isTransition;
      setFeedback({
        type: 'success',
        msg: isRenewal
          ? `Successfully renewed ${planName} for ${customerName} (Payment: ${activeCurrencySymbol}${cleanAmount.toFixed(2)}, Recurring: ${isPaymentRecurring ? 'ON' : 'OFF'})!`
          : isSwitched 
          ? `Successfully updated plan to ${planName} for ${customerName} (Recurring: ${isPaymentRecurring ? 'ON' : 'OFF'})!`
          : `Payment of ${activeCurrencySymbol}${cleanAmount.toFixed(2)} recorded for ${customerName} (${planName}, Recurring: ${isPaymentRecurring ? 'ON' : 'OFF'})!`,
      });
    } catch (err: any) {
      setModalError(err.message || 'Failed to record transaction');
    }
  };

  const filteredTransactions = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return transactions.filter((tx) => {
      const cName = (tx.customerName || '').toLowerCase();
      const cEmail = (tx.customerEmail || '').toLowerCase();
      const pName = (tx.planName || '').toLowerCase();

      const matchesSearch = !q || cName.includes(q) || cEmail.includes(q) || pName.includes(q);
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'succeeded' && isSucceeded(tx.status)) ||
        (statusFilter === 'failed' && isFailed(tx.status)) ||
        (statusFilter === 'refunded' && isRefunded(tx.status)) ||
        (statusFilter === 'canceled' && isCanceled(tx.status)) ||
        (statusFilter === 'pending' && isPending(tx.status)) ||
        tx.status === statusFilter;

      const matchesGateway = gatewayFilter === 'all' || tx.gateway === gatewayFilter;
      return matchesSearch && matchesStatus && matchesGateway;
    });
  }, [transactions, searchQuery, statusFilter, gatewayFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTxIds([]);
  }, [searchQuery, statusFilter, gatewayFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const isAllCurrentPageSelected = useMemo(() => {
    return (
      paginatedTransactions.length > 0 &&
      paginatedTransactions.every((tx) => selectedTxIds.includes(tx.id))
    );
  }, [paginatedTransactions, selectedTxIds]);

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = paginatedTransactions.map((tx) => tx.id);
      setSelectedTxIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedTransactions.map((tx) => tx.id);
      setSelectedTxIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Metrics hook evaluated safely before the return statement
  const metrics = useMemo(() => {
    const succeeded = transactions.filter((t) => isSucceeded(t.status));
    const failed = transactions.filter((t) => isFailed(t.status));
    const canceled = transactions.filter((t) => isCanceled(t.status));
    const refunded = transactions.filter((t) => isRefunded(t.status));

    const totalRevenue = succeeded.reduce((sum, t) => sum + parseAmount(t.amount), 0);
    const refundedTotal = refunded.reduce((sum, t) => sum + parseAmount(t.amount), 0);

    return {
      totalRevenue,
      succeededTotal: totalRevenue,
      refundedTotal,
      succeededCount: succeeded.length,
      failedCount: failed.length,
      canceledCount: canceled.length,
      refundedCount: refunded.length,
    };
  }, [transactions]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_stripe',
          secretKey: config.stripe.secretKey,
          publishableKey: config.stripe.publishableKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          const updated: GatewayConfig = { 
            ...config, 
            stripeConnected: true, 
            stripe: { ...config.stripe, enabled: true } 
          };
          setConfig(updated);
          configRef.current = updated;
          await persistServerAdminSettings({ paymentSettings: updated });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('zecratary_payment_updated'));
            window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          }
          setFeedback({ type: 'success', msg: data.message || 'Stripe account connected successfully!' });
        }
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to connect Stripe.' });
      }
    } catch (e: any) {
      const updated: GatewayConfig = { 
        ...config, 
        stripeConnected: true, 
        stripe: { ...config.stripe, enabled: true } 
      };
      setConfig(updated);
      configRef.current = updated;
      await persistServerAdminSettings({ paymentSettings: updated });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }
      setFeedback({ type: 'success', msg: 'Stripe Gateway enabled and verified.' });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const isStripeFilled = Boolean(config.stripe.secretKey && config.stripe.secretKey.length > 5);
    const updatedConfig: GatewayConfig = {
      ...config,
      stripeConnected: isStripeFilled || config.stripeConnected,
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      const data = await res.json();

      await persistServerAdminSettings({
        paymentSettings: updatedConfig,
        currency: updatedConfig.currency
      });

      if (data.success) {
        setConfig(updatedConfig);
        configRef.current = updatedConfig;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        }
        await loadPlans();
        setFeedback({ type: 'success', msg: 'Gateway settings and currency saved successfully to server!' });
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save settings.' });
      }
    } catch (e: any) {
      await persistServerAdminSettings({
        paymentSettings: updatedConfig,
        currency: updatedConfig.currency
      });
      setConfig(updatedConfig);
      configRef.current = updatedConfig;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }
      await loadPlans();
      setFeedback({ type: 'success', msg: 'Settings saved to server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .payment-input:-webkit-autofill,
        .payment-input:-webkit-autofill:hover,
        .payment-input:-webkit-autofill:focus,
        .payment-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          -webkit-text-fill-color: var(--color-text) !important;
          caret-color: var(--color-text) !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }

        .payment-input[type="date"],
        input[type="date"].payment-input {
          color-scheme: ${isDayMode ? 'light' : 'dark'};
        }
      `}} />

      {/* HEADER & TOP NAV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('paymentManagerTitle', 'Payment Manager')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('paymentManagerSubtitle', 'Manage payment transactions, recurring billing subscriptions, and gateways.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <PlusCircle className="h-4 w-4" /> {t('addPaymentBtn', 'Add Payment')}
          </button>
          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('managePlans', 'Manage Plans')}
          </Link>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div 
        className="flex items-center gap-2 p-1.5 rounded-2xl border w-fit shadow-xs transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={{
            backgroundColor: activeTab === 'history' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : 'var(--color-text-secondary)'
          }}
        >
          <History className="h-4 w-4" /> {t('paymentHistoryTab', 'Payment History')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={{
            backgroundColor: activeTab === 'settings' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'settings' ? '#ffffff' : 'var(--color-text-secondary)'
          }}
        >
          <Sliders className="h-4 w-4" /> {t('gatewaySettingsTab', 'Gateway Settings')}
        </button>
      </div>

      {feedback && (
        <div
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: feedback.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* TAB 1: PAYMENT HISTORY CONTAINER */}
      <div className={activeTab === 'history' ? 'space-y-6 animate-in fade-in' : 'hidden'}>
        {/* GATEWAY STATUS & MONITOR BAR */}
        <div
          className="p-3 px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text)' }}>
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> {t('gatewayEngine', 'Gateway Engine')}
            </span>
            <span 
              className="font-extrabold uppercase px-2.5 py-0.5 rounded text-[11px] border"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              {config.activeGateway}
            </span>
            <span 
              className="font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald)',
                color: config.testMode ? '#fbbf24' : 'var(--color-emerald)'
              }}
            >
              {config.testMode ? t('sandboxTest', 'Sandbox Test') : t('liveProduction', 'Live Production')}
            </span>
          </div>

          <div className="flex items-center gap-4 font-semibold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            <div>
              {t('currencyLabel', 'Currency:')} <span className="font-bold" style={{ color: 'var(--color-text)' }}>{config.currency} ({activeCurrencySymbol})</span>
            </div>
            <div>
              {t('stripeLabel', 'Stripe:')}{' '}
              <span className={`font-bold ${config.stripeConnected ? 'text-[var(--color-emerald)]' : ''}`} style={{ color: config.stripeConnected ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
                {config.stripeConnected ? t('connectedStatus', 'Connected') : t('notConnectedStatus', 'Not Connected')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="font-bold text-[11px] hover:underline transition cursor-pointer"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('changeCurrencyKeys', 'Change currency & keys')}
            </button>
          </div>
        </div>

        {/* KPI STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div 
            className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              {t('totalRevenueTitle', 'Total Revenue')}
            </div>
            <div className="text-xl font-black flex items-baseline gap-1" style={{ color: 'var(--color-text)' }}>
              <span>{activeCurrencySymbol}{metrics.totalRevenue.toFixed(2)}</span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{config.currency}</span>
            </div>
          </div>

          <div 
            className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              {t('successfulPaymentsTitle', 'Successful')}
            </div>
            <div 
              className="text-xl font-black flex items-center gap-1.5"
              style={{ color: 'var(--color-emerald)' }}
            >
              {metrics.succeededCount}
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
            </div>
          </div>

          <div 
            className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cancelledTitle', 'Cancelled')}
            </div>
            <div className="text-xl font-black flex items-center gap-1.5" style={{ color: '#fb923c' }}>
              {metrics.canceledCount}
              <Ban className="h-4 w-4 text-orange-500" />
            </div>
          </div>

          <div 
            className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              {t('refundedTitle', 'Refunded')}
            </div>
            <div className="text-xl font-black flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
              {metrics.refundedCount}
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>

          <div 
            className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              {t('failedPaymentsTitle', 'Failed')}
            </div>
            <div className="text-xl font-black flex items-center gap-1.5 text-red-500">
              {metrics.failedCount}
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </div>
        </div>

        {/* SEARCH, FILTERS, TABLE COLUMNS & BULK ACTIONS BAR */}
        <div 
          className="border p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder={t('searchPaymentPlaceholder', 'Search by customer name, email, or plan...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="payment-input w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition font-medium"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {selectedTxIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDeleteUsers}
                className="px-3.5 py-2 text-white font-bold rounded-xl transition flex items-center gap-1.5 text-xs shadow-md bg-red-600 hover:bg-red-700 animate-in fade-in cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('removeUsersBtn', 'Remove Selected')} ({selectedTxIds.length})
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="all" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('allStatuses', 'All Statuses')}</option>
                <option value="succeeded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusSucceeded', 'Succeeded')}</option>
                <option value="canceled" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusCanceled', 'Cancelled')}</option>
                <option value="failed" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusFailed', 'Failed')}</option>
                <option value="refunded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusRefunded', 'Refunded')}</option>
                <option value="pending" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusPending', 'Pending')}</option>
              </select>
            </div>

            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value as any)}
              className="border rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer transition"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <option value="all" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('allGateways', 'All Gateways')}</option>
              <option value="stripe" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('gatewayStripe', 'Stripe')}</option>
              <option value="paypal" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('gatewayPaypal', 'PayPal')}</option>
              <option value="manual" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('gatewayManual', 'Manual')}</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer transition"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <option value={5} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('perPage5', '5 per page')}</option>
              <option value={10} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('perPage10', '10 per page')}</option>
              <option value={20} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('perPage20', '20 per page')}</option>
              <option value={50} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('perPage50', '50 per page')}</option>
            </select>

            {/* TABLE COLUMN SHOW / HIDE POPUP TOGGLE */}
            <div className="relative" ref={columnPopupRef}>
              <button
                type="button"
                onClick={() => setShowColumnPopup(!showColumnPopup)}
                className="border rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: showColumnPopup ? 'var(--color-primary)' : 'var(--color-border)',
                  color: showColumnPopup ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                }}
                title={t('customizeColumnsTooltip', 'Show / Hide Table Columns')}
              >
                <Columns3 className="h-3.5 w-3.5" style={{ color: showColumnPopup ? 'var(--color-primary)' : undefined }} />
                <span className="hidden sm:inline">{t('columnsBtn', 'Columns')}</span>
              </button>

              {showColumnPopup && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl p-3.5 z-50 text-xs animate-in fade-in transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <div 
                    className="flex items-center justify-between pb-2.5 border-b mb-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Columns3 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>{t('tableColumnsTitle', 'Table Columns')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={resetColumnVisibility}
                      className="text-[10px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      {t('resetColumnsBtn', 'Reset')}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { key: 'customer', label: t('customerCol', 'Customer') },
                      { key: 'plan', label: t('planCol', 'Plan') },
                      { key: 'amount', label: t('amountCol', 'Amount') },
                      { key: 'status', label: t('statusCol', 'Status') },
                      { key: 'recurring', label: t('recurringCol', 'Recurring') },
                      { key: 'date', label: t('dateCol', 'Date') },
                      { key: 'expiryDate', label: t('expiryDateCol', 'Expiry Date') },
                      { key: 'actions', label: t('actionsCol', 'Actions') },
                    ].map((col) => {
                      const isChecked = visibleColumns[col.key] !== false;
                      return (
                        <label
                          key={col.key}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition select-none hover:bg-emerald-500/10"
                        >
                          <span className="font-medium text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {col.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleColumnVisibility(col.key)}
                            className="w-3.5 h-3.5 rounded cursor-pointer accent-[#E05638]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE MULTI-SELECT BANNER */}
        {selectedTxIds.length > 0 && (
          <div
            className="p-3 px-4 rounded-2xl border flex items-center justify-between text-xs animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444'
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-red-500" />
              <span>
                <strong>{selectedTxIds.length}</strong> {t('userRecordsSelected', 'user record(s) selected')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTxIds([])}
                className="px-3 py-1 rounded-lg border transition font-medium cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('clearSelection', 'Clear')}
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteUsers}
                className="px-3 py-1 text-white font-bold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('removeSelected', 'Remove')}
              </button>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TABLE WITH DYNAMIC VISIBLE COLUMNS */}
        <div 
          className="border rounded-3xl overflow-hidden shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="font-bold uppercase tracking-wider border-b transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
                      title="Select All On Current Page"
                    />
                  </th>
                  {visibleColumns.customer && <th className="px-5 py-3.5">{t('customerCol', 'Customer')}</th>}
                  {visibleColumns.plan && <th className="px-5 py-3.5">{t('planCol', 'Plan')}</th>}
                  {visibleColumns.amount && <th className="px-5 py-3.5">{t('amountCol', 'Amount')}</th>}
                  {visibleColumns.status && <th className="px-5 py-3.5">{t('statusCol', 'Status')}</th>}
                  {visibleColumns.recurring && <th className="px-5 py-3.5">{t('recurringCol', 'Recurring')}</th>}
                  {visibleColumns.date && <th className="px-5 py-3.5">{t('dateCol', 'Date')}</th>}
                  {visibleColumns.expiryDate && <th className="px-5 py-3.5">{t('expiryDateCol', 'Expiry Date')}</th>}
                  {visibleColumns.actions && <th className="px-5 py-3.5 text-right">{t('actionsCol', 'Actions')}</th>}
                </tr>
              </thead>
              <tbody 
                className="divide-y transition-colors duration-200"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={activeColumnCount} className="text-center py-10 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('noTransactionsFound', 'No payment transactions found matching your criteria.')}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const txSymbol = getCurrencySymbol(tx.currency || config.currency);
                    const isRowSelected = selectedTxIds.includes(tx.id);
                    const isTxRefunding = refundingTxId === tx.id;
                    const isTxToggling = togglingTxId === tx.id;
                    const isTxCanceled = isCanceled(tx.status);
                    const isTxRefunded = isRefunded(tx.status);
                    const isTxSucceeded = isSucceeded(tx.status);
                    const isRecurringActive = Boolean(tx.isRecurring ?? true);

                    return (
                      <tr 
                        key={tx.id} 
                        className="transition"
                        style={{
                          backgroundColor: isRowSelected ? 'var(--color-inner-dark)' : 'transparent'
                        }}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleSelectRow(tx.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
                          />
                        </td>

                        {visibleColumns.customer && (
                          <td className="px-5 py-3.5">
                            <div className="font-bold" style={{ color: 'var(--color-text)' }}>{tx.customerName || 'Customer'}</div>
                            <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{tx.customerEmail || ''}</div>
                          </td>
                        )}

                        {visibleColumns.plan && (
                          <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            {tx.planName || (tx.planSlug || tx.plan_slug || 'taster') || 'Plan'}
                          </td>
                        )}

                        {visibleColumns.amount && (
                          <td className="px-5 py-3.5 font-bold whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                            {txSymbol}{parseAmount(tx.amount).toFixed(2)}{' '}
                            <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>{tx.currency || config.currency}</span>
                          </td>
                        )}

                        {visibleColumns.status && (
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {isSucceeded(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-emerald)',
                                  color: 'var(--color-emerald)'
                                }}
                                title={tx.gatewayTransactionId ? `Gateway Ref: ${tx.gatewayTransactionId}` : 'Confirmed Payment'}
                              >
                                <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--color-emerald)' }} /> {t('statusSucceeded', 'Succeeded')}
                              </span>
                            )}
                            {isCanceled(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: '#f97316',
                                  color: '#f97316'
                                }}
                              >
                                <Ban className="h-3 w-3 text-orange-500" /> {t('statusCanceled', 'Cancelled')}
                              </span>
                            )}
                            {isFailed(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs cursor-help"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'rgba(239, 68, 68, 0.4)',
                                  color: '#ef4444'
                                }}
                                title={tx.failureReason || 'Declined by payment processor'}
                              >
                                <XCircle className="h-3 w-3 text-red-500" /> {t('statusFailed', 'Failed')}
                              </span>
                            )}
                            {isRefunded(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: '#f59e0b',
                                  color: '#f59e0b'
                                }}
                              >
                                <ArrowDownLeft className="h-3 w-3 text-amber-500" /> {t('statusRefunded', 'Refunded')}
                              </span>
                            )}
                            {isPending(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)'
                                }}
                              >
                                <RefreshCw className="h-3 w-3 animate-spin" /> {t('statusPending', 'Pending')}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleColumns.recurring && (
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isRecurringActive}
                                disabled={isTxToggling || isTxCanceled || isTxRefunded}
                                onClick={() => handleToggleRecurring(tx)}
                                title={
                                  (isTxCanceled || isTxRefunded) 
                                    ? t('cancelledNoRecurring', 'Plan is canceled/refunded') 
                                    : isRecurringActive 
                                    ? t('clickTurnRecurringOff', 'Click to turn recurring OFF') 
                                    : t('clickTurnRecurringOn', 'Click to turn recurring ON')
                                }
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                                  isRecurringActive 
                                    ? 'bg-[var(--color-emerald)]' 
                                    : 'bg-slate-700'
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    isRecurringActive ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>

                              <span 
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{
                                  color: isRecurringActive 
                                    ? 'var(--color-emerald)' 
                                    : 'var(--color-text-secondary)'
                                }}
                              >
                                {isRecurringActive 
                                  ? (tx.recurringInterval === 'YEAR' ? t('annualRecurring', 'Annual') : t('monthlyRecurring', 'Monthly'))
                                  : t('offLabel', 'OFF')}
                              </span>
                            </div>
                          </td>
                        )}
                        
                        {visibleColumns.date && (
                          <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}
                          </td>
                        )}
                        
                        {visibleColumns.expiryDate && (
                          <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {tx.expiryDate ? (() => {
                              const exp = new Date(tx.expiryDate);
                              const now = new Date();
                              const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              const expMidnight = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
                              const diffDays = Math.ceil((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

                              let badgeStyle = {
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-emerald)',
                                color: 'var(--color-emerald)'
                              };
                              let badgeNotice = '';

                              if (diffDays < 0) {
                                badgeStyle = {
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'rgba(239, 68, 68, 0.4)',
                                  color: '#ef4444'
                                };
                                badgeNotice = t('expiredBadge', 'EXPIRED');
                              } else if (diffDays <= 7) {
                                badgeStyle = {
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'rgba(245, 158, 11, 0.4)',
                                  color: '#f59e0b'
                                };
                              }

                              return (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold text-[11px] transition shadow-xs"
                                  style={badgeStyle}
                                  title={badgeNotice ? `${exp.toLocaleDateString()} (${badgeNotice})` : exp.toLocaleDateString()}
                                >
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  {exp.toLocaleDateString()}
                                  {badgeNotice && (
                                    <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded border border-current/30 leading-none">
                                      {badgeNotice}
                                    </span>
                                  )}
                                </span>
                              );
                            })() : (
                              <span className="text-[11px] italic font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('lifetimeNone', 'Lifetime / None')}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleColumns.actions && (
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isTxSucceeded && !isTxRefunded && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConfirmModal(tx)}
                                  className="p-1.5 rounded-lg border transition shadow-xs cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--color-inner-dark)',
                                    borderColor: 'var(--color-emerald)',
                                    color: 'var(--color-emerald)'
                                  }}
                                  title={t('confirmPaymentTooltip', 'Confirm payment amount from gateway to mark Succeeded')}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isTxRefunded}
                                onClick={() => handleOpenEditModal(tx)}
                                className={`p-1.5 rounded-lg border transition shadow-xs ${
                                  isTxRefunded
                                    ? 'opacity-30 cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)'
                                }}
                                title={isTxRefunded ? t('cannotModifyRefundedTooltip', 'Cannot modify refunded payment') : t('modifyPaymentTooltip', 'Modify payment record & expiration')}
                              >
                                <Pencil 
                                  className="h-3.5 w-3.5" 
                                  style={{ color: isTxRefunded ? 'var(--color-text-secondary)' : 'var(--color-primary)' }} 
                                />
                              </button>

                              <button
                                type="button"
                                disabled={isTxRefunded || isTxRefunding || isFailed(tx.status)}
                                onClick={() => handleRefundTransaction(tx)}
                                className={`p-1.5 rounded-lg border transition shadow-xs ${
                                  isTxRefunded || isFailed(tx.status)
                                    ? 'opacity-30 cursor-not-allowed'
                                    : 'cursor-pointer'
                                }`}
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: '#f59e0b'
                                }}
                                title={
                                  isTxRefunded
                                    ? t('alreadyRefundedTooltip', 'Payment already refunded')
                                    : t('refundPaymentTooltip', 'Trigger payment gateway refund')
                              }
                              >
                                {isTxRefunding ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={isTxCanceled || isTxRefunded}
                                onClick={() => handleCancelPlan(tx)}
                                className={`p-1.5 rounded-lg border transition shadow-xs ${
                                  isTxCanceled || isTxRefunded
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'cursor-pointer'
                                }`}
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: '#f97316'
                                }}
                                title={isTxCanceled ? t('planAlreadyCancelledTooltip', 'Plan already cancelled') : isTxRefunded ? t('planAlreadyRefundedTooltip', 'Plan refunded') : t('cancelPlanTooltip', 'Cancel plan renewal & keep active until expiry')}
                              >
                                <XCircle className="h-3.5 w-3.5 text-orange-500" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id, tx.customerName)}
                                className="p-1.5 rounded-lg border transition cursor-pointer hover:text-red-500 shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)'
                                }}
                                title={t('deletePaymentTooltip', 'Delete payment record permanently')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          <div 
            className="px-5 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {t('showing', 'Showing')}{' '}
              <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              {t('to', 'to')}{' '}
              <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                {Math.min(currentPage * pageSize, filteredTransactions.length)}
              </span>{' '}
              {t('of', 'of')} <span className="font-bold" style={{ color: 'var(--color-text)' }}>{filteredTransactions.length}</span> {t('resultsSuffix', 'results')}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                title={t('firstPageTooltip', 'First Page')}
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                title={t('previousPageTooltip', 'Previous Page')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 py-1 font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                {t('page', 'Page')} {currentPage} {t('of', 'of')} {totalPages}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                title={t('nextPageTooltip', 'Next Page')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                title={t('lastPageTooltip', 'Last Page')}
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 2: GATEWAY SETTINGS CONTAINER */}
      <div className={activeTab === 'settings' ? 'space-y-6 animate-in fade-in' : 'hidden'}>
        <form onSubmit={handleSaveSettings} className="space-y-6" autoComplete="off" role="presentation">
          <div 
            className="border p-6 rounded-3xl shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('processingCurrencyTitle', 'Processing Currency')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('processingCurrencySub', 'Select the default currency for processing subscriptions and recording transactions.')}
                </p>
              </div>

              <div className="w-full sm:w-80">
                <select
                  value={config.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="payment-input w-full border rounded-xl p-3 text-xs font-bold outline-none transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('defaultGatewayTitle', 'Default Payment Gateway')}
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('environmentLabel', 'Environment:')}</label>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, testMode: !config.testMode })}
                  className="text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald)',
                    color: config.testMode ? '#fbbf24' : 'var(--color-emerald)'
                  }}
                >
                  {config.testMode ? t('sandboxTestMode', 'Sandbox (Test Mode)') : t('liveProduction', 'Live Production')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div
                onClick={() => setConfig({ ...config, activeGateway: 'stripe' })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  config.activeGateway === 'stripe' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.activeGateway === 'stripe' ? 'var(--color-primary)' : 'var(--color-border)'
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>Stripe</span>
                    {config.activeGateway === 'stripe' && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('stripeCardDesc', 'Accept credit cards securely via Stripe Checkout and webhooks.')}
                  </p>
                </div>
              </div>

              <div
                onClick={() => setConfig({ ...config, activeGateway: 'paypal' })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  config.activeGateway === 'paypal' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.activeGateway === 'paypal' ? 'var(--color-primary)' : 'var(--color-border)'
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>PayPal</span>
                    {config.activeGateway === 'paypal' && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('paypalCardDesc', 'Accept digital wallet and PayPal account balance payments.')}
                  </p>
                </div>
              </div>

              <div
                onClick={() => setConfig({ ...config, activeGateway: 'both' })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  config.activeGateway === 'both' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.activeGateway === 'both' ? 'var(--color-primary)' : 'var(--color-border)'
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>
                      {t('multiGatewayCardTitle', 'Both Gateways')}
                    </span>
                    {config.activeGateway === 'both' && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('multiGatewayCardDesc', 'Enable both Stripe and PayPal checkout options simultaneously.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CREDENTIAL SETTINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div 
              className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t('stripeApiConfig', 'Stripe API Configuration')}</h3>
                </div>
                <input
                  type="checkbox"
                  checked={config.stripe.enabled}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
                />
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-xs font-bold block" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('connectStripeBtn', 'Connect Stripe Account')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    className="inline-flex items-center overflow-hidden rounded-lg bg-[#008cdd] hover:bg-[#0070e0] text-white font-bold text-xs shadow-md active:scale-[0.98] transition cursor-pointer border border-[#009bf5]/40"
                    style={{
                      backgroundImage: 'linear-gradient(180deg, #18a0fb 0%, #0077c8 100%)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                  >
                    <div className="px-3 py-2 bg-black/15 border-r border-white/20 font-black text-sm flex items-center justify-center">S</div>
                    <span className="px-3.5 py-2 text-xs tracking-tight font-bold">
                      {connectingStripe ? t('connectingStripe', 'Connecting...') : t('connectWithStripe', 'Connect with Stripe')}
                    </span>
                  </button>

                  {config.stripeConnected && (
                    <span 
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-emerald)',
                        color: 'var(--color-emerald)'
                      }}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} /> {t('connectedStatus', 'Connected')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('publishableKeyLabel', 'Publishable Key')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['stripePublishable'] ? 'text' : 'password'}
                      id="cfg_stripe_publishable_key"
                      name="cfg_stripe_publishable_key"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      role="presentation"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={config.stripe.publishableKey}
                      onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, publishableKey: e.target.value } })}
                      placeholder="pk_test_... / pk_live_..."
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('stripePublishable')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {visibleFields['stripePublishable'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('secretKeyLabel', 'Secret Key')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['stripeSecret'] ? 'text' : 'password'}
                      id="cfg_stripe_secret_key"
                      name="cfg_stripe_secret_key"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      role="presentation"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={config.stripe.secretKey}
                      onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, secretKey: e.target.value } })}
                      placeholder="sk_test_... / sk_live_..."
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('stripeSecret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {visibleFields['stripeSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('webhookSecretLabel', 'Webhook Secret')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['stripeWebhook'] ? 'text' : 'password'}
                      id="cfg_stripe_webhook_secret"
                      name="cfg_stripe_webhook_secret"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      role="presentation"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={config.stripe.webhookSecret}
                      onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                      placeholder="whsec_..."
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('stripeWebhook')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {visibleFields['stripeWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t('paypalApiConfig', 'PayPal API Configuration')}</h3>
                </div>
                <input
                  type="checkbox"
                  checked={config.paypal.enabled}
                  onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('clientIdLabel', 'Client ID')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['paypalClientId'] ? 'text' : 'password'}
                      id="cfg_paypal_client_id"
                      name="cfg_paypal_client_id"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      role="presentation"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={config.paypal.clientId}
                      onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                      placeholder="PayPal Client ID"
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('paypalClientId')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {visibleFields['paypalClientId'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('clientSecretLabel', 'Client Secret')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['paypalSecret'] ? 'text' : 'password'}
                      id="cfg_paypal_secret_key"
                      name="cfg_paypal_secret_key"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      role="presentation"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={config.paypal.clientSecret}
                      onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientSecret: e.target.value } })}
                      placeholder="PayPal Client Secret"
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('paypalSecret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {visibleFields['paypalSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('webhookIdLabel', 'Webhook ID')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['paypalWebhook'] ? 'text' : 'password'}
                      id="cfg_paypal_webhook_id"
                      name="cfg_paypal_webhook_id"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      role="presentation"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={config.paypal.webhookId}
                      onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, webhookId: e.target.value } })}
                      placeholder="PayPal Webhook ID"
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('paypalWebhook')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {visibleFields['paypalWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-3 border font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <RefreshCw className="h-4 w-4" /> {t('resetConfigBtn', 'Reset Config')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 text-white font-bold rounded-2xl transition text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
            >
              <Save className="h-4 w-4" />
              {loading ? t('savingSettings', 'Saving Settings...') : t('saveConfigBtn', 'Save Gateway Settings')}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* ROOT LEVEL MODALS (Guaranteed visibility across all tabs)                  */}
      {/* ========================================================================= */}

      {/* CONFIRM PAYMENT FROM GATEWAY MODAL */}
      {confirmingTx && (
        <div 
          onClick={() => !isSubmittingConfirm && setConfirmingTx(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default max-h-[92vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              onClick={() => !isSubmittingConfirm && setConfirmingTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-emerald)' }}
              >
                <ShieldCheck className="h-5 w-5" style={{ color: 'var(--color-emerald)' }} /> {t('confirmGatewayPaymentTitle', 'Confirm Gateway Payment')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('confirmGatewayPaymentSub', 'Confirm payment amount transaction from payment gateway to become status "Succeeded".')}
              </p>
            </div>

            <div 
              className="p-3.5 rounded-2xl border space-y-2 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('customerCol', 'Customer')}:</span>
                <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {confirmingTx.customerName} ({confirmingTx.customerEmail})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('planCol', 'Plan')}:</span>
                <span className="font-bold text-[var(--color-primary)]">
                  {confirmingTx.planName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('gatewayLabel', 'Gateway')}:</span>
                <span className="font-extrabold uppercase px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                  {confirmingTx.gateway}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('currentStatusLabel', 'Current Status')}:</span>
                <span className="font-extrabold uppercase text-[11px] text-amber-500">
                  {confirmingTx.status}
                </span>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold flex items-center gap-2 shadow-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPaymentSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold mb-1 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{t('confirmedPaymentAmountLabel', 'Confirmed Payment Amount')} ({confirmingTx.currency || config.currency}) *</span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-emerald)' }}>{t('matchesGatewayNote', 'Must match gateway settlement')}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {getCurrencySymbol(confirmingTx.currency || config.currency)}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(parseFloat(e.target.value) || 0)}
                    className="payment-input w-full border rounded-xl pl-8 pr-3 py-2.5 text-xs outline-none font-black transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('gatewayTransactionIdLabel', 'Gateway Transaction ID / Payment Intent ID')}
                </label>
                <input
                  type="text"
                  placeholder={t('gatewayTxIdPlaceholder', 'e.g. pi_3N... / PAYID-... / ch_...')}
                  value={confirmGatewayTxId}
                  onChange={(e) => setConfirmGatewayTxId(e.target.value)}
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div 
                className="p-3.5 rounded-2xl border space-y-2.5 shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-emerald)'
                }}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="confirmGatewayAmountCheckbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    className="mt-0.5 rounded w-4 h-4 cursor-pointer accent-[#10b981]"
                  />
                  <label htmlFor="confirmGatewayAmountCheckbox" className="font-semibold text-xs leading-relaxed cursor-pointer select-none" style={{ color: 'var(--color-emerald)' }}>
                    {t('confirmPaymentGatewayNotice', 'I verify and confirm that the payment transaction amount has been settled by the payment gateway, and confirm updating status to "Succeeded".')}
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <input
                    type="checkbox"
                    id="confirmSyncPlanBox"
                    checked={confirmSyncPlan}
                    onChange={(e) => setConfirmSyncPlan(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#E05638]"
                  />
                  <label htmlFor="confirmSyncPlanBox" className="font-medium text-[11px] cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('syncUserPlanOnConfirm', 'Update user subscription entitlement in PostgreSQL immediately upon confirmation')}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  disabled={isSubmittingConfirm}
                  onClick={() => setConfirmingTx(null)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!confirmCheckbox || isSubmittingConfirm}
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-emerald)' }}
                >
                  {isSubmittingConfirm ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> {t('confirmingPaymentStatus', 'Confirming Status...')}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" style={{ color: '#ffffff' }} /> {t('confirmPaymentAmountBtn', 'Confirm Payment & Set Succeeded')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PAYMENT MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <PlusCircle className="h-5 w-5" /> {t('addPaymentModalTitle', 'Record Payment & Assign Plan')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('addPaymentModalSub', 'Manually record a payment transaction and immediately activate the subscription for a user.')}
              </p>
            </div>

            {planTransitionInfo?.isRenewal && (
              <div 
                className="p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-emerald)',
                  color: 'var(--color-emerald)'
                }}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Subscription Renewal Notice:</div>
                  <div className="text-[11px] leading-relaxed">
                    {planTransitionInfo.message}
                  </div>
                </div>
              </div>
            )}

            {planTransitionInfo?.isIntervalSwitch && (
              <div 
                className="p-3.5 rounded-2xl border flex items-start gap-2.5 animate-in fade-in shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: planTransitionInfo.isUpgrade ? 'var(--color-emerald)' : '#f59e0b',
                  color: planTransitionInfo.isUpgrade ? 'var(--color-emerald)' : '#f59e0b'
                }}
              >
                {planTransitionInfo.isUpgrade ? (
                  <ArrowUpRight className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <ArrowDownLeft className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    {planTransitionInfo.isUpgrade 
                      ? `Plan Upgrade (${planTransitionInfo.fromInterval} → ${planTransitionInfo.toInterval})` 
                      : `Plan Downgrade (${planTransitionInfo.fromInterval} → ${planTransitionInfo.toInterval})`}
                  </div>
                  <div className="text-[11px] leading-relaxed font-normal" style={{ color: 'var(--color-text)' }}>
                    {planTransitionInfo.message}
                  </div>
                </div>
              </div>
            )}

            {planTransitionInfo?.isPlanSwitch && (
              <div 
                className="p-3.5 rounded-2xl border flex items-start gap-2.5 animate-in fade-in shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  color: '#3b82f6'
                }}
              >
                <Zap className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs">{t('planChangeNotice', 'Plan Switch Notice:')}</div>
                  <div className="text-[11px] leading-relaxed font-normal" style={{ color: 'var(--color-text)' }}>
                    {planTransitionInfo.message}
                  </div>
                </div>
              </div>
            )}

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold flex items-center gap-2 shadow-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddPaymentSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <UserIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  {t('selectUserLabel', 'Select User Account')} ({registeredUsers.length})
                </label>
                {registeredUsers.length > 0 ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelectChange(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {registeredUsers.map((user) => (
                      <option key={user.id} value={user.id} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {user.name} — {user.email} ({user.role}) [Active: {user.subscriptionPlan || 'taster'}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {t('noRegisteredUsersAvailable', 'No registered users available')}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                    {t('selectPlanLabel', 'Select Subscription Plan')}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-emerald)' }}>
                    {t('onePlanPerEmailEnforced', 'Strictly 1 active plan per email enforced')}
                  </span>
                </label>
                <select
                  value={selectedPlanSlug}
                  onChange={(e) => handlePlanSelectChange(e.target.value)}
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {plan.name} — {plan.priceFormatted}
                    </option>
                  ))}
                </select>
              </div>

              {/* RECURRING SLIDE BUTTON */}
              <div 
                className="p-3.5 rounded-2xl border flex items-center justify-between transition-colors shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                    <Repeat className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    {t('recurringSubscriptionOption', 'Recurring Subscription (Auto-Renew)')}
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {isPaymentRecurring 
                      ? t('recurringOnDesc', 'Auto-renews subscription at each billing cycle until canceled.') 
                      : t('recurringOffDesc', 'One-time payment cycle. Subscription will expire at term end.')}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isPaymentRecurring}
                  onClick={() => setIsPaymentRecurring(!isPaymentRecurring)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                    isPaymentRecurring ? 'bg-[var(--color-emerald)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isPaymentRecurring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                    {t('paymentDateLabel', 'Payment Date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => handlePaymentDateChange(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    {t('expiryDateCol', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={paymentExpiryDate}
                    onChange={(e) => setPaymentExpiryDate(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('paymentAmountLabel', 'Payment Amount')} ({config.currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {activeCurrencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="payment-input w-full border rounded-xl pl-8 pr-3 py-2.5 text-xs outline-none font-bold transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('paymentGatewayLabel', 'Gateway')}</label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value as any)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {allowedGateways.map((g) => (
                      <option key={g.id} value={g.id} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('paymentStatusLabel', 'Status')}</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setPaymentStatus(val);
                      if (val === 'canceled') {
                        setIsPaymentRecurring(false);
                      }
                    }}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="succeeded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusSucceeded', 'Succeeded')}</option>
                    <option value="pending" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusPending', 'Pending')}</option>
                    <option value="canceled" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusCanceled', 'Cancelled')}</option>
                    <option value="failed" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusFailed', 'Failed')}</option>
                    <option value="refunded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusRefunded', 'Refunded')}</option>
                  </select>
                </div>

                {isFailed(paymentStatus) && (
                  <div>
                    <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('declineFailureReasonLabel', 'Decline / Failure Reason')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Card expired or declined"
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* GATEWAY PAYMENT AMOUNT CONFIRMATION SECTION (Automated Gateways Only) */}
              {isSucceeded(paymentStatus) && paymentGateway !== 'manual' && (
                <div 
                  className="p-3.5 rounded-2xl border space-y-2.5 shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-emerald)'
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--color-emerald)' }}>
                    <ShieldCheck className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('gatewayVerificationRequired', 'Required Gateway Amount Confirmation')}
                  </div>
                  <div>
                    <label className="block font-semibold text-[11px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('gatewayTransactionIdLabel', 'Gateway Transaction ID / Payment Intent ID')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pi_3N... or PAYID-..."
                      value={addGatewayTxId}
                      onChange={(e) => setAddGatewayTxId(e.target.value)}
                      className="payment-input w-full border rounded-xl p-2 text-xs outline-none font-mono"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="addGatewayConfirmedBox"
                      checked={addGatewayConfirmed}
                      onChange={(e) => setAddGatewayConfirmed(e.target.checked)}
                      className="mt-0.5 rounded w-4 h-4 cursor-pointer accent-[#10b981]"
                    />
                    <label htmlFor="addGatewayConfirmedBox" className="text-xs font-semibold leading-tight cursor-pointer select-none" style={{ color: 'var(--color-emerald)' }}>
                      {t('confirmAmountFromGatewayLabel', 'I confirm the payment amount transaction from payment gateway is verified to become "Succeeded".')}
                    </label>
                  </div>
                </div>
              )}

              {isSucceeded(paymentStatus) && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="syncUserPlanBox"
                    checked={syncUserPlan}
                    onChange={(e) => setSyncUserPlan(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#E05638]"
                  />
                  <label htmlFor="syncUserPlanBox" className="text-xs font-semibold cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('autoSyncPlanLabel', 'Automatically update user account to this plan and set active expiry')}
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={registeredUsers.length === 0}
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--color-primary)'
                  }}
                >
                  {planTransitionInfo?.isRenewal ? (
                    <>
                      <RotateCcw className="h-4 w-4" /> Record Renewal & Extend
                    </>
                  ) : planTransitionInfo?.isIntervalSwitch ? (
                    planTransitionInfo.isUpgrade ? (
                      <>
                        <ArrowUpRight className="h-4 w-4" /> Upgrade to Annual & Cancel Previous
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="h-4 w-4" /> Downgrade to Monthly & Cancel Previous
                      </>
                    )
                  ) : planTransitionInfo?.isPlanSwitch ? (
                    <>
                      <Zap className="h-4 w-4" /> Switch Plan & Cancel Previous
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" /> {t('recordPaymentBtn', 'Record Payment & Activate')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODIFY (EDIT) PAYMENT MODAL */}
      {editingTx && (
        <div 
          onClick={() => setEditingTx(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setEditingTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <Pencil className="h-5 w-5" /> {t('editPaymentModalTitle', 'Edit Payment & Subscription Record')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('editPaymentModalSub', 'Update transaction details, recurring status, or expiration date for')} <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>{editingTx.customerName}</span>.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold flex items-center gap-2 shadow-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePaymentSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('customerNameLabel', 'Customer Name')}</label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('customerEmailLabel', 'Customer Email')}</label>
                  <input
                    type="email"
                    required
                    value={editCustomerEmail}
                    onChange={(e) => setEditCustomerEmail(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('planCol', 'Plan')}</label>
                <select
                  value={editPlanSlug}
                  onChange={(e) => handleEditPlanSelectChange(e.target.value)}
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Custom: {editPlanName}</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {plan.name} — {plan.priceFormatted}
                    </option>
                  ))}
                </select>
              </div>

              {/* RECURRING SLIDE BUTTON */}
              <div 
                className="p-3.5 rounded-2xl border flex items-center justify-between transition-colors shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                    <Repeat className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    {t('recurringSubscriptionOption', 'Recurring Subscription (Auto-Renew)')}
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {editIsRecurring 
                      ? t('recurringOnDesc', 'Auto-renews subscription at each billing cycle until canceled.') 
                      : t('recurringOffDesc', 'One-time payment cycle. Subscription will expire at term end.')}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={editIsRecurring}
                  onClick={() => setEditIsRecurring(!editIsRecurring)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                    editIsRecurring ? 'bg-[var(--color-emerald)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editIsRecurring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                    {t('dateCol', 'Date')}
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    {t('expiryDateCol', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('paymentAmountLabel', 'Payment Amount')} ({editingTx.currency || config.currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {getCurrencySymbol(editingTx.currency || config.currency)}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                      className="payment-input w-full border rounded-xl pl-8 pr-3 py-2.5 text-xs outline-none font-bold transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('paymentGatewayLabel', 'Gateway')}</label>
                  <select
                    value={editGateway}
                    onChange={(e) => setEditGateway(e.target.value as any)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="stripe" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('gatewayStripe', 'Stripe')}</option>
                    <option value="paypal" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('gatewayPaypal', 'PayPal')}</option>
                    <option value="manual" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('gatewayManual', 'Manual')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('paymentStatusLabel', 'Status')}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setEditStatus(val);
                      if (val === 'canceled') {
                        setEditIsRecurring(false);
                      }
                    }}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="succeeded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusSucceeded', 'Succeeded')}</option>
                    <option value="pending" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusPending', 'Pending')}</option>
                    <option value="canceled" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusCanceled', 'Cancelled')}</option>
                    <option value="failed" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusFailed', 'Failed')}</option>
                    <option value="refunded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('statusRefunded', 'Refunded')}</option>
                  </select>
                </div>

                {isFailed(editStatus) && (
                  <div>
                    <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('declineFailureReasonLabel', 'Decline / Failure Reason')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Card expired or declined"
                      value={editFailureReason}
                      onChange={(e) => setEditFailureReason(e.target.value)}
                      className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* CONFIRMATION CHECK FOR ADVANCING TO SUCCEEDED */}
              {isSucceeded(editStatus) && !isSucceeded(editingTx.status) && editGateway !== 'manual' && (
                <div 
                  className="p-3.5 rounded-2xl border space-y-2.5 shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-emerald)'
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--color-emerald)' }}>
                    <ShieldCheck className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('gatewayVerificationRequired', 'Required Gateway Amount Confirmation')}
                  </div>
                  <div>
                    <label className="block font-semibold text-[11px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('gatewayTransactionIdLabel', 'Gateway Transaction ID / Payment Intent ID')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pi_3N... or PAYID-..."
                      value={editGatewayTxId}
                      onChange={(e) => setEditGatewayTxId(e.target.value)}
                      className="payment-input w-full border rounded-xl p-2 text-xs outline-none font-mono"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="editGatewayConfirmedBox"
                      checked={editGatewayConfirmed}
                      onChange={(e) => setEditGatewayConfirmed(e.target.checked)}
                      className="mt-0.5 rounded w-4 h-4 cursor-pointer accent-[#10b981]"
                    />
                    <label htmlFor="editGatewayConfirmedBox" className="text-xs font-semibold leading-tight cursor-pointer select-none" style={{ color: 'var(--color-emerald)' }}>
                      {t('confirmAmountFromGatewayLabel', 'I confirm the payment amount transaction from payment gateway is verified to become "Succeeded".')}
                    </label>
                  </div>
                </div>
              )}

              {isSucceeded(editStatus) && editPlanSlug && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editSyncUserPlanBox"
                    checked={editSyncUserPlan}
                    onChange={(e) => setEditSyncUserPlan(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#E05638]"
                  />
                  <label htmlFor="editSyncUserPlanBox" className="text-xs font-semibold cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('updateUserPlanToLabel', 'Update user account plan to')} {editPlanName} {t('onePlanMaxSuffix', '(Enforces 1 plan maximum per email)')}
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  <Save className="h-4 w-4" /> {t('saveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
