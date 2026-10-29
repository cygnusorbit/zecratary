// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Layers, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, 
  Coins, Wallet, RefreshCw, Sparkles, Zap, Lock, Calendar, 
  HelpCircle, ChevronDown, Check, X, Search, ChevronLeft, ChevronRight,
  ExternalLink, CreditCard, Shield, AlertTriangle, Clock, Ban, Landmark,
  Copy, Info, ArrowUpRight
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  is_free?: boolean;
  isFree?: boolean;
  monthly_price_dollars?: number | string;
  monthlyPrice?: number | string;
  monthlyPriceDollars?: number | string;
  annual_price_dollars?: number | string;
  annualPrice?: number | string;
  annualPriceDollars?: number | string;
  description_monthly?: string;
  descriptionMonthly?: string;
  description_annual?: string;
  descriptionAnnual?: string;
  token_limit?: number;
  tokenLimit?: number;
  tokensMonthly?: number;
  tokensAnnual?: number;
  tokens_monthly?: number;
  tokens_annual?: number;
  recipe_library_limit?: number;
  recipeLibraryLimit?: number;
  ai_recipe_limit?: number;
  aiRecipeLimit?: number;
  can_view_macros?: boolean;
  canViewMacros?: boolean;
  features?: any;
  popular?: boolean;
  trialBadge?: string;
  monthlyBadge?: string;
  annualBadge?: string;
  // Dynamic sync with /admin/plans
  allowWalletPayment?: boolean;
  allow_wallet_payment?: boolean;
  allowGatewayPayment?: boolean;
  allow_gateway_payment?: boolean;
  allowedGateways?: string[];
  allowed_gateways?: string[];
}

export interface PaymentTransaction {
  id: string;
  customerName?: string;
  customer_name?: string;
  customerEmail?: string;
  customer_email?: string;
  plan_name?: string;
  planName?: string;
  plan_slug?: string;
  planSlug?: string;
  amount: number | string;
  currency?: string;
  gateway?: string;
  payment_method?: string;
  status?: string;
  is_recurring?: boolean;
  isRecurring?: boolean;
  recurringInterval?: string;
  recurring_interval?: string;
  auto_renew?: boolean;
  autoRenew?: boolean;
  expiry_date?: string;
  expiryDate?: string;
  created_at?: string;
  createdAt?: string;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'preset_taster',
    name: 'Taster',
    slug: 'taster',
    is_free: true,
    monthly_price_dollars: 0,
    annual_price_dollars: 0,
    tokensMonthly: 25000,
    tokensAnnual: 25000,
    token_limit: 25000,
    trialBadge: 'Free Forever',
    description_monthly: 'Essential culinary companion for exploring AI recipes.',
    description_annual: 'Essential culinary companion for exploring AI recipes.',
    features: ['25,000 Culinary AI Tokens / month', 'Basic Recipe Generator', 'Standard Ingredient Conversion', 'Community Cookbooks Access'],
    allowWalletPayment: false,
    allowGatewayPayment: false,
    allowedGateways: []
  },
  {
    id: 'preset_nutrition_pro',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro',
    is_free: false,
    monthly_price_dollars: 8.99,
    annual_price_dollars: 59.99,
    tokensMonthly: 250000,
    tokensAnnual: 3000000,
    token_limit: 250000,
    popular: true,
    monthlyBadge: 'Popular',
    annualBadge: 'Save ~44%',
    description_monthly: 'Advanced meal planning with macro telemetry and custom diets.',
    description_annual: 'Ultimate savings on personalized culinary formulation.',
    features: ['250,000 Foodie AI Tokens / month', 'Full Macronutrient Tracking (Macros)', 'Automated Aisle Grocery Consolidation', 'AI Smart Sub-Recipe Formulator'],
    allowWalletPayment: true,
    allowGatewayPayment: true,
    allowedGateways: ['stripe', 'paypal', 'manual']
  },
  {
    id: 'preset_executive_chef',
    name: 'Executive Chef',
    slug: 'executive-chef',
    is_free: false,
    monthly_price_dollars: 19.99,
    annual_price_dollars: 149.99,
    tokensMonthly: 1000000,
    tokensAnnual: 12000000,
    token_limit: 1000000,
    monthlyBadge: 'Best Value',
    annualBadge: 'VIP Value',
    description_monthly: 'Unrestricted culinary power for chefs and nutritionists.',
    description_annual: 'VIP annual pass with maximum token allowances.',
    features: ['1,000,000 Foodie AI Tokens / month', 'Unlimited Saved Recipes', 'Priority High-Tier Model Access', 'Custom Dietary Export to PDF & CSV'],
    allowWalletPayment: true,
    allowGatewayPayment: true,
    allowedGateways: ['stripe', 'paypal', 'manual']
  }
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'AU$', JPY: '¥', THB: '฿', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$'
};

function parsePlanFeatures(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (_) {
      return raw.split('\n').map(s => s.trim().replace(/^[•\-\*]\s*/, '')).filter(Boolean);
    }
  }
  return [];
}

function cleanSlug(slug?: string): string {
  if (!slug) return 'taster';
  return String(slug)
    .toLowerCase()
    .trim()
    .replace(/^(preset_|plan_|group_)/i, '')
    .replace(/-(monthly|annual|year|free)$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim() || 'taster';
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [activeTransaction, setActiveTransaction] = useState<PaymentTransaction | null>(null);

  // Billing Interval: 'monthly' | 'annual'
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  // Balances, Currency & Gateway Settings
  const [tokenBalance, setTokenBalance] = useState<number>(25000);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [tokenIdentity, setTokenIdentity] = useState<{ tokenName: string; tokenSymbol: string }>({ tokenName: 'Tokens', tokenSymbol: '🪙' });

  // Dynamic Gateway and Wallet Configuration (Synced with /admin/payment-gateway & /admin/wallet-settings)
  const [gatewayConfig, setGatewayConfig] = useState<any>({
    activeGateway: 'both',
    currency: 'USD',
    currencySymbol: '$',
    stripe: { enabled: true, mode: 'test' },
    paypal: { enabled: true, mode: 'sandbox' },
    manual: { 
      enabled: true,
      bankName: 'Global Commercial Bank',
      accountNumber: '4820-9182-3819-001',
      accountHolder: 'Zecratary AI Solutions Inc.',
      swiftCode: 'GCBNUS33',
      instructions: 'Please include your Reference Code in the bank wire transfer note for swift verification.'
    }
  });

  const [walletConfig, setWalletConfig] = useState<any>({
    enabled: true,
    allowSubscriptionPayment: true
  });

  // Transaction Ledger Filters & Pagination
  const [historySearch, setHistorySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment Selection Modal State
  const [targetModalPlan, setTargetModalPlan] = useState<SubscriptionPlan | null>(null);
  const [modalPaymentMethod, setModalPaymentMethod] = useState<'wallet' | 'stripe' | 'paypal' | 'manual'>('wallet');
  const [manualRefCode, setManualRefCode] = useState<string>('');
  const [userTransferSlip, setUserTransferSlip] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const isFetchingRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Normalization helper for incoming transactions
  const normalizeTransaction = (tx: any): PaymentTransaction => ({
    id: tx.id || tx.transaction_id || `tx_${Date.now()}`,
    customerName: tx.customerName || tx.customer_name || tx.userName || '',
    customerEmail: tx.customerEmail || tx.customer_email || tx.userEmail || '',
    plan_name: tx.plan_name || tx.planName || 'Subscription Tier',
    plan_slug: tx.plan_slug || tx.planSlug || '',
    amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0),
    currency: (tx.currency || currencyCode).toUpperCase(),
    gateway: tx.gateway || tx.payment_method || 'stripe',
    status: (tx.status || 'succeeded').toLowerCase(),
    is_recurring: Boolean(tx.is_recurring ?? tx.isRecurring ?? true),
    recurring_interval: (tx.recurring_interval ?? tx.recurringInterval ?? 'MONTH').toUpperCase(),
    auto_renew: Boolean(tx.auto_renew ?? tx.autoRenew ?? true),
    expiry_date: tx.expiry_date || tx.expiryDate || tx.subscription_expiry_date,
    created_at: tx.created_at || tx.createdAt || new Date().toISOString()
  });

  // Normalization helper for incoming plans (Fully synchronized with /admin/plans)
  const normalizePlan = (plan: any): SubscriptionPlan => {
    const rawSlug = String(plan.slug || plan.id || 'plan').toLowerCase().trim();
    const baseSlug = cleanSlug(rawSlug);

    const isFree = Boolean(
      plan.is_free === true ||
      plan.isFree === true ||
      baseSlug === 'taster' ||
      baseSlug === 'free' ||
      plan.id === 'preset_taster' ||
      (Number(plan.monthly_price_dollars ?? plan.monthlyPriceDollars ?? plan.monthlyPrice ?? plan.price ?? 0) === 0 &&
       Number(plan.annual_price_dollars ?? plan.annualPriceDollars ?? plan.annualPrice ?? 0) === 0)
    );

    const monthlyPrice = isFree ? 0 : Number(
      plan.monthly_price_dollars ??
      plan.monthlyPriceDollars ??
      plan.monthlyPrice ??
      plan.price_monthly ??
      plan.price ??
      0
    );

    let annualPrice = isFree ? 0 : Number(
      plan.annual_price_dollars ??
      plan.annualPriceDollars ??
      plan.annualPrice ??
      plan.price_annual ??
      0
    );

    if (!isFree && annualPrice === 0 && monthlyPrice > 0) {
      annualPrice = Number((monthlyPrice * 10).toFixed(2));
    }

    const tokensMonthly = Number(
      plan.tokensMonthly ??
      plan.tokens_monthly ??
      plan.token_limit ??
      plan.tokenLimit ??
      plan.monthly_tokens ??
      plan.tokenQuota ??
      (isFree ? 25000 : 250000)
    );

    const tokensAnnual = Number(
      plan.tokensAnnual ??
      plan.tokens_annual ??
      (tokensMonthly * 12)
    );

    // Sync Payment Settings from /admin/plans
    const allowWallet = isFree ? false : (
      plan.allowWalletPayment !== undefined ? Boolean(plan.allowWalletPayment) :
      plan.allow_wallet_payment !== undefined ? Boolean(plan.allow_wallet_payment) : true
    );

    const allowGateway = isFree ? false : (
      plan.allowGatewayPayment !== undefined ? Boolean(plan.allowGatewayPayment) :
      plan.allow_gateway_payment !== undefined ? Boolean(plan.allow_gateway_payment) : true
    );

    const allowedGws = isFree ? [] : (
      Array.isArray(plan.allowedGateways || plan.allowed_gateways)
        ? (plan.allowedGateways || plan.allowed_gateways)
        : ['stripe', 'paypal', 'manual']
    );

    return {
      id: plan.id || baseSlug,
      name: plan.name || baseSlug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      slug: baseSlug,
      is_free: isFree,
      monthly_price_dollars: monthlyPrice,
      annual_price_dollars: annualPrice,
      token_limit: tokensMonthly,
      tokensMonthly,
      tokensAnnual,
      trialBadge: plan.trialBadge || plan.trial_badge || (isFree ? 'Free Forever' : undefined),
      monthlyBadge: plan.monthlyBadge || plan.monthly_badge || (plan.popular ? 'Popular' : undefined),
      annualBadge: plan.annualBadge || plan.annual_badge || 'Save ~20%',
      description_monthly: plan.description_monthly || plan.descriptionMonthly || plan.description || '',
      description_annual: plan.description_annual || plan.descriptionAnnual || plan.description || plan.description_monthly || '',
      features: parsePlanFeatures(plan.featuresText || plan.features),
      popular: Boolean(plan.popular),
      allowWalletPayment: allowWallet,
      allowGatewayPayment: allowGateway,
      allowedGateways: allowedGws
    };
  };

  // Fetch plans, user billing info, and balances
  const fetchSubscriptionData = useCallback(async (activeUser: User | null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    const targetUserId = activeUser?.id || 'usr_admin_1';
    const targetEmail = activeUser?.email || 'admin@zecratary.com';

    try {
      // 1. Ingest Currency & Gateway Settings
      let activeCur = 'USD';
      if (typeof window !== 'undefined') {
        activeCur = localStorage.getItem('zecratary_currency') || 'USD';
      }

      try {
        const sRes = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData?.settings?.currency) activeCur = sData.settings.currency;
          if (sData?.settings?.payment_settings) setGatewayConfig((prev: any) => ({ ...prev, ...sData.settings.payment_settings }));
        }
      } catch (_) {}

      try {
        const gwRes = await fetch(`/api/admin/payment-gateway?t=${Date.now()}`, { cache: 'no-store' });
        if (gwRes.ok) {
          const gwData = await gwRes.json();
          if (gwData?.gatewayConfig) setGatewayConfig((prev: any) => ({ ...prev, ...gwData.gatewayConfig }));
          else if (gwData?.stripe || gwData?.paypal || gwData?.manual) setGatewayConfig((prev: any) => ({ ...prev, ...gwData }));
          if (gwData?.currency) activeCur = gwData.currency;
        }
      } catch (_) {}

      try {
        const wRes = await fetch(`/api/admin/wallet-settings?t=${Date.now()}`, { cache: 'no-store' });
        if (wRes.ok) {
          const wData = await wRes.json();
          const wCfg = wData.walletSettings || wData.settings || wData;
          setWalletConfig(wCfg);
        }
      } catch (_) {}

      setCurrencyCode(activeCur.toUpperCase());
      setCurrencySymbol(CURRENCY_SYMBOLS[activeCur.toUpperCase()] || '$');

      // 2. Ingest Plans from /api/admin/plans (Authoritative source)
      let fetchedPlansList: any[] = [];
      try {
        const pRes = await fetch(`/api/admin/plans?t=${Date.now()}`, { cache: 'no-store' });
        if (pRes.ok) {
          const pData = await pRes.json();
          const list = Array.isArray(pData)
            ? pData
            : (pData?.packages || pData?.plans || pData?.configs || pData?.subscriptionPlans || pData?.data);
          if (Array.isArray(list) && list.length > 0) {
            fetchedPlansList = [...list];
          }
        }
      } catch (_) {}

      if (fetchedPlansList.length === 0) {
        try {
          const pubRes = await fetch(`/api/plans?t=${Date.now()}`, { cache: 'no-store' });
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            const list = Array.isArray(pubData)
              ? pubData
              : (pubData?.packages || pubData?.plans || pubData?.configs || pubData?.subscriptionPlans || pubData?.data);
            if (Array.isArray(list) && list.length > 0) {
              fetchedPlansList = [...list];
            }
          }
        } catch (_) {}
      }

      // 3. User Billing Details & Transactions Ingestion
      try {
        const bRes = await fetch(`/api/billing?email=${encodeURIComponent(targetEmail)}&userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData.success) {
            if (bData.user) {
              const u = bData.user;
              const reconciledUser: User = {
                ...(activeUser || {}),
                id: u.id || activeUser?.id,
                name: u.name || activeUser?.name,
                email: u.email || activeUser?.email,
                role: u.role || activeUser?.role,
                subscriptionPlan: u.subscription_plan || u.subscriptionPlan || (activeUser as any)?.subscriptionPlan || 'taster',
                subscription_plan: u.subscription_plan || u.subscriptionPlan || (activeUser as any)?.subscription_plan || 'taster',
                planInterval: u.plan_interval || u.planInterval || (activeUser as any)?.planInterval || 'MONTH',
                plan_interval: u.plan_interval || u.planInterval || (activeUser as any)?.plan_interval || 'MONTH',
                planExpiryDate: u.plan_expiry_date || u.planExpiryDate || u.expiry_date || u.expiryDate,
                plan_expiry_date: u.plan_expiry_date || u.planExpiryDate || u.expiry_date || u.expiryDate,
                wallet_balance: Number(u.wallet_balance ?? u.walletBalance ?? 0),
                token_balance: Number(u.token_balance ?? u.tokenBalance ?? 0)
              };

              setCurrentUser(reconciledUser);
              setWalletBalance(Number(reconciledUser.wallet_balance || 0));
              setTokenBalance(Number(reconciledUser.token_balance || 0));

              try {
                localStorage.setItem('zecratary_user', JSON.stringify(reconciledUser));
                localStorage.setItem('zecratary_current_user', JSON.stringify(reconciledUser));
              } catch (_) {}
            }

            if (Array.isArray(bData.transactions)) {
              const normalizedTxList = bData.transactions.map(normalizeTransaction);
              setTransactions(normalizedTxList);

              const activeTx = normalizedTxList.find((tx) => 
                ['succeeded', 'active', 'completed', 'canceled'].includes(tx.status) &&
                (!tx.expiry_date || new Date(tx.expiry_date).getTime() > Date.now())
              );

              if (activeTx) {
                setActiveTransaction(activeTx);
                const txSlug = String(activeTx.plan_slug || '').toLowerCase();
                const txIntv = String(activeTx.recurring_interval || '').toUpperCase();
                if (txSlug.includes('annual') || txIntv === 'YEAR' || txIntv === 'ANNUAL') {
                  setBillingInterval('annual');
                } else if (txSlug.includes('monthly') || txIntv === 'MONTH' || txIntv === 'MONTHLY') {
                  setBillingInterval('monthly');
                }
              }
            }

            if (fetchedPlansList.length === 0 && bData.plans && Array.isArray(bData.plans) && bData.plans.length > 0) {
              fetchedPlansList = bData.plans;
            }

            if (bData.tokenIdentity) {
              setTokenIdentity(bData.tokenIdentity);
            }
          }
        }
      } catch (_) {}

      // 4. Token Settings Ingestion
      try {
        const tokRes = await fetch(`/api/token-settings?t=${Date.now()}`, { cache: 'no-store' });
        if (tokRes.ok) {
          const tokData = await tokRes.json();
          if (tokData?.tokenIdentity) {
            setTokenIdentity(tokData.tokenIdentity);
          } else if (tokData?.token_name || tokData?.token_symbol) {
            setTokenIdentity({
              tokenName: tokData.token_name || 'Tokens',
              tokenSymbol: tokData.token_symbol || '🪙'
            });
          }
        }
      } catch (_) {}

      // Finalize Plan Normalization
      if (fetchedPlansList.length > 0) {
        const uniqueMap = new Map<string, SubscriptionPlan>();
        fetchedPlansList.forEach((raw) => {
          const norm = normalizePlan(raw);
          if (!uniqueMap.has(norm.slug)) {
            uniqueMap.set(norm.slug, norm);
          }
        });

        let finalList = Array.from(uniqueMap.values());
        const hasFree = finalList.some(p => p.is_free || cleanSlug(p.slug) === 'taster');
        if (!hasFree) {
          finalList.unshift(DEFAULT_PLANS[0]);
        }
        setPlans(finalList);
      } else {
        setPlans(DEFAULT_PLANS);
      }

    } catch (err) {
      console.warn('[SubscriptionsPage] Data ingestion notice:', err);
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [currencyCode]);

  const fetchRef = useRef(fetchSubscriptionData);
  useEffect(() => {
    fetchRef.current = fetchSubscriptionData;
  });

  useEffect(() => {
    document.title = `${t('subscriptionsTitle', 'Subscription Plans & Membership')} - Zecratary`;
  }, [t]);

  useEffect(() => {
    initAuthStorage();
    const u = getCurrentUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setCurrentUser(u);
    fetchRef.current(u);

    const handleDebouncedSync = () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const active = getCurrentUser();
        if (active) {
          setCurrentUser(active);
          fetchRef.current(active);
        }
      }, 200);
    };

    // Cross-tab broadcast listener
    let paymentBc: BroadcastChannel | null = null;
    try {
      paymentBc = new BroadcastChannel('zecratary_payment_sync');
      paymentBc.onmessage = () => handleDebouncedSync();
    } catch (_) {}

    window.addEventListener('storage', handleDebouncedSync);
    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_payment_gateway_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_plans_updated', handleDebouncedSync);
    window.addEventListener('zecratary_wallet_updated', handleDebouncedSync);
    window.addEventListener('zecratary_tokens_updated', handleDebouncedSync);
    window.addEventListener('zecratary_token_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_users_updated', handleDebouncedSync);
    window.addEventListener('zecratary_user_plan_updated', handleDebouncedSync);
    window.addEventListener('zecratary_subscriptions_updated', handleDebouncedSync);
    window.addEventListener('zecratary_theme_mode_changed', handleDebouncedSync);
    window.addEventListener('zecratary_theme_changed', handleDebouncedSync);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (paymentBc) paymentBc.close();
      window.removeEventListener('storage', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_gateway_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_plans_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_wallet_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_tokens_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_token_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_users_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_user_plan_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_subscriptions_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleDebouncedSync);
      window.removeEventListener('zecratary_theme_changed', handleDebouncedSync);
    };
  }, [router]);

  const activeUserSlug = useMemo(() => {
    return cleanSlug(currentUser?.subscription_plan || (currentUser as any)?.subscriptionPlan || activeTransaction?.plan_slug || 'taster');
  }, [currentUser, activeTransaction]);

  const activeUserInterval = useMemo<'monthly' | 'annual'>(() => {
    if (activeTransaction?.recurring_interval) {
      const intv = activeTransaction.recurring_interval.toUpperCase();
      if (intv === 'YEAR' || intv === 'ANNUAL') return 'annual';
      if (intv === 'MONTH' || intv === 'MONTHLY') return 'monthly';
    }
    const uIntv = String(currentUser?.plan_interval || (currentUser as any)?.planInterval || '').toUpperCase();
    if (uIntv === 'YEAR' || uIntv === 'ANNUAL') return 'annual';
    const raw = String(currentUser?.subscription_plan || (currentUser as any)?.subscriptionPlan || activeTransaction?.plan_slug || '').toLowerCase();
    if (raw.includes('annual') || raw.includes('year')) return 'annual';
    return 'monthly';
  }, [currentUser, activeTransaction]);

  const isFreeUser = useMemo(() => {
    return !activeUserSlug || activeUserSlug === 'taster' || activeUserSlug === 'free';
  }, [activeUserSlug]);

  const expiryInfo = useMemo(() => {
    const rawDate = activeTransaction?.expiry_date || currentUser?.plan_expiry_date || (currentUser as any)?.planExpiryDate || (currentUser as any)?.expiry_date;
    if (!rawDate || isFreeUser) return { isExpired: false, isExpiringSoon: false, daysLeft: null, dateStr: null };

    const expDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isExpired: diffDays < 0,
      isExpiringSoon: diffDays >= 0 && diffDays <= 3,
      daysLeft: Math.max(0, diffDays),
      dateStr: expDate.toLocaleDateString()
    };
  }, [activeTransaction, currentUser, isFreeUser]);

  const displayActivePlanName = useMemo(() => {
    if (isFreeUser) return `${t('tasterPlanName', 'Taster')} (${t('freePlanTag', 'Free')})`;
    const matched = plans.find(p => cleanSlug(p.slug) === cleanSlug(activeUserSlug) || cleanSlug(p.id) === cleanSlug(activeUserSlug));
    const baseName = matched ? matched.name : activeUserSlug.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${baseName} (${activeUserInterval === 'annual' ? (t('annualBilling', 'Annual')) : (t('monthlyBilling', 'Monthly'))})`;
  }, [isFreeUser, plans, activeUserSlug, activeUserInterval, t]);

  const handleSelectPlanAction = (plan: SubscriptionPlan) => {
    const planBase = cleanSlug(plan.slug);
    const isPlanFree = Boolean(plan.is_free || planBase === 'taster' || Number(plan.monthly_price_dollars || 0) === 0);
    const isSameTier = isFreeUser ? isPlanFree : planBase === activeUserSlug;
    const isExactActive = isFreeUser ? isPlanFree : (isSameTier && billingInterval === activeUserInterval);

    if (isExactActive) return;

    if (isPlanFree) {
      if (confirm(t('confirmSwitchFreePrompt', 'Are you sure you want to switch to the Free Taster tier? Your previous subscription will be cancelled.'))) {
        executePlanSwitch(plan, 'free', 0);
      }
      return;
    }

    // Generate reference code for audit or manual wire transfer
    const ref = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setManualRefCode(ref);
    setUserTransferSlip('');
    setCopiedRef(false);

    // Pick optimal starting method permitted by the plan
    const price = billingInterval === 'annual' ? Number(plan.annual_price_dollars || 0) : Number(plan.monthly_price_dollars || 0);
    const isWalletEligible = plan.allowWalletPayment !== false && walletConfig.enabled !== false && walletConfig.allowSubscriptionPayment !== false;
    
    if (isWalletEligible && walletBalance >= price) {
      setModalPaymentMethod('wallet');
    } else if (plan.allowGatewayPayment !== false && (plan.allowedGateways || []).includes('stripe') && gatewayConfig?.stripe?.enabled !== false) {
      setModalPaymentMethod('stripe');
    } else if (plan.allowGatewayPayment !== false && (plan.allowedGateways || []).includes('paypal') && gatewayConfig?.paypal?.enabled !== false) {
      setModalPaymentMethod('paypal');
    } else {
      setModalPaymentMethod('manual');
    }

    setTargetModalPlan(plan);
  };

  // Execute Plan Switch and synchronize in database
    const executePlanSwitch = async (plan: SubscriptionPlan, paymentMethod: string, amountToPay: number) => {
    if (!currentUser) return;
    setSubmitting(true);

    const targetUserId = currentUser.id || 'usr_admin_1';
    const isTargetFree = Boolean(plan.is_free || cleanSlug(plan.slug) === 'taster' || amountToPay === 0);
    const planFullSlug = isTargetFree ? 'taster' : `${cleanSlug(plan.slug)}-${billingInterval === 'annual' ? 'annual' : 'monthly'}`;
    const planDisplayName = isTargetFree 
      ? `${plan.name} (Free)`
      : `${plan.name} (${billingInterval === 'annual' ? (t('annualBilling', 'Annual')) : (t('monthlyBilling', 'Monthly'))})`;
    
    const tokensCredited = billingInterval === 'annual'
      ? (plan.tokensAnnual || (plan.tokensMonthly ? plan.tokensMonthly * 12 : 3000000))
      : (plan.tokensMonthly || plan.token_limit || (isTargetFree ? 25000 : 250000));

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'change_plan',
          planName: planDisplayName,
          planSlug: planFullSlug,
          interval: billingInterval === 'annual' ? 'YEAR' : 'MONTH',
          amount: amountToPay,
          currency: currencyCode,
          paymentMethod: paymentMethod,
          gateway: paymentMethod,
          email: currentUser.email,
          userEmail: currentUser.email,
          userName: currentUser.name,
          userId: targetUserId,
          tokenLimit: tokensCredited,
          referenceCode: manualRefCode,
          userTransferRef: userTransferSlip
        })
      });

      // Safe Stream Deserialization Guard
      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        console.error('Failed to parse billing response as JSON:', responseText);
        throw new Error(responseText || `Server returned an invalid response (HTTP ${res.status})`);
      }

      if (!res.ok || !data.success) {
        const detailMsg = data.error || data.message || (typeof data === 'string' ? data : '') || t('failedSwitchPlan', 'Failed to switch subscription plan');
        throw new Error(detailMsg);
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      const newExpiry = isTargetFree ? null : new Date(Date.now() + (billingInterval === 'annual' ? 365 : 30) * 86400000).toISOString();
      const finalWalletBal = typeof data.wallet_balance === 'number'
        ? data.wallet_balance
        : (paymentMethod === 'wallet' ? Math.max(0, walletBalance - amountToPay) : walletBalance);
      
      const finalTokenBal = typeof data.token_balance === 'number'
        ? data.token_balance
        : ((currentUser.token_balance || 0) + (tokensCredited > 0 && !isTargetFree ? tokensCredited : 0));

      const updatedUser: User = {
        ...currentUser,
        subscription_plan: planFullSlug,
        subscriptionPlan: planFullSlug,
        plan_interval: billingInterval === 'annual' ? 'YEAR' : 'MONTH',
        planInterval: billingInterval === 'annual' ? 'YEAR' : 'MONTH',
        plan_expiry_date: newExpiry,
        planExpiryDate: newExpiry,
        wallet_balance: finalWalletBal,
        token_balance: finalTokenBal
      };

      setWalletBalance(finalWalletBal);
      setTokenBalance(finalTokenBal);
      setCurrentUser(updatedUser);

      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_user', JSON.stringify(updatedUser));
        localStorage.setItem('zecratary_current_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
        window.dispatchEvent(new Event('zecratary_tokens_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_user_plan_updated'));
        window.dispatchEvent(new Event('zecratary_subscriptions_updated'));
        window.dispatchEvent(new Event('zecratary_plans_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      showToast(
        (t('planSelectedSuccessToast', 'Successfully activated {plan}!'))
          .replace('{plan}', plan.name),
        'success'
      );

      setTargetModalPlan(null);
      fetchRef.current(updatedUser);
    } catch (err: any) {
      showToast(err.message || t('failedSwitchPlan', 'Failed to switch subscription plan'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!activeTransaction || !currentUser) return;

    const currentAutoRenew = Boolean(activeTransaction.auto_renew !== false);
    if (currentAutoRenew) {
      if (!confirm(t('confirmCancelSubscriptionPrompt', 'Are you sure you want to cancel auto-renewal? You will retain access until your current billing period ends.'))) {
        return;
      }
    }

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentAutoRenew ? 'cancel_subscription' : 'resume_subscription',
          transactionId: activeTransaction.id,
          autoRenew: !currentAutoRenew,
          email: currentUser.email,
          userEmail: currentUser.email,
          userId: currentUser.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveTransaction(prev => prev ? { ...prev, auto_renew: !currentAutoRenew } : null);
        showToast(
          currentAutoRenew 
            ? t('autoRenewCancelledMsg', 'Auto-renewal has been cancelled.') 
            : t('autoRenewResumedMsg', 'Auto-renewal has been reactivated!'),
          'success'
        );
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_subscriptions_updated'));
      }
    } catch (_) {}
  };

  const copyRefCode = () => {
    if (typeof window !== 'undefined' && manualRefCode) {
      navigator.clipboard.writeText(manualRefCode);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const st = (tx.status || 'succeeded').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const pName = (tx.plan_name || '').toLowerCase();
        const gw = (tx.gateway || '').toLowerCase();
        const txId = (tx.id || '').toLowerCase();
        if (!pName.includes(q) && !gw.includes(q) && !txId.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const startIdx = (safeHistoryPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIdx, startIdx + pageSize);

  return (
    <div 
      className="min-h-screen w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 font-sans transition-colors duration-200 box-border space-y-8"
      style={{
        backgroundColor: 'var(--color-bg, #070b13)',
        color: 'var(--color-text, #f8fafc)'
      }}
    >
      <div 
        id="zecratary-subscriptions-canvas" 
        role="region" 
        aria-label={t('subscriptionsTitle', 'Subscription Plans & Membership')}
        data-lpignore="true" 
        className="w-full max-w-full space-y-8"
      >
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div 
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
            style={{
              backgroundColor: 'var(--color-card, #0f172a)',
              borderColor: toastMessage.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
              color: 'var(--color-text, #f8fafc)'
            }}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Layers className="h-7 w-7" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('subscriptionsTitle', 'Subscription Plans & Membership')}</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
              {t('subscriptionsSubtitle', 'Manage your active subscription, upgrade tiers, and review billing history.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchRef.current(currentUser)}
              disabled={loading}
              className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80 active:scale-95"
              style={{ 
                backgroundColor: 'var(--color-card, #0f172a)', 
                borderColor: 'var(--color-border, #1e293b)', 
                color: 'var(--color-text, #f8fafc)' 
              }}
              title={t('reloadBtn', 'Refresh Status')}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{t('reloadBtn', 'Refresh Status')}</span>
            </button>

            <Link
              href="/token"
              className="px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-xs flex items-center gap-1.5 hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--color-card, #0f172a)', 
                borderColor: 'var(--color-border, #1e293b)', 
                color: 'var(--color-text, #f8fafc)' 
              }}
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span>{tokenBalance.toLocaleString()} {tokenIdentity.tokenSymbol}</span>
            </Link>
          </div>
        </div>

        {/* Expiry Alerts */}
        {expiryInfo.isExpiringSoon && (
          <div 
            className="p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: '#f59e0b', color: 'var(--color-text, #f8fafc)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-500">
                  {t('expiringSoonAlertTitle', 'Subscription Expiring Soon')}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {(t('expiringSoonAlertDesc', 'Your subscription will expire in {days} day(s). Renew or upgrade now to maintain uninterrupted access.'))
                    .replace('{days}', String(expiryInfo.daysLeft))}
                </p>
              </div>
            </div>
          </div>
        )}

        {expiryInfo.isExpired && (
          <div 
            className="p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: '#ef4444', color: 'var(--color-text, #f8fafc)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-red-500">
                  {t('expiredAlertTitle', 'Subscription Expired')}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {t('expiredAlertDesc', 'Your subscription has ended. Choose a plan below to restore premium features and token allocations.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: ACCOUNT & MEMBERSHIP OVERVIEW */}
        <div 
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #070b13)',
                    borderColor: 'var(--color-emerald, #10b981)',
                    color: 'var(--color-emerald, #10b981)'
                  }}
                >
                  {t('currentActivePlanBadge', 'Current Active Plan')}
                </span>

                {activeTransaction?.auto_renew !== false && !isFreeUser && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{t('autoRenewEnabled', 'Auto-Renew ON')}</span>
                  </span>
                )}
                {activeTransaction?.auto_renew === false && !isFreeUser && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{t('autoRenewDisabled', 'Renewal Canceled (Active Until Expiry)')}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black capitalize" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {displayActivePlanName}
              </h2>

              <p className="text-xs opacity-75 flex items-center gap-2" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>
                  {expiryInfo.dateStr && !isFreeUser
                    ? `${t('renewalDateLabel', 'Active period ends on')} ${expiryInfo.dateStr}`
                    : t('freePlanNoExpiry', 'Free Plan — Perpetual Access')}
                </span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {!isFreeUser && activeTransaction && (
                <button
                  type="button"
                  onClick={handleToggleAutoRenew}
                  disabled={submitting}
                  className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                    activeTransaction.auto_renew !== false 
                      ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' 
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {activeTransaction.auto_renew !== false ? (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>{t('cancelSubscriptionBtn', 'Cancel Auto-Renewal')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('reactivateSubscriptionBtn', 'Reactivate Auto-Renewal')}</span>
                    </>
                  )}
                </button>
              )}

              <Link
                href="/billing"
                className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer hover:opacity-85"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  borderColor: 'var(--color-border, #1e293b)',
                  color: 'var(--color-text, #f8fafc)'
                }}
              >
                <CreditCard className="w-4 h-4" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>{t('fullInvoicesHub', 'Full Invoices Hub')}</span>
              </Link>
            </div>
          </div>

          {/* Telemetry Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('accountLabel', 'Account')}</span>
              </div>
              <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {currentUser?.name || currentUser?.email || 'Logged-in Member'}
              </div>
              <div className="text-xs opacity-50 truncate" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {currentUser?.email}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('availableTokensLabel', 'Available Tokens')}</span>
              </div>
              <div className="font-bold text-base flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
                <span>{tokenBalance.toLocaleString()}</span>
                <span className="text-xs font-semibold opacity-75">{tokenIdentity.tokenSymbol}</span>
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('replenishedOnCycle', 'Replenished on every billing cycle')}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('walletBalanceLabel', 'Store Wallet')}</span>
              </div>
              <div className="font-bold text-base font-mono flex items-center gap-1" style={{ color: 'var(--color-emerald, #10b981)' }}>
                <span>{currencySymbol}</span>
                <span>{walletBalance.toFixed(2)}</span>
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('availableForServices', 'Available for store & token top-ups')}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{t('billingIntervalLabel', 'Billing Interval')}</span>
              </div>
              <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {isFreeUser ? '—' : (activeUserInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly'))}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {activeTransaction?.is_recurring ? 'Auto-renew enabled' : 'Single billing cycle'}
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t('paymentGatewayLabel', 'Payment Gateway')}</span>
              </div>
              <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--color-emerald, #10b981)' }}>
                {activeTransaction?.gateway || 'Stripe'}
              </div>
              <div className="text-[11px] opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('pciEncrypted', 'Encrypted via PCI gateway')}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PLAN CATALOG SELECTION */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('subscriptionsTitle', 'Subscription Plans & Membership')}
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('subscriptionsSubtitle', 'Manage your active subscription, upgrade tiers, and review billing history.')}
              </p>
            </div>

            {/* Monthly / Annual Toggle Switch */}
            <div 
              className="p-1 rounded-2xl border flex items-center self-start sm:self-auto shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--color-card, #0f172a)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingInterval === 'monthly' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={billingInterval === 'monthly' ? {
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  color: 'var(--color-emerald, #10b981)'
                } : {
                  color: 'var(--color-text-secondary, #94a3b8)'
                }}
              >
                {t('monthlyBilling', 'Monthly Billing')}
              </button>

              <button
                type="button"
                onClick={() => setBillingInterval('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  billingInterval === 'annual' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={billingInterval === 'annual' ? {
                  backgroundColor: 'var(--color-inner-dark, #070b13)',
                  color: 'var(--color-emerald, #10b981)'
                } : {
                  color: 'var(--color-text-secondary, #94a3b8)'
                }}
              >
                <span>{t('annualBilling', 'Annual Billing')}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t('saveDiscountBadge', 'Save ~20%')}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const planBase = cleanSlug(plan.slug);
              const isPlanFree = Boolean(plan.is_free || planBase === 'taster' || Number(plan.monthly_price_dollars || 0) === 0);
              const isSameTier = isFreeUser ? isPlanFree : planBase === activeUserSlug;
              const isExactActive = isFreeUser ? isPlanFree : (isSameTier && billingInterval === activeUserInterval);
              const isMatchingTierOtherInterval = isSameTier && !isExactActive;

              const price = billingInterval === 'annual' ? plan.annual_price_dollars : plan.monthly_price_dollars;
              const badge = isPlanFree 
                ? plan.trialBadge 
                : (billingInterval === 'annual' ? plan.annualBadge : plan.monthlyBadge);
              const featuresList = parsePlanFeatures(plan.features);

              const tokenQuota = billingInterval === 'annual'
                ? (plan.tokensAnnual || (plan.tokensMonthly ? plan.tokensMonthly * 12 : 3000000))
                : (plan.tokensMonthly || plan.token_limit || (isPlanFree ? 25000 : 250000));

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                    isExactActive 
                      ? 'ring-2 ring-emerald-500/90 shadow-2xl shadow-emerald-500/15' 
                      : (isMatchingTierOtherInterval ? 'ring-1 ring-amber-500/50 shadow-md' : 'hover:shadow-lg')
                  }`}
                  style={{
                    backgroundColor: isExactActive 
                      ? 'rgba(16, 185, 129, 0.05)' 
                      : 'var(--color-card, #0f172a)',
                    borderColor: isExactActive 
                      ? 'var(--color-emerald, #10b981)' 
                      : (isMatchingTierOtherInterval ? 'rgba(245, 158, 11, 0.4)' : 'var(--color-border, #1e293b)')
                  }}
                >
                  {/* Badge Ribbon */}
                  {isExactActive ? (
                    <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-lg flex items-center gap-1.5 z-10 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950 text-emerald-500" />
                      <span>{t('currentActivePlanBadge', 'Current Active Plan')}</span>
                    </div>
                  ) : isMatchingTierOtherInterval ? (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1 z-10">
                      <Sparkles className="w-3 h-3 fill-slate-950 text-amber-500" />
                      <span>{(t('subscribedTierBadge', 'Subscribed Tier ({interval})')).replace('{interval}', activeUserInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly'))}</span>
                    </div>
                  ) : badge ? (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md z-10">
                      {badge}
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black" style={{ color: 'var(--color-text, #f8fafc)' }}>
                        {plan.name}
                      </h4>
                      {isExactActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t('activePlanTag', 'Active Plan')}</span>
                        </span>
                      ) : isMatchingTierOtherInterval ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{t('currentTierTag', 'Current Tier')}</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed min-h-[36px]" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                      {billingInterval === 'annual' ? (plan.description_annual || plan.description_monthly) : plan.description_monthly}
                    </p>

                    {/* Price Tag */}
                    <div className="py-2 border-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--color-text, #f8fafc)' }}>
                          {isPlanFree ? '0.00' : `${currencySymbol}${Number(price || 0).toFixed(2)}`}
                        </span>
                        {!isPlanFree && (
                          <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                            {billingInterval === 'annual' ? t('perYear', '/ year') : t('perMonth', '/ month')}
                          </span>
                        )}
                      </div>

                      {/* Token Allowance Tag */}
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{tokenQuota.toLocaleString()} {tokenIdentity.tokenSymbol} / {billingInterval === 'annual' && !isPlanFree ? 'year' : 'month'}</span>
                      </div>

                      {/* Dynamic Payment Gateways & Wallet Support Badges (Synced with /admin/plans) */}
                      {!isPlanFree && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {plan.allowWalletPayment && (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--color-inner-dark, #070b13)',
                                borderColor: 'var(--color-emerald, #10b981)',
                                color: 'var(--color-emerald, #10b981)'
                              }}
                            >
                              <Wallet className="h-2.5 w-2.5" />
                              <span>Wallet</span>
                            </span>
                          )}

                          {plan.allowGatewayPayment && (plan.allowedGateways || []).includes('stripe') && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border border-blue-500/30 text-blue-400 bg-blue-500/10 flex items-center gap-1">
                              <CreditCard className="h-2.5 w-2.5" />
                              <span>Card</span>
                            </span>
                          )}

                          {plan.allowGatewayPayment && (plan.allowedGateways || []).includes('paypal') && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border border-sky-500/30 text-sky-400 bg-sky-500/10 flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>PayPal</span>
                            </span>
                          )}

                          {plan.allowGatewayPayment && (plan.allowedGateways || []).includes('manual') && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1">
                              <Landmark className="h-2.5 w-2.5" />
                              <span>Wire</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Features Matrix */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                        {t('includedFeaturesLabel', 'Included Features')}:
                      </span>
                      <ul className="space-y-2 text-xs">
                        {featuresList.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                            <span style={{ color: 'var(--color-text, #f8fafc)' }}>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Action Button */}
                  <div className="pt-6 mt-6 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                    {isExactActive ? (
                      <button
                        type="button"
                        disabled={true}
                        aria-disabled="true"
                        className="w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-not-allowed opacity-90 border select-none transition shadow-sm"
                        style={{
                          backgroundColor: 'var(--color-inner-dark, #070b13)',
                          borderColor: 'var(--color-emerald, #10b981)',
                          color: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{t('currentPlanBtn', 'Current Active Plan')}</span>
                      </button>
                    ) : isMatchingTierOtherInterval && !isPlanFree ? (
                      <button
                        type="button"
                        onClick={() => handleSelectPlanAction(plan)}
                        disabled={submitting}
                        className="w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md text-white hover:opacity-90 active:scale-98 disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                        <span>
                          {billingInterval === 'annual' 
                            ? (t('switchIntervalBtn', 'Switch to {interval} Billing')).replace('{interval}', t('annualBilling', 'Annual'))
                            : (t('switchIntervalBtn', 'Switch to {interval} Billing')).replace('{interval}', t('monthlyBilling', 'Monthly'))}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectPlanAction(plan)}
                        disabled={submitting}
                        className={`w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 ${
                          isPlanFree ? 'border hover:bg-white/5' : 'text-white hover:opacity-90 active:scale-98'
                        }`}
                        style={isPlanFree ? {
                          backgroundColor: 'var(--color-inner-dark, #070b13)',
                          borderColor: 'var(--color-border, #1e293b)',
                          color: 'var(--color-text, #f8fafc)'
                        } : {
                          backgroundColor: 'var(--color-emerald, #10b981)'
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>
                          {isPlanFree 
                            ? t('downgradeFreeBtn', 'Switch to Free Tier')
                            : (t('upgradePlanBtn', 'Upgrade to {plan}')).replace('{plan}', plan.name)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: SUBSCRIPTION TRANSACTION HISTORY LEDGER */}
        <div 
          role="region"
          data-lpignore="true"
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2.5" style={{ color: 'var(--color-text, #f8fafc)' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                <span>{t('subscriptionHistoryHeading', 'Subscription Transaction History')}</span>
              </h3>
              <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('noHistorySubtitle', 'When you subscribe or switch plan tiers, payment receipts will automatically appear here.')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 pointer-events-none opacity-60" />
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('searchHistoryPlaceholder', 'Search transactions by plan, gateway, or ID...')}
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  className="pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none font-medium w-48 sm:w-64"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
              >
                <option value="all">{t('allStatuses', 'All Statuses')}</option>
                <option value="succeeded">{t('statusSucceeded', 'Succeeded')}</option>
                <option value="canceled">{t('statusCanceled', 'Canceled')}</option>
                <option value="refunded">{t('statusRefunded', 'Refunded')}</option>
                <option value="failed">{t('statusFailed', 'Failed')}</option>
              </select>
            </div>
          </div>

          {paginatedTransactions.length === 0 ? (
            <div 
              className="p-8 rounded-2xl border text-center space-y-2"
              style={{
                backgroundColor: 'var(--color-inner-dark, #070b13)',
                borderColor: 'var(--color-border, #1e293b)'
              }}
            >
              <CreditCard className="w-8 h-8 mx-auto opacity-40" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text, #f8fafc)' }}>
                {t('noHistoryFound', 'No subscription transactions recorded yet.')}
              </p>
              <p className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('noHistorySubtitle', 'When you subscribe or switch plan tiers, payment receipts will automatically appear here.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr 
                    className="border-b font-extrabold uppercase tracking-wider text-[10px]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #070b13)',
                      borderColor: 'var(--color-border, #1e293b)',
                      color: 'var(--color-text-secondary, #94a3b8)'
                    }}
                  >
                    <th className="px-4 py-3">{t('colDate', 'Date')}</th>
                    <th className="px-4 py-3">{t('colPlan', 'Plan Tier')}</th>
                    <th className="px-4 py-3">{t('colInterval', 'Interval')}</th>
                    <th className="px-4 py-3">{t('colGateway', 'Gateway')}</th>
                    <th className="px-4 py-3">{t('colStatus', 'Status')}</th>
                    <th className="px-4 py-3 text-right">{t('colAmount', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  {paginatedTransactions.map((tx) => {
                    const isSuccess = ['active', 'succeeded', 'successful', 'paid'].includes(tx.status || '');
                    const isCanceled = (tx.status || '').toLowerCase() === 'canceled';

                    return (
                      <tr 
                        key={tx.id}
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{ color: 'var(--color-text, #f8fafc)' }}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] opacity-75">
                          {new Date(tx.created_at || '').toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <div className="flex items-center gap-2">
                            <span>{tx.plan_name}</span>
                            {tx.auto_renew && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                Auto
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-50 font-mono block">ID: {tx.id.substring(0, 14)}...</span>
                        </td>

                        <td className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] opacity-80">
                          {tx.recurring_interval}
                        </td>

                        <td className="px-4 py-3 font-medium uppercase text-[11px] opacity-75">
                          {tx.gateway}
                        </td>

                        <td className="px-4 py-3">
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                          {isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              <Clock className="w-3 h-3" />
                              <span>{t('statusCanceled', 'Canceled')}</span>
                            </span>
                          )}
                          {!isSuccess && !isCanceled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertCircle className="w-3 h-3" />
                              <span className="capitalize">{tx.status}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: 'var(--color-emerald, #10b981)' }}>
                          {currencySymbol}{Number(tx.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t text-xs" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
              <span className="opacity-75">
                {(t('showingTransactionsRange', 'Showing {start} - {end} of {total} transactions'))
                  .replace('{start}', String(startIdx + 1))
                  .replace('{end}', String(Math.min(startIdx + pageSize, filteredTransactions.length)))
                  .replace('{total}', String(filteredTransactions.length))}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage(Math.max(1, safeHistoryPage - 1))}
                  disabled={safeHistoryPage === 1}
                  className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  title={t('prevPage', 'Previous')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPage(Math.min(totalHistoryPages, safeHistoryPage + 1))}
                  disabled={safeHistoryPage === totalHistoryPages}
                  className="p-2 rounded-xl border disabled:opacity-30 cursor-pointer shadow-xs hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  title={t('nextPage', 'Next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: FAQ ACCORDION */}
        <div 
          className="p-6 sm:p-8 rounded-3xl border shadow-xl space-y-4 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card, #0f172a)',
            borderColor: 'var(--color-border, #1e293b)'
          }}
        >
          <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-emerald, #10b981)' }}>
            {t('faqTitle', 'Frequently Asked Questions')}
          </h3>

          <div className="space-y-2.5">
            {[
              { q: t('faqTokensQuestion', 'Do unused AI tokens roll over each month?'), a: t('faqTokensAnswer', 'Yes! Monthly plan token allocations are credited to your persistent token balance and remain available as long as your account is active.') },
              { q: t('faqCancelQuestion', 'Can I change or cancel my plan at any time?'), a: t('faqCancelAnswer', 'Absolutely. You can switch between Monthly and Annual billing or cancel auto-renewal at any time. When canceling, you retain full access until the end of your billing cycle.') }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="border rounded-2xl overflow-hidden transition"
                  style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs leading-relaxed opacity-80 pt-1 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PAYMENT METHOD SELECTION MODAL (Synchronized with /admin/plans & /admin/payment-gateway) */}
        {targetModalPlan && (
          <div 
            onClick={() => !submitting && setTargetModalPlan(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              role="region"
              data-lpignore="true"
              className="border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-card, #0f172a)', borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
            >
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-emerald, #10b981)' }}>
                  {t('walletDeductionModalTitle', 'Confirm Subscription Payment')}
                </h3>
                <button type="button" onClick={() => setTargetModalPlan(null)} className="p-1 rounded-lg hover:opacity-80">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs opacity-80 leading-relaxed">
                  {(t('confirmSubscriptionPaymentDesc', 'You are subscribing to {plan} ({interval}). Select your preferred payment method.'))
                    .replace('{plan}', targetModalPlan.name)
                    .replace('{interval}', billingInterval === 'annual' ? t('annualBilling', 'Annual') : t('monthlyBilling', 'Monthly'))}
                </p>

                {(() => {
                  const planPrice = billingInterval === 'annual'
                    ? Number(targetModalPlan.annual_price_dollars || 0)
                    : Number(targetModalPlan.monthly_price_dollars || 0);

                  const hasWalletFunds = walletBalance >= planPrice;

                  // Plan-specific authorization checked against /admin/plans
                  const isWalletPlanAllowed = targetModalPlan.allowWalletPayment !== false && walletConfig.enabled !== false && walletConfig.allowSubscriptionPayment !== false;
                  const isGatewayPlanAllowed = targetModalPlan.allowGatewayPayment !== false;
                  const allowedGws = targetModalPlan.allowedGateways || ['stripe', 'paypal', 'manual'];

                  const isStripeAvailable = isGatewayPlanAllowed && allowedGws.includes('stripe') && gatewayConfig?.stripe?.enabled !== false && (
                    !gatewayConfig?.activeGateway || gatewayConfig.activeGateway === 'stripe' || gatewayConfig.activeGateway === 'both'
                  );
                  const isPaypalAvailable = isGatewayPlanAllowed && allowedGws.includes('paypal') && gatewayConfig?.paypal?.enabled !== false && (
                    gatewayConfig.activeGateway === 'paypal' || gatewayConfig.activeGateway === 'both'
                  );
                  const isManualAvailable = isGatewayPlanAllowed && allowedGws.includes('manual') && Boolean(gatewayConfig?.manual?.enabled !== false);

                  return (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}>
                        <div className="flex justify-between items-center font-bold">
                          <span>{t('totalDue', 'Total Due')}:</span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            {currencySymbol}{planPrice.toFixed(2)} {currencyCode}
                          </span>
                        </div>
                        {isWalletPlanAllowed && (
                          <div className="flex justify-between items-center text-[11px] opacity-75">
                            <span>{t('storeWalletBalance', 'Your Store Wallet Balance')}:</span>
                            <span className="font-mono font-bold">{currencySymbol}{walletBalance.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Store Wallet Payment (Controlled by /admin/plans) */}
                      {isWalletPlanAllowed && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            disabled={!hasWalletFunds || submitting}
                            onClick={() => setModalPaymentMethod('wallet')}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-between px-4 transition cursor-pointer border shadow-sm ${
                              modalPaymentMethod === 'wallet' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10' : ''
                            } ${hasWalletFunds ? 'hover:border-emerald-500' : 'opacity-40 cursor-not-allowed'}`}
                            style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: modalPaymentMethod === 'wallet' ? 'var(--color-emerald, #10b981)' : 'var(--color-border, #1e293b)' }}
                          >
                            <span className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-emerald-400" />
                              <span>{t('payWithWalletBtn', 'Pay with Store Wallet')}</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-400">{currencySymbol}{planPrice.toFixed(2)}</span>
                          </button>

                          {!hasWalletFunds && (
                            <div className="p-2.5 rounded-xl border text-[10px] text-amber-500 flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: '#f59e0b' }}>
                              <span>{t('insufficientWalletBalance', 'Insufficient wallet balance.')}</span>
                              <Link href={`/wallet?amount=${(planPrice - walletBalance).toFixed(2)}`} className="font-bold underline">
                                {t('topUpWalletBtn', 'Top Up Wallet')}
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dynamic Stripe Gateway */}
                      {isStripeAvailable && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setModalPaymentMethod('stripe')}
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-between px-4 transition shadow cursor-pointer border ${
                            modalPaymentMethod === 'stripe' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-blue-500/10' : 'hover:border-blue-400'
                          }`}
                          style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-400" />
                            <span>{(t('payWithGatewayBtn', 'Pay with {gateway}')).replace('{gateway}', 'Credit Card (Stripe)')}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {gatewayConfig?.stripe?.mode === 'live' ? 'Live SSL' : 'Test Sandbox'}
                          </span>
                        </button>
                      )}

                      {/* Dynamic PayPal Gateway */}
                      {isPaypalAvailable && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setModalPaymentMethod('paypal')}
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-between px-4 transition shadow cursor-pointer border ${
                            modalPaymentMethod === 'paypal' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-sky-500/10' : 'hover:border-sky-400'
                          }`}
                          style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-sky-400" />
                            <span>{(t('payWithGatewayBtn', 'Pay with {gateway}')).replace('{gateway}', 'PayPal Express')}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {gatewayConfig?.paypal?.mode === 'live' ? 'Live' : 'Sandbox'}
                          </span>
                        </button>
                      )}

                      {/* Dynamic Manual / Bank Transfer Gateway */}
                      {isManualAvailable && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setModalPaymentMethod('manual')}
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-between px-4 transition shadow cursor-pointer border ${
                            modalPaymentMethod === 'manual' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-amber-500/10' : 'hover:border-amber-400'
                          }`}
                          style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                        >
                          <span className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-amber-400" />
                            <span>{(t('payWithGatewayBtn', 'Pay with {gateway}')).replace('{gateway}', 'Bank Transfer / Wire')}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Direct Wire
                          </span>
                        </button>
                      )}

                      {/* Detailed Manual Bank Wire Information Box */}
                      {modalPaymentMethod === 'manual' && isManualAvailable && (
                        <div 
                          className="p-4 rounded-2xl border space-y-3 animate-in fade-in transition-all text-xs"
                          style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/10 font-bold text-amber-400">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              <span>{t('bankDetailsHeading', 'Beneficiary Bank Details')}</span>
                            </div>
                            <span className="text-[10px] opacity-75 font-mono">Synced</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="opacity-60 block text-[9px] uppercase font-bold">{t('bankNameLabel', 'Bank Name')}:</span>
                              <strong className="text-slate-200">{gatewayConfig?.manual?.bankName || 'Standard Chartered Bank'}</strong>
                            </div>
                            <div>
                              <span className="opacity-60 block text-[9px] uppercase font-bold">{t('accountHolderLabel', 'Beneficiary Name')}:</span>
                              <strong className="text-slate-200">{gatewayConfig?.manual?.accountHolder || 'Zecratary AI Solutions'}</strong>
                            </div>
                            <div>
                              <span className="opacity-60 block text-[9px] uppercase font-bold">{t('accountNumberLabel', 'Account / IBAN Number')}:</span>
                              <strong className="font-mono font-bold text-emerald-400 text-xs">{gatewayConfig?.manual?.accountNumber || '8492-4910-4491-002'}</strong>
                            </div>
                            <div>
                              <span className="opacity-60 block text-[9px] uppercase font-bold">{t('swiftCodeLabel', 'SWIFT / Branch Code')}:</span>
                              <strong className="font-mono text-slate-200">{gatewayConfig?.manual?.swiftCode || 'SCBLUS33'}</strong>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[9px] uppercase font-bold opacity-60 block">{t('transferRefCodeLabel', 'Payment Reference Note')}:</span>
                              <span className="font-mono font-black text-amber-400 text-xs tracking-wider">{manualRefCode}</span>
                            </div>
                            <button
                              type="button"
                              onClick={copyRefCode}
                              className="px-2.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedRef ? t('copiedBtn', 'Copied!') : t('copyCodeBtn', 'Copy Note')}</span>
                            </button>
                          </div>

                          <div>
                            <label className="text-[9px] uppercase font-bold opacity-60 block mb-1">
                              {t('userTransferRefLabel', 'Your Transfer Slip / Transaction ID (Optional):')}
                            </label>
                            <input
                              type="text"
                              value={userTransferSlip}
                              onChange={(e) => setUserTransferSlip(e.target.value)}
                              placeholder="e.g. TXN-94819204 or Bank receipt code"
                              className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              style={{ borderColor: 'var(--color-border, #1e293b)', color: 'var(--color-text, #f8fafc)' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* No payment modes allowed guard */}
                      {!isWalletPlanAllowed && !isStripeAvailable && !isPaypalAvailable && !isManualAvailable && (
                        <div className="p-4 rounded-2xl border text-center space-y-1 border-red-500/40 bg-red-500/10 text-red-400">
                          <AlertCircle className="w-5 h-5 mx-auto" />
                          <p className="font-bold text-xs">{t('noPaymentAllowedAlert', 'No payment purchase methods are currently enabled for this plan tier.')}</p>
                          <p className="text-[10px] opacity-80">{t('contactAdminToEnable', 'Please contact the system administrator to activate payment options in /admin/plans.')}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                  <button
                    type="button"
                    onClick={() => setTargetModalPlan(null)}
                    disabled={submitting}
                    className="px-4 py-2.5 border rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark, #070b13)', borderColor: 'var(--color-border, #1e293b)' }}
                  >
                    {t('cancelBtn', 'Cancel')}
                  </button>

                  <button
                    type="button"
                    disabled={
                      submitting || 
                      (modalPaymentMethod === 'wallet' && walletBalance < (billingInterval === 'annual' ? targetModalPlan.annual_price_dollars : targetModalPlan.monthly_price_dollars))
                    }
                    onClick={() => {
                      const amount = billingInterval === 'annual' ? Number(targetModalPlan.annual_price_dollars || 0) : Number(targetModalPlan.monthly_price_dollars || 0);
                      executePlanSwitch(targetModalPlan, modalPaymentMethod, amount);
                    }}
                    className="px-5 py-2.5 rounded-xl font-black text-white shadow-lg transition hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    style={{ backgroundColor: 'var(--color-emerald, #10b981)' }}
                  >
                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{submitting ? t('processingPlanBtn', 'Processing...') : t('confirmAndPayBtn', 'Confirm & Activate Plan')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
