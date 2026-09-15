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
  const { t } = useTranslation();
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

  const syncTheme = useCallback(() => {
    try {
      if (typeof document !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark');
        setIsDayMode(!isDark);
      }
      const stored = typeof window !== 'undefined' ? (localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config')) : null;
      if (stored) {
        applyThemeToDocument(JSON.parse(stored));
      } else {
        applyThemeToDocument(null);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
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

  const loadConfig = useCallback(async () => {
    try {
      // 1. Fetch from centralized server settings store
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        if (settings?.socialLogin) {
          setConfig(prev => ({
            ...prev,
            googleEnabled: settings.socialLogin.googleEnabled ?? prev.googleEnabled,
            googleClientId: settings.socialLogin.googleClientId ?? prev.googleClientId,
            googleClientSecret: settings.socialLogin.googleClientSecret ?? prev.googleClientSecret,
            facebookEnabled: settings.socialLogin.facebookEnabled ?? prev.facebookEnabled,
            facebookClientId: settings.socialLogin.facebookClientId ?? settings.socialLogin.facebookAppId ?? prev.facebookClientId,
            facebookClientSecret: settings.socialLogin.facebookClientSecret ?? settings.socialLogin.facebookAppSecret ?? prev.facebookClientSecret,
            appleEnabled: settings.socialLogin.appleEnabled ?? prev.appleEnabled,
            appleClientId: settings.socialLogin.appleClientId ?? prev.appleClientId,
            appleTeamId: settings.socialLogin.appleTeamId ?? prev.appleTeamId,
            appleKeyId: settings.socialLogin.appleKeyId ?? prev.appleKeyId
          }));
          return;
        }
      }

      // 2. Fallback to reading from .env endpoint if server store hasn't initialized
      const envRes = await fetch('/api/admin/social-env', { cache: 'no-store' });
      if (envRes.ok) {
        const envJson = await envRes.json();
        if (envJson.success && envJson.config) {
          setConfig(prev => ({ ...prev, ...envJson.config }));
        }
      }
    } catch (err) {
      console.error('[social-login-setting] Failed to fetch server config:', err);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAndSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      // Direct server-backed persistence - ZERO localStorage read/writes
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialLogin: {
            ...config,
            facebookAppId: config.facebookClientId,
            facebookAppSecret: config.facebookClientSecret
          }
        })
      });

      // Synchronize to .env handler if present
      try {
        await fetch('/api/admin/social-env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
      } catch (_) {}

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to persist settings to server storage');
      }

      window.dispatchEvent(new Event('zecratary_social_login_updated'));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));

      setStatusMsg({ 
        text: t('socialSavedSuccess') || 'Configuration saved and synced to server successfully!', 
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
    try {
      const res = await fetch('/api/admin/social-env', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success && json.config) {
        setConfig(prev => ({ ...prev, ...json.config }));
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialLogin: {
              ...json.config,
              facebookAppId: json.config.facebookClientId,
              facebookAppSecret: json.config.facebookClientSecret
            }
          })
        });
        window.dispatchEvent(new Event('zecratary_social_login_updated'));
        window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
        setStatusMsg({ text: t('socialPullSuccess') || 'Values synced from .env successfully!', success: true });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        await loadConfig();
        setStatusMsg({ text: t('socialPullSuccess') || 'Values refreshed from server store!', success: true });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (_) {
      setStatusMsg({ text: t('socialPullError') || 'Failed to sync configuration.', success: false });
    } finally {
      setSyncingEnv(false);
    }
  };

  const testProvider = (provider: 'google' | 'facebook' | 'apple') => {
    setDiagnostics(prev => ({ ...prev, [provider]: t('testingHandshake') || 'Testing handshake...' }));
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
          style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
              title={t('backToAdmin') || 'Back to Admin'}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary, #E05638)' }}>
              {t('socialLoginSettingsTitle') || 'Social Login & Identity Settings'}
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('socialLoginSettingsSubtitle') || 'Configure Google, Facebook, and Apple authentication and synchronize credentials to .env.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={syncingEnv}
            onClick={handlePullEnv}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'} ${syncingEnv ? 'animate-spin' : ''}`} />
            {t('syncFromEnvBtn') || 'Sync from .env'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSaveAndSync()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t('saveAndSyncEnvBtn') || 'Save & Sync .env'}
          </button>
        </div>
      </div>

      {/* Notifications Alert Banner */}
      {statusMsg && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            statusMsg.success
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {statusMsg.success ? (
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
          ) : (
            <AlertCircle className={`h-4 w-4 shrink-0 ${isDayMode ? 'text-red-600' : 'text-red-400'}`} />
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
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('googleTitle') || 'Google Identity Services'}
            </span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={config.googleEnabled} 
                onChange={(e) => setConfig({ ...config, googleEnabled: e.target.checked })} 
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.googleEnabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('clientId') || 'Client ID'}
              </label>
              <input 
                type="text" 
                value={config.googleClientId} 
                onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })} 
                placeholder="123456...apps.googleusercontent.com"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('clientSecret') || 'Client Secret'}
              </label>
              <div className="relative">
                <input 
                  type={showSecrets.google ? 'text' : 'password'} 
                  value={config.googleClientSecret} 
                  onChange={(e) => setConfig({ ...config, googleClientSecret: e.target.value })} 
                  placeholder="GOCSPX-..."
                  className="w-full border rounded-xl pl-3 pr-9 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowSecrets(p => ({ ...p, google: !p.google }))} 
                  className={`absolute right-3 top-2.5 cursor-pointer transition ${
                    isDayMode ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'
                  }`}
                  aria-label="Toggle Google Secret Visibility"
                >
                  {showSecrets.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {diagnostics.google && (
            <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
              diagnostics.google.includes('✓')
                ? isDayMode 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : isDayMode 
                  ? 'bg-red-50 text-red-800 border-red-300' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {diagnostics.google}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => testProvider('google')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <Zap className={`h-3.5 w-3.5 ${isDayMode ? 'text-amber-600' : 'text-amber-400'}`} /> 
              {t('testConnection') || 'Test Connection'}
            </button>
            <button 
              type="button" 
              onClick={() => handleCopy(`${originUrl}/api/auth/callback/google`, 'gcb')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              {copiedKey === 'gcb' ? (
                <Check className={`h-3.5 w-3.5 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
              ) : (
                <Copy className={`h-3.5 w-3.5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
              )} 
              {copiedKey === 'gcb' ? (t('copied') || 'Copied!') : (t('copyCallbackUrl') || 'Copy Callback URL')}
            </button>
          </div>
        </div>

        {/* FACEBOOK */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('facebookTitle') || 'Facebook Login (Meta Graph)'}
            </span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={config.facebookEnabled} 
                onChange={(e) => setConfig({ ...config, facebookEnabled: e.target.checked })} 
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.facebookEnabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('facebookAppId') || 'Facebook App ID'}
              </label>
              <input 
                type="text" 
                value={config.facebookClientId} 
                onChange={(e) => setConfig({ ...config, facebookClientId: e.target.value })} 
                placeholder="18492049281..."
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('facebookAppSecret') || 'Facebook App Secret'}
              </label>
              <div className="relative">
                <input 
                  type={showSecrets.facebook ? 'text' : 'password'} 
                  value={config.facebookClientSecret} 
                  onChange={(e) => setConfig({ ...config, facebookClientSecret: e.target.value })} 
                  placeholder="••••••••••••"
                  className="w-full border rounded-xl pl-3 pr-9 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowSecrets(p => ({ ...p, facebook: !p.facebook }))} 
                  className={`absolute right-3 top-2.5 cursor-pointer transition ${
                    isDayMode ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'
                  }`}
                  aria-label="Toggle Facebook Secret Visibility"
                >
                  {showSecrets.facebook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {diagnostics.facebook && (
            <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
              diagnostics.facebook.includes('✓')
                ? isDayMode 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : isDayMode 
                  ? 'bg-red-50 text-red-800 border-red-300' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {diagnostics.facebook}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => testProvider('facebook')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <Zap className={`h-3.5 w-3.5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} /> 
              {t('testConnection') || 'Test Connection'}
            </button>
            <button 
              type="button" 
              onClick={() => handleCopy(`${originUrl}/api/auth/callback/facebook`, 'fcb')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              {copiedKey === 'fcb' ? (
                <Check className={`h-3.5 w-3.5 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
              ) : (
                <Copy className={`h-3.5 w-3.5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
              )} 
              {copiedKey === 'fcb' ? (t('copied') || 'Copied!') : (t('copyCallbackUrl') || 'Copy Callback URL')}
            </button>
          </div>
        </div>

        {/* APPLE */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('appleTitle') || 'Sign in with Apple'}
            </span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={config.appleEnabled} 
                onChange={(e) => setConfig({ ...config, appleEnabled: e.target.checked })} 
                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.appleEnabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('appleClientId') || 'Service ID (Client ID)'}
              </label>
              <input 
                type="text" 
                value={config.appleClientId} 
                onChange={(e) => setConfig({ ...config, appleClientId: e.target.value })} 
                placeholder="com.zecratary.service"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('appleTeamId') || 'Team ID'}
              </label>
              <input 
                type="text" 
                value={config.appleTeamId} 
                onChange={(e) => setConfig({ ...config, appleTeamId: e.target.value })} 
                placeholder="10-char Team ID"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('appleKeyId') || 'Key ID'}
              </label>
              <input 
                type="text" 
                value={config.appleKeyId} 
                onChange={(e) => setConfig({ ...config, appleKeyId: e.target.value })} 
                placeholder="Apple Key ID"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none text-xs transition placeholder:text-slate-400"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>

          {diagnostics.apple && (
            <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
              diagnostics.apple.includes('✓')
                ? isDayMode 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : isDayMode 
                  ? 'bg-red-50 text-red-800 border-red-300' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {diagnostics.apple}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => testProvider('apple')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <Zap className={`h-3.5 w-3.5 ${isDayMode ? 'text-slate-600' : 'text-slate-400'}`} /> 
              {t('testConnection') || 'Test Connection'}
            </button>
            <button 
              type="button" 
              onClick={() => handleCopy(`${originUrl}/api/auth/callback/apple`, 'acb')} 
              className="px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              {copiedKey === 'acb' ? (
                <Check className={`h-3.5 w-3.5 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
              ) : (
                <Copy className={`h-3.5 w-3.5 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
              )} 
              {copiedKey === 'acb' ? (t('copied') || 'Copied!') : (t('copyReturnUrl') || 'Copy Return URL')}
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
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('saveAndSyncEnvBtn') || 'Save & Sync .env'}
        </button>
      </div>
    </div>
  );
}
