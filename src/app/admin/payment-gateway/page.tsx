// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, RefreshCw, 
  Check, Eye, EyeOff, Globe, Zap, Sliders, ShieldCheck, Terminal, 
  ExternalLink, Code2, AlertTriangle, Activity, DownloadCloud, 
  UploadCloud, Sparkles, Landmark, Clock, X, XCircle, Search, 
  Filter, Trash2, Edit3, Copy, ChevronDown
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface ManualSettlementConfig {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  routingNumber: string;
  swiftBic: string;
  branchName: string;
  instructions: string;
  requireReference: boolean;
  requireApproval: boolean;
}

interface GatewayConfig {
  currency: string;
  testMode: boolean;
  stripeConnected?: boolean;
  stripeKeysVerified?: boolean;
  stripeWebhookVerified?: boolean;
  paypalKeysVerified?: boolean;
  paypalWebhookVerified?: boolean;
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
  { code: 'THB', label: 'THB - Thai Baht (฿)', symbol: '฿' },
];

export default function AdminPaymentGatewayPage() {
  const { t } = useTranslation();

  const tr = useCallback((key: string, fallback: string): string => {
    if (typeof t === 'function') {
      const val = t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [t]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'stripe' | 'paypal' | 'manual'>('stripe');

  // Loading & Processing States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const [verifyingPayPal, setVerifyingPayPal] = useState(false);
  const [verifyingSecret, setVerifyingSecret] = useState(false);
  const [verifyingPaypalWh, setVerifyingPaypalWh] = useState(false);

  // Modals & Helpers
  const [showStripeGuideModal, setShowStripeGuideModal] = useState(false);
  const [copiedCliKey, setCopiedCliKey] = useState<string | null>(null);
  const [copiedWhUrl, setCopiedWhUrl] = useState(false);
  const [copiedPpWhUrl, setCopiedPpWhUrl] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Gateway Configuration State
  const [config, setConfig] = useState<GatewayConfig>({
    currency: 'USD',
    testMode: true,
    stripeConnected: true,
    stripeKeysVerified: false,
    stripeWebhookVerified: false,
    paypalKeysVerified: false,
    paypalWebhookVerified: false,
    stripe: {
      enabled: true,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
    },
    paypal: {
      enabled: true,
      clientId: '',
      clientSecret: '',
      webhookId: '',
      environment: 'sandbox',
    },
    manualSettlement: {
      enabled: true,
      bankName: 'Bangkok Bank',
      accountHolder: 'Zecratary Culinary Ltd',
      accountNumber: '123-4-56789-0',
      routingNumber: '002',
      swiftBic: 'BKKBTHBK',
      branchName: 'Siam Paragon Branch',
      instructions: 'Please transfer the exact subscription or wallet balance amount and upload your transfer slip.',
      requireReference: true,
      requireApproval: true,
    }
  });

  // Manual Settlement Queue Filter
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'succeeded' | 'failed'>('all');

  const webhookEndpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/stripe`
    : 'https://zecratary.com/api/webhooks/stripe';

  const paypalWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/paypal`
    : 'https://zecratary.com/api/webhooks/paypal';

  const toggleVisibility = (field: string) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      if (key === 'stripe_url') {
        setCopiedWhUrl(true);
        setTimeout(() => setCopiedWhUrl(false), 2000);
      } else if (key === 'paypal_url') {
        setCopiedPpWhUrl(true);
        setTimeout(() => setCopiedPpWhUrl(false), 2000);
      } else {
        setCopiedCliKey(key);
        setTimeout(() => setCopiedCliKey(null), 2500);
      }
    }
  };

  // Fetch Gateway Configuration
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-gateway?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.paymentSettings) {
          setConfig(prev => ({
            ...prev,
            ...data.paymentSettings,
            stripe: { ...prev.stripe, ...(data.paymentSettings.stripe || {}) },
            paypal: { ...prev.paypal, ...(data.paymentSettings.paypal || {}) },
            manualSettlement: { ...prev.manualSettlement, ...(data.paymentSettings.manualSettlement || {}) },
          }));
        }
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    const handleSync = () => loadConfig();
    window.addEventListener('zecratary_payment_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);
    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadConfig]);

  // Save Settings to Backend
  const handleSaveSettings = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_settings', paymentSettings: config })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: 'Payment gateway configuration saved successfully!' });
        window.dispatchEvent(new Event('zecratary_payment_updated'));
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save configuration.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Error communicating with server.' });
    } finally {
      setSaving(false);
    }
  };

  // 1. Verify Stripe Keys
  const handleVerifyStripe = async () => {
    if (!config.stripe.secretKey && !config.stripe.publishableKey) {
      setShowStripeGuideModal(true);
      return;
    }
    setVerifyingStripe(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_stripe_keys',
          publishableKey: config.stripe.publishableKey,
          secretKey: config.stripe.secretKey,
          webhookSecret: config.stripe.webhookSecret,
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(prev => ({ ...prev, stripeKeysVerified: true, stripeWebhookVerified: true }));
        setFeedback({ type: 'success', msg: data.message || 'Stripe keys and webhook secret verified!' });
      } else {
        setConfig(prev => ({ ...prev, stripeKeysVerified: false }));
        setFeedback({ type: 'error', msg: data.message || 'Stripe key verification failed.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Error during Stripe verification.' });
    } finally {
      setVerifyingStripe(false);
    }
  };

  // Standalone Stripe Secret Verify
  const handleVerifySecretInline = async () => {
    if (!config.stripe.webhookSecret) return;
    setVerifyingSecret(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_webhook_secret', webhookSecret: config.stripe.webhookSecret })
      });
      const data = await res.json();
      if (data.valid) {
        setConfig(prev => ({ ...prev, stripeWebhookVerified: true }));
        setFeedback({ type: 'success', msg: 'Webhook signing secret HMAC format is valid!' });
      } else {
        setFeedback({ type: 'error', msg: 'Invalid webhook secret format (must start with whsec_ and be >= 24 chars).' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message });
    } finally {
      setVerifyingSecret(false);
    }
  };

  // 2. Verify PayPal Keys (Task 4)
  const handleVerifyPayPal = async () => {
    if (!config.paypal.clientId || !config.paypal.clientSecret) {
      setFeedback({ type: 'error', msg: 'Please provide both PayPal Client ID and Client Secret.' });
      return;
    }
    setVerifyingPayPal(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_paypal_keys',
          clientId: config.paypal.clientId,
          clientSecret: config.paypal.clientSecret,
          webhookId: config.paypal.webhookId,
          environment: config.paypal.environment,
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(prev => ({
          ...prev,
          paypalKeysVerified: true,
          paypalWebhookVerified: Boolean(data.webhookVerified)
        }));
        setFeedback({ type: 'success', msg: data.message || 'PayPal credentials verified successfully!' });
      } else {
        setConfig(prev => ({ ...prev, paypalKeysVerified: false, paypalWebhookVerified: false }));
        setFeedback({ type: 'error', msg: data.error || 'Failed to authenticate with PayPal API.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Error communicating with PayPal.' });
    } finally {
      setVerifyingPayPal(false);
    }
  };

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 pb-24 font-sans transition-colors duration-200 box-border"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 pt-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <CreditCard className="h-6 w-6" /> {tr('paymentGatewayTitle', 'Payment Gateway Engine')}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('paymentGatewaySubtitle', 'Configure real-time payment processors, verify API credentials, and manage manual bank settlements.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/plans"
            className="px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Manage Plans</span>
          </Link>
          <button
            type="button"
            onClick={loadConfig}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Gateway Settings'}</span>
          </button>
        </div>
      </div>

      {/* Gateway Engine Monitor Summary Bar */}
      <div 
        className="p-3.5 px-5 my-5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>Gateway Engine:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {config.stripe.enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
                STRIPE
              </span>
            )}
            {config.paypal.enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                PAYPAL
              </span>
            )}
            {config.manualSettlement.enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                BANK WIRE
              </span>
            )}
          </div>
          <span 
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border"
            style={{
              backgroundColor: config.testMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald)',
              color: config.testMode ? '#fbbf24' : 'var(--color-emerald)'
            }}
          >
            {config.testMode ? 'Sandbox Test' : 'Live Production'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <div>
            Currency: <span className="font-bold">{config.currency} ({SUPPORTED_CURRENCIES.find(c => c.code === config.currency)?.symbol || '$'})</span>
          </div>
          <div>
            Stripe: <span className={`font-bold ${config.stripeKeysVerified ? 'text-emerald-400' : 'text-amber-400'}`}>{config.stripeKeysVerified ? 'Verified' : 'Unverified'}</span>
          </div>
          <div>
            PayPal: <span className={`font-bold ${config.paypalKeysVerified ? 'text-emerald-400' : 'text-amber-400'}`}>{config.paypalKeysVerified ? 'Verified' : 'Unverified'}</span>
          </div>
        </div>
      </div>

      {/* Global Processing Currency Card with Styled Dropdown (Task 2) */}
      <div 
        role="region"
        aria-label="Processing Currency Configuration"
        className="p-5 rounded-3xl border mb-6 shadow-sm"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <Globe className="h-4 w-4" /> {tr('currencySelectLabel', 'Default Processing Currency')}
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Select the primary transactional currency applied during billing checkouts and manual bank orders.
            </p>
          </div>

          {/* Task 2: Harmonized Dropdown */}
          <div className="relative w-full sm:w-72">
            <select
              value={config.currency}
              onChange={(e) => setConfig({ ...config, currency: e.target.value })}
              className="w-full appearance-none px-4 py-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition shadow-xs pr-10"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              {SUPPORTED_CURRENCIES.map(curr => (
                <option 
                  key={curr.code} 
                  value={curr.code}
                  style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}
                >
                  {curr.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-60" />
          </div>
        </div>
      </div>

      {/* Tab Navigation Selector */}
      <div 
        className="flex items-center gap-1.5 p-1 rounded-2xl border w-fit mb-6 shadow-xs"
        style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('stripe')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={activeTab === 'stripe' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <CreditCard className="h-4 w-4" />
          <span>{tr('tabStripe', 'Stripe Gateway')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paypal')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={activeTab === 'paypal' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Zap className="h-4 w-4" />
          <span>{tr('tabPayPal', 'PayPal Gateway')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          style={activeTab === 'manual' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Landmark className="h-4 w-4" />
          <span>{tr('tabManual', 'Bank Wire / Manual Settlement')}</span>
        </button>
      </div>

      {/* TAB 1: STRIPE GATEWAY */}
      {activeTab === 'stripe' && (
        <div 
          role="region"
          aria-label="Stripe API Configuration"
          className="p-6 rounded-3xl border shadow-xl space-y-6"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {/* Header with Task 1 Slide-Toggle & Verify Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
              <div>
                <h2 className="text-base font-black flex items-center gap-2">
                  {tr('stripeApiConfig', 'Stripe API Configuration')}
                </h2>
                <span className="text-[11px] opacity-70">Direct credit card billing with automated webhook reconciliation.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Task 1: Slide-Toggle for Stripe Enable/Disable */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.stripe.enabled}
                  onClick={() => setConfig({ ...config, stripe: { ...config.stripe, enabled: !config.stripe.enabled } })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                    config.stripe.enabled ? 'bg-[var(--color-emerald,#10b981)]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.stripe.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: config.stripe.enabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
                  {config.stripe.enabled ? tr('enabled', 'Enabled') : tr('disabled', 'Disabled')}
                </span>
              </div>

              {/* Verify Stripe Key Button */}
              <button
                type="button"
                onClick={handleVerifyStripe}
                disabled={verifyingStripe}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.stripeKeysVerified ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: config.stripeKeysVerified ? 'var(--color-emerald)' : 'var(--color-text)'
                }}
              >
                <ShieldCheck className={`h-4 w-4 ${verifyingStripe ? 'animate-spin' : ''}`} />
                <span>{verifyingStripe ? tr('verifying', 'Verifying...') : tr('verifyStripeKey', 'Verify Stripe Key')}</span>
              </button>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${config.stripeKeysVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                {config.stripeKeysVerified ? tr('keysVerified', 'Keys & Webhook Verified') : tr('keysUnverified', 'Keys Unverified')}
              </span>
            </div>
          </div>

          {/* Credential Inputs with Autofill Guardrails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold">Publishable Key *</label>
                {config.stripeKeysVerified && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={visibleFields['stripePublishable'] ? 'text' : 'password'}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={config.stripe.publishableKey}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, publishableKey: e.target.value } })}
                  placeholder="pk_test_... or pk_live_..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border font-mono outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('stripePublishable')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {visibleFields['stripePublishable'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold">Secret Key *</label>
                {config.stripeKeysVerified && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={visibleFields['stripeSecret'] ? 'text' : 'password'}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={config.stripe.secretKey}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, secretKey: e.target.value } })}
                  placeholder="sk_test_... or sk_live_..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border font-mono outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('stripeSecret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {visibleFields['stripeSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Secret Input with Inline Verify Secret Action */}
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold">Webhook Signing Secret *</label>
              <div className="flex items-center gap-2">
                {config.stripeWebhookVerified && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleVerifySecretInline}
                  disabled={verifyingSecret || !config.stripe.webhookSecret}
                  className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer disabled:opacity-40"
                >
                  {verifyingSecret ? 'Testing...' : tr('verifySecret', 'Verify Secret')}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type={visibleFields['stripeWebhook'] ? 'text' : 'password'}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.stripe.webhookSecret}
                onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                placeholder="whsec_..."
                className="w-full px-3 py-2.5 pr-10 rounded-xl border font-mono outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('stripeWebhook')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
              >
                {visibleFields['stripeWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Task 3: Restored Webhook & CLI Setup Guide Footer Card */}
          <div 
            className="p-5 rounded-2xl border space-y-3"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  {tr('stripeWebhookUrlLabel', 'Stripe Webhook Endpoint URL')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowStripeGuideModal(true)}
                className="text-xs font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
                style={{ color: 'var(--color-primary)' }}
              >
                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                <span>{tr('cliGuideBtn', 'CLI & Webhooks Guide')}</span>
              </button>
            </div>

            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {tr('stripeWebhookUrlDesc', 'Add this URL in Stripe Dashboard (Developers → Webhooks → Add an endpoint) or use the Stripe CLI command below to forward events locally.')}
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookEndpointUrl}
                className="w-full px-3 py-2 rounded-xl border text-xs font-mono select-all outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={() => handleCopy(webhookEndpointUrl, 'stripe_url')}
                className="px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 flex items-center gap-1 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: copiedWhUrl ? 'var(--color-emerald)' : 'var(--color-card)',
                  borderColor: copiedWhUrl ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: copiedWhUrl ? '#ffffff' : 'var(--color-text)'
                }}
              >
                {copiedWhUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedWhUrl ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}</span>
              </button>
            </div>

            {/* Local CLI Command Helper Box */}
            <div 
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 overflow-hidden font-mono text-[11px]">
                <Terminal className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <code className="truncate select-all">
                  stripe listen --forward-to {webhookEndpointUrl.replace(/^https?:\/\//, '')}
                </code>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(`stripe listen --forward-to ${webhookEndpointUrl.replace(/^https?:\/\//, '')}`, 'listen_inline')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0"
                style={{
                  backgroundColor: copiedCliKey === 'listen_inline' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                  borderColor: copiedCliKey === 'listen_inline' ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: copiedCliKey === 'listen_inline' ? '#ffffff' : 'var(--color-text)'
                }}
              >
                {copiedCliKey === 'listen_inline' ? tr('copiedBtn', 'Copied!') : tr('copyCommandBtn', 'Copy Command')}
              </button>
            </div>

            <div className="text-[10px] flex flex-wrap items-center gap-1.5 opacity-80 pt-0.5">
              <span className="font-bold">{tr('recommendedEventsTitle', 'Recommended events:')}</span>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">checkout.session.completed</code>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">invoice.payment_succeeded</code>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">customer.subscription.deleted</code>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYPAL GATEWAY (Task 4) */}
      {activeTab === 'paypal' && (
        <div 
          role="region"
          aria-label="PayPal API Configuration"
          className="p-6 rounded-3xl border shadow-xl space-y-6"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {/* Header with Task 1 Slide-Toggle & Task 4 Verify PayPal Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 shrink-0"></div>
              <div>
                <h2 className="text-base font-black flex items-center gap-2">
                  {tr('paypalApiConfig', 'PayPal API Configuration')}
                </h2>
                <span className="text-[11px] opacity-70">Direct digital wallet, PayPal balance, and international debit settlement.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Task 1: Slide-Toggle for PayPal */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.paypal.enabled}
                  onClick={() => setConfig({ ...config, paypal: { ...config.paypal, enabled: !config.paypal.enabled } })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                    config.paypal.enabled ? 'bg-[var(--color-emerald,#10b981)]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.paypal.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: config.paypal.enabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
                  {config.paypal.enabled ? tr('enabled', 'Enabled') : tr('disabled', 'Disabled')}
                </span>
              </div>

              {/* Task 4: Verify PayPal Credentials Button */}
              <button
                type="button"
                onClick={handleVerifyPayPal}
                disabled={verifyingPayPal}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.paypalKeysVerified ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: config.paypalKeysVerified ? 'var(--color-emerald)' : 'var(--color-text)'
                }}
              >
                <ShieldCheck className={`h-4 w-4 ${verifyingPayPal ? 'animate-spin' : ''}`} />
                <span>{verifyingPayPal ? tr('verifying', 'Verifying...') : tr('verifyPayPalKey', 'Verify PayPal Credentials')}</span>
              </button>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${config.paypalKeysVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                {config.paypalKeysVerified ? tr('keysVerified', 'Keys & Webhook Verified') : tr('keysUnverified', 'Keys Unverified')}
              </span>
            </div>
          </div>

          {/* Environment Switcher with Task 2 Harmonized Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <div>
              <span className="text-xs font-bold block">{tr('paypalEnvironment', 'PayPal Environment')}</span>
              <span className="text-[11px] opacity-70">Switch between PayPal Developer Sandbox and Live Production endpoints.</span>
            </div>

            <div className="relative w-full sm:w-56">
              <select
                value={config.paypal.environment}
                onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, environment: e.target.value as 'sandbox' | 'live' } })}
                className="w-full appearance-none px-3.5 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer pr-9"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="sandbox" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{tr('sandbox', 'Sandbox (Test)')}</option>
                <option value="live" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{tr('production', 'Live Production')}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-60" />
            </div>
          </div>

          {/* PayPal Credential Fields (Task 4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold">{tr('paypalClientId', 'PayPal Client ID')} *</label>
                {config.paypalKeysVerified && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={visibleFields['paypalClientId'] ? 'text' : 'password'}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={config.paypal.clientId}
                  onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                  placeholder="PayPal Client ID"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border font-mono outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('paypalClientId')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {visibleFields['paypalClientId'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold">{tr('paypalSecret', 'PayPal Client Secret')} *</label>
                {config.paypalKeysVerified && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={visibleFields['paypalSecret'] ? 'text' : 'password'}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={config.paypal.clientSecret}
                  onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientSecret: e.target.value } })}
                  placeholder="PayPal Secret Key"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border font-mono outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('paypalSecret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {visibleFields['paypalSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Webhook ID Field (Task 4) */}
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold">{tr('paypalWebhookId', 'PayPal Webhook ID')}</label>
              <div className="flex items-center gap-2">
                {config.paypalWebhookVerified && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleVerifyPayPal}
                  disabled={verifyingPayPal || !config.paypal.webhookId}
                  className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer disabled:opacity-40"
                >
                  {verifyingPayPal ? 'Testing...' : tr('verifyWebhook', 'Verify Webhook')}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type={visibleFields['paypalWebhookId'] ? 'text' : 'password'}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                value={config.paypal.webhookId}
                onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, webhookId: e.target.value } })}
                placeholder="e.g. 5G91823901928"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border font-mono outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('paypalWebhookId')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
              >
                {visibleFields['paypalWebhookId'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* PayPal Webhook Listener Helper Card */}
          <div 
            className="p-5 rounded-2xl border space-y-3"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                {tr('paypalWebhookUrlLabel', 'PayPal Webhook Listener URL')}
              </span>
              <a
                href={config.paypal.environment === 'live' ? 'https://developer.paypal.com/dashboard/applications/live' : 'https://developer.paypal.com/dashboard/applications/sandbox'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold flex items-center gap-1 hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                <span>PayPal Developer Console</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {tr('paypalWebhookUrlDesc', 'Register this listener URL in PayPal Developer Console (Apps & Credentials → Webhooks).')}
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={paypalWebhookUrl}
                className="w-full px-3 py-2 rounded-xl border text-xs font-mono select-all outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={() => handleCopy(paypalWebhookUrl, 'paypal_url')}
                className="px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 flex items-center gap-1 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: copiedPpWhUrl ? 'var(--color-emerald)' : 'var(--color-card)',
                  borderColor: copiedPpWhUrl ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: copiedPpWhUrl ? '#ffffff' : 'var(--color-text)'
                }}
              >
                {copiedPpWhUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPpWhUrl ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}</span>
              </button>
            </div>

            <div className="text-[10px] flex flex-wrap items-center gap-1.5 opacity-80 pt-0.5">
              <span className="font-bold">Events to subscribe:</span>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">PAYMENT.CAPTURE.COMPLETED</code>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">CHECKOUT.ORDER.APPROVED</code>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">BILLING.SUBSCRIPTION.ACTIVATED</code>
              <code className="px-1.5 py-0.5 rounded border text-[10px] font-mono">BILLING.SUBSCRIPTION.CANCELLED</code>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BANK WIRE / MANUAL SETTLEMENT (Task 1 Slide Toggles & Task 2 Dropdowns) */}
      {activeTab === 'manual' && (
        <div 
          role="region"
          aria-label="Bank Wire Settlement Configuration"
          className="p-6 rounded-3xl border shadow-xl space-y-6"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {/* Header with Task 1 Slide-Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></div>
              <div>
                <h2 className="text-base font-black flex items-center gap-2">
                  {tr('manualSettlementConfig', 'Bank Wire / Manual Settlement')}
                </h2>
                <span className="text-[11px] opacity-70">Direct bank transfer instructions, routing numbers, and approval workflows.</span>
              </div>
            </div>

            {/* Task 1: Slide-Toggle for Manual Bank Settlement */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={config.manualSettlement.enabled}
                onClick={() => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, enabled: !config.manualSettlement.enabled }
                })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                  config.manualSettlement.enabled ? 'bg-[var(--color-emerald,#10b981)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.manualSettlement.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: config.manualSettlement.enabled ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}>
                {config.manualSettlement.enabled ? tr('enabled', 'Enabled') : tr('disabled', 'Disabled')}
              </span>
            </div>
          </div>

          {/* Bank Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Bank Name</label>
              <input
                type="text"
                value={config.manualSettlement.bankName}
                onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, bankName: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border font-medium outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Account Holder / Beneficiary</label>
              <input
                type="text"
                value={config.manualSettlement.accountHolder}
                onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, accountHolder: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border font-medium outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Account Number / IBAN</label>
              <input
                type="text"
                value={config.manualSettlement.accountNumber}
                onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, accountNumber: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Routing Number / Sort Code</label>
              <input
                type="text"
                value={config.manualSettlement.routingNumber}
                onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, routingNumber: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border font-mono outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="font-bold block mb-1">SWIFT / BIC Code</label>
              <input
                type="text"
                value={config.manualSettlement.swiftBic}
                onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, swiftBic: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border font-mono outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Branch Name</label>
              <input
                type="text"
                value={config.manualSettlement.branchName}
                onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, branchName: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border font-medium outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          {/* Transfer Instructions */}
          <div className="text-xs">
            <label className="font-bold block mb-1">Wire Transfer Instructions</label>
            <textarea
              rows={3}
              value={config.manualSettlement.instructions}
              onChange={(e) => setConfig({ ...config, manualSettlement: { ...config.manualSettlement, instructions: e.target.value } })}
              className="w-full p-3 rounded-xl border outline-none font-medium leading-relaxed"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Task 1: Slide Toggles for Settlement Approval Policies */}
          <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Verification Policies</span>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div>
                <span className="font-bold text-xs block">{tr('requireReferenceLabel', 'Require Customer Reference / Receipt ID')}</span>
                <span className="text-[11px] opacity-70">Prompts users to submit their bank transaction reference number upon checkout.</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.manualSettlement.requireReference}
                onClick={() => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, requireReference: !config.manualSettlement.requireReference }
                })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                  config.manualSettlement.requireReference ? 'bg-[var(--color-emerald,#10b981)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.manualSettlement.requireReference ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="font-bold text-xs block">{tr('requireApprovalLabel', 'Require Administrative Approval to Credit Wallet')}</span>
                <span className="text-[11px] opacity-70">Holds balance credits in pending status until payment arrival is verified in bank account.</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.manualSettlement.requireApproval}
                onClick={() => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, requireApproval: !config.manualSettlement.requireApproval }
                })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                  config.manualSettlement.requireApproval ? 'bg-[var(--color-emerald,#10b981)]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.manualSettlement.requireApproval ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task 3: Restored Full Interactive Stripe CLI & Webhook Modal */}
      {showStripeGuideModal && (
        <div 
          role="dialog"
          aria-label="Stripe CLI & Webhook Setup Guide"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div 
            className="border rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative text-xs max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <button 
              type="button"
              onClick={() => setShowStripeGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-text)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#635bff]/15 text-[#635bff]">
                  <Terminal className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {tr('stripeConnectModalTitle', 'Connect Stripe & Webhooks')}
                </h2>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('stripeConnectModalSub', 'To connect Stripe webhooks and test payments with your local server, follow the official recommended Stripe CLI setup below.')}
              </p>
            </div>

            {/* Method 1: Official Stripe CLI (4 Steps) */}
            <div 
              className="p-5 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Code2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {tr('method1Title', 'Method 1: Use the Official Stripe CLI (Recommended)')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {tr('recommendedBadge', 'Recommended')}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('method1Desc', 'The official Stripe CLI securely routes events straight to your localhost without needing to register a public URL or configure an HTTP tunnel.')}
              </p>

              {/* Step 1 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs">
                  1. {tr('step1Title', 'Install the CLI:')} <span className="font-normal opacity-80">{tr('step1Desc', 'Download the Stripe CLI on your system (e.g., via Homebrew on macOS):')}</span>
                </div>
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="select-all">brew install stripe/stripe-cli/stripe</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('brew install stripe/stripe-cli/stripe', 'cli_install')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                    style={{
                      backgroundColor: copiedCliKey === 'cli_install' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                      borderColor: copiedCliKey === 'cli_install' ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: copiedCliKey === 'cli_install' ? '#ffffff' : 'var(--color-text)'
                    }}
                  >
                    {copiedCliKey === 'cli_install' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs">
                  2. {tr('step2Title', 'Log in:')} <span className="font-normal opacity-80">{tr('step2Desc', 'Link your Stripe account by running in your terminal:')}</span>
                </div>
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="select-all">stripe login</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('stripe login', 'cli_login')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                    style={{
                      backgroundColor: copiedCliKey === 'cli_login' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                      borderColor: copiedCliKey === 'cli_login' ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: copiedCliKey === 'cli_login' ? '#ffffff' : 'var(--color-text)'
                    }}
                  >
                    {copiedCliKey === 'cli_login' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                  </button>
                </div>
                <p className="text-[10px] opacity-70 italic" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('step2Note', 'Follow the pairing link provided in the terminal to authenticate your Stripe account.')}
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs">
                  3. {tr('step3Title', 'Forward events:')} <span className="font-normal opacity-80">{tr('step3Desc', 'Start forwarding Stripe events directly to your local endpoint:')}</span>
                </div>
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="select-all truncate">
                    stripe listen --forward-to {webhookEndpointUrl.replace(/^https?:\/\//, '')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`stripe listen --forward-to ${webhookEndpointUrl.replace(/^https?:\/\//, '')}`, 'cli_listen')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0"
                    style={{
                      backgroundColor: copiedCliKey === 'cli_listen' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                      borderColor: copiedCliKey === 'cli_listen' ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: copiedCliKey === 'cli_listen' ? '#ffffff' : 'var(--color-text)'
                    }}
                  >
                    {copiedCliKey === 'cli_listen' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs">
                  4. {tr('step4Title', 'Capture the Secret:')} <span className="font-normal opacity-80">{tr('step4Desc', 'The CLI will print a local signing secret (looks like')} <code className="font-mono font-bold text-[10px] px-1 py-0.5 rounded border">whsec_...</code>{tr('step4DescAfter', '). Paste it into the Webhook Secret field below:')}</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={config.stripe.webhookSecret}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                    placeholder="whsec_..."
                    className="w-full p-2.5 rounded-xl border text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </div>

            {/* Method 2: Stripe Dashboard Links */}
            <div 
              className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-xs">{tr('method2Title', 'Production / Dashboard API Keys')}</span>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('method2Desc', 'Retrieve your Secret Key and Publishable Key directly from your Stripe Dashboard.')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={config.testMode ? "https://dashboard.stripe.com/test/apikeys" : "https://dashboard.stripe.com/apikeys"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{tr('openApiKeysBtn', 'Stripe API Keys')}</span>
                </a>
                <a
                  href={config.testMode ? "https://dashboard.stripe.com/test/webhooks" : "https://dashboard.stripe.com/webhooks"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{tr('openWebhooksBtn', 'Stripe Webhooks')}</span>
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowStripeGuideModal(false)}
                className="px-4 py-2 rounded-xl border font-bold text-xs transition cursor-pointer shadow-xs"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowStripeGuideModal(false);
                  await handleSaveSettings();
                  await handleVerifyStripe();
                }}
                className="px-5 py-2 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Save className="h-4 w-4" />
                <span>{tr('saveAndConnectBtn', 'Save Settings & Verify Stripe')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast Feedback */}
      {feedback && (
        <div 
          className="fixed bottom-6 right-6 p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-2xl z-50 animate-in slide-in-from-bottom-5"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
            color: feedback.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.msg}</span>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="ml-2 opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
