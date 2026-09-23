'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Settings,
  ShieldCheck,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  UserCheck,
  Sliders,
  DollarSign,
  Tag,
  Gift
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface WalletConfig {
  is_enabled: boolean;
  currency: string;
  min_topup: number;
  max_topup: number;
  preset_amounts: number[];
  bonus_rules: Array<{ threshold: number; bonus_percent: number }>;
  allowed_gateways: string[];
  allow_site_purchases: boolean;
}

interface WalletTx {
  id: string;
  user_email: string;
  type: string;
  amount: number;
  balance_after: number;
  gateway: string;
  gateway_tx_id?: string;
  status: string;
  description: string;
  created_at: string;
}

interface AppUser {
  id: string;
  email: string;
  name?: string;
  wallet_balance?: number;
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
];

export default function AdminWalletSettingsPage() {
  const langContext = useTranslation();
  const translate = langContext?.t;
  const t = useCallback((key: string, fallback?: string) => {
    if (typeof translate === 'function') {
      const val = translate(key, fallback);
      if (val && val !== key) return val;
    }
    return fallback || '';
  }, [translate]);

  const [activeTab, setActiveTab] = useState<'settings' | 'ledger'>('settings');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [config, setConfig] = useState<WalletConfig>({
    is_enabled: true,
    currency: 'USD',
    min_topup: 5.00,
    max_topup: 1000.00,
    preset_amounts: [10, 25, 50, 100, 250],
    bonus_rules: [
      { threshold: 50, bonus_percent: 5 },
      { threshold: 100, bonus_percent: 10 }
    ],
    allowed_gateways: ['stripe', 'paypal', 'manual'],
    allow_site_purchases: true,
  });

  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [presetInput, setPresetInput] = useState('10, 25, 50, 100, 250');

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjEmail, setAdjEmail] = useState('');
  const [adjAmount, setAdjAmount] = useState<number>(10);
  const [adjReason, setAdjReason] = useState('Promotional deposit credit');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  const activeCurrencySymbol = useMemo(() => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === config.currency);
    return found ? found.symbol : '$';
  }, [config.currency]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet-settings?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.settings) {
          setConfig({
            ...data.settings,
            min_topup: parseFloat(data.settings.min_topup || 5),
            max_topup: parseFloat(data.settings.max_topup || 1000),
          });
          if (Array.isArray(data.settings.preset_amounts)) {
            setPresetInput(data.settings.preset_amounts.join(', '));
          }
        }
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.users)) setUsers(data.users);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to load wallet configuration.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const parsedPresets = presetInput
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const payload = {
      action: 'save_settings',
      ...config,
      preset_amounts: parsedPresets,
    };

    try {
      const res = await fetch('/api/admin/wallet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Wallet settings saved successfully!' });
        window.dispatchEvent(new Event('zecratary_wallet_settings_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Network error while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmail) return;
    setIsSubmittingAdj(true);
    try {
      const res = await fetch('/api/admin/wallet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_adjustment',
          user_email: adjEmail,
          amount: adjAmount,
          reason: adjReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: `Successfully adjusted balance for ${adjEmail}.` });
        setShowAdjModal(false);
        fetchData();
        window.dispatchEvent(new Event('zecratary_wallet_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Adjustment failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error executing adjustment.' });
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const toggleGateway = (gw: string) => {
    setConfig((prev) => {
      const exists = prev.allowed_gateways.includes(gw);
      return {
        ...prev,
        allowed_gateways: exists
          ? prev.allowed_gateways.filter((g) => g !== gw)
          : [...prev.allowed_gateways, gw],
      };
    });
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.user_email.toLowerCase().includes(q) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.gateway && tx.gateway.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery]);

  return (
    <div
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text, #ffffff)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-card,#1e293b)] p-6 rounded-2xl border border-[var(--color-border,#334155)] shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
            <Wallet className="w-8 h-8 text-[var(--color-primary,#3b82f6)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('walletSettingsTitle') || 'Wallet Settings & Balance Engine'}
            </h1>
            <p className="text-sm opacity-70 mt-0.5">
              {t('walletSettingsSubtitle') || 'Configure top-up limits, payment gateways, promotional bonuses, and customer store credit.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setAdjEmail(users[0]?.email || '');
              setShowAdjModal(true);
            }}
            className="px-4 py-2.5 bg-primary hover:opacity-90 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
          >
            <Plus className="w-4 h-4" />
            {t('adjustBalance') || 'Credit / Adjust Balance'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[var(--color-border,#334155)] hover:bg-[var(--color-inner-dark,#0f172a)] transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border,#334155)] gap-3 text-sm font-medium">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-3 flex items-center gap-2 transition-all relative cursor-pointer ${
            activeTab === 'settings'
              ? 'text-primary font-semibold border-b-2 border-[var(--color-primary,#3b82f6)]'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          {t('walletConfig') || 'Configuration & Rules'}
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 flex items-center gap-2 transition-all relative cursor-pointer ${
            activeTab === 'ledger'
              ? 'text-primary font-semibold border-b-2 border-[var(--color-primary,#3b82f6)]'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          {t('walletLedger') || 'Wallet Transactions Ledger'}
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-[var(--color-inner-dark,#0f172a)] border border-[var(--color-border,#334155)]">
            {transactions.length}
          </span>
        </button>
      </div>

      {activeTab === 'settings' ? (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section 1: Core System Parameters */}
          <div className="bg-[var(--color-card,#1e293b)] p-6 rounded-2xl border border-[var(--color-border,#334155)] space-y-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t('coreParameters') || 'General Wallet Controls'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enable Wallet Toggle */}
              <div className="p-4 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{t('enableWallet') || 'Enable Wallet System'}</div>
                  <div className="text-xs opacity-60 mt-0.5">{t('enableWalletDesc') || 'Allow customers to top up and hold on-site balance.'}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.is_enabled}
                    onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary,#3b82f6)]"></div>
                </label>
              </div>

              {/* Allow Site Purchases Toggle */}
              <div className="p-4 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{t('allowSitePurchases') || 'Allow Balance for Purchases'}</div>
                  <div className="text-xs opacity-60 mt-0.5">{t('allowSitePurchasesDesc') || 'Permit wallet balance to pay for platform items & recipes.'}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.allow_site_purchases}
                    onChange={(e) => setConfig({ ...config, allow_site_purchases: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary,#3b82f6)]"></div>
                </label>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2">
                  {t('currency') || 'Wallet Currency'}
                </label>
                <select
                  value={config.currency}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets Input */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2">
                  {t('presetTopups') || 'Quick Top-Up Presets (Comma Separated)'}
                </label>
                <input
                  type="text"
                  value={presetInput}
                  onChange={(e) => setPresetInput(e.target.value)}
                  placeholder="10, 25, 50, 100, 250"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Minimum Top-Up */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2">
                  {t('minTopUp') || 'Minimum Top-Up Amount'} ({activeCurrencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={config.min_topup}
                  onChange={(e) => setConfig({ ...config, min_topup: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Maximum Top-Up */}
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2">
                  {t('maxTopUp') || 'Maximum Single Top-Up Cap'} ({activeCurrencySymbol})
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={config.max_topup}
                  onChange={(e) => setConfig({ ...config, max_topup: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Gateways & Deposit Incentives */}
          <div className="bg-[var(--color-card,#1e293b)] p-6 rounded-2xl border border-[var(--color-border,#334155)] space-y-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-primary" />
              {t('gatewaysAndIncentives') || 'Authorized Payment Gateways & Bonus Rules'}
            </h2>

            {/* Gateway checkboxes */}
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-3">
                {t('allowedGateways') || 'Accepted Top-Up Gateways'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'stripe', label: 'Stripe Gateway' },
                  { id: 'paypal', label: 'PayPal Gateway' },
                  { id: 'manual', label: 'Manual Settlement / Bank Wire' },
                ].map((gw) => {
                  const active = config.allowed_gateways.includes(gw.id);
                  return (
                    <div
                      key={gw.id}
                      onClick={() => toggleGateway(gw.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all select-none ${
                        active
                          ? 'border-[var(--color-primary,#3b82f6)] bg-primary/10'
                          : 'border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] opacity-60'
                      }`}
                    >
                      <span className="text-sm font-medium">{gw.label}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          active ? 'bg-[var(--color-primary,#3b82f6)] border-primary' : 'border-gray-500'
                        }`}
                      >
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bonus Rules */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold uppercase opacity-70">
                  {t('promotionalBonuses') || 'Top-Up Bonus Incentives (Tiered Credit Rewards)'}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      bonus_rules: [...config.bonus_rules, { threshold: 150, bonus_percent: 15 }],
                    })
                  }
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addBonusTier') || 'Add Bonus Tier'}
                </button>
              </div>

              <div className="space-y-3">
                {config.bonus_rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] flex flex-wrap items-center gap-4 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-emerald-400" />
                      <span className="opacity-70 text-xs">Deposit ≥</span>
                      <input
                        type="number"
                        min="1"
                        value={rule.threshold}
                        onChange={(e) => {
                          const updated = [...config.bonus_rules];
                          updated[idx].threshold = parseFloat(e.target.value) || 0;
                          setConfig({ ...config, bonus_rules: updated });
                        }}
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-card,#1e293b)] text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-70 text-xs">Give Bonus %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.bonus_percent}
                        onChange={(e) => {
                          const updated = [...config.bonus_rules];
                          updated[idx].bonus_percent = parseFloat(e.target.value) || 0;
                          setConfig({ ...config, bonus_rules: updated });
                        }}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-card,#1e293b)] text-xs focus:outline-none"
                      />
                      <span className="text-xs opacity-60">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.bonus_rules.filter((_, i) => i !== idx);
                        setConfig({ ...config, bonus_rules: updated });
                      }}
                      className="ml-auto text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      {t('remove') || 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary hover:opacity-90 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('saveWalletSettings') || 'Save Wallet Configurations'}
            </button>
          </div>
        </form>
      ) : (
        /* Section: Wallet Transactions Ledger */
        <div className="bg-[var(--color-card,#1e293b)] p-6 rounded-2xl border border-[var(--color-border,#334155)] space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                placeholder={t('searchTransactions') || 'Search by email or description...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="text-xs opacity-60 self-center">
              {t('showingTotal') || 'Showing'} {filteredTransactions.length} {t('records') || 'transactions'}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-border,#334155)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-inner-dark,#0f172a)] border-b border-[var(--color-border,#334155)] text-xs uppercase opacity-70">
                <tr>
                  <th className="py-3 px-4">{t('customer') || 'Customer'}</th>
                  <th className="py-3 px-4">{t('type') || 'Type'}</th>
                  <th className="py-3 px-4">{t('amount') || 'Amount'}</th>
                  <th className="py-3 px-4">{t('balanceAfter') || 'Balance After'}</th>
                  <th className="py-3 px-4">{t('gateway') || 'Gateway'}</th>
                  <th className="py-3 px-4">{t('description') || 'Description'}</th>
                  <th className="py-3 px-4">{t('date') || 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border,#334155)]">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm opacity-50">
                      {t('noWalletTransactions') || 'No wallet transactions recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--color-inner-dark,#0f172a)]/40 transition-colors">
                      <td className="py-3 px-4 font-medium">{tx.user_email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">
                        +{activeCurrencySymbol}{parseFloat(tx.amount as any || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 opacity-80">
                        {activeCurrencySymbol}{parseFloat(tx.balance_after as any || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 uppercase text-xs opacity-75">{tx.gateway || 'Manual'}</td>
                      <td className="py-3 px-4 text-xs opacity-80 max-w-xs truncate">{tx.description}</td>
                      <td className="py-3 px-4 text-xs opacity-60">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-card,#1e293b)] max-w-md w-full p-6 rounded-2xl border border-[var(--color-border,#334155)] shadow-2xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {t('adjustWalletModal') || 'Manual Balance Adjustment'}
            </h3>
            <p className="text-xs opacity-70">
              {t('adjustWalletDesc') || 'Directly credit or debit a user wallet balance with full audit ledger tracking in PostgreSQL.'}
            </p>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-1">
                  {t('selectCustomer') || 'Target User'}
                </label>
                <select
                  value={adjEmail}
                  onChange={(e) => setAdjEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none cursor-pointer"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name ? `${u.name} (${u.email})` : u.email} — Balance: {activeCurrencySymbol}{parseFloat(u.wallet_balance as any || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-1">
                  {t('adjustmentAmount') || 'Amount (+ to credit, - to debit)'} ({activeCurrencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-1">
                  {t('reason') || 'Audit Memo / Reason'}
                </label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Promotional courtesy credit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-inner-dark,#0f172a)] text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border,#334155)] text-sm hover:bg-[var(--color-inner-dark,#0f172a)] cursor-pointer"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
                >
                  {isSubmittingAdj ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {t('applyAdjustment') || 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
