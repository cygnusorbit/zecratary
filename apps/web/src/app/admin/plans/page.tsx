// Generated / Updated by AI Collaborator
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Check, Trash2, Edit3, Sparkles, 
  RefreshCw, CheckCircle2, AlertCircle, Shield, 
  Coins, Zap, Eye, Save, Layers, ArrowRight,
  History, Search, Filter, Sliders, X, CheckCircle,
  Ban, AlertTriangle, ArrowUpRight, User as UserIcon,
  Calendar, CreditCard, ChevronLeft, ChevronRight,
  Pencil, DollarSign
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface PlanConfig {
  id: string;
  name: string;
  slug: string;
  planGroupId?: string;
  monthlyPlanId?: string;
  annualPlanId?: string;
  monthlyPriceDollars: number;
  annualPriceDollars: number;
  monthlyBadge?: string;
  annualBadge?: string;
  trialBadge?: string;
  descriptionMonthly?: string;
  descriptionAnnual?: string;
  features: string[];
  tokenLimit: number;
  aiRecipeLimit?: number;
  recipeLibraryLimit?: number;
  socialScrapeLimit?: number;
  canViewMacros?: boolean;
  allowedAiModels?: string;
  isFree?: boolean;
  isDefault?: boolean;
}

interface PaymentTransaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug?: string;
  amount: number;
  currency: string;
  gateway: 'stripe' | 'paypal' | 'manual' | string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending' | 'canceled';
  failureReason?: string;
  testMode?: boolean;
  createdAt: string;
  expiryDate?: string;
  isRecurring?: boolean;
  recurringInterval?: 'MONTH' | 'YEAR';
  autoRenew?: boolean;
  gatewayTransactionId?: string;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionPlan?: string;
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  priceFormatted: string;
  priceDollars: number;
  interval?: 'MONTH' | 'YEAR';
  isFree?: boolean;
}

const SUPPORTED_CURRENCIES: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
  JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
};

const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  if (Array.isArray(planInput)) return planInput[0] ? String(planInput[0]).trim() : 'taster';
  if (typeof planInput === 'string') {
    if (planInput.includes(',')) {
      const parts = planInput.split(',').map((s) => s.trim()).filter(Boolean);
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

const isCanceled = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'canceled' || s === 'cancelled';
};

const isRefunded = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'refunded' || s === 'refund';
};

const isFailed = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'failed' || s === 'declined' || s === 'fail' || s === 'error';
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
    recurringInterval: (raw.recurringInterval || raw.recurring_interval || (String(raw.planSlug || raw.plan_slug || '').includes('annual') ? 'YEAR' : 'MONTH')) as any,
    autoRenew,
    gatewayTransactionId: raw.gatewayTransactionId || raw.gateway_transaction_id || raw.transaction_id || undefined
  };
};

export default function AdminPlansPage() {
  const { t } = useTranslation();
  
  // Navigation Tabs State
  const [activeMainTab, setActiveMainTab] = useState<'plans' | 'transactions'>('plans');

  // Shared System & Identity States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [previewInterval, setPreviewInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Dynamic Token & Currency Identity
  const [tokenSymbol, setTokenSymbol] = useState('🪙');
  const [tokenName, setTokenName] = useState('Tokens');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Plan Form State (Tab 1: Plans)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [planGroupId, setPlanGroupId] = useState('');
  const [monthlyPlanId, setMonthlyPlanId] = useState('');
  const [annualPlanId, setAnnualPlanId] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(8.99);
  const [annualPrice, setAnnualPrice] = useState<number>(59.99);
  const [tokenLimit, setTokenLimit] = useState<number>(500);
  const [monthlyBadge, setMonthlyBadge] = useState('');
  const [annualBadge, setAnnualBadge] = useState('Best Value');
  const [trialBadge, setTrialBadge] = useState('');
  const [descriptionMonthly, setDescriptionMonthly] = useState('');
  const [descriptionAnnual, setDescriptionAnnual] = useState('');
  const [featuresText, setFeaturesText] = useState('Personal recipe library\nSmart ingredient repurposing\nAutomated shopping list creation');
  const [isFree, setIsFree] = useState(false);

  // Transactions State (Tab 2: Plan Transactions)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'canceled' | 'failed' | 'refunded' | 'pending'>('all');
  const [gatewayFilter, setGatewayFilter] = useState<'all' | 'stripe' | 'paypal' | 'manual'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [togglingTxId, setTogglingTxId] = useState<string | null>(null);

  // Modal States for Transactions
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Add Transaction Form States
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(8.99);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentExpiryDate, setPaymentExpiryDate] = useState('');
  const [paymentGateway, setPaymentGateway] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [paymentStatus, setPaymentStatus] = useState<'succeeded' | 'pending'>('succeeded');
  const [isPaymentRecurring, setIsPaymentRecurring] = useState(true);

  // Edit Transaction Form States
  const [editingTx, setEditingTx] = useState<PaymentTransaction | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editPlanSlug, setEditPlanSlug] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editGateway, setEditGateway] = useState<string>('stripe');
  const [editStatus, setEditStatus] = useState<string>('succeeded');
  const [editFailureReason, setEditFailureReason] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(true);

  // Dynamic Theme Synchronization
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const root = typeof document !== 'undefined' ? document.documentElement : null;
      const day = mode === 'light' || mode === 'day' || (root && root.classList.contains('light'));
      setIsDayMode(Boolean(day));
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
    };
  }, [applySavedTheme]);

  // Sync token and currency settings
  const fetchSettings = useCallback(async () => {
    try {
      const tRes = await fetch('/api/admin/token-setting', { cache: 'no-store' });
      if (tRes.ok) {
        const tData = await tRes.json();
        const cfg = tData.settings || tData.config || tData;
        if (cfg) {
          if (cfg.tokenSymbol || cfg.symbol) setTokenSymbol(cfg.tokenSymbol || cfg.symbol);
          if (cfg.tokenName || cfg.name) setTokenName(cfg.tokenName || cfg.name);
        }
      }
    } catch (_) {}

    try {
      const sRes = await fetch('/api/system-settings', { cache: 'no-store' });
      if (sRes.ok) {
        const sData = await sRes.json();
        const curr = sData?.settings?.currency || sData?.currency;
        if (curr) {
          setCurrencyCode(curr);
          setCurrencySymbol(SUPPORTED_CURRENCIES[curr.toUpperCase()] || '$');
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchSettings();
    window.addEventListener('zecratary_token_settings_updated', fetchSettings);
    window.addEventListener('zecratary_admin_settings_updated', fetchSettings);

    return () => {
      window.removeEventListener('zecratary_token_settings_updated', fetchSettings);
      window.removeEventListener('zecratary_admin_settings_updated', fetchSettings);
    };
  }, [fetchSettings]);

  // Universal Plan Parser
  const normalizePlan = (p: any): PlanConfig => {
    const isFreePlan = Boolean(
      p.isFree || p.is_free || p.free || 
      p.slug === 'taster' || p.id === 'preset_taster' ||
      (Number(p.monthlyPriceDollars ?? p.monthly_price_dollars ?? 0) === 0 && 
       Number(p.annualPriceDollars ?? p.annual_price_dollars ?? 0) === 0)
    );

    let rawFeatures: string[] = [];
    if (Array.isArray(p.features)) {
      rawFeatures = p.features.map(String).filter(Boolean);
    } else if (typeof p.features === 'string') {
      try {
        const parsed = JSON.parse(p.features);
        if (Array.isArray(parsed)) rawFeatures = parsed.map(String).filter(Boolean);
        else rawFeatures = p.features.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      } catch (_) {
        rawFeatures = p.features.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const mPrice = Number(p.monthlyPriceDollars ?? p.monthly_price_dollars ?? p.price ?? 0);
    const aPrice = Number(p.annualPriceDollars ?? p.annual_price_dollars ?? (mPrice > 0 ? mPrice * 10 : 0));
    const cleanSlug = String(p.slug || p.id || 'plan').toLowerCase().trim();

    return {
      id: String(p.id || cleanSlug),
      name: String(p.name || cleanSlug),
      slug: cleanSlug,
      planGroupId: p.planGroupId || p.plan_group_id || `group_${cleanSlug}`,
      monthlyPlanId: p.monthlyPlanId || p.monthly_plan_id || `plan_${cleanSlug}_monthly`,
      annualPlanId: p.annualPlanId || p.annual_plan_id || `plan_${cleanSlug}_annual`,
      monthlyPriceDollars: isFreePlan ? 0 : (isNaN(mPrice) ? 0 : mPrice),
      annualPriceDollars: isFreePlan ? 0 : (isNaN(aPrice) ? 0 : aPrice),
      monthlyBadge: p.monthlyBadge || p.monthly_badge || '',
      annualBadge: p.annualBadge || p.annual_badge || '',
      trialBadge: p.trialBadge || p.trial_badge || '',
      descriptionMonthly: p.descriptionMonthly || p.description_monthly || '',
      descriptionAnnual: p.descriptionAnnual || p.description_annual || '',
      features: rawFeatures,
      tokenLimit: p.tokenLimit !== undefined ? Number(p.tokenLimit) : (p.token_limit !== undefined ? Number(p.token_limit) : (isFreePlan ? 50000 : 500)),
      isFree: isFreePlan,
      isDefault: Boolean(p.isDefault || p.is_default || cleanSlug === 'taster' || p.id === 'preset_taster')
    };
  };

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      const rawList = Array.isArray(data) 
        ? data 
        : (data.configs || data.plans || data.packages || data.subscriptionPlans || data.data || []);
      
      if (Array.isArray(rawList)) {
        setPlans(rawList.map(normalizePlan));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Users for Transaction Association
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
          if (data.users.length > 0 && !selectedUserId) {
            setSelectedUserId(data.users[0].id);
          }
        }
      }
    } catch (_) {}
  }, [selectedUserId]);

  // Fetch Payment Transactions (Tab 2: Plan Transactions)
  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const res = await fetch('/api/admin/payment?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          const list = data.transactions.map((tx: any) => normalizeTransaction(tx, currencyCode));
          setTransactions(list);
        }
      }
    } catch (_) {
    } finally {
      setLoadingTransactions(false);
    }
  }, [currencyCode]);

  useEffect(() => {
    fetchPlans();
    fetchUsers();
    fetchTransactions();

    const handleSync = () => {
      fetchPlans();
      fetchUsers();
      fetchTransactions();
    };

    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_users_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_users_updated', handleSync);
    };
  }, [fetchPlans, fetchUsers, fetchTransactions]);

  // Flattened Available Plans for Payment Operations
  const availablePlanOptions = useMemo<PlanOption[]>(() => {
    const list: PlanOption[] = [];
    plans.forEach((p) => {
      if (p.isFree || p.slug === 'taster') return;
      if (p.monthlyPriceDollars > 0) {
        list.push({
          id: p.monthlyPlanId || `${p.slug}-monthly`,
          name: `${p.name} (Monthly)`,
          slug: `${p.slug}-monthly`,
          priceFormatted: `${currencySymbol}${p.monthlyPriceDollars.toFixed(2)}/mo`,
          priceDollars: p.monthlyPriceDollars,
          interval: 'MONTH',
          isFree: false
        });
      }
      if (p.annualPriceDollars > 0) {
        list.push({
          id: p.annualPlanId || `${p.slug}-annual`,
          name: `${p.name} (Annual)`,
          slug: `${p.slug}-annual`,
          priceFormatted: `${currencySymbol}${p.annualPriceDollars.toFixed(2)}/yr`,
          priceDollars: p.annualPriceDollars,
          interval: 'YEAR',
          isFree: false
        });
      }
    });
    return list;
  }, [plans, currencySymbol]);

  // Plan Slug Change Helper
  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setSlug(clean);
    if (!editingId) {
      setPlanGroupId(`group_${clean}`);
      setMonthlyPlanId(`plan_${clean}_monthly`);
      setAnnualPlanId(`plan_${clean}_annual`);
    }
  };

  const handleEdit = (p: PlanConfig) => {
    setActiveMainTab('plans');
    setEditingId(p.id);
    setName(p.name);
    setSlug(p.slug);
    setPlanGroupId(p.planGroupId || `group_${p.slug}`);
    setMonthlyPlanId(p.monthlyPlanId || `plan_${p.slug}_monthly`);
    setAnnualPlanId(p.annualPlanId || `plan_${p.slug}_annual`);
    setMonthlyPrice(Number(p.monthlyPriceDollars || 0));
    setAnnualPrice(Number(p.annualPriceDollars || 0));
    setTokenLimit(Number(p.tokenLimit ?? 500));
    setMonthlyBadge(p.monthlyBadge || '');
    setAnnualBadge(p.annualBadge || '');
    setTrialBadge(p.trialBadge || '');
    setDescriptionMonthly(p.descriptionMonthly || '');
    setDescriptionAnnual(p.descriptionAnnual || '');
    setFeaturesText(Array.isArray(p.features) ? p.features.join('\n') : '');
    setIsFree(Boolean(p.isFree));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setPlanGroupId('');
    setMonthlyPlanId('');
    setAnnualPlanId('');
    setMonthlyPrice(8.99);
    setAnnualPrice(59.99);
    setTokenLimit(500);
    setMonthlyBadge('');
    setAnnualBadge('Best Value');
    setTrialBadge('');
    setDescriptionMonthly('');
    setDescriptionAnnual('');
    setFeaturesText('Personal recipe library\nSmart ingredient repurposing\nAutomated shopping list creation');
    setIsFree(false);
  };

  // Save Plan to PostgreSQL (Tab 1)
  const handleSavePlan = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const parsedFeatures = featuresText.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const planId = editingId || (cleanSlug ? `plan_${cleanSlug}` : `plan_${Date.now()}`);

      const payload = {
        id: planId,
        name: name.trim(),
        slug: cleanSlug,
        planGroupId: planGroupId.trim() || `group_${cleanSlug}`,
        monthlyPlanId: monthlyPlanId.trim() || `plan_${cleanSlug}_monthly`,
        annualPlanId: annualPlanId.trim() || `plan_${cleanSlug}_annual`,
        monthlyPriceDollars: isFree ? 0 : Number(monthlyPrice || 0),
        annualPriceDollars: isFree ? 0 : Number(annualPrice || 0),
        tokenLimit: Number(tokenLimit || 0),
        monthlyBadge: monthlyBadge.trim(),
        annualBadge: annualBadge.trim(),
        trialBadge: trialBadge.trim(),
        descriptionMonthly: descriptionMonthly.trim(),
        descriptionAnnual: descriptionAnnual.trim(),
        features: parsedFeatures,
        isFree: Boolean(isFree),
        isDefault: Boolean(editingId === 'preset_taster' || cleanSlug === 'taster')
      };

      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed saving plan configuration');
      }

      setSuccessMsg(t('planSavedSuccess', 'Subscription Plan & Token Quotas saved and synchronized with PostgreSQL!'));
      resetForm();
      await fetchPlans();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_plans_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  // Delete Plan from PostgreSQL (Tab 1)
  const handleDeletePlan = async (p: PlanConfig) => {
    if (p.isDefault || p.slug === 'taster' || p.id === 'preset_taster') {
      alert(t('cannotDeleteDefaultPlan', 'The default free plan (Taster) is required by the system and cannot be deleted.'));
      return;
    }

    const confirmMsg = `${t('confirmDeletePlan', 'Are you sure you want to permanently delete plan')} "${p.name}"? ${t('actionCannotBeUndone', 'This action cannot be undone.')}`;
    if (!confirm(confirmMsg)) return;

    setDeletingId(p.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const queryParams = new URLSearchParams();
      if (p.id) queryParams.set('id', p.id);
      if (p.slug) queryParams.set('slug', p.slug);

      const res = await fetch(`/api/admin/plans?${queryParams.toString()}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, slug: p.slug })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('failedDeletePlan', 'Failed to delete plan from database.'));
      }

      setPlans((prev) => prev.filter((item) => item.id !== p.id && item.slug !== p.slug));
      if (editingId === p.id || editingId === p.slug) resetForm();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_plans_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setSuccessMsg(`"${p.name}" ${t('planDeletedSuccess', 'has been permanently deleted from PostgreSQL.')}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || t('errorDeletingPlan', 'Error deleting plan.'));
      fetchPlans();
    } finally {
      setDeletingId(null);
    }
  };

  // -------------------------------------------------------------
  // Plan Transactions Logic (Tab 2)
  // -------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    const q = txSearchQuery.toLowerCase().trim();
    return transactions.filter((tx) => {
      const matchesSearch = !q || 
        (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
        (tx.customerEmail && tx.customerEmail.toLowerCase().includes(q)) ||
        (tx.planName && tx.planName.toLowerCase().includes(q)) ||
        (tx.planSlug && tx.planSlug.toLowerCase().includes(q)) ||
        (tx.id && tx.id.toLowerCase().includes(q));

      const s = String(tx.status || '').toLowerCase().trim();
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'succeeded') matchesStatus = isSucceeded(s);
        else if (statusFilter === 'canceled') matchesStatus = isCanceled(s);
        else if (statusFilter === 'refunded') matchesStatus = isRefunded(s);
        else if (statusFilter === 'failed') matchesStatus = isFailed(s);
        else matchesStatus = s === statusFilter;
      }

      const g = String(tx.gateway || '').toLowerCase().trim();
      const matchesGateway = gatewayFilter === 'all' || g === gatewayFilter;

      return matchesSearch && matchesStatus && matchesGateway;
    });
  }, [transactions, txSearchQuery, statusFilter, gatewayFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Inline Auto-Renew Toggle
  const handleToggleRecurring = async (tx: PaymentTransaction) => {
    const nextVal = !tx.autoRenew;
    setTogglingTxId(tx.id);

    try {
      const updatedTx = {
        ...tx,
        autoRenew: nextVal,
        isRecurring: nextVal
      };

      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_transaction',
          transaction: updatedTx
        })
      });

      if (!res.ok) throw new Error('Failed to update recurring state');

      setTransactions((prev) => prev.map((tItem) => tItem.id === tx.id ? updatedTx : tItem));
      setSuccessMsg(t('recurringUpdated', `Recurring renewal turned ${nextVal ? 'ON' : 'OFF'} for ${tx.customerName}`));
      setTimeout(() => setSuccessMsg(''), 3000);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating recurring auto-renew status');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setTogglingTxId(null);
    }
  };

  // Open Add Transaction Modal
  const handleOpenAddModal = () => {
    setModalError('');
    const today = new Date().toISOString().slice(0, 10);
    setPaymentDate(today);

    if (registeredUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(registeredUsers[0].id);
    }

    if (availablePlanOptions.length > 0) {
      const first = availablePlanOptions[0];
      setSelectedPlanSlug(first.slug);
      setPaymentAmount(first.priceDollars);
      setPaymentExpiryDate(calculateDefaultExpiry(today, first.interval || 'MONTH'));
    }

    setIsPaymentRecurring(true);
    setPaymentGateway('stripe');
    setPaymentStatus('succeeded');
    setShowAddModal(true);
  };

  const handlePlanSelectChange = (slugVal: string) => {
    setSelectedPlanSlug(slugVal);
    const matched = availablePlanOptions.find((p) => p.slug === slugVal);
    if (matched) {
      setPaymentAmount(matched.priceDollars);
      setPaymentExpiryDate(calculateDefaultExpiry(paymentDate || new Date().toISOString().slice(0, 10), matched.interval || 'MONTH'));
    }
  };

  // Submit Add Transaction (Tab 2)
  const handleSaveAddPayment = async () => {
    setModalSubmitting(true);
    setModalError('');

    try {
      const targetUser = registeredUsers.find((u) => u.id === selectedUserId);
      if (!targetUser) throw new Error('Please select a valid user');

      const matchedPlan = availablePlanOptions.find((p) => p.slug === selectedPlanSlug);
      const planTitle = matchedPlan ? matchedPlan.name : selectedPlanSlug;

      const newTx: PaymentTransaction = {
        id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        customerName: targetUser.name || 'Customer',
        customerEmail: (targetUser.email || '').toLowerCase().trim(),
        planName: planTitle,
        planSlug: selectedPlanSlug,
        amount: Number(paymentAmount || 0),
        currency: currencyCode,
        gateway: paymentGateway,
        status: paymentStatus,
        createdAt: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        expiryDate: paymentExpiryDate ? new Date(paymentExpiryDate).toISOString() : undefined,
        isRecurring: isPaymentRecurring,
        recurringInterval: selectedPlanSlug.includes('annual') ? 'YEAR' : 'MONTH',
        autoRenew: isPaymentRecurring
      };

      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_transaction',
          transaction: newTx
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record transaction');
      }

      setShowAddModal(false);
      setSuccessMsg(t('paymentRecordedSuccess', `Payment of ${currencySymbol}${Number(paymentAmount).toFixed(2)} recorded successfully in PostgreSQL!`));
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchTransactions();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      }
    } catch (err: any) {
      setModalError(err.message || 'Error recording transaction');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Edit Transaction Modal
  const handleOpenEditModal = (tx: PaymentTransaction) => {
    setEditingTx(tx);
    setEditCustomerName(tx.customerName || '');
    setEditCustomerEmail(tx.customerEmail || '');
    setEditPlanSlug(tx.planSlug || '');
    setEditPlanName(tx.planName || '');
    setEditAmount(parseAmount(tx.amount));
    setEditGateway(tx.gateway || 'stripe');
    setEditStatus(isSucceeded(tx.status) ? 'succeeded' : isCanceled(tx.status) ? 'canceled' : isFailed(tx.status) ? 'failed' : isRefunded(tx.status) ? 'refunded' : 'pending');
    setEditFailureReason(tx.failureReason || '');
    setEditDate(tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditExpiryDate(tx.expiryDate ? new Date(tx.expiryDate).toISOString().slice(0, 10) : '');
    setEditIsRecurring(tx.isRecurring !== undefined ? Boolean(tx.isRecurring) : true);
    setModalError('');
    setShowEditModal(true);
  };

  // Save Edit Transaction
  const handleSaveEditPayment = async () => {
    if (!editingTx) return;
    setModalSubmitting(true);
    setModalError('');

    try {
      const updatedTx = {
        ...editingTx,
        customerName: editCustomerName.trim(),
        customerEmail: editCustomerEmail.trim().toLowerCase(),
        planName: editPlanName.trim(),
        planSlug: editPlanSlug.trim(),
        amount: Number(editAmount || 0),
        gateway: editGateway,
        status: editStatus as any,
        failureReason: editFailureReason.trim() || undefined,
        createdAt: editDate ? new Date(editDate).toISOString() : editingTx.createdAt,
        expiryDate: editExpiryDate ? new Date(editExpiryDate).toISOString() : undefined,
        isRecurring: editIsRecurring,
        autoRenew: editIsRecurring
      };

      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_transaction',
          transaction: updatedTx
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      setShowEditModal(false);
      setSuccessMsg(t('paymentUpdatedSuccess', 'Transaction successfully updated in PostgreSQL!'));
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchTransactions();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      }
    } catch (err: any) {
      setModalError(err.message || 'Error updating transaction');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (tx: PaymentTransaction) => {
    const confirmMsg = `${t('confirmDeleteTx', 'Are you sure you want to permanently delete transaction')} "${tx.id}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/payment?id=${encodeURIComponent(tx.id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete transaction from database');

      setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
      setSuccessMsg(t('txDeletedSuccess', 'Transaction permanently removed from PostgreSQL.'));
      setTimeout(() => setSuccessMsg(''), 3000);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting transaction');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

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
              className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <Zap className="h-6 w-6" style={{ color: 'var(--color-primary)' }} /> 
              {activeMainTab === 'plans' ? t('adminPlansTitle', 'Subscription Plans & Token Allocations') : t('planTransactionsTitle', 'Plan Transactions Ledger')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {activeMainTab === 'plans' 
              ? t('adminPlansSubtitle', 'Configure subscription intervals, group identifiers, and automated AI token purchase grants.')
              : t('planTransactionsSubtitle', 'Audit customer subscription plan purchase receipts, auto-renewals, and lifecycle status.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === 'transactions' && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs text-white cursor-pointer hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
            >
              <Plus className="h-3.5 w-3.5" /> {t('addPaymentBtn', 'Add Payment')}
            </button>
          )}

          <Link
            href="/admin/token-setting"
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" /> {t('viewTokenTransactions', 'Token Transactions Ledger')}
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b gap-3 sm:gap-6" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={() => setActiveMainTab('plans')}
          className="pb-3 px-2 text-sm font-black border-b-2 flex items-center gap-2 transition cursor-pointer"
          style={{
            borderColor: activeMainTab === 'plans' ? 'var(--color-primary)' : 'transparent',
            color: activeMainTab === 'plans' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
          }}
        >
          <Zap className="h-4 w-4" />
          <span>{t('tabSubscriptionPlans', 'Subscription Plans')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('transactions')}
          className="pb-3 px-2 text-sm font-black border-b-2 flex items-center gap-2 transition cursor-pointer"
          style={{
            borderColor: activeMainTab === 'transactions' ? 'var(--color-primary)' : 'transparent',
            color: activeMainTab === 'transactions' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
          }}
        >
          <History className="h-4 w-4" />
          <span>{t('tabPlanTransactions', 'Plan Transactions')}</span>
          <span 
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-xs ml-1"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {transactions.length}
          </span>
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

      {/* ========================================================= */}
      {/* TAB 1: SUBSCRIPTION PLANS (ORIGINAL DESIGN PRESERVED)     */}
      {/* ========================================================= */}
      {activeMainTab === 'plans' && (
        <div className="space-y-6">
          {/* Main Grid: Editor & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Plan Configuration Form (Replaced <form> with <div> per constraint 9) */}
            <div 
              className="lg:col-span-7 border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <h2 className="text-sm font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  <span>{editingId ? t('editPlanHeader', 'Edit Subscription Plan') : t('createNewPlanHeader', 'Create New Plan')}</span>
                </h2>
                {editingId && (
                  <div className="flex items-center gap-3">
                    {editingId !== 'preset_taster' && slug !== 'taster' && (
                      <button
                        type="button"
                        disabled={deletingId === editingId}
                        onClick={() => {
                          const matched = plans.find((p) => p.id === editingId || p.slug === editingId);
                          if (matched) handleDeletePlan(matched);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t('deletePlan', 'Delete Plan')}</span>
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={resetForm} 
                      className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold transition"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('cancelEdit', 'Cancel Edit')}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('planNameLabel', 'Plan Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nutrition Pro"
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('planSlugLabel', 'Plan Slug *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="e.g. nutrition-pro"
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none transition"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* Group & Interval Identifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('planGroupIdLabel', 'Plan Group ID')}
                  </label>
                  <input
                    type="text"
                    value={planGroupId}
                    onChange={(e) => setPlanGroupId(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('monthlyPlanIdLabel', 'Monthly Plan ID')}
                  </label>
                  <input
                    type="text"
                    value={monthlyPlanId}
                    onChange={(e) => setMonthlyPlanId(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('annualPlanIdLabel', 'Annual Plan ID')}
                  </label>
                  <input
                    type="text"
                    value={annualPlanId}
                    onChange={(e) => setAnnualPlanId(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* Pricing & AI Token Allowance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('monthlyPriceLabel', 'Monthly Price')} ({currencySymbol} {currencyCode})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={isFree}
                    value={isFree ? 0 : monthlyPrice}
                    onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('annualPriceLabel', 'Annual Price')} ({currencySymbol} {currencyCode})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={isFree}
                    value={isFree ? 0 : annualPrice}
                    onChange={(e) => setAnnualPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                {/* AI Token Allowance on Purchase */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{t('tokenAllowanceLabel', 'Token Grant on Purchase')}</span>
                    <span className="text-amber-500 font-bold">{tokenSymbol}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tokenLimit}
                    onChange={(e) => setTokenLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-black outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('tokenGrantHelp', 'When a user purchases this plan, these tokens are credited to their balance and an audit record appears on /admin/token-setting.')}
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('planFeaturesListLabel', 'Plan Features (One per line)')}
                </label>
                <textarea
                  rows={3}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs font-medium outline-none transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsFree(val);
                      if (val) {
                        setMonthlyPrice(0);
                        setAnnualPrice(0);
                      }
                    }}
                    className="rounded w-4 h-4 cursor-pointer accent-[#10b981]"
                  />
                  <span>{t('isFreeTierLabel', 'Mark as Free Tier')}</span>
                </label>

                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={saving || !name.trim()}
                  className="px-6 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{editingId ? t('updatePlanBtn', 'Update Plan & Tokens') : t('createPlanBtn', 'Create Plan & Publish')}</span>
                </button>
              </div>
            </div>

            {/* Live Mockup Preview */}
            <div 
              className="lg:col-span-5 border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
                    <h3 className="text-sm font-black" style={{ color: 'var(--color-text)' }}>
                      {t('planCardMockup', 'Live Card Mockup')}
                    </h3>
                  </div>
                  <div className="flex p-0.5 rounded-lg border text-[10px] font-bold" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewInterval('MONTH')}
                      className="px-2.5 py-1 rounded-md transition cursor-pointer"
                      style={previewInterval === 'MONTH' ? {
                        backgroundColor: 'var(--color-primary)',
                        color: '#ffffff'
                      } : {
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewInterval('YEAR')}
                      className="px-2.5 py-1 rounded-md transition cursor-pointer"
                      style={previewInterval === 'YEAR' ? {
                        backgroundColor: 'var(--color-primary)',
                        color: '#ffffff'
                      } : {
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      Annual
                    </button>
                  </div>
                </div>

                {/* Mockup Card */}
                <div 
                  className="p-5 rounded-2xl border space-y-4 relative shadow-inner"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>
                        {name || 'Plan Preview'}
                      </h4>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        ID: {previewInterval === 'MONTH' ? (monthlyPlanId || 'plan_monthly') : (annualPlanId || 'plan_annual')}
                      </p>
                    </div>
                    <span 
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      {previewInterval === 'MONTH' ? (monthlyBadge || 'Monthly') : (annualBadge || 'Annual')}
                    </span>
                  </div>

                  {/* Price & Token Allowance Display */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ color: 'var(--color-text)' }}>
                      {currencySymbol}{previewInterval === 'MONTH' 
                        ? (isFree ? '0.00' : Number(monthlyPrice || 0).toFixed(2)) 
                        : (isFree ? '0.00' : Number(annualPrice || 0).toFixed(2))}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      /{previewInterval === 'MONTH' ? 'mo' : 'yr'}
                    </span>
                  </div>

                  {/* Token Allocation Badge in Card */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    <Coins className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                      <span>+{Number(tokenLimit || 0).toLocaleString()} {tokenSymbol}</span>{' '}
                      <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('creditedUponPurchase', 'credited instantly on purchase')}
                      </span>
                    </div>
                  </div>

                  {/* Features snippet */}
                  <ul className="space-y-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {featuresText.split(/\r?\n/).slice(0, 4).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-emerald)' }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t text-[11px] flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Parent Group: {planGroupId || 'None'}</span>
                <span className="font-mono font-bold" style={{ color: 'var(--color-emerald)' }}>PostgreSQL Synced</span>
              </div>
            </div>
          </div>

          {/* Configured Plans List Table */}
          <div 
            className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('publishedPlansTable', 'Configured Subscription Plans in PostgreSQL')}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                {plans.length} {t('plansCount', 'Plans')}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <th className="p-3.5">Plan Name / Slug</th>
                    <th className="p-3.5">Interval IDs</th>
                    <th className="p-3.5">Pricing</th>
                    <th className="p-3.5">AI Token Allowance</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <RefreshCw className="h-4 w-4 animate-spin inline mr-2" style={{ color: 'var(--color-primary)' }} /> Loading plans...
                      </td>
                    </tr>
                  ) : plans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        No subscription plans configured yet.
                      </td>
                    </tr>
                  ) : (
                    plans.map((p) => {
                      const isProtected = p.isDefault || p.slug === 'taster' || p.id === 'preset_taster';
                      return (
                        <tr key={p.id} className="hover:bg-slate-500/5 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{p.name}</div>
                            <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>{p.slug}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5 text-[10px] font-mono">
                              <div style={{ color: '#60a5fa' }}>M: {p.monthlyPlanId || `plan_${p.slug}_monthly`}</div>
                              <div style={{ color: '#c084fc' }}>A: {p.annualPlanId || `plan_${p.slug}_annual`}</div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono font-bold">
                            {p.isFree ? (
                              <span className="font-bold" style={{ color: 'var(--color-emerald)' }}>Free</span>
                            ) : (
                              <div>
                                <div>{currencySymbol}{Number(p.monthlyPriceDollars || 0).toFixed(2)}/mo</div>
                                <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                                  {currencySymbol}{Number(p.annualPriceDollars || 0).toFixed(2)}/yr
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border font-mono shadow-xs"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-primary)'
                              }}
                            >
                              <Coins className="h-3 w-3 text-amber-500" /> +{Number(p.tokenLimit ?? 500).toLocaleString()} {tokenSymbol}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(p)}
                                className="px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:opacity-80 cursor-pointer flex items-center gap-1 shadow-xs"
                                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{t('edit', 'Edit')}</span>
                              </button>

                              {!isProtected && (
                                <button
                                  type="button"
                                  disabled={deletingId === p.id}
                                  onClick={() => handleDeletePlan(p)}
                                  className="px-2.5 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-red-500/10 text-red-400 border-red-500/30 hover:text-red-300 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
                                  style={{ backgroundColor: 'var(--color-inner-dark)' }}
                                  title={t('deletePlan', 'Delete Plan')}
                                >
                                  {deletingId === p.id ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  <span className="hidden sm:inline">{t('delete', 'Delete')}</span>
                                </button>
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
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PLAN TRANSACTIONS (MATCHING /admin/payment HISTORY) */}
      {/* ========================================================= */}
      {activeMainTab === 'transactions' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('totalVolume', 'Total Volume')}
              </div>
              <div className="text-xl font-black mt-1" style={{ color: 'var(--color-emerald)' }}>
                {currencySymbol}{transactions
                  .filter((tItem) => isSucceeded(tItem.status))
                  .reduce((acc, curr) => acc + (curr.amount || 0), 0)
                  .toFixed(2)}
              </div>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('succeededCount', 'Succeeded')}
              </div>
              <div className="text-xl font-black mt-1" style={{ color: 'var(--color-primary)' }}>
                {transactions.filter((tItem) => isSucceeded(tItem.status)).length}
              </div>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('activeRecurring', 'Auto-Renew ON')}
              </div>
              <div className="text-xl font-black mt-1 text-blue-400">
                {transactions.filter((tItem) => tItem.autoRenew && isSucceeded(tItem.status)).length}
              </div>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('refundedOrCanceled', 'Canceled / Refunded')}
              </div>
              <div className="text-xl font-black mt-1 text-amber-500">
                {transactions.filter((tItem) => isCanceled(tItem.status) || isRefunded(tItem.status)).length}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div 
            className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            {/* Search and Filters Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input
                  type="text"
                  placeholder={t('searchTransactionsPlaceholder', 'Search customer, email, plan, or ID...')}
                  value={txSearchQuery}
                  onChange={(e) => {
                    setTxSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs outline-none transition"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="all">{t('allStatuses', 'All Statuses')}</option>
                  <option value="succeeded">{t('succeeded', 'Succeeded')}</option>
                  <option value="canceled">{t('canceled', 'Canceled')}</option>
                  <option value="refunded">{t('refunded', 'Refunded')}</option>
                  <option value="failed">{t('failed', 'Failed')}</option>
                  <option value="pending">{t('pending', 'Pending')}</option>
                </select>

                <select
                  value={gatewayFilter}
                  onChange={(e) => {
                    setGatewayFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="all">{t('allGateways', 'All Gateways')}</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="manual">Manual</option>
                </select>

                <button
                  type="button"
                  onClick={fetchTransactions}
                  disabled={loadingTransactions}
                  className="p-2 rounded-xl border transition cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title={t('refreshTransactions', 'Refresh Transactions')}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingTransactions ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b font-extrabold uppercase text-[10px] tracking-wider" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <th className="p-3.5">{t('colDate', 'Date')}</th>
                    <th className="p-3.5">{t('colCustomer', 'Customer')}</th>
                    <th className="p-3.5">{t('colPlan', 'Plan')}</th>
                    <th className="p-3.5">{t('colAmount', 'Amount')}</th>
                    <th className="p-3.5">{t('colGateway', 'Gateway')}</th>
                    <th className="p-3.5">{t('colStatus', 'Status')}</th>
                    <th className="p-3.5">{t('colRecurring', 'Auto-Renew')}</th>
                    <th className="p-3.5">{t('colExpiry', 'Billing Expiry')}</th>
                    <th className="p-3.5 text-right">{t('colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <RefreshCw className="h-4 w-4 animate-spin inline mr-2" style={{ color: 'var(--color-primary)' }} /> Loading plan transactions...
                      </td>
                    </tr>
                  ) : paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        No subscription plan transactions found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const succeeded = isSucceeded(tx.status);
                      const canceled = isCanceled(tx.status);
                      const refunded = isRefunded(tx.status);
                      const failed = isFailed(tx.status);

                      return (
                        <tr key={tx.id} className="hover:bg-slate-500/5 transition">
                          <td className="p-3.5 font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{tx.customerName}</div>
                            <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>{tx.customerEmail}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>{tx.planName}</div>
                            {tx.planSlug && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                                {tx.planSlug}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono font-black" style={{ color: 'var(--color-emerald)' }}>
                            {currencySymbol}{Number(tx.amount || 0).toFixed(2)}
                            <span className="text-[10px] font-normal ml-1 opacity-70">{tx.currency}</span>
                          </td>

                          <td className="p-3.5 uppercase font-bold text-[10px] tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                            {tx.gateway}
                          </td>

                          <td className="p-3.5">
                            {succeeded && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                <CheckCircle className="h-3 w-3" /> Succeeded
                              </span>
                            )}
                            {canceled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-orange-500/30 text-orange-400 bg-orange-500/10">
                                <Ban className="h-3 w-3" /> Canceled
                              </span>
                            )}
                            {refunded && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10">
                                <RefreshCw className="h-3 w-3" /> Refunded
                              </span>
                            )}
                            {failed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-500/30 text-red-400 bg-red-500/10">
                                <AlertTriangle className="h-3 w-3" /> Failed
                              </span>
                            )}
                            {!succeeded && !canceled && !refunded && !failed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-500/30 text-slate-400 bg-slate-500/10">
                                {tx.status}
                              </span>
                            )}
                          </td>

                          {/* Inline Auto-Renew Toggle */}
                          <td className="p-3.5">
                            <button
                              type="button"
                              disabled={togglingTxId === tx.id}
                              onClick={() => handleToggleRecurring(tx)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                tx.autoRenew ? 'bg-emerald-500' : 'bg-slate-700'
                              }`}
                              title={tx.autoRenew ? 'Click to disable auto-renewal' : 'Click to enable auto-renewal'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  tx.autoRenew ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>

                          <td className="p-3.5 font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString() : '—'}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(tx)}
                                className="p-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer shadow-xs"
                                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                                title={t('edit', 'Edit')}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx)}
                                className="p-1.5 rounded-lg border transition hover:bg-red-500/10 text-red-400 border-red-500/30 hover:text-red-300 cursor-pointer shadow-xs"
                                style={{ backgroundColor: 'var(--color-inner-dark)' }}
                                title={t('delete', 'Delete')}
                              >
                                <Trash2 className="h-3 w-3" />
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

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2" style={{ color: 'var(--color-text-secondary)' }}>
              <span>
                {t('showingCount', 'Showing')} {Math.min(filteredTransactions.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredTransactions.length, currentPage * pageSize)} {t('ofTotal', 'of')} {filteredTransactions.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD PAYMENT TRANSACTION                           */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Plus className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <span>{t('recordPaymentModalTitle', 'Record Plan Payment & Activate')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg border hover:opacity-80 transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 border rounded-xl text-xs text-red-400 border-red-500/30 bg-red-500/10">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('selectCustomerLabel', 'Select Registered User')}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2.5 font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {registeredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('selectPlanTierLabel', 'Select Subscription Plan')}
                </label>
                <select
                  value={selectedPlanSlug}
                  onChange={(e) => handlePlanSelectChange(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2.5 font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {availablePlanOptions.map((opt) => (
                    <option key={opt.slug} value={opt.slug}>
                      {opt.name} — {opt.priceFormatted}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('amountLabel', 'Payment Amount')} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-xl px-3.5 py-2.5 font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('gatewayLabel', 'Payment Gateway')}
                  </label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value as any)}
                    className="w-full border rounded-xl px-3.5 py-2.5 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="manual">Manual / Bank</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('paymentDateLabel', 'Payment Date')}
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => {
                      setPaymentDate(e.target.value);
                      const matched = availablePlanOptions.find((p) => p.slug === selectedPlanSlug);
                      if (matched) {
                        setPaymentExpiryDate(calculateDefaultExpiry(e.target.value, matched.interval || 'MONTH'));
                      }
                    }}
                    className="w-full border rounded-xl px-3.5 py-2 font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('expiryDateLabel', 'Billing Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={paymentExpiryDate}
                    onChange={(e) => setPaymentExpiryDate(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2 font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold">
                  <input
                    type="checkbox"
                    checked={isPaymentRecurring}
                    onChange={(e) => setIsPaymentRecurring(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#10b981]"
                  />
                  <span>{t('recurringRenewalLabel', 'Recurring Auto-Renew Enabled')}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={modalSubmitting}
                onClick={handleSaveAddPayment}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white transition cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t('recordPaymentBtn', 'Record & Sync PostgreSQL')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT PAYMENT TRANSACTION                          */}
      {/* ========================================================= */}
      {showEditModal && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Pencil className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <span>{t('editPaymentModalTitle', 'Edit Transaction Record')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg border hover:opacity-80 transition cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 border rounded-xl text-xs text-red-400 border-red-500/30 bg-red-500/10">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Customer Name</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Customer Email</label>
                  <input
                    type="email"
                    value={editCustomerEmail}
                    onChange={(e) => setEditCustomerEmail(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Plan Name</label>
                  <input
                    type="text"
                    value={editPlanName}
                    onChange={(e) => setEditPlanName(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Plan Slug</label>
                  <input
                    type="text"
                    value={editPlanSlug}
                    onChange={(e) => setEditPlanSlug(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-xl px-3 py-2 font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Gateway</label>
                  <select
                    value={editGateway}
                    onChange={(e) => setEditGateway(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="succeeded">Succeeded</option>
                    <option value="canceled">Canceled</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Created Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold">
                  <input
                    type="checkbox"
                    checked={editIsRecurring}
                    onChange={(e) => setEditIsRecurring(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer accent-[#10b981]"
                  />
                  <span>{t('recurringRenewalLabel', 'Recurring Auto-Renew Enabled')}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={modalSubmitting}
                onClick={handleSaveEditPayment}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white transition cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t('updateRecordBtn', 'Update & Save Changes')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
