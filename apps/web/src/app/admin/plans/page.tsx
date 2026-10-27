// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Sparkles, Plus, Trash2, Edit3, Check, RefreshCw, 
  RotateCcw, CheckCircle2, AlertCircle, Shield, Zap, Flame, 
  Lock, Eye, Cpu, Database, Search, SlidersHorizontal, DollarSign,
  Users, TrendingUp, X, ExternalLink, Layers
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export interface PlanConfig {
  id: string;
  name: string;
  slug: string;
  badge?: string;
  monthlyPriceDollars: number;
  annualPriceDollars: number;
  descriptionMonthly?: string;
  descriptionAnnual?: string;
  tokensMonthly: number;
  tokensAnnual: number;
  tokenLimit?: number;
  maxSavedRecipes: number;
  allowedModels: string[];
  features: string[];
  canViewMacros: boolean;
  isFree?: boolean;
  isDefault?: boolean;
}

export interface PaymentTransaction {
  id: string;
  userEmail: string;
  userName?: string;
  planName: string;
  planSlug: string;
  amount: number;
  currency: string;
  billingInterval: 'monthly' | 'annual';
  status: 'active' | 'completed' | 'cancelled';
  autoRenew: boolean;
  createdAt: string;
}

const AVAILABLE_AI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'deepseek-r1', name: 'DeepSeek R1' }
];

const DEFAULT_PRESET_TASTER: PlanConfig = {
  id: 'preset_taster',
  name: 'Taster',
  slug: 'taster',
  badge: 'Free Tier',
  monthlyPriceDollars: 0,
  annualPriceDollars: 0,
  descriptionMonthly: 'Essential culinary companion for exploring AI recipes.',
  descriptionAnnual: 'Essential culinary companion for exploring AI recipes.',
  tokensMonthly: 25000,
  tokensAnnual: 25000,
  tokenLimit: 25000,
  maxSavedRecipes: 15,
  allowedModels: ['gemini-2.5-flash'],
  features: [
    'Basic AI Recipe Generation',
    'Pantry Spoilage Alerts',
    'Community Cookbooks Access'
  ],
  canViewMacros: false,
  isFree: true,
  isDefault: true
};

const DEFAULT_PRESET_NUTRITION_PRO: PlanConfig = {
  id: 'preset_nutrition_pro',
  name: 'Nutrition Pro',
  slug: 'nutrition-pro',
  badge: 'Most Popular',
  monthlyPriceDollars: 8.99,
  annualPriceDollars: 59.99,
  descriptionMonthly: 'Advanced meal planning with macro telemetry and custom diets.',
  descriptionAnnual: 'Ultimate savings on personalized culinary formulation.',
  tokensMonthly: 250000,
  tokensAnnual: 3000000,
  tokenLimit: 250000,
  maxSavedRecipes: 250,
  allowedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-4o'],
  features: [
    'Everything in Taster',
    'Full Macronutrient Tracking (Macros)',
    'Automated Aisle Grocery Consolidation',
    'AI Smart Sub-Recipe Formulator'
  ],
  canViewMacros: true,
  isFree: false
};

const DEFAULT_PLANS: PlanConfig[] = [
  DEFAULT_PRESET_TASTER,
  DEFAULT_PRESET_NUTRITION_PRO,
  {
    id: 'preset_executive_chef',
    name: 'Executive Chef',
    slug: 'executive-chef',
    badge: 'Best Value',
    monthlyPriceDollars: 19.99,
    annualPriceDollars: 149.99,
    descriptionMonthly: 'Unrestricted culinary power for chefs and nutritionists.',
    descriptionAnnual: 'VIP annual pass with maximum token allowances.',
    tokensMonthly: 1000000,
    tokensAnnual: 12000000,
    tokenLimit: 1000000,
    maxSavedRecipes: -1,
    allowedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-4o', 'claude-3-7-sonnet', 'deepseek-r1'],
    features: [
      'Everything in Nutrition Pro',
      'Unlimited Saved Recipes',
      'Priority High-Tier Model Access',
      'Custom Dietary Export to PDF & CSV',
      'Direct Concierge Culinary Advice'
    ],
    canViewMacros: true,
    isFree: false
  }
];

export default function AdminPlansPage() {
  const { t, locale } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  // Tab State: 'plans' (Plan Editor & Mockup) or 'transactions' (Ledger)
  const [activeTab, setActiveTab] = useState<'plans' | 'transactions'>('plans');

  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Dynamic Currency & Token Telemetry
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [tokenSymbol, setTokenSymbol] = useState('🪙');
  const [tokenName, setTokenName] = useState('Tokens');

  // Plan Form State (for Add or Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Culinary Pro');
  const [slug, setSlug] = useState('culinary-pro');
  const [badge, setBadge] = useState('Most Popular');
  const [monthlyPriceDollars, setMonthlyPriceDollars] = useState<number>(9.99);
  const [annualPriceDollars, setAnnualPriceDollars] = useState<number>(79.99);
  const [descriptionMonthly, setDescriptionMonthly] = useState('Ideal for passionate home cooks.');
  const [descriptionAnnual, setDescriptionAnnual] = useState('Maximum savings with yearly billing.');
  const [tokensMonthly, setTokensMonthly] = useState<number>(250000);
  const [tokensAnnual, setTokensAnnual] = useState<number>(3000000);
  const [maxSavedRecipes, setMaxSavedRecipes] = useState<number>(200);
  const [allowedModels, setAllowedModels] = useState<string[]>(['gemini-2.5-flash', 'gemini-2.5-pro']);
  const [features, setFeatures] = useState<string[]>([
    'Full Macronutrient Tracking (Macros)',
    'Automated Aisle Grocery Consolidation',
    'AI Smart Recipe Formulator'
  ]);
  const [canViewMacros, setCanViewMacros] = useState<boolean>(true);
  const [isFree, setIsFree] = useState<boolean>(false);

  // Live Card Mockup Billing Toggle
  const [mockupBillingInterval, setMockupBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  // Feature Input State
  const [newFeatureText, setNewFeatureText] = useState('');

  // Transactions State (Tab 2)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([
    {
      id: 'tx_np_8921',
      userEmail: 'chef.marcus@kitchenpro.com',
      userName: 'Marcus Vance',
      planName: 'Nutrition Pro',
      planSlug: 'nutrition-pro',
      amount: 8.99,
      currency: 'USD',
      billingInterval: 'monthly',
      status: 'active',
      autoRenew: true,
      createdAt: '2026-10-24 14:32'
    },
    {
      id: 'tx_ec_1042',
      userEmail: 'sarah.boulanger@bistroparis.fr',
      userName: 'Sarah Boulanger',
      planName: 'Executive Chef',
      planSlug: 'executive-chef',
      amount: 149.99,
      currency: 'USD',
      billingInterval: 'annual',
      status: 'active',
      autoRenew: true,
      createdAt: '2026-10-21 09:15'
    },
    {
      id: 'tx_ta_5011',
      userEmail: 'kenji.tanaka@tokyoeats.jp',
      userName: 'Kenji Tanaka',
      planName: 'Taster',
      planSlug: 'taster',
      amount: 0.00,
      currency: 'USD',
      billingInterval: 'monthly',
      status: 'completed',
      autoRenew: false,
      createdAt: '2026-10-18 18:40'
    }
  ]);
  const [txSearch, setTxSearch] = useState('');
  const [txPlanFilter, setTxPlanFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');

  // Add/Edit Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txEditingId, setTxEditingId] = useState<string | null>(null);
  const [modalEmail, setModalEmail] = useState('');
  const [modalPlanSlug, setModalPlanSlug] = useState('nutrition-pro');
  const [modalAmount, setModalAmount] = useState<number>(8.99);
  const [modalInterval, setModalInterval] = useState<'monthly' | 'annual'>('monthly');
  const [modalAutoRenew, setModalAutoRenew] = useState(true);

  // Fetch token settings from /api/admin/token-setting
  const fetchTokenSetting = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/token-setting?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.tokenSymbol) setTokenSymbol(data.tokenSymbol);
        if (data.tokenName) setTokenName(data.tokenName);
      }
    } catch (_) {}
  }, []);

  // Fetch system currency from /api/system-settings
  const fetchSystemSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/system-settings?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.currency) setCurrencyCode(data.currency);
        if (data.currencySymbol) setCurrencySymbol(data.currencySymbol);
      }
    } catch (_) {}
  }, []);

  // Fetch plans from /api/admin/plans with universal normalization
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.configs || data.plans || data.packages || []);
        if (Array.isArray(rawList) && rawList.length > 0) {
          const normalized: PlanConfig[] = rawList.map((p: any) => ({
            id: p.id || ('plan_' + p.slug),
            name: p.name || 'Custom Plan',
            slug: (p.slug || p.id || 'plan').toLowerCase().replace(/[^a-z0-9-]/g, ''),
            badge: p.badge || '',
            monthlyPriceDollars: Number(p.monthlyPriceDollars ?? p.monthly_price ?? p.price ?? 0),
            annualPriceDollars: Number(p.annualPriceDollars ?? p.annual_price ?? 0),
            descriptionMonthly: p.descriptionMonthly || p.description_monthly || '',
            descriptionAnnual: p.descriptionAnnual || p.description_annual || '',
            tokensMonthly: Number(p.tokensMonthly ?? p.tokens_monthly ?? p.tokenLimit ?? 0),
            tokensAnnual: Number(p.tokensAnnual ?? p.tokens_annual ?? 0),
            tokenLimit: Number(p.tokensMonthly ?? p.tokens_monthly ?? p.tokenLimit ?? 0),
            maxSavedRecipes: Number(p.maxSavedRecipes ?? p.max_saved_recipes ?? 50),
            allowedModels: Array.isArray(p.allowedModels || p.allowed_models) ? (p.allowedModels || p.allowed_models) : ['gemini-2.5-flash'],
            features: Array.isArray(p.features) ? p.features : [],
            canViewMacros: Boolean(p.canViewMacros ?? p.can_view_macros),
            isFree: Boolean(p.isFree ?? p.is_free ?? (Number(p.monthlyPriceDollars ?? p.monthly_price ?? 0) === 0 && Number(p.annualPriceDollars ?? p.annual_price ?? 0))),
            isDefault: Boolean(p.isDefault ?? p.is_default ?? p.slug === 'taster')
          }));
          setPlans(normalized);
          return;
        }
      }
      setPlans([DEFAULT_PRESET_TASTER]);
    } catch (err) {
      console.warn('Notice loading /admin/plans:', err);
      setPlans([DEFAULT_PRESET_TASTER]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = tr('adminPlansDocTitle', 'Subscription Plans - Admin Console');
    fetchTokenSetting();
    fetchSystemSettings();
    loadPlans();

    const handleSync = () => {
      fetchTokenSetting();
      fetchSystemSettings();
      loadPlans();
    };

    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchTokenSetting, fetchSystemSettings, loadPlans, tr]);

  // Load preset plan directly into editor
  const applyPreset = (preset: PlanConfig) => {
    setEditingId(preset.id);
    setName(preset.name);
    setSlug(preset.slug);
    setBadge(preset.badge || '');
    setMonthlyPriceDollars(preset.monthlyPriceDollars);
    setAnnualPriceDollars(preset.annualPriceDollars);
    setDescriptionMonthly(preset.descriptionMonthly || '');
    setDescriptionAnnual(preset.descriptionAnnual || '');
    setTokensMonthly(preset.tokensMonthly);
    setTokensAnnual(preset.tokensAnnual);
    setMaxSavedRecipes(preset.maxSavedRecipes);
    setAllowedModels(preset.allowedModels);
    setFeatures(preset.features);
    setCanViewMacros(preset.canViewMacros);
    setIsFree(Boolean(preset.isFree));
    setStatus({
      type: 'success',
      msg: `Loaded preset: ${preset.name}`
    });
  };

  // Load plan into the editor
  const handleEditPlan = (plan: PlanConfig) => {
    setEditingId(plan.id);
    setName(plan.name);
    setSlug(plan.slug);
    setBadge(plan.badge || '');
    setMonthlyPriceDollars(Number(plan.monthlyPriceDollars || 0));
    setAnnualPriceDollars(Number(plan.annualPriceDollars || 0));
    setDescriptionMonthly(plan.descriptionMonthly || '');
    setDescriptionAnnual(plan.descriptionAnnual || '');
    setTokensMonthly(Number(plan.tokensMonthly || 0));
    setTokensAnnual(Number(plan.tokensAnnual || 0));
    setMaxSavedRecipes(Number(plan.maxSavedRecipes || 50));
    setAllowedModels(plan.allowedModels || ['gemini-2.5-flash']);
    setFeatures(plan.features || []);
    setCanViewMacros(Boolean(plan.canViewMacros));
    setIsFree(Boolean(plan.isFree));
    setStatus(null);
  };

  const handleResetForm = () => {
    setEditingId(null);
    setName('Culinary Pro');
    setSlug('culinary-pro');
    setBadge('Most Popular');
    setMonthlyPriceDollars(9.99);
    setAnnualPriceDollars(79.99);
    setDescriptionMonthly('Ideal for passionate home cooks.');
    setDescriptionAnnual('Maximum savings with yearly billing.');
    setTokensMonthly(250000);
    setTokensAnnual(3000000);
    setMaxSavedRecipes(200);
    setAllowedModels(['gemini-2.5-flash', 'gemini-2.5-pro']);
    setFeatures([
      'Full Macronutrient Tracking (Macros)',
      'Automated Aisle Grocery Consolidation',
      'AI Smart Recipe Formulator'
    ]);
    setCanViewMacros(true);
    setIsFree(false);
  };

  // Toggle model selection
  const handleToggleModel = (modelId: string) => {
    if (allowedModels.includes(modelId)) {
      if (allowedModels.length > 1) {
        setAllowedModels(allowedModels.filter(m => m !== modelId));
      }
    } else {
      setAllowedModels([...allowedModels, modelId]);
    }
  };

  // Add feature item
  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures([...features, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  // Persist plan to PostgreSQL & MySQL via /api/admin/plans
  const handleSavePlan = async () => {
    setSaving(true);
    setStatus(null);

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const finalMonthlyPrice = isFree ? 0 : Number(monthlyPriceDollars || 0);
    const finalAnnualPrice = isFree ? 0 : Number(annualPriceDollars || 0);

    const targetPlan: PlanConfig = {
      id: editingId || ('plan_' + cleanSlug + '_' + Date.now().toString(36)),
      name: name.trim(),
      slug: cleanSlug,
      badge: badge.trim(),
      monthlyPriceDollars: finalMonthlyPrice,
      annualPriceDollars: finalAnnualPrice,
      descriptionMonthly: descriptionMonthly.trim(),
      descriptionAnnual: descriptionAnnual.trim(),
      tokensMonthly: Number(tokensMonthly || 0),
      tokensAnnual: Number(tokensAnnual || 0),
      tokenLimit: Number(tokensMonthly || 0),
      maxSavedRecipes: Number(maxSavedRecipes || 50),
      allowedModels,
      features,
      canViewMacros: isFree ? false : Boolean(canViewMacros),
      isFree: Boolean(isFree),
      isDefault: cleanSlug === 'taster'
    };

    const nextPlans = editingId 
      ? plans.map(p => p.id === editingId ? targetPlan : p)
      : [...plans.filter(p => p.slug !== cleanSlug), targetPlan];

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_plan',
          plan: targetPlan,
          plans: nextPlans
        })
      });

      if (!res.ok) {
        throw new Error('Failed to persist plan to database.');
      }

      setPlans(nextPlans);
      setEditingId(null);

      // Broadcast update across /subscriptions, /profile, /admin/payment
      window.dispatchEvent(new Event('zecratary_plans_updated'));
      localStorage.setItem('zecratary_plans_updated_at', Date.now().toString());

      setStatus({
        type: 'success',
        msg: tr('adminPlansSaveSuccess', 'Subscription plan saved and synchronized to PostgreSQL & MySQL!')
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        msg: err.message || 'Error saving subscription plan.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete plan safely (protecting taster default and cascading user reassignment)
  const handleDeletePlan = async (plan: PlanConfig) => {
    if (plan.slug === 'taster' || plan.isDefault) {
      alert(tr('adminPlansCannotDeleteDefault', 'Cannot delete default free plan (taster)'));
      return;
    }

    if (!confirm(tr('adminPlansDeleteConfirm', 'Are you sure you want to delete this subscription plan? Users on this plan will revert to the Free Tier.'))) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/plans?id=${encodeURIComponent(plan.id)}&slug=${encodeURIComponent(plan.slug)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete plan.');
      }

      const updated = plans.filter(p => p.id !== plan.id && p.slug !== plan.slug);
      setPlans(updated);

      if (editingId === plan.id) {
        handleResetForm();
      }

      window.dispatchEvent(new Event('zecratary_plans_updated'));
      localStorage.setItem('zecratary_plans_updated_at', Date.now().toString());

      setStatus({
        type: 'success',
        msg: tr('adminPlansDeleteSuccess', 'Plan deleted successfully!')
      });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to delete plan.' });
    }
  };

  // Restore Default Seeded Plans
  const handleResetDefaults = async () => {
    if (!confirm('Restore default subscription packages (Taster, Nutrition Pro, Executive Chef)?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_defaults',
          plans: DEFAULT_PLANS
        })
      });

      setPlans(DEFAULT_PLANS);
      handleResetForm();

      window.dispatchEvent(new Event('zecratary_plans_updated'));
      localStorage.setItem('zecratary_plans_updated_at', Date.now().toString());

      setStatus({
        type: 'success',
        msg: tr('adminPlansResetSuccess', 'Default plans restored and synchronized!')
      });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Auto-Renew for Transaction
  const handleToggleAutoRenew = (txId: string) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, autoRenew: !t.autoRenew } : t));
  };

  // Add or Edit Transaction
  const handleSaveTransaction = () => {
    if (!modalEmail.trim()) return;
    const selectedPlan = plans.find(p => p.slug === modalPlanSlug) || DEFAULT_PRESET_NUTRITION_PRO;
    
    if (txEditingId) {
      setTransactions(prev => prev.map(t => t.id === txEditingId ? {
        ...t,
        userEmail: modalEmail.trim(),
        planSlug: modalPlanSlug,
        planName: selectedPlan.name,
        amount: Number(modalAmount || 0),
        billingInterval: modalInterval,
        autoRenew: modalAutoRenew
      } : t));
    } else {
      const newTx: PaymentTransaction = {
        id: 'tx_' + Date.now().toString(36),
        userEmail: modalEmail.trim(),
        userName: modalEmail.split('@')[0],
        planSlug: modalPlanSlug,
        planName: selectedPlan.name,
        amount: Number(modalAmount || 0),
        currency: currencyCode,
        billingInterval: modalInterval,
        status: 'active',
        autoRenew: modalAutoRenew,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };
      setTransactions([newTx, ...transactions]);
    }

    setIsTxModalOpen(false);
    setTxEditingId(null);
    setModalEmail('');
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !txSearch || 
        t.userEmail.toLowerCase().includes(txSearch.toLowerCase()) || 
        (t.userName && t.userName.toLowerCase().includes(txSearch.toLowerCase())) ||
        t.id.toLowerCase().includes(txSearch.toLowerCase());
      const matchesPlan = txPlanFilter === 'all' || t.planSlug === txPlanFilter;
      const matchesStatus = txStatusFilter === 'all' || t.status === txStatusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [transactions, txSearch, txPlanFilter, txStatusFilter]);

  // Calculate live savings percentage on the mockup
  const savingsPercent = useMemo(() => {
    if (isFree || monthlyPriceDollars <= 0) return 0;
    const yearlyEquivalent = monthlyPriceDollars * 12;
    if (annualPriceDollars >= yearlyEquivalent) return 0;
    const diff = yearlyEquivalent - annualPriceDollars;
    return Math.round((diff / yearlyEquivalent) * 100);
  }, [monthlyPriceDollars, annualPriceDollars, isFree]);

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 pb-24 font-sans transition-colors duration-200 box-border"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header with Telemetry Badges & Action Bar */}
      <div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 pt-2" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <CreditCard className="h-6 w-6" /> {tr('adminPlansTitle', 'Subscription Plans & Pricing Packages')}
            </h1>
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold shadow-xs"
              style={{ 
                backgroundColor: 'var(--color-inner-dark)', 
                borderColor: 'var(--color-border)', 
                color: 'var(--color-text)' 
              }}
            >
              <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{tr('adminPlansSyncBadge', 'Synced with PostgreSQL & MySQL')}</span>
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('adminPlansSubtitle', 'Configure billing intervals, token quotas, AI model access, and feature limits synced to PostgreSQL & MySQL.')}
          </p>
        </div>

        {/* Global Toolbar & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div 
            className="flex p-1 rounded-xl border mr-1"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer"
              style={activeTab === 'plans' ? {
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-primary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              } : { color: 'var(--color-text-secondary)' }}
            >
              {tr('adminPlansTabPlans', 'Subscription Plans')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer"
              style={activeTab === 'transactions' ? {
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-primary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              } : { color: 'var(--color-text-secondary)' }}
            >
              {tr('adminPlansTabTransactions', 'Plan Transactions Ledger')}
            </button>
          </div>

          <button
            type="button"
            onClick={loadPlans}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-xs disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{tr('adminPlansReloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-xs"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{tr('adminPlansResetDefaults', 'Reset Defaults')}</span>
          </button>

          {activeTab === 'plans' ? (
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-xs"
              style={{ 
                backgroundColor: 'var(--color-inner-dark)', 
                borderColor: 'var(--color-emerald, #10b981)',
                color: 'var(--color-emerald, #10b981)'
              }}
            >
              <Plus className="h-4 w-4" />
              <span>{tr('adminPlansAddNewPlanBtn', '+ Add New Plan')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTxEditingId(null);
                setModalEmail('');
                setModalAmount(8.99);
                setIsTxModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-xs text-white"
              style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
            >
              <Plus className="h-4 w-4" />
              <span>{tr('adminPlansBtnAddPayment', '+ Add Payment')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Presets Bar (Source 3) */}
      {activeTab === 'plans' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Quick Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset(DEFAULT_PRESET_NUTRITION_PRO)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
          >
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>{tr('adminPlansPresetNutritionPro', 'Preset: Nutrition Pro (Paid, Macros Active)')}</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset(DEFAULT_PRESET_TASTER)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{tr('adminPlansPresetTaster', 'Preset: Taster (Free, Macros Locked)')}</span>
          </button>
        </div>
      )}

      {/* TAB 1: SUBSCRIPTION PLANS & MOCKUP */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Main 2-Column Responsive Layout: Editor (Left 7 cols) & Live Card Mockup (Right 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: PLAN CONFIGURATION EDITOR (7 Cols) */}
            <div 
              role="region"
              aria-label="Plan Configuration Editor"
              data-lpignore="true"
              className="lg:col-span-7 rounded-3xl p-6 space-y-5 border shadow-xl transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    {tr('adminPlansEditorHeading', 'Plan Configuration & Parameters')}
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {tr('adminPlansEditorSubtitle', 'Define pricing tiers, token allowances, model permissions, and feature lists.')}
                  </p>
                </div>

                {editingId && (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                    Editing: {name}
                  </span>
                )}
              </div>

              {/* Basic Plan Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelName', 'Plan Name *')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingId && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    placeholder={tr('adminPlansPlaceholderName', 'e.g. Culinary Pro')}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelSlug', 'Slug Identifier *')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={tr('adminPlansPlaceholderSlug', 'e.g. culinary-pro')}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelBadge', 'Badge / Ribbon Tag')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder={tr('adminPlansPlaceholderBadge', 'e.g. Most Popular, Best Value')}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              {/* Pricing Controls */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    Billing & Pricing ({currencyCode})
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsFree(checked);
                        if (checked) {
                          setMonthlyPriceDollars(0);
                          setAnnualPriceDollars(0);
                          setCanViewMacros(false);
                        }
                      }}
                      className="rounded border"
                    />
                    <span>{tr('adminPlansLabelFreeTier', 'Mark as Free Tier (Taster)')}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">
                      {tr('adminPlansLabelMonthlyPrice', 'Monthly Price ({currency}) *').replace('{currency}', currencySymbol)}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isFree}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      value={monthlyPriceDollars}
                      onChange={(e) => setMonthlyPriceDollars(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none disabled:opacity-40"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">
                      {tr('adminPlansLabelAnnualPrice', 'Annual Price ({currency}) *').replace('{currency}', currencySymbol)}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isFree}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      value={annualPriceDollars}
                      onChange={(e) => setAnnualPriceDollars(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none disabled:opacity-40"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">{tr('adminPlansLabelMonthlyDesc', 'Monthly Tagline')}</label>
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      value={descriptionMonthly}
                      onChange={(e) => setDescriptionMonthly(e.target.value)}
                      placeholder={tr('adminPlansPlaceholderMonthlyDesc', 'e.g. Ideal for passionate home cooks.')}
                      className="w-full px-3 py-2 rounded-xl border outline-none font-medium"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">{tr('adminPlansLabelAnnualDesc', 'Annual Tagline')}</label>
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      value={descriptionAnnual}
                      onChange={(e) => setDescriptionAnnual(e.target.value)}
                      placeholder={tr('adminPlansPlaceholderAnnualDesc', 'e.g. Maximum savings with yearly billing.')}
                      className="w-full px-3 py-2 rounded-xl border outline-none font-medium"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Tokens & Recipe Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelMonthlyTokens', 'Monthly Token Grant ({symbol})').replace('{symbol}', tokenSymbol)}
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={tokensMonthly}
                    onChange={(e) => setTokensMonthly(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelAnnualTokens', 'Annual Token Grant ({symbol})').replace('{symbol}', tokenSymbol)}
                  </label>
                  <input
                    type="number"
                    step="25000"
                    min="0"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={tokensAnnual}
                    onChange={(e) => setTokensAnnual(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelMaxSaved', 'Max Saved Recipes Limit')}
                  </label>
                  <input
                    type="number"
                    min="-1"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={maxSavedRecipes}
                    onChange={(e) => setMaxSavedRecipes(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-[10px] opacity-60 mt-0.5 block">(-1 = Unlimited)</span>
                </div>
              </div>

              {/* Model Permissions & Macronutrients Tracking */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {tr('adminPlansLabelAllowedModels', 'Allowed AI Chef Models')}
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={canViewMacros}
                      disabled={isFree}
                      onChange={(e) => setCanViewMacros(e.target.checked)}
                      className="rounded border"
                    />
                    <span className={isFree ? 'opacity-40' : ''}>
                      {tr('adminPlansLabelMacros', 'Enable Macronutrient Tracking (can_view_macros)')}
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AI_MODELS.map(model => {
                    const isSelected = allowedModels.includes(model.id);
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleToggleModel(model.id)}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        style={isSelected ? {
                          backgroundColor: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)',
                          color: '#ffffff'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        <Cpu className="h-3.5 w-3.5" />
                        <span>{model.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Features Checklist Builder */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {tr('adminPlansLabelFeatures', 'Features & Entitlements Checklist')}
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddFeature(); }}
                    placeholder={tr('adminPlansPlaceholderFeature', 'e.g. Real-time ingredient nutritional breakdowns')}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none font-medium"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    {tr('adminPlansAddFeatureBtn', '+ Add Feature')}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 pt-1">
                  {features.map((feat, idx) => (
                    <div 
                      key={idx}
                      className="px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-xs"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
                        <span style={{ color: 'var(--color-text)' }}>{feat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-4 py-2.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {tr('adminPlansBtnCancelEdit', 'Cancel Edit')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={saving || !name.trim()}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Check className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                  <span>{saving ? tr('adminPlansSaving', 'Saving...') : tr('adminPlansBtnSavePlan', 'Save & Synchronize Plan')}</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: INTERACTIVE LIVE PRICING CARD MOCKUP (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Eye className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {tr('adminPlansMockupHeading', 'Live Pricing Card Mockup')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('adminPlansMockupSubtitle', 'Real-time interactive preview of how this card renders on /subscriptions and landing pages.')}
                </p>
              </div>

              {/* Interactive Billing Interval Switcher */}
              <div 
                className="flex p-1.5 rounded-2xl border transition-colors duration-200"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => setMockupBillingInterval('monthly')}
                  className="flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer"
                  style={mockupBillingInterval === 'monthly' ? {
                    backgroundColor: 'var(--color-card)',
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    borderWidth: '1px'
                  } : { color: 'var(--color-text-secondary)' }}
                >
                  {tr('adminPlansMockupMonthly', 'Monthly Billing')}
                </button>

                <button
                  type="button"
                  onClick={() => setMockupBillingInterval('annual')}
                  className="flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  style={mockupBillingInterval === 'annual' ? {
                    backgroundColor: 'var(--color-card)',
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    borderWidth: '1px'
                  } : { color: 'var(--color-text-secondary)' }}
                >
                  <span>{tr('adminPlansMockupAnnual', 'Annual Billing')}</span>
                  {savingsPercent > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400">
                      {tr('adminPlansMockupSaveBadge', 'Save ~{pct}%').replace('{pct}', String(savingsPercent))}
                    </span>
                  )}
                </button>
              </div>

              {/* The Live Card Replica */}
              <div 
                className="p-6 rounded-3xl border shadow-2xl space-y-5 transition-all duration-200 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: badge ? 'var(--color-primary)' : 'var(--color-border)',
                  borderWidth: badge ? '2px' : '1px'
                }}
              >
                {/* Ribbon Badge */}
                {badge && (
                  <div className="flex justify-between items-center">
                    <span 
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {badge}
                    </span>
                    <span className="text-[10px] font-mono opacity-60">
                      {slug}
                    </span>
                  </div>
                )}

                <div>
                  <h4 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    {name || 'Plan Title'}
                  </h4>
                  <p className="text-xs mt-1 font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {mockupBillingInterval === 'monthly' ? descriptionMonthly : descriptionAnnual}
                  </p>
                </div>

                {/* Price Display */}
                <div className="border-t border-b py-4" style={{ borderColor: 'var(--color-border)' }}>
                  {isFree ? (
                    <div className="text-3xl font-black text-emerald-400">
                      Free
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black" style={{ color: 'var(--color-primary)' }}>
                        {currencySymbol}{mockupBillingInterval === 'monthly' ? monthlyPriceDollars.toFixed(2) : annualPriceDollars.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {mockupBillingInterval === 'monthly' ? tr('adminPlansMockupPerMonth', '/ month') : tr('adminPlansMockupBilledAnnually', 'billed annually')}
                      </span>
                    </div>
                  )}

                  {/* Token Grant Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black font-mono border flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                      <span>{tokenSymbol}</span>
                      <span>
                        {(tr('adminPlansMockupTokensPerCycle', '{tokens} {symbol} / cycle')).replace('{tokens}', (mockupBillingInterval === 'monthly' ? tokensMonthly : tokensAnnual).toLocaleString()).replace('{symbol}', tokenName)}
                      </span>
                    </span>
                    {canViewMacros && !isFree ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {tr('adminPlansMacrosActive', 'Macros Active')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {tr('adminPlansMacrosLocked', 'Macros Locked (blur)')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nutritional Macro Analysis Telemetry Mockup Preview (Source 3) */}
                <div 
                  className="p-3.5 rounded-2xl border space-y-2 relative"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                      {tr('adminPlansDailyMacros', 'Daily Average Macros')}
                    </span>
                    {canViewMacros && !isFree ? (
                      <span className="text-[9px] font-extrabold text-emerald-400 uppercase">Unlocked</span>
                    ) : (
                      <span className="text-[9px] font-extrabold text-amber-400 uppercase flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Gated
                      </span>
                    )}
                  </div>

                  {/* Macro telemetry data grid */}
                  <div className={`grid grid-cols-4 gap-2 text-center transition-all ${canViewMacros && !isFree ? '' : 'blur-[4px] select-none opacity-60 pointer-events-none'}`}>
                    <div className="p-1.5 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <span className="block text-[9px] opacity-60">{tr('adminPlansCalories', 'Calories')}</span>
                      <span className="text-xs font-black">520 kcal</span>
                    </div>
                    <div className="p-1.5 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <span className="block text-[9px] opacity-60">{tr('adminPlansProtein', 'Protein')}</span>
                      <span className="text-xs font-black text-emerald-400">32g</span>
                    </div>
                    <div className="p-1.5 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <span className="block text-[9px] opacity-60">{tr('adminPlansCarbs', 'Carbs')}</span>
                      <span className="text-xs font-black text-amber-400">45g</span>
                    </div>
                    <div className="p-1.5 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                      <span className="block text-[9px] opacity-60">{tr('adminPlansFat', 'Fat')}</span>
                      <span className="text-xs font-black text-rose-400">18g</span>
                    </div>
                  </div>

                  {(!canViewMacros || isFree) && (
                    <div className="text-center pt-1">
                      <Link 
                        href="/subscriptions"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        <span>{tr('adminPlansUpgradeToUnlock', 'Upgrade to Unlock Macros')}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Models Access Tags */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">
                    Included AI Models
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedModels.map(m => (
                      <span 
                        key={m} 
                        className="px-2 py-0.5 rounded-lg border text-[10px] font-bold"
                        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        {AVAILABLE_AI_MODELS.find(x => x.id === m)?.name || m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">
                    Features & Quotas
                  </span>
                  <ul className="space-y-1.5 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
                      <span>
                        {maxSavedRecipes === -1 ? tr('adminPlansUnlimitedRecipes', 'Unlimited Recipes') : `${maxSavedRecipes} Saved Recipes Capacity`}
                      </span>
                    </li>
                    {features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Simulated Action CTA Button */}
                <button
                  type="button"
                  className="w-full py-3 rounded-2xl text-xs font-extrabold text-white shadow-lg transition hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {tr('adminPlansMockupGetStarted', 'Get Started Now')}
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: PUBLISHED PLANS TABLE */}
          <div className="space-y-3 pt-4">
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                {tr('adminPlansTableHeading', 'Published Subscription Packages')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('adminPlansTableSubtitle', 'Authoritative plan records currently active and available across the system.')}
              </p>
            </div>

            <div 
              className="border rounded-3xl overflow-hidden shadow-xl transition-colors"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead 
                    className="border-b uppercase font-bold text-[10px] tracking-wider"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <tr>
                      <th className="px-5 py-4">{tr('adminPlansColPlan', 'Plan Tier & Badge')}</th>
                      <th className="px-5 py-4">{tr('adminPlansColSlug', 'Slug')}</th>
                      <th className="px-5 py-4">{tr('adminPlansColPricing', 'Monthly / Annual')}</th>
                      <th className="px-5 py-4">{tr('adminPlansColTokens', 'Token Quota')}</th>
                      <th className="px-5 py-4">{tr('adminPlansColMacros', 'Macro Gating')}</th>
                      <th className="px-5 py-4">{tr('adminPlansColStatus', 'Tier Type')}</th>
                      <th className="px-5 py-4 text-right">{tr('adminPlansColActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {plans.map((p) => {
                      const isCurrentEditing = editingId === p.id;
                      return (
                        <tr 
                          key={p.id}
                          className="transition"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: isCurrentEditing ? 'var(--color-inner-dark)' : undefined
                          }}
                        >
                          <td className="px-5 py-4 font-bold flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-xl border flex items-center justify-center font-black text-xs shrink-0"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: p.badge ? 'var(--color-primary)' : 'var(--color-border)',
                                color: p.badge ? 'var(--color-primary)' : 'var(--color-text)'
                              }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                                {p.badge && (
                                  <span 
                                    className="px-2 py-0.5 rounded text-[9px] font-black uppercase text-white shadow-xs"
                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                  >
                                    {p.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                                {p.descriptionMonthly || p.descriptionAnnual}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono font-bold text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {p.slug}
                          </td>

                          <td className="px-5 py-4 font-mono font-bold">
                            {p.isFree ? (
                              <span className="text-emerald-400 font-extrabold">Free</span>
                            ) : (
                              <span>
                                {currencySymbol}{p.monthlyPriceDollars.toFixed(2)} / {currencySymbol}{p.annualPriceDollars.toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 font-mono font-semibold" style={{ color: 'var(--color-text)' }}>
                            {tokenSymbol} {p.tokensMonthly.toLocaleString()} / mo
                          </td>

                          <td className="px-5 py-4">
                            {p.canViewMacros && !p.isFree ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {tr('adminPlansMacrosActive', 'Macros Active')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {tr('adminPlansMacrosLocked', 'Macros Locked (blur)')}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span 
                              className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit"
                              style={p.isFree ? {
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-emerald, #10b981)',
                                color: 'var(--color-emerald, #10b981)'
                              } : {
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-primary)',
                                color: 'var(--color-primary)'
                              }}
                            >
                              {p.isFree ? tr('adminPlansStatusFree', 'Free Tier') : tr('adminPlansStatusPaid', 'Paid Premium')}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditPlan(p)}
                                className="p-2 rounded-xl border transition shadow-xs cursor-pointer hover:opacity-85"
                                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                                title={tr('adminPlansEditTooltip', 'Edit Plan')}
                              >
                                <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                              </button>

                              <button
                                type="button"
                                disabled={p.slug === 'taster' || p.isDefault}
                                onClick={() => handleDeletePlan(p)}
                                className={`p-2 rounded-xl border transition shadow-xs ${p.slug === 'taster' || p.isDefault ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-red-500/10'}`}
                                style={{ 
                                  backgroundColor: 'var(--color-card)', 
                                  borderColor: 'var(--color-border)', 
                                  color: p.slug === 'taster' || p.isDefault ? 'var(--color-text-secondary)' : '#ef4444' 
                                }}
                                title={p.slug === 'taster' ? tr('adminPlansCannotDeleteDefault', 'Cannot delete default free plan (taster)') : tr('adminPlansDeleteTooltip', 'Delete Plan')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLAN TRANSACTIONS LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              className="p-5 rounded-3xl border shadow-md space-y-1"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                {tr('adminPlansMetricTotalRevenue', 'Total Revenue')}
              </span>
              <span className="text-2xl font-black block" style={{ color: 'var(--color-primary)' }}>
                {currencySymbol}{transactions.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
              </span>
            </div>

            <div 
              className="p-5 rounded-3xl border shadow-md space-y-1"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                {tr('adminPlansMetricActiveSubs', 'Active Paid Subscribers')}
              </span>
              <span className="text-2xl font-black block">
                {transactions.filter(t => t.amount > 0 && t.status === 'active').length}
              </span>
            </div>

            <div 
              className="p-5 rounded-3xl border shadow-md space-y-1"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                {tr('adminPlansMetricFreeUsers', 'Free Taster Accounts')}
              </span>
              <span className="text-2xl font-black block">
                {transactions.filter(t => t.planSlug === 'taster').length}
              </span>
            </div>

            <div 
              className="p-5 rounded-3xl border shadow-md space-y-1"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                {tr('adminPlansMetricTotalTrans', 'Total Transactions')}
              </span>
              <span className="text-2xl font-black block">
                {transactions.length}
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div 
            className="p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50" />
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder={tr('adminPlansSearchPlaceholder', 'Search by email, transaction ID, or plan...')}
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={txPlanFilter}
                onChange={(e) => setTxPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs outline-none font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="all">{tr('adminPlansFilterAllPlans', 'All Plans')}</option>
                {plans.map(p => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>

              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs outline-none font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="all">{tr('adminPlansFilterAllStatus', 'All Statuses')}</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div 
            className="border rounded-3xl overflow-hidden shadow-xl"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead 
                  className="border-b uppercase font-bold text-[10px] tracking-wider"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <tr>
                    <th className="px-5 py-4">{tr('adminPlansColCustomer', 'Customer / User')}</th>
                    <th className="px-5 py-4">{tr('adminPlansColPlan', 'Plan Tier')}</th>
                    <th className="px-5 py-4">{tr('adminPlansColAmount', 'Amount')}</th>
                    <th className="px-5 py-4">{tr('adminPlansColAutoRenew', 'Auto-Renew')}</th>
                    <th className="px-5 py-4">{tr('adminPlansColDate', 'Date')}</th>
                    <th className="px-5 py-4">{tr('adminPlansColStatus', 'Status')}</th>
                    <th className="px-5 py-4 text-right">{tr('adminPlansColActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="transition hover:opacity-90">
                      <td className="px-5 py-4">
                        <span className="font-extrabold block text-sm" style={{ color: 'var(--color-text)' }}>
                          {tx.userName || tx.userEmail.split('@')[0]}
                        </span>
                        <span className="text-[11px] font-mono opacity-60 block">{tx.userEmail}</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold font-mono" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                          {tx.planName} ({tx.billingInterval})
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-bold">
                        {tx.amount === 0 ? (
                          <span className="text-emerald-400 font-extrabold">Free ($0.00)</span>
                        ) : (
                          <span>{currencySymbol}{tx.amount.toFixed(2)} {tx.currency}</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAutoRenew(tx.id)}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${tx.autoRenew ? 'bg-emerald-500' : 'bg-gray-400 opacity-60'}`}
                        >
                          <div 
                            className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${tx.autoRenew ? 'right-0.5' : 'left-0.5'}`} 
                          />
                        </button>
                      </td>

                      <td className="px-5 py-4 font-mono text-[11px] opacity-70">
                        {tx.createdAt}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tx.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'}`}>
                          {tx.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTxEditingId(tx.id);
                            setModalEmail(tx.userEmail);
                            setModalPlanSlug(tx.planSlug);
                            setModalAmount(tx.amount);
                            setModalInterval(tx.billingInterval);
                            setModalAutoRenew(tx.autoRenew);
                            setIsTxModalOpen(true);
                          }}
                          className="p-2 rounded-xl border transition shadow-xs cursor-pointer hover:opacity-85 mr-1"
                          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          title="Edit Transaction"
                        >
                          <Edit3 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal (Add/Edit) */}
      {isTxModalOpen && (
        <div 
          role="dialog"
          aria-label="Payment Transaction Modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div 
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-black flex items-center gap-2">
                <CreditCard className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {txEditingId ? tr('adminPlansModalEditPaymentTitle', 'Edit Payment Transaction') : tr('adminPlansModalAddPaymentTitle', 'Record New Plan Payment')}
              </h3>
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="p-1 rounded-lg hover:opacity-75 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">{tr('adminPlansLabelCustomerEmail', 'Customer Email *')}</label>
                <input
                  type="email"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  placeholder="e.g. chef@gourmet.com"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{tr('adminPlansLabelSelectPlan', 'Select Plan *')}</label>
                <select
                  value={modalPlanSlug}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setModalPlanSlug(chosen);
                    const targetP = plans.find(p => p.slug === chosen);
                    if (targetP) {
                      setModalAmount(modalInterval === 'monthly' ? targetP.monthlyPriceDollars : targetP.annualPriceDollars);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {plans.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name} ({p.isFree ? 'Free' : `${currencySymbol}${p.monthlyPriceDollars}`})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">{tr('adminPlansLabelBillingInterval', 'Billing Interval')}</label>
                  <select
                    value={modalInterval}
                    onChange={(e) => {
                      const iv = e.target.value as 'monthly' | 'annual';
                      setModalInterval(iv);
                      const targetP = plans.find(p => p.slug === modalPlanSlug);
                      if (targetP) {
                        setModalAmount(iv === 'monthly' ? targetP.monthlyPriceDollars : targetP.annualPriceDollars);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    {tr('adminPlansLabelAmountPaid', 'Amount Paid ({currency}) *').replace('{currency}', currencySymbol)}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-mono font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={modalAutoRenew}
                    onChange={(e) => setModalAutoRenew(e.target.checked)}
                    className="rounded border"
                  />
                  <span>Enable Auto-Renew</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {tr('adminPlansBtnCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={!modalEmail.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 cursor-pointer shadow-md disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {tr('adminPlansBtnSavePayment', 'Save Transaction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Toast Banner */}
      {status && (
        <div
          className="fixed bottom-6 right-6 p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-2xl z-50 animate-in slide-in-from-bottom-5"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: status.type === 'success' ? 'var(--color-emerald, #10b981)' : 'rgba(239, 68, 68, 0.4)',
            color: status.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
          }}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <span>{status.msg}</span>
          <button 
            type="button"
            onClick={() => setStatus(null)}
            className="ml-2 opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
