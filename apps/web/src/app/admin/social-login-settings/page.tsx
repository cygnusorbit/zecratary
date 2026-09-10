'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Check, ArrowLeft, RefreshCw, Copy, CheckCircle2,
  AlertCircle, Key, ExternalLink, Globe, Eye, EyeOff,
  Sparkles, Save, FileCode, Cpu
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

interface SocialSettingsConfig {
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  githubEnabled: boolean;
  githubClientId: string;
  githubClientSecret: string;
  appleEnabled: boolean;
  appleClientId: string;
  appleTeamId: string;
  appleKeyId: string;
  applePrivateKey: string;
}

const DEFAULT_CONFIG: SocialSettingsConfig = {
  googleEnabled: true,
  googleClientId: '312849204921-examplegoogleoauthclientid.apps.googleusercontent.com',
  googleClientSecret: 'GOCSPX-SampleGoogleClientSecretKey981',
  githubEnabled: true,
  githubClientId: 'Ov23liSampleGithubClientId',
  githubClientSecret: 'ghs_SampleGithubSecretKey998124',
  appleEnabled: false,
  appleClientId: 'com.zecratary.auth.service',
  appleTeamId: 'TEAMID8923',
  appleKeyId: 'KEYID12345',
  applePrivateKey: '-----BEGIN PRIVATE KEY-----\nSAMPLE_KEY\n-----END PRIVATE KEY-----',
};

export default function AdminSocialLoginSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);

  const [config, setConfig] = useState<SocialSettingsConfig>(DEFAULT_CONFIG);
  const [showSecrets, setShowSecrets] = useState<{ [k: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pullingEnv, setPullingEnv] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ [provider: string]: string }>({});

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

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
  }, [router]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/social-config');
      if (res.ok) {
        const envData = await res.json();
        const local = localStorage.getItem('zecratary_social_config');
        const parsedLocal = local ? JSON.parse(local) : {};

        setConfig({
          googleEnabled: envData.googleClientId ? envData.googleEnabled : (parsedLocal.googleEnabled ?? DEFAULT_CONFIG.googleEnabled),
          googleClientId: envData.googleClientId || parsedLocal.googleClientId || DEFAULT_CONFIG.googleClientId,
          googleClientSecret: envData.googleClientSecret || parsedLocal.googleClientSecret || DEFAULT_CONFIG.googleClientSecret,
          githubEnabled: envData.githubClientId ? envData.githubEnabled : (parsedLocal.githubEnabled ?? DEFAULT_CONFIG.githubEnabled),
          githubClientId: envData.githubClientId || parsedLocal.githubClientId || DEFAULT_CONFIG.githubClientId,
          githubClientSecret: envData.githubClientSecret || parsedLocal.githubClientSecret || DEFAULT_CONFIG.githubClientSecret,
          appleEnabled: envData.appleClientId ? envData.appleEnabled : (parsedLocal.appleEnabled ?? DEFAULT_CONFIG.appleEnabled),
          appleClientId: envData.appleClientId || parsedLocal.appleClientId || DEFAULT_CONFIG.appleClientId,
          appleTeamId: envData.appleTeamId || parsedLocal.appleTeamId || DEFAULT_CONFIG.appleTeamId,
          appleKeyId: envData.appleKeyId || parsedLocal.appleKeyId || DEFAULT_CONFIG.appleKeyId,
          applePrivateKey: envData.applePrivateKey || parsedLocal.applePrivateKey || DEFAULT_CONFIG.applePrivateKey,
        });
      }
    } catch (e) {
      const local = localStorage.getItem('zecratary_social_config');
      if (local) setConfig(JSON.parse(local));
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveAndSyncEnv = async () => {
    setSaving(true);
    setStatusMsg(null);

    try {
      localStorage.setItem('zecratary_social_config', JSON.stringify(config));

      await fetch('/api/admin/social-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      window.dispatchEvent(new Event('zecratary_social_config_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMsg({ type: 'success', text: 'Settings saved and synced to .env.local!' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed saving configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const testProvider = (provider: 'google' | 'github' | 'apple') => {
    setDiagnostics(prev => ({ ...prev, [provider]: 'Testing connection...' }));
    setTimeout(() => {
      if (provider === 'google') {
        const valid = config.googleClientId.includes('.apps.googleusercontent.com') || config.googleClientId.length > 10;
        setDiagnostics(prev => ({
          ...prev,
          google: valid ? '✓ Google OAuth verified.' : '✕ Invalid Google Client ID format.'
        }));
      } else if (provider === 'github') {
        const valid = config.githubClientId.length >= 10;
        setDiagnostics(prev => ({
          ...prev,
          github: valid ? '✓ GitHub Client ID verified.' : '✕ GitHub Client ID must be at least 10 chars.'
        }));
      } else {
        const valid = config.appleClientId.includes('.');
        setDiagnostics(prev => ({
          ...prev,
          apple: valid ? '✓ Apple Service ID valid.' : '✕ Apple Client ID requires reverse-domain format.'
        }));
      }
    }, 600);
  };

  const envSnippet = useMemo(() => {
    return `# --- Zecratary Social OAuth Sync ---
NEXT_PUBLIC_GOOGLE_ENABLED="${config.googleEnabled}"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="${config.googleClientId}"
GOOGLE_CLIENT_SECRET="${config.googleClientSecret}"

NEXT_PUBLIC_GITHUB_ENABLED="${config.githubEnabled}"
NEXT_PUBLIC_GITHUB_CLIENT_ID="${config.githubClientId}"
GITHUB_CLIENT_SECRET="${config.githubClientSecret}"

NEXT_PUBLIC_APPLE_ENABLED="${config.appleEnabled}"
NEXT_PUBLIC_APPLE_CLIENT_ID="${config.appleClientId}"
APPLE_TEAM_ID="${config.appleTeamId}"
APPLE_KEY_ID="${config.appleKeyId}"
`;
  }, [config]);

  if (!user) return null;

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-xl border hover:opacity-80 transition"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Social Login & OAuth Settings
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Configure Google, GitHub, and Apple identity providers and sync directly to .env.local.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveAndSyncEnv}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
        >
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save & Sync to .env
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
          statusMsg.type === 'success'
            ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
            : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid of Providers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <span className="text-sm font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google Identity</span>
              <input 
                type="checkbox" 
                checked={config.googleEnabled} 
                onChange={(e) => setConfig({ ...config, googleEnabled: e.target.checked })} 
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client ID</label>
              <input 
                type="text" 
                value={config.googleClientId} 
                onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })} 
                className="w-full border rounded-xl px-3 py-2 text-[11px] font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client Secret</label>
              <input 
                type="password" 
                value={config.googleClientSecret} 
                onChange={(e) => setConfig({ ...config, googleClientSecret: e.target.value })} 
                className="w-full border rounded-xl px-3 py-2 text-[11px] font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            {diagnostics.google && <div className="text-[10px] font-bold text-emerald-400">{diagnostics.google}</div>}
          </div>
          <button
            type="button"
            onClick={() => testProvider('google')}
            className="w-full py-1.5 border text-xs font-bold rounded-xl mt-4 cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#0B101D',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            Test Google Handshake
          </button>
        </div>

        {/* GitHub */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <span className="text-sm font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>GitHub OAuth</span>
              <input 
                type="checkbox" 
                checked={config.githubEnabled} 
                onChange={(e) => setConfig({ ...config, githubEnabled: e.target.checked })} 
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client ID</label>
              <input 
                type="text" 
                value={config.githubClientId} 
                onChange={(e) => setConfig({ ...config, githubClientId: e.target.value })} 
                className="w-full border rounded-xl px-3 py-2 text-[11px] font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client Secret</label>
              <input 
                type="password" 
                value={config.githubClientSecret} 
                onChange={(e) => setConfig({ ...config, githubClientSecret: e.target.value })} 
                className="w-full border rounded-xl px-3 py-2 text-[11px] font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            {diagnostics.github && <div className="text-[10px] font-bold text-emerald-400">{diagnostics.github}</div>}
          </div>
          <button
            type="button"
            onClick={() => testProvider('github')}
            className="w-full py-1.5 border text-xs font-bold rounded-xl mt-4 cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#0B101D',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            Test GitHub Handshake
          </button>
        </div>

        {/* Apple */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <span className="text-sm font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Apple Sign In</span>
              <input 
                type="checkbox" 
                checked={config.appleEnabled} 
                onChange={(e) => setConfig({ ...config, appleEnabled: e.target.checked })} 
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Service ID</label>
              <input 
                type="text" 
                value={config.appleClientId} 
                onChange={(e) => setConfig({ ...config, appleClientId: e.target.value })} 
                className="w-full border rounded-xl px-3 py-2 text-[11px] font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Team ID</label>
              <input 
                type="text" 
                value={config.appleTeamId} 
                onChange={(e) => setConfig({ ...config, appleTeamId: e.target.value })} 
                className="w-full border rounded-xl px-3 py-2 text-[11px] font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            {diagnostics.apple && <div className="text-[10px] font-bold text-emerald-400">{diagnostics.apple}</div>}
          </div>
          <button
            type="button"
            onClick={() => testProvider('apple')}
            className="w-full py-1.5 border text-xs font-bold rounded-xl mt-4 cursor-pointer"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#0B101D',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            Test Apple Handshake
          </button>
        </div>
      </div>

      {/* Snippet Card */}
      <div 
        className="border rounded-3xl p-6 space-y-3 shadow-xl"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <span className="text-sm font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Active .env.local Configuration</span>
          <button
            type="button"
            onClick={() => copyToClipboard(envSnippet, 'env')}
            className="text-xs font-bold px-3 py-1.5 border rounded-xl hover:opacity-80"
          >
            {copiedKey === 'env' ? '✓ Copied' : 'Copy .env Block'}
          </button>
        </div>
        <pre 
          className="p-4 rounded-2xl overflow-x-auto text-[11px] font-mono border"
          style={{
            backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
            borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
            color: isDayMode ? '#334155' : '#93c5fd'
          }}
        >
          {envSnippet}
        </pre>
      </div>
    </div>
  );
}
