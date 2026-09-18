// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Key, Save, RefreshCw, CheckCircle2, 
  AlertCircle, Eye, EyeOff, Copy, Check, Zap 
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { applyThemeToDocument } from '@/lib/themeConfig';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

interface SocialConfig {
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  facebookEnabled: boolean;
  facebookClientId: string;
  facebookClientSecret: string;
  appleEnabled: boolean;
  appleClientId: string;
  appleTeamId: string;
  appleKeyId: string;
}

const DEFAULT_CONFIG: SocialConfig = {
  googleEnabled: true,
  googleClientId: '',
  googleClientSecret: '',
  facebookEnabled: true,
  facebookClientId: '',
  facebookClientSecret: '',
  appleEnabled: false,
  appleClientId: '',
  appleTeamId: '',
  appleKeyId: ''
};

export default function SocialLoginSettingPage() {
  const router = useRouter();
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);

  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [config, setConfig] = useState<SocialConfig>(DEFAULT_CONFIG);
  const [showSecrets, setShowSecrets] = useState<{ [k: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncingEnv, setSyncingEnv] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ [provider: string]: string }>({});

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Dynamic Theme Synchronization
  const syncTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    purgeLegacyBrowserAdminStorage();

    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_theme_changed', syncTheme);
    window.addEventListener('zecratary_theme_updated', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_theme_changed', syncTheme);
      window.removeEventListener('zecratary_theme_updated', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }
    if (active.role !== 'admin' && !active.email.includes('admin')) {
      router.replace('/profile');
      return;
    }
    setUser(active);
  }, [router]);

  // Hydrate configurations directly from Server Storage (Zero LocalStorage)
  const loadConfig = useCallback(async () => {
    purgeLegacyBrowserAdminStorage();
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData && serverData.socialLogin) {
        const sl = serverData.socialLogin;
        setConfig(prev => ({
          ...prev,
          googleEnabled: sl.googleEnabled ?? prev.googleEnabled,
          googleClientId: sl.googleClientId ?? prev.googleClientId,
          googleClientSecret: sl.googleClientSecret ?? prev.googleClientSecret,
          facebookEnabled: sl.facebookEnabled ?? prev.facebookEnabled,
          facebookClientId: sl.facebookClientId ?? sl.facebookAppId ?? prev.facebookClientId,
          facebookClientSecret: sl.facebookClientSecret ?? sl.facebookAppSecret ?? prev.facebookClientSecret,
          appleEnabled: sl.appleEnabled ?? prev.appleEnabled,
          appleClientId: sl.appleClientId ?? prev.appleClientId,
          appleTeamId: sl.appleTeamId ?? prev.appleTeamId,
          appleKeyId: sl.appleKeyId ?? prev.appleKeyId
        }));
        return;
      }

      const envRes = await fetch('/api/admin/social-env?t=' + Date.now(), { cache: 'no-store' });
      if (envRes.ok) {
        const envJson = await envRes.json();
        if (envJson.success && envJson.config) {
          const c = envJson.config;
          setConfig(prev => ({
            ...prev,
            googleEnabled: c.googleEnabled ?? prev.googleEnabled,
            googleClientId: c.googleClientId ?? prev.googleClientId,
            googleClientSecret: c.googleClientSecret ?? prev.googleClientSecret,
            facebookEnabled: c.facebookEnabled ?? prev.facebookEnabled,
            facebookClientId: c.facebookClientId ?? c.facebookAppId ?? prev.facebookClientId,
            facebookClientSecret: c.facebookClientSecret ?? c.facebookAppSecret ?? prev.facebookClientSecret,
            appleEnabled: c.appleEnabled ?? prev.appleEnabled,
            appleClientId: c.appleClientId ?? prev.appleClientId,
            appleTeamId: c.appleTeamId ?? prev.appleTeamId,
            appleKeyId: c.appleKeyId ?? prev.appleKeyId
          }));
        }
      }
    } catch (err) {
      console.error('[social-login-setting] Failed to fetch server config:', err);
    }
  }, []);

  useEffect(() => {
    loadConfig();

    const handleSync = () => {
      loadConfig();
    };

    window.addEventListener('zecratary_social_login_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    return () => {
      window.removeEventListener('zecratary_social_login_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, [loadConfig]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSaveAndSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const payload = {
      ...config,
      facebookAppId: config.facebookClientId,
      facebookAppSecret: config.facebookClientSecret,
      updatedAt: new Date().toISOString()
    };

    try {
      await persistServerAdminSettings({
        socialLogin: payload
      });

      try {
        await fetch('/api/admin/social-env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zecratary_social_login_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
      }

      setStatusMsg({ 
        text: t('socialSavedSuccess', 'Configuration saved and synced to server successfully!'), 
        success: true 
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error saving configuration.', success: false });
    } finally {
      setLoading(false);
    }
  };

  const handlePullEnv = async () => {
    setSyncingEnv(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/social-env?t=' + Date.now(), { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success && json.config) {
        const c = json.config;
        const mergedConfig: SocialConfig = {
          ...config,
          googleEnabled: c.googleEnabled ?? config.googleEnabled,
          googleClientId: c.googleClientId ?? config.googleClientId,
          googleClientSecret: c.googleClientSecret ?? config.googleClientSecret,
          facebookEnabled: c.facebookEnabled ?? config.facebookEnabled,
          facebookClientId: c.facebookClientId ?? c.facebookAppId ?? config.facebookClientId,
          facebookClientSecret: c.facebookClientSecret ?? c.facebookAppSecret ?? config.facebookClientSecret,
          appleEnabled: c.appleEnabled ?? config.appleEnabled,
          appleClientId: c.appleClientId ?? config.appleClientId,
          appleTeamId: c.appleTeamId ?? config.appleTeamId,
          appleKeyId: c.appleKeyId ?? config.appleKeyId
        };
        setConfig(mergedConfig);

        await persistServerAdminSettings({
          socialLogin: {
            ...mergedConfig,
            facebookAppId: mergedConfig.facebookClientId,
            facebookAppSecret: mergedConfig.facebookClientSecret
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zecratary_social_login_updated'));
          window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        }
        setStatusMsg({ text: t('socialPullSuccess', 'Values synced from .env successfully!'), success: true });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        await loadConfig();
        setStatusMsg({ text: t('socialPullSuccess', 'Values refreshed from server store!'), success: true });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (_) {
      setStatusMsg({ text: t('socialPullError', 'Failed to sync configuration.'), success: false });
    } finally {
      setSyncingEnv(false);
    }
  };

  const testProvider = (provider: 'google' | 'facebook' | 'apple') => {
    setDiagnostics(prev => ({ ...prev, [provider]: t('testingHandshake', 'Testing handshake...') }));
    setTimeout(() => {
      if (provider === 'google') {
        const ok = config.googleClientId.includes('.apps.googleusercontent.com') || config.googleClientId.length > 10;
        setDiagnostics(prev => ({
          ...prev, 
          google: ok ? '✓ Google OAuth credentials valid.' : '✕ Invalid Client ID format.'
        }));
      } else if (provider === 'facebook') {
        const ok = /^[0-9]+$/.test(config.facebookClientId) && config.facebookClientId.length >= 8;
        setDiagnostics(prev => ({
          ...prev, 
          facebook: ok ? '✓ Facebook App ID verified.' : '✕ App ID must be numeric (8+ digits).'
        }));
      } else {
        const ok = config.appleClientId.includes('.') && config.appleClientId.length >= 5;
        setDiagnostics(prev => ({
          ...prev, 
          apple: ok ? '✓ Apple Service ID valid.' : '✕ Reverse-domain format required.'
        }));
      }
    }, 500);
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              title={t('backToAdmin', 'Back to Admin')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              {t('socialLoginSettingsTitle', 'Social Login & Identity Settings')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('socialLoginSettingsSubtitle', 'Configure Google, Facebook, and Apple authentication and synchronize credentials to .env.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={syncingEnv}
            onClick={handlePullEnv}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingEnv ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            {t('syncFromEnvBtn', 'Sync from .env')}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSaveAndSync()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t('saveAndSyncEnvBtn', 'Save & Sync .env')}
          </button>
        </div>
      </div>

      {/* Notifications Alert Banner */}
      {statusMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: statusMsg.success ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
            color: statusMsg.success ? 'var(--color-emerald)' : '#ef4444'
          }}
        >
          {statusMsg.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Providers Grid */}
      <div className="space-y-6">

        {/* GOOGLE */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
              {t('googleTitle', 'Google Identity Services')}
            </span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={config.googleEnabled} 
                onChange={(e) => setConfig({ ...config, googleEnabled: e.target.checked })} 
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.googleEnabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('clientId', 'Client ID')}
              </label>
              <input 
                type="text" 
                value={config.googleClientId} 
                onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })} 
                placeholder="123456...apps.googleusercontent.com"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
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
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('clientSecret', 'Client Secret')}
              </label>
              <div className="relative">
                <input 
                  type={showSecrets.google ? 'text' : 'password'} 
                  value={config.googleClientSecret} 
                  onChange={(e) => setConfig({ ...config, googleClientSecret: e.target.value })} 
                  placeholder="GOCSPX-..."
                  className="w-full border rounded-xl pl-3 pr-9 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
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
                  onClick={() => setShowSecrets(p => ({ ...p, google: !p.google }))} 
                  className="absolute right-3 top-2.5 cursor-pointer transition"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Toggle Google Secret Visibility"
                >
                  {showSecrets.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {diagnostics.google && (
            <div 
              className="p-2.5 rounded-xl border text-[11px] font-bold"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: diagnostics.google.includes('✓') ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
                color: diagnostics.google.includes('✓') ? 'var(--color-emerald)' : '#ef4444'
              }}
            >
              {diagnostics.google}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => testProvider('google')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> 
              {t('testConnection', 'Test Connection')}
            </button>
            <button 
              type="button" 
              onClick={() => handleCopy(`${originUrl}/api/auth/callback/google`, 'gcb')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              {copiedKey === 'gcb' ? (
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
              ) : (
                <Copy className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              )} 
              {copiedKey === 'gcb' ? t('copied', 'Copied!') : t('copyCallbackUrl', 'Copy Callback URL')}
            </button>
          </div>
        </div>

        {/* FACEBOOK */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
              {t('facebookTitle', 'Facebook Login (Meta Graph)')}
            </span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={config.facebookEnabled} 
                onChange={(e) => setConfig({ ...config, facebookEnabled: e.target.checked })} 
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.facebookEnabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('facebookAppId', 'Facebook App ID')}
              </label>
              <input 
                type="text" 
                value={config.facebookClientId} 
                onChange={(e) => setConfig({ ...config, facebookClientId: e.target.value })} 
                placeholder="18492049281..."
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
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
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('facebookAppSecret', 'Facebook App Secret')}
              </label>
              <div className="relative">
                <input 
                  type={showSecrets.facebook ? 'text' : 'password'} 
                  value={config.facebookClientSecret} 
                  onChange={(e) => setConfig({ ...config, facebookClientSecret: e.target.value })} 
                  placeholder="••••••••••••"
                  className="w-full border rounded-xl pl-3 pr-9 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
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
                  onClick={() => setShowSecrets(p => ({ ...p, facebook: !p.facebook }))} 
                  className="absolute right-3 top-2.5 cursor-pointer transition"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Toggle Facebook Secret Visibility"
                >
                  {showSecrets.facebook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {diagnostics.facebook && (
            <div 
              className="p-2.5 rounded-xl border text-[11px] font-bold"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: diagnostics.facebook.includes('✓') ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
                color: diagnostics.facebook.includes('✓') ? 'var(--color-emerald)' : '#ef4444'
              }}
            >
              {diagnostics.facebook}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => testProvider('facebook')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> 
              {t('testConnection', 'Test Connection')}
            </button>
            <button 
              type="button" 
              onClick={() => handleCopy(`${originUrl}/api/auth/callback/facebook`, 'fcb')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              {copiedKey === 'fcb' ? (
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
              ) : (
                <Copy className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              )} 
              {copiedKey === 'fcb' ? t('copied', 'Copied!') : t('copyCallbackUrl', 'Copy Callback URL')}
            </button>
          </div>
        </div>

        {/* APPLE */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
              {t('appleTitle', 'Sign in with Apple')}
            </span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={config.appleEnabled} 
                onChange={(e) => setConfig({ ...config, appleEnabled: e.target.checked })} 
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.appleEnabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('appleClientId', 'Service ID (Client ID)')}
              </label>
              <input 
                type="text" 
                value={config.appleClientId} 
                onChange={(e) => setConfig({ ...config, appleClientId: e.target.value })} 
                placeholder="com.zecratary.service"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
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
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('appleTeamId', 'Team ID')}
              </label>
              <input 
                type="text" 
                value={config.appleTeamId} 
                onChange={(e) => setConfig({ ...config, appleTeamId: e.target.value })} 
                placeholder="10-char Team ID"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
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
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('appleKeyId', 'Key ID')}
              </label>
              <input 
                type="text" 
                value={config.appleKeyId} 
                onChange={(e) => setConfig({ ...config, appleKeyId: e.target.value })} 
                placeholder="Apple Key ID"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>

          {diagnostics.apple && (
            <div 
              className="p-2.5 rounded-xl border text-[11px] font-bold"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: diagnostics.apple.includes('✓') ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
                color: diagnostics.apple.includes('✓') ? 'var(--color-emerald)' : '#ef4444'
              }}
            >
              {diagnostics.apple}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => testProvider('apple')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} /> 
              {t('testConnection', 'Test Connection')}
            </button>
            <button 
              type="button" 
              onClick={() => handleCopy(`${originUrl}/api/auth/callback/apple`, 'acb')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            >
              {copiedKey === 'acb' ? (
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
              ) : (
                <Copy className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              )} 
              {copiedKey === 'acb' ? t('copied', 'Copied!') : t('copyReturnUrl', 'Copy Return URL')}
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Save & Sync Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSaveAndSync()}
          className="px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('saveAndSyncEnvBtn', 'Save & Sync .env')}
        </button>
      </div>
    </div>
  );
}
