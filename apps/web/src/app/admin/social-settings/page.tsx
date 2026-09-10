'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, RefreshCw, Activity, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { getSocialLoginConfig, saveSocialLoginConfig, SocialLoginConfig, DEFAULT_SOCIAL_CONFIG } from '@/lib/socialAuth';

export default function SocialSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<SocialLoginConfig>(DEFAULT_SOCIAL_CONFIG);
  const [isDayMode, setIsDayMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showFacebookSecret, setShowFacebookSecret] = useState(false);
  
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({});

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
    if (!active || active.role !== 'admin') {
      router.replace(active ? '/profile' : '/login');
      return;
    }
    setUser(active);
    fetch('/api/social-config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(() => setConfig(getSocialLoginConfig()));
  }, [router]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await fetch('/api/social-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      saveSocialLoginConfig(config);
      setStatusMsg({ text: 'Social configurations successfully saved to server and synchronized!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to save configuration.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = (provider: 'google' | 'facebook' | 'apple') => {
    setTestingProvider(provider);
    setTestResults(prev => ({ ...prev, [provider]: '' }));

    setTimeout(() => {
      if (provider === 'google') {
        const isValid = config.googleClientId.includes('.apps.googleusercontent.com');
        setTestResults(prev => ({ 
          ...prev, 
          google: isValid ? '✓ Google Web Client format validated.' : '✕ Invalid format. Must end with .apps.googleusercontent.com' 
        }));
      } else if (provider === 'facebook') {
        const isValid = /^\d+$/.test(config.facebookClientId) && config.facebookClientId.length > 5;
        setTestResults(prev => ({ 
          ...prev, 
          facebook: isValid ? '✓ Facebook App ID format validated.' : '✕ App ID must be numeric.' 
        }));
      } else if (provider === 'apple') {
        const isValid = config.appleClientId.includes('.');
        setTestResults(prev => ({ 
          ...prev, 
          apple: isValid ? '✓ Apple Service ID reverse-domain format validated.' : '✕ Missing reverse-domain format (e.g., com.app.id).' 
        }));
      }
      setTestingProvider(null);
    }, 800);
  };

  if (!user) return null;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Social Login Settings
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Manage OAuth bindings for Google, Facebook, and Apple identity providers.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
          statusMsg.type === 'success' ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300') : (isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300')
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Global Setting */}
      <div 
        className="border rounded-2xl p-4 shadow-sm space-y-2 text-xs"
        style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <span className="font-bold block" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Global Callback URI</span>
        <input
          type="text"
          value={config.redirectUri}
          onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none font-bold"
          style={{ backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)', color: isDayMode ? '#0f172a' : '#ffffff' }}
        />
        <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Register this precise URI inside your Developer Consoles for all three providers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GOOGLE BLOCK */}
        <div className="border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google</h3>
              </div>
              <input type="checkbox" checked={config.googleEnabled} onChange={(e) => setConfig({ ...config, googleEnabled: e.target.checked })} className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer" />
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client ID</label>
                <input type="text" value={config.googleClientId} onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })} placeholder="...apps.googleusercontent.com" className="w-full border rounded-xl px-3 py-2 outline-none font-medium font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
              </div>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client Secret</label>
                <div className="relative">
                  <input type={showGoogleSecret ? 'text' : 'password'} value={config.googleClientSecret} onChange={(e) => setConfig({ ...config, googleClientSecret: e.target.value })} className="w-full border rounded-xl pl-3 pr-9 py-2 outline-none font-medium font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
                  <button type="button" onClick={() => setShowGoogleSecret(!showGoogleSecret)} className="absolute right-3 top-2.5 text-slate-400">
                    {showGoogleSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {testResults.google && (
                <div className={`p-2 rounded-xl border text-[11px] font-bold ${testResults.google.includes('✓') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{testResults.google}</div>
              )}
            </div>
          </div>
          <button type="button" disabled={testingProvider === 'google'} onClick={() => handleTestConnection('google')} className="w-full py-2 mt-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>
            {testingProvider === 'google' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-blue-400" />} Validate Credentials
          </button>
        </div>

        {/* FACEBOOK BLOCK */}
        <div className="border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0 fill-current text-blue-600" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
                <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Facebook</h3>
              </div>
              <input type="checkbox" checked={config.facebookEnabled} onChange={(e) => setConfig({ ...config, facebookEnabled: e.target.checked })} className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer" />
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>App ID</label>
                <input type="text" value={config.facebookClientId} onChange={(e) => setConfig({ ...config, facebookClientId: e.target.value })} placeholder="Numeric App ID" className="w-full border rounded-xl px-3 py-2 outline-none font-medium font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
              </div>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>App Secret</label>
                <div className="relative">
                  <input type={showFacebookSecret ? 'text' : 'password'} value={config.facebookClientSecret} onChange={(e) => setConfig({ ...config, facebookClientSecret: e.target.value })} className="w-full border rounded-xl pl-3 pr-9 py-2 outline-none font-medium font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
                  <button type="button" onClick={() => setShowFacebookSecret(!showFacebookSecret)} className="absolute right-3 top-2.5 text-slate-400">
                    {showFacebookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {testResults.facebook && (
                <div className={`p-2 rounded-xl border text-[11px] font-bold ${testResults.facebook.includes('✓') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{testResults.facebook}</div>
              )}
            </div>
          </div>
          <button type="button" disabled={testingProvider === 'facebook'} onClick={() => handleTestConnection('facebook')} className="w-full py-2 mt-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>
            {testingProvider === 'facebook' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-blue-400" />} Validate Credentials
          </button>
        </div>

        {/* APPLE BLOCK */}
        <div className="border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                </svg>
                <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Apple</h3>
              </div>
              <input type="checkbox" checked={config.appleEnabled} onChange={(e) => setConfig({ ...config, appleEnabled: e.target.checked })} className="rounded accent-[var(--color-primary)] w-4 h-4 cursor-pointer" />
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Service ID</label>
                <input type="text" value={config.appleClientId} onChange={(e) => setConfig({ ...config, appleClientId: e.target.value })} placeholder="com.company.app" className="w-full border rounded-xl px-3 py-2 outline-none font-medium font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
              </div>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Team ID</label>
                <input type="text" value={config.appleTeamId} onChange={(e) => setConfig({ ...config, appleTeamId: e.target.value })} className="w-full border rounded-xl px-3 py-2 outline-none font-medium font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
              </div>
              {testResults.apple && (
                <div className={`p-2 rounded-xl border text-[11px] font-bold ${testResults.apple.includes('✓') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{testResults.apple}</div>
              )}
            </div>
          </div>
          <button type="button" disabled={testingProvider === 'apple'} onClick={() => handleTestConnection('apple')} className="w-full py-2 mt-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>
            {testingProvider === 'apple' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-blue-400" />} Validate Credentials
          </button>
        </div>

      </div>
    </div>
  );
}
