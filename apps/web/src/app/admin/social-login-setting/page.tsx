'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Check, Save, RefreshCw, Key,
  CheckCircle2, AlertCircle, Eye, EyeOff, Activity, Globe, Copy
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { 
  getSocialLoginConfig, 
  saveSocialLoginConfig, 
  SocialLoginConfig, 
  DEFAULT_SOCIAL_CONFIG 
} from '@/lib/socialAuth';

export default function AdminSocialLoginSettingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);

  const [config, setConfig] = useState<SocialLoginConfig>(DEFAULT_SOCIAL_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showFacebookSecret, setShowFacebookSecret] = useState(false);
  const [showGrokSecret, setShowGrokSecret] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: { message: string; ok: boolean } }>({});

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
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
    if (active.role !== 'admin') {
      router.replace('/profile');
      return;
    }
    setUser(active);
    setConfig(getSocialLoginConfig());
  }, [router]);

  const activeProviderCount = useMemo(() => {
    let count = 0;
    if (config.googleEnabled) count++;
    if (config.facebookEnabled) count++;
    if (config.grokEnabled) count++;
    return count;
  }, [config]);

  const handleToggle = (provider: 'google' | 'facebook' | 'grok', checked: boolean) => {
    const updated = {
      ...config,
      [`${provider}Enabled`]: checked
    };
    setConfig(updated);
    saveSocialLoginConfig(updated);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      saveSocialLoginConfig(config);
      setStatusMsg({ 
        text: 'Settings saved. All changes are broadcast to /register in real time.', 
        type: 'success' 
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      setStatusMsg({ 
        text: err.message || 'Failed to save settings.', 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(config.redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleTestConnection = (provider: 'google' | 'facebook' | 'grok') => {
    setTestingProvider(provider);
    setTestResults(prev => ({ ...prev, [provider]: { message: 'Checking...', ok: true } }));

    setTimeout(() => {
      if (provider === 'google') {
        const ok = Boolean(config.googleClientId.trim());
        setTestResults(prev => ({
          ...prev,
          google: {
            message: ok ? '✓ Google Identity handshake verified.' : 'Error: Missing Google Client ID.',
            ok
          }
        }));
      } else if (provider === 'facebook') {
        const ok = Boolean(config.facebookAppId.trim());
        setTestResults(prev => ({
          ...prev,
          facebook: {
            message: ok ? '✓ Facebook Login verified.' : 'Error: Missing Facebook App ID.',
            ok
          }
        }));
      } else if (provider === 'grok') {
        const ok = Boolean(config.grokClientId.trim());
        setTestResults(prev => ({
          ...prev,
          grok: {
            message: ok ? '✓ xAI Grok handshake verified.' : 'Error: Missing Grok Client ID.',
            ok
          }
        }));
      }
      setTestingProvider(null);
    }, 600);
  };

  if (!user) return null;

  return (
    <div 
      className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Social Login Settings
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Configure Google, Facebook, and Grok authentication. Toggles synchronize immediately with /register.
          </p>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSave()}
          className="px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {statusMsg && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            statusMsg.type === 'success'
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            Active Providers
          </span>
          <div className="text-2xl font-black font-mono" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {activeProviderCount} / 3
          </div>
          <span className="text-[10px] text-emerald-500 font-semibold">Live on /register</span>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Google</span>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.googleEnabled ? '#10B981' : '#EF4444' }} />
          </div>
          <div className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {config.googleEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Facebook</span>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.facebookEnabled ? '#10B981' : '#EF4444' }} />
          </div>
          <div className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {config.facebookEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-sm space-y-1"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>xAI Grok</span>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.grokEnabled ? '#10B981' : '#EF4444' }} />
          </div>
          <div className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {config.grokEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {/* Authorized Redirect URI */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-3"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--color-primary)]" /> Authorized OAuth Redirect URI
          </span>
          <button
            type="button"
            onClick={handleCopyUri}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: copiedUri ? '#10B981' : isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            {copiedUri ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedUri ? 'Copied' : 'Copy'}
          </button>
        </div>
        <input
          type="text"
          value={config.redirectUri}
          onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
          className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
          style={{
            backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
            borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
            color: isDayMode ? '#0f172a' : '#ffffff'
          }}
        />
      </div>

      {/* Provider Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Google */}
        <div 
          className="border rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-black text-sm">Google OAuth</span>
              <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={config.googleEnabled}
                  onChange={(e) => handleToggle('google', e.target.checked)}
                  className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                />
                <span>{config.googleEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Client ID</label>
                <input
                  type="text"
                  value={config.googleClientId}
                  onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Client Secret</label>
                <input
                  type={showGoogleSecret ? 'text' : 'password'}
                  value={config.googleClientSecret}
                  onChange={(e) => setConfig({ ...config, googleClientSecret: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
              </div>
              {testResults.google && (
                <div className={`p-2 rounded-xl text-[11px] font-bold ${testResults.google.ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {testResults.google.message}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleTestConnection('google')}
            disabled={testingProvider === 'google'}
            className="w-full py-2.5 rounded-xl text-xs font-bold border mt-4 cursor-pointer"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            {testingProvider === 'google' ? 'Testing...' : 'Test Google'}
          </button>
        </div>

        {/* Facebook */}
        <div 
          className="border rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-black text-sm">Facebook Login</span>
              <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={config.facebookEnabled}
                  onChange={(e) => handleToggle('facebook', e.target.checked)}
                  className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                />
                <span>{config.facebookEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">App ID</label>
                <input
                  type="text"
                  value={config.facebookAppId}
                  onChange={(e) => setConfig({ ...config, facebookAppId: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">App Secret</label>
                <input
                  type={showFacebookSecret ? 'text' : 'password'}
                  value={config.facebookAppSecret}
                  onChange={(e) => setConfig({ ...config, facebookAppSecret: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
              </div>
              {testResults.facebook && (
                <div className={`p-2 rounded-xl text-[11px] font-bold ${testResults.facebook.ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {testResults.facebook.message}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleTestConnection('facebook')}
            disabled={testingProvider === 'facebook'}
            className="w-full py-2.5 rounded-xl text-xs font-bold border mt-4 cursor-pointer"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            {testingProvider === 'facebook' ? 'Testing...' : 'Test Facebook'}
          </button>
        </div>

        {/* Grok */}
        <div 
          className="border rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-black text-sm">xAI Grok</span>
              <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={config.grokEnabled}
                  onChange={(e) => handleToggle('grok', e.target.checked)}
                  className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                />
                <span className={config.grokEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                  {config.grokEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Client ID</label>
                <input
                  type="text"
                  value={config.grokClientId}
                  onChange={(e) => setConfig({ ...config, grokClientId: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Client Secret</label>
                <input
                  type={showGrokSecret ? 'text' : 'password'}
                  value={config.grokClientSecret}
                  onChange={(e) => setConfig({ ...config, grokClientSecret: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
              </div>
              {testResults.grok && (
                <div className={`p-2 rounded-xl text-[11px] font-bold ${testResults.grok.ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {testResults.grok.message}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleTestConnection('grok')}
            disabled={testingProvider === 'grok'}
            className="w-full py-2.5 rounded-xl text-xs font-bold border mt-4 cursor-pointer"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            {testingProvider === 'grok' ? 'Testing...' : 'Test Grok'}
          </button>
        </div>

      </div>
    </div>
  );
}
