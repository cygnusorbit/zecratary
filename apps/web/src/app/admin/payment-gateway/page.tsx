'use client';
// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Check, Eye, EyeOff, Globe, Zap, Sliders,
  ShieldCheck, Terminal, ExternalLink, Code2, AlertTriangle,
  Activity, DownloadCloud, UploadCloud, Landmark, Copy, CheckSquare, Clock
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
}

interface GatewayConfig {
  activeGateway: 'stripe' | 'paypal' | 'both';
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

interface ManualTransaction {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planSlug?: string;
  amount: number;
  currency: string;
  gateway: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'canceled';
  createdAt: string;
  transferReference?: string;
  confirmedAmount?: number;
  confirmedAt?: string;
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
  { code: 'THB', label: 'THB - Thai Baht (฿)', symbol: '฿' },
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

  const [loading, setLoading] = useState<boolean>(false);
  const [syncingEnv, setSyncingEnv] = useState<boolean>(false);
  const [updatingEnv, setUpdatingEnv] = useState<boolean>(false);
  const [togglingGateway, setTogglingGateway] = useState<string | null>(null);
  const [verifyingStripe, setVerifyingStripe] = useState<boolean>(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState<boolean>(false);
  const [showStripeGuideModal, setShowStripeGuideModal] = useState<boolean>(false);
  const [copiedCliKey, setCopiedCliKey] = useState<string | null>(null);
  const [webhookEndpointUrl, setWebhookEndpointUrl] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Manual Settlement Ledger
  const [transactions, setTransactions] = useState<ManualTransaction[]>([]);
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'succeeded' | 'failed'>('all');
  const [settlementSearch, setSettlementSearch] = useState<string>('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Gateway Settings State
  const [config, setConfig] = useState<GatewayConfig>({
    activeGateway: 'stripe',
    currency: 'USD',
    testMode: true,
    stripeConnected: true,
    stripeKeysVerified: false,
    stripeWebhookVerified: false,
    stripe: {
      enabled: true,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
    },
    paypal: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      webhookId: '',
      environment: 'sandbox',
    },
    manualSettlement: {
      enabled: false,
      bankName: 'Bangkok Bank / Kasikornbank',
      accountHolder: 'Zecratary Innovations Co., Ltd.',
      accountNumber: '123-4-56789-0',
      routingNumber: '002',
      swiftBic: 'BKKBTHBK',
      branchName: 'Main Corporate Branch',
      instructions: 'Please transfer the exact amount and include your reference number for instant verification.',
      requireReference: true,
    }
  });

  const configRef = useRef<GatewayConfig>(config);
  const isFetchingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const getCurrencySymbol = useCallback((currencyCode?: string) => {
    const code = currencyCode || configRef.current?.currency || 'USD';
    const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return found ? found.symbol : '$';
  }, []);

  const activeCurrencySymbol = useMemo(() => {
    return getCurrencySymbol(config.currency);
  }, [config.currency, getCurrencySymbol]);

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const broadcastSyncEvents = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_gateway_sync_timestamp', String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_payment_gateway_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  // SINGLE DEFINITION OF loadGatewayData
  const loadGatewayData = useCallback(async () => {
    if (isFetchingRef.current || isSavingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      if (typeof window !== 'undefined') {
        setWebhookEndpointUrl(`${window.location.origin}/api/webhooks/stripe`);
      }

      const res = await fetch('/api/admin/payment-gateway?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.gatewayConfig || data.settings) {
          const loaded = data.gatewayConfig || data.settings;
          const merged: GatewayConfig = {
            ...configRef.current,
            ...loaded,
            stripe: { ...configRef.current.stripe, ...(loaded.stripe || {}) },
            paypal: { ...configRef.current.paypal, ...(loaded.paypal || {}) },
            manualSettlement: { ...configRef.current.manualSettlement, ...(loaded.manualSettlement || {}) }
          };
          setConfig(merged);
          configRef.current = merged;
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.warn('[Payment Gateway] Using offline configuration state:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    document.title = `${tr('paymentGatewayTitle', 'Payment Gateway')} - Admin`;
    loadGatewayData();

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleDebouncedSync = () => {
      if (isSavingRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!isSavingRef.current) {
          loadGatewayData();
        }
      }, 350);
    };

    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_payment_gateway_updated', handleDebouncedSync);
    window.addEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
    window.addEventListener('zecratary_languages_updated', handleDebouncedSync);
    window.addEventListener('zecratary_locale_changed', handleDebouncedSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_gateway_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_languages_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_locale_changed', handleDebouncedSync);
    };
  }, [loadGatewayData, tr]);

  const handleCopyCliCommand = (cmd: string, key: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(cmd);
      setCopiedCliKey(key);
      setTimeout(() => setCopiedCliKey(null), 2500);
    }
  };

  const handleToggleGateway = async (gatewayKey: 'stripe' | 'paypal' | 'manualSettlement') => {
    if (isSavingRef.current || togglingGateway) return;

    const currentVal = gatewayKey === 'stripe' 
      ? config.stripe.enabled 
      : gatewayKey === 'paypal' 
      ? config.paypal.enabled 
      : config.manualSettlement.enabled;
    const nextVal = !currentVal;

    const updatedConfig: GatewayConfig = {
      ...config,
      stripe: gatewayKey === 'stripe' ? { ...config.stripe, enabled: nextVal } : config.stripe,
      paypal: gatewayKey === 'paypal' ? { ...config.paypal, enabled: nextVal } : config.paypal,
      manualSettlement: gatewayKey === 'manualSettlement' ? { ...config.manualSettlement, enabled: nextVal } : config.manualSettlement,
    };

    setConfig(updatedConfig);
    configRef.current = updatedConfig;
    setTogglingGateway(gatewayKey);
    isSavingRef.current = true;

    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_gateway',
          gateway: gatewayKey,
          enabled: nextVal,
          gatewayConfig: updatedConfig
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        broadcastSyncEvents();
        setFeedback({
          type: 'success',
          msg: `${gatewayKey} gateway ${nextVal ? 'enabled' : 'disabled'} and saved successfully!`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: `Failed to toggle: ${err.message}` });
    } finally {
      setTogglingGateway(null);
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    const updatedConfig: GatewayConfig = {
      ...config,
      currency: newCurrency,
    };
    setConfig(updatedConfig);
    configRef.current = updatedConfig;

    isSavingRef.current = true;
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          currency: newCurrency,
          gatewayConfig: updatedConfig
        }),
      });
      if (res.ok) {
        broadcastSyncEvents();
        setFeedback({
          type: 'success',
          msg: `Processing currency updated to ${newCurrency} (${getCurrencySymbol(newCurrency)})!`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  const handleToggleTestMode = async () => {
    const nextMode = !config.testMode;
    const updatedConfig: GatewayConfig = {
      ...config,
      testMode: nextMode,
      stripeKeysVerified: false,
      stripeWebhookVerified: false,
    };
    setConfig(updatedConfig);
    configRef.current = updatedConfig;

    isSavingRef.current = true;
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          gatewayConfig: updatedConfig
        }),
      });
      if (res.ok) {
        broadcastSyncEvents();
        setFeedback({
          type: 'success',
          msg: nextMode ? 'Sandbox (Test Mode) enabled!' : 'Live Production mode enabled!',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  const handleVerifyWebhookSecret = async () => {
    const secret = config.stripe.webhookSecret?.trim();
    if (!secret) {
      setFeedback({ type: 'error', msg: 'Please enter a Webhook Signing Secret (whsec_...) to verify.' });
      return;
    }

    setVerifyingWebhook(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_webhook_secret', webhookSecret: secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const updated = { ...config, stripeWebhookVerified: true };
        setConfig(updated);
        configRef.current = updated;
        setFeedback({ type: 'success', msg: data.message });
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Verification failed.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message });
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const handleVerifyStripeKey = async () => {
    const pKey = config.stripe.publishableKey?.trim();
    const sKey = config.stripe.secretKey?.trim();
    const wSecret = config.stripe.webhookSecret?.trim();

    if (!pKey || !sKey || !wSecret) {
      setShowStripeGuideModal(true);
      setFeedback({ type: 'error', msg: 'Verification requires Publishable Key, Secret Key, and Webhook Secret.' });
      return;
    }

    setVerifyingStripe(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_stripe_keys',
          publishableKey: pKey,
          secretKey: sKey,
          webhookSecret: wSecret,
          testMode: config.testMode
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const updated = { ...config, stripeKeysVerified: true, stripeWebhookVerified: true };
        setConfig(updated);
        configRef.current = updated;
        setFeedback({ type: 'success', msg: data.message });
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Stripe key verification failed.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message });
    } finally {
      setVerifyingStripe(false);
    }
  };

  const handleSyncFromEnv = async () => {
    setSyncingEnv(true);
    try {
      const res = await fetch('/api/admin/payment-gateway?action=sync_env&t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.envConfig) {
        setConfig(prev => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            publishableKey: data.envConfig.STRIPE_PUBLISHABLE_KEY || prev.stripe.publishableKey,
            secretKey: data.envConfig.STRIPE_SECRET_KEY || prev.stripe.secretKey,
            webhookSecret: data.envConfig.STRIPE_WEBHOOK_SECRET || prev.stripe.webhookSecret
          },
          paypal: {
            ...prev.paypal,
            clientId: data.envConfig.PAYPAL_CLIENT_ID || prev.paypal.clientId,
            clientSecret: data.envConfig.PAYPAL_CLIENT_SECRET || prev.paypal.clientSecret,
            webhookId: data.envConfig.PAYPAL_WEBHOOK_ID || prev.paypal.webhookId
          }
        }));
        broadcastSyncEvents();
        setFeedback({ type: 'success', msg: 'Credentials synchronized from server .env file successfully!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSyncingEnv(false);
    }
  };

  const handleUpdateEnv = async () => {
    setUpdatingEnv(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_env', gatewayConfig: config })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setFeedback({ type: 'success', msg: 'Server .env file updated with gateway credentials!' });
      } else {
        throw new Error(data.error || 'Failed to update .env');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setUpdatingEnv(false);
    }
  };

  const handleSaveSettings = async (e?: React.SyntheticEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (loading || isSavingRef.current) return;

    setLoading(true);
    isSavingRef.current = true;

    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_settings', gatewayConfig: config }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        broadcastSyncEvents();
        setFeedback({ type: 'success', msg: 'Payment gateway settings saved successfully!' });
      } else {
        throw new Error(data.error || 'Failed to save settings.');
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Error saving settings.' });
    } finally {
      setLoading(false);
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. HEADER & TOP NAV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Sliders className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            {tr('paymentGatewayTitle', 'Payment Gateway')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('paymentGatewaySubtitle', 'Configure payment processing gateways, Stripe & PayPal API credentials, webhook endpoints, and processing currencies.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncFromEnv}
            disabled={syncingEnv}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <DownloadCloud className={`h-4 w-4 ${syncingEnv ? 'animate-bounce' : ''}`} />
            <span>{syncingEnv ? tr('syncingEnv', 'Syncing .env...') : tr('syncFromEnvBtn', 'Sync from .env')}</span>
          </button>

          <button
            type="button"
            onClick={handleUpdateEnv}
            disabled={updatingEnv}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <UploadCloud className={`h-4 w-4 ${updatingEnv ? 'animate-bounce' : ''}`} />
            <span>{updatingEnv ? tr('writingEnv', 'Writing .env...') : tr('updateEnvBtn', 'Update .env File')}</span>
          </button>

          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {tr('managePlans', 'Manage Plans')}
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
            color: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* 2. GATEWAY ENGINE MONITOR SUMMARY BAR */}
      <div
        className="p-3.5 px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text)' }}>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> {tr('gatewayEngine', 'Gateway Engine')}
          </span>
          <span 
            className="font-extrabold uppercase px-2.5 py-0.5 rounded text-[11px] border"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {config.activeGateway}
          </span>
          <span 
            className="font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald, #10b981)',
              color: config.testMode ? '#fbbf24' : 'var(--color-emerald, #10b981)'
            }}
          >
            {config.testMode ? tr('sandboxTest', 'Sandbox Test') : tr('liveProduction', 'Live Production')}
          </span>
        </div>

        <div className="flex items-center gap-4 font-semibold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          <div>
            {tr('currencyLabel', 'Currency:')} <span className="font-bold" style={{ color: 'var(--color-text)' }}>{config.currency} ({activeCurrencySymbol})</span>
          </div>
          <div>
            {tr('stripeKeysLabel', 'Stripe Keys:')}{' '}
            <span 
              className="font-bold" 
              style={{ color: (config.stripeKeysVerified && config.stripeWebhookVerified) ? 'var(--color-emerald, #10b981)' : 'var(--color-text-secondary)' }}
            >
              {(config.stripeKeysVerified && config.stripeWebhookVerified) ? tr('verifiedStatus', 'Verified') : tr('unverifiedStatus', 'Unverified')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. GATEWAY SETTINGS CONTAINER */}
      <div className="space-y-6">
        {/* Processing Currency Card */}
        <div 
          className="border p-6 rounded-3xl shadow-sm transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {tr('processingCurrencyTitle', 'Processing Currency')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('processingCurrencySub', 'Select the default currency for processing subscriptions and recording transactions.')}
              </p>
            </div>

            <div className="w-full sm:w-80">
              <select
                value={config.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full border rounded-xl p-3 text-xs font-bold outline-none cursor-pointer shadow-xs"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Default Gateway Selector Card */}
        <div 
          className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {tr('defaultGatewayTitle', 'Default Payment Gateway')}
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>{tr('environmentLabel', 'Environment:')}</label>
              <button
                type="button"
                onClick={handleToggleTestMode}
                className="text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald, #10b981)',
                  color: config.testMode ? '#fbbf24' : 'var(--color-emerald, #10b981)'
                }}
              >
                {config.testMode ? tr('sandboxTestMode', 'Sandbox (Test Mode)') : tr('liveProduction', 'Live Production')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {[
              { id: 'stripe', title: 'Stripe', desc: tr('stripeCardDesc', 'Accept credit cards securely via Stripe Checkout and webhooks.') },
              { id: 'paypal', title: 'PayPal', desc: tr('paypalCardDesc', 'Accept digital wallet and PayPal account balance payments.') },
              { id: 'both', title: tr('multiGatewayCardTitle', 'Both Gateways'), desc: tr('multiGatewayCardDesc', 'Enable both Stripe and PayPal checkout options simultaneously.') }
            ].map(gw => (
              <div
                key={gw.id}
                onClick={() => setConfig({ ...config, activeGateway: gw.id as any })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  config.activeGateway === gw.id ? 'shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.activeGateway === gw.id ? 'var(--color-primary)' : 'var(--color-border)'
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>{gw.title}</span>
                    {config.activeGateway === gw.id && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {gw.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stripe Config */}
          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{tr('stripeApiConfig', 'Stripe API Configuration')}</h3>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="text-[11px] font-bold tracking-tight select-none"
                  style={{ color: config.stripe.enabled ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                >
                  {config.stripe.enabled ? tr('enabled', 'Enabled') : tr('disabled', 'Disabled')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.stripe.enabled}
                  disabled={togglingGateway === 'stripe'}
                  onClick={() => handleToggleGateway('stripe')}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300"
                  style={{ backgroundColor: config.stripe.enabled ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ${
                      config.stripe.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pb-2">
              <label className="text-xs font-bold block" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('verifyStripeKeyLabel', 'Verify Stripe Key')}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleVerifyStripeKey}
                  disabled={verifyingStripe}
                  className="inline-flex items-center rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: '#635bff' }}
                >
                  <div className="px-3 py-2.5 bg-black/15 border-r border-white/20 font-black text-sm flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="px-3.5 py-2.5 text-xs font-bold flex items-center gap-1.5">
                    {verifyingStripe ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        {tr('verifyingStripeKey', 'Verifying Stripe Keys...')}
                      </>
                    ) : (
                      tr('verifyStripeKey', 'Verify Stripe Key')
                    )}
                  </span>
                </button>

                {(config.stripeKeysVerified && config.stripeWebhookVerified) && (
                  <span 
                    className="text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 border shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-emerald, #10b981)',
                      color: 'var(--color-emerald, #10b981)'
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} /> {tr('keysVerifiedStatus', 'Keys & Webhook Verified')}
                  </span>
                )}
              </div>
            </div>

            {config.testMode && (
              <div 
                className="p-3.5 rounded-2xl border space-y-1.5 shadow-xs"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
                    <CreditCard className="h-3.5 w-3.5" />
                    {tr('stripeTestCardGuide', 'Stripe Test Card Helper')}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                    {tr('sandboxActiveBadge', 'Sandbox Active')}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('testCardInstructions', 'Use card number')} <code className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>4242 4242 4242 4242</code>, {tr('anyFutureExpiry', 'any future MM/YY (e.g. 12/28), and any 3-digit CVC (e.g. 123).')}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('publishableKeyLabel', 'Publishable Key')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['stripePublishable'] ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={config.stripe.publishableKey}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, publishableKey: e.target.value } })}
                    placeholder="pk_test_... / pk_live_..."
                    className="w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripePublishable')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60"
                  >
                    {visibleFields['stripePublishable'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('secretKeyLabel', 'Secret Key')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['stripeSecret'] ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={config.stripe.secretKey}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, secretKey: e.target.value } })}
                    placeholder="sk_test_... / sk_live_..."
                    className="w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripeSecret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60"
                  >
                    {visibleFields['stripeSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-bold block" style={{ color: 'var(--color-text-secondary)' }}>
                    {tr('webhookSecretLabel', 'Webhook Secret')}
                  </label>
                  <button
                    type="button"
                    onClick={handleVerifyWebhookSecret}
                    disabled={verifyingWebhook || !config.stripe.webhookSecret?.trim()}
                    className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>{tr('verifySecretBtn', 'Verify Secret')}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={visibleFields['stripeWebhook'] ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={config.stripe.webhookSecret}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                    placeholder="whsec_..."
                    className="w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripeWebhook')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60"
                  >
                    {visibleFields['stripeWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {tr('webhookCliSetupTitle', 'Webhook & CLI Setup Guide')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowStripeGuideModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Terminal className="h-3.5 w-3.5 text-amber-500" />
                  <span>{tr('cliGuideBtn', 'CLI & Webhook Guide')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* PayPal Config */}
          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{tr('paypalApiConfig', 'PayPal API Configuration')}</h3>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="text-[11px] font-bold tracking-tight select-none"
                  style={{ color: config.paypal.enabled ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                >
                  {config.paypal.enabled ? tr('enabled', 'Enabled') : tr('disabled', 'Disabled')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.paypal.enabled}
                  disabled={togglingGateway === 'paypal'}
                  onClick={() => handleToggleGateway('paypal')}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300"
                  style={{ backgroundColor: config.paypal.enabled ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ${
                      config.paypal.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('clientIdLabel', 'Client ID')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['paypalClientId'] ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={config.paypal.clientId}
                    onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                    placeholder="PayPal Client ID"
                    className="w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('paypalClientId')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60"
                  >
                    {visibleFields['paypalClientId'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('clientSecretLabel', 'Client Secret')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['paypalSecret'] ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={config.paypal.clientSecret}
                    onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientSecret: e.target.value } })}
                    placeholder="PayPal Client Secret"
                    className="w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('paypalSecret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60"
                  >
                    {visibleFields['paypalSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('webhookIdLabel', 'Webhook ID')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['paypalWebhook'] ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={config.paypal.webhookId}
                    onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, webhookId: e.target.value } })}
                    placeholder="PayPal Webhook ID"
                    className="w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('paypalWebhook')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60"
                  >
                    {visibleFields['paypalWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. MANUAL BANK SETTLEMENT CARD */}
        <div 
          className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                  {tr('manualSettlementHeading', 'Manual Bank Settlement Settings')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('manualSettlementDesc', 'Configure offline direct bank transfers, PromptPay, and manual wire verification workflows.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className="text-[11px] font-bold tracking-tight select-none"
                style={{ color: config.manualSettlement.enabled ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              >
                {config.manualSettlement.enabled ? tr('enabled', 'Enabled') : tr('disabled', 'Disabled')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.manualSettlement.enabled}
                disabled={togglingGateway === 'manualSettlement'}
                onClick={() => handleToggleGateway('manualSettlement')}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300"
                style={{ backgroundColor: config.manualSettlement.enabled ? 'var(--color-primary)' : 'var(--color-border)' }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ${
                    config.manualSettlement.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('manualBankName', 'Bank / Provider Name')}
              </label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                value={config.manualSettlement.bankName}
                onChange={(e) => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, bankName: e.target.value }
                })}
                placeholder="e.g. Bangkok Bank"
                className="w-full border rounded-xl p-2.5 outline-none font-bold"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('manualAccountHolder', 'Account Holder Name')}
              </label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                value={config.manualSettlement.accountHolder}
                onChange={(e) => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, accountHolder: e.target.value }
                })}
                placeholder="Zecratary Innovations Co., Ltd."
                className="w-full border rounded-xl p-2.5 outline-none font-bold"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                {tr('manualAccountNumber', 'Account / IBAN Number')}
              </label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                value={config.manualSettlement.accountNumber}
                onChange={(e) => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, accountNumber: e.target.value }
                })}
                placeholder="123-4-56789-0"
                className="w-full border rounded-xl p-2.5 font-mono font-bold outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={loadGatewayData}
            className="px-4 py-3 border font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw className="h-4 w-4" /> {tr('resetConfigBtn', 'Reset Config')}
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-8 py-3 text-white font-bold rounded-2xl transition text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Save className="h-4 w-4" />
            {loading ? tr('savingSettings', 'Saving Settings...') : tr('saveConfigBtn', 'Save Gateway Settings')}
          </button>
        </div>
      </div>

      {/* STRIPE CONNECTION & WEBHOOK SETUP GUIDE MODAL */}
      {showStripeGuideModal && (
        <div 
          onClick={() => setShowStripeGuideModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[#635bff]" />
                <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {tr('stripeConnectModalTitle', 'Connect Stripe & Webhooks')}
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setShowStripeGuideModal(false)}
                className="p-1.5 rounded-xl transition cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--color-inner-dark)', color: 'var(--color-text)' }}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {tr('stripeConnectModalSub', 'To connect Stripe webhooks and test payments with your local server, follow the official recommended Stripe CLI setup below.')}
            </p>

            {/* Method 1: CLI */}
            <div 
              className="p-5 rounded-2xl border space-y-3"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                  {tr('method1Title', 'Method 1: Use the Official Stripe CLI (Recommended)')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {tr('recommendedBadge', 'Recommended')}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold opacity-80 block">1. {tr('step1Title', 'Install the CLI:')}</span>
                <div className="p-2.5 rounded-xl border flex items-center justify-between font-mono text-[11px]" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <span>brew install stripe/stripe-cli/stripe</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCliCommand('brew install stripe/stripe-cli/stripe', 'cli_install')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {copiedCliKey === 'cli_install' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold opacity-80 block">2. {tr('step2Title', 'Log in:')}</span>
                <div className="p-2.5 rounded-xl border flex items-center justify-between font-mono text-[11px]" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <span>stripe login</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCliCommand('stripe login', 'cli_login')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {copiedCliKey === 'cli_login' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold opacity-80 block">3. {tr('step3Title', 'Forward events:')}</span>
                <div className="p-2.5 rounded-xl border flex items-center justify-between font-mono text-[11px]" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <span className="truncate">stripe listen --forward-to {(webhookEndpointUrl || 'localhost:3000/api/webhooks/stripe').replace(/^https?:\/\//, '')}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCliCommand(`stripe listen --forward-to ${(webhookEndpointUrl || 'localhost:3000/api/webhooks/stripe').replace(/^https?:\/\//, '')}`, 'cli_listen')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {copiedCliKey === 'cli_listen' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Links */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border text-xs" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
              <div>
                <span className="font-bold block" style={{ color: 'var(--color-text)' }}>{tr('method2Title', 'Production / Dashboard API Keys')}</span>
                <span className="text-[11px] opacity-70">{tr('method2Desc', 'Retrieve your Secret Key and Publishable Key directly from your Stripe Dashboard.')}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://dashboard.stripe.com/test/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{tr('openApiKeysBtn', 'Stripe API Keys')}</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowStripeGuideModal(false)}
                className="px-4 py-2 border font-bold rounded-xl text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {tr('closeBtn', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
