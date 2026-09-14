// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, PackageCheck, Zap, Trash2, Sparkles, AlertCircle, 
  Check, Shield, CheckCircle2, Eye, RefreshCw, Edit3, DollarSign, Copy, Plus, Calendar, Tag, Star, Cpu, Bot, X
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface SubscriptionPackageConfig {
  id: string;
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
  const { t, version } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackageConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [form, setForm] = useState<SubscriptionPackageConfig>({ ...DEFAULT_PRESET_NUTRITION_PRO });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [previewTab, setPreviewTab] = useState<'monthly' | 'annual'>('annual');
  const [settingsFilter, setSettingsFilter] = useState<'both' | 'monthly' | 'annual'>('both');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Synced state from /admin/ai-settings
  const [activeSettingsModel, setActiveSettingsModel] = useState<string>('gemini-3.6-flash');
  const [selectedAiProvider, setSelectedAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [selectedAiVersion, setSelectedAiVersion] = useState<string>('gemini-3.6-flash');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize with /admin/ai-settings configuration
  const syncWithAiSettings = useCallback(() => {
    try {
      const stored = localStorage.getItem('zecratary_chef_ai_settings') || 
                     localStorage.getItem('zecratary_engine_config') || 
                     localStorage.getItem('zecratary_settings');
      if (stored) {
        const c = JSON.parse(stored);
        if (c.model) {
          setActiveSettingsModel(c.model);
          if (c.provider === 'openai' || c.model.startsWith('gpt')) {
            setSelectedAiProvider('openai');
            setSelectedAiVersion(c.model);
          } else {
            setSelectedAiProvider('gemini');
            setSelectedAiVersion(c.model);
          }
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncWithAiSettings();
    window.addEventListener('zecratary_settings_updated', syncWithAiSettings);
    window.addEventListener('zecratary_engine_config_updated', syncWithAiSettings);
    window.addEventListener('storage', syncWithAiSettings);
    return () => {
      window.removeEventListener('zecratary_settings_updated', syncWithAiSettings);
      window.removeEventListener('zecratary_engine_config_updated', syncWithAiSettings);
      window.removeEventListener('storage', syncWithAiSettings);
    };
  }, [syncWithAiSettings]);

  // Dynamic Theme Synchronization & Color Inversion
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
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
    } catch (e) {}
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

  const loadLocalPackages = useCallback((): SubscriptionPackageConfig[] => {
    try {
      const local = localStorage.getItem('zecratary_subscription_configs');
      if (local !== null) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasTaster = parsed.some((p) => p.slug === 'taster' || p.id === 'preset_taster');
          let list = hasTaster ? parsed : [{ ...DEFAULT_PRESET_TASTER }, ...parsed];

          list = list.map((p: any) => ({
            ...p,
            tokenLimit: p.tokenLimit !== undefined ? p.tokenLimit : (p.slug === 'taster' ? 50000 : 500000),
            tokenReimburseFrequency: p.tokenReimburseFrequency || 'monthly',
            allowedAiModels: p.allowedAiModels || 'gemini-3.6-flash'
          }));

          const hasDefault = list.some((p) => p.isDefault);
          if (!hasDefault) {
            list = list.map((p) => ({
              ...p,
              isDefault: p.slug === 'taster' || p.id === 'preset_taster',
            }));
          }
          return list;
        }
      }
    } catch (e) {}
    return [{ ...DEFAULT_PRESET_TASTER }, { ...DEFAULT_PRESET_NUTRITION_PRO }];
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      await fetch('/api/admin/plans');
      const local = loadLocalPackages();
      setPackages(local);
    } catch (e) {
      const local = loadLocalPackages();
      setPackages(local);
    }
  }, [loadLocalPackages]);

  useEffect(() => {
    if (!mounted) return;
    document.title = `${t('subscriptionPlansTitle', 'Subscription Plans')} - FoodiePrep Admin`;
    initAuthStorage();
    setCurrentUser(getCurrentUser());
    fetchPackages();
  }, [fetchPackages, mounted, t]);

  const handleSetDefaultPlan = (targetPkg: SubscriptionPackageConfig) => {
    const targetKey = targetPkg.id || targetPkg.slug;
    const updated = packages.map((p) => {
      const currentKey = p.id || p.slug;
      return {
        ...p,
        isDefault: currentKey === targetKey || p.slug === targetPkg.slug,
      };
    });

    setPackages(updated);
    localStorage.setItem('zecratary_subscription_configs', JSON.stringify(updated));
    localStorage.setItem('zecratary_default_plan_slug', targetPkg.slug);
    window.dispatchEvent(new Event('zecratary_plans_updated'));
    window.dispatchEvent(new Event('storage'));

    setFeedback({
      type: 'success',
      msg: `"${targetPkg.name}" ${t('nowActiveDefault', 'is now the active default plan for new registrations!')}`,
    });
  };

  const handleStartNewPlan = () => {
    setEditingId(null);
    setIsFree(false);
    setForm({
      ...BLANK_NEW_PLAN,
      id: 'plan_' + Date.now(),
      slug: '',
      allowedAiModels: activeSettingsModel || 'gemini-3.6-flash'
    });
  };

  const handleApplyPreset = (preset: SubscriptionPackageConfig) => {
    setEditingId(null);
    setIsFree(preset.isFree);
    setForm({ 
      ...preset, 
      id: 'plan_' + Date.now(),
      slug: preset.slug || preset.name.toLowerCase().replace(/\s+/g, '-')
    });
  };

  const handleEditPackage = (pkg: SubscriptionPackageConfig) => {
    const targetIdentifier = pkg.id || pkg.slug;
    const planIsFree = Boolean(pkg.isFree || (Number(pkg.monthlyPriceDollars) === 0 && Number(pkg.annualPriceDollars) === 0));
    setEditingId(targetIdentifier);
    setIsFree(planIsFree);
    setForm({ 
      ...pkg, 
      isFree: planIsFree,
      tokenLimit: pkg.tokenLimit !== undefined ? pkg.tokenLimit : 100000,
      tokenReimburseFrequency: pkg.tokenReimburseFrequency || 'monthly',
      allowedAiModels: pkg.allowedAiModels || activeSettingsModel || 'gemini-3.6-flash'
    });
  };

  const handleAddAiModel = (modelVal: string) => {
    if (!modelVal) return;
    const current = form.allowedAiModels ? form.allowedAiModels.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!current.includes(modelVal)) {
      const updated = [...current, modelVal].join(',');
      setForm({ ...form, allowedAiModels: updated });
    }
  };

  const handleRemoveAiModel = (modelVal: string) => {
    const current = form.allowedAiModels ? form.allowedAiModels.split(',').map(s => s.trim()).filter(Boolean) : [];
    const updated = current.filter(m => m !== modelVal).join(',');
    setForm({ ...form, allowedAiModels: updated });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const parsedFeatures = form.featuresText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const generatedSlug = (form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    const planId = form.id || 'plan_' + Date.now();

    const payload = {
      ...form,
      id: planId,
      slug: generatedSlug,
      isFree,
      isDefault: form.isDefault ?? (generatedSlug === 'taster'),
      monthlyPriceDollars: isFree ? 0 : Number(form.monthlyPriceDollars) || 0,
      annualPriceDollars: isFree ? 0 : Number(form.annualPriceDollars) || 0,
      tokenLimit: Number(form.tokenLimit) || 100000,
      tokenReimburseFrequency: form.tokenReimburseFrequency || 'monthly',
      features: parsedFeatures,
      allowedAiModels: form.allowedAiModels.split(',').map((m) => m.trim()),
    };

    try {
      await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const updatedPlanItem: SubscriptionPackageConfig = {
        ...form,
        id: planId,
        slug: generatedSlug,
        isFree,
        isDefault: form.isDefault ?? (generatedSlug === 'taster'),
        monthlyPriceDollars: isFree ? 0 : Number(form.monthlyPriceDollars) || 0,
        annualPriceDollars: isFree ? 0 : Number(form.annualPriceDollars) || 0,
        tokenLimit: Number(form.tokenLimit) || 100000,
        tokenReimburseFrequency: form.tokenReimburseFrequency || 'monthly',
        featuresText: parsedFeatures.join('\n'),
      };

      let updatedList = [...packages];
      if (editingId) {
        const index = updatedList.findIndex((p) => p.id === editingId || p.slug === editingId);
        if (index >= 0) {
          updatedList[index] = updatedPlanItem;
        } else {
          updatedList.push(updatedPlanItem);
        }
      } else {
        const existingIndex = updatedList.findIndex((p) => p.slug === generatedSlug || (p.id && p.id === planId));
        if (existingIndex >= 0) {
          updatedList[existingIndex] = updatedPlanItem;
        } else {
          updatedList.push(updatedPlanItem);
        }
      }

      setPackages(updatedList);
      localStorage.setItem('zecratary_subscription_configs', JSON.stringify(updatedList));
      window.dispatchEvent(new Event('zecratary_plans_updated'));

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
      const deleteIdentifier = pkg.slug || pkg.id;
      const res = await fetch(`/api/admin/plans?id=${encodeURIComponent(deleteIdentifier)}`, { 
        method: 'DELETE' 
      });
      const resData = await res.json().catch(() => ({ success: true }));

      if (!res.ok && resData.error) {
        setFeedback({ type: 'error', msg: resData.error });
        return;
      }

      let updated = packages.filter((p) => {
        if (pkg.id && p.id === pkg.id) return false;
        if (pkg.slug && p.slug === pkg.slug) return false;
        return true;
      });

      if (pkg.isDefault) {
        updated = updated.map((p) => ({
          ...p,
          isDefault: p.slug === 'taster' || p.id === 'preset_taster',
        }));
        localStorage.setItem('zecratary_default_plan_slug', 'taster');
      }

      setPackages(updated);
      localStorage.setItem('zecratary_subscription_configs', JSON.stringify(updated));
      window.dispatchEvent(new Event('zecratary_plans_updated'));
      
      if (editingId === targetKey || editingId === pkg.id || editingId === pkg.slug || form.slug === pkg.slug) {
        handleStartNewPlan();
      }

      setFeedback({ type: 'success', msg: `"${pkg.name}" ${t('packageDeletedSuccess', 'package deleted successfully.')}` });
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || t('errorDeletingPlan', 'Error deleting package.') });
    } finally {
      setDeletingId(null);
    }
  };

  if (!mounted) {
    return <div className="max-w-7xl mx-auto p-8 text-slate-400 text-xs">{t('loadingPlans', 'Loading subscription plans...')}</div>;
  }

  const currentFeaturesList = form.featuresText.split(/\r?\n/).filter(Boolean);
  const currentAllowedModels = form.allowedAiModels ? form.allowedAiModels.split(',').map(s => s.trim()).filter(Boolean) : [];
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
  const submitButtonBg = isCreateMode ? '#10b981' : 'var(--color-primary, #E05638)';
  const submitButtonHoverBg = isCreateMode ? '#059669' : 'var(--color-primary-hover, #c94529)';

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
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('subscriptionPlansTitle', 'Subscription Plans')}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('subscriptionPlansSubtitle', 'Manage plan pricing, usage quotas, token availability, reimburse schedule, and subscriber packages')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleStartNewPlan}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <Plus className="h-4 w-4" /> {t('addNewPlanBtn', 'Add New Plan')}
          </button>
          <Link
            href="/admin"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <Shield className="h-4 w-4" style={{ color: isDayMode ? '#059669' : 'var(--color-emerald, #10b981)' }} /> {t('adminSettingsBtn', 'Admin Settings')}
          </Link>
        </div>
      </div>

      <div 
        className="p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {t('quickFillPresets', 'Quick-Fill Presets:')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleApplyPreset(DEFAULT_PRESET_TASTER)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#334155' : '#cbd5e1'
            }}
          >
            {t('presetTasterBtn', 'Preset: Taster (Free)')}
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(DEFAULT_PRESET_NUTRITION_PRO)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)',
              borderColor: 'var(--color-primary, #E05638)',
              color: 'var(--color-primary, #E05638)'
            }}
          >
            {t('presetNutritionProBtn', 'Preset: Nutrition Pro')}
          </button>
          <button
            type="button"
            onClick={handleStartNewPlan}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
              borderColor: 'var(--color-emerald, #10b981)',
              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form 
          onSubmit={handleSavePlan} 
          className="lg:col-span-6 border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {editingId ? `${t('editPlanPrefix', 'Edit Plan:')} ${form.name || t('planNameLabel', 'Plan')}` : t('addNewPlanTitle', 'Add New Subscription Plan')}
                </h2>
                <span className="text-[10px] block font-mono" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {editingId ? `${t('idPrefix', 'ID:')} ${editingId}` : t('creatingNewTier', 'Creating new plan')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleStartNewPlan}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : '#1e293b',
                    borderColor: isDayMode ? '#cbd5e1' : '#334155',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  {t('clearNewBtn', 'Clear / New')}
                </button>
              )}
              <div 
                className="flex items-center gap-1 p-1 rounded-xl border transition"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : '#0B101D',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b'
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
                      ? 'bg-[#10b981] text-white shadow-sm' 
                      : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
                  }`}
                >
                  {t('freeTierToggle', 'Free Plan')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(false);
                    if (form.monthlyPriceDollars === 0 && form.annualPriceDollars === 0) {
                      setForm({ ...form, isFree: false, monthlyPriceDollars: 0, annualPriceDollars: 0 });
                    } else {
                      setForm({ ...form, isFree: false });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !isFree 
                      ? 'bg-[var(--color-primary,#E05638)] text-white shadow-sm' 
                      : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
                  }`}
                >
                  {t('paidTierToggle', 'Paid Plan')}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                {t('planNameLabel', 'Plan Name')}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    slug: form.slug && editingId ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  })
                }
                placeholder={t('planNamePlaceholder', 'e.g. Starter, Family Pro, Unlimited')}
                className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                {t('slugLabel', 'Slug Identifier')}
              </label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
                placeholder={t('slugPlaceholder', 'e.g. starter-plan')}
                className="w-full border rounded-xl p-2.5 text-xs text-mono outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                }}
              />
            </div>
          </div>

          {/* TOKEN AVAILABILITY & REIMBURSE SCHEDULE */}
          <div 
            className="p-4 rounded-2xl border space-y-3 transition shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <Cpu className="h-4 w-4" /> Token Availability & Reimburse Schedule
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  Token Limit (Availability)
                </label>
                <input
                  type="number"
                  value={form.tokenLimit}
                  onChange={(e) => setForm({ ...form, tokenLimit: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 50000"
                  className="w-full border rounded-xl p-2.5 text-xs font-mono font-bold outline-none transition"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : '#0B101D',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
                <span className="text-[10px] block mt-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>(-1 for unlimited tokens)</span>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  Token Reimburse Frequency
                </label>
                <select
                  value={form.tokenReimburseFrequency}
                  onChange={(e) => setForm({ ...form, tokenReimburseFrequency: e.target.value as any })}
                  className="w-full border rounded-xl p-2.5 text-xs font-bold outline-none transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : '#0B101D',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  <option value="once">Once (Non-recurring)</option>
                  <option value="weekly">Every Week (From purchase date)</option>
                  <option value="monthly">Every Month (From purchase date)</option>
                </select>
                <span className="text-[10px] block mt-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Quota refresh schedule</span>
              </div>
            </div>
          </div>

          {/* ALLOWED AI MODELS DROPDOWN & BUTTON PICKER */}
          <div 
            className="p-4 rounded-2xl border space-y-3 transition shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                <Bot className="h-4 w-4 text-[var(--color-primary)]" />
                {t('allowedAiModelsLabel', 'Allowed AI Models')}
              </label>

              {activeSettingsModel && (
                <button
                  type="button"
                  onClick={() => handleAddAiModel(activeSettingsModel)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md border cursor-pointer transition flex items-center gap-1 font-bold shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#fff7ed' : 'rgba(224, 86, 56, 0.12)',
                    borderColor: 'var(--color-primary, #E05638)',
                    color: 'var(--color-primary, #E05638)'
                  }}
                  title="Click to sync and add active model configured in /admin/ai-settings"
                >
                  <Sparkles className="h-3 w-3" /> Sync Active: {activeSettingsModel}
                </button>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                1. Choose AI Model Provider
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAiProvider('gemini');
                    setSelectedAiVersion(GEMINI_MODEL_VERSIONS[0]?.value || 'gemini-3.6-flash');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    selectedAiProvider === 'gemini'
                      ? 'bg-[var(--color-primary,#E05638)] text-white border-[var(--color-primary,#E05638)]'
                      : (isDayMode ? 'bg-white text-slate-700 border-slate-300' : 'bg-[#111726] text-slate-300 border-slate-700')
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" /> Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAiProvider('openai');
                    setSelectedAiVersion(OPENAI_MODEL_VERSIONS[0]?.value || 'gpt-4o');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    selectedAiProvider === 'openai'
                      ? 'bg-[#10b981] text-white border-[#10b981]'
                      : (isDayMode ? 'bg-white text-slate-700 border-slate-300' : 'bg-[#111726] text-slate-300 border-slate-700')
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" /> OpenAI GPT
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                2. Choose AI Version (Synced from /admin/ai-settings)
              </span>
              <div className="flex gap-2">
                <select
                  value={selectedAiVersion}
                  onChange={(e) => setSelectedAiVersion(e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2 text-xs font-medium outline-none transition cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#ffffff' : '#0B101D',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  {(selectedAiProvider === 'gemini' ? GEMINI_MODEL_VERSIONS : OPENAI_MODEL_VERSIONS).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} {m.value === activeSettingsModel ? '★ [Active]' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddAiModel(selectedAiVersion)}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer transition shrink-0"
                  style={{ backgroundColor: selectedAiProvider === 'gemini' ? 'var(--color-primary, #E05638)' : '#10b981' }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
                          backgroundColor: isGem 
                            ? (isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.15)') 
                            : (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)'),
                          borderColor: isGem ? 'var(--color-primary, #E05638)' : '#10b981',
                          color: isGem 
                            ? (isDayMode ? '#991b1b' : 'var(--color-primary, #E05638)') 
                            : (isDayMode ? '#047857' : '#10b981')
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
              <div className="flex items-center justify-between border-b pb-2 pt-1" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  <DollarSign className="h-4 w-4 text-[var(--color-primary)]" /> {t('pricingDisplaySettings', 'Pricing & Billing Display Settings')}
                </span>

                <div 
                  className="p-1 rounded-xl border flex items-center gap-1 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : '#0B101D',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSettingsFilter('both')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      settingsFilter === 'both' ? 'bg-slate-700 text-white shadow-sm' : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
                    }`}
                  >
                    {t('viewBothBtn', 'View Both')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsFilter('monthly')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      settingsFilter === 'monthly' ? 'bg-[#E05638] text-white shadow-sm' : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
                    }`}
                  >
                    {t('monthlyBtn', 'Monthly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsFilter('annual')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      settingsFilter === 'annual' ? 'bg-[#10b981] text-white shadow-sm' : (isDayMode ? 'text-slate-600 hover:text-black' : 'text-slate-400 hover:text-white')
                    }`}
                  >
                    {t('annualBtn', 'Annual')}
                  </button>
                </div>
              </div>

              {(settingsFilter === 'both' || settingsFilter === 'monthly') && (
                <div 
                  className="p-4 rounded-2xl border space-y-3 relative transition shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#fff7ed' : 'rgba(224, 86, 56, 0.04)',
                    borderColor: isDayMode ? '#fdba74' : 'rgba(224, 86, 56, 0.35)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#E05638]" />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {t('monthlySubscriptionTitle', 'Monthly Subscription Settings')}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-orange-500/15 text-orange-600 border border-orange-500/30">
                      {t('billedEveryMonth', 'Billed Every Month')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
                          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#0f172a' : '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                        {t('badgeOptional', 'Badge Text (Optional)')}
                      </label>
                      <input
                        type="text"
                        value={form.monthlyBadge}
                        onChange={(e) => setForm({ ...form, monthlyBadge: e.target.value })}
                        placeholder="e.g. Billed Immediately, Most Flexible"
                        className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                        style={{
                          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#0f172a' : '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                      {t('subtextTagline', 'Subtext / Tagline')}
                    </label>
                    <input
                      type="text"
                      value={form.descriptionMonthly}
                      onChange={(e) => setForm({ ...form, descriptionMonthly: e.target.value })}
                      placeholder="e.g. Full kitchen access, billed monthly"
                      className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                </div>
              )}

              {(settingsFilter === 'both' || settingsFilter === 'annual') && (
                <div 
                  className="p-4 rounded-2xl border space-y-3 relative transition shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.04)',
                    borderColor: isDayMode ? '#a7f3d0' : 'rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#10b981]" />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {t('annualSubscriptionTitle', 'Annual Subscription Settings')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {calculatedSavings > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-800 border border-emerald-500/30">
                          {t('savesBadge', `Saves ${calculatedSavings}%`).replace('{percent}', calculatedSavings.toString())}
                        </span>
                      )}
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border"
                        style={{
                          backgroundColor: isDayMode ? '#ffffff' : '#1e293b',
                          color: isDayMode ? '#334155' : '#cbd5e1',
                          borderColor: isDayMode ? '#cbd5e1' : '#334155'
                        }}
                      >
                        {t('moEqBadge', `$${annualMonthlyEquivalent}/mo eq.`).replace('{amount}', annualMonthlyEquivalent)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
                          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#0f172a' : '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                        {t('discountBadge', 'Discount Badge (e.g. Save 44%)')}
                      </label>
                      <input
                        type="text"
                        value={form.annualBadge}
                        onChange={(e) => setForm({ ...form, annualBadge: e.target.value })}
                        placeholder="e.g. Save 44%, Best Value"
                        className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                        style={{
                          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#0f172a' : '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                        {t('trialBadgeLabel', 'Trial Badge (e.g. 7-Day Free Trial)')}
                      </label>
                      <input
                        type="text"
                        value={form.trialBadge}
                        onChange={(e) => setForm({ ...form, trialBadge: e.target.value })}
                        placeholder="e.g. 7-Day Free Trial"
                        className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                        style={{
                          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                          borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                          color: isDayMode ? '#0f172a' : '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                      {t('annualSubtext', 'Annual Subtext')}
                    </label>
                    <input
                      type="text"
                      value={form.descriptionAnnual}
                      onChange={(e) => setForm({ ...form, descriptionAnnual: e.target.value })}
                      placeholder="e.g. Best value - all premium features, billed annually"
                      className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-inner-dark, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
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
                  backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.1)',
                  borderColor: isDayMode ? '#a7f3d0' : 'rgba(16, 185, 129, 0.3)',
                  color: isDayMode ? '#047857' : '#10b981'
                }}
              >
                <span>{t('zeroCostPlanNotice', 'This is a free plan package. Pricing fields are automatically set to $0.')}</span>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                  {t('freePlanDescLabel', 'Free Plan Description / Subtitle')}
                </label>
                <input
                  type="text"
                  value={form.descriptionMonthly}
                  onChange={(e) => setForm({ ...form, descriptionMonthly: e.target.value, descriptionAnnual: e.target.value })}
                  placeholder={t('freePlanDescPlaceholder', 'e.g. Free tier with limited features')}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('buttonLabelField', 'Button Label')}</label>
              <input
                type="text"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                placeholder="Choose Plan"
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('aiRecipeLimitField', 'AI Recipe Limit')}</label>
              <input
                type="number"
                value={form.aiRecipeLimit}
                onChange={(e) => setForm({ ...form, aiRecipeLimit: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
              <span className="text-[10px] block mt-1 leading-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('recipeLimitHint', '(-1 for unlimited)')}</span>
            </div>
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('libraryMaxField', 'Library Max')}</label>
              <input
                type="number"
                value={form.recipeLibraryLimit}
                onChange={(e) => setForm({ ...form, recipeLibraryLimit: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
              <span className="text-[10px] block mt-1 leading-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('libraryLimitHint', '(-1 for unlimited)')}</span>
            </div>
            <div>
              <label className="uppercase font-bold block mb-1 text-[10px]" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>{t('scrapeLimitField', 'Scrape Limit')}</label>
              <input
                type="number"
                value={form.socialScrapeLimit}
                onChange={(e) => setForm({ ...form, socialScrapeLimit: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-xl p-2 text-xs outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
              <span className="text-[10px] block mt-1 leading-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('scrapeLimitHint', '(-1 for unlimited)')}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase font-bold" style={{ color: isDayMode ? '#475569' : '#94a3b8' }}>
                {t('featuresChecklistLabel', 'Features Checklist (One per line)')}
              </label>
              <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{currentFeaturesList.length} {t('itemsCountSuffix', 'items')}</span>
            </div>
            <textarea
              rows={4}
              value={form.featuresText}
              onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
              placeholder="Unlimited AI-powered recipe generation&#10;Unlimited recipe library&#10;Comprehensive nutritional analysis"
              className="w-full border rounded-xl p-2.5 text-xs outline-none transition font-sans"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            />
            <span className="text-[10px] block mt-1 leading-tight" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('onePerLineNote', 'Each line will render with a checkmark on the pricing card.')}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="macros_box"
              checked={form.canViewMacros}
              onChange={(e) => setForm({ ...form, canViewMacros: e.target.checked })}
              className="rounded w-4 h-4 cursor-pointer accent-[#E05638]"
            />
            <label htmlFor="macros_box" className="text-xs cursor-pointer select-none" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
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
          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <PackageCheck className="h-5 w-5" style={{ color: '#10b981' }} />
                {t('systemPackagesList', 'System Plans List')} ({packages.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartNewPlan}
                  className="text-xs font-bold flex items-center gap-1 text-emerald-600 hover:text-emerald-500 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> {t('newTierBtn', 'New Plan')}
                </button>
                <button
                  type="button"
                  onClick={fetchPackages}
                  className="text-xs font-bold flex items-center gap-1 transition ml-2 cursor-pointer"
                  style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
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
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#64748b' : '#94a3b8'
                  }}
                >
                  {t('noPackagesConfigured', 'No subscription plans configured.')}
                </div>
              ) : (
                packages.map((pkg) => {
                  const cardIdentifier = pkg.id || pkg.slug;
                  const isTaster = pkg.slug === 'taster' || pkg.id === 'preset_taster';
                  const modelsList = pkg.allowedAiModels ? pkg.allowedAiModels.split(',').map(m => m.trim()).filter(Boolean) : [];

                  return (
                    <div
                      key={cardIdentifier}
                      className="p-4 rounded-2xl border flex items-center justify-between transition shadow-xs"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                        borderColor: editingId === cardIdentifier 
                          ? 'var(--color-primary, #E05638)' 
                          : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
                      }}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{pkg.name}</span>
                          
                          {pkg.isDefault ? (
                            <span 
                              className="text-[10px] border px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 shadow-xs"
                              style={{
                                backgroundColor: isDayMode ? '#fef3c7' : 'rgba(73, 178, 238, 0.2)',
                                borderColor: isDayMode ? '#f59e0b' : '#0bc2f5',
                                color: isDayMode ? '#b45309' : '#e6be2e'
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
                                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                                borderColor: '#10b981',
                                color: isDayMode ? '#047857' : '#10b981'
                              }}
                            >
                              {t('freeBadge', 'FREE')}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="text-[10px] border px-2 py-0.5 rounded-full font-bold shadow-xs"
                                style={{
                                  backgroundColor: isDayMode ? '#fee2e2' : 'rgba(224, 86, 56, 0.2)',
                                  borderColor: 'var(--color-primary, #E05638)',
                                  color: 'var(--color-primary, #E05638)'
                                }}
                              >
                                ${pkg.monthlyPriceDollars.toFixed(2)}{t('perMonth', '/month')}
                              </span>
                              <span 
                                className="text-[10px] border px-2 py-0.5 rounded-full font-bold shadow-xs"
                                style={{
                                  backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                                  borderColor: '#10b981',
                                  color: isDayMode ? '#047857' : '#10b981'
                                }}
                              >
                                ${pkg.annualPriceDollars.toFixed(2)}{t('perYear', '/year')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs space-x-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                          <span>{pkg.aiRecipeLimit === -1 ? t('unlimitedLabel', 'Unlimited') : pkg.aiRecipeLimit} AI recipes</span>
                          <span>•</span>
                          <span className="text-orange-400 font-mono font-semibold">
                            {pkg.tokenLimit === -1 ? 'Unlimited Tokens' : `${(pkg.tokenLimit || 0).toLocaleString()} tokens`} ({getReimburseLabel(pkg.tokenReimburseFrequency)})
                          </span>
                        </div>

                        {/* Models pill preview */}
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {modelsList.map((m) => (
                            <span
                              key={m}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded border"
                              style={{
                                backgroundColor: m.includes('gemini')
                                  ? (isDayMode ? '#fff7ed' : 'rgba(224, 86, 56, 0.1)')
                                  : (isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.1)'),
                                borderColor: m.includes('gemini') ? 'var(--color-primary, #E05638)' : '#10b981',
                                color: m.includes('gemini') ? 'var(--color-primary, #E05638)' : '#10b981'
                              }}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultPlan(pkg)}
                          className={`p-2 rounded-xl border transition flex items-center gap-1 cursor-pointer shadow-xs ${
                            pkg.isDefault
                              ? 'text-amber-500 border-amber-500/50 bg-amber-500/15'
                              : (isDayMode ? 'text-slate-500 hover:text-amber-500 hover:border-amber-400' : 'text-slate-400 hover:text-amber-300 hover:border-amber-500/40')
                          }`}
                          style={{
                            backgroundColor: pkg.isDefault ? (isDayMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)') : (isDayMode ? '#ffffff' : 'var(--color-card, #111726)'),
                            borderColor: pkg.isDefault ? '#f59e0b' : (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')
                          }}
                          title={pkg.isDefault ? t('currentDefaultPlanTooltip', 'Current Default Plan for new user signups') : t('clickSetDefaultTooltip', 'Click to set as default sign-up plan')}
                        >
                          <Star className={`h-4 w-4 ${pkg.isDefault ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditPackage(pkg)}
                          className="p-2 rounded-xl border transition cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#0f172a' : '#cbd5e1'
                          }}
                          title={t('editPlanTooltip', 'Edit Plan')}
                        >
                          <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                        </button>

                        <button
                          type="button"
                          disabled={isTaster || deletingId === cardIdentifier}
                          onClick={() => handleDeletePackage(pkg)}
                          className={`p-2 rounded-xl border transition shadow-xs ${
                            isTaster
                              ? 'opacity-30 cursor-not-allowed text-slate-400'
                              : 'hover:text-red-500 cursor-pointer'
                          }`}
                          style={{
                            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                            borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                            color: isDayMode ? '#64748b' : '#94a3b8'
                          }}
                          title={isTaster ? t('tasterPermanentProtected', 'Taster plan is permanently protected') : t('deletePackageTooltip', 'Delete Plan')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div 
            className="border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Eye className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} />
                {t('liveCardMockup', 'Live Card Mockup Preview')}
              </h2>

              <div 
                className="rounded-full p-1 border shadow-xs flex items-center transition"
                style={{
                  backgroundColor: isDayMode ? '#f1f5f9' : '#ffffff',
                  borderColor: isDayMode ? '#cbd5e1' : '#e2e8f0'
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewTab('monthly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    previewTab === 'monthly'
                      ? 'bg-[#E05638] text-white shadow-sm'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {t('monthlyBtn', 'Monthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('annual')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    previewTab === 'annual'
                      ? 'bg-[#E05638] text-white shadow-sm'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {t('annualBtn', 'Annual')}
                </button>
              </div>
            </div>

            <div className="bg-[#FFFDF9] text-slate-800 rounded-3xl p-7 border-2 relative transition shadow-md"
              style={{ borderColor: isFree ? 'var(--color-primary, #E05638)' : '#e2e8f0' }}
            >
              {!isFree && previewTab === 'annual' && form.annualBadge && (
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-black text-white shadow-md bg-[#589c3a]">
                  {form.annualBadge}
                </div>
              )}

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-[#589c3a]">
                    {form.name || t('planNameLabel', 'Plan Name')}
                  </h3>
                  <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2.5 py-1 rounded-full border border-orange-300 font-mono">
                    {form.tokenLimit === -1 ? 'Unlimited Tokens' : `${(form.tokenLimit || 0).toLocaleString()} tokens`} ({getReimburseLabel(form.tokenReimburseFrequency)})
                  </span>
                </div>

                {isFree ? (
                  <div>
                    <div className="text-4xl font-black" style={{ color: 'var(--color-primary, #E05638)' }}>
                      {t('freeMockupText', 'Free')}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {form.descriptionMonthly || t('defaultFreeDesc', 'Free plan with limited features')}
                    </p>
                  </div>
                ) : previewTab === 'monthly' ? (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black" style={{ color: 'var(--color-primary, #E05638)' }}>
                        ${form.monthlyPriceDollars.toFixed(2)}
                      </span>
                      <span className="text-base font-bold text-slate-600">
                        {t('perMonth', '/month')}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                      {t('usdCurrency', 'USD')}
                    </div>

                    {form.monthlyBadge && (
                      <div className="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                      >
                        {form.monthlyBadge}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 font-medium mt-2">
                      {form.descriptionMonthly || t('defaultMonthlyDesc', 'Full premium access, billed monthly')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black" style={{ color: 'var(--color-primary, #E05638)' }}>
                        ${form.annualPriceDollars.toFixed(2)}
                      </span>
                      <span className="text-base font-bold text-slate-600">
                        {t('perYear', '/year')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold mt-1">
                      <span>${annualMonthlyEquivalent}{t('perMonth', '/month')}</span>
                      <span className="line-through text-slate-400 font-normal">
                        ${form.monthlyPriceDollars.toFixed(2)}{t('perMonth', '/month')}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                      {t('usdCurrency', 'USD')}
                    </div>

                    {form.trialBadge && (
                      <div className="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm bg-[#2563eb]">
                        {form.trialBadge}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 font-medium mt-2">
                      {form.descriptionAnnual || t('defaultAnnualDesc', 'Best value - all premium features, billed annually')}
                    </p>
                  </div>
                )}

                {/* Live Model Access list */}
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Allowed AI Models:</span>
                  {currentAllowedModels.map((m) => (
                    <span key={m} className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-slate-100 border-slate-300 text-slate-700 font-bold">
                      {m}
                    </span>
                  ))}
                </div>

                <div className="pt-2 space-y-2 text-xs font-semibold text-slate-700">
                  {currentFeaturesList.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-primary, #E05638)' }} />
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    className="w-full py-3 rounded-2xl text-xs font-bold text-white transition shadow-md cursor-pointer"
                    style={{ backgroundColor: isFree ? 'var(--color-primary, #E05638)' : '#65a30d' }}
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
