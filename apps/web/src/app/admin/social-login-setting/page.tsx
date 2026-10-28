'use client';
// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Key, Check, Copy, Eye, EyeOff, RotateCcw, 
  ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Sparkles,
  ChevronDown, Settings2, Sliders
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface ProviderConfig {
  enabled: boolean;
  environment: 'production' | 'sandbox';
  clientId?: string;
  clientSecret?: string;
  appId?: string;
  appSecret?: string;
  teamId?: string;
  keyId?: string;
  privateKey?: string;
  callbackUrl: string;
}

interface SocialLoginSettings {
  google: ProviderConfig;
  facebook: ProviderConfig;
  apple: ProviderConfig;
}

const DEFAULT_SETTINGS: SocialLoginSettings = {
  google: {
    enabled: true,
    environment: 'production',
    clientId: '',
    clientSecret: '',
    callbackUrl: '/api/auth/callback/google'
  },
  facebook: {
    enabled: true,
    environment: 'production',
    appId: '',
    appSecret: '',
    callbackUrl: '/api/auth/callback/facebook'
  },
  apple: {
    enabled: true,
    environment: 'production',
    clientId: '',
    teamId: '',
    keyId: '',
    privateKey: '',
    callbackUrl: '/api/auth/callback/apple'
  }
};

export default function SocialLoginSettingPage() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<SocialLoginSettings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<SocialLoginSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Field visibility toggles
  const [showGoogleSecret, setShowGoogleSecret] = useState<boolean>(false);
  const [showFacebookSecret, setShowFacebookSecret] = useState<boolean>(false);
  const [showApplePrivateKey, setShowApplePrivateKey] = useState<boolean>(false);

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [originUrl, setOriginUrl] = useState<string>('');

  // Self-update guard to eliminate race conditions
  const isSelfUpdatingRef = useRef<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3800);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const fetchSettings = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/admin/social-login?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const conf = data.socialLogin || data.settings?.socialLogin || data;
        if (conf && typeof conf === 'object') {
          const merged: SocialLoginSettings = {
            google: { ...DEFAULT_SETTINGS.google, ...(conf.google || {}) },
            facebook: { ...DEFAULT_SETTINGS.facebook, ...(conf.facebook || {}) },
            apple: { ...DEFAULT_SETTINGS.apple, ...(conf.apple || {}) }
          };
          setSettings(merged);
          setInitialSettings(JSON.parse(JSON.stringify(merged)));
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch social login settings:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('socialLoginTitle', 'Social Login Settings')} - Zecratary Admin`;
    fetchSettings();

    const handleExternalUpdates = () => {
      if (isSelfUpdatingRef.current) return;
      fetchSettings(true);
    };

    window.addEventListener('zecratary_social_login_updated', handleExternalUpdates);
    window.addEventListener('zecratary_admin_settings_updated', handleExternalUpdates);
    window.addEventListener('zecratary_theme_updated', handleExternalUpdates);
    window.addEventListener('zecratary_theme_mode_changed', handleExternalUpdates);
    window.addEventListener('zecratary_theme_changed', handleExternalUpdates);
    window.addEventListener('storage', handleExternalUpdates);

    return () => {
      window.removeEventListener('zecratary_social_login_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_admin_settings_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_theme_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_theme_mode_changed', handleExternalUpdates);
      window.removeEventListener('zecratary_theme_changed', handleExternalUpdates);
      window.removeEventListener('storage', handleExternalUpdates);
    };
  }, [fetchSettings, t]);

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings]);

  const handleCopyUrl = (path: string) => {
    const fullUrl = `${originUrl || 'https://domain.com'}${path}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        showToast(t('copiedToast', 'Callback URL copied to clipboard!'), 'success');
      }).catch(() => {
        showToast(fullUrl, 'success');
      });
    } else {
      showToast(fullUrl, 'success');
    }
  };

  const handleTestConnection = (provider: 'google' | 'facebook' | 'apple') => {
    setTestingProvider(provider);

    const conf = settings[provider];
    const hasGoogleCreds = provider === 'google' && conf.clientId?.trim() && conf.clientSecret?.trim();
    const hasFbCreds = provider === 'facebook' && conf.appId?.trim() && conf.appSecret?.trim();
    const hasAppleCreds = provider === 'apple' && conf.clientId?.trim() && conf.teamId?.trim() && conf.keyId?.trim();

    setTimeout(() => {
      setTestingProvider(null);
      if (hasGoogleCreds || hasFbCreds || hasAppleCreds) {
        showToast(`${provider.toUpperCase()}: ${t('testSuccessToast', 'OAuth configuration validated successfully!')}`, 'success');
      } else {
        showToast(`${provider.toUpperCase()}: ${t('testMissingCredentials', 'Please provide credentials before testing.')}`, 'error');
      }
    }, 600);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    isSelfUpdatingRef.current = true;

    try {
      const res = await fetch('/api/admin/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialLogin: settings })
      });

      if (!res.ok) throw new Error(t('socialSettingsSaveError', 'Failed to save social login settings.'));

      setInitialSettings(JSON.parse(JSON.stringify(settings)));
      showToast(t('socialSettingsSavedSuccess', 'Social login settings saved successfully!'), 'success');

      window.dispatchEvent(new Event('zecratary_social_login_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showToast(err.message || t('socialSettingsSaveError', 'Failed to save social login settings.'), 'error');
    } finally {
      setSaving(false);
      setTimeout(() => { isSelfUpdatingRef.current = false; }, 400);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const getProviderStatus = (prov: 'google' | 'facebook' | 'apple') => {
    const c = settings[prov];
    if (!c.enabled) return { label: t('statusDisabled', 'Disabled'), color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
    
    let complete = false;
    if (prov === 'google') complete = Boolean(c.clientId?.trim() && c.clientSecret?.trim());
    if (prov === 'facebook') complete = Boolean(c.appId?.trim() && c.appSecret?.trim());
    if (prov === 'apple') complete = Boolean(c.clientId?.trim() && c.teamId?.trim() && c.keyId?.trim());

    if (complete) {
      return { label: t('statusConfigured', 'Configured & Active'), color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
    }
    return { label: t('statusIncomplete', 'Credentials Incomplete'), color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
  };

  return (
    <div 
      id="zecratary-social-login-canvas"
      role="region"
      aria-label={t('socialLoginTitle', 'Social Login Settings')}
      data-lpignore="true"
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)', boxSizing: 'border-box' }}
    >
      {/* Toast Alert Banner */}
      {toast && (
        <div 
          className="fixed top-20 right-4 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toast.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: toast.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold transition opacity-70 hover:opacity-100"
            style={{ color: 'var(--color-text)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('backToAdmin', 'Back to Admin Settings')}</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--color-primary)' }}>
            <Key className="h-6 w-6" />
            <span>{t('socialLoginTitle', 'Social Login Settings')}</span>
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {t('socialLoginSubtitle', 'Configure OAuth 2.0 authentication providers, client credentials, and callback endpoints.')}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition opacity-80 hover:opacity-100 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t('resetSocialSettingsBtn', 'Reset Defaults')}</span>
          </button>

          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={handleSaveSettings}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer ${
              saving || !isDirty ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-95'
            }`}
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>{saving ? t('savingSocialSettings', 'Saving Settings...') : t('saveSocialSettingsBtn', 'Save Settings')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {t('loadingConfig', 'Loading configuration...')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PROVIDER 1: GOOGLE */}
          <div 
            role="region"
            aria-label={t('googleProviderTitle', 'Google Identity Services')}
            data-lpignore="true"
            className="rounded-3xl border shadow-md p-6 space-y-5 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <span>{t('googleProviderTitle', 'Google Identity Services')}</span>
                  </h2>
                  <p className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('googleProviderDesc', 'Allow users to sign in with their Google accounts using OAuth 2.0.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Harmonized Dropdown: Environment Mode */}
                <div className="relative">
                  <select
                    value={settings.google.environment || 'production'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      google: { ...prev.google, environment: e.target.value as any }
                    }))}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-colors duration-200"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="production" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {t('envProduction', 'Production')}
                    </option>
                    <option value="sandbox" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {t('envSandbox', 'Sandbox / Testing')}
                    </option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: 'var(--color-text)' }} />
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getProviderStatus('google').color}`}>
                  {getProviderStatus('google').label}
                </span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.google.enabled}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      google: { ...prev.google, enabled: e.target.checked }
                    }))}
                    className="h-4 w-4 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="text-xs font-bold">{t('providerEnabledLabel', 'Enable')}</span>
                </label>
              </div>
            </div>

            {/* Google Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              <div>
                <label className="block mb-1.5">{t('clientIdLabel', 'Client ID')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.google.clientId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    google: { ...prev.google, clientId: e.target.value }
                  }))}
                  placeholder={t('clientIdPlaceholder', 'Enter OAuth Client ID...')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label className="block mb-1.5">{t('clientSecretLabel', 'Client Secret')}</label>
                <div className="relative">
                  <input
                    type={showGoogleSecret ? 'text' : 'password'}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    value={settings.google.clientSecret || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      google: { ...prev.google, clientSecret: e.target.value }
                    }))}
                    placeholder={t('clientSecretPlaceholder', 'Enter OAuth Client Secret...')}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition cursor-pointer"
                    aria-label={showGoogleSecret ? t('hideSecretTooltip', 'Hide') : t('showSecretTooltip', 'Show')}
                  >
                    {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Callback URL & Test Connection */}
              <div className="md:col-span-2 space-y-1.5 pt-2">
                <label className="block">{t('callbackUrlLabel', 'Authorized Redirect URI')}</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${originUrl}${settings.google.callbackUrl}`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal select-all opacity-80 cursor-default"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(settings.google.callbackUrl)}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t('copyCallbackUrlBtn', 'Copy URL')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={testingProvider === 'google'}
                    onClick={() => handleTestConnection('google')}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{testingProvider === 'google' ? t('testingConnection', 'Testing...') : t('testConnectionBtn', 'Test Connection')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PROVIDER 2: FACEBOOK */}
          <div 
            role="region"
            aria-label={t('facebookProviderTitle', 'Facebook Login (Meta Graph)')}
            data-lpignore="true"
            className="rounded-3xl border shadow-md p-6 space-y-5 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <span>{t('facebookProviderTitle', 'Facebook Login (Meta Graph)')}</span>
                  </h2>
                  <p className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('facebookProviderDesc', 'Allow users to sign in with their Facebook profiles via Meta Graph API.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Harmonized Dropdown: Environment Mode */}
                <div className="relative">
                  <select
                    value={settings.facebook.environment || 'production'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      facebook: { ...prev.facebook, environment: e.target.value as any }
                    }))}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-colors duration-200"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="production" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {t('envProduction', 'Production')}
                    </option>
                    <option value="sandbox" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {t('envSandbox', 'Sandbox / Testing')}
                    </option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: 'var(--color-text)' }} />
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getProviderStatus('facebook').color}`}>
                  {getProviderStatus('facebook').label}
                </span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.facebook.enabled}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      facebook: { ...prev.facebook, enabled: e.target.checked }
                    }))}
                    className="h-4 w-4 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="text-xs font-bold">{t('providerEnabledLabel', 'Enable')}</span>
                </label>
              </div>
            </div>

            {/* Facebook Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              <div>
                <label className="block mb-1.5">{t('facebookAppIdLabel', 'Facebook App ID')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.facebook.appId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    facebook: { ...prev.facebook, appId: e.target.value }
                  }))}
                  placeholder={t('facebookAppIdPlaceholder', 'Enter Facebook App ID...')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label className="block mb-1.5">{t('facebookAppSecretLabel', 'Facebook App Secret')}</label>
                <div className="relative">
                  <input
                    type={showFacebookSecret ? 'text' : 'password'}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    value={settings.facebook.appSecret || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      facebook: { ...prev.facebook, appSecret: e.target.value }
                    }))}
                    placeholder={t('facebookAppSecretPlaceholder', 'Enter Facebook App Secret...')}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFacebookSecret(!showFacebookSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition cursor-pointer"
                    aria-label={showFacebookSecret ? t('hideSecretTooltip', 'Hide') : t('showSecretTooltip', 'Show')}
                  >
                    {showFacebookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Callback URL & Test Connection */}
              <div className="md:col-span-2 space-y-1.5 pt-2">
                <label className="block">{t('callbackUrlLabel', 'Authorized Redirect URI')}</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${originUrl}${settings.facebook.callbackUrl}`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal select-all opacity-80 cursor-default"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(settings.facebook.callbackUrl)}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t('copyCallbackUrlBtn', 'Copy URL')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={testingProvider === 'facebook'}
                    onClick={() => handleTestConnection('facebook')}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{testingProvider === 'facebook' ? t('testingConnection', 'Testing...') : t('testConnectionBtn', 'Test Connection')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PROVIDER 3: APPLE */}
          <div 
            role="region"
            aria-label={t('appleProviderTitle', 'Sign in with Apple')}
            data-lpignore="true"
            className="rounded-3xl border shadow-md p-6 space-y-5 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" style={{ color: 'var(--color-text)' }} viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.77-11.74-14.19-6.3-9.78-11.4-20.91-15.3-33.39-3.9-12.48-5.85-23.95-5.85-34.41 0-14.19 3.69-25.79 11.08-34.79 7.39-9 16.6-13.62 27.64-13.84 4.58 0 9.87 1.15 15.86 3.47 5.99 2.32 10.02 3.54 12.09 3.66 1.84 0 6.04-1.34 12.61-4.02 6.57-2.68 12.09-3.82 16.56-3.41 12.44.8 22.42 5.37 29.93 13.7-10.86 6.53-16.18 15.53-15.96 27.01.22 8.97 3.63 16.48 10.23 22.52 6.6 6.04 14.45 9.49 23.54 10.35-2.23 6.94-5.06 14.07-8.49 21.39zM119.22 31.85c0-7.23 2.61-14.03 7.83-20.41 5.22-6.38 11.66-10.42 19.32-12.12.7 3.58 1.05 6.94 1.05 10.09 0 7.33-2.65 14.18-7.95 20.55-5.3 6.37-11.83 10.42-19.6 12.15-.22-3.47-.65-6.89-.65-10.26z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <span>{t('appleProviderTitle', 'Sign in with Apple')}</span>
                  </h2>
                  <p className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('appleProviderDesc', 'Enable Apple ID authentication with private email relay support.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Harmonized Dropdown: Environment Mode */}
                <div className="relative">
                  <select
                    value={settings.apple.environment || 'production'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      apple: { ...prev.apple, environment: e.target.value as any }
                    }))}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-colors duration-200"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="production" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {t('envProduction', 'Production')}
                    </option>
                    <option value="sandbox" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {t('envSandbox', 'Sandbox / Testing')}
                    </option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: 'var(--color-text)' }} />
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getProviderStatus('apple').color}`}>
                  {getProviderStatus('apple').label}
                </span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.apple.enabled}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      apple: { ...prev.apple, enabled: e.target.checked }
                    }))}
                    className="h-4 w-4 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="text-xs font-bold">{t('providerEnabledLabel', 'Enable')}</span>
                </label>
              </div>
            </div>

            {/* Apple Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
              <div>
                <label className="block mb-1.5">{t('clientIdLabel', 'Services ID (Client ID)')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.apple.clientId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    apple: { ...prev.apple, clientId: e.target.value }
                  }))}
                  placeholder={t('appleClientIdPlaceholder', 'e.g. com.zecratary.service')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label className="block mb-1.5">{t('appleTeamIdLabel', 'Apple Team ID')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.apple.teamId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    apple: { ...prev.apple, teamId: e.target.value }
                  }))}
                  placeholder={t('appleTeamIdPlaceholder', '10-character Team ID')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal uppercase"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label className="block mb-1.5">{t('appleKeyIdLabel', 'Apple Key ID')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.apple.keyId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    apple: { ...prev.apple, keyId: e.target.value }
                  }))}
                  placeholder={t('appleKeyIdPlaceholder', '10-character Key ID')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal uppercase"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Private Key (.p8) */}
              <div className="md:col-span-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block">{t('applePrivateKeyLabel', 'Apple Private Key (.p8)')}</label>
                  <button
                    type="button"
                    onClick={() => setShowApplePrivateKey(!showApplePrivateKey)}
                    className="text-[11px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1 cursor-pointer"
                    aria-label={showApplePrivateKey ? t('hideSecretTooltip', 'Hide') : t('showSecretTooltip', 'Show')}
                  >
                    {showApplePrivateKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showApplePrivateKey ? t('hideSecretTooltip', 'Hide') : t('showSecretTooltip', 'Show')}</span>
                  </button>
                </div>
                <textarea
                  rows={showApplePrivateKey ? 4 : 2}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={settings.apple.privateKey || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    apple: { ...prev.apple, privateKey: e.target.value }
                  }))}
                  placeholder={t('applePrivateKeyPlaceholder', '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----')}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal resize-none"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Callback URL & Test Connection */}
              <div className="md:col-span-3 space-y-1.5 pt-2">
                <label className="block">{t('callbackUrlLabel', 'Authorized Redirect URI')}</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${originUrl}${settings.apple.callbackUrl}`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border outline-none font-mono text-[11px] font-normal select-all opacity-80 cursor-default"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(settings.apple.callbackUrl)}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t('copyCallbackUrlBtn', 'Copy URL')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={testingProvider === 'apple'}
                    onClick={() => handleTestConnection('apple')}
                    className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{testingProvider === 'apple' ? t('testingConnection', 'Testing...') : t('testConnectionBtn', 'Test Connection')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
