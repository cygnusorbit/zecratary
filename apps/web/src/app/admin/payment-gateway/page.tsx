'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, 
  RefreshCw, Check, Eye, EyeOff, Globe, Zap, Sliders,
  ShieldCheck, Terminal, ExternalLink, Code2, AlertTriangle,
  Activity, DownloadCloud, Sparkles, Landmark, Clock, X, XCircle, Search, Trash2, Edit3
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

const normalizeBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on' || s === 'enabled';
  }
  if (typeof val === 'number') return val === 1;
  return Boolean(val);
};

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
  manual?: ManualSettlementConfig;
}

interface PaymentTransaction {
  id: string;
  customer_name?: string;
  customer_email?: string;
  plan_name?: string;
  plan_slug?: string;
  amount?: number;
  currency?: string;
  gateway?: string;
  status: string;
  test_mode?: boolean;
  failure_reason?: string;
  created_at: string;
  transfer_reference?: string;
  confirmed_amount?: number;
  confirmed_at?: string;
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
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);
  const version = langContext?.version;

  const [activeTab, setActiveTab] = useState<'stripe' | 'paypal' | 'manual'>('stripe');
  const [loading, setLoading] = useState(false);
  const [syncingEnv, setSyncingEnv] = useState(false);
  const [togglingGateway, setTogglingGateway] = useState<string | null>(null);
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [showStripeGuideModal, setShowStripeGuideModal] = useState(false);
  const [copiedCliKey, setCopiedCliKey] = useState<string | null>(null);
  const [webhookEndpointUrl, setWebhookEndpointUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Manual Settlement queue state
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [manualFilter, setManualFilter] = useState<'all' | 'pending' | 'succeeded' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // View Modal State
  const [viewTx, setViewTx] = useState<PaymentTransaction | null>(null);

  // Edit Modal State
  const [editTx, setEditTx] = useState<PaymentTransaction | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_email: '',
    plan_name: '',
    amount: 0,
    transfer_reference: '',
    status: 'pending',
    notes: '',
    failure_reason: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Gateway Settings State
  const [config, setConfig] = useState<GatewayConfig>({
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
    manualSettlement: {
      enabled: false,
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      routingNumber: '',
      swiftBic: '',
      branchName: '',
      instructions: 'Please transfer the exact amount to the bank account above and include your Order ID or registered email as the payment reference. Your subscription will be activated upon admin verification.',
      requireReference: true,
    },
  });

  const configRef = useRef<GatewayConfig>(config);
  const isFetchingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);
  const isLocalMutationRef = useRef<boolean>(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
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

  const broadcastSyncEvents = () => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('zecratary_gateway_sync_timestamp', String(Date.now())); } catch (_) {}
      window.dispatchEvent(new Event('zecratary_payment_updated'));
      window.dispatchEvent(new Event('zecratary_payment_gateway_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('zecratary_wallet_settings_updated'));
      window.dispatchEvent(new Event('zecratary_wallet_updated'));
    }
  };

  // IMMEDIATE TOGGLE GATEWAY HANDLER WITH OPTIMISTIC CONCURRENCY
  const handleToggleGateway = async (gatewayKey: 'stripe' | 'paypal' | 'manualSettlement') => {
    if (togglingGateway === gatewayKey) return;

    const currentVal = gatewayKey === 'stripe' 
      ? normalizeBool(configRef.current.stripe?.enabled) 
      : gatewayKey === 'paypal' 
      ? normalizeBool(configRef.current.paypal?.enabled) 
      : normalizeBool(configRef.current.manualSettlement?.enabled || configRef.current.manual?.enabled);
    const nextVal = !currentVal;

    const updatedConfig: GatewayConfig = {
      ...configRef.current,
      stripe: gatewayKey === 'stripe' ? { ...configRef.current.stripe, enabled: nextVal } : configRef.current.stripe,
      paypal: gatewayKey === 'paypal' ? { ...configRef.current.paypal, enabled: nextVal } : configRef.current.paypal,
      manualSettlement: gatewayKey === 'manualSettlement' ? { ...configRef.current.manualSettlement, enabled: nextVal } : configRef.current.manualSettlement,
      manual: gatewayKey === 'manualSettlement' ? { ...configRef.current.manualSettlement, enabled: nextVal } : configRef.current.manualSettlement,
    };

    setConfig(updatedConfig);
    configRef.current = updatedConfig;
    setTogglingGateway(gatewayKey);
    isLocalMutationRef.current = true;

    const gatewayName = gatewayKey === 'stripe' ? 'Stripe' : gatewayKey === 'paypal' ? 'PayPal' : t('manualSettlementTitle', 'Bank Wire / Manual');
    const statusText = nextVal ? t('enabled', 'Enabled') : t('disabled', 'Disabled');

    try {
      persistServerAdminSettings({ 
        paymentSettings: updatedConfig, 
        currency: updatedConfig.currency 
      }).catch(() => {});

      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_gateway',
          gateway: gatewayKey,
          enabled: nextVal,
          paymentSettings: updatedConfig,
          currency: updatedConfig.currency,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.settings) {
          const merged: GatewayConfig = {
            ...configRef.current,
            ...data.settings,
            stripe: {
              ...configRef.current.stripe,
              ...(data.settings.stripe || {}),
              enabled: normalizeBool(data.settings.stripe?.enabled ?? nextVal)
            },
            paypal: {
              ...configRef.current.paypal,
              ...(data.settings.paypal || {}),
              enabled: normalizeBool(data.settings.paypal?.enabled ?? nextVal)
            },
            manualSettlement: {
              ...configRef.current.manualSettlement,
              ...(data.settings.manualSettlement || data.settings.manual || {}),
              enabled: normalizeBool(data.settings.manualSettlement?.enabled ?? data.settings.manual?.enabled ?? nextVal)
            },
          };
          setConfig(merged);
          configRef.current = merged;
        }

        broadcastSyncEvents();
        setFeedback({
          type: 'success',
          msg: `${gatewayName} ${t('gatewayToggledSuccessfully', 'gateway successfully')} ${statusText.toLowerCase()} ${t('andSyncedWithWallet', 'and synchronized with /wallet and PostgreSQL!')}`,
        });
      } else {
        throw new Error(data.error || 'Failed to update gateway status on server');
      }
    } catch (err: any) {
      const revertedConfig: GatewayConfig = {
        ...configRef.current,
        stripe: gatewayKey === 'stripe' ? { ...configRef.current.stripe, enabled: currentVal } : configRef.current.stripe,
        paypal: gatewayKey === 'paypal' ? { ...configRef.current.paypal, enabled: currentVal } : configRef.current.paypal,
        manualSettlement: gatewayKey === 'manualSettlement' ? { ...configRef.current.manualSettlement, enabled: currentVal } : configRef.current.manualSettlement,
      };
      setConfig(revertedConfig);
      configRef.current = revertedConfig;
      setFeedback({
        type: 'error',
        msg: `${t('failedToToggleGateway', 'Failed to toggle gateway:')} ${err.message || 'Server error'}`,
      });
    } finally {
      setTogglingGateway(null);
      setTimeout(() => { 
        isLocalMutationRef.current = false; 
      }, 800);
    }
  };

  // SYNC FROM .ENV FILE DATA
  const handleSyncFromEnv = useCallback(async (isManual = true) => {
    if (syncingEnv || isSavingRef.current) return;
    setSyncingEnv(true);
    isSavingRef.current = true;
    if (isManual) setFeedback(null);

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_env' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.settings) {
        const merged: GatewayConfig = {
          ...configRef.current,
          ...data.settings,
          stripe: { 
            ...configRef.current.stripe, 
            ...(data.settings.stripe || {}),
            enabled: normalizeBool(data.settings.stripe?.enabled ?? configRef.current.stripe.enabled)
          },
          paypal: { 
            ...configRef.current.paypal, 
            ...(data.settings.paypal || {}),
            enabled: normalizeBool(data.settings.paypal?.enabled ?? configRef.current.paypal.enabled)
          },
          manualSettlement: { 
            ...configRef.current.manualSettlement, 
            ...(data.settings.manualSettlement || data.settings.manual || {}),
            enabled: normalizeBool(data.settings.manualSettlement?.enabled ?? data.settings.manual?.enabled ?? configRef.current.manualSettlement.enabled)
          },
        };
        setConfig(merged);
        configRef.current = merged;
        persistServerAdminSettings({ 
          paymentSettings: merged,
          currency: merged.currency 
        }).catch(() => {});

        broadcastSyncEvents();

        const count = data.syncedCount !== undefined ? data.syncedCount : (data.syncedFields?.length || 0);
        const fields = Array.isArray(data.syncedFields) && data.syncedFields.length > 0 
          ? ` (${data.syncedFields.join(', ')})` 
          : '';

        if (isManual || count > 0) {
          setFeedback({
            type: 'success',
            msg: count > 0
              ? t('syncEnvSuccess', `Successfully synced ${count} credential(s) from .env${fields} and updated PostgreSQL!`)
              : t('syncEnvUpToDate', 'Dashboard is already up to date with your server .env credentials.'),
          });
        }
      } else {
        if (isManual) {
          setFeedback({
            type: 'error',
            msg: data.error || t('syncEnvFailed', 'Failed to sync credentials from .env.'),
          });
        }
      }
    } catch (e: any) {
      if (isManual) {
        setFeedback({
          type: 'error',
          msg: e.message || t('syncEnvError', 'Error connecting to server for .env synchronization.'),
        });
      }
    } finally {
      setSyncingEnv(false);
      setTimeout(() => { isSavingRef.current = false; }, 500);
    }
  }, [syncingEnv, t]);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current || isSavingRef.current || isLocalMutationRef.current) return;
    isFetchingRef.current = true;
    purgeLegacyBrowserAdminStorage();
    try {
      const res = await fetch('/api/admin/payment?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }

        let serverSettings = data.settings;
        if (!serverSettings) {
          try {
            const adminData = await fetchServerAdminSettings();
            if (adminData && (adminData.paymentSettings || adminData.payment_gateway_config)) {
              serverSettings = adminData.paymentSettings || adminData.payment_gateway_config;
            }
          } catch (_) {}
        }

        if (serverSettings && !isLocalMutationRef.current) {
          if (typeof serverSettings === 'string') {
            try {
              serverSettings = JSON.parse(serverSettings);
            } catch (_) {}
          }
          if (serverSettings && typeof serverSettings === 'object') {
            const merged: GatewayConfig = {
              ...configRef.current,
              ...serverSettings,
              currency: serverSettings.currency || configRef.current.currency || 'USD',
              testMode: serverSettings.testMode !== undefined ? normalizeBool(serverSettings.testMode) : configRef.current.testMode,
              stripeKeysVerified: serverSettings.stripeKeysVerified !== undefined ? normalizeBool(serverSettings.stripeKeysVerified) : configRef.current.stripeKeysVerified,
              stripeWebhookVerified: serverSettings.stripeWebhookVerified !== undefined ? normalizeBool(serverSettings.stripeWebhookVerified) : configRef.current.stripeWebhookVerified,
              stripe: {
                ...configRef.current.stripe,
                ...(serverSettings.stripe || {}),
                enabled: serverSettings.stripe?.enabled !== undefined ? normalizeBool(serverSettings.stripe.enabled) : configRef.current.stripe.enabled,
              },
              paypal: {
                ...configRef.current.paypal,
                ...(serverSettings.paypal || {}),
                enabled: serverSettings.paypal?.enabled !== undefined ? normalizeBool(serverSettings.paypal.enabled) : configRef.current.paypal.enabled,
              },
              manualSettlement: {
                ...configRef.current.manualSettlement,
                ...(serverSettings.manualSettlement || serverSettings.manual || {}),
                enabled: (serverSettings.manualSettlement?.enabled !== undefined || serverSettings.manual?.enabled !== undefined)
                  ? normalizeBool(serverSettings.manualSettlement?.enabled ?? serverSettings.manual?.enabled)
                  : configRef.current.manualSettlement.enabled,
              }
            };
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
      if (isSavingRef.current || isLocalMutationRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!isSavingRef.current && !isLocalMutationRef.current) {
          fetchDataRef.current();
        }
      }, 350);
    };

    window.addEventListener('zecratary_payment_updated', handleDebouncedSync);
    window.addEventListener('zecratary_payment_gateway_updated', handleDebouncedSync);
    window.addEventListener('zecratary_admin_settings_updated', handleDebouncedSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_payment_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_payment_gateway_updated', handleDebouncedSync);
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

    isSavingRef.current = true;
    try {
      persistServerAdminSettings({ currency: newCurrency, paymentSettings: updatedConfig }).catch(() => {});
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_gateway_settings',
          currency: newCurrency,
          paymentSettings: updatedConfig,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        broadcastSyncEvents();
        setFeedback({
          type: 'success',
          msg: `Processing currency updated to ${newCurrency} (${getCurrencySymbol(newCurrency)}) and saved to PostgreSQL!`,
        });
      } else {
        throw new Error(data.error || 'Failed to save currency');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: `Failed to persist currency: ${err.message || 'Server error'}`,
      });
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 500);
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
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_test_mode',
          testMode: nextMode,
          paymentSettings: updatedConfig,
        }),
      });
      const data = await res.json().catch(() => ({}));
      persistServerAdminSettings({ paymentSettings: updatedConfig }).catch(() => {});

      if (res.ok && data.success) {
        broadcastSyncEvents();
        setFeedback({
          type: 'success',
          msg: nextMode
            ? t('sandboxTestModeEnabled', 'Sandbox (Test Mode) enabled and saved to PostgreSQL!')
            : t('liveProductionModeEnabled', 'Live Production mode enabled and saved to PostgreSQL!'),
        });
      } else {
        throw new Error(data.error || 'Failed to update gateway environment');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to update gateway environment.',
      });
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 500);
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
    isSavingRef.current = true;
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_webhook_secret',
          webhookSecret: secret,
          secretKey: config.stripe.secretKey?.trim() || '',
          publishableKey: config.stripe.publishableKey?.trim() || '',
          paymentSettings: config,
          testMode: config.testMode,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const updated: GatewayConfig = { 
          ...config,
          ...(data.settings || {}),
          stripeWebhookVerified: true,
          stripe: {
            ...config.stripe,
            webhookSecret: secret,
            ...(data.settings?.stripe || {})
          }
        };
        setConfig(updated);
        configRef.current = updated;

        persistServerAdminSettings({ paymentSettings: updated }).catch(() => {});
        broadcastSyncEvents();

        setFeedback({ 
          type: 'success', 
          msg: data.message || t('webhookSecretVerifiedSuccess', 'Stripe Webhook Signing Secret verified and confirmed for HMAC signatures!'),
        });
      } else {
        const updated: GatewayConfig = { ...config, stripeWebhookVerified: false };
        setConfig(updated);
        configRef.current = updated;
        setFeedback({ 
          type: 'error', 
          msg: data.error || t('webhookSecretVerificationFailed', 'Webhook Secret verification failed.'),
        });
      }
    } catch (e: any) {
      setFeedback({ 
        type: 'error', 
        msg: e.message || 'Failed to communicate with webhook verification endpoint.',
      });
    } finally {
      setVerifyingWebhook(false);
      setTimeout(() => { isSavingRef.current = false; }, 1500);
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
      setFeedback({
        type: 'error',
        msg: t('stripeAllThreeRequired', 'Publishable Key, Secret Key, and Webhook Secret are all required to verify.'),
      });
      return;
    }

    setVerifyingStripe(true);
    isSavingRef.current = true;
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
          ...(data.settings || {}),
          stripeKeysVerified: true,
          stripeWebhookVerified: true,
          stripe: {
            ...config.stripe,
            publishableKey: pKey,
            secretKey: sKey,
            webhookSecret: wSecret,
            ...(data.settings?.stripe || {})
          }
        };
        setConfig(updated);
        configRef.current = updated;

        persistServerAdminSettings({ paymentSettings: updated }).catch(() => {});
        broadcastSyncEvents();

        setFeedback({ 
          type: 'success', 
          msg: data.message || t('stripeAllThreeVerifiedSuccess', 'Stripe keys and webhook verified successfully!'),
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
          msg: data.error || t('stripeKeyVerificationFailed', 'Stripe verification failed. Please check your credentials.'),
        });
      }
    } catch (e: any) {
      setFeedback({ 
        type: 'error', 
        msg: e.message || t('failedToVerifyStripeKeys', 'Failed to communicate with Stripe verification endpoint.'),
      });
    } finally {
      setVerifyingStripe(false);
      setTimeout(() => { isSavingRef.current = false; }, 1200);
    }
  };

  const handleSaveSettings = async (e?: React.SyntheticEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (loading || isSavingRef.current) return;

    setLoading(true);
    isSavingRef.current = true;
    setFeedback(null);

    const updatedConfig: GatewayConfig = {
      ...config,
      stripe: {
        ...config.stripe,
        publishableKey: config.stripe.publishableKey.trim(),
        secretKey: config.stripe.secretKey.trim(),
        webhookSecret: config.stripe.webhookSecret.trim(),
      },
      paypal: {
        ...config.paypal,
        clientId: config.paypal.clientId.trim(),
        clientSecret: config.paypal.clientSecret.trim(),
        webhookId: config.paypal.webhookId.trim(),
      },
      manualSettlement: {
        ...config.manualSettlement,
        bankName: config.manualSettlement.bankName.trim(),
        accountHolder: config.manualSettlement.accountHolder.trim(),
        accountNumber: config.manualSettlement.accountNumber.trim(),
        routingNumber: config.manualSettlement.routingNumber.trim(),
        swiftBic: config.manualSettlement.swiftBic.trim(),
        branchName: config.manualSettlement.branchName.trim(),
        instructions: config.manualSettlement.instructions.trim(),
      }
    };

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_gateway_settings',
          paymentSettings: updatedConfig,
          currency: updatedConfig.currency,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save gateway settings to server.');
      }

      persistServerAdminSettings({
        paymentSettings: updatedConfig,
        currency: updatedConfig.currency
      }).catch((err) => console.warn('persistServerAdminSettings warning:', err));

      setConfig(updatedConfig);
      configRef.current = updatedConfig;
      broadcastSyncEvents();

      setFeedback({ 
        type: 'success', 
        msg: t('gatewaySettingsSavedSuccess', 'Gateway settings and settlement options saved successfully to PostgreSQL!') 
      });
    } catch (e: any) {
      console.error('Save gateway settings error:', e);
      setFeedback({ 
        type: 'error', 
        msg: e.message || t('failedToSaveSettings', 'Failed to save payment gateway settings.') 
      });
    } finally {
      setLoading(false);
      setTimeout(() => { isSavingRef.current = false; }, 500);
    }
  };

  // MANUAL SETTLEMENT APPROVAL WORKFLOW
  const manualTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const gw = (tx.gateway || '').toLowerCase();
      return gw === 'manual_settlement' || gw === 'bank_wire' || gw === 'manual';
    });
  }, [transactions]);

  const pendingManualCount = useMemo(() => {
    return manualTransactions.filter((tx) => {
      const s = (tx.status || '').toLowerCase();
      return s === 'pending' || s === 'pending_approval' || s === 'review';
    }).length;
  }, [manualTransactions]);

  const filteredManualTransactions = useMemo(() => {
    return manualTransactions.filter((tx) => {
      const s = (tx.status || '').toLowerCase();
      if (manualFilter === 'pending' && !(s === 'pending' || s === 'pending_approval' || s === 'review')) return false;
      if (manualFilter === 'succeeded' && !(s === 'succeeded' || s === 'approved' || s === 'completed')) return false;
      if (manualFilter === 'rejected' && !(s === 'rejected' || s === 'cancelled' || s === 'failed')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = tx.id?.toLowerCase().includes(q);
        const matchName = tx.customer_name?.toLowerCase().includes(q);
        const matchEmail = tx.customer_email?.toLowerCase().includes(q);
        const matchRef = tx.transfer_reference?.toLowerCase().includes(q);
        return matchId || matchName || matchEmail || matchRef;
      }
      return true;
    });
  }, [manualTransactions, manualFilter, searchQuery]);

  // APPROVE ACTION
  const handleApprovePayment = async (txId: string) => {
    if (!confirm(t('confirmApproveTransfer', 'Are you sure you want to approve this bank wire transfer? This will confirm the funds and activate user entitlements.'))) {
      return;
    }

    setActionLoadingId(txId);
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_manual_settlement',
          id: txId,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          msg: data.message || t('manualPaymentApprovedSuccess', 'Manual settlement approved successfully! Plan access confirmed.'),
        });
        fetchData();
        broadcastSyncEvents();
      } else {
        throw new Error(data.error || 'Failed to approve manual settlement');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || t('failedToApprovePayment', 'Failed to approve manual settlement.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // REJECT ACTION
  const handleRejectPayment = async (txId: string) => {
    const reason = prompt(t('enterRejectionReason', 'Please provide a reason for rejecting this wire transfer (optional):'), 'Bank wire transfer not received or reference mismatched');
    if (reason === null) return;

    setActionLoadingId(txId);
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_manual_settlement',
          id: txId,
          failureReason: reason,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          msg: data.message || t('manualPaymentRejectedSuccess', 'Manual settlement has been rejected.'),
        });
        fetchData();
        broadcastSyncEvents();
      } else {
        throw new Error(data.error || 'Failed to reject manual settlement');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || t('failedToRejectPayment', 'Failed to reject manual settlement.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // DELETE ACTION
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm(t('confirmDeleteTx', `Are you sure you want to delete transaction record ${txId}? This cannot be undone.`))) {
      return;
    }

    setActionLoadingId(txId);
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: txId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          msg: data.message || t('txDeletedSuccess', 'Transaction record deleted successfully.'),
        });
        setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
        if (viewTx?.id === txId) setViewTx(null);
        if (editTx?.id === txId) setEditTx(null);
        broadcastSyncEvents();
      } else {
        throw new Error(data.error || 'Failed to delete transaction');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || t('failedToDeleteTx', 'Failed to delete transaction record.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (tx: PaymentTransaction) => {
    setEditTx(tx);
    setEditForm({
      customer_name: tx.customer_name || '',
      customer_email: tx.customer_email || '',
      plan_name: tx.plan_name || '',
      amount: Number(tx.amount || 0),
      transfer_reference: tx.transfer_reference || '',
      status: tx.status || 'pending',
      notes: tx.notes || '',
      failure_reason: tx.failure_reason || '',
    });
  };

  // SAVE EDIT MODAL
  const handleSaveEdit = async () => {
    if (!editTx) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_transaction',
          id: editTx.id,
          ...editForm,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          msg: data.message || t('txUpdatedSuccess', 'Transaction details updated successfully in PostgreSQL!'),
        });
        setEditTx(null);
        fetchData();
        broadcastSyncEvents();
      } else {
        throw new Error(data.error || 'Failed to update transaction');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || t('failedToUpdateTx', 'Failed to save changes to transaction.'),
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div 
      role="region"
      aria-label={t('paymentGatewaySettingsTitle', 'Payment Gateway Settings')}
      className="max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text, #ffffff)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .payment-input:-webkit-autofill,
        .payment-input:-webkit-autofill:hover,
        .payment-input:-webkit-autofill:focus,
        .payment-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-inner-dark, #0f172a) inset !important;
          box-shadow: 0 0 0 1000px var(--color-inner-dark, #0f172a) inset !important;
          -webkit-text-fill-color: var(--color-text, #ffffff) !important;
          caret-color: var(--color-text, #ffffff) !important;
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
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary, #3b82f6)' }}>
            <Sliders className="h-6 w-6" style={{ color: 'var(--color-primary, #3b82f6)' }} />
            {t('paymentGatewayTitle', 'Payment Gateway')}
          </h1>
          <p className="text-xs opacity-75" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
            {t('paymentGatewaySubtitle', 'Configure Stripe, PayPal, Manual Settlement bank wire credentials, and review offline subscription approvals.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SYNC FROM .ENV BUTTON */}
          <button
            type="button"
            onClick={() => handleSyncFromEnv(true)}
            disabled={syncingEnv}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)'
            }}
            title={t('syncFromEnvTooltip', 'Import API credentials directly from server .env file into PostgreSQL')}
          >
            <DownloadCloud className={`h-4 w-4 ${syncingEnv ? 'animate-bounce' : ''}`} style={{ color: 'var(--color-primary, #3b82f6)' }} />
            <span>{syncingEnv ? t('syncingEnv', 'Syncing .env...') : t('syncFromEnvBtn', 'Sync from .env')}</span>
          </button>

          <Link
            href="/admin/plans"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs hover:opacity-85"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)'
            }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--color-primary, #3b82f6)' }} /> {t('managePlans', 'Manage Plans')}
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark, #0f172a)',
            borderColor: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444',
            color: feedback.type === 'success' ? 'var(--color-emerald, #10b981)' : '#ef4444'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* GATEWAY ENGINE MONITOR SUMMARY BAR */}
      <div
        role="region"
        aria-label={t('engineMonitorAria', 'Payment Gateway Engine Status')}
        className="p-3 px-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card, #1e293b)',
          borderColor: 'var(--color-border, #334155)'
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text, #ffffff)' }}>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> {t('activeChannels', 'Active Channels:')}
          </span>
          <div className="flex items-center gap-1.5">
            <span 
              className={`font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs ${
                normalizeBool(config.stripe.enabled) ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800/40'
              }`}
            >
              Stripe
            </span>
            <span 
              className={`font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs ${
                normalizeBool(config.paypal.enabled) ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800/40'
              }`}
            >
              PayPal
            </span>
            <span 
              className={`font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs ${
                normalizeBool(config.manualSettlement.enabled) ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800/40'
              }`}
            >
              Bank Wire
            </span>
          </div>
          <span 
            className="font-bold px-2 py-0.5 rounded text-[10px] border shadow-xs ml-2"
            style={{
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald, #10b981)',
              color: config.testMode ? '#fbbf24' : 'var(--color-emerald, #10b981)'
            }}
          >
            {config.testMode ? t('sandboxTest', 'Sandbox Test') : t('liveProduction', 'Live Production')}
          </span>
        </div>

        <div className="flex items-center gap-4 font-semibold text-[11px]" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
          <div>
            {t('currencyLabel', 'Currency:')} <span className="font-bold" style={{ color: 'var(--color-text, #ffffff)' }}>{config.currency} ({activeCurrencySymbol})</span>
          </div>
          {pendingManualCount > 0 && (
            <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              <Clock className="h-3.5 w-3.5" />
              <span>{pendingManualCount} {t('awaitingApproval', 'Awaiting Approval')}</span>
            </div>
          )}
        </div>
      </div>

      {/* CURRENCY & ENVIRONMENT TOOLBAR */}
      <div 
        role="region"
        aria-label={t('currencySettingsAria', 'Currency and Environment Configuration')}
        className="border p-5 rounded-3xl shadow-sm transition-colors duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--color-card, #1e293b)',
          borderColor: 'var(--color-border, #334155)'
        }}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text, #ffffff)' }}>
            <Globe className="h-4 w-4" style={{ color: 'var(--color-primary, #3b82f6)' }} /> {t('processingCurrencyTitle', 'Processing Currency')}
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
            {t('processingCurrencySub', 'Global currency applied to recurring subscriptions, invoices, and wire settlements.')}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <select
              value={config.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="payment-input w-full border rounded-xl p-2.5 text-xs font-bold outline-none transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark, #0f172a)',
                borderColor: 'var(--color-border, #334155)',
                color: 'var(--color-text, #ffffff)'
              }}
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code} style={{ backgroundColor: 'var(--color-card, #1e293b)', color: 'var(--color-text, #ffffff)' }}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleToggleTestMode}
            className="text-xs font-bold px-3.5 py-2.5 rounded-xl border transition cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald, #10b981)',
              color: config.testMode ? '#fbbf24' : 'var(--color-emerald, #10b981)'
            }}
          >
            <span className={`w-2 h-2 rounded-full ${config.testMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {config.testMode ? t('sandboxTestMode', 'Sandbox Mode') : t('liveProduction', 'Live Production')}
          </button>
        </div>
      </div>

      {/* GATEWAY NAVIGATION TABS */}
      <div 
        role="tablist"
        aria-label={t('gatewayTabsAria', 'Payment Gateway Channels')}
        className="border p-2 sm:p-2.5 rounded-3xl shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card, #1e293b)',
          borderColor: 'var(--color-border, #334155)'
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* TAB 1: STRIPE */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stripe'}
            onClick={() => setActiveTab('stripe')}
            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer text-left flex items-center justify-between ${
              activeTab === 'stripe' ? 'shadow-md ring-2 ring-blue-500/20' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              borderColor: activeTab === 'stripe' ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm" style={{ backgroundColor: '#635bff' }}>
                S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm" style={{ color: 'var(--color-text, #ffffff)' }}>Stripe</span>
                  <span 
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      normalizeBool(config.stripe.enabled) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                    }`}
                  >
                    {normalizeBool(config.stripe.enabled) ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('stripeTabDesc', 'Credit cards, Webhooks, & CLI')}
                </p>
              </div>
            </div>

            {config.stripeKeysVerified && config.stripeWebhookVerified && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
          </button>

          {/* TAB 2: PAYPAL */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'paypal'}
            onClick={() => setActiveTab('paypal')}
            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer text-left flex items-center justify-between ${
              activeTab === 'paypal' ? 'shadow-md ring-2 ring-blue-500/20' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              borderColor: activeTab === 'paypal' ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-blue-950 text-base shadow-sm" style={{ backgroundColor: '#ffc439' }}>
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm" style={{ color: 'var(--color-text, #ffffff)' }}>PayPal</span>
                  <span 
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      normalizeBool(config.paypal.enabled) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                    }`}
                  >
                    {normalizeBool(config.paypal.enabled) ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('paypalTabDesc', 'PayPal checkout & digital wallet')}
                </p>
              </div>
            </div>
          </button>

          {/* TAB 3: MANUAL SETTLEMENT / BANK WIRE */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            onClick={() => setActiveTab('manual')}
            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer text-left flex items-center justify-between ${
              activeTab === 'manual' ? 'shadow-md ring-2 ring-blue-500/20' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: 'var(--color-inner-dark, #0f172a)',
              borderColor: activeTab === 'manual' ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}>
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm" style={{ color: 'var(--color-text, #ffffff)' }}>
                    {t('manualSettlementTitle', 'Bank Wire / Manual')}
                  </span>
                  <span 
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      normalizeBool(config.manualSettlement.enabled) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                    }`}
                  >
                    {normalizeBool(config.manualSettlement.enabled) ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('manualSettlementSub', 'Bank wire transfer & Manual Approval')}
                </p>
              </div>
            </div>

            {pendingManualCount > 0 && (
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-black shadow-xs shrink-0 animate-pulse">
                {pendingManualCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: STRIPE CONFIGURATION */}
      {activeTab === 'stripe' && (
        <div 
          role="region"
          aria-label={t('stripeApiConfig', 'Stripe API Configuration')}
          className="border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200 animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-card, #1e293b)',
            borderColor: 'var(--color-border, #334155)'
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border, #334155)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#635bff]"></div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-text, #ffffff)' }}>{t('stripeApiConfig', 'Stripe API Configuration')}</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('stripeApiSub', 'Configure Stripe secret keys, publishable credentials, and Webhook Signing Secret.')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {config.stripeKeysVerified && config.stripeWebhookVerified ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{t('keysAndWebhookVerified', 'Keys & Webhook Verified')}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-zinc-700 bg-zinc-800/40 text-zinc-400 flex items-center gap-1.5 shadow-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>{t('keysUnverified', 'Keys Unverified')}</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleVerifyStripeKey}
                disabled={verifyingStripe || !config.stripe.publishableKey || !config.stripe.secretKey}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-[#635bff] hover:bg-[#5346e0] transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
                title={t('verifyStripeKeysTooltip', 'Verify Publishable Key, Secret Key, and Webhook Signing Secret with Stripe API')}
              >
                {verifyingStripe ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('verifyingStripeKey', 'Verifying Stripe Key...')}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t('verifyStripeKey', 'Verify Stripe Key')}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span
                  className="text-xs font-bold select-none"
                  style={{ color: normalizeBool(config.stripe.enabled) ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #94a3b8)' }}
                >
                  {normalizeBool(config.stripe.enabled) ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label={t('toggleStripeGateway', 'Toggle Stripe Gateway Enabled/Disabled')}
                  aria-checked={normalizeBool(config.stripe.enabled)}
                  disabled={togglingGateway === 'stripe'}
                  onClick={() => handleToggleGateway('stripe')}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)] focus:ring-offset-1 disabled:opacity-50"
                  style={{
                    backgroundColor: normalizeBool(config.stripe.enabled) ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                      normalizeBool(config.stripe.enabled) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase font-bold block" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('publishableKeyLabel', 'Publishable Key')}
                </label>
                <span className="text-[10px] font-mono opacity-60">
                  {config.testMode ? 'pk_test_...' : 'pk_live_...'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={visibleFields['stripe_pub'] ? 'text' : 'password'}
                  id="stripe_pub_field"
                  name="stripe_pub_field_guard"
                  value={config.stripe.publishableKey}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, publishableKey: e.target.value } })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                  placeholder={config.testMode ? 'pk_test_51...' : 'pk_live_51...'}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 pr-10 text-xs outline-none font-mono transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('stripe_pub')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer p-1"
                >
                  {visibleFields['stripe_pub'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase font-bold block" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('secretKeyLabel', 'Secret Key')}
                </label>
                <span className="text-[10px] font-mono opacity-60">
                  {config.testMode ? 'sk_test_...' : 'sk_live_...'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={visibleFields['stripe_sec'] ? 'text' : 'password'}
                  id="stripe_sec_field"
                  name="stripe_sec_field_guard"
                  value={config.stripe.secretKey}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, secretKey: e.target.value } })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                  placeholder={config.testMode ? 'sk_test_51...' : 'sk_live_51...'}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('stripe_sec')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer p-1"
                >
                  {visibleFields['stripe_sec'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase font-bold block" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('webhookSecretLabel', 'Webhook Signing Secret')}
                </label>
                <span className="text-[10px] font-mono opacity-60">whsec_...</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleFields['stripe_wh'] ? 'text' : 'password'}
                    id="stripe_wh_field"
                    name="stripe_wh_field_guard"
                    value={config.stripe.webhookSecret}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value } })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                    placeholder="whsec_..."
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark, #0f172a)',
                      borderColor: 'var(--color-border, #334155)',
                      color: 'var(--color-text, #ffffff)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('stripe_wh')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer p-1"
                  >
                    {visibleFields['stripe_wh'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyWebhookSecret}
                  disabled={verifyingWebhook || !config.stripe.webhookSecret}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: config.stripeWebhookVerified ? 'var(--color-emerald, #10b981)' : 'var(--color-border, #334155)',
                    color: config.stripeWebhookVerified ? 'var(--color-emerald, #10b981)' : 'var(--color-text, #ffffff)'
                  }}
                  title={t('verifyWebhookSecretTooltip', 'Test HMAC-SHA256 signature verification on Webhook Secret')}
                >
                  {verifyingWebhook ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : config.stripeWebhookVerified ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Shield className="h-3.5 w-3.5" />
                  )}
                  <span>{verifyingWebhook ? t('verifying', 'Verifying...') : config.stripeWebhookVerified ? t('verified', 'Verified') : t('verifySecret', 'Verify Secret')}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[11px] uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('webhookEndpointUrlLabel', 'Webhook Listener Endpoint URL')}
              </label>
              <div 
                className="flex items-center justify-between border rounded-xl p-2 px-3 text-xs font-mono"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                  color: 'var(--color-text, #ffffff)'
                }}
              >
                <span className="truncate mr-2">{webhookEndpointUrl || '/api/webhooks/stripe'}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCliCommand(webhookEndpointUrl, 'endpoint')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 shrink-0"
                  style={{
                    backgroundColor: 'var(--color-card, #1e293b)',
                    borderColor: 'var(--color-border, #334155)',
                    color: copiedCliKey === 'endpoint' ? 'var(--color-emerald, #10b981)' : 'var(--color-text, #ffffff)'
                  }}
                >
                  {copiedCliKey === 'endpoint' ? <Check className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                  <span>{copiedCliKey === 'endpoint' ? t('copied', 'Copied') : t('copyUrl', 'Copy URL')}</span>
                </button>
              </div>
            </div>

            <div 
              className="mt-4 p-4 rounded-2xl border space-y-3"
              style={{
                backgroundColor: 'var(--color-inner-dark, #0f172a)',
                borderColor: 'var(--color-border, #334155)'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#635bff]" />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text, #ffffff)' }}>
                    {t('webhookCliGuideTitle', 'Stripe CLI & Local Webhook Testing Guide')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStripeGuideModal(true)}
                  className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{t('viewFullSetupGuide', 'View Full Webhook Setup Guide')}</span>
                </button>
              </div>

              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('stripeCliGuideDesc', 'Forward live Stripe events to your local development environment using the Stripe CLI to capture and verify webhook signatures:')}
              </p>

              <div 
                className="flex items-center justify-between border rounded-xl p-2 px-3 text-xs font-mono"
                style={{
                  backgroundColor: 'var(--color-card, #1e293b)',
                  borderColor: 'var(--color-border, #334155)',
                  color: '#38bdf8'
                }}
              >
                <code className="truncate mr-2">stripe listen --forward-to localhost:3000/api/webhooks/stripe</code>
                <button
                  type="button"
                  onClick={() => handleCopyCliCommand('stripe listen --forward-to localhost:3000/api/webhooks/stripe', 'cli')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 shrink-0"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: copiedCliKey === 'cli' ? 'var(--color-emerald, #10b981)' : 'var(--color-text, #ffffff)'
                  }}
                >
                  {copiedCliKey === 'cli' ? <Check className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
                  <span>{copiedCliKey === 'cli' ? t('copied', 'Copied') : t('copyCommand', 'Copy Command')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PAYPAL CONFIGURATION */}
      {activeTab === 'paypal' && (
        <div 
          role="region"
          aria-label={t('paypalApiConfig', 'PayPal API Configuration')}
          className="border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200 animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-card, #1e293b)',
            borderColor: 'var(--color-border, #334155)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border, #334155)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#ffc439]"></div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-text, #ffffff)' }}>{t('paypalApiConfig', 'PayPal API Configuration')}</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('paypalApiSub', 'Configure PayPal REST application client credentials and webhook integration.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold select-none"
                style={{ color: normalizeBool(config.paypal.enabled) ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #94a3b8)' }}
              >
                {normalizeBool(config.paypal.enabled) ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
              </span>
              <button
                type="button"
                role="switch"
                aria-label={t('togglePaypalGateway', 'Toggle PayPal Gateway Enabled/Disabled')}
                aria-checked={normalizeBool(config.paypal.enabled)}
                disabled={togglingGateway === 'paypal'}
                onClick={() => handleToggleGateway('paypal')}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)] focus:ring-offset-1 disabled:opacity-50"
                style={{
                  backgroundColor: normalizeBool(config.paypal.enabled) ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                    normalizeBool(config.paypal.enabled) ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('clientIdLabel', 'Client ID')}
              </label>
              <input
                type="text"
                id="paypal_client_id_field"
                name="paypal_client_id_guard"
                value={config.paypal.clientId}
                onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                placeholder="PayPal Client ID"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                role="presentation"
                className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                  color: 'var(--color-text, #ffffff)'
                }}
              />
            </div>

            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('clientSecretLabel', 'Client Secret')}
              </label>
              <input
                type="password"
                id="paypal_client_sec_field"
                name="paypal_client_sec_guard"
                value={config.paypal.clientSecret}
                onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientSecret: e.target.value } })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                placeholder="PayPal Client Secret"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                role="presentation"
                className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                  color: 'var(--color-text, #ffffff)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: MANUAL SETTLEMENT / BANK WIRE */}
      {activeTab === 'manual' && (
        <div className="space-y-6 animate-in fade-in">
          <div 
            role="region"
            aria-label={t('manualSettlementSettingsTitle', 'Bank Wire Settings')}
            className="border p-6 rounded-3xl space-y-5 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--color-text, #ffffff)' }}>
                    {t('manualSettlementSettingsTitle', 'Manual Settlement / Bank Wire Configuration')}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                    {t('manualSettlementSettingsSub', 'Configure beneficiary bank details displayed to customers during checkout. Admin manual verification is mandatory before activation.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-bold select-none"
                  style={{ color: normalizeBool(config.manualSettlement.enabled) ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #94a3b8)' }}
                >
                  {normalizeBool(config.manualSettlement.enabled) ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label={t('toggleManualSettlement', 'Toggle Manual Bank Wire Settlement Enabled/Disabled')}
                  aria-checked={normalizeBool(config.manualSettlement.enabled)}
                  disabled={togglingGateway === 'manualSettlement'}
                  onClick={() => handleToggleGateway('manualSettlement')}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)] focus:ring-offset-1 disabled:opacity-50"
                  style={{
                    backgroundColor: normalizeBool(config.manualSettlement.enabled) ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                      normalizeBool(config.manualSettlement.enabled) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('bankNameLabel', 'Bank Name')}
                </label>
                <input
                  type="text"
                  id="bank_name_field"
                  name="bank_name_guard"
                  value={config.manualSettlement.bankName}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, bankName: e.target.value }
                  })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                  placeholder="e.g. JPMorgan Chase / Bangkok Bank / HSBC"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('accountHolderLabel', 'Account Holder / Beneficiary Name')}
                </label>
                <input
                  type="text"
                  id="account_holder_field"
                  name="account_holder_guard"
                  value={config.manualSettlement.accountHolder}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, accountHolder: e.target.value }
                  })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                  placeholder="e.g. Zecratary Technologies Co., Ltd."
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('accountNumberLabel', 'Account Number / IBAN')}
                </label>
                <input
                  type="text"
                  id="account_number_field"
                  name="account_number_guard"
                  value={config.manualSettlement.accountNumber}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, accountNumber: e.target.value }
                  })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                  placeholder="e.g. 123-4-56789-0 / US12 3456 7890"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('swiftBicLabel', 'SWIFT / BIC Code')}
                </label>
                <input
                  type="text"
                  id="swift_bic_field"
                  name="swift_bic_guard"
                  value={config.manualSettlement.swiftBic}
                  onChange={(e) => setConfig({
                    ...config,
                    manualSettlement: { ...config.manualSettlement, swiftBic: e.target.value }
                  })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); }}
                  placeholder="e.g. CHASUS33XXX"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark, #0f172a)',
                    borderColor: 'var(--color-border, #334155)',
                    color: 'var(--color-text, #ffffff)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold block mb-1" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                {t('transferInstructionsLabel', 'Payment Instructions for Customers')}
              </label>
              <textarea
                rows={3}
                id="transfer_instructions_field"
                name="transfer_instructions_guard"
                value={config.manualSettlement.instructions}
                onChange={(e) => setConfig({
                  ...config,
                  manualSettlement: { ...config.manualSettlement, instructions: e.target.value }
                })}
                placeholder="Instructions provided to customer during wire payment checkout..."
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                className="payment-input w-full border rounded-xl p-3 text-xs outline-none transition leading-relaxed"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                  color: 'var(--color-text, #ffffff)'
                }}
              />
            </div>
          </div>

          {/* ADMIN MANUAL APPROVAL QUEUE */}
          <div 
            role="region"
            aria-label={t('manualApprovalQueueTitle', 'Manual Settlement Approval Queue')}
            className="border p-6 rounded-3xl space-y-4 shadow-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--color-text, #ffffff)' }}>
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  {t('manualApprovalQueueTitle', 'Manual Settlement Approval Queue')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('manualApprovalQueueSub', 'All new bank wire transactions default to "Pending" awaiting administrator review, approval, editing, or deletion.')}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManualFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    manualFilter === 'all' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: manualFilter === 'all' ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #334155)' }}
                >
                  {t('all', 'All')} ({manualTransactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManualFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    manualFilter === 'pending' ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: manualFilter === 'pending' ? '#f59e0b' : 'var(--color-border, #334155)' }}
                >
                  <Clock className="h-3 w-3" />
                  {t('pendingApproval', 'Pending')} ({pendingManualCount})
                </button>
                <button
                  type="button"
                  onClick={() => setManualFilter('succeeded')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    manualFilter === 'succeeded' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: manualFilter === 'succeeded' ? 'var(--color-emerald, #10b981)' : 'var(--color-border, #334155)' }}
                >
                  {t('approved', 'Approved')}
                </button>
                <button
                  type="button"
                  onClick={() => setManualFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    manualFilter === 'rejected' ? 'border-red-500 text-red-400 bg-red-500/10' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: manualFilter === 'rejected' ? '#ef4444' : 'var(--color-border, #334155)' }}
                >
                  {t('rejected', 'Rejected')}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary, #94a3b8)' }} />
              <input
                type="text"
                id="search_manual_tx"
                name="search_manual_tx_guard"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchTransactionsPlaceholder', 'Search by Customer Name, Email, Transaction ID, or Wire Reference...')}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                className="payment-input w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)',
                  color: 'var(--color-text, #ffffff)'
                }}
              />
            </div>

            {/* Transactions Table */}
            {filteredManualTransactions.length === 0 ? (
              <div 
                className="p-8 text-center rounded-2xl border space-y-2"
                style={{
                  backgroundColor: 'var(--color-inner-dark, #0f172a)',
                  borderColor: 'var(--color-border, #334155)'
                }}
              >
                <Landmark className="h-8 w-8 mx-auto opacity-40 text-blue-400" />
                <div className="font-bold text-xs" style={{ color: 'var(--color-text, #ffffff)' }}>
                  {t('noManualTransactionsFound', 'No manual wire settlements found matching the filter.')}
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('noManualTransactionsSub', 'All new bank wire transactions from user checkout/wallet will appear here with default "Pending" status.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr 
                      className="border-b font-bold uppercase tracking-wider text-[11px]"
                      style={{
                        backgroundColor: 'var(--color-inner-dark, #0f172a)',
                        borderColor: 'var(--color-border, #334155)',
                        color: 'var(--color-text-secondary, #94a3b8)'
                      }}
                    >
                      <th className="p-3">{t('dateAndId', 'Date / ID')}</th>
                      <th className="p-3">{t('customer', 'Customer')}</th>
                      <th className="p-3">{t('planAndAmount', 'Plan & Amount')}</th>
                      <th className="p-3">{t('wireReference', 'Wire Reference')}</th>
                      <th className="p-3">{t('status', 'Status')}</th>
                      <th className="p-3 text-right">{t('actions', 'Actions & Approval')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border, #334155)' }}>
                    {filteredManualTransactions.map((tx) => {
                      const status = (tx.status || 'pending').toLowerCase();
                      const isPending = status === 'pending' || status === 'pending_approval' || status === 'review';
                      const isApproved = status === 'succeeded' || status === 'approved' || status === 'completed';
                      const isRejected = status === 'rejected' || status === 'cancelled' || status === 'failed';
                      const isLoadingThis = actionLoadingId === tx.id;

                      return (
                        <tr 
                          key={tx.id}
                          className="hover:bg-blue-500/5 transition"
                          style={{ color: 'var(--color-text, #ffffff)' }}
                        >
                          <td className="p-3 font-mono text-[11px]">
                            <div className="font-bold">{tx.id}</div>
                            <div className="text-[10px] opacity-70 font-sans">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold">{tx.customer_name || 'Anonymous Customer'}</div>
                            <div className="text-[11px] font-mono opacity-80" style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>
                              {tx.customer_email || 'No email'}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold capitalize">{tx.plan_name || 'Wallet Top-Up'}</span>
                            <div className="font-bold text-emerald-400">
                              {activeCurrencySymbol}{Number(tx.amount || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="p-3">
                            {tx.transfer_reference ? (
                              <span className="font-mono px-2 py-0.5 rounded border text-[11px]" style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}>
                                {tx.transfer_reference}
                              </span>
                            ) : (
                              <span className="text-[11px] opacity-50 italic">{t('noRefGiven', 'No memo provided')}</span>
                            )}
                            {tx.notes && (
                              <div className="text-[10px] mt-0.5 opacity-75 max-w-xs truncate" title={tx.notes}>{tx.notes}</div>
                            )}
                          </td>
                          <td className="p-3">
                            {isPending && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3 animate-pulse" /> {t('pendingReview', 'Pending Review')}
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" /> {t('approvedStatus', 'Approved')}
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-red-500/10 text-red-400 border-red-500/30 flex items-center gap-1 w-fit" title={tx.failure_reason}>
                                <XCircle className="h-3 w-3" /> {t('rejectedStatus', 'Rejected')}
                              </span>
                            )}
                          </td>

                          {/* ACTION BUTTONS */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewTx(tx)}
                                className="p-1.5 rounded-lg border text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                                style={{ borderColor: 'var(--color-border, #334155)', backgroundColor: 'var(--color-inner-dark, #0f172a)' }}
                                title={t('viewDetails', 'View Transaction Details')}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(tx)}
                                className="p-1.5 rounded-lg border text-amber-400 hover:bg-amber-500/10 transition cursor-pointer"
                                style={{ borderColor: 'var(--color-border, #334155)', backgroundColor: 'var(--color-inner-dark, #0f172a)' }}
                                title={t('editDetails', 'Edit Transaction')}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(tx.id)}
                                    disabled={isLoadingThis}
                                    className="px-2.5 py-1.5 rounded-lg font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                                    title={t('approveWireTransferTooltip', 'Confirm receipt and approve transaction')}
                                  >
                                    {isLoadingThis ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    <span>{t('approveBtn', 'Approve')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectPayment(tx.id)}
                                    disabled={isLoadingThis}
                                    className="p-1.5 rounded-lg font-bold text-xs text-red-400 border border-red-500/40 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-50"
                                    title={t('rejectWireTransferTooltip', 'Reject transfer and mark as declined')}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(tx)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-semibold opacity-75 hover:opacity-100 border transition cursor-pointer"
                                  style={{ borderColor: 'var(--color-border, #334155)', backgroundColor: 'var(--color-inner-dark, #0f172a)' }}
                                >
                                  {isApproved ? t('changeStatus', 'Approved (Edit)') : t('rejectedStatus', 'Rejected (Edit)')}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                disabled={isLoadingThis}
                                className="p-1.5 rounded-lg border text-red-400 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-50"
                                style={{ borderColor: 'var(--color-border, #334155)', backgroundColor: 'var(--color-inner-dark, #0f172a)' }}
                                title={t('deleteTransaction', 'Delete Transaction Record')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM ACTIONS */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-3 border font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-85"
          style={{
            backgroundColor: 'var(--color-inner-dark, #0f172a)',
            borderColor: 'var(--color-border, #334155)',
            color: 'var(--color-text-secondary, #94a3b8)'
          }}
        >
          <RefreshCw className="h-4 w-4" /> {t('resetConfigBtn', 'Reset Config')}
        </button>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-8 py-3 text-white font-bold rounded-2xl transition text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:brightness-110"
          style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
        >
          <Save className="h-4 w-4" />
          {loading ? t('savingSettings', 'Saving Settings...') : t('saveConfigBtn', 'Save Gateway Settings')}
        </button>
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewTx && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="view_modal_title"
          onClick={() => setViewTx(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <div id="view_modal_title" className="flex items-center gap-2 font-black text-sm">
                <Landmark className="h-4 w-4 text-[var(--color-primary,#3b82f6)]" />
                <span>{t('manualSettlementDetails', 'Manual Settlement Details')}</span>
              </div>
              <button 
                type="button"
                onClick={() => setViewTx(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('transactionId', 'Transaction ID:')}</span>
                <span className="font-bold">{viewTx.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('customer', 'Customer:')}</span>
                <span className="font-bold">{viewTx.customer_name || 'Customer'} ({viewTx.customer_email || 'No email'})</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('planOrPurpose', 'Plan / Purpose:')}</span>
                <span className="font-bold capitalize">{viewTx.plan_name || 'Wallet Top-Up'}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('amount', 'Amount:')}</span>
                <span className="font-black text-emerald-400">{activeCurrencySymbol}{Number(viewTx.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('wireReference', 'Wire Reference:')}</span>
                <span className="font-bold text-amber-400">{viewTx.transfer_reference || 'None provided'}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('status', 'Status:')}</span>
                <span className="font-extrabold uppercase">{viewTx.status}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                <span className="opacity-60 font-sans">{t('date', 'Date:')}</span>
                <span>{new Date(viewTx.created_at).toLocaleString()}</span>
              </div>
              {viewTx.confirmed_at && (
                <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border, #334155)' }}>
                  <span className="opacity-60 font-sans">{t('confirmedAt', 'Confirmed At:')}</span>
                  <span>{new Date(viewTx.confirmed_at).toLocaleString()}</span>
                </div>
              )}
              {viewTx.notes && (
                <div className="pt-1">
                  <span className="opacity-60 font-sans block mb-1">{t('customerNotes', 'Transfer Notes / Memo:')}</span>
                  <div className="p-2.5 rounded-xl border text-xs font-sans leading-relaxed" style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}>
                    {viewTx.notes}
                  </div>
                </div>
              )}
              {viewTx.failure_reason && (
                <div className="pt-1 text-red-400 font-sans">
                  <span className="opacity-80 block mb-0.5">{t('rejectionReason', 'Rejection Reason:')}</span>
                  <div>{viewTx.failure_reason}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <button
                type="button"
                onClick={() => {
                  const tx = viewTx;
                  setViewTx(null);
                  handleOpenEdit(tx);
                }}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                style={{ borderColor: 'var(--color-border, #334155)', backgroundColor: 'var(--color-inner-dark, #0f172a)' }}
              >
                {t('editBtn', 'Edit')}
              </button>
              <button
                type="button"
                onClick={() => setViewTx(null)}
                className="px-4 py-2 rounded-xl text-white font-bold text-xs bg-[var(--color-primary,#3b82f6)] hover:brightness-110 cursor-pointer"
              >
                {t('closeBtn', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editTx && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit_modal_title"
          onClick={() => setEditTx(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <div id="edit_modal_title" className="flex items-center gap-2 font-black text-sm">
                <Edit3 className="h-4 w-4 text-[var(--color-primary,#3b82f6)]" />
                <span>{t('editManualSettlement', 'Edit Manual Settlement')}</span>
              </div>
              <button 
                type="button"
                onClick={() => setEditTx(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase mb-1 opacity-70">{t('customerName', 'Customer Name')}</label>
                <input
                  type="text"
                  id="edit_customer_name"
                  name="edit_customer_name_guard"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1 opacity-70">{t('customerEmail', 'Customer Email')}</label>
                <input
                  type="email"
                  id="edit_customer_email"
                  name="edit_customer_email_guard"
                  value={editForm.customer_email}
                  onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1 opacity-70">{t('amount', 'Amount')} ({activeCurrencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    id="edit_customer_amount"
                    name="edit_customer_amount_guard"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1 opacity-70">{t('status', 'Status')}</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="payment-input w-full border rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
                  >
                    <option value="pending">{t('pendingApproval', 'Pending')}</option>
                    <option value="succeeded">{t('approvedStatus', 'Approved (Succeeded)')}</option>
                    <option value="rejected">{t('rejectedStatus', 'Rejected')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1 opacity-70">{t('wireReference', 'Wire Transfer Reference')}</label>
                <input
                  type="text"
                  id="edit_wire_ref"
                  name="edit_wire_ref_guard"
                  value={editForm.transfer_reference}
                  onChange={(e) => setEditForm({ ...editForm, transfer_reference: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                  placeholder="e.g. WIRE-89214710"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  role="presentation"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none font-mono font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1 opacity-70">{t('notes', 'Transfer Notes')}</label>
                <textarea
                  rows={2}
                  id="edit_tx_notes"
                  name="edit_tx_notes_guard"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none leading-relaxed"
                  style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)', color: 'var(--color-text, #ffffff)' }}
                />
              </div>

              {editForm.status === 'rejected' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1 text-red-400">{t('rejectionReason', 'Rejection Reason')}</label>
                  <input
                    type="text"
                    id="edit_failure_reason"
                    name="edit_failure_reason_guard"
                    value={editForm.failure_reason}
                    onChange={(e) => setEditForm({ ...editForm, failure_reason: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                    placeholder="e.g. Mismatched reference code"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    role="presentation"
                    className="payment-input w-full border rounded-xl p-2.5 text-xs outline-none border-red-500/40"
                    style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', color: '#f87171' }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border, #334155)' }}>
              <button
                type="button"
                onClick={() => setEditTx(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ borderColor: 'var(--color-border, #334155)', backgroundColor: 'var(--color-inner-dark, #0f172a)' }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer hover:brightness-110 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
              >
                {isSavingEdit ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t('saveChanges', 'Save Changes')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRIPE GUIDE MODAL */}
      {showStripeGuideModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide_modal_title"
          onClick={() => setShowStripeGuideModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative text-xs cursor-default max-h-[92vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-card, #1e293b)',
              borderColor: 'var(--color-border, #334155)',
              color: 'var(--color-text, #ffffff)'
            }}
          >
            <button 
              type="button"
              onClick={() => setShowStripeGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs hover:opacity-80"
              style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', color: 'var(--color-text, #ffffff)' }}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-1.5 pr-8">
              <h2 id="guide_modal_title" className="text-xl font-black">{t('stripeConnectModalTitle', 'Connect Stripe & Webhooks')}</h2>
              <p className="text-xs opacity-75">{t('stripeConnectModalSub', 'Follow standard setup for webhook verification.')}</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl border space-y-1.5" style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}>
                <span className="font-bold text-xs text-blue-400 block">1. Obtain Stripe API Keys</span>
                <p className="text-[11px] opacity-80">Navigate to Stripe Dashboard &gt; Developers &gt; API keys. Copy the Publishable key and Secret key for your selected mode (Test or Live).</p>
              </div>

              <div className="p-3.5 rounded-2xl border space-y-1.5" style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}>
                <span className="font-bold text-xs text-emerald-400 block">2. Register Webhook Endpoint</span>
                <p className="text-[11px] opacity-80">In Stripe Dashboard &gt; Developers &gt; Webhooks, click "Add endpoint" and paste your listener URL: <code className="text-blue-400 font-mono">{webhookEndpointUrl}</code></p>
                <p className="text-[11px] opacity-80">Listen to: <code className="font-mono text-amber-300">checkout.session.completed</code>, <code className="font-mono text-amber-300">payment_intent.succeeded</code>, and <code className="font-mono text-amber-300">customer.subscription.*</code></p>
              </div>

              <div className="p-3.5 rounded-2xl border space-y-1.5" style={{ backgroundColor: 'var(--color-inner-dark, #0f172a)', borderColor: 'var(--color-border, #334155)' }}>
                <span className="font-bold text-xs text-amber-400 block">3. Copy Signing Secret & Verify</span>
                <p className="text-[11px] opacity-80">Reveal the Signing secret (starts with <code className="font-mono text-emerald-400">whsec_...</code>), paste it into Webhook Signing Secret, and click <strong className="text-white">Verify Stripe Key</strong>.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowStripeGuideModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--color-primary,#3b82f6)] cursor-pointer"
              >
                {t('gotItBtn', 'Got it, let\'s verify')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
