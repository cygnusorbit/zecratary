import DynamicTokenIcon from '@/components/DynamicTokenIcon';
// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  CreditCard,
  Database,
  Edit3,
  Flame,
  Globe,
  History,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

export interface TokenPackage {
  id: string;
  name: string;
  tokenAmount: number;
  priceDollars: number;
  badge?: string;
  bonusTokens?: number;
  isPopular?: boolean;
}

export interface TokenSettings {
  tokenName: string;
  tokenSymbol: string;
  startingBalance: number;
  isEnabled: boolean;
  importUrlCost: number;
  importTextCost: number;
  importPhotoCost: number;
  aiChefCost: number;
  mealPlannerCost: number;
  macroAnalysisCost: number;
  packages: TokenPackage[];
}

export interface TokenTransactionRecord {
  id: string;
  customer_email: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  created_at: string;
}

const DEFAULT_TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'pkg_starter', name: 'Starter Spark', tokenAmount: 250, priceDollars: 4.99, badge: 'Popular', bonusTokens: 0, isPopular: true },
  { id: 'pkg_chef', name: 'Culinary Master', tokenAmount: 1000, priceDollars: 14.99, badge: 'Best Value', bonusTokens: 150, isPopular: false },
  { id: 'pkg_executive', name: 'Kitchen Enterprise', tokenAmount: 5000, priceDollars: 49.99, badge: 'VIP', bonusTokens: 1000, isPopular: false }
];

const DEFAULT_SETTINGS: TokenSettings = {
  tokenName: 'Foodie Token',
  tokenSymbol: '🪙',
  startingBalance: 100,
  isEnabled: true,
  importUrlCost: 5,
  importTextCost: 2,
  importPhotoCost: 10,
  aiChefCost: 2,
  mealPlannerCost: 5,
  macroAnalysisCost: 3,
  packages: DEFAULT_TOKEN_PACKAGES
};

export default function AdminTokenSettingPage() {
  const { t, locale } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [activeTab, setActiveTab] = useState<'system' | 'packages' | 'ledger'>('system');
  const [settings, setSettings] = useState<TokenSettings>(DEFAULT_SETTINGS);
  const [transactions, setTransactions] = useState<TokenTransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Package editing state
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('New Chef Bundle');
  const [pkgTokens, setPkgTokens] = useState<number>(500);
  const [pkgPrice, setPkgPrice] = useState<number>(7.99);
  const [pkgBadge, setPkgBadge] = useState('Hot');
  const [pkgBonus, setPkgBonus] = useState<number>(50);

  const isFetchingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch Token Settings and Audit Ledger
  const loadTokenData = useCallback(async () => {
    if (isFetchingRef.current || isSavingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/token-setting?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.tokenSettings || data.settings) {
          const loaded = data.tokenSettings || data.settings;
          setSettings({
            tokenName: loaded.tokenName || 'Foodie Token',
            tokenSymbol: loaded.tokenSymbol || '🪙',
            startingBalance: loaded.startingBalance !== undefined ? loaded.startingBalance : 100,
            isEnabled: loaded.isEnabled !== undefined ? Boolean(loaded.isEnabled) : true,
            importUrlCost: loaded.importUrlCost !== undefined ? loaded.importUrlCost : 5,
            importTextCost: loaded.importTextCost !== undefined ? loaded.importTextCost : 2,
            importPhotoCost: loaded.importPhotoCost !== undefined ? loaded.importPhotoCost : 10,
            aiChefCost: loaded.aiChefCost !== undefined ? loaded.aiChefCost : 2,
            mealPlannerCost: loaded.mealPlannerCost !== undefined ? loaded.mealPlannerCost : 5,
            macroAnalysisCost: loaded.macroAnalysisCost !== undefined ? loaded.macroAnalysisCost : 3,
            packages: Array.isArray(loaded.packages) && loaded.packages.length > 0 ? loaded.packages : DEFAULT_TOKEN_PACKAGES
          });
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.warn('[Token Setting] Using local configuration defaults:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    document.title = `${tr('tokenSettingDocTitle', 'Token Settings - Admin Console')}`;
    loadTokenData();

    const handleSync = () => loadTokenData();
    window.addEventListener('zecratary_tokens_updated', handleSync);
    window.addEventListener('zecratary_token_settings_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_tokens_updated', handleSync);
      window.removeEventListener('zecratary_token_settings_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadTokenData, tr]);

  // Save Settings to Database & Server File
  const handleSaveSettings = async () => {
    if (saving || isSavingRef.current) return;
    setSaving(true);
    isSavingRef.current = true;
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/token-setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenSettings: settings })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_tokens_updated'));
          window.dispatchEvent(new Event('zecratary_token_settings_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
          localStorage.setItem('zecratary_tokens_updated_at', Date.now().toString());
        }
        showToast('success', tr('toastTokenSettingsSaved', 'Token configurations saved and synchronized with PostgreSQL & MySQL!'));
      } else {
        throw new Error(data.error || 'Failed to save token settings.');
      }
    } catch (err: any) {
      showToast('error', err.message || tr('toastTokenSettingsError', 'Failed to save token settings. Please try again.'));
    } finally {
      setSaving(false);
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset token settings to platform defaults?')) return;
    setSettings(DEFAULT_SETTINGS);
    showToast('success', tr('toastTokenSettingsReset', 'Token settings reset to defaults successfully!'));
  };

  // Package Management Handlers
  const handleAddPackage = () => {
    const newPkg: TokenPackage = {
      id: 'pkg_' + Date.now().toString(36),
      name: pkgName.trim() || 'Custom Bundle',
      tokenAmount: Math.max(1, parseInt(pkgTokens, 10) || 500),
      priceDollars: Math.max(0.01, parseFloat(pkgPrice) || 5.99),
      badge: pkgBadge.trim() || undefined,
      bonusTokens: parseInt(pkgBonus, 10) || 0,
      isPopular: false
    };

    setSettings(prev => ({
      ...prev,
      packages: [...prev.packages, newPkg]
    }));

    setEditingPkgId(null);
    showToast('success', `Added package "${newPkg.name}".`);
  };

  const handleUpdatePackage = (pkgId: string) => {
    setSettings(prev => ({
      ...prev,
      packages: prev.packages.map(p => p.id === pkgId ? {
        ...p,
        name: pkgName.trim(),
        tokenAmount: Math.max(1, parseInt(pkgTokens, 10) || p.tokenAmount),
        priceDollars: Math.max(0.01, parseFloat(pkgPrice) || p.priceDollars),
        badge: pkgBadge.trim() || undefined,
        bonusTokens: parseInt(pkgBonus, 10) || 0
      } : p)
    }));

    setEditingPkgId(null);
    showToast('success', `Updated package "${pkgName}".`);
  };

  const handleDeletePackage = (pkgId: string) => {
    if (settings.packages.length <= 1) {
      alert('You must keep at least one token package active.');
      return;
    }
    setSettings(prev => ({
      ...prev,
      packages: prev.packages.filter(p => p.id !== pkgId)
    }));
  };

  const handleStartEdit = (pkg: TokenPackage) => {
    setEditingPkgId(pkg.id);
    setPkgName(pkg.name);
    setPkgTokens(pkg.tokenAmount);
    setPkgPrice(pkg.priceDollars);
    setPkgBadge(pkg.badge || '');
    setPkgBonus(pkg.bonusTokens || 0);
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. Header & Quick Actions */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Coins className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            {tr('tokenSettingTitle', 'Token System & Economy Configuration')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('tokenSettingSubtitle', 'Configure platform token economy, feature consumption costs, purchasable token packages, and initial user balances.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>{tr('syncStatusPostgres', 'Synced with PostgreSQL & MySQL')}</span>
          </div>

          <button
            type="button"
            onClick={loadTokenData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{tr('btnReload', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span>{tr('btnResetDefaults', 'Reset Defaults')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? tr('btnSaving', 'Saving...') : tr('btnSaveTokenSettings', 'Save Configurations')}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-sm animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
            color: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Workspace Sub-Tabs */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        {[
          { id: 'system', label: tr('tabTokenSystem', 'Economy & Feature Costs'), icon: Sliders },
          { id: 'packages', label: tr('tabTokenPackages', 'Purchasable Packages'), icon: CreditCard },
          { id: 'ledger', label: tr('tabTokenLedger', 'Token Audit Ledger'), icon: History }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              style={isActive ? {
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderWidth: '1px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              } : { color: 'var(--color-text-secondary)' }}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SYSTEM IDENTITY & CONSUMPTION COSTS */}
      {activeTab === 'system' && (
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-6"
        >
          {/* Master Bypass Switch */}
          <div 
            className="p-5 rounded-3xl border shadow-sm transition-colors duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('tokenMasterSwitchTitle', 'Token Consumption Master Switch')}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('tokenMasterSwitchDesc', 'When Free Mode is active, all recipe generation, imports, and meal planners operate without deducting tokens.')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs shrink-0"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: settings.isEnabled ? 'var(--color-emerald, #10b981)' : '#f59e0b',
                color: settings.isEnabled ? 'var(--color-emerald, #10b981)' : '#fbbf24'
              }}
            >
              {settings.isEnabled 
                ? tr('tokenMasterSwitchActive', 'System Active (Enforce Consumption)') 
                : tr('tokenMasterSwitchFree', 'Free Token Mode (Bypass Consumption)')}
            </button>
          </div>

          {/* Token Identity Section */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('tokenIdentityHeading', 'Token Identity & Starting Quota')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('tokenIdentityDesc', 'Customize the public currency name, display symbol, and initial registration balance.')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('tokenNameLabel', 'Token Name')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={settings.tokenName}
                  onChange={(e) => setSettings({ ...settings, tokenName: e.target.value })}
                  placeholder={tr('tokenNamePlaceholder', 'e.g. Foodie Token')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('tokenSymbolLabel', 'Token Symbol / Emoji')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  maxLength={4}
                  value={settings.tokenSymbol}
                  onChange={(e) => setSettings({ ...settings, tokenSymbol: e.target.value })}
                  placeholder={tr('tokenSymbolPlaceholder', 'e.g. 🪙 or 🌟')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-bold text-center"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('startingBalanceLabel', 'New User Starting Balance')}
                </label>
                <input
                  type="number"
                  min="0"
                  autoComplete="off"
                  data-lpignore="true"
                  value={settings.startingBalance}
                  onChange={(e) => setSettings({ ...settings, startingBalance: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('startingBalanceHelp', 'Initial tokens granted upon new user account creation.')}
                </span>
              </div>
            </div>
          </div>

          {/* Feature Consumption Costs Section */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Activity className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('featureCostsHeading', 'Feature Action Token Costs')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('featureCostsDesc', 'Define token consumption amounts for AI assistance, scrapers, and nutritional telemetry.')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              {[
                { key: 'aiChefCost', label: tr('costAiChefLabel', 'AI Chef Recipe Generation'), val: settings.aiChefCost },
                { key: 'importUrlCost', label: tr('costImportUrlLabel', 'URL Recipe Scraper Import'), val: settings.importUrlCost },
                { key: 'importTextCost', label: tr('costImportTextLabel', 'Raw Text Recipe Import'), val: settings.importTextCost },
                { key: 'importPhotoCost', label: tr('costImportPhotoLabel', 'Photo / OCR Recipe Import'), val: settings.importPhotoCost },
                { key: 'mealPlannerCost', label: tr('costMealPlannerLabel', 'Weekly Meal Plan Generation'), val: settings.mealPlannerCost },
                { key: 'macroAnalysisCost', label: tr('costMacroAnalysisLabel', 'Nutritional Macro Analysis'), val: settings.macroAnalysisCost }
              ].map(action => (
                <div 
                  key={action.key}
                  className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <div className="font-sans font-bold" style={{ color: 'var(--color-text)' }}>
                    {action.label}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      autoComplete="off"
                      data-lpignore="true"
                      value={action.val}
                      onChange={(e) => setSettings({
                        ...settings,
                        [action.key]: Math.max(0, parseInt(e.target.value, 10) || 0)
                      })}
                      className="w-16 px-2.5 py-1.5 rounded-lg border font-mono font-bold text-center outline-none"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                    <span className="font-bold">{settings.tokenSymbol}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER PURCHASABLE TOKEN PACKAGES */}
      {activeTab === 'packages' && (
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-6"
        >
          {/* Bundle Creator / Editor Card */}
          <div 
            className="p-6 rounded-3xl border shadow-sm space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <CreditCard className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {editingPkgId ? 'Edit Token Bundle' : tr('packagesHeading', 'User Purchasable Token Packages')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('packagesDesc', 'Manage bundles available for on-demand top-up on /token and the navigation top bar.')}
                </p>
              </div>

              {editingPkgId && (
                <button
                  type="button"
                  onClick={() => setEditingPkgId(null)}
                  className="text-xs font-bold underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('packageNameLabel', 'Package Name')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="e.g. Starter Spark"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('packageTokensLabel', 'Token Amount')}
                </label>
                <input
                  type="number"
                  min="1"
                  autoComplete="off"
                  data-lpignore="true"
                  value={pkgTokens}
                  onChange={(e) => setPkgTokens(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('packagePriceLabel', 'Price ($)')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  autoComplete="off"
                  data-lpignore="true"
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('packageBadgeLabel', 'Ribbon / Badge')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={pkgBadge}
                  onChange={(e) => setPkgBadge(e.target.value)}
                  placeholder="e.g. Popular, Best Value"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('packageBonusLabel', 'Bonus Tokens')}
                </label>
                <input
                  type="number"
                  min="0"
                  autoComplete="off"
                  data-lpignore="true"
                  value={pkgBonus}
                  onChange={(e) => setPkgBonus(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={editingPkgId ? () => handleUpdatePackage(editingPkgId) : handleAddPackage}
                className="px-5 py-2 text-white font-bold rounded-xl text-xs shadow transition hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus className="h-4 w-4" />
                <span>{editingPkgId ? 'Update Package' : tr('btnAddPackage', '+ Add New Package')}</span>
              </button>
            </div>
          </div>

          {/* Active Bundles Grid & Mockups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {settings.packages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-5 rounded-3xl border shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden transition-colors duration-200"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                {pkg.badge && (
                  <span 
                    className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-white shadow-xs"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {pkg.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
                      ${pkg.priceDollars.toFixed(2)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>/ one-time</span>
                  </div>

                  <div className="mt-3 p-3 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{settings.tokenSymbol}</span>
                      <span className="text-sm font-black font-mono" style={{ color: 'var(--color-text)' }}>
                        +{pkg.tokenAmount.toLocaleString()}
                      </span>
                    </div>
                    {pkg.bonusTokens > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        +{pkg.bonusTokens} Bonus
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(pkg)}
                    className="p-2 rounded-xl border text-xs font-bold transition hover:opacity-80 flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="p-2 rounded-xl border text-red-400 border-red-500/30 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TOKEN AUDIT LEDGER */}
      {activeTab === 'ledger' && (
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <History className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('ledgerHeading', 'Recent Token Transaction Activity')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('ledgerDesc', 'Audit trail of user token consumptions, purchases, and initial registrations.')}
              </p>
            </div>
          </div>

          <div 
            className="border rounded-3xl overflow-hidden shadow-xl transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead 
                  className="border-b uppercase font-bold text-[10px] tracking-wider"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <tr>
                    <th className="px-5 py-4">{tr('colUser', 'Customer')}</th>
                    <th className="px-5 py-4">{tr('colType', 'Transaction Type')}</th>
                    <th className="px-5 py-4">{tr('colAmount', 'Amount')}</th>
                    <th className="px-5 py-4">{tr('colBalanceAfter', 'Balance After')}</th>
                    <th className="px-5 py-4">{tr('colDate', 'Timestamp')}</th>
                    <th className="px-5 py-4">{tr('colDescription', 'Description')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
                        {tr('noLedgerRecords', 'No recent token transactions recorded.')}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const isPositive = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="transition" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-5 py-4 font-mono font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                            {tx.customer_email || 'System User'}
                          </td>

                          <td className="px-5 py-4">
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                borderColor: isPositive ? 'var(--color-emerald, #10b981)' : '#f59e0b',
                                color: isPositive ? 'var(--color-emerald, #10b981)' : '#fbbf24'
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono font-black" style={{ color: isPositive ? 'var(--color-emerald, #10b981)' : '#ef4444' }}>
                            {isPositive ? `+${tx.amount}` : tx.amount} {settings.tokenSymbol}
                          </td>

                          <td className="px-5 py-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                            {tx.balance_after !== undefined ? tx.balance_after : '—'}
                          </td>

                          <td className="px-5 py-4 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(tx.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>

                          <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {tx.description}
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
    </div>
  );
}
