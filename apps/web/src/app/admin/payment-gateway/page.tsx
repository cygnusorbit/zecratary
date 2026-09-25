'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Check, Eye, EyeOff, Globe, Zap, Sliders,
  ShieldCheck, Terminal, ExternalLink, Code2, AlertTriangle,
  Activity, CheckCheck
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

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
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);
  const version = langContext?.version;

  const [loading, setLoading] = useState(false);
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [showStripeGuideModal, setShowStripeGuideModal] = useState(false);
  const [copiedCliKey, setCopiedCliKey] = useState<string | null>(null);
  const [webhookEndpointUrl, setWebhookEndpointUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Gateway Settings State
  const [config, setConfig] = useState<GatewayConfig>({
    activeGateway: 'stripe',
    currency: 'USD',
    testMode: true,
    stripeConnected: false,
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
  });

  const configRef = useRef<GatewayConfig>(config);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Theme Synchronization
  const handleModeChange = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const root = typeof document !== 'undefined' ? document.documentElement : null;
      const day = mode === 'light' || mode === 'day' || (root && root.classList.contains('light'));
      setIsDayMode(Boolean(day));
    } catch (_) {}
  }, []);

  useEffect(() => {
    handleModeChange();
    window.addEventListener('zecratary_theme_mode_changed', handleModeChange);
    window.addEventListener('zecratary_theme_changed', handleModeChange);
    window.addEventListener('storage', handleModeChange);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleModeChange);
      window.removeEventListener('zecratary_theme_changed', handleModeChange);
      window.removeEventListener('storage', handleModeChange);
    };
  }, [handleModeChange]);

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

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    purgeLegacyBrowserAdminStorage();
    try {
      const res = await fetch('/api/admin/payment?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const merged = { ...configRef.current, ...data.settings };
          if (JSON.stringify(configRef.current) !== JSON.stringify(merged)) {
            configRef.current = merged;
            setConfig(merged);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load server payment gateway data:', e);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    document.title = `${t('paymentGatewayTitle', 'Payment Gateway')} - Admin`;
    fetchDataRef.current();

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleDebouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchDataRef.current();
      }, 300);
    };

    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_admin_settings_updated', handleDebouncedSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
    };
  }, [t, version]);

  const handleCopyCliCommand = (cmd: string, key: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(cmd);
      setCopiedCliKey(key);
      setTimeout(() => setCopiedCliKey(null), 2500);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookEndpointUrl(`${window.location.origin}/api/webhooks/stripe`);
    }
  }, []);

  const handleCurrencyChange = async (newCurrency: string) => {
    const updatedConfig: GatewayConfig = {
      ...config,
      currency: newCurrency,
    };
    setConfig(updatedConfig);
    configRef.current = updatedConfig;

    await persistServerAdminSettings({ currency: newCurrency, paymentSettings: updatedConfig });
    try {
      await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: `Processing currency updated to ${newCurrency} (${getCurrencySymbol(newCurrency)}) and saved to server!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: `Failed to persist currency: ${err.message || 'Server error'}`,
      });
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

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_test_mode', testMode: nextMode }),
      });
      await persistServerAdminSettings({ paymentSettings: updatedConfig });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setFeedback({
        type: 'success',
        msg: nextMode
          ? t('sandboxTestModeEnabled', 'Sandbox (Test Mode) enabled and saved to server!')
          : t('liveProductionModeEnabled', 'Live Production mode enabled and saved to server!'),
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to update gateway environment.',
      });
    }
  };

  const handleVerifyWebhookSecret = async () => {
    const secret = config.stripe.webhookSecret?.trim();
    if (!secret) {
      setFeedback({
        type: 'error',
        msg: t('webhookSecretRequiredToVerify', 'Please enter a Webhook Signing Secret (whsec_...) to verify.'),
      });
      return;
    }

    setVerifyingWebhook(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_webhook_secret',
          webhookSecret: secret,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const updated: GatewayConfig = { 
          ...config, 
          stripeWebhookVerified: true 
        };
        setConfig(updated);
        configRef.current = updated;
        await persistServerAdminSettings({ paymentSettings: updated });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        }
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('webhookSecretVerifiedSuccess', 'Stripe Webhook Signing Secret verified and confirmed for HMAC signatures!'),
        });
      } else {
        const updated: GatewayConfig = { 
          ...config, 
          stripeWebhookVerified: false 
        };
        setConfig(updated);
        configRef.current = updated;
        setFeedback({ 
          type: 'error', 
          msg: data.error || t('webhookSecretVerificationFailed', 'Webhook Secret verification failed. Must start with "whsec_" and be a valid HMAC key.'),
        });
      }
    } catch (e: any) {
      setFeedback({ 
        type: 'error', 
        msg: e.message || 'Failed to communicate with webhook verification endpoint.',
      });
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const handleVerifyStripeKey = async () => {
    const pKey = config.stripe.publishableKey?.trim();
    const sKey = config.stripe.secretKey?.trim();
    const wSecret = config.stripe.webhookSecret?.trim();

    if (!pKey || !sKey || !wSecret) {
      if (!pKey && !sKey && !wSecret) {
        setShowStripeGuideModal(true);
      }
      const missing: string[] = [];
      if (!pKey) missing.push(t('publishableKeyLabel', 'Publishable Key'));
      if (!sKey) missing.push(t('secretKeyLabel', 'Secret Key'));
      if (!wSecret) missing.push(t('webhookSecretLabel', 'Webhook Secret'));

      setFeedback({
        type: 'error',
        msg: t('stripeAllThreeRequired', `Verification required: Please enter ${missing.join(', ')} to verify.`),
      });
      return;
    }

    setVerifyingStripe(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_stripe_keys',
          publishableKey: pKey,
          secretKey: sKey,
          webhookSecret: wSecret,
          stripe: config.stripe,
          testMode: config.testMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const updated: GatewayConfig = { 
          ...config, 
          stripeKeysVerified: true,
          stripeWebhookVerified: true,
        };
        setConfig(updated);
        configRef.current = updated;
        await persistServerAdminSettings({ paymentSettings: updated });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        }
        setFeedback({ 
          type: 'success', 
          msg: data.message || t('stripeKeyVerifiedSuccess', 'Publishable Key, Secret Key, and Webhook Secret verified successfully with Stripe servers!'),
        });
      } else {
        const updated: GatewayConfig = { 
          ...config, 
          stripeKeysVerified: false,
          stripeWebhookVerified: false,
        };
        setConfig(updated);
        configRef.current = updated;
        setFeedback({ 
          type: 'error', 
          msg: data.error || t('stripeKeyVerificationFailed', 'Stripe verification failed. Please check your Publishable Key, Secret Key, and Webhook Secret.'),
        });
      }
    } catch (e: any) {
      setFeedback({ 
        type: 'error', 
        msg: e.message || t('failedToVerifyStripeKeys', 'Failed to communicate with Stripe verification endpoint.'),
      });
    } finally {
      setVerifyingStripe(false);
    }
  };

  const handleSaveSettings = async (e?: React.SyntheticEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const updatedConfig: GatewayConfig = { ...config };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      const data = await res.json();

      await persistServerAdminSettings({
        paymentSettings: updatedConfig,
        currency: updatedConfig.currency
      });

      if (data.success) {
        setConfig(updatedConfig);
        configRef.current = updatedConfig;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        }
        setFeedback({ type: 'success', msg: t('gatewaySettingsSavedSuccess', 'Payment gateway settings and currency saved successfully to server!') });
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save gateway settings.' });
      }
    } catch (e: any) {
      await persistServerAdminSettings({
        paymentSettings: updatedConfig,
        currency: updatedConfig.currency
      });
      setConfig(updatedConfig);
      configRef.current = updatedConfig;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }
      setFeedback({ type: 'success', msg: t('gatewaySettingsSavedSuccess', 'Payment gateway settings saved to server.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .payment-input:-webkit-autofill,
        .payment-input:-webkit-autofill:hover,
        .payment-input:-webkit-autofill:focus,
        .payment-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          box-shadow: 0 0 0 1000px var(--color-inner-dark) inset !important;
          -webkit-text-fill-color: var(--color-text) !important;
          caret-color: var(--color-text) !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }

        .payment-input[type="date"],
        input[type="date"].payment-input {
          color-scheme: ${isDayMode ? 'light' : 'dark'};
        }
      `}} />

      {/* HEADER & TOP NAV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)] flex items-center gap-2">
            <Sliders className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            {t('paymentGatewayTitle', 'Payment Gateway')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('paymentGatewaySubtitle', 'Configure payment processing gateways, Stripe & PayPal API credentials, webhook endpoints, and processing currencies.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('managePlans', 'Manage Plans')}
          </Link>
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

      {/* GATEWAY ENGINE MONITOR SUMMARY BAR */}
      <div
        className="p-3 px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text)' }}>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> {t('gatewayEngine', 'Gateway Engine')}
          </span>
          <span 
            className="font-extrabold uppercase px-2.5 py-0.5 rounded text-[11px] border"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            {config.activeGateway}
          </span>
          <span 
            className="font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald)',
              color: config.testMode ? '#fbbf24' : 'var(--color-emerald)'
            }}
          >
            {config.testMode ? t('sandboxTest', 'Sandbox Test') : t('liveProduction', 'Live Production')}
          </span>
        </div>

        <div className="flex items-center gap-4 font-semibold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          <div>
            {t('currencyLabel', 'Currency:')} <span className="font-bold" style={{ color: 'var(--color-text)' }}>{config.currency} ({activeCurrencySymbol})</span>
          </div>
          <div>
            {t('stripeKeysLabel', 'Stripe Keys:')}{' '}
            <span 
              className="font-bold" 
              style={{ color: (config.stripeKeysVerified && config.stripeWebhookVerified) ? 'var(--color-emerald)' : 'var(--color-text-secondary)' }}
            >
              {(config.stripeKeysVerified && config.stripeWebhookVerified) ? t('verifiedStatus', 'Verified') : t('unverifiedStatus', 'Unverified')}
            </span>
          </div>
        </div>
      </div>

      {/* GATEWAY SETTINGS CONTAINER */}
      <div className="space-y-6">
        {/* Processing Currency Card */}
        <div 
          className="border p-6 rounded-3xl shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('processingCurrencyTitle', 'Processing Currency')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('processingCurrencySub', 'Select the default currency for processing subscriptions and recording transactions.')}
              </p>
            </div>

            <div className="w-full sm:w-80">
              <select
                value={config.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="payment-input w-full border rounded-xl p-3 text-xs font-bold outline-none transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
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
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('defaultGatewayTitle', 'Default Payment Gateway')}
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('environmentLabel', 'Environment:')}</label>
              <button
                type="button"
                onClick={handleToggleTestMode}
                className="text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald)',
                  color: config.testMode ? '#fbbf24' : 'var(--color-emerald)'
                }}
              >
                {config.testMode ? t('sandboxTestMode', 'Sandbox (Test Mode)') : t('liveProduction', 'Live Production')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div
              onClick={() => setConfig({ ...config, activeGateway: 'stripe' })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                config.activeGateway === 'stripe' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: config.activeGateway === 'stripe' ? 'var(--color-primary)' : 'var(--color-border)'
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>Stripe</span>
                  {config.activeGateway === 'stripe' && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('stripeCardDesc', 'Accept credit cards securely via Stripe Checkout and webhooks.')}
                </p>
              </div>
            </div>

            <div
              onClick={() => setConfig({ ...config, activeGateway: 'paypal' })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                config.activeGateway === 'paypal' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: config.activeGateway === 'paypal' ? 'var(--color-primary)' : 'var(--color-border)'
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>PayPal</span>
                  {config.activeGateway === 'paypal' && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('paypalCardDesc', 'Accept digital wallet and PayPal account balance payments.')}
                </p>
              </div>
            </div>

            <div
              onClick={() => setConfig({ ...config, activeGateway: 'both' })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                config.activeGateway === 'both' ? 'shadow-md' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: config.activeGateway === 'both' ? 'var(--color-primary)' : 'var(--color-border)'
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black" style={{ color: 'var(--color-text)' }}>
                    {t('multiGatewayCardTitle', 'Both Gateways')}
                  </span>
                  {config.activeGateway === 'both' && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('multiGatewayCardDesc', 'Enable both Stripe and PayPal checkout options simultaneously.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stripe Config */}
          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t('stripeApiConfig', 'Stripe API Configuration')}</h3>
              </div>
              <input
                type="checkbox"
                checked={config.stripe.enabled}
                onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, enabled: e.target.checked } })}
                className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
              />
            </div>

            <div className="space-y-1.5 pb-2">
              <label className="text-xs font-bold block" style={{ color: 'var(--color-text-secondary)' }}>
                {t('verifyStripeKeyLabel', 'Verify Stripe Key')}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleVerifyStripeKey}
                  disabled={verifyingStripe}
                  className="inline-flex items-center overflow-hidden rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition cursor-pointer border border-[#7a73ff]/40 disabled:opacity-50"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #635bff 0%, #4f46e5 100%)',
                    boxShadow: '0 2px 5px rgba(99, 91, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                  title={t('verifyStripeKeyTooltip', 'Verify Publishable Key, Secret Key, and Webhook Secret with Stripe servers')}
                >
                  <div className="px-3 py-2.5 bg-black/15 border-r border-white/20 font-black text-sm flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="px-3.5 py-2.5 text-xs tracking-tight font-bold flex items-center gap-1.5">
                    {verifyingStripe ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        {t('verifyingStripeKey', 'Verifying Stripe Keys...')}
                      </>
                    ) : (
                      t('verifyStripeKey', 'Verify Stripe Key')
                    )}
                  </span>
                </button>

                {(config.stripeKeysVerified && config.stripeWebhookVerified) ? (
                  <span 
                    className="text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 border shadow-xs animate-in fade-in"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-emerald)',
                      color: 'var(--color-emerald)'
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} /> {t('keysVerifiedStatus', 'Keys & Webhook Verified')}
                  </span>
                ) : config.stripeKeysVerified ? (
                  <span 
                    className="text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 border shadow-xs animate-in fade-in"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: '#f59e0b',
                      color: '#fbbf24'
                    }}
                  >
                    <Check className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} /> {t('keysOnlyVerifiedStatus', 'API Keys Verified (Webhook Pending)')}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {config.stripe.enabled && (
                <div className="space-y-2 pt-1">
                  {config.testMode && config.stripe.secretKey && !config.stripe.secretKey.startsWith('sk_test_') && (
                    <div 
                      className="p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold shadow-xs animate-in fade-in"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: '#f59e0b',
                        color: '#fbbf24'
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <div className="font-bold">{t('testKeyMismatchTitle', 'Stripe Test Mode Key Alert')}</div>
                        <div className="text-[11px] font-normal leading-relaxed" style={{ color: 'var(--color-text)' }}>
                          {t('testKeyMismatchNotice', 'Sandbox Test Mode is active, but your Secret Key does not start with "sk_test_". Payments and test cards will be rejected by Stripe until valid test keys are entered.')}
                        </div>
                      </div>
                    </div>
                  )}

                  {!config.testMode && config.stripe.secretKey && config.stripe.secretKey.startsWith('sk_test_') && (
                    <div 
                      className="p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold shadow-xs animate-in fade-in"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: '#ef4444',
                        color: '#ef4444'
                      }}
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <div className="font-bold">{t('liveKeyMismatchTitle', 'Live Mode Key Alert')}</div>
                        <div className="text-[11px] font-normal leading-relaxed" style={{ color: 'var(--color-text)' }}>
                          {t('liveKeyMismatchNotice', 'Live Production Mode is active, but your Secret Key is a test key ("sk_test_..."). Real customer credit cards will be declined.')}
                        </div>
                      </div>
                    </div>
                  )}

                  {config.testMode && (
                    <div 
                      className="p-3.5 rounded-2xl border space-y-1.5 transition-colors shadow-xs"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
                          <CreditCard className="h-3.5 w-3.5" />
                          {t('stripeTestCardGuide', 'Stripe Test Card Helper')}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          {t('sandboxActiveBadge', 'Sandbox Active')}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('testCardInstructions', 'Use card number')} <code className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>4242 4242 4242 4242</code>, {t('anyFutureExpiry', 'any future MM/YY (e.g. 12/28), and any 3-digit CVC (e.g. 123).')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('publishableKeyLabel', 'Publishable Key')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['stripePublishable'] ? 'text' : 'password'}
                    id="cfg_stripe_publishable_key"
                    name="cfg_stripe_publishable_key"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={config.stripe.publishableKey}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, publishableKey: e.target.value } })}
                    placeholder="pk_test_... / pk_live_..."
                    className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripePublishable')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {visibleFields['stripePublishable'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('secretKeyLabel', 'Secret Key')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['stripeSecret'] ? 'text' : 'password'}
                    id="cfg_stripe_secret_key"
                    name="cfg_stripe_secret_key"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={config.stripe.secretKey}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, secretKey: e.target.value } })}
                    placeholder="sk_test_... / sk_live_..."
                    className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripeSecret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {visibleFields['stripeSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-bold block" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('webhookSecretLabel', 'Webhook Secret')}
                  </label>
                  <div className="flex items-center gap-2">
                    {config.stripeWebhookVerified && (
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-xs animate-in fade-in"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-emerald)',
                          color: 'var(--color-emerald)'
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--color-emerald)' }} /> {t('signingSecretVerified', 'Signing Secret Verified')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleVerifyWebhookSecret}
                      disabled={verifyingWebhook || !config.stripe.webhookSecret?.trim()}
                      className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t('verifyWebhookSecretTooltip', 'Test Webhook Secret for HMAC-SHA256 signature compliance')}
                    >
                      {verifyingWebhook ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>{t('verifyingSecret', 'Verifying...')}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          <span>{t('verifySecretBtn', 'Verify Secret')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={visibleFields['stripeWebhook'] ? 'text' : 'password'}
                    id="cfg_stripe_webhook_secret"
                    name="cfg_stripe_webhook_secret"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={config.stripe.webhookSecret}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                    placeholder="whsec_..."
                    className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripeWebhook')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {visibleFields['stripeWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CLI & Webhook Guide Action */}
              <div 
                className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
                    {t('webhookCliSetupTitle', 'Webhook & CLI Setup Guide')}
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('webhookCliSetupSub', 'View official Stripe CLI instructions to test and capture webhooks locally.')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStripeGuideModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs hover:border-blue-400 shrink-0"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  title={t('viewStripeCliGuideTooltip', 'View Stripe CLI & Webhook Setup instructions')}
                >
                  <Terminal className="h-3.5 w-3.5 text-amber-500" />
                  <span>{t('cliGuideBtn', 'CLI & Webhook Guide')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* PayPal Config */}
          <div 
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{t('paypalApiConfig', 'PayPal API Configuration')}</h3>
              </div>
              <input
                type="checkbox"
                checked={config.paypal.enabled}
                onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, enabled: e.target.checked } })}
                className="w-4 h-4 rounded cursor-pointer accent-[#E05638]"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('clientIdLabel', 'Client ID')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['paypalClientId'] ? 'text' : 'password'}
                    id="cfg_paypal_client_id"
                    name="cfg_paypal_client_id"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={config.paypal.clientId}
                    onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                    placeholder="PayPal Client ID"
                    className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('paypalClientId')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {visibleFields['paypalClientId'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('clientSecretLabel', 'Client Secret')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['paypalSecret'] ? 'text' : 'password'}
                    id="cfg_paypal_secret_key"
                    name="cfg_paypal_secret_key"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={config.paypal.clientSecret}
                    onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientSecret: e.target.value } })}
                    placeholder="PayPal Client Secret"
                    className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('paypalSecret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {visibleFields['paypalSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('webhookIdLabel', 'Webhook ID')}
                </label>
                <div className="relative">
                  <input
                    type={visibleFields['paypalWebhook'] ? 'text' : 'password'}
                    id="cfg_paypal_webhook_id"
                    name="cfg_paypal_webhook_id"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { e.currentTarget.readOnly = true; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={config.paypal.webhookId}
                    onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, webhookId: e.target.value } })}
                    placeholder="PayPal Webhook ID"
                    className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('paypalWebhook')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {visibleFields['paypalWebhook'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-3 border font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <RefreshCw className="h-4 w-4" /> {t('resetConfigBtn', 'Reset Config')}
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-8 py-3 text-white font-bold rounded-2xl transition text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <Save className="h-4 w-4" />
            {loading ? t('savingSettings', 'Saving Settings...') : t('saveConfigBtn', 'Save Gateway Settings')}
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
            className="border rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowStripeGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <Check className="h-4 w-4" />
            </button>

            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#635bff]/15 text-[#635bff]">
                  <Terminal className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('stripeConnectModalTitle', 'Connect Stripe & Webhooks')}
                </h2>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t('stripeConnectModalSub', 'To connect Stripe webhooks and test payments with your local server, follow the official recommended Stripe CLI setup below.')}
              </p>
            </div>

            {/* Method 1: Official Stripe CLI */}
            <div 
              className="p-5 rounded-2xl border space-y-4"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Code2 className="h-4 w-4 text-[var(--color-primary)]" />
                  {t('method1Title', 'Method 1: Use the Official Stripe CLI (Recommended)')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {t('recommendedBadge', 'Recommended')}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t('method1Desc', 'The official Stripe CLI securely routes events straight to your localhost without needing to register a public URL or configure an HTTP tunnel.')}
              </p>

              {/* Step 1 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                  1. {t('step1Title', 'Install the CLI:')} <span className="font-normal opacity-80">{t('step1Desc', 'Download the Stripe CLI on your system (e.g., via Homebrew on macOS):')}</span>
                </div>
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="select-all">brew install stripe/stripe-cli/stripe</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCliCommand('brew install stripe/stripe-cli/stripe', 'cli_install')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                    style={{
                      backgroundColor: copiedCliKey === 'cli_install' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                      borderColor: copiedCliKey === 'cli_install' ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: copiedCliKey === 'cli_install' ? '#ffffff' : 'var(--color-text)'
                    }}
                  >
                    {copiedCliKey === 'cli_install' ? t('copiedBtn', 'Copied!') : t('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                  2. {t('step2Title', 'Log in:')} <span className="font-normal opacity-80">{t('step2Desc', 'Link your Stripe account by running in your terminal:')}</span>
                </div>
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="select-all">stripe login</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCliCommand('stripe login', 'cli_login')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
                    style={{
                      backgroundColor: copiedCliKey === 'cli_login' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                      borderColor: copiedCliKey === 'cli_login' ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: copiedCliKey === 'cli_login' ? '#ffffff' : 'var(--color-text)'
                    }}
                  >
                    {copiedCliKey === 'cli_login' ? t('copiedBtn', 'Copied!') : t('copyBtn', 'Copy')}
                  </button>
                </div>
                <p className="text-[10px] opacity-70 italic" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('step2Note', 'Follow the pairing link provided in the terminal to authenticate your Stripe account.')}
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                  3. {t('step3Title', 'Forward events:')} <span className="font-normal opacity-80">{t('step3Desc', 'Start forwarding Stripe events directly to your local endpoint:')}</span>
                </div>
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="select-all truncate">
                    stripe listen --forward-to {(webhookEndpointUrl || 'localhost:3000/api/webhooks/stripe').replace(/^https?:\/\//, '')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCliCommand(`stripe listen --forward-to ${(webhookEndpointUrl || 'localhost:3000/api/webhooks/stripe').replace(/^https?:\/\//, '')}`, 'cli_listen')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0"
                    style={{
                      backgroundColor: copiedCliKey === 'cli_listen' ? 'var(--color-emerald)' : 'var(--color-inner-dark)',
                      borderColor: copiedCliKey === 'cli_listen' ? 'var(--color-emerald)' : 'var(--color-border)',
                      color: copiedCliKey === 'cli_listen' ? '#ffffff' : 'var(--color-text)'
                    }}
                  >
                    {copiedCliKey === 'cli_listen' ? t('copiedBtn', 'Copied!') : t('copyBtn', 'Copy')}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5">
                <div className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                  4. {t('step4Title', 'Capture the Secret:')} <span className="font-normal opacity-80">{t('step4Desc', 'The CLI will print a local signing secret (looks like')} <code className="font-mono font-bold text-[10px] px-1 py-0.5 rounded border">whsec_...</code>{t('step4DescAfter', '). Paste it into the Webhook Secret field below:')}</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={config.stripe.webhookSecret}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                    placeholder="whsec_..."
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Method 2: Stripe Dashboard Links */}
            <div 
              className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-xs" style={{ color: 'var(--color-text)' }}>
                  {t('method2Title', 'Production / Dashboard API Keys')}
                </span>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('method2Desc', 'Retrieve your Secret Key and Publishable Key directly from your Stripe Dashboard.')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={config.testMode ? "https://dashboard.stripe.com/test/apikeys" : "https://dashboard.stripe.com/apikeys"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-primary)'
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{t('openApiKeysBtn', 'Stripe API Keys')}</span>
                </a>
                <a
                  href={config.testMode ? "https://dashboard.stripe.com/test/webhooks" : "https://dashboard.stripe.com/webhooks"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-primary)'
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{t('openWebhooksBtn', 'Stripe Webhooks')}</span>
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowStripeGuideModal(false)}
                className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('closeBtn', 'Close')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowStripeGuideModal(false);
                  await handleSaveSettings();
                  await handleVerifyStripeKey();
                }}
                className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Save className="h-4 w-4" />
                <span>{t('saveAndConnectBtn', 'Save Settings & Verify Stripe')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
