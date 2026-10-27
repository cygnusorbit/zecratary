// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, RefreshCw, 
  Check, Eye, EyeOff, Globe, Zap, Sliders, ShieldCheck, Terminal, 
  ExternalLink, Code2, AlertTriangle, Activity, DownloadCloud, 
  UploadCloud, Sparkles, Landmark, Clock, X, XCircle, Search, 
  Filter, Trash2, Edit3, Copy, CheckCheck, ArrowUpRight
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface ManualSettlementConfig {
  enabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftBic: string;
  instructions: string;
  requireApproval: boolean;
}

interface GatewayConfig {
  currency: string;
  testMode: boolean;
  stripeConnected?: boolean;
  stripeKeysVerified?: boolean;
  stripeWebhookVerified?: boolean;
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
  manualSettlement: ManualSettlementConfig;
}

interface ManualSettlementItem {
  id: string;
  customer_name?: string;
  customer_email?: string;
  plan_name?: string;
  plan_slug?: string;
  amount?: number;
  currency?: string;
  gateway?: string;
  status: string;
  created_at: string;
  transfer_reference?: string;
  notes?: string;
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
  { code: 'THB', label: 'THB - Thai Baht (฿)', symbol: '฿' }
];

export default function AdminPaymentGatewayPage() {
  const { t, locale } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  const [activeTab, setActiveTab] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingEnv, setSyncingEnv] = useState(false);
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const [showStripeGuideModal, setShowStripeGuideModal] = useState(false);
  const [copiedCliKey, setCopiedCliKey] = useState<string | null>(null);
  const [webhookEndpointUrl, setWebhookEndpointUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Manual Settlement Ledger State
  const [settlements, setSettlements] = useState<ManualSettlementItem[]>([]);
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'succeeded' | 'failed'>('all');
  const [settlementSearch, setSettlementSearch] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Authoritative Gateway Configuration State
  const [config, setConfig] = useState<GatewayConfig>({
    currency: 'USD',
    testMode: true,
    stripeConnected: true,
    stripeKeysVerified: true,
    stripeWebhookVerified: false,
    stripe: {
      enabled: true,
      publishableKey: '',
      secretKey: '',
      webhookSecret: ''
    },
    paypal: {
      enabled: true,
      clientId: '',
      clientSecret: '',
      webhookId: '',
      environment: 'sandbox'
    },
    manualSettlement: {
      enabled: true,
      bankName: 'Bangkok Bank / Kasikornbank',
      accountName: 'Zecratary Platform Co., Ltd.',
      accountNumber: '123-4-56789-0',
      routingNumber: '002',
      swiftBic: 'BKKBTHBK',
      instructions: 'Please transfer via PromptPay or Bank Wire. Include Reference ID in transfer note.',
      requireApproval: true
    }
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggleVisibility = (field: string) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Load gateway configurations from PostgreSQL & filesystem
  const loadGatewayConfig = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        setWebhookEndpointUrl(`${origin}/api/webhooks/stripe`);
      }

      const res = await fetch('/api/admin/payment-gateway?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.gatewayConfig) {
          setConfig(prev => ({
            ...prev,
            ...data.gatewayConfig,
            stripe: { ...prev.stripe, ...(data.gatewayConfig.stripe || {}) },
            paypal: { ...prev.paypal, ...(data.gatewayConfig.paypal || {}) },
            manualSettlement: { ...prev.manualSettlement, ...(data.gatewayConfig.manualSettlement || {}) }
          }));
        }
        if (Array.isArray(data.settlements)) {
          setSettlements(data.settlements);
        }
      }
    } catch (err) {
      console.warn('Notice loading /admin/payment-gateway:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = tr('adminGatewayDocTitle', 'Payment Gateways - Admin Console');
    loadGatewayConfig();

    const handleSync = () => loadGatewayConfig();
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadGatewayConfig, tr]);

  // Sync credentials from .env
  const handleSyncFromEnv = async () => {
    setSyncingEnv(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_env' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.gatewayConfig) {
          setConfig(prev => ({
            ...prev,
            ...data.gatewayConfig,
            stripe: { ...prev.stripe, ...(data.gatewayConfig.stripe || {}) },
            paypal: { ...prev.paypal, ...(data.gatewayConfig.paypal || {}) }
          }));
        }
        showToast('success', tr('adminGatewaySuccessEnvSynced', 'Credentials loaded from .env and synchronized with PostgreSQL!'));
      } else {
        throw new Error('Failed to synchronize from .env');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error syncing from .env');
    } finally {
      setSyncingEnv(false);
    }
  };

  // Verify Stripe API keys
  const handleVerifyStripe = async () => {
    setVerifyingStripe(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_stripe',
          secretKey: config.stripe.secretKey
        })
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        setConfig(prev => ({ ...prev, stripeKeysVerified: true }));
        showToast('success', tr('adminGatewaySuccessVerified', 'Stripe API keys verified successfully with live gateway response!'));
      } else {
        throw new Error(data.error || 'Verification failed. Please check your Secret Key.');
      }
    } catch (err: any) {
      setConfig(prev => ({ ...prev, stripeKeysVerified: false }));
      showToast('error', err.message || 'Verification error.');
    } finally {
      setVerifyingStripe(false);
    }
  };

  // Save all settings to PostgreSQL & local store
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          gatewayConfig: config
        })
      });

      if (!res.ok) throw new Error('Failed to save settings.');

      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_payment_gateway_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      showToast('success', tr('adminGatewaySuccessSaved', 'Payment gateway configurations saved and synchronized successfully!'));
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Approve manual bank settlement
  const handleApproveSettlement = async (item: ManualSettlementItem) => {
    setApprovingId(item.id);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_settlement',
          id: item.id
        })
      });

      if (!res.ok) throw new Error('Failed to approve settlement.');

      setSettlements(prev => prev.map(s => s.id === item.id ? { ...s, status: 'succeeded' } : s));
      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_wallet_updated'));
      window.dispatchEvent(new Event('zecratary_users_updated'));
      showToast('success', tr('adminGatewaySuccessApproved', 'Settlement approved, user balance/plan activated, and payment ledger updated!'));
    } catch (err: any) {
      showToast('error', err.message || 'Error approving settlement.');
    } finally {
      setApprovingId(null);
    }
  };

  // Reject manual bank settlement
  const handleRejectSettlement = async (item: ManualSettlementItem) => {
    if (!confirm('Reject this settlement inquiry?')) return;
    setRejectingId(item.id);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_settlement',
          id: item.id
        })
      });

      if (!res.ok) throw new Error('Failed to reject settlement.');

      setSettlements(prev => prev.map(s => s.id === item.id ? { ...s, status: 'failed' } : s));
      showToast('success', tr('adminGatewaySuccessRejected', 'Settlement inquiry marked as rejected.'));
    } catch (err: any) {
      showToast('error', err.message || 'Error rejecting settlement.');
    } finally {
      setRejectingId(null);
    }
  };

  // Copy CLI command to clipboard
  const handleCopyCliCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCliKey(cmd);
    setTimeout(() => setCopiedCliKey(null), 2500);
  };

  // Filtered Manual Settlements
  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      if (settlementFilter !== 'all' && s.status !== settlementFilter) return false;
      if (settlementSearch.trim()) {
        const q = settlementSearch.toLowerCase().trim();
        const matchName = (s.customer_name || '').toLowerCase().includes(q);
        const matchEmail = (s.customer_email || '').toLowerCase().includes(q);
        const matchRef = (s.transfer_reference || s.id || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRef) return false;
      }
      return true;
    });
  }, [settlements, settlementFilter, settlementSearch]);

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ boxSizing: 'border-box', color: 'var(--color-text)' }}
    >
      {/* Top Header & Telemetry Actions */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <ShieldCheck className="h-6 w-6" /> {tr('adminGatewayTitle', 'Payment Gateway Integration & Settings')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('adminGatewaySubtitle', 'Manage live credentials, webhooks, sandbox modes, and manual bank settlements for Stripe, PayPal, and Direct Transfer.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadGatewayConfig}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{tr('adminGatewayReloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncFromEnv}
            disabled={syncingEnv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-emerald, #10b981)', 
              color: 'var(--color-emerald, #10b981)' 
            }}
          >
            <DownloadCloud className={`h-3.5 w-3.5 ${syncingEnv ? 'animate-bounce' : ''}`} />
            <span>{syncingEnv ? tr('adminGatewaySyncingEnv', 'Syncing .env...') : tr('adminGatewaySyncEnvBtn', 'Sync from .env')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className={`h-4 w-4 ${savingSettings ? 'animate-spin' : ''}`} />
            <span>{savingSettings ? tr('adminGatewaySavingBtn', 'Saving Settings...') : tr('adminGatewaySaveBtn', 'Save Gateway Settings')}</span>
          </button>
        </div>
      </div>

      {/* Global Processing Parameters Card (Autofill Safe Guardrail - Constraint 9) */}
      <div 
        role="region"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        className="p-5 rounded-3xl border shadow-md space-y-4 transition-colors"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {tr('adminGatewayLabelGlobalCurrency', 'Global Settlement Currency')}
            </label>
            <select
              value={config.currency}
              onChange={(e) => setConfig({ ...config, currency: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div 
            className="p-3.5 rounded-2xl border flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <span className="font-bold block" style={{ color: 'var(--color-text)' }}>
                {tr('adminGatewayLabelTestMode', 'Global Test / Sandbox Mode')}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('adminGatewayDescTestMode', 'When enabled, simulated test cards and sandbox checkouts are accepted without processing live financial charges.')}
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.testMode}
              onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
              className="rounded cursor-pointer h-4 w-4"
            />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('stripe')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'stripe' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <CreditCard className="h-4 w-4" />
          <span>{tr('adminGatewayTabStripe', 'Stripe Gateway')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paypal')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'paypal' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Zap className="h-4 w-4" />
          <span>{tr('adminGatewayTabPaypal', 'PayPal Gateway')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          style={activeTab === 'manual' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Landmark className="h-4 w-4" />
          <span>{tr('adminGatewayTabManual', 'Manual Bank Settlement')}</span>
        </button>
      </div>

      {/* TAB 1: STRIPE GATEWAY */}
      {activeTab === 'stripe' && (
        <div 
          role="region"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          className="rounded-3xl p-6 border shadow-xl space-y-6 transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>
                  Stripe Payment Processing
                </h3>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                  style={config.stripeKeysVerified ? {
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'var(--color-emerald, #10b981)',
                    color: 'var(--color-emerald, #10b981)'
                  } : {
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderColor: '#f59e0b',
                    color: '#f59e0b'
                  }}
                >
                  {config.stripeKeysVerified ? tr('adminGatewayStripeStatusVerified', 'Keys Verified') : tr('adminGatewayStripeStatusUnverified', 'Keys Pending')}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Direct integration with Stripe Checkout, customer billing portals, and recurring webhook events.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={config.stripe.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    stripe: { ...config.stripe, enabled: e.target.checked }
                  })}
                  className="rounded cursor-pointer"
                />
                <span>{tr('adminGatewayLabelEnableStripe', 'Enable Stripe Processing')}</span>
              </label>

              <button
                type="button"
                onClick={handleVerifyStripe}
                disabled={verifyingStripe || !config.stripe.secretKey}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {verifyingStripe ? tr('adminGatewayVerifying', 'Verifying...') : tr('adminGatewayBtnVerifyStripe', 'Verify Stripe API Keys')}
              </button>

              <button
                type="button"
                onClick={() => setShowStripeGuideModal(true)}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer text-blue-400 border-blue-500/30"
                style={{ backgroundColor: 'var(--color-inner-dark)' }}
              >
                <Terminal className="h-3.5 w-3.5 inline mr-1" />
                <span>CLI Guide</span>
              </button>
            </div>
          </div>

          {/* Stripe Credential Inputs (Autofill Safe Guardrails - Constraint 9) */}
          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('adminGatewayLabelStripePub', 'Stripe Publishable Key')}
              </label>
              <input
                type="text"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.stripe.publishableKey}
                onChange={(e) => setConfig({
                  ...config,
                  stripe: { ...config.stripe, publishableKey: e.target.value }
                })}
                placeholder="pk_test_..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelStripeSec', 'Stripe Secret Key')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleVisibility('stripeSec')}
                  className="text-[11px] font-sans flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
                >
                  {visibleFields['stripeSec'] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{visibleFields['stripeSec'] ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={visibleFields['stripeSec'] ? 'text' : 'password'}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.stripe.secretKey}
                onChange={(e) => setConfig({
                  ...config,
                  stripe: { ...config.stripe, secretKey: e.target.value }
                })}
                placeholder="sk_test_..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelStripeWhSec', 'Stripe Webhook Secret')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleVisibility('stripeWh')}
                  className="text-[11px] font-sans flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
                >
                  {visibleFields['stripeWh'] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{visibleFields['stripeWh'] ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={visibleFields['stripeWh'] ? 'text' : 'password'}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.stripe.webhookSecret}
                onChange={(e) => setConfig({
                  ...config,
                  stripe: { ...config.stripe, webhookSecret: e.target.value }
                })}
                placeholder="whsec_..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('adminGatewayLabelStripeWhUrl', 'Stripe Webhook Endpoint URL')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookEndpointUrl}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none opacity-80 select-all"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => handleCopyCliCommand(webhookEndpointUrl)}
                  className="px-3 py-2.5 rounded-xl border text-xs font-bold transition hover:opacity-80 shrink-0 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {copiedCliKey === webhookEndpointUrl ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYPAL GATEWAY */}
      {activeTab === 'paypal' && (
        <div 
          role="region"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          className="rounded-3xl p-6 border shadow-xl space-y-6 transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="text-base font-extrabold text-blue-400">
                PayPal Commerce & Checkout
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Configure PayPal JavaScript SDK orders, Smart Buttons, and sandbox test environments.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={config.paypal.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    paypal: { ...config.paypal, enabled: e.target.checked }
                  })}
                  className="rounded cursor-pointer"
                />
                <span>{tr('adminGatewayLabelEnablePaypal', 'Enable PayPal Processing')}</span>
              </label>

              <select
                value={config.paypal.environment}
                onChange={(e) => setConfig({
                  ...config,
                  paypal: { ...config.paypal, environment: e.target.value as any }
                })}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="sandbox">Sandbox (Test)</option>
                <option value="live">Live (Production)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('adminGatewayLabelPaypalClientId', 'PayPal Client ID')}
              </label>
              <input
                type="text"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.paypal.clientId}
                onChange={(e) => setConfig({
                  ...config,
                  paypal: { ...config.paypal, clientId: e.target.value }
                })}
                placeholder="client_id_..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelPaypalSecret', 'PayPal Secret Key')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleVisibility('paypalSec')}
                  className="text-[11px] font-sans flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
                >
                  {visibleFields['paypalSec'] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{visibleFields['paypalSec'] ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={visibleFields['paypalSec'] ? 'text' : 'password'}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.paypal.clientSecret}
                onChange={(e) => setConfig({
                  ...config,
                  paypal: { ...config.paypal, clientSecret: e.target.value }
                })}
                placeholder="secret_key_..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('adminGatewayLabelPaypalWhId', 'PayPal Webhook ID')}
              </label>
              <input
                type="text"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.paypal.webhookId}
                onChange={(e) => setConfig({
                  ...config,
                  paypal: { ...config.paypal, webhookId: e.target.value }
                })}
                placeholder="WH-..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL SETTLEMENT (PROMPTPAY / WIRE TRANSFER) */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Bank Configuration Card */}
          <div 
            role="region"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            className="rounded-3xl p-6 border shadow-xl space-y-4 transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--color-emerald, #10b981)' }}>
                  <Landmark className="h-5 w-5" /> Manual Bank & PromptPay Settlement
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Provide your company banking information for direct bank wires and PromptPay QR codes.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={config.manualSettlement.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, enabled: e.target.checked }
                  })}
                  className="rounded cursor-pointer"
                />
                <span>{tr('adminGatewayLabelEnableManual', 'Enable Manual Bank Settlement')}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelBankName', 'Bank / Provider Name')}
                </label>
                <input
                  type="text"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  value={config.manualSettlement.bankName}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, bankName: e.target.value }
                  })}
                  placeholder="Bangkok Bank"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelAccountName', 'Account Holder Name')}
                </label>
                <input
                  type="text"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  value={config.manualSettlement.accountName}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, accountName: e.target.value }
                  })}
                  placeholder="Company Co., Ltd."
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelAccountNum', 'Account Number / PromptPay ID')}
                </label>
                <input
                  type="text"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  value={config.manualSettlement.accountNumber}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, accountNumber: e.target.value }
                  })}
                  placeholder="123-4-56789-0"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelRoutingNum', 'Routing / Branch Code')}
                </label>
                <input
                  type="text"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  value={config.manualSettlement.routingNumber}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, routingNumber: e.target.value }
                  })}
                  placeholder="002"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLabelSwift', 'SWIFT / BIC Code')}
                </label>
                <input
                  type="text"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  value={config.manualSettlement.swiftBic}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, swiftBic: e.target.value }
                  })}
                  placeholder="BKKBTHBK"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={config.manualSettlement.requireApproval}
                    onChange={(e) => setConfig({
                      ...config,
                      manualSettlement: { ...config.manualSettlement, requireApproval: e.target.checked }
                    })}
                    className="rounded cursor-pointer"
                  />
                  <span>{tr('adminGatewayLabelRequireApproval', 'Require Admin Verification Before Plan Activation')}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('adminGatewayLabelBankInstructions', 'Customer Payment Instructions & QR Note')}
              </label>
              <textarea
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                rows={2}
                value={config.manualSettlement.instructions}
                onChange={(e) => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, instructions: e.target.value }
                })}
                placeholder="Instructions displayed to customers during checkout..."
                className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none font-medium"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          {/* Manual Settlement Ledger Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>
                  {tr('adminGatewayLedgerTitle', 'Manual Bank Transfer Inquiries & Settlements')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('adminGatewayLedgerSubtitle', 'Review customer deposit slips, match bank references, and confirm subscription or wallet activations.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 opacity-60" />
                  <input
                    type="text"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    value={settlementSearch}
                    onChange={(e) => setSettlementSearch(e.target.value)}
                    placeholder={tr('adminGatewaySearchPlaceholder', 'Search by customer name, email, or transfer reference...')}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <select
                  value={settlementFilter}
                  onChange={(e) => setSettlementFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="all">{tr('adminGatewayFilterAll', 'All Settlements')}</option>
                  <option value="pending">{tr('adminGatewayFilterPending', 'Pending Verification')}</option>
                  <option value="succeeded">{tr('adminGatewayFilterSucceeded', 'Approved & Settled')}</option>
                  <option value="failed">{tr('adminGatewayFilterFailed', 'Rejected / Cancelled')}</option>
                </select>
              </div>
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
                      <th className="px-5 py-4">{tr('adminGatewayColRef', 'Reference ID')}</th>
                      <th className="px-5 py-4">{tr('adminGatewayColCustomer', 'Customer')}</th>
                      <th className="px-5 py-4">{tr('adminGatewayColAmount', 'Amount')}</th>
                      <th className="px-5 py-4">{tr('adminGatewayColStatus', 'Approval Status')}</th>
                      <th className="px-5 py-4">{tr('adminGatewayColDate', 'Date & Time')}</th>
                      <th className="px-5 py-4 text-right">{tr('adminGatewayColActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
                          {tr('adminGatewayNoSettlements', 'No manual settlements found matching criteria.')}
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.map((item) => (
                        <tr key={item.id} className="transition" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-5 py-4 font-mono font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                            {item.transfer_reference || item.id}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold" style={{ color: 'var(--color-text)' }}>{item.customer_name || 'Customer'}</div>
                            <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{item.customer_email}</div>
                          </td>

                          <td className="px-5 py-4 font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                            ${Number(item.amount || 0).toFixed(2)} {item.currency || 'USD'}
                          </td>

                          <td className="px-5 py-4">
                            <span 
                              className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 w-fit"
                              style={item.status === 'succeeded' ? {
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderColor: 'var(--color-emerald, #10b981)',
                                color: 'var(--color-emerald, #10b981)'
                              } : item.status === 'failed' ? {
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderColor: '#ef4444',
                                color: '#ef4444'
                              } : {
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                borderColor: '#f59e0b',
                                color: '#f59e0b'
                              }}
                            >
                              {item.status.toUpperCase()}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(item.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : (locale || 'en-US'), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {item.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={approvingId === item.id}
                                  onClick={() => handleApproveSettlement(item)}
                                  className="px-3 py-1.5 rounded-xl border text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                                  style={{ backgroundColor: 'var(--color-emerald, #10b981)', borderColor: 'var(--color-emerald, #10b981)' }}
                                >
                                  {approvingId === item.id ? tr('adminGatewayApproving', 'Approving...') : tr('adminGatewayBtnApprove', 'Approve & Credit')}
                                </button>

                                <button
                                  type="button"
                                  disabled={rejectingId === item.id}
                                  onClick={() => handleRejectSettlement(item)}
                                  className="px-3 py-1.5 rounded-xl border text-xs font-bold text-red-400 border-red-500/30 hover:bg-red-500/10 cursor-pointer transition disabled:opacity-50"
                                >
                                  {rejectingId === item.id ? tr('adminGatewayRejecting', 'Rejecting...') : tr('adminGatewayBtnReject', 'Reject')}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-mono opacity-50">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STRIPE CLI GUIDE MODAL (Accessible & Form-Free Container - Constraint 9) */}
      {showStripeGuideModal && (
        <div 
          onClick={() => setShowStripeGuideModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <button 
              type="button"
              onClick={() => setShowStripeGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md cursor-pointer transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-text-secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                <Terminal className="h-5 w-5" /> {tr('adminGatewayModalCliTitle', 'Stripe CLI Webhook Forwarding Guide')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('adminGatewayModalCliDesc', 'Run this terminal command during local development to forward live Stripe webhooks to your local API route:')}
              </p>
            </div>

            <div 
              className="p-4 rounded-2xl border font-mono text-xs space-y-2"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between text-[11px] opacity-70">
                <span>Terminal Shell Command</span>
                <button
                  type="button"
                  onClick={() => handleCopyCliCommand('stripe listen --forward-to localhost:3000/api/webhooks/stripe')}
                  className="flex items-center gap-1 text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedCliKey ? tr('adminGatewayBtnCopied', 'Copied!') : tr('adminGatewayBtnCopyCommand', 'Copy Command')}</span>
                </button>
              </div>

              <code className="block p-2 rounded-xl bg-black/40 text-emerald-300 overflow-x-auto select-all">
                stripe listen --forward-to localhost:3000/api/webhooks/stripe
              </code>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Once running, the CLI outputs a signing secret starting with <code className="font-mono text-emerald-400">whsec_...</code>. Copy and paste that value into the <strong>Stripe Webhook Secret</strong> field to sign test requests.
            </p>

            <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowStripeGuideModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer hover:opacity-90 transition shadow"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {tr('adminGatewayBtnClose', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : 'rgba(239, 68, 68, 0.4)',
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
    </div>
  );
}
