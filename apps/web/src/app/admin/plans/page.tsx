// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, PackageCheck, Zap, Trash2, Sparkles, AlertCircle, 
  Check, Shield, CheckCircle2, Eye, RefreshCw, Edit3, DollarSign, Copy, Plus, Calendar, Tag, Star, Cpu, Bot, X, Layers, Hash
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

interface SubscriptionPackageConfig {
  id: string;
  planGroupId?: string;
  monthlyPlanId?: string;
  annualPlanId?: string;
  name: string;
  slug: string;
  isFree: boolean;
  isDefault?: boolean;
  monthlyPriceDollars: number;
  annualPriceDollars: number;
  monthlyBadge: string;
  annualBadge: string;
  trialBadge: string;
  descriptionMonthly: string;
  descriptionAnnual: string;
  buttonText: string;
  aiRecipeLimit: number;
  recipeLibraryLimit: number;
  socialScrapeLimit: number;
  canViewMacros: boolean;
  allowedAiModels: string;
  featuresText: string;
  tokenLimit: number;
  tokenReimburseFrequency: 'once' | 'weekly' | 'monthly';
}

const BLANK_NEW_PLAN: SubscriptionPackageConfig = {
  id: '',
  planGroupId: '',
  monthlyPlanId: '',
  annualPlanId: '',
  name: '',
  slug: '',
  isFree: false,
  isDefault: false,
  monthlyPriceDollars: 12.99,
  annualPriceDollars: 99.99,
  monthlyBadge: '',
  annualBadge: 'Save 35%',
  trialBadge: '14-Day Free Trial',
  descriptionMonthly: 'Full kitchen access, billed monthly',
  descriptionAnnual: 'Best value for avid cooks, billed annually',
  buttonText: 'Choose Plan',
  aiRecipeLimit: 50,
  recipeLibraryLimit: 100,
  socialScrapeLimit: 25,
  canViewMacros: true,
  allowedAiModels: 'gemini-3.6-flash,gpt-4o-mini',
  featuresText: 'AI-powered recipe generation\nUnlimited cookbook library\nAutomated nutritional analysis\nMeal planner synchronization',
  tokenLimit: 100000,
  tokenReimburseFrequency: 'monthly',
};

const DEFAULT_PRESET_TASTER: SubscriptionPackageConfig = {
  id: 'preset_taster',
  planGroupId: 'group_taster',
  monthlyPlanId: 'preset_taster_monthly',
  annualPlanId: 'preset_taster_annual',
  name: 'Taster',
  slug: 'taster',
  isFree: true,
  isDefault: true,
  monthlyPriceDollars: 0,
  annualPriceDollars: 0,
  monthlyBadge: '',
  annualBadge: '',
  trialBadge: '',
  descriptionMonthly: 'Free tier with limited features',
  descriptionAnnual: 'Free tier with limited features',
  buttonText: 'Manage',
  aiRecipeLimit: 5,
  recipeLibraryLimit: 25,
  socialScrapeLimit: 5,
  canViewMacros: false,
  allowedAiModels: 'gemini-3.5-flash-lite,gpt-3.5-turbo',
  featuresText: 'Create up to 5 AI-powered recipes per month\nPersonal recipe library (25 total recipes)\nSmart ingredient repurposing\nAutomated shopping list creation\nDirect online grocery shopping links\nMeal planner\nIngredient photo recognition',
  tokenLimit: 50000,
  tokenReimburseFrequency: 'monthly',
};

const DEFAULT_PRESET_NUTRITION_PRO: SubscriptionPackageConfig = {
  id: 'preset_nutrition_pro',
  planGroupId: 'group_nutrition_pro',
  monthlyPlanId: 'plan_nutrition_pro_monthly',
  annualPlanId: 'plan_nutrition_pro_annual',
  name: 'Nutrition Pro',
  slug: 'nutrition-pro',
  isFree: false,
  isDefault: false,
  monthlyPriceDollars: 8.99,
  annualPriceDollars: 59.99,
  monthlyBadge: 'Billed Immediately',
  annualBadge: 'Save 44%',
  trialBadge: '7-Day Free Trial',
  descriptionMonthly: 'Full premium access, billed monthly',
  descriptionAnnual: 'Best value - all premium features, billed annually',
  buttonText: 'Choose Plan',
  aiRecipeLimit: -1,
  recipeLibraryLimit: -1,
  socialScrapeLimit: -1,
  canViewMacros: true,
  allowedAiModels: 'gemini-3.6-flash,gpt-4o',
  featuresText: 'Unlimited AI-powered recipe generation\nUnlimited recipe library\nComprehensive nutritional analysis (calories, protein, fat, fiber, sugar, sodium, cholesterol, carbohydrates)',
  tokenLimit: 1000000,
  tokenReimburseFrequency: 'monthly',
};

const GEMINI_MODEL_VERSIONS = [
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Deep Reasoning)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Standard)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const OPENAI_MODEL_VERSIONS = [
  { value: 'gpt-4o', label: 'GPT-4o (Advanced Reasoning)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (High Speed)' },
];

export default function AdminSubscriptionPlans() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackageConfig[]>([]);
  const isFetchingPackagesRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [form, setForm] = useState<SubscriptionPackageConfig>({ ...DEFAULT_PRESET_NUTRITION_PRO });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [previewTab, setPreviewTab] = useState<'monthly' | 'annual'>('annual');
  const [settingsFilter, setSettingsFilter] = useState<'both' | 'monthly' | 'annual'>('both');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  const [activeSettingsModel, setActiveSettingsModel] = useState<string>('gemini-3.6-flash');
  const [selectedAiProvider, setSelectedAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [selectedAiVersion, setSelectedAiVersion] = useState<string>('gemini-3.6-flash');

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncWithAiSettings = useCallback(async () => {
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData) {
        const c = serverData.chefAiSettings || serverData.aiSettings || serverData;
        const resolvedModel = c.model || serverData.aiModel;
        if (resolvedModel) {
          setActiveSettingsModel(resolvedModel);
          if (c.provider === 'openai' || resolvedModel.startsWith('gpt')) {
            setSelectedAiProvider('openai');
            setSelectedAiVersion(resolvedModel);
          } else {
            setSelectedAiProvider('gemini');
            setSelectedAiVersion(resolvedModel);
          }
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncWithAiSettings();
    window.addEventListener('zecratary_settings_updated', syncWithAiSettings);
    window.addEventListener('zecratary_engine_config_updated', syncWithAiSettings);
    window.addEventListener('zecratary_admin_settings_updated', syncWithAiSettings);
    return () => {
      window.removeEventListener('zecratary_settings_updated', syncWithAiSettings);
      window.removeEventListener('zecratary_engine_config_updated', syncWithAiSettings);
      window.removeEventListener('zecratary_admin_settings_updated', syncWithAiSettings);
    };
  }, [syncWithAiSettings]);

  const applySavedTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
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

  const fetchPackages = useCallback(async () => {
    if (isFetchingPackagesRef.current) return;
    isFetchingPackagesRef.current = true;
    try {
      purgeLegacyBrowserAdminStorage();
      try {
        const res = await fetch('/api/admin/plans', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const serverConfigs = Array.isArray(data) ? data : (data?.packages || data?.plans || data?.configs);
          if (Array.isArray(serverConfigs) && serverConfigs.length > 0) {
            const hasTaster = serverConfigs.some((p: any) => p.slug === 'taster' || p.id === 'preset_taster');
            let list = hasTaster ? serverConfigs : [{ ...DEFAULT_PRESET_TASTER }, ...serverConfigs];

            list = list.map((p: any) => {
              const cleanSlug = (p.slug || p.id || 'plan').replace(/-(monthly|annual)$/, '');
              return {
                ...p,
                planGroupId: p.planGroupId || ('group_' + cleanSlug),
                monthlyPlanId: p.monthlyPlanId || (p.isFree ? p.id : `${p.id || cleanSlug}_monthly`),
                annualPlanId: p.annualPlanId || (p.isFree ? p.id : `${p.id || cleanSlug}_annual`),
                featuresText: typeof p.featuresText === 'string' && p.featuresText
                  ? p.featuresText
                  : (Array.isArray(p.features) ? p.features.join('\n') : (p.descriptionMonthly || '')),
                allowedAiModels: Array.isArray(p.allowedAiModels)
                  ? p.allowedAiModels.join(',')
                  : (p.allowedAiModels || 'gemini-3.6-flash'),
                tokenLimit: p.tokenLimit !== undefined ? p.tokenLimit : (p.slug === 'taster' ? 50000 : 500000),
                tokenReimburseFrequency: p.tokenReimburseFrequency || 'monthly',
                isDefault: p.slug === 'taster' || p.id === 'preset_taster',
              };
            });

            setPackages(prev => JSON.stringify(prev) === JSON.stringify(list) ? prev : list);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to fetch packages from server:', e);
      }
      setPackages([{ ...DEFAULT_PRESET_TASTER }]);
    } finally {
      isFetchingPackagesRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.title = `${t('subscriptionPlansTitle', 'Subscription Plans')} - FoodiePrep Admin`;
  }, [mounted, t]);

  useEffect(() => {
    if (!mounted) return;
    initAuthStorage();
    const u = getCurrentUser();
    setCurrentUser(u);
    fetchPackages();

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchPackages();
      }, 300);
    };

    window.addEventListener('zecratary_plans_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_plans_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, [mounted, fetchPackages]);

  const handleSetDefaultPlan = async (targetPkg: SubscriptionPackageConfig) => {
    const isTaster = targetPkg.id === 'preset_taster' || targetPkg.slug === 'taster';
    if (!isTaster) {
      alert(t('tasterPermanentDefaultAlert', 'The Taster plan (ID: preset_taster) is permanently locked as the system default plan and cannot be changed.'));
      return;
    }

    const updated = packages.map((p) => ({
      ...p,
      isDefault: p.id === 'preset_taster' || p.slug === 'taster',
    }));

    setPackages(updated);

    await persistServerAdminSettings({
      defaultPlanSlug: 'taster',
      subscriptionPlans: updated
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_plans_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
    }

    setFeedback({
      type: 'success',
      msg: `"${DEFAULT_PRESET_TASTER.name}" ${t('permanentDefaultConfirmed', 'is permanently locked as the default plan for new registrations!')}`,
    });
  };

  const handleStartNewPlan = () => {
    const timestamp = Date.now();
    setEditingId(null);
    setIsFree(false);
    setForm({
      ...BLANK_NEW_PLAN,
      id: 'plan_' + timestamp,
      planGroupId: 'group_' + timestamp,
      monthlyPlanId: 'plan_' + timestamp + '_monthly',
      annualPlanId: 'plan_' + timestamp + '_annual',
      slug: '',
      allowedAiModels: activeSettingsModel || 'gemini-3.6-flash',
      featuresText: BLANK_NEW_PLAN.featuresText
    });
  };

  const handleApplyPreset = (preset: SubscriptionPackageConfig) => {
    const timestamp = Date.now();
    setEditingId(null);
    setIsFree(preset.isFree);
    const cleanSlug = preset.slug || preset.name.toLowerCase().replace(/\s+/g, '-');
    setForm({ 
      ...preset, 
      id: 'plan_' + timestamp,
      planGroupId: 'group_' + cleanSlug,
      monthlyPlanId: preset.monthlyPlanId || ('plan_' + cleanSlug + '_monthly'),
      annualPlanId: preset.annualPlanId || ('plan_' + cleanSlug + '_annual'),
      slug: cleanSlug,
      featuresText: preset.featuresText || (Array.isArray((preset as any).features) ? (preset as any).features.join('\n') : '')
    });
  };

  const handleEditPackage = (pkg: SubscriptionPackageConfig) => {
    const targetIdentifier = pkg.id || pkg.slug;
    const planIsFree = Boolean(pkg.isFree || (Number(pkg.monthlyPriceDollars) === 0 && Number(pkg.annualPriceDollars) === 0));
    
    const safeFeatures = typeof pkg.featuresText === 'string' && pkg.featuresText
      ? pkg.featuresText
      : (Array.isArray((pkg as any).features) ? (pkg as any).features.join('\n') : (pkg.descriptionMonthly || ''));

    const safeAiModels = Array.isArray(pkg.allowedAiModels)
      ? (pkg.allowedAiModels as string[]).join(',')
      : (typeof pkg.allowedAiModels === 'string' && pkg.allowedAiModels
          ? pkg.allowedAiModels
          : (activeSettingsModel || 'gemini-3.6-flash'));

    const baseSlug = (pkg.slug || pkg.id || 'plan').replace(/-(monthly|annual)$/, '');

    setEditingId(targetIdentifier);
    setIsFree(planIsFree);
    setForm({ 
      ...pkg, 
      planGroupId: pkg.planGroupId || ('group_' + baseSlug),
      monthlyPlanId: pkg.monthlyPlanId || (planIsFree ? pkg.id : `${pkg.id || baseSlug}_monthly`),
      annualPlanId: pkg.annualPlanId || (planIsFree ? pkg.id : `${pkg.id || baseSlug}_annual`),
      featuresText: safeFeatures,
      allowedAiModels: safeAiModels,
      isFree: planIsFree,
      tokenLimit: pkg.tokenLimit !== undefined ? pkg.tokenLimit : 100000,
      tokenReimburseFrequency: pkg.tokenReimburseFrequency || 'monthly',
    });
  };

  const handleAddAiModel = (modelVal: string) => {
    if (!modelVal) return;
    const current = Array.isArray(form.allowedAiModels)
      ? [...form.allowedAiModels]
      : (typeof form.allowedAiModels === 'string' && form.allowedAiModels.trim()
          ? form.allowedAiModels.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
    if (!current.includes(modelVal)) {
      const updated = [...current, modelVal].join(',');
      setForm({ ...form, allowedAiModels: updated });
    }
  };

  const handleRemoveAiModel = (modelVal: string) => {
    const current = Array.isArray(form.allowedAiModels)
      ? [...form.allowedAiModels]
      : (typeof form.allowedAiModels === 'string' && form.allowedAiModels.trim()
          ? form.allowedAiModels.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
    const updated = current.filter((m) => m !== modelVal).join(',');
    setForm({ ...form, allowedAiModels: updated });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const rawFeaturesText = typeof form.featuresText === 'string'
      ? form.featuresText
      : (Array.isArray((form as any).features) ? (form as any).features.join('\n') : '');

    const parsedFeatures = rawFeaturesText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const cleanSlug = (form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '').replace(/-(monthly|annual)$/, '');
    const planId = editingId ? (form.id || editingId) : (form.id || 'plan_' + Date.now());

    const planGroupId = form.planGroupId?.trim() || ('group_' + (cleanSlug || planId));
    const monthlyPlanId = form.monthlyPlanId?.trim() || (isFree ? planId : `${planId}_monthly`);
    const annualPlanId = form.annualPlanId?.trim() || (isFree ? planId : `${planId}_annual`);

    const rawAllowedModels = Array.isArray(form.allowedAiModels)
      ? form.allowedAiModels
      : (typeof form.allowedAiModels === 'string' && form.allowedAiModels.trim()
          ? form.allowedAiModels.split(',').map((m) => m.trim()).filter(Boolean)
          : [activeSettingsModel || 'gemini-3.6-flash']);

    const isTaster = planId === 'preset_taster' || cleanSlug === 'taster';

    const payload = {
      ...form,
      id: planId,
      planGroupId,
      monthlyPlanId,
      annualPlanId,
      slug: cleanSlug,
      isFree,
      isDefault: isTaster,
      monthlyPriceDollars: isFree ? 0 : Number(form.monthlyPriceDollars) || 0,
      annualPriceDollars: isFree ? 0 : Number(form.annualPriceDollars) || 0,
      tokenLimit: Number(form.tokenLimit) || 100000,
      tokenReimburseFrequency: form.tokenReimburseFrequency || 'monthly',
      features: parsedFeatures,
      featuresText: parsedFeatures.join('\n'),
      allowedAiModels: rawAllowedModels,
    };

    try {
      await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const updatedPlanItem: SubscriptionPackageConfig = {
        ...payload,
        allowedAiModels: Array.isArray(rawAllowedModels) ? rawAllowedModels.join(',') : rawAllowedModels,
      };

      let updatedList = [...packages];
      const matchIndex = updatedList.findIndex((p) => 
        (editingId && (p.id === editingId || p.slug === editingId)) ||
        (p.id && p.id === planId) ||
        (p.slug && p.slug === cleanSlug)
      );

      if (matchIndex >= 0) {
        updatedList[matchIndex] = updatedPlanItem;
      } else {
        updatedList.push(updatedPlanItem);
      }

      updatedList = updatedList.map((p) => ({ ...p, isDefault: p.id === 'preset_taster' || p.slug === 'taster' }));
      setPackages(updatedList);

      await persistServerAdminSettings({ subscriptionPlans: updatedList });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_plans_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: `"${updatedPlanItem.name}" ${t('packageSavedSuccess', 'package configuration saved successfully!')}`,
      });
      
      handleStartNewPlan();
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || t('errorSavingPlan', 'Error saving plan configuration.') });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (pkg: SubscriptionPackageConfig) => {
    if (pkg.slug === 'taster' || pkg.id === 'preset_taster') {
      alert(t('tasterCannotDeleteAlert', 'The Taster plan is required as the default free fallback and cannot be deleted.'));
      return;
    }

    if (!confirm(`${t('confirmDelete', 'Are you sure you want to delete package')} "${pkg.name}"?`)) return;

    const targetKey = pkg.id || pkg.slug;
    setDeletingId(targetKey);
    setFeedback(null);

    try {
      const updated = packages.filter((p) => {
        const isMatchId = pkg.id && (p.id === pkg.id || p.slug === pkg.id);
        const isMatchSlug = pkg.slug && (p.slug === pkg.slug || p.id === pkg.slug);
        return !(isMatchId || isMatchSlug);
      }).map((p) => ({
        ...p,
        isDefault: p.slug === 'taster' || p.id === 'preset_taster',
      }));

      setPackages(updated);

      if (editingId === targetKey || editingId === pkg.id || editingId === pkg.slug || form.slug === pkg.slug) {
        handleStartNewPlan();
      }

      const queryParams = new URLSearchParams();
      if (pkg.id) queryParams.set('id', pkg.id);
      if (pkg.slug) queryParams.set('slug', pkg.slug);

      const delRes = await fetch(`/api/admin/plans?${queryParams.toString()}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkg.id, slug: pkg.slug })
      });

      if (!delRes.ok) {
        const errData = await delRes.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to delete plan from database.');
      }

      await persistServerAdminSettings({ subscriptionPlans: updated });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_plans_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({ type: 'success', msg: `"${pkg.name}" ${t('packageDeletedSuccess', 'package deleted successfully.')}` });
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || t('errorDeletingPlan', 'Error deleting package.') });
      await fetchPackages();
    } finally {
      setDeletingId(null);
    }
  };

  if (!mounted) {
    return <div className="max-w-7xl mx-auto p-8 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('loadingPlans', 'Loading subscription plans...')}</div>;
  }

  const currentFeaturesList = (typeof form.featuresText === 'string'
    ? form.featuresText
    : (Array.isArray((form as any).features) ? (form as any).features.join('\n') : '')
  ).split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  const currentAllowedModels = Array.isArray(form.allowedAiModels)
    ? form.allowedAiModels
    : (typeof form.allowedAiModels === 'string' && form.allowedAiModels.trim()
        ? form.allowedAiModels.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []);

  const annualMonthlyEquivalent = form.annualPriceDollars > 0 ? (form.annualPriceDollars / 12).toFixed(2) : '0.00';
  const calculatedSavings = form.monthlyPriceDollars > 0 && form.annualPriceDollars > 0
    ? Math.max(0, Math.round((1 - (form.annualPriceDollars / (form.monthlyPriceDollars * 12))) * 100))
    : 0;

  const buttonLabel = loading
    ? t('savingPackageBtn', 'Saving Package...')
    : editingId
    ? t('updateSubscriptionPackageBtn', 'Update Subscription Package')
    : isFree
    ? t('createPublishFreeBtn', 'Create & Publish Free Plan')
    : t('createPublishPackageBtn', 'Create & Publish Package');

  const isCreateMode = !editingId;
  const submitButtonBg = isCreateMode ? 'var(--color-emerald, #10b981)' : 'var(--color-primary, #E05638)';
  const submitButtonHoverBg = isCreateMode ? 'var(--color-primary-hover, #c94529)' : 'var(--color-primary-hover, #c94529)';

  const getReimburseLabel = (freq: string) => {
    switch (freq) {
      case 'once': return 'Once (Non-recurring)';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return 'Monthly';
    }
  };

  return (
    <div 
      className="max-w-7xl mx-auto space-y-8 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('subscriptionPlansTitle', 'Subscription Plans')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('subscriptionPlansSubtitle', 'Manage plan pricing, usage quotas, token availability, reimburse schedule, and subscriber packages')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleStartNewPlan}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <Plus className="h-4 w-4" /> {t('addNewPlanBtn', 'Add New Plan')}
          </button>
          <Link
            href="/admin"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <Shield className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('adminSettingsBtn', 'Admin Settings')}
          </Link>
        </div>
      </div>

      <div 
        className="p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
            {t('quickFillPresets', 'Quick-Fill Presets:')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleApplyPreset(DEFAULT_PRESET_TASTER)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            {t('presetTasterBtn', 'Preset: Taster (Free)')}
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(DEFAULT_PRESET_NUTRITION_PRO)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)'
            }}
          >
            {t('presetNutritionProBtn', 'Preset: Nutrition Pro')}
          </button>
          <button
            type="button"
            onClick={handleStartNewPlan}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-emerald)',
              color: 'var(--color-emerald)'
            }}
          >
            {t('presetBlankBtn', 'Blank Custom Plan')}
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form 
          onSubmit={handleSavePlan} 
          className="lg:col-span-6 border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                  {editingId ? `${t('editPlanPrefix', 'Edit Plan:')} ${form.name || t('planNameLabel', 'Plan')}` : t('addNewPlanTitle', 'Add New Subscription Plan')}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                    Group: {form.planGroupId || form.id || 'new'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleStartNewPlan}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {t('clearNewBtn', 'Clear / New')}
                </button>
              )}
              <div 
                className="flex items-center gap-1 p-1 rounded-xl border transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(true);
                    setForm({ ...form, isFree: true, monthlyPriceDollars: 0, annualPriceDollars: 0 });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isFree 
                      ? 'bg-[var(--color-emerald)] text-white shadow-sm' 
                      : ''
                  }`}
                  style={!isFree ? { color: 'var(--color-text-secondary)' } : undefined}
                >
                  {t('freeTierToggle', 'Free Plan')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(false);
                    setForm({ ...form, isFree: false });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !isFree 
                      ? 'bg-[var(--color-primary)] text-white shadow-sm' 
                      : ''
                  }`}
                  style={isFree ? { color: 'var(--color-text-secondary)' } : undefined}
                >
                  {t('paidTierToggle', 'Paid Plan')}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('planNameLabel', 'Plan Name')}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  setForm(prev => ({
                    ...prev,
                    name: val,
                    slug: form.slug && editingId ? form.slug : autoSlug,
                    planGroupId: editingId ? prev.planGroupId : (prev.planGroupId || `group_${autoSlug}`),
                    monthlyPlanId: editingId ? prev.monthlyPlanId : (prev.monthlyPlanId || `plan_${autoSlug}_monthly`),
                    annualPlanId: editingId ? prev.annualPlanId : (prev.annualPlanId || `plan_${autoSlug}_annual`),
                  }));
                }}
                placeholder={t('planNamePlaceholder', 'e.g. Starter, Family Pro, Unlimited')}
                className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>

            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('slugLabel', 'Slug Identifier')}
              </label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => {
                  const s = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  setForm(prev => ({
                    ...prev,
                    slug: s,
                    ...(!editingId ? {
                      planGroupId: `group_${s}`,
                      monthlyPlanId: `plan_${s}_monthly`,
                      annualPlanId: `plan_${s}_annual`
                    } : {})
                  }));
                }}
                placeholder={t('slugPlaceholder', 'e.g. starter-plan')}
                className="w-full border rounded-xl p-2.5 text-xs font-mono outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>

            <div>
              <label className="text-xs uppercase font-bold block mb-1 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{t('planGroupIdLabel', 'Plan Group ID')}</span>
                <Layers className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              </label>
              <input
                type="text"
                required
                value={form.planGroupId || ''}
                onChange={(e) => setForm({ ...form, planGroupId: e.target.value.trim() })}
                placeholder="e.g. group_nutrition_pro"
                className="w-full border rounded-xl p-2.5 text-xs font-mono font-bold outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
          </div>

          {/* TOKEN AVAILABILITY & REIMBURSE SCHEDULE */}
          <div 
            className="p-4 rounded-2xl border space-y-3 transition shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
              <Cpu className="h-4 w-4" /> Token Availability & Reimburse Schedule
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                  Token Limit (Availability)
                </label>
                <input
                  type="number"
                  value={form.tokenLimit}
                  onChange={(e) => setForm({ ...form, tokenLimit: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 50000"
                  className="w-full border rounded-xl p-2.5 text-xs font-mono font-bold outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
                <span className="text-[10px] block mt-1" style={{ color: 'var(--color-text-secondary)' }}>(-1 for unlimited tokens)</span>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                  Token Reimburse Frequency
                </label>
                <select
                  value={form.tokenReimburseFrequency}
                  onChange={(e) => setForm({ ...form, tokenReimburseFrequency: e.target.value as any })}
                  className="w-full border rounded-xl p-2.5 text-xs font-bold outline-none transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="once" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Once (Non-recurring)</option>
                  <option value="weekly" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Every Week (From purchase date)</option>
                  <option value="monthly" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>Every Month (From purchase date)</option>
                </select>
                <span className="text-[10px] block mt-1" style={{ color: 'var(--color-text-secondary)' }}>Quota refresh schedule</span>
              </div>
            </div>
          </div>

          {/* ALLOWED AI MODELS DROPDOWN & BUTTON PICKER */}
          <div 
            className="p-4 rounded-2xl border space-y-3 transition shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <Bot className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {t('allowedAiModelsLabel', 'Allowed AI Models')}
              </label>

              {activeSettingsModel && (
                <button
                  type="button"
                  onClick={() => handleAddAiModel(activeSettingsModel)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md border cursor-pointer transition flex items-center gap-1 font-bold shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)'
                  }}
                  title="Click to sync and add active model configured in /admin/ai-settings"
                >
                  <Sparkles className="h-3 w-3" /> Sync Active: {activeSettingsModel}
                </button>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                1. Choose AI Model Provider
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAiProvider('gemini');
                    setSelectedAiVersion(GEMINI_MODEL_VERSIONS[0]?.value || 'gemini-3.6-flash');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs`}
                  style={selectedAiProvider === 'gemini' ? {
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    borderColor: 'var(--color-primary)'
                  } : {
                    backgroundColor: 'var(--color-card)',
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <Bot className="h-3.5 w-3.5" /> Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAiProvider('openai');
                    setSelectedAiVersion(OPENAI_MODEL_VERSIONS[0]?.value || 'gpt-4o');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs`}
                  style={selectedAiProvider === 'openai' ? {
                    backgroundColor: 'var(--color-emerald)',
                    color: '#ffffff',
                    borderColor: 'var(--color-emerald)'
                  } : {
                    backgroundColor: 'var(--color-card)',
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <Zap className="h-3.5 w-3.5" /> OpenAI GPT
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                2. Choose AI Version (Synced from /admin/ai-settings)
              </span>
              <div className="flex gap-2">
                <select
                  value={selectedAiVersion}
                  onChange={(e) => setSelectedAiVersion(e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2 text-xs font-medium outline-none transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {(selectedAiProvider === 'gemini' ? GEMINI_MODEL_VERSIONS : OPENAI_MODEL_VERSIONS).map((m) => (
                    <option key={m.value} value={m.value} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {m.label} {m.value === activeSettingsModel ? '★ [Active]' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddAiModel(selectedAiVersion)}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer transition shrink-0"
                  style={{ backgroundColor: selectedAiProvider === 'gemini' ? 'var(--color-primary)' : 'var(--color-emerald)' }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Configured Allowed Models for this plan:
              </span>
              {currentAllowedModels.length === 0 ? (
                <span className="text-[11px] text-red-500 italic block">No models assigned yet. Select a version above and click 'Add'.</span>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {currentAllowedModels.map((modelName) => {
                    const isGem = modelName.includes('gemini');
                    return (
                      <span
                        key={modelName}
                        className="border px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 shadow-xs"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: isGem ? 'var(--color-primary)' : 'var(--color-emerald)',
                          color: isGem ? 'var(--color-primary)' : 'var(--color-emerald)'
                        }}
                      >
                        {modelName}
                        <button
                          type="button"
                          onClick={() => handleRemoveAiModel(modelName)}
                          className="hover:opacity-75 transition cursor-pointer p-0.5"
                          title={`Remove ${modelName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {!isFree ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 pt-1" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <DollarSign className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('pricingDisplaySettings', 'Pricing & Billing Display Settings')}
                </span>

                <div 
                  className="p-1 rounded-xl border flex items-center gap-1 transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSettingsFilter('both')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      settingsFilter === 'both' ? 'bg-slate-700 text-white shadow-sm' : ''
                    }`}
                    style={settingsFilter !== 'both' ? { color: 'var(--color-text-secondary)' } : undefined}
                  >
                    {t('viewBothBtn', 'View Both')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsFilter('monthly')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      settingsFilter === 'monthly' ? 'bg-[var(--color-primary)] text-white shadow-sm' : ''
                    }`}
                    style={settingsFilter !== 'monthly' ? { color: 'var(--color-text-secondary)' } : undefined}
                  >
                    {t('monthlyBtn', 'Monthly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsFilter('annual')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      settingsFilter === 'annual' ? 'bg-[var(--color-emerald)] text-white shadow-sm' : ''
                    }`}
                    style={settingsFilter !== 'annual' ? { color: 'var(--color-text-secondary)' } : undefined}
                  >
                    {t('annualBtn', 'Annual')}
                  </button>
                </div>
              </div>

              {/* MONTHLY SETTINGS BLOCK WITH SEPARATE MONTHLY PLAN ID */}
              {(settingsFilter === 'both' || settingsFilter === 'monthly') && (
                <div 
                  className="p-4 rounded-2xl border space-y-3 relative transition shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                        {t('monthlySubscriptionTitle', 'Monthly Subscription Settings')}
                      </span>
                    </div>
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      {t('billedEveryMonth', 'Billed Every Month')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('monthlyPlanIdLabel', 'Monthly Plan ID')}
                      </label>
                      <input
                        type="text"
                        required={!isFree}
                        value={form.monthlyPlanId || ''}
                        onChange={(e) => setForm({ ...form, monthlyPlanId: e.target.value.trim() })}
                        placeholder="plan_xxx_monthly"
                        className="w-full border rounded-xl p-2.5 text-xs font-mono font-bold outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('monthlyPriceLabel', 'Monthly Price ($)')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.monthlyPriceDollars}
                        onChange={(e) => setForm({ ...form, monthlyPriceDollars: parseFloat(e.target.value) || 0 })}
                        placeholder="8.99"
                        className="w-full border rounded-xl p-2.5 text-xs font-bold outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('badgeOptional', 'Badge Text (Optional)')}
                      </label>
                      <input
                        type="text"
                        value={form.monthlyBadge}
                        onChange={(e) => setForm({ ...form, monthlyBadge: e.target.value })}
                        placeholder="e.g. Billed Immediately"
                        className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                      {t('subtextTagline', 'Subtext / Tagline')}
                    </label>
                    <input
                      type="text"
                      value={form.descriptionMonthly}
                      onChange={(e) => setForm({ ...form, descriptionMonthly: e.target.value })}
                      placeholder="e.g. Full kitchen access, billed monthly"
                      className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ANNUAL SETTINGS BLOCK WITH SEPARATE ANNUAL PLAN ID */}
              {(settingsFilter === 'both' || settingsFilter === 'annual') && (
                <div 
                  className="p-4 rounded-2xl border space-y-3 relative transition shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                        {t('annualSubscriptionTitle', 'Annual Subscription Settings')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {calculatedSavings > 0 && (
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-emerald)',
                            color: 'var(--color-emerald)'
                          }}
                        >
                          {t('savesBadge', `Saves ${calculatedSavings}%`).replace('{percent}', calculatedSavings.toString())}
                        </span>
                      )}
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          color: 'var(--color-text-secondary)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        {t('moEqBadge', `$${annualMonthlyEquivalent}/mo eq.`).replace('{amount}', annualMonthlyEquivalent)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('annualPlanIdLabel', 'Annual Plan ID')}
                      </label>
                      <input
                        type="text"
                        required={!isFree}
                        value={form.annualPlanId || ''}
                        onChange={(e) => setForm({ ...form, annualPlanId: e.target.value.trim() })}
                        placeholder="plan_xxx_annual"
                        className="w-full border rounded-xl p-2.5 text-xs font-mono font-bold outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('annualPriceLabel', 'Annual Price ($)')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.annualPriceDollars}
                        onChange={(e) => setForm({ ...form, annualPriceDollars: parseFloat(e.target.value) || 0 })}
                        placeholder="59.99"
                        className="w-full border rounded-xl p-2.5 text-xs font-bold outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('discountBadge', 'Discount Badge')}
                      </label>
                      <input
                        type="text"
                        value={form.annualBadge}
                        onChange={(e) => setForm({ ...form, annualBadge: e.target.value })}
                        placeholder="e.g. Save 44%"
                        className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                        {t('trialBadgeLabel', 'Trial Badge')}
                      </label>
                      <input
                        type="text"
                        value={form.trialBadge}
                        onChange={(e) => setForm({ ...form, trialBadge: e.target.value })}
                        placeholder="e.g. 7-Day Free Trial"
                        className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text)' }}>
                      {t('annualSubtext', 'Annual Subtext')}
                    </label>
                    <input
                      type="text"
                      value={form.descriptionAnnual}
                      onChange={(e) => setForm({ ...form, descriptionAnnual: e.target.value })}
                      placeholder="e.g. Best value - all premium features, billed annually"
                      className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div 
                className="p-3.5 border rounded-2xl text-xs flex items-center justify-between shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-emerald)',
                  color: 'var(--color-emerald)'
                }}
              >
                <span>{t('zeroCostPlanNotice', 'This is a free plan package. Pricing fields are automatically set to $0.')}</span>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('freePlanDescLabel', 'Free Plan Description / Subtitle')}
                </label>
                <input
                  type="text"
                  value={form.descriptionMonthly}
                  onChange={(e) => setForm({ ...form, descriptionMonthly: e.target.value, descriptionAnnual: e.target.value })}
                  placeholder={t('freePlanDescPlaceholder', 'e.g. Free tier with limited features')}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('buttonLabelField', 'Button Label')}</label>
              <input
                type="text"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                placeholder="Choose Plan"
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('aiRecipeLimitField', 'AI Recipe Limit')}</label>
              <input
                type="number"
                value={form.aiRecipeLimit}
                onChange={(e) => setForm({ ...form, aiRecipeLimit: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <span className="text-[10px] block mt-1 leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{t('recipeLimitHint', '(-1 for unlimited)')}</span>
            </div>
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('libraryMaxField', 'Library Max')}</label>
              <input
                type="number"
                value={form.recipeLibraryLimit}
                onChange={(e) => setForm({ ...form, recipeLibraryLimit: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <span className="text-[10px] block mt-1 leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{t('libraryLimitHint', '(-1 for unlimited)')}</span>
            </div>
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{t('scrapeLimitField', 'Scrape Limit')}</label>
              <input
                type="number"
                value={form.socialScrapeLimit}
                onChange={(e) => setForm({ ...form, socialScrapeLimit: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <span className="text-[10px] block mt-1 leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{t('scrapeLimitHint', '(-1 for unlimited)')}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                {t('featuresChecklistLabel', 'Features Checklist (One per line)')}
              </label>
              <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{currentFeaturesList.length} {t('itemsCountSuffix', 'items')}</span>
            </div>
            <textarea
              rows={4}
              value={form.featuresText || ''}
              onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
              placeholder="Unlimited AI-powered recipe generation&#10;Unlimited recipe library&#10;Comprehensive nutritional analysis"
              className="w-full border rounded-xl p-2.5 text-xs outline-none transition font-sans"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            />
            <span className="text-[10px] block mt-1 leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{t('onePerLineNote', 'Each line will render with a checkmark on the pricing card.')}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="macros_box"
              checked={form.canViewMacros}
              onChange={(e) => setForm({ ...form, canViewMacros: e.target.checked })}
              className="rounded w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
            />
            <label htmlFor="macros_box" className="text-xs cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }}>
              {t('unlockMacrosLabel', 'Unlock detailed macro analysis (calories, protein, carbs, fat, etc.)')}
            </label>
          </div>

          <button
            key={buttonLabel}
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full text-white font-bold py-3 rounded-2xl transition text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: submitButtonBg }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = submitButtonHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = submitButtonBg; }}
          >
            <Sparkles className="h-4 w-4" />
            {buttonLabel}
          </button>
        </form>

        <div className="lg:col-span-6 space-y-6">
          {/* SYSTEM PACKAGES LIST */}
          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <PackageCheck className="h-5 w-5" style={{ color: 'var(--color-emerald)' }} />
                {t('systemPackagesList', 'System Plans List')} ({packages.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartNewPlan}
                  className="text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  style={{ color: 'var(--color-emerald)' }}
                >
                  <Plus className="h-3.5 w-3.5" /> {t('newTierBtn', 'New Plan')}
                </button>
                <button
                  type="button"
                  onClick={fetchPackages}
                  className="text-xs font-bold flex items-center gap-1 transition ml-2 cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {packages.length === 0 ? (
                <div 
                  className="text-xs py-8 text-center rounded-2xl border"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('noPackagesConfigured', 'No subscription plans configured.')}
                </div>
              ) : (
                packages.map((pkg) => {
                  const cardIdentifier = pkg.id || pkg.slug;
                  const isTaster = pkg.slug === 'taster' || pkg.id === 'preset_taster';
                  const modelsList = Array.isArray(pkg.allowedAiModels)
                    ? pkg.allowedAiModels
                    : (typeof pkg.allowedAiModels === 'string' && pkg.allowedAiModels.trim()
                        ? pkg.allowedAiModels.split(',').map((m: string) => m.trim()).filter(Boolean)
                        : []);

                  const effectiveGroupId = pkg.planGroupId || ('group_' + (pkg.slug || pkg.id));
                  const effectiveMonthlyId = pkg.monthlyPlanId || (pkg.isFree ? pkg.id : `${pkg.id || pkg.slug}_monthly`);
                  const effectiveAnnualId = pkg.annualPlanId || (pkg.isFree ? pkg.id : `${pkg.id || pkg.slug}_annual`);

                  return (
                    <div
                      key={cardIdentifier}
                      className="p-4 rounded-2xl border flex items-center justify-between transition shadow-xs cursor-pointer"
                      onClick={() => handleEditPackage(pkg)}
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: editingId === cardIdentifier 
                          ? 'var(--color-primary)' 
                          : 'var(--color-border)'
                      }}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{pkg.name}</span>
                          
                          {/* PLAN GROUP ID BADGE */}
                          <span 
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-xs"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-secondary)'
                            }}
                            title={`Plan Group: ${effectiveGroupId}`}
                          >
                            Group: {effectiveGroupId}
                          </span>

                          {/* SEPARATE MONTHLY & ANNUAL PLAN ID BADGES */}
                          {!pkg.isFree && (
                            <>
                              <span 
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-primary)',
                                  color: 'var(--color-primary)'
                                }}
                                title={`Monthly Plan ID: ${effectiveMonthlyId}`}
                              >
                                Monthly: {effectiveMonthlyId}
                              </span>

                              <span 
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-emerald)',
                                  color: 'var(--color-emerald)'
                                }}
                                title={`Annual Plan ID: ${effectiveAnnualId}`}
                              >
                                Annual: {effectiveAnnualId}
                              </span>
                            </>
                          )}
                          
                          {pkg.isDefault ? (
                            <span 
                              className="text-[10px] border px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 shadow-xs"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-primary)',
                                color: 'var(--color-primary)'
                              }}
                              title={t('currentDefaultPlanTooltip', 'Current Default Plan for new user signups')}
                            >
                              {t('defaultSystemPlan', 'DEFAULT SYSTEM PLAN')}
                            </span>
                          ) : null}

                          {pkg.isFree ? (
                            <span 
                              className="text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase shadow-xs"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: 'var(--color-emerald)',
                                color: 'var(--color-emerald)'
                              }}
                            >
                              {t('freeBadge', 'FREE')}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="text-[10px] border px-2 py-0.5 rounded-full font-bold shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-primary)',
                                  color: 'var(--color-primary)'
                                }}
                              >
                                ${pkg.monthlyPriceDollars.toFixed(2)}{t('perMonth', '/month')}
                              </span>
                              <span 
                                className="text-[10px] border px-2 py-0.5 rounded-full font-bold shadow-xs"
                                style={{
                                  backgroundColor: 'var(--color-inner-dark)',
                                  borderColor: 'var(--color-emerald)',
                                  color: 'var(--color-emerald)'
                                }}
                              >
                                ${pkg.annualPriceDollars.toFixed(2)}{t('perYear', '/year')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs space-x-2" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>{pkg.aiRecipeLimit === -1 ? t('unlimitedLabel', 'Unlimited') : pkg.aiRecipeLimit} AI recipes</span>
                          <span>•</span>
                          <span className="font-mono font-semibold" style={{ color: 'var(--color-primary)' }}>
                            {pkg.tokenLimit === -1 ? 'Unlimited Tokens' : `${(pkg.tokenLimit || 0).toLocaleString()} tokens`} ({getReimburseLabel(pkg.tokenReimburseFrequency)})
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {modelsList.map((m) => {
                            const isGem = m.includes('gemini');
                            return (
                              <span
                                key={m}
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded border"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: isGem ? 'var(--color-primary)' : 'var(--color-emerald)',
                                  color: isGem ? 'var(--color-primary)' : 'var(--color-emerald)'
                                }}
                              >
                                {m}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={!isTaster}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultPlan(pkg);
                          }}
                          className={`p-2 rounded-xl border transition flex items-center gap-1 shadow-xs ${
                            isTaster
                              ? 'cursor-default'
                              : 'opacity-35 cursor-not-allowed'
                          }`}
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: isTaster ? 'var(--color-primary)' : 'var(--color-border)',
                            color: isTaster ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                          }}
                          title={
                            isTaster
                              ? t('tasterPermanentDefaultTooltip', 'The Taster plan (ID: preset_taster) is permanently locked as the system default plan')
                              : t('tasterLockedDefaultTooltip', 'The Taster plan (ID: preset_taster) is permanently locked as the default plan')
                          }
                        >
                          <Star className={`h-4 w-4 ${isTaster ? 'fill-current' : ''}`} style={{ color: isTaster ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPackage(pkg);
                          }}
                          className="p-2 rounded-xl border transition cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                          title={t('editPlanTooltip', 'Edit Plan')}
                        >
                          <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                        </button>

                        <button
                          type="button"
                          disabled={isTaster || deletingId === cardIdentifier}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePackage(pkg);
                          }}
                          className={`p-2 rounded-xl border transition shadow-xs ${
                            isTaster
                              ? 'opacity-35 cursor-not-allowed'
                              : 'hover:text-red-500 cursor-pointer'
                          }`}
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                          title={isTaster ? t('tasterPermanentProtected', 'Taster plan is permanently protected') : t('deletePackageTooltip', 'Delete Plan')}
                        >
                          {deletingId === cardIdentifier ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LIVE CARD MOCKUP PREVIEW */}
          <div 
            className="border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Eye className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {t('liveCardMockup', 'Live Card Mockup Preview')}
              </h2>

              <div 
                className="rounded-full p-1 border shadow-xs flex items-center transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewTab('monthly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    previewTab === 'monthly' ? 'bg-[var(--color-primary)] text-white shadow-sm' : ''
                  }`}
                  style={previewTab !== 'monthly' ? { color: 'var(--color-text-secondary)' } : undefined}
                >
                  {t('monthlyBtn', 'Monthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('annual')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    previewTab === 'annual' ? 'bg-[var(--color-primary)] text-white shadow-sm' : ''
                  }`}
                  style={previewTab !== 'annual' ? { color: 'var(--color-text-secondary)' } : undefined}
                >
                  {t('annualBtn', 'Annual')}
                </button>
              </div>
            </div>

            <div className="rounded-3xl p-7 border-2 relative transition shadow-md"
              style={{ 
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: isFree ? 'var(--color-primary)' : 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              {!isFree && previewTab === 'annual' && form.annualBadge && (
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-black text-white shadow-md" style={{ backgroundColor: 'var(--color-emerald)' }}>
                  {form.annualBadge}
                </div>
              )}

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black" style={{ color: 'var(--color-emerald)' }}>
                      {form.name || t('planNameLabel', 'Plan Name')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                        Group: {form.planGroupId || form.id || form.slug}
                      </span>
                      {!isFree && previewTab === 'monthly' && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                          Monthly Plan ID: {form.monthlyPlanId || `${form.id || form.slug}_monthly`}
                        </span>
                      )}
                      {!isFree && previewTab === 'annual' && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-emerald)' }}>
                          Annual Plan ID: {form.annualPlanId || `${form.id || form.slug}_annual`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border font-mono" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                    {form.tokenLimit === -1 ? 'Unlimited Tokens' : `${(form.tokenLimit || 0).toLocaleString()} tokens`} ({getReimburseLabel(form.tokenReimburseFrequency)})
                  </span>
                </div>

                {isFree ? (
                  <div>
                    <div className="text-4xl font-black" style={{ color: 'var(--color-primary)' }}>
                      {t('freeMockupText', 'Free')}
                    </div>
                    <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {form.descriptionMonthly || t('defaultFreeDesc', 'Free plan with limited features')}
                    </p>
                  </div>
                ) : previewTab === 'monthly' ? (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black" style={{ color: 'var(--color-primary)' }}>
                        ${form.monthlyPriceDollars.toFixed(2)}
                      </span>
                      <span className="text-base font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('perMonth', '/month')}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('usdCurrency', 'USD')}
                    </div>

                    {form.monthlyBadge && (
                      <div className="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        {form.monthlyBadge}
                      </div>
                    )}

                    <p className="text-xs font-medium mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {form.descriptionMonthly || t('defaultMonthlyDesc', 'Full kitchen access, billed monthly')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black" style={{ color: 'var(--color-primary)' }}>
                        ${form.annualPriceDollars.toFixed(2)}
                      </span>
                      <span className="text-base font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('perYear', '/year')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold mt-1" style={{ color: 'var(--color-text)' }}>
                      <span>${annualMonthlyEquivalent}{t('perMonth', '/month')}</span>
                      <span className="line-through font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                        ${form.monthlyPriceDollars.toFixed(2)}{t('perMonth', '/month')}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('usdCurrency', 'USD')}
                    </div>

                    {form.trialBadge && (
                      <div className="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm" style={{ backgroundColor: '#2563eb' }}>
                        {form.trialBadge}
                      </div>
                    )}

                    <p className="text-xs font-medium mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {form.descriptionAnnual || t('defaultAnnualDesc', 'Best value - all premium features, billed annually')}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1 flex-wrap pt-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-secondary)' }}>Allowed AI Models:</span>
                  {currentAllowedModels.map((m) => (
                    <span key={m} className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                      {m}
                    </span>
                  ))}
                </div>

                <div className="pt-2 space-y-2 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                  {currentFeaturesList.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    className="w-full py-3 rounded-2xl text-xs font-bold text-white transition shadow-md cursor-pointer"
                    style={{ backgroundColor: isFree ? 'var(--color-primary)' : 'var(--color-emerald)' }}
                  >
                    {form.buttonText || (isFree ? t('manageDefaultBtn', 'Manage') : t('choosePlanDefaultBtn', 'Choose Plan'))}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
