'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Check, Trash2, Edit3, Sparkles, 
  RefreshCw, CheckCircle2, AlertCircle, Shield, 
  Coins, Zap, Eye, Save, Layers, ArrowRight
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

export default function AdminPlansPage() {
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [previewInterval, setPreviewInterval] = useState<'MONTH' | 'YEAR'>('MONTH');

  // Token Identity from Settings
  const [tokenSymbol, setTokenSymbol] = useState('🪙');
  const [tokenName, setTokenName] = useState('Tokens');

  // Plan Form State
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

  // Sync token settings identity
  useEffect(() => {
    fetch('/api/admin/token-settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          if (data.settings.tokenSymbol) setTokenSymbol(data.settings.tokenSymbol);
          if (data.settings.tokenName) setTokenName(data.settings.tokenName);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.configs)) {
        setPlans(data.configs);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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
    setEditingId(p.id);
    setName(p.name);
    setSlug(p.slug);
    setPlanGroupId(p.planGroupId || `group_${p.slug}`);
    setMonthlyPlanId(p.monthlyPlanId || `plan_${p.slug}_monthly`);
    setAnnualPlanId(p.annualPlanId || `plan_${p.slug}_annual`);
    setMonthlyPrice(p.monthlyPriceDollars);
    setAnnualPrice(p.annualPriceDollars);
    setTokenLimit(p.tokenLimit ?? 500);
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

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const parsedFeatures = featuresText.split('\n').map(s => s.trim()).filter(Boolean);
      const payload = {
        id: editingId || slug || `plan_${Date.now()}`,
        name,
        slug,
        planGroupId,
        monthlyPlanId,
        annualPlanId,
        monthlyPriceDollars: Number(monthlyPrice),
        annualPriceDollars: Number(annualPrice),
        tokenLimit: Number(tokenLimit),
        monthlyBadge,
        annualBadge,
        trialBadge,
        descriptionMonthly,
        descriptionAnnual,
        features: parsedFeatures,
        isFree
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
      fetchPlans();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_plans_updated'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

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

      setPlans(prev => prev.filter(item => item.id !== p.id && item.slug !== p.slug));

      if (editingId === p.id || editingId === p.slug) {
        resetForm();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_plans_updated'));
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
              className="p-1.5 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <Zap className="h-6 w-6 text-orange-400" /> {t('adminPlansTitle', 'Subscription Plans & Token Allocations')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('adminPlansSubtitle', 'Configure subscription intervals, group identifiers, and automated AI token purchase grants.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/token-setting"
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" /> {t('viewTokenTransactions', 'Token Transactions Ledger')}
          </Link>
        </div>
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

      {/* Main Grid: Editor & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Plan Configuration Form */}
        <form 
          onSubmit={handleSavePlan}
          className="lg:col-span-7 border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Edit3 className="h-4 w-4 text-orange-400" />
              <span>{editingId ? t('editPlanHeader', 'Edit Subscription Plan') : t('createNewPlanHeader', 'Create New Plan')}</span>
            </h2>
            {editingId && (
              <div className="flex items-center gap-3">
                {editingId !== 'preset_taster' && slug !== 'taster' && (
                  <button
                    type="button"
                    disabled={deletingId === editingId}
                    onClick={() => {
                      const matched = plans.find(p => p.id === editingId || p.slug === editingId);
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
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer font-bold transition"
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
                {t('monthlyPriceLabel', 'Monthly Price ($ USD)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                {t('annualPriceLabel', 'Annual Price ($ USD)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={annualPrice}
                onChange={(e) => setAnnualPrice(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
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
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>{t('isFreeTierLabel', 'Mark as Free Tier')}</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{editingId ? t('updatePlanBtn', 'Update Plan & Tokens') : t('createPlanBtn', 'Create Plan & Publish')}</span>
            </button>
          </div>
        </form>

        {/* Live Mockup Preview */}
        <div 
          className="lg:col-span-5 border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200 flex flex-col justify-between"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-black" style={{ color: 'var(--color-text)' }}>
                  {t('planCardMockup', 'Live Card Mockup')}
                </h3>
              </div>
              <div className="flex p-0.5 rounded-lg border text-[10px] font-bold" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setPreviewInterval('MONTH')}
                  className={`px-2 py-1 rounded-md transition ${previewInterval === 'MONTH' ? 'bg-primary text-white' : 'text-slate-400'}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInterval('YEAR')}
                  className={`px-2 py-1 rounded-md transition ${previewInterval === 'YEAR' ? 'bg-primary text-white' : 'text-slate-400'}`}
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
                  <p className="text-[10px] font-mono text-slate-400">
                    ID: {previewInterval === 'MONTH' ? (monthlyPlanId || 'plan_monthly') : (annualPlanId || 'plan_annual')}
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {previewInterval === 'MONTH' ? (monthlyBadge || 'Monthly') : (annualBadge || 'Annual')}
                </span>
              </div>

              {/* Price & Token Allowance Display */}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black" style={{ color: 'var(--color-text)' }}>
                  ${previewInterval === 'MONTH' ? monthlyPrice.toFixed(2) : annualPrice.toFixed(2)}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  /{previewInterval === 'MONTH' ? 'mo' : 'yr'}
                </span>
              </div>

              {/* Token Allocation Badge in Card */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                <Coins className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  <span>+{tokenLimit.toLocaleString()} {tokenSymbol}</span>{' '}
                  <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('creditedUponPurchase', 'credited instantly on purchase')}
                  </span>
                </div>
              </div>

              {/* Features snippet */}
              <ul className="space-y-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {featuresText.split('\n').slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-2 border-t text-[11px] flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Parent Group: {planGroupId || 'None'}</span>
            <span className="font-mono text-emerald-400 font-bold">PostgreSQL Synced</span>
          </div>
        </div>
      </div>

      {/* System Plans List with Token Badges & Actions */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('publishedPlansTable', 'Configured Subscription Plans in PostgreSQL')}
            </h2>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--color-border)' }}>
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
                  <td colSpan={5} className="p-8 text-center text-xs font-bold text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2 text-primary" /> Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
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
                        <div className="text-[10px] font-mono text-slate-400">{p.slug}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5 text-[10px] font-mono">
                          <div className="text-blue-400">M: {p.monthlyPlanId || `plan_${p.slug}_monthly`}</div>
                          <div className="text-purple-400">A: {p.annualPlanId || `plan_${p.slug}_annual`}</div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        {p.isFree ? (
                          <span className="text-emerald-400 font-bold">Free</span>
                        ) : (
                          <div>
                            <div>${p.monthlyPriceDollars.toFixed(2)}/mo</div>
                            <div className="text-slate-400 text-[10px]">${p.annualPriceDollars.toFixed(2)}/yr</div>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                          <Coins className="h-3 w-3" /> +{(p.tokenLimit ?? 500).toLocaleString()} {tokenSymbol}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:opacity-80 cursor-pointer flex items-center gap-1"
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
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-red-950/20 text-red-400 border-red-900/40 hover:text-red-300 cursor-pointer disabled:opacity-50 flex items-center gap-1"
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
  );
}
