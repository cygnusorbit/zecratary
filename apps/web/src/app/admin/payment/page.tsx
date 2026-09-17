'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Search, ArrowDownLeft, XCircle, 
  Check, Eye, EyeOff, Globe, Zap, History, Sliders, Filter,
  PlusCircle, X, User as UserIcon, Activity, Calendar,
  Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ShieldAlert, Ban, ArrowUpRight, AlertTriangle
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
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  failureReason?: string;
  testMode?: boolean;
  createdAt: string;
  expiryDate?: string;
  isRecurring?: boolean;
  recurringInterval?: 'MONTH' | 'YEAR';
  autoRenew?: boolean;
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
  { code: 'THB', label: 'THB - Thai Baht (฿)', symbol: '฿' },
];

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
  return s === 'refunded' || s === 'refund' || s === 'cancelled' || s === 'canceled';
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
    isRecurring: raw.isRecurring !== undefined ? Boolean(raw.isRecurring) : true,
    recurringInterval: raw.recurringInterval || raw.recurring_interval || (String(raw.planSlug || raw.plan_slug || '').includes('annual') ? 'YEAR' : 'MONTH'),
    autoRenew: raw.autoRenew !== undefined ? Boolean(raw.autoRenew) : true,
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

  // Selection state
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'failed' | 'refunded' | 'pending'>('all');
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

  // Mutable refs to prevent circular callback regeneration
  const transactionsRef = useRef<PaymentTransaction[]>([]);
  const configRef = useRef<GatewayConfig>(config);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Add Payment Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('nutrition-pro-monthly');
  const [paymentAmount, setPaymentAmount] = useState<number>(8.99);
  const [paymentGateway, setPaymentGateway] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [paymentStatus, setPaymentStatus] = useState<'succeeded' | 'failed' | 'refunded' | 'pending'>('succeeded');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentExpiryDate, setPaymentExpiryDate] = useState<string>('');
  const [failureReason, setFailureReason] = useState('');
  const [syncUserPlan, setSyncUserPlan] = useState(true);
  const [modalError, setModalError] = useState('');

  // Modify (Edit) Modal States
  const [editingTx, setEditingTx] = useState<PaymentTransaction | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editPlanSlug, setEditPlanSlug] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editGateway, setEditGateway] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [editStatus, setEditStatus] = useState<'succeeded' | 'failed' | 'refunded' | 'pending'>('succeeded');
  const [editDate, setEditDate] = useState<string>('');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [editFailureReason, setEditFailureReason] = useState('');
  const [editSyncUserPlan, setEditSyncUserPlan] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Dynamic Theme Synchronization
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light' || mode === 'day';
      setIsDayMode(isDay);

      const stored = typeof window !== 'undefined'
        ? (localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config'))
        : null;
      const c = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        root.style.setProperty('--color-primary', c.primary || c.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', c.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', c.backgroundDark || c.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-card', c.cardDark || c.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', c.innerDark || c.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', c.borderColor || c.cardBorder || '#1e293b');
        root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor || '#10b981');
        root.style.setProperty('--color-text', c.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', c.textSecondary || '#94a3b8');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('storage', applySavedTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applySavedTheme]);

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

  // Load Plans from Server Settings API with snake_case and camelCase compatibility
  const loadPlans = useCallback(async (currencyOverride?: string) => {
    let parsedPlans: PlanOption[] = [];
    const symbol = getCurrencySymbol(currencyOverride || configRef.current.currency);
    let rawPlansList: any[] = [];

    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData && Array.isArray(serverData.subscriptionPlans) && serverData.subscriptionPlans.length > 0) {
        rawPlansList = serverData.subscriptionPlans;
      }
    } catch (_) {}

    if (rawPlansList.length === 0) {
      try {
        const res = await fetch('/api/admin/plans', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) 
            ? data 
            : (data.plans || data.packages || data.configs || data.subscriptionPlans || data.data);
          if (Array.isArray(list) && list.length > 0) {
            rawPlansList = list;
          }
        }
      } catch (_) {}
    }

    if (rawPlansList.length > 0) {
      rawPlansList.forEach((cfg: any) => {
        const isZeroCost = Boolean(
          cfg.isFree || 
          cfg.is_free || 
          cfg.price === 0 || 
          cfg.priceCents === 0 || 
          (cfg.monthlyPriceDollars === 0 && cfg.annualPriceDollars === 0) ||
          (cfg.monthly_price_dollars === 0 && cfg.annual_price_dollars === 0)
        );

        const rawSlug = String(cfg.slug || cfg.id || 'plan').toLowerCase().trim();
        const baseSlug = rawSlug.replace(/-(monthly|annual)$/, '');
        const rawName = String(cfg.name || baseSlug || 'Plan').trim();
        const baseName = rawName.replace(/\s*\((Monthly|Annual|Free)\)/i, '').trim();

        if (isZeroCost) {
          parsedPlans.push({
            id: cfg.id || baseSlug,
            name: `${baseName} (Free)`,
            slug: baseSlug,
            priceFormatted: 'Free',
            priceDollars: 0,
            interval: 'MONTH',
            isFree: true,
          });
        } else {
          let monthlyPrice = Number(
            cfg.monthlyPriceDollars ?? 
            cfg.monthly_price_dollars ?? 
            (cfg.priceCents ? cfg.priceCents / 100 : undefined) ?? 
            (String(cfg.interval || '').toLowerCase().includes('year') ? undefined : cfg.price) ?? 
            0
          );

          let annualPrice = Number(
            cfg.annualPriceDollars ?? 
            cfg.annual_price_dollars ?? 
            (String(cfg.interval || '').toLowerCase().includes('year') ? cfg.price : undefined) ?? 
            0
          );

          if (monthlyPrice > 0 && annualPrice === 0) {
            annualPrice = Number((monthlyPrice * 10).toFixed(2));
          }
          if (annualPrice > 0 && monthlyPrice === 0) {
            monthlyPrice = Number((annualPrice / 10).toFixed(2));
          }
          if (monthlyPrice === 0 && annualPrice === 0) {
            monthlyPrice = 8.99;
            annualPrice = 59.99;
          }

          // 1. Monthly Tier
          const mSlug = `${baseSlug}-monthly`;
          parsedPlans.push({
            id: `${cfg.id || baseSlug}-monthly`,
            name: `${baseName} (Monthly)`,
            slug: mSlug,
            priceFormatted: `${symbol}${monthlyPrice.toFixed(2)}/mo`,
            priceDollars: monthlyPrice,
            interval: 'MONTH',
            isFree: false,
          });

          // 2. Annual Tier
          const aSlug = `${baseSlug}-annual`;
          parsedPlans.push({
            id: `${cfg.id || baseSlug}-annual`,
            name: `${baseName} (Annual)`,
            slug: aSlug,
            priceFormatted: `${symbol}${annualPrice.toFixed(2)}/yr`,
            priceDollars: annualPrice,
            interval: 'YEAR',
            isFree: false,
          });
        }
      });
    }

    const uniquePlans: PlanOption[] = [];
    const seenSlugs = new Set<string>();
    for (const p of parsedPlans) {
      if (!seenSlugs.has(p.slug)) {
        seenSlugs.add(p.slug);
        uniquePlans.push(p);
      }
    }

    if (uniquePlans.length > 0) {
      setAvailablePlans(uniquePlans);
    } else {
      setAvailablePlans([
        { id: 'taster', name: 'Taster (Free)', slug: 'taster', priceFormatted: 'Free', priceDollars: 0, isFree: true },
        { id: 'nutrition-pro-monthly', name: 'Nutrition Pro (Monthly)', slug: 'nutrition-pro-monthly', priceFormatted: `${symbol}8.99/mo`, priceDollars: 8.99, interval: 'MONTH' },
        { id: 'nutrition-pro-annual', name: 'Nutrition Pro (Annual)', slug: 'nutrition-pro-annual', priceFormatted: `${symbol}59.99/yr`, priceDollars: 59.99, interval: 'YEAR' },
      ]);
    }
  }, [getCurrencySymbol]);

  // Validate user subscription against payment transactions: users without valid succeeded transactions fallback to 'taster'
  const validateAndSyncUserPlans = useCallback((usersList: AppUser[], txList: PaymentTransaction[]): AppUser[] => {
    const now = new Date();
    return usersList.map((u) => {
      const currentPlan = sanitizeSinglePlan(u.subscriptionPlan);
      if (currentPlan === 'taster' || currentPlan === 'free') {
        return { ...u, subscriptionPlan: 'taster' };
      }

      const uEmail = (u.email || '').toLowerCase().trim();
      const userTx = txList.find((tx) => {
        const txEmail = (tx.customerEmail || '').toLowerCase().trim();
        const matchesEmail = txEmail === uEmail && txEmail !== '';
        const succeeded = isSucceeded(tx.status);
        const matchesPlan = (tx.planSlug && sanitizeSinglePlan(tx.planSlug) === currentPlan) || 
                            (tx.planName && tx.planName.toLowerCase().includes(currentPlan.replace(/-/g, ' ')));
        const notExpired = !tx.expiryDate || new Date(tx.expiryDate) > now;
        return matchesEmail && succeeded && matchesPlan && notExpired;
      });

      if (!userTx) {
        return { ...u, subscriptionPlan: 'taster' };
      }

      return u;
    });
  }, []);

  const loadUsers = useCallback(async (currentTxs?: PaymentTransaction[]) => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
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

  // Hydrate Payments & Gateways Exclusively from Server
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    purgeLegacyBrowserAdminStorage();
    try {
      const res = await fetch('/api/admin/payment', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          let normalizedList: PaymentTransaction[] = [];
          const curr = configRef.current.currency || 'USD';
          if (Array.isArray(data.transactions)) {
            normalizedList = data.transactions.map((tItem: any) => normalizeTransaction(tItem, curr));
            transactionsRef.current = normalizedList;
            const freshTxs = normalizedList;
        setTransactions(prev => JSON.stringify(prev) === JSON.stringify(freshTxs) ? prev : freshTxs);
          }
          if (data.settings) {
            configRef.current = { ...configRef.current, ...data.settings };
            setConfig((prev) => ({ ...prev, ...data.settings }));
          }
          await loadUsers(normalizedList);
        }
      }
    } catch (e) {
      console.error('Failed to load server payment data:', e);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [loadUsers]);

  // Stable lifecycle initialization without loop
  useEffect(() => {
    document.title = `${t('paymentManagerTitle', 'Payment Manager')} - Admin`;
    fetchData();
    loadPlans();

    const handleSync = () => {
      fetchData();
      loadPlans();
    };

    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, []);

  const currentSelectedUser = useMemo(() => {
    return registeredUsers.find((u) => u.id === selectedUserId) || null;
  }, [registeredUsers, selectedUserId]);

  const planTransitionInfo = useMemo(() => {
    if (!showAddModal || !selectedUserId || !currentSelectedUser) return null;

    const currentPlan = sanitizeSinglePlan(currentSelectedUser.subscriptionPlan);
    const chosenPlan = sanitizeSinglePlan(selectedPlanSlug);

    const getBase = (slug: string) => slug.replace(/-monthly$/, '').replace(/-annual$/, '');
    const currentBase = getBase(currentPlan);
    const chosenBase = getBase(chosenPlan);

    if (currentPlan === chosenPlan && chosenPlan !== 'taster') {
      return {
        isDuplicate: true,
        isTransition: false,
        message: `User "${currentSelectedUser.name}" already has active plan "${chosenPlan}". Adding duplicate same plan is not allowed.`
      };
    }

    if (currentBase === chosenBase && currentPlan !== 'taster' && chosenPlan !== 'taster') {
      const fromInterval = currentPlan.includes('annual') ? 'Annual' : 'Monthly';
      const toInterval = chosenPlan.includes('annual') ? 'Annual' : 'Monthly';
      return {
        isDuplicate: false,
        isTransition: true,
        from: fromInterval,
        to: toInterval,
        message: `Switching "${currentSelectedUser.name}" on plan "${currentBase}" from ${fromInterval} to ${toInterval}. The previous transaction will be cancelled & new payment recorded.`
      };
    }

    if (currentPlan !== 'taster' && chosenPlan !== 'taster' && currentBase !== chosenBase) {
      return {
        isDuplicate: false,
        isTransition: true,
        from: currentPlan,
        to: chosenPlan,
        message: `Upgrading/downgrading "${currentSelectedUser.name}" from "${currentPlan}" to "${chosenPlan}". Previous payment transaction will be refunded.`
      };
    }

    return null;
  }, [showAddModal, selectedUserId, currentSelectedUser, selectedPlanSlug]);

  // HOISTED: Defined before any handler or effect that accesses it (prevents TDZ ReferenceError)
  const paidSubscriptionPlans = useMemo(() => {
    return availablePlans.filter(
      (p) => !p.isFree && p.slug !== 'taster' && (p.priceDollars > 0 || !p.priceFormatted?.toLowerCase().includes('free'))
    );
  }, [availablePlans]);

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
      if (selectedPlanSlug === userPlan && userPlan !== 'taster') {
        let alternativeSlug = '';
        if (userPlan.endsWith('-monthly')) {
          alternativeSlug = userPlan.replace(/-monthly$/, '-annual');
        } else if (userPlan.endsWith('-annual')) {
          alternativeSlug = userPlan.replace(/-annual$/, '-monthly');
        } else {
          alternativeSlug = `${userPlan}-annual`;
        }
        const matched = paidSubscriptionPlans.find((p) => p.slug === alternativeSlug) ||
                        paidSubscriptionPlans.find((p) => p.slug !== userPlan);
        if (matched) {
          setSelectedPlanSlug(matched.slug);
          setPaymentAmount(matched.priceDollars);
          setPaymentExpiryDate(calculateDefaultExpiry(paymentDate, matched.interval));
        }
      }
    }
  };

  const handlePlanSelectChange = (slug: string) => {
    const singleSlug = sanitizeSinglePlan(slug);
    setSelectedPlanSlug(singleSlug);
    const matched = availablePlans.find((p) => p.slug === singleSlug);
    if (matched) {
      setPaymentAmount(matched.priceDollars);
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

  // Safe reactive plan synchronization
  useEffect(() => {
    if (paidSubscriptionPlans.length > 0) {
      const exists = paidSubscriptionPlans.some((p) => p.slug === selectedPlanSlug);
      if (!exists) {
        const first = paidSubscriptionPlans[0];
        setSelectedPlanSlug(first.slug);
        setPaymentAmount(first.priceDollars);
        setPaymentExpiryDate(calculateDefaultExpiry(paymentDate, first.interval));
      }
    }
  }, [paidSubscriptionPlans]);

  const handleOpenAddModal = () => {
    setModalError('');
    const today = new Date().toISOString().slice(0, 10);
    setPaymentDate(today);

    const targetUser = registeredUsers[0] || null;
    if (targetUser) {
      setSelectedUserId(targetUser.id);
    }

    const userCurrentPlan = targetUser ? sanitizeSinglePlan(targetUser.subscriptionPlan) : 'taster';
    
    let initialPlan = paidSubscriptionPlans.find((p) => p.slug !== userCurrentPlan) || paidSubscriptionPlans[0];
    if (userCurrentPlan.endsWith('-monthly')) {
      const annualSlug = userCurrentPlan.replace(/-monthly$/, '-annual');
      const foundAnnual = paidSubscriptionPlans.find((p) => p.slug === annualSlug);
      if (foundAnnual) initialPlan = foundAnnual;
    } else if (userCurrentPlan.endsWith('-annual')) {
      const monthlySlug = userCurrentPlan.replace(/-annual$/, '-monthly');
      const foundMonthly = paidSubscriptionPlans.find((p) => p.slug === monthlySlug);
      if (foundMonthly) initialPlan = foundMonthly;
    }

    const initialSlug = sanitizeSinglePlan(initialPlan?.slug || 'nutrition-pro-monthly');
    setSelectedPlanSlug(initialSlug);
    setPaymentAmount(initialPlan?.priceDollars || 8.99);
    setPaymentExpiryDate(calculateDefaultExpiry(today, initialPlan?.interval || 'MONTH'));

    if (config.activeGateway === 'paypal' && (config.paypal.enabled || config.activeGateway === 'paypal')) {
      setPaymentGateway('paypal');
    } else {
      setPaymentGateway('stripe');
    }

    setPaymentStatus('succeeded');
    setFailureReason('');
    setSyncUserPlan(true);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (tx: PaymentTransaction) => {
    setModalError('');
    setEditingTx(tx);
    setEditCustomerName(tx.customerName || '');
    setEditCustomerEmail(tx.customerEmail || '');
    setEditPlanSlug(sanitizeSinglePlan(tx.planSlug || ''));
    setEditPlanName(tx.planName || '');
    setEditAmount(parseAmount(tx.amount));
    setEditGateway(tx.gateway || 'stripe');
    setEditStatus(isSucceeded(tx.status) ? 'succeeded' : isFailed(tx.status) ? 'failed' : isRefunded(tx.status) ? 'refunded' : 'pending');
    setEditFailureReason(tx.failureReason || '');
    setEditDate(tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditExpiryDate(tx.expiryDate ? new Date(tx.expiryDate).toISOString().slice(0, 10) : '');
    setEditSyncUserPlan(false);
  };

  const handleEditPlanSelectChange = (slug: string) => {
    const singleSlug = sanitizeSinglePlan(slug);
    setEditPlanSlug(singleSlug);
    const matched = availablePlans.find((p) => p.slug === singleSlug);
    if (matched) {
      setEditPlanName(matched.name);
      setEditAmount(matched.priceDollars);
      if (matched.interval && !editExpiryDate) {
        setEditExpiryDate(calculateDefaultExpiry(editDate || new Date().toISOString().slice(0, 10), matched.interval));
      }
    }
  };

  const handleCancelPlan = async (tx: PaymentTransaction) => {
    const confirmMsg = t('confirmCancelPlanFor', 'Are you sure you want to cancel plan');
    if (!window.confirm(`${confirmMsg} "${tx.planName}" for ${tx.customerName}?`)) {
      return;
    }

    const updatedTx: PaymentTransaction = { ...tx, status: 'refunded', expiryDate: new Date().toISOString() };

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
        await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...targetUser, subscriptionPlan: 'taster', planExpiryDate: null, expiryDate: null }),
        }).catch(() => {});
      }

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: `Plan cancelled and user subscription reverted to default Free (Taster) for ${tx.customerName}.`,
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

    const formattedCreatedAt = editDate 
      ? new Date(`${editDate}T12:00:00Z`).toISOString() 
      : editingTx.createdAt;

    const formattedExpiryDate = editExpiryDate 
      ? new Date(`${editExpiryDate}T23:59:59Z`).toISOString() 
      : undefined;

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
      createdAt: formattedCreatedAt,
      expiryDate: formattedExpiryDate,
    };

    try {
      await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_transaction', transaction: updatedTx }),
      });

      if (editSyncUserPlan && isSucceeded(normalizedStatus) && singlePlanSlug) {
        const targetUser = registeredUsers.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);
        if (targetUser) {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...targetUser, subscriptionPlan: singlePlanSlug }),
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
        msg: `Transaction updated! Only 1 active plan maintained for ${cleanEmail}.`,
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

    if (planTransitionInfo?.isDuplicate) {
      setModalError(planTransitionInfo.message);
      return;
    }

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

    const formattedCreatedAt = paymentDate 
      ? new Date(`${paymentDate}T12:00:00Z`).toISOString() 
      : new Date().toISOString();

    const formattedExpiryDate = paymentExpiryDate 
      ? new Date(`${paymentExpiryDate}T23:59:59Z`).toISOString() 
      : undefined;

    if (isSucceeded(normalizedStatus)) {
      const existingUserTxs = transactionsRef.current.filter(
        (tItem) => (tItem.customerEmail || '').toLowerCase().trim() === customerEmail && isSucceeded(tItem.status)
      );
      for (const oldTx of existingUserTxs) {
        const cancelledTx: PaymentTransaction = { 
          ...oldTx, 
          status: 'refunded', 
          expiryDate: new Date().toISOString() 
        };
        await fetch('/api/admin/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_transaction', transaction: cancelledTx }),
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
      createdAt: formattedCreatedAt,
      expiryDate: formattedExpiryDate,
    };

    try {
      await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_transaction', transaction: newTx }),
      });

      const finalPlanToSync = (syncUserPlan && isSucceeded(normalizedStatus) && singlePlanSlug) ? singlePlanSlug : 'taster';

      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...targetUser, 
          subscriptionPlan: finalPlanToSync,
          planExpiryDate: formattedExpiryDate,
          expiryDate: formattedExpiryDate
        }),
      }).catch(() => {});

      await fetchData();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setShowAddModal(false);
      const isSwitched = planTransitionInfo?.isTransition;
      setFeedback({
        type: 'success',
        msg: isSwitched 
          ? `Successfully upgraded/downgraded plan to ${planName} for ${customerName}. Previous payment cancelled & new transaction recorded!`
          : `Payment of ${activeCurrencySymbol}${cleanAmount.toFixed(2)} recorded for ${customerName} (${planName})!`,
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

  const metrics = useMemo(() => {
    const succeeded = transactions.filter((t) => isSucceeded(t.status));
    const failed = transactions.filter((t) => isFailed(t.status));
    const refunded = transactions.filter((t) => isRefunded(t.status));

    const totalRevenue = succeeded.reduce((sum, t) => sum + parseAmount(t.amount), 0);
    const refundedTotal = refunded.reduce((sum, t) => sum + parseAmount(t.amount), 0);

    return {
      totalRevenue,
      succeededTotal: totalRevenue,
      refundedTotal,
      succeededCount: succeeded.length,
      failedCount: failed.length,
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
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      
      {/* Global Autofill CSS & Calendar Picker */}
      <style dangerouslySetInnerHTML={{ __html: `
        .payment-input:-webkit-autofill,
        .payment-input:-webkit-autofill:hover,
        .payment-input:-webkit-autofill:focus,
        .payment-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)'} inset !important;
          box-shadow: 0 0 0 1000px ${isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)'} inset !important;
          -webkit-text-fill-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          caret-color: ${isDayMode ? '#0f172a' : '#ffffff'} !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }

        .payment-input[type="date"],
        input[type="date"].payment-input {
          color-scheme: ${isDayMode ? 'light' : 'dark'};
        }

        ${!isDayMode ? `
        .payment-input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="date"].payment-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.95;
          filter: brightness(0) invert(1) drop-shadow(0 0 1px rgba(255, 255, 255, 0.6));
          transition: opacity 0.2s, transform 0.15s, filter 0.2s;
        }

        .payment-input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="date"].payment-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
          transform: scale(1.15);
          filter: brightness(0) invert(1) drop-shadow(0 0 3px rgba(255, 255, 255, 0.9));
        }
        ` : `
        .payment-input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="date"].payment-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.8;
          filter: none;
          transition: opacity 0.2s, transform 0.15s;
        }

        .payment-input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="date"].payment-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
          transform: scale(1.15);
        }
        `}
      `}} />

      {/* HEADER & TOP NAV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('paymentManagerTitle', 'Payment Manager')}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('paymentManagerSubtitle', 'Manage payment transactions, Stripe/PayPal webhooks, and gateway currencies.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
          >
            <PlusCircle className="h-4 w-4" /> {t('addPaymentBtn', 'Add Payment')}
          </button>
          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('managePlans', 'Manage Plans')}
          </Link>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div 
        className="flex items-center gap-2 p-1.5 rounded-2xl border w-fit shadow-xs transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={{
            backgroundColor: activeTab === 'history' ? 'var(--color-primary, #E05638)' : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : (isDayMode ? '#64748b' : '#94a3b8')
          }}
        >
          <History className="h-4 w-4" /> {t('paymentHistoryTab', 'Payment History')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={{
            backgroundColor: activeTab === 'settings' ? 'var(--color-primary, #E05638)' : 'transparent',
            color: activeTab === 'settings' ? '#ffffff' : (isDayMode ? '#64748b' : '#94a3b8')
          }}
        >
          <Sliders className="h-4 w-4" /> {t('gatewaySettingsTab', 'Gateway Settings')}
        </button>
      </div>

      {feedback && (
        <div
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in"
          style={{
            backgroundColor: feedback.type === 'success' 
              ? (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)') 
              : (isDayMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)'),
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
            color: feedback.type === 'success' ? (isDayMode ? '#047857' : 'var(--color-emerald, #10b981)') : (isDayMode ? '#b91c1c' : '#fca5a5')
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {activeTab === 'history' ? (
        <div className="space-y-6">
          {/* GATEWAY STATUS & MONITOR BAR */}
          <div
            className="p-3 px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'rgba(17, 23, 38, 0.7)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> {t('gatewayEngine', 'Gateway Engine')}
              </span>
              <span 
                className="font-extrabold uppercase px-2.5 py-0.5 rounded text-[11px] border"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff',
                  borderColor: isDayMode ? '#cbd5e1' : '#334155'
                }}
              >
                {config.activeGateway}
              </span>
              <span 
                className="font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs"
                style={{
                  backgroundColor: config.testMode 
                    ? (isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.12)') 
                    : (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)'),
                  borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald, #10b981)',
                  color: config.testMode ? (isDayMode ? '#b45309' : '#fbbf24') : (isDayMode ? '#047857' : 'var(--color-emerald, #10b981)')
                }}
              >
                {config.testMode ? t('sandboxTest', 'Sandbox Test') : t('liveProduction', 'Live Production')}
              </span>
            </div>

            <div className="flex items-center gap-4 font-semibold text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <div>
                {t('currencyLabel', 'Currency:')} <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{config.currency} ({activeCurrencySymbol})</span>
              </div>
              <div>
                {t('stripeLabel', 'Stripe:')}{' '}
                <span className={`font-bold ${config.stripeConnected ? (isDayMode ? 'text-emerald-600' : 'text-emerald-400') : (isDayMode ? 'text-slate-500' : 'text-slate-400')}`}>
                  {config.stripeConnected ? t('connectedStatus', 'Connected') : t('notConnectedStatus', 'Not Connected')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="font-bold text-[11px] hover:underline transition cursor-pointer"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {t('changeCurrencyKeys', 'Change currency & keys')}
              </button>
            </div>
          </div>

          {/* KPI STATS TILES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('totalRevenueTitle', 'Total Revenue')}
              </div>
              <div className="text-2xl font-black flex items-baseline gap-1" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <span>{activeCurrencySymbol}{metrics.totalRevenue.toFixed(2)}</span>
                <span className="text-[10px] font-semibold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{config.currency}</span>
              </div>
            </div>

            <div 
              className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('successfulPaymentsTitle', 'Successful Payments')}
              </div>
              <div 
                className="text-2xl font-black flex items-center gap-2"
                style={{ color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)' }}
              >
                {metrics.succeededCount}
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div 
              className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('failedPaymentsTitle', 'Failed Payments')}
              </div>
              <div className="text-2xl font-black flex items-center gap-2" style={{ color: isDayMode ? '#b91c1c' : '#f87171' }}>
                {metrics.failedCount}
                <XCircle className="h-4 w-4" />
              </div>
            </div>

            <div 
              className="border p-4 rounded-2xl shadow-sm space-y-1 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('cancelledTitle', 'Refunded / Cancelled')}
              </div>
              <div className="text-2xl font-black flex items-center gap-2" style={{ color: isDayMode ? '#b45309' : '#fbbf24' }}>
                {metrics.refundedCount}
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* SEARCH, FILTERS & BULK ACTIONS BAR */}
          <div 
            className="border p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
              <input
                type="text"
                placeholder={t('searchPaymentPlaceholder', 'Search by customer name, email, or plan...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="payment-input w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition font-medium"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
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
                <Filter className="h-3.5 w-3.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  <option value="all">{t('allStatuses', 'All Statuses')}</option>
                  <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
                  <option value="failed">{t('statusFailed', 'Failed')}</option>
                  <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
                  <option value="pending">{t('statusPending', 'Pending')}</option>
                </select>
              </div>

              <select
                value={gatewayFilter}
                onChange={(e) => setGatewayFilter(e.target.value as any)}
                className="border rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              >
                <option value="all">{t('allGateways', 'All Gateways')}</option>
                <option value="stripe">{t('gatewayStripe', 'Stripe')}</option>
                <option value="paypal">{t('gatewayPaypal', 'PayPal')}</option>
                <option value="manual">{t('gatewayManual', 'Manual')}</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#334155' : '#cbd5e1'
                }}
              >
                <option value={5}>{t('perPage5', '5 per page')}</option>
                <option value={10}>{t('perPage10', '10 per page')}</option>
                <option value={20}>{t('perPage20', '20 per page')}</option>
                <option value={50}>{t('perPage50', '50 per page')}</option>
              </select>
            </div>
          </div>

          {/* ACTIVE MULTI-SELECT BANNER */}
          {selectedTxIds.length > 0 && (
            <div
              className="p-3 px-4 rounded-2xl border flex items-center justify-between text-xs animate-in fade-in"
              style={{
                backgroundColor: isDayMode ? '#fee2e2' : 'rgba(239, 68, 68, 0.12)',
                borderColor: isDayMode ? '#fca5a5' : 'rgba(239, 68, 68, 0.35)',
                color: isDayMode ? '#991b1b' : '#fca5a5',
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
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
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

          {/* TRANSACTIONS TABLE */}
          <div 
            className="border rounded-3xl overflow-hidden shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead 
                  className="font-bold uppercase tracking-wider border-b transition-colors duration-200"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'rgba(11, 16, 29, 0.7)',
                    borderColor: isDayMode ? '#e2e8f0' : '#1e293b',
                    color: isDayMode ? '#64748b' : '#94a3b8'
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
                    <th className="px-5 py-3.5">{t('customerCol', 'Customer')}</th>
                    <th className="px-5 py-3.5">{t('planCol', 'Plan')}</th>
                    <th className="px-5 py-3.5">{t('amountCol', 'Amount')}</th>
                    <th className="px-5 py-3.5">{t('statusCol', 'Status')}</th>
                    <th className="px-5 py-3.5">{t('dateCol', 'Date')}</th>
                    <th className="px-5 py-3.5">{t('expiryDateCol', 'Expiry Date')}</th>
                    <th className="px-5 py-3.5 text-right">{t('actionsCol', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody 
                  className="divide-y transition-colors duration-200"
                  style={{ borderColor: isDayMode ? '#e2e8f0' : 'rgba(30, 41, 59, 0.6)' }}
                >
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 font-medium" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                        {t('noTransactionsFound', 'No payment transactions found matching your criteria.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const txSymbol = getCurrencySymbol(tx.currency || config.currency);
                      const isRowSelected = selectedTxIds.includes(tx.id);
                      const isTxCancelled = isRefunded(tx.status);

                      return (
                        <tr 
                          key={tx.id} 
                          className={`transition ${
                            isRowSelected 
                              ? (isDayMode ? 'bg-red-50' : 'bg-red-950/20') 
                              : (isDayMode ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40')
                          }`}
                        >
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleSelectRow(tx.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{tx.customerName || 'Customer'}</div>
                            <div className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{tx.customerEmail || ''}</div>
                          </td>
                          <td className="px-5 py-3.5 font-semibold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                            {tx.planName || tx.planSlug || 'Plan'}
                          </td>
                          <td className="px-5 py-3.5 font-bold whitespace-nowrap" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                            {txSymbol}{parseAmount(tx.amount).toFixed(2)}{' '}
                            <span className="text-[10px] font-normal" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{tx.currency || config.currency}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            {isSucceeded(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                                  borderColor: 'var(--color-emerald, #10b981)',
                                  color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3" /> {t('statusSucceeded', 'Succeeded')}
                              </span>
                            )}
                            {isFailed(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs cursor-help"
                                style={{
                                  backgroundColor: isDayMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
                                  borderColor: '#ef4444',
                                  color: isDayMode ? '#b91c1c' : '#f87171'
                                }}
                                title={tx.failureReason || 'Declined by payment processor'}
                              >
                                <XCircle className="h-3 w-3" /> {t('statusFailed', 'Failed')}
                              </span>
                            )}
                            {isRefunded(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                                  borderColor: '#f59e0b',
                                  color: isDayMode ? '#b45309' : '#fbbf24'
                                }}
                              >
                                <ArrowDownLeft className="h-3 w-3" /> {t('statusRefunded', 'Refunded')}
                              </span>
                            )}
                            {isPending(tx.status) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: isDayMode ? '#f1f5f9' : '#1e293b',
                                  borderColor: isDayMode ? '#cbd5e1' : '#334155',
                                  color: isDayMode ? '#334155' : '#cbd5e1'
                                }}
                              >
                                <RefreshCw className="h-3 w-3 animate-spin" /> {t('statusPending', 'Pending')}
                              </span>
                            )}
                          </td>
                          
                          <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}
                          </td>
                          
                          <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                            {tx.expiryDate ? (() => {
                              const exp = new Date(tx.expiryDate);
                              const now = new Date();
                              const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              const expMidnight = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
                              const diffDays = Math.ceil((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

                              let badgeStyle = isDayMode 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400';
                              let badgeNotice = '';

                              if (diffDays < 0) {
                                badgeStyle = isDayMode
                                  ? 'bg-red-50 border-red-300 text-red-800'
                                  : 'bg-red-950/50 border-red-600/70 text-red-400';
                                badgeNotice = t('expiredBadge', 'EXPIRED');
                              } else if (diffDays <= 7) {
                                badgeStyle = isDayMode
                                  ? 'bg-orange-50 border-orange-300 text-orange-800'
                                  : 'bg-orange-950/50 border-orange-500/70 text-orange-400';
                              }

                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold text-[11px] transition shadow-xs ${badgeStyle}`}
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
                              <span className="text-[11px] italic font-normal" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                                {t('lifetimeNone', 'Lifetime / None')}
                              </span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isTxCancelled}
                                onClick={() => handleOpenEditModal(tx)}
                                className={`p-1.5 rounded-lg border transition shadow-xs ${
                                  isTxCancelled
                                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                                    : 'cursor-pointer'
                                }`}
                                style={{
                                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                                }}
                                title={isTxCancelled ? t('cannotModifyCancelledTooltip', 'Cannot modify cancelled or refunded plan') : t('modifyPaymentTooltip', 'Modify payment record & expiration')}
                              >
                                <Pencil 
                                  className="h-3.5 w-3.5" 
                                  style={{ color: isTxCancelled ? (isDayMode ? '#94a3b8' : '#64748b') : 'var(--color-primary, #E05638)' }} 
                                />
                              </button>
                              <button
                                type="button"
                                disabled={isTxCancelled}
                                onClick={() => handleCancelPlan(tx)}
                                className={`p-1.5 rounded-lg border transition shadow-xs ${
                                  isTxCancelled
                                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                                    : 'text-amber-500 hover:text-amber-600 cursor-pointer'
                                }`}
                                style={{
                                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                                }}
                                title={isTxCancelled ? t('planAlreadyCancelledTooltip', 'Plan already cancelled or refunded') : t('cancelPlanTooltip', 'Cancel plan & reset user to Free')}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id, tx.customerName)}
                                className="p-1.5 rounded-lg border transition cursor-pointer hover:text-red-500 shadow-xs"
                                style={{
                                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                                  color: isDayMode ? '#64748b' : '#94a3b8'
                                }}
                                title={t('deletePaymentTooltip', 'Delete payment record permanently')}
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

            {/* PAGINATION CONTROLS */}
            <div 
              className="px-5 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'rgba(11, 16, 29, 0.6)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="font-semibold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('showing', 'Showing')}{' '}
                <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                {t('to', 'to')}{' '}
                <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {Math.min(currentPage * pageSize, filteredTransactions.length)}
                </span>{' '}
                {t('of', 'of')} <span className="font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{filteredTransactions.length}</span> {t('resultsSuffix', 'results')}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
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
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
                  }}
                  title={t('previousPageTooltip', 'Previous Page')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="px-3 py-1 font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {t('page', 'Page')} {currentPage} {t('of', 'of')} {totalPages}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
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
                    backgroundColor: isDayMode ? '#ffffff' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#cbd5e1'
                  }}
                  title={t('lastPageTooltip', 'Last Page')}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GATEWAY SETTINGS FORM */
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div 
            className="border p-6 rounded-3xl shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  <Globe className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('processingCurrencyTitle', 'Processing Currency')}
                </h2>
                <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {t('processingCurrencySub', 'Select the default currency for processing subscriptions and recording transactions.')}
                </p>
              </div>

              <div className="w-full sm:w-80">
                <select
                  value={config.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="payment-input w-full border rounded-xl p-3 text-xs font-bold outline-none transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
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
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Shield className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('defaultGatewayTitle', 'Default Payment Gateway')}
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>{t('environmentLabel', 'Environment:')}</label>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, testMode: !config.testMode })}
                  className="text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: config.testMode 
                      ? (isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)') 
                      : (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)'),
                    borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald, #10b981)',
                    color: config.testMode ? (isDayMode ? '#b45309' : '#fbbf24') : (isDayMode ? '#047857' : 'var(--color-emerald, #10b981)')
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
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                  borderColor: config.activeGateway === 'stripe' ? 'var(--color-primary, #E05638)' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Stripe</span>
                    {config.activeGateway === 'stripe' && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                  borderColor: config.activeGateway === 'paypal' ? 'var(--color-primary, #E05638)' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>PayPal</span>
                    {config.activeGateway === 'paypal' && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                  borderColor: config.activeGateway === 'both' ? 'var(--color-primary, #E05638)' : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {t('multiGatewayCardTitle', 'Both Gateways')}
                    </span>
                    {config.activeGateway === 'both' && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h3 className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('stripeApiConfig', 'Stripe API Configuration')}</h3>
                </div>
                <input
                  type="checkbox"
                  checked={config.stripe.enabled}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
                />
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-xs font-bold block" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
                        backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                        borderColor: 'var(--color-emerald, #10b981)',
                        color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> {t('connectedStatus', 'Connected')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'rgba(30, 41, 59, 0.6)' }}>
                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('publishableKeyLabel', 'Publishable Key')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['stripePublishable'] ? 'text' : 'password'}
                      value={config.stripe.publishableKey}
                      onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, publishableKey: e.target.value } })}
                      placeholder="pk_test_... / pk_live_..."
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('stripePublishable')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                    >
                      {visibleFields['stripePublishable'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('secretKeyLabel', 'Secret Key')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['stripeSecret'] ? 'text' : 'password'}
                      value={config.stripe.secretKey}
                      onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, secretKey: e.target.value } })}
                      placeholder="sk_test_... / sk_live_..."
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('stripeSecret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                    >
                      {visibleFields['stripeSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('webhookSecretLabel', 'Webhook Secret')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['stripeWebhook'] ? 'text' : 'password'}
                      value={config.stripe.webhookSecret}
                      onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                      placeholder="whsec_..."
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('stripeWebhook')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
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
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <h3 className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{t('paypalApiConfig', 'PayPal API Configuration')}</h3>
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
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('clientIdLabel', 'Client ID')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['paypalClientId'] ? 'text' : 'password'}
                      value={config.paypal.clientId}
                      onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                      placeholder="PayPal Client ID"
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('paypalClientId')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                    >
                      {visibleFields['paypalClientId'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('clientSecretLabel', 'Client Secret')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['paypalSecret'] ? 'text' : 'password'}
                      value={config.paypal.clientSecret}
                      onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientSecret: e.target.value } })}
                      placeholder="PayPal Client Secret"
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('paypalSecret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                    >
                      {visibleFields['paypalSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('webhookIdLabel', 'Webhook ID')}
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields['paypalWebhook'] ? 'text' : 'password'}
                      value={config.paypal.webhookId}
                      onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, webhookId: e.target.value } })}
                      placeholder="PayPal Webhook ID"
                      className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('paypalWebhook')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                      style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
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
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-card, #111726)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#334155' : '#cbd5e1'
              }}
            >
              <RefreshCw className="h-4 w-4" /> {t('resetConfigBtn', 'Reset Config')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 text-white font-bold rounded-2xl transition text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
            >
              <Save className="h-4 w-4" />
              {loading ? t('savingSettings', 'Saving Settings...') : t('saveConfigBtn', 'Save Gateway Settings')}
            </button>
          </div>
        </form>
      )}

      {/* 1. ADD PAYMENT MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default max-h-[92vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-bg, #0B101D)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <PlusCircle className="h-5 w-5" /> {t('addPaymentModalTitle', 'Record Payment & Assign Plan')}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('addPaymentModalSub', 'Manually record a payment transaction and immediately activate the subscription for a user.')}
              </p>
            </div>

            {planTransitionInfo?.isTransition && (
              <div 
                className="p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in shadow-xs"
                style={{
                  backgroundColor: isDayMode ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)',
                  borderColor: isDayMode ? '#bfdbfe' : 'rgba(59, 130, 246, 0.4)',
                  color: isDayMode ? '#1e40af' : '#93c5fd'
                }}
              >
                <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">{t('planChangeNotice', 'Plan Upgrade / Downgrade Notice:')}</div>
                  <div className="text-[11px] leading-relaxed">
                    {planTransitionInfo.message}
                  </div>
                </div>
              </div>
            )}

            {planTransitionInfo?.isDuplicate && (
              <div 
                className="p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in shadow-xs"
                style={{
                  backgroundColor: isDayMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
                  borderColor: '#ef4444',
                  color: isDayMode ? '#b91c1c' : '#fca5a5'
                }}
              >
                <Ban className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">{t('duplicatePlanWarningNotice', 'Duplicate Plan Warning:')}</div>
                  <div className="text-[11px] leading-relaxed">
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
                <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  <UserIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                  {t('selectUserLabel', 'Select User Account')} ({registeredUsers.length})
                </label>
                {registeredUsers.length > 0 ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelectChange(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold transition cursor-pointer"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    {registeredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.email} ({user.role}) [Active: {user.subscriptionPlan || 'taster'}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl border text-slate-400 text-center" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                    {t('noRegisteredUsersAvailable', 'No registered users available')}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1 flex items-center justify-between" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    {t('selectPlanLabel', 'Select Subscription Plan')}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#059669' : '#34d399' }}>
                    {t('onePlanPerEmailEnforced', 'Strictly 1 active plan per email enforced')}
                  </span>
                </label>
                <select
                  value={selectedPlanSlug}
                  onChange={(e) => handlePlanSelectChange(e.target.value)}
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                    borderColor: planTransitionInfo?.isDuplicate ? '#ef4444' : (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'),
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  {paidSubscriptionPlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug}>
                      {plan.name} — {plan.priceFormatted}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] mt-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {t('planChangeRuleNote', 'Selecting an upgraded or downgraded plan will automatically cancel and refund any previous active paid subscription.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    {t('paymentDateLabel', 'Payment Date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => handlePaymentDateChange(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    {t('expiryDateCol', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={paymentExpiryDate}
                    onChange={(e) => setPaymentExpiryDate(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('paymentAmountLabel', 'Payment Amount')} ({config.currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('paymentGatewayLabel', 'Gateway')}</label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value as any)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    {allowedGateways.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('paymentStatusLabel', 'Status')}</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
                    <option value="failed">{t('statusFailed', 'Failed')}</option>
                    <option value="pending">{t('statusPending', 'Pending')}</option>
                    <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
                  </select>
                </div>

                {isFailed(paymentStatus) && (
                  <div>
                    <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('declineFailureReasonLabel', 'Decline / Failure Reason')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Card expired or declined"
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                )}
              </div>

              {isSucceeded(paymentStatus) && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="syncUserPlanBox"
                    checked={syncUserPlan}
                    onChange={(e) => setSyncUserPlan(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#E05638]"
                  />
                  <label htmlFor="syncUserPlanBox" className="text-xs font-semibold cursor-pointer select-none" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('autoSyncPlanLabel', 'Automatically update user account to this plan and set active expiry')}
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={registeredUsers.length === 0 || Boolean(planTransitionInfo?.isDuplicate)}
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: planTransitionInfo?.isDuplicate ? '#991b1b' : 'var(--color-primary, #E05638)'
                  }}
                >
                  {planTransitionInfo?.isDuplicate ? (
                    <>
                      <Ban className="h-4 w-4" /> {t('duplicatePlanBtn', 'Duplicate Plan Exists')}
                    </>
                  ) : planTransitionInfo?.isTransition ? (
                    <>
                      <Zap className="h-4 w-4" /> {t('switchPlanBtn', 'Switch Plan & Record')}
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

      {/* 2. MODIFY (EDIT) PAYMENT MODAL */}
      {editingTx && (
        <div 
          onClick={() => setEditingTx(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default max-h-[92vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setEditingTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-bg, #0B101D)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                <Pencil className="h-5 w-5" /> {t('editPaymentModalTitle', 'Edit Payment & Subscription Record')}
              </h2>
              <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('editPaymentModalSub', 'Update transaction details, amount, or expiration date for')} <span className="font-mono font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{editingTx.customerName}</span>.
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
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('customerNameLabel', 'Customer Name')}</label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('customerEmailLabel', 'Customer Email')}</label>
                  <input
                    type="email"
                    required
                    value={editCustomerEmail}
                    onChange={(e) => setEditCustomerEmail(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('planCol', 'Plan')}</label>
                <select
                  value={editPlanSlug}
                  onChange={(e) => handleEditPlanSelectChange(e.target.value)}
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  <option value="">Custom: {editPlanName}</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.id || plan.slug} value={plan.slug}>
                      {plan.name} — {plan.priceFormatted}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                    {t('dateCol', 'Date')}
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    {t('expiryDateCol', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-medium transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                    {t('paymentAmountLabel', 'Payment Amount')} ({editingTx.currency || config.currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('paymentGatewayLabel', 'Gateway')}</label>
                  <select
                    value={editGateway}
                    onChange={(e) => setEditGateway(e.target.value as any)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <option value="stripe">{t('gatewayStripe', 'Stripe')}</option>
                    <option value="paypal">{t('gatewayPaypal', 'PayPal')}</option>
                    <option value="manual">{t('gatewayManual', 'Manual')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('paymentStatusLabel', 'Status')}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
                    <option value="failed">{t('statusFailed', 'Failed')}</option>
                    <option value="pending">{t('statusPending', 'Pending')}</option>
                    <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
                  </select>
                </div>

                {isFailed(editStatus) && (
                  <div>
                    <label className="block font-bold mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('declineFailureReasonLabel', 'Decline / Failure Reason')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Card expired or declined"
                      value={editFailureReason}
                      onChange={(e) => setEditFailureReason(e.target.value)}
                      className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-bg, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                )}
              </div>

              {isSucceeded(editStatus) && editPlanSlug && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editSyncUserPlanBox"
                    checked={editSyncUserPlan}
                    onChange={(e) => setEditSyncUserPlan(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#E05638]"
                  />
                  <label htmlFor="editSyncUserPlanBox" className="text-xs font-semibold cursor-pointer select-none" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('updateUserPlanToLabel', 'Update user account plan to')} {editPlanName} {t('onePlanMaxSuffix', '(Enforces 1 plan maximum per email)')}
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-bg, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
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
