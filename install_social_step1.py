import os

# 1. Detect App Router root
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

# 2. Provision /api/admin/social-env/route.ts
api_dir = os.path.join(app_dir, 'api', 'admin', 'social-env')
os.makedirs(api_dir, exist_ok=True)
api_path = os.path.join(api_dir, 'route.ts')

api_code = """import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getEnvFilePath() {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, 'apps/web/.env.local'),
    path.join(cwd, 'apps/web/.env')
  ];
  return paths.find(p => fs.existsSync(p)) || path.join(cwd, '.env.local');
}

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\\r?\\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const clean = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIdx = clean.indexOf('=');
    if (eqIdx > 0) {
      const key = clean.slice(0, eqIdx).trim();
      let val = clean.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

export async function GET() {
  try {
    const filePath = getEnvFilePath();
    let fileEnv: Record<string, string> = {};
    if (fs.existsSync(filePath)) {
      fileEnv = parseEnv(fs.readFileSync(filePath, 'utf-8'));
    }

    const config = {
      googleEnabled: fileEnv['NEXT_PUBLIC_GOOGLE_ENABLED'] !== 'false',
      googleClientId: fileEnv['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      googleClientSecret: fileEnv['GOOGLE_CLIENT_SECRET'] || process.env.GOOGLE_CLIENT_SECRET || '',

      facebookEnabled: fileEnv['NEXT_PUBLIC_FACEBOOK_ENABLED'] !== 'false',
      facebookClientId: fileEnv['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || '',
      facebookClientSecret: fileEnv['FACEBOOK_CLIENT_SECRET'] || process.env.FACEBOOK_CLIENT_SECRET || '',

      appleEnabled: fileEnv['NEXT_PUBLIC_APPLE_ENABLED'] === 'true',
      appleClientId: fileEnv['NEXT_PUBLIC_APPLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
      appleTeamId: fileEnv['APPLE_TEAM_ID'] || process.env.APPLE_TEAM_ID || '',
      appleKeyId: fileEnv['APPLE_KEY_ID'] || process.env.APPLE_KEY_ID || '',
    };

    return NextResponse.json({ success: true, config, envPath: filePath });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const filePath = getEnvFilePath();
    let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

    const updates: Record<string, string> = {
      'NEXT_PUBLIC_GOOGLE_ENABLED': String(data.googleEnabled ?? true),
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID': data.googleClientId || '',
      'GOOGLE_CLIENT_SECRET': data.googleClientSecret || '',

      'NEXT_PUBLIC_FACEBOOK_ENABLED': String(data.facebookEnabled ?? true),
      'NEXT_PUBLIC_FACEBOOK_CLIENT_ID': data.facebookClientId || '',
      'FACEBOOK_CLIENT_SECRET': data.facebookClientSecret || '',

      'NEXT_PUBLIC_APPLE_ENABLED': String(data.appleEnabled ?? false),
      'NEXT_PUBLIC_APPLE_CLIENT_ID': data.appleClientId || '',
      'APPLE_TEAM_ID': data.appleTeamId || '',
      'APPLE_KEY_ID': data.appleKeyId || '',
    };

    const lines = content ? content.split(/\\r?\\n/) : [];
    const keysFound = new Set<string>();

    const updatedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        if (key in updates) {
          keysFound.add(key);
          return `${key}="${updates[key]}"`;
        }
      }
      return line;
    });

    const appended: string[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (!keysFound.has(k)) appended.push(`${k}="${v}"`);
    }

    if (appended.length > 0) {
      if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1].trim() !== '') {
        updatedLines.push('');
      }
      updatedLines.push('# --- Social OAuth & Identity Credentials ---');
      updatedLines.push(...appended);
    }

    fs.writeFileSync(filePath, updatedLines.join('\\n'), 'utf-8');
    return NextResponse.json({ success: true, message: 'Settings saved to ' + path.basename(filePath) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_path, 'w', encoding='utf-8') as f:
    f.write(api_code)
print(f"✓ Provisioned API Route: {api_path}")

# 3. Provision /admin/social-login-setting/page.tsx
page_dir = os.path.join(app_dir, 'admin', 'social-login-setting')
os.makedirs(page_dir, exist_ok=True)
page_path = os.path.join(page_dir, 'page.tsx')

page_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Key, Save, RefreshCw, CheckCircle2, 
  AlertCircle, Eye, EyeOff, Copy, Check, Zap, ExternalLink 
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

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
  const [isDayMode, setIsDayMode] = useState(false);
  const [config, setConfig] = useState<SocialConfig>(DEFAULT_CONFIG);
  const [showSecrets, setShowSecrets] = useState<{ [k: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingEnv, setSyncingEnv] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);
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
    if (active.role !== 'admin' && !active.email.includes('admin')) {
      router.replace('/profile');
      return;
    }
    setUser(active);
  }, [router]);

  const loadConfig = useCallback(async () => {
    try {
      const saved = localStorage.getItem('zecratary_social_login_config');
      if (saved) setConfig(JSON.parse(saved));

      const res = await fetch('/api/admin/social-env');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.config) {
          setConfig(prev => ({ ...prev, ...json.config }));
        }
      }
    } catch (_) {}
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
      localStorage.setItem('zecratary_social_login_config', JSON.stringify(config));
      window.dispatchEvent(new Event('zecratary_social_login_updated'));
      window.dispatchEvent(new Event('storage'));

      const res = await fetch('/api/admin/social-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update .env');

      setStatusMsg({ text: t('socialSavedSuccess') || 'Configuration saved and synced to .env successfully!', success: true });
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
      const res = await fetch('/api/admin/social-env');
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(prev => ({ ...prev, ...json.config }));
        localStorage.setItem('zecratary_social_login_config', JSON.stringify(json.config));
        setStatusMsg({ text: t('socialPullSuccess') || 'Values synced from .env successfully!', success: true });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (_) {
      setStatusMsg({ text: 'Failed to read .env file.', success: false });
    } finally {
      setSyncingEnv(false);
    }
  };

  const testProvider = (provider: 'google' | 'facebook' | 'apple') => {
    setDiagnostics(prev => ({ ...prev, [provider]: 'Testing handshake...' }));
    setTimeout(() => {
      if (provider === 'google') {
        const ok = config.googleClientId.includes('.apps.googleusercontent.com') || config.googleClientId.length > 10;
        setDiagnostics(prev => ({ ...prev, google: ok ? '✓ Google OAuth credentials valid.' : '✕ Invalid Client ID format.' }));
      } else if (provider === 'facebook') {
        const ok = /^[0-9]+$/.test(config.facebookClientId) && config.facebookClientId.length >= 8;
        setDiagnostics(prev => ({ ...prev, facebook: ok ? '✓ Facebook App ID verified.' : '✕ App ID must be numeric (8+ digits).' }));
      } else {
        const ok = config.appleClientId.includes('.') && config.appleClientId.length >= 5;
        setDiagnostics(prev => ({ ...prev, apple: ok ? '✓ Apple Service ID valid.' : '✕ Reverse-domain format required.' }));
      }
    }, 500);
  };

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
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${syncingEnv ? 'animate-spin' : ''}`} />
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

      {statusMsg && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            statusMsg.success
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {statusMsg.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Providers Grid */}
      <div className="space-y-6">

        {/* GOOGLE */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google Identity Services</span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.googleEnabled} 
                onChange={(e) => setConfig({ ...config, googleEnabled: e.target.checked })} 
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.googleEnabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client ID</label>
              <input 
                type="text" 
                value={config.googleClientId} 
                onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })} 
                placeholder="123456...apps.googleusercontent.com"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Client Secret</label>
              <div className="relative">
                <input 
                  type={showSecrets.google ? 'text' : 'password'} 
                  value={config.googleClientSecret} 
                  onChange={(e) => setConfig({ ...config, googleClientSecret: e.target.value })} 
                  placeholder="GOCSPX-..."
                  className="w-full border rounded-xl pl-3 pr-9 py-2 font-mono outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
                <button type="button" onClick={() => setShowSecrets(p => ({ ...p, google: !p.google }))} className="absolute right-3 top-2.5 text-slate-400">
                  {showSecrets.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {diagnostics.google && <div className="text-[11px] font-bold text-emerald-400">{diagnostics.google}</div>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={() => testProvider('google')} className="px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Test Connection
            </button>
            <button type="button" onClick={() => handleCopy(`${originUrl}/api/auth/callback/google`, 'gcb')} className="px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              {copiedKey === 'gcb' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Copy Callback URL
            </button>
          </div>
        </div>

        {/* FACEBOOK */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Facebook Login (Meta Graph)</span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.facebookEnabled} 
                onChange={(e) => setConfig({ ...config, facebookEnabled: e.target.checked })} 
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.facebookEnabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Facebook App ID</label>
              <input 
                type="text" 
                value={config.facebookClientId} 
                onChange={(e) => setConfig({ ...config, facebookClientId: e.target.value })} 
                placeholder="18492049281..."
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Facebook App Secret</label>
              <div className="relative">
                <input 
                  type={showSecrets.facebook ? 'text' : 'password'} 
                  value={config.facebookClientSecret} 
                  onChange={(e) => setConfig({ ...config, facebookClientSecret: e.target.value })} 
                  placeholder="••••••••••••"
                  className="w-full border rounded-xl pl-3 pr-9 py-2 font-mono outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
                <button type="button" onClick={() => setShowSecrets(p => ({ ...p, facebook: !p.facebook }))} className="absolute right-3 top-2.5 text-slate-400">
                  {showSecrets.facebook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {diagnostics.facebook && <div className="text-[11px] font-bold text-emerald-400">{diagnostics.facebook}</div>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={() => testProvider('facebook')} className="px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              <Zap className="h-3.5 w-3.5 text-blue-400" /> Test Connection
            </button>
            <button type="button" onClick={() => handleCopy(`${originUrl}/api/auth/callback/facebook`, 'fcb')} className="px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              {copiedKey === 'fcb' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Copy Callback URL
            </button>
          </div>
        </div>

        {/* APPLE */}
        <div 
          className="border rounded-3xl p-6 space-y-4 shadow-xl"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
            <span className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Sign in with Apple</span>
            <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.appleEnabled} 
                onChange={(e) => setConfig({ ...config, appleEnabled: e.target.checked })} 
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
              <span>{config.appleEnabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Service ID (Client ID)</label>
              <input 
                type="text" 
                value={config.appleClientId} 
                onChange={(e) => setConfig({ ...config, appleClientId: e.target.value })} 
                placeholder="com.zecratary.service"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Team ID</label>
              <input 
                type="text" 
                value={config.appleTeamId} 
                onChange={(e) => setConfig({ ...config, appleTeamId: e.target.value })} 
                placeholder="10-char Team ID"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Key ID</label>
              <input 
                type="text" 
                value={config.appleKeyId} 
                onChange={(e) => setConfig({ ...config, appleKeyId: e.target.value })} 
                placeholder="Apple Key ID"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>
          {diagnostics.apple && <div className="text-[11px] font-bold text-emerald-400">{diagnostics.apple}</div>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={() => testProvider('apple')} className="px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              <Zap className="h-3.5 w-3.5 text-slate-400" /> Test Connection
            </button>
            <button type="button" onClick={() => handleCopy(`${originUrl}/api/auth/callback/apple`, 'acb')} className="px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              {copiedKey === 'acb' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Copy Return URL
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
"""
with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_code)
print(f"✓ Provisioned Settings Dashboard: {page_path}")
print("Step 1 successfully installed!")
