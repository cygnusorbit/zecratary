// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Save, RefreshCw, 
  Check, Eye, EyeOff, Globe, Zap, Sliders, ShieldCheck, Terminal, 
  ExternalLink, Code2, AlertTriangle, Activity, DownloadCloud, 
  UploadCloud, Sparkles, Landmark, Clock, X, XCircle, Search, 
  Filter, Trash2, Edit3, Copy, ChevronDown, CheckCheck, Coins, FileText
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
  testMode: boolean; // Master Sandbox flag
  stripeConnected?: boolean;
  stripeKeysVerified?: boolean;
  stripeWebhookVerified?: boolean;
  paypalKeysVerified?: boolean;
  paypalWebhookVerified?: boolean;
  stripe: {
    enabled: boolean;
    testMode: boolean; // Stripe Sandbox flag
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  paypal: {
    enabled: boolean;
    testMode: boolean; // PayPal Sandbox flag
    clientId: string;
    clientSecret: string;
    webhookId: string;
    environment: 'sandbox' | 'live';
  };
  manualSettlement: ManualSettlementConfig;
}

interface PaymentTransaction {
  id: string;
  customer_name?: string;
  customerName?: string;
  customer_email?: string;
  customerEmail?: string;
  plan_name?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  gateway?: string;
  status: string;
  test_mode?: boolean;
  failure_reason?: string;
  failureReason?: string;
  transfer_reference?: string;
  transferReference?: string;
  confirmed_amount?: number;
  confirmedAmount?: number;
  confirmed_at?: string;
  confirmedAt?: string;
  notes?: string;
  created_at?: string;
  createdAt?: string;
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

  // Modals & Helpers
  const [showStripeGuideModal, setShowStripeGuideModal] = useState(false);
  const [copiedCliKey, setCopiedCliKey] = useState<string | null>(null);
  const [copiedWhUrl, setCopiedWhUrl] = useState(false);
  const [copiedPpWhUrl, setCopiedPpWhUrl] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Bankwire Queue & Modals State (v8.1.15 Restoration)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'succeeded' | 'rejected'>('all');
  const [settlementSearch, setSettlementSearch] = useState('');
  const [viewTx, setViewTx] = useState<PaymentTransaction | null>(null);
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
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      testMode: true,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
    },
    paypal: {
      enabled: true,
      testMode: true,
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

    const [webhookEndpointUrl, setWebhookEndpointUrl] = useState('https://zecratary.com/api/webhooks/stripe');
  const [paypalWebhookUrl, setPaypalWebhookUrl] = useState('https://zecratary.com/api/webhooks/paypal');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setWebhookEndpointUrl(`${window.location.origin}/api/webhooks/stripe`);
      setPaypalWebhookUrl(`${window.location.origin}/api/webhooks/paypal`);
    }
  }, []);

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

  // Fetch Gateway Configuration and Transactions
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-gateway?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.paymentSettings) {
          const s = data.paymentSettings;
          setConfig(prev => ({
            ...prev,
            ...s,
            stripe: {
              ...prev.stripe,
              ...(s.stripe || {}),
              testMode: s.stripe?.testMode !== undefined ? s.stripe.testMode : (s.testMode !== undefined ? s.testMode : true)
            },
            paypal: {
              ...prev.paypal,
              ...(s.paypal || {}),
              testMode: s.paypal?.environment === 'sandbox' || s.paypal?.testMode || s.testMode,
              environment: (s.paypal?.environment || (s.testMode ? 'sandbox' : 'live'))
            },
            manualSettlement: { ...prev.manualSettlement, ...(s.manualSettlement || {}) },
          }));
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
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
    window.addEventListener('zecratary_wallet_updated', handleSync);
    return () => {
      window.removeEventListener('zecratary_payment_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleSync);
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
        setFeedback({ type: 'success', msg: 'Payment gateway configuration saved successfully in PostgreSQL & MySQL!' });
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

  // Toggle Master Sandbox Mode (Both Gateways)
  const handleToggleMasterTestMode = async () => {
    const nextMode = !config.testMode;
    const updated: GatewayConfig = {
      ...config,
      testMode: nextMode,
      stripe: {
        ...config.stripe,
        testMode: nextMode
      },
      paypal: {
        ...config.paypal,
        testMode: nextMode,
        environment: nextMode ? 'sandbox' : 'live'
      }
    };
    setConfig(updated);

    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_master_test_mode', testMode: nextMode })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new Event('zecratary_payment_updated'));
        setFeedback({
          type: 'success',
          msg: nextMode
            ? tr('sandboxBothActiveBadge', 'Sandbox Active (Both Gateways)')
            : tr('liveBothActiveBadge', 'Live Production (Both Gateways)')
        });
      }
    } catch (_) {}
  };

  const handleToggleStripeSandbox = () => {
    setConfig(prev => ({
      ...prev,
      stripe: {
        ...prev.stripe,
        testMode: !prev.stripe.testMode
      }
    }));
  };

  const handleTogglePayPalSandbox = () => {
    const nextPpMode = !config.paypal.testMode;
    setConfig(prev => ({
      ...prev,
      paypal: {
        ...prev.paypal,
        testMode: nextPpMode,
        environment: nextPpMode ? 'sandbox' : 'live'
      }
    }));
  };

  // Verify Stripe Keys
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
          testMode: config.stripe.testMode
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

  // Verify PayPal Keys
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
          testMode: config.paypal.testMode
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

  // Bankwire Manual Settlement Approval Queue Logic (v8.1.15)
  const manualTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const gw = (tx.gateway || '').toLowerCase();
      return gw === 'manual' || gw === 'bank_wire' || gw === 'wire' || gw === 'bank_transfer' || gw === 'manual_settlement' || Boolean(tx.transfer_reference);
    });
  }, [transactions]);

  const pendingCount = useMemo(() => {
    return manualTransactions.filter(tx => {
      const s = (tx.status || '').toLowerCase();
      return s === 'pending' || s === 'pending_approval' || s === 'review';
    }).length;
  }, [manualTransactions]);

  const filteredManualTransactions = useMemo(() => {
    return manualTransactions.filter(tx => {
      const s = (tx.status || '').toLowerCase();
      if (settlementFilter === 'pending' && !(s === 'pending' || s === 'pending_approval' || s === 'review')) return false;
      if (settlementFilter === 'succeeded' && !(s === 'succeeded' || s === 'approved' || s === 'completed')) return false;
      if (settlementFilter === 'rejected' && !(s === 'rejected' || s === 'cancelled' || s === 'failed')) return false;

      if (settlementSearch.trim()) {
        const q = settlementSearch.toLowerCase().trim();
        const matchId = tx.id?.toLowerCase().includes(q);
        const matchName = (tx.customer_name || tx.customerName)?.toLowerCase().includes(q);
        const matchEmail = (tx.customer_email || tx.customerEmail)?.toLowerCase().includes(q);
        const matchRef = (tx.transfer_reference || tx.transferReference)?.toLowerCase().includes(q);
        const matchPlan = (tx.plan_name || tx.planName)?.toLowerCase().includes(q);
        return matchId || matchName || matchEmail || matchRef || matchPlan;
      }
      return true;
    });
  }, [manualTransactions, settlementFilter, settlementSearch]);

  const handleApprovePayment = async (tx: PaymentTransaction) => {
    if (!confirm(tr('confirmApproveWire', "Are you sure you want to approve this bank wire transfer? This will confirm funds and deposit credit into the user's wallet."))) {
      return;
    }
    setActionLoadingId(tx.id);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_manual_settlement', id: tx.id })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Manual settlement approved successfully! Funds credited.' });
        loadConfig();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
        }
        if (viewTx?.id === tx.id) setViewTx(null);
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to approve manual settlement.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error communicating with server.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectPayment = async (tx: PaymentTransaction) => {
    const reason = prompt(tr('enterRejectionReasonPrompt', 'Please provide a reason for rejecting this wire transfer (optional):'), 'Bank wire transfer not received or reference mismatched');
    if (reason === null) return;
    setActionLoadingId(tx.id);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_manual_settlement', id: tx.id, failureReason: reason })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Manual settlement has been rejected.' });
        loadConfig();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
        }
        if (viewTx?.id === tx.id) setViewTx(null);
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to reject manual settlement.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error communicating with server.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm(tr('confirmDeleteWire', `Are you sure you want to delete transaction record ${txId}? This cannot be undone.`))) {
      return;
    }
    setActionLoadingId(txId);
    try {
      const res = await fetch(`/api/admin/payment-gateway?id=${encodeURIComponent(txId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: txId })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Transaction record deleted successfully.' });
        setTransactions(prev => prev.filter(t => t.id !== txId));
        if (viewTx?.id === txId) setViewTx(null);
        if (editTx?.id === txId) setEditTx(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
        }
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to delete transaction.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error communicating with server.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (tx: PaymentTransaction) => {
    setEditTx(tx);
    setEditForm({
      customer_name: tx.customer_name || tx.customerName || '',
      customer_email: tx.customer_email || tx.customerEmail || '',
      plan_name: tx.plan_name || tx.planName || 'Bank Wire Deposit',
      amount: Number(tx.amount || 0),
      transfer_reference: tx.transfer_reference || tx.transferReference || '',
      status: tx.status || 'pending',
      notes: tx.notes || '',
      failure_reason: tx.failure_reason || tx.failureReason || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editTx) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_transaction',
          id: editTx.id,
          ...editForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Transaction record updated successfully in PostgreSQL & MySQL!' });
        setEditTx(null);
        loadConfig();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_payment_updated'));
          window.dispatchEvent(new Event('zecratary_wallet_updated'));
        }
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to update transaction.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error communicating with server.' });
    } finally {
      setIsSavingEdit(false);
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

      {/* Gateway Engine Monitor Summary Bar with Master Sandbox Toggle */}
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
                STRIPE ({config.stripe.testMode ? 'SANDBOX' : 'LIVE'})
              </span>
            )}
            {config.paypal.enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                PAYPAL ({config.paypal.testMode ? 'SANDBOX' : 'LIVE'})
              </span>
            )}
            {config.manualSettlement.enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                BANK WIRE {pendingCount > 0 && `(${pendingCount} PENDING)`}
              </span>
            )}
          </div>
        </div>

        {/* Master Sandbox Switch for Both Gateways */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold opacity-80">{tr('masterSandboxLabel', 'Master Sandbox (Both Gateways):')}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={config.testMode}
              onClick={handleToggleMasterTestMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                config.testMode ? 'bg-[#f59e0b]' : 'bg-[var(--color-emerald,#10b981)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.testMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span 
              className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shadow-xs"
              style={{
                backgroundColor: config.testMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                borderColor: config.testMode ? '#f59e0b' : 'var(--color-emerald)',
                color: config.testMode ? '#fbbf24' : 'var(--color-emerald)'
              }}
            >
              {config.testMode ? tr('sandboxBothActiveBadge', 'Sandbox (Both)') : tr('liveBothActiveBadge', 'Live (Both)')}
            </span>
          </div>
        </div>
      </div>

      {/* Global Processing Currency Card with Styled Dropdown */}
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative"
          style={activeTab === 'manual' ? {
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-primary)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          } : { color: 'var(--color-text-secondary)' }}
        >
          <Landmark className="h-4 w-4" />
          <span>{tr('tabManual', 'Bank Wire / Manual Settlement')}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-black">
              {pendingCount}
            </span>
          )}
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

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${config.stripeKeysVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                {config.stripeKeysVerified ? tr('keysVerified', 'Keys Verified') : tr('keysUnverified', 'Keys Unverified')}
              </span>
            </div>
          </div>

          {/* Dedicated Stripe Sandbox Slide-Toggle Card */}
          <div 
            className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{tr('stripeSandboxTitle', 'Stripe Sandbox (Test Mode)')}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${config.stripe.testMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                  {config.stripe.testMode ? 'SANDBOX ACTIVE' : 'LIVE PRODUCTION'}
                </span>
              </div>
              <p className="text-[11px] opacity-70 mt-0.5">
                {tr('stripeSandboxDesc', 'Process payments against Stripe Test API using test credit cards.')}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={config.stripe.testMode}
              onClick={handleToggleStripeSandbox}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                config.stripe.testMode ? 'bg-[#f59e0b]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.stripe.testMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {config.stripe.testMode && config.stripe.secretKey && !config.stripe.secretKey.startsWith('sk_test_') && (
            <div 
              className="p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold shadow-xs"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: '#f59e0b', color: '#fbbf24' }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <div className="font-bold">{tr('testKeyMismatchAlert', 'Stripe Test Mode Key Alert')}</div>
                <div className="text-[11px] font-normal opacity-90 mt-0.5 leading-relaxed">
                  {tr('testKeyMismatchDesc', "Sandbox Test Mode is active, but your Secret Key does not start with 'sk_test_'. Payments will fail until valid test keys are entered.")}
                </div>
              </div>
            </div>
          )}

          {config.stripe.testMode && (
            <div 
              className="p-3.5 rounded-2xl border space-y-1.5"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                  <CreditCard className="h-3.5 w-3.5" />
                  {tr('sandboxTestCard', 'Stripe Test Card Helper')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('4242424242424242', 'test_card')}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Copy className="h-2.5 w-2.5" />
                  <span>{copiedCliKey === 'test_card' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy Card')}</span>
                </button>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Use card number <code className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] border">4242 4242 4242 4242</code>, {tr('testCardMeta', 'Any future MM/YY and any 3-digit CVC (e.g. 123)')}.
              </p>
            </div>
          )}

          {/* Credential Inputs */}
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

          {/* Webhook Secret Input */}
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold">Webhook Signing Secret *</label>
              {config.stripeWebhookVerified && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Verified
                </span>
              )}
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

          {/* Restored Complete Webhook & CLI Setup Guide Footer Card */}
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
                <code className="truncate select-all" suppressHydrationWarning>
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

      {/* TAB 2: PAYPAL GATEWAY */}
      {activeTab === 'paypal' && (
        <div 
          role="region"
          aria-label="PayPal API Configuration"
          className="p-6 rounded-3xl border shadow-xl space-y-6"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
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

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${config.paypalKeysVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                {config.paypalKeysVerified ? tr('keysVerified', 'Keys Verified') : tr('keysUnverified', 'Keys Unverified')}
              </span>
            </div>
          </div>

          <div 
            className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{tr('paypalSandboxTitle', 'PayPal Sandbox (Test Mode)')}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${config.paypal.testMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                  {config.paypal.testMode ? tr('paypalSandboxActiveBadge', 'Sandbox Active (api-m.sandbox.paypal.com)') : tr('paypalLiveActiveBadge', 'Live Production (api-m.paypal.com)')}
                </span>
              </div>
              <p className="text-[11px] opacity-70 mt-0.5">
                {tr('paypalSandboxDesc', 'Process payments against PayPal Developer Sandbox (api-m.sandbox.paypal.com).')}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={config.paypal.testMode}
              onClick={handleTogglePayPalSandbox}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-md ${
                config.paypal.testMode ? 'bg-[#f59e0b]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.paypal.testMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {config.paypal.testMode && (
            <div 
              className="p-4 rounded-2xl border space-y-2.5"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                  <Zap className="h-3.5 w-3.5" />
                  {tr('paypalSandboxGuide', 'PayPal Sandbox Test Buyer Helper')}
                </span>
                <a
                  href="https://developer.paypal.com/dashboard/accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  <span>{tr('openPaypalSandboxBtn', 'PayPal Sandbox Accounts')}</span>
                </a>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {tr('paypalSandboxInstructions', 'Use your PayPal Developer sandbox personal account (e.g. sb-buyer@personal.example.com) to complete simulated checkouts.')}
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <code className="text-[11px] font-mono px-2 py-1 rounded border select-all" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  sb-buyer@personal.example.com
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy('sb-buyer@personal.example.com', 'sb_buyer')}
                  className="px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  {copiedCliKey === 'sb_buyer' ? tr('copiedBtn', 'Copied!') : tr('copyBtn', 'Copy')}
                </button>
              </div>
            </div>
          )}

          {/* PayPal Credential Fields */}
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

          {/* Webhook ID Field */}
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold">{tr('paypalWebhookId', 'PayPal Webhook ID')}</label>
              {config.paypalWebhookVerified && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Verified
                </span>
              )}
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
                href={config.paypal.testMode ? 'https://developer.paypal.com/dashboard/applications/sandbox' : 'https://developer.paypal.com/dashboard/applications/live'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold flex items-center gap-1 hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                <span>PayPal Developer Console</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

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
          </div>
        </div>
      )}

      {/* TAB 3: BANK WIRE / MANUAL SETTLEMENT (v8.1.15 Restoration) */}
      {activeTab === 'manual' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Section 1: Bank Wire Beneficiary Settings Card */}
          <div 
            role="region"
            aria-label="Bank Wire Settlement Configuration"
            className="p-6 rounded-3xl border shadow-xl space-y-6"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
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

            {/* Bank Wire Details Form */}
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

            {/* Verification Policies */}
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

          {/* Section 2: Manual Settlement Approval Queue (v8.1.15 Restored) */}
          <div 
            role="region"
            aria-label="Manual Settlement Approval Queue"
            className="p-6 rounded-3xl border shadow-xl space-y-5"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Landmark className="h-5 w-5 text-purple-400" />
                  <span>{tr('manualQueueTitle', 'Manual Settlement Approval Queue')}</span>
                  {pendingCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                      {pendingCount} Pending Review
                    </span>
                  )}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr('manualQueueSubtitle', 'Review, approve, reject, or edit submitted bank wire transfers and credit user balances in PostgreSQL & MySQL.')}
                </p>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 opacity-50" />
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={settlementSearch}
                    onChange={(e) => setSettlementSearch(e.target.value)}
                    placeholder={tr('searchSettlementsPlaceholder', 'Search by customer, email, tx ID...')}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="relative">
                  <select
                    value={settlementFilter}
                    onChange={(e) => setSettlementFilter(e.target.value as any)}
                    className="appearance-none px-3.5 py-1.5 pr-8 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="all" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{tr('filterAllStatuses', 'All Statuses')}</option>
                    <option value="pending" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{tr('filterPending', 'Pending Review')}</option>
                    <option value="succeeded" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{tr('filterApproved', 'Approved / Succeeded')}</option>
                    <option value="rejected" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{tr('filterRejected', 'Rejected / Failed')}</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-60" />
                </div>

                <button
                  type="button"
                  onClick={loadConfig}
                  className="p-2 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  title="Refresh Queue"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Approval Queue Table */}
            <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead 
                    className="border-b uppercase font-bold text-[10px] tracking-wider"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <tr>
                      <th className="px-4 py-3">{tr('colDateId', 'Date & Tx ID')}</th>
                      <th className="px-4 py-3">{tr('colCustomer', 'Customer')}</th>
                      <th className="px-4 py-3">{tr('colPurpose', 'Purpose / Plan')}</th>
                      <th className="px-4 py-3">{tr('colAmount', 'Amount')}</th>
                      <th className="px-4 py-3">{tr('colReference', 'Transfer Reference')}</th>
                      <th className="px-4 py-3">{tr('colStatus', 'Status')}</th>
                      <th className="px-4 py-3 text-right">{tr('colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {filteredManualTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs opacity-60">
                          {tr('noSettlementsFound', 'No bank wire settlement records found matching your filter criteria.')}
                        </td>
                      </tr>
                    ) : (
                      filteredManualTransactions.map(tx => {
                        const isPending = (tx.status || '').toLowerCase() === 'pending' || (tx.status || '').toLowerCase() === 'pending_approval';
                        const isApproved = (tx.status || '').toLowerCase() === 'succeeded' || (tx.status || '').toLowerCase() === 'approved';
                        const isRejected = (tx.status || '').toLowerCase() === 'rejected' || (tx.status || '').toLowerCase() === 'failed';
                        const ref = tx.transfer_reference || tx.transferReference || '—';

                        return (
                          <tr key={tx.id} className="transition hover:opacity-90">
                            <td className="px-4 py-3.5">
                              <span className="block font-mono text-[11px] font-bold" style={{ color: 'var(--color-text)' }}>
                                {tx.id}
                              </span>
                              <span className="text-[10px] opacity-60 font-mono">
                                {tx.created_at || tx.createdAt || 'Recent'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="font-extrabold block text-xs" style={{ color: 'var(--color-text)' }}>
                                {tx.customer_name || tx.customerName || 'Customer'}
                              </span>
                              <span className="text-[11px] font-mono opacity-70">
                                {tx.customer_email || tx.customerEmail || '—'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold font-mono inline-block" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                                {tx.plan_name || tx.planName || 'Wallet Deposit'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 font-mono font-bold text-xs">
                              {SUPPORTED_CURRENCIES.find(c => c.code === (tx.currency || config.currency))?.symbol || '$'}{Number(tx.amount || 0).toFixed(2)}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                <span className="font-bold select-all">{ref}</span>
                                {ref !== '—' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(ref, `ref_${tx.id}`)}
                                    className="p-1 rounded hover:opacity-80 cursor-pointer opacity-60"
                                    title="Copy Reference"
                                  >
                                    {copiedCliKey === `ref_${tx.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              {isPending ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                                  <Clock className="h-3 w-3 animate-spin" />
                                  <span>{tr('pendingReviewBadge', 'Pending Review')}</span>
                                </span>
                              ) : isApproved ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                  <Check className="h-3 w-3" />
                                  <span>{tr('approvedBadge', 'Approved')}</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                                  <X className="h-3 w-3" />
                                  <span>{tr('rejectedBadge', 'Rejected')}</span>
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* View Details Modal Trigger */}
                                <button
                                  type="button"
                                  onClick={() => setViewTx(tx)}
                                  className="p-1.5 rounded-lg border transition shadow-xs cursor-pointer hover:opacity-80"
                                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                                  title={tr('btnView', 'View Details')}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {/* Edit Modal Trigger */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(tx)}
                                  className="p-1.5 rounded-lg border transition shadow-xs cursor-pointer hover:opacity-80"
                                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                                  title={tr('btnEdit', 'Edit')}
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                                </button>

                                {/* Quick Approve Action */}
                                {isPending && (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === tx.id}
                                    onClick={() => handleApprovePayment(tx)}
                                    className="p-1.5 rounded-lg border transition shadow-xs cursor-pointer hover:opacity-80 bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    title={tr('btnApprove', 'Approve & Credit')}
                                  >
                                    <Check className={`h-3.5 w-3.5 ${actionLoadingId === tx.id ? 'animate-spin' : ''}`} />
                                  </button>
                                )}

                                {/* Quick Reject Action */}
                                {isPending && (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === tx.id}
                                    onClick={() => handleRejectPayment(tx)}
                                    className="p-1.5 rounded-lg border transition shadow-xs cursor-pointer hover:opacity-80 bg-rose-500/10 border-rose-500/30 text-rose-400"
                                    title={tr('btnReject', 'Reject')}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {/* Delete Record */}
                                <button
                                  type="button"
                                  disabled={actionLoadingId === tx.id}
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 rounded-lg border transition shadow-xs cursor-pointer hover:bg-rose-500/10 border-rose-500/30 text-rose-400"
                                  title={tr('btnDelete', 'Delete')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
        </div>
      )}

      {/* Restored Complete Stripe CLI & Webhooks Guide Modal (v8.1.15) */}
      {showStripeGuideModal && (
        <div 
          role="dialog"
          aria-label="Stripe CLI Guide Modal"
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
                  <Code2 className="h-4 w-4 text-[var(--color-primary)]" />
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
                  <span className="select-all truncate" suppressHydrationWarning>
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
                  href={config.stripe.testMode ? "https://dashboard.stripe.com/test/apikeys" : "https://dashboard.stripe.com/apikeys"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{tr('openApiKeysBtn', 'Stripe API Keys')}</span>
                </a>
                <a
                  href={config.stripe.testMode ? "https://dashboard.stripe.com/test/webhooks" : "https://dashboard.stripe.com/webhooks"}
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
                className="px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer shadow-xs"
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

      {/* Restored View Bank Wire Modal (v8.1.15) */}
      {viewTx && (
        <div 
          role="dialog"
          aria-label="View Bank Wire Details Modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div 
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-black flex items-center gap-2">
                <Landmark className="h-5 w-5 text-purple-400" />
                <span>{tr('modalViewTitle', 'Bank Wire Transfer Details')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewTx(null)}
                className="p-1 rounded-lg hover:opacity-75 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="block text-[10px] opacity-60 uppercase font-bold">Transaction ID</span>
                  <span className="font-mono font-bold text-xs select-all">{viewTx.id}</span>
                </div>
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="block text-[10px] opacity-60 uppercase font-bold">Status</span>
                  <span className="font-extrabold text-xs uppercase">{viewTx.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                <span className="block text-[10px] opacity-60 uppercase font-bold">Customer</span>
                <span className="font-extrabold text-sm block">{viewTx.customer_name || viewTx.customerName || 'Customer'}</span>
                <span className="font-mono text-[11px] opacity-70 block">{viewTx.customer_email || viewTx.customerEmail || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="block text-[10px] opacity-60 uppercase font-bold">Amount</span>
                  <span className="font-mono font-black text-sm text-emerald-400">
                    {SUPPORTED_CURRENCIES.find(c => c.code === (viewTx.currency || config.currency))?.symbol || '$'}{Number(viewTx.amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="block text-[10px] opacity-60 uppercase font-bold">Transfer Reference</span>
                  <span className="font-mono font-bold text-xs select-all">{viewTx.transfer_reference || viewTx.transferReference || '—'}</span>
                </div>
              </div>

              {(viewTx.notes || viewTx.failure_reason || viewTx.failureReason) && (
                <div className="p-3 rounded-xl border text-[11px]" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="block text-[10px] opacity-60 uppercase font-bold mb-0.5">Notes / Rejection Reason</span>
                  <p>{viewTx.notes || viewTx.failure_reason || viewTx.failureReason}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {((viewTx.status || '').toLowerCase() === 'pending' || (viewTx.status || '').toLowerCase() === 'pending_approval') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRejectPayment(viewTx)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:opacity-80 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovePayment(viewTx)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md cursor-pointer"
                  >
                    Approve & Credit
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewTx(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restored Edit Bank Wire Modal (v8.1.15) */}
      {editTx && (
        <div 
          role="dialog"
          aria-label="Edit Bank Wire Transaction Modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div 
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-black flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-400" />
                <span>{tr('modalEditTitle', 'Edit Bank Wire Transaction')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditTx(null)}
                className="p-1 rounded-lg hover:opacity-75 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1">{tr('labelCustomerName', 'Customer Name')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{tr('labelCustomerEmail', 'Customer Email')}</label>
                <input
                  type="email"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={editForm.customer_email}
                  onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">{tr('labelAmountPaid', 'Amount Paid')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">{tr('labelStatus', 'Status')}</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="succeeded">Approved (Succeeded)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">{tr('labelTransferRef', 'Transfer Reference')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={editForm.transfer_reference}
                  onChange={(e) => setEditForm({ ...editForm, transfer_reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border font-mono font-bold outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">{tr('labelNotes', 'Notes')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border font-medium outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setEditTx(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                {tr('btnCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Save className={`h-4 w-4 ${isSavingEdit ? 'animate-spin' : ''}`} />
                <span>{isSavingEdit ? 'Saving...' : tr('btnSaveChanges', 'Save Changes')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Feedback Toast */}
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
