'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Coins, Sparkles, Plus, Trash2, Save, ArrowLeft,
  CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, 
  ChefHat, DownloadCloud, FileText, Camera, Tag, DollarSign
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
}

interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  monthly_tokens?: number;
}

export default function AdminTokenSettingPage() {
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Token General Settings
  const [tokenName, setTokenName] = useState('Foodie Token');
  const [tokenSymbol, setTokenSymbol] = useState('🪙');
  const [isEnabled, setIsEnabled] = useState(true);

  // Per Feature Costs
  const [chefCost, setChefCost] = useState(1);
  const [importUrlCost, setImportUrlCost] = useState(2);
  const [importTextCost, setImportTextCost] = useState(1);
  const [importPhotoCost, setImportPhotoCost] = useState(3);

  // Packages
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  
  // Subscription Plan Monthly Tokens
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planAllocations, setPlanAllocations] = useState<{ [slug: string]: number }>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/token-settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setTokenName(data.settings.tokenName || 'Foodie Token');
        setTokenSymbol(data.settings.tokenSymbol || '🪙');
        setIsEnabled(data.settings.isEnabled ?? true);
        setChefCost(data.settings.chefCost ?? 1);
        setImportUrlCost(data.settings.importUrlCost ?? 2);
        setImportTextCost(data.settings.importTextCost ?? 1);
        setImportPhotoCost(data.settings.importPhotoCost ?? 3);
        setPackages(data.settings.packages || []);
      }
      if (data.plans) {
        setPlans(data.plans);
        const map: { [slug: string]: number } = {};
        data.plans.forEach((p: SubscriptionPlan) => {
          map[p.slug] = p.monthly_tokens ?? (p.slug.includes('pro') ? 500 : 50);
        });
        setPlanAllocations(map);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch token settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/token-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenName,
          tokenSymbol,
          chefCost: Number(chefCost),
          importUrlCost: Number(importUrlCost),
          importTextCost: Number(importTextCost),
          importPhotoCost: Number(importPhotoCost),
          isEnabled,
          packages,
          planAllocations
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed saving token configurations');
      }

      setSuccessMsg(t('tokenSettingsSavedSuccess', 'Token configuration saved and synchronized with PostgreSQL!'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPackage = () => {
    const newPkg: TokenPackage = {
      id: 'pkg_' + Date.now().toString(36),
      name: 'Custom Package',
      tokens: 250,
      price: 9.99,
      badge: 'Special',
      isPopular: false
    };
    setPackages([...packages, newPkg]);
  };

  const handleRemovePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const handlePackageChange = (id: string, field: keyof TokenPackage, value: any) => {
    setPackages(packages.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen p-8 flex items-center justify-center font-sans transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <span className="text-xs font-bold">{t('loadingTokenSettings', 'Loading Token Settings...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6 pt-4 font-sans transition-colors duration-200 min-h-screen"
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
              <Coins className="h-6 w-6 text-amber-500" /> {t('adminTokenSettingTitle', 'Token System Management')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('adminTokenSettingSubtitle', 'Configure custom token name, symbol, feature consumption costs (/chef & /import), and user purchase packages.')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> {t('saving', 'Saving to PostgreSQL...')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {t('saveTokenSettingsBtn', 'Save Configurations')}
            </>
          )}
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

      {/* Section 1: Token Identity & System Status */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('tokenIdentityHeading', 'Token Currency Identity & Master Toggle')}
            </h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <span style={{ color: isEnabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
              {isEnabled ? t('tokenSystemActive', 'System Active') : t('tokenSystemDisabled', 'Bypass Consumption')}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              {t('tokenNameLabel', 'Token Name')}
            </label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="e.g. Foodie Token, Zecra Coin"
              className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              {t('tokenSymbolLabel', 'Token Symbol / Emoji')}
            </label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="e.g. 🪙, CRD, TK"
              className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Usage / Feature Costs */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <Sparkles className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
            {t('featureUsagePricingHeading', 'Feature Usage Consumption Costs (/chef & /import)')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chef Chat Cost */}
          <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/chef (AI Chat)</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('chefCostDesc', 'Tokens deducted per generated response.')}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="number"
                min="0"
                value={chefCost}
                onChange={(e) => setChefCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
            </div>
          </div>

          {/* Import URL Cost */}
          <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <DownloadCloud className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/import (URL)</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('importUrlCostDesc', 'Tokens deducted per recipe scraped from link.')}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="number"
                min="0"
                value={importUrlCost}
                onChange={(e) => setImportUrlCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
            </div>
          </div>

          {/* Import Text Cost */}
          <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/import (Raw Text)</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('importTextCostDesc', 'Tokens deducted per recipe parsed from text.')}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="number"
                min="0"
                value={importTextCost}
                onChange={(e) => setImportTextCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
            </div>
          </div>

          {/* Import Photo Cost */}
          <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>/import (Photo OCR)</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('importPhotoCostDesc', 'Tokens deducted for Vision OCR recipe imports.')}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="number"
                min="0"
                value={importPhotoCost}
                onChange={(e) => setImportPhotoCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <span className="text-xs font-bold text-amber-500">{tokenSymbol}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Token Purchase Packages */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('tokenPackagesHeading', 'User Purchasable Token Packages')}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAddPackage}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', borderColor: 'transparent' }}
          >
            <Plus className="h-3.5 w-3.5" /> {t('addPackageBtn', 'Add Package')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg, idx) => (
            <div 
              key={pkg.id} 
              className="border rounded-2xl p-4 space-y-3 relative shadow-md transition"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  {t('packageNumber', 'Bundle')} #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePackage(pkg.id)}
                  className="text-red-400 hover:text-red-500 p-1 transition cursor-pointer"
                  title="Remove Package"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('packageNameLabel', 'Package Name')}
                </label>
                <input
                  type="text"
                  value={pkg.name}
                  onChange={(e) => handlePackageChange(pkg.id, 'name', e.target.value)}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('packageTokensLabel', 'Tokens Granted')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pkg.tokens}
                    onChange={(e) => handlePackageChange(pkg.id, 'tokens', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('packagePriceLabel', 'Price ($ USD)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pkg.price}
                    onChange={(e) => handlePackageChange(pkg.id, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('packageBadgeLabel', 'Badge Label (Optional)')}
                </label>
                <input
                  type="text"
                  value={pkg.badge || ''}
                  onChange={(e) => handlePackageChange(pkg.id, 'badge', e.target.value)}
                  placeholder="e.g. Popular, Best Value"
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Subscription Plan Monthly Grants */}
      <div 
        className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <Layers className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
            {t('planMonthlyGrantsHeading', 'Subscription Plan Monthly Included Tokens')}
          </h2>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('planMonthlyGrantsSubtitle', 'Subscribers automatically receive these tokens every recurring monthly billing cycle.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div 
              key={p.slug}
              className="p-4 rounded-2xl border space-y-2"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{p.name || p.slug}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/10" style={{ borderColor: 'var(--color-border)' }}>
                  {p.slug}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="0"
                  value={planAllocations[p.slug] ?? 50}
                  onChange={(e) => setPlanAllocations({ ...planAllocations, [p.slug]: parseInt(e.target.value) || 0 })}
                  className="w-24 border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs font-bold text-amber-500">{tokenSymbol} / month</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
