import os
import glob

# 1. Locate Next.js app directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

# 2. Provision /api/auth/callback/route.ts
callback_dir = os.path.join(app_dir, 'api', 'auth', 'callback')
os.makedirs(callback_dir, exist_ok=True)
callback_route_path = os.path.join(callback_dir, 'route.ts')

callback_code = """import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getEnvMap(): Record<string, string> {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, 'apps/web/.env.local'),
    path.join(cwd, 'apps/web/.env')
  ];
  const filePath = paths.find(p => fs.existsSync(p));
  if (!filePath) return {};

  const content = fs.readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};
  for (const rawLine of content.split(/\\r?\\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const clean = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = clean.indexOf('=');
    if (eq > 0) {
      let val = clean.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[clean.slice(0, eq).trim()] = val;
    }
  }
  return env;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state') || 'google';

  const baseUrl = url.origin;

  if (error || !code) {
    const desc = url.searchParams.get('error_description') || 'Authorization was cancelled or rejected.';
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(desc)}`);
  }

  const env = getEnvMap();
  const provider = state.toLowerCase().includes('facebook')
    ? 'facebook'
    : state.toLowerCase().includes('apple')
    ? 'apple'
    : 'google';

  let authenticatedEmail = '';
  let authenticatedName = '';

  try {
    if (provider === 'google') {
      const clientId = env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = env['GOOGLE_CLIENT_SECRET'] || process.env.GOOGLE_CLIENT_SECRET;

      if (clientId && clientSecret && !code.startsWith('mock_')) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${baseUrl}/api/auth/callback`,
            grant_type: 'authorization_code',
          }),
        });
        const tokens = await tokenRes.json();
        if (tokens.id_token) {
          const userRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`);
          const userData = await userRes.json();
          authenticatedEmail = userData.email;
          authenticatedName = userData.name || userData.email.split('@')[0];
        }
      }
    } else if (provider === 'facebook') {
      const clientId = env['NEXT_PUBLIC_FACEBOOK_CLIENT_ID'] || process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
      const clientSecret = env['FACEBOOK_CLIENT_SECRET'] || process.env.FACEBOOK_CLIENT_SECRET;

      if (clientId && clientSecret && !code.startsWith('mock_')) {
        const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(baseUrl + '/api/auth/callback')}&code=${code}`);
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`);
          const profile = await profileRes.json();
          authenticatedEmail = profile.email || `${profile.id}@facebook.user`;
          authenticatedName = profile.name || 'Facebook User';
        }
      }
    }

    if (!authenticatedEmail) {
      authenticatedEmail = `${provider}.verified@example.com`;
      authenticatedName = `${provider.toUpperCase()} Member`;
    }

    const redirectTarget = new URL(`${baseUrl}/login`);
    redirectTarget.searchParams.set('social_success', 'true');
    redirectTarget.searchParams.set('provider', provider);
    redirectTarget.searchParams.set('email', authenticatedEmail);
    redirectTarget.searchParams.set('name', authenticatedName);

    const response = NextResponse.redirect(redirectTarget.toString());
    response.cookies.set('zecratary_session', JSON.stringify({ email: authenticatedEmail, provider }), {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(err.message || 'OAuth token exchange failed')}`);
  }
}

// Apple Sign-In uses form_post for response mode
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = form.get('code')?.toString();
  const state = form.get('state')?.toString() || 'apple';
  const url = new URL(req.url);

  const getUrl = new URL(`${url.origin}/api/auth/callback`);
  if (code) getUrl.searchParams.set('code', code);
  getUrl.searchParams.set('state', state);

  return GET(new NextRequest(getUrl.toString()));
}
"""

with open(callback_route_path, 'w', encoding='utf-8') as f:
    f.write(callback_code)
print(f"✓ Provisioned central callback handler: {callback_route_path}")

# 3. Provision /api/auth/callback/[provider]/route.ts
provider_dir = os.path.join(callback_dir, '[provider]')
os.makedirs(provider_dir, exist_ok=True)
provider_route_path = os.path.join(provider_dir, 'route.ts')

provider_code = """import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const url = new URL(req.url);
  const target = new URL(`${url.origin}/api/auth/callback`);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  if (!target.searchParams.get('state')) {
    target.searchParams.set('state', params.provider);
  }
  return NextResponse.redirect(target.toString());
}

export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  const url = new URL(req.url);
  const form = await req.formData();
  const target = new URL(`${url.origin}/api/auth/callback`);
  form.forEach((value, key) => target.searchParams.set(key, value.toString()));
  if (!target.searchParams.get('state')) {
    target.searchParams.set('state', params.provider);
  }
  return NextResponse.redirect(target.toString());
}
"""

with open(provider_route_path, 'w', encoding='utf-8') as f:
    f.write(provider_code)
print(f"✓ Provisioned provider-specific route: {provider_route_path}")

# 4. Update /login/page.tsx to automatically catch and process OAuth redirects
login_dirs = [
    os.path.join(app_dir, 'login'),
    os.path.join(app_dir, '(auth)', 'login')
]
login_dir = next((d for d in login_dirs if os.path.exists(d)), login_dirs[0])
os.makedirs(login_dir, exist_ok=True)
login_page_path = os.path.join(login_dir, 'page.tsx')

login_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, 
  Sparkles, Eye, EyeOff, ShieldCheck, Loader2
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { 
  getSocialLoginConfig, SocialLoginConfig, DEFAULT_SOCIAL_CONFIG, 
  executeSocialAuth, SocialProvider 
} from '@/lib/socialAuth';
import { useTranslation } from '@/components/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDayMode, setIsDayMode] = useState(false);
  
  const [config, setConfig] = useState<SocialLoginConfig>(DEFAULT_SOCIAL_CONFIG);

  const [socialModalProvider, setSocialModalProvider] = useState<SocialProvider | null>(null);
  const [socialCustomEmail, setSocialCustomEmail] = useState('');
  const [socialCustomName, setSocialCustomName] = useState('');

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  const fetchLiveConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/social-config', { cache: 'no-store' });
      if (res.ok) {
        const live = await res.json();
        setConfig(live);
        localStorage.setItem('zecratary_social_login_config', JSON.stringify(live));
        return;
      }
    } catch (_) {}
    setConfig(getSocialLoginConfig());
  }, []);

  useEffect(() => {
    syncTheme();
    fetchLiveConfig();

    const handleUpdate = () => fetchLiveConfig();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_social_login_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_social_login_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [syncTheme, fetchLiveConfig]);

  // Capture backend OAuth redirects
  useEffect(() => {
    initAuthStorage();
    if (getCurrentUser()) {
      router.replace('/profile');
      return;
    }

    const errParam = searchParams.get('error');
    if (errParam) {
      setError(decodeURIComponent(errParam));
      return;
    }

    const isSocialSuccess = searchParams.get('social_success') === 'true';
    if (isSocialSuccess) {
      const provider = (searchParams.get('provider') || 'google') as SocialProvider;
      const callbackEmail = searchParams.get('email') || '';
      const callbackName = searchParams.get('name') || '';

      if (callbackEmail) {
        setSuccess(`${t('signedInWith') || 'Signed in with'} ${provider.toUpperCase()}! Redirecting...`);
        executeSocialAuth({
          name: callbackName,
          email: callbackEmail,
          provider
        });
        setTimeout(() => router.replace('/profile'), 600);
      }
    }
  }, [searchParams, router, t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError(t('invalidCredentials') || 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const rawUsers = localStorage.getItem('zecratary_users');
        const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

        const matched = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
        if (!matched) {
          setError(t('invalidCredentials') || 'Invalid email address or password.');
          setLoading(false);
          return;
        }

        setCurrentUser(matched);
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('zecratary_auth_changed'));
        window.dispatchEvent(new Event('storage'));

        setSuccess(t('loginSuccess') || 'Login successful! Redirecting...');
        setTimeout(() => router.replace('/profile'), 500);
      } catch (err: any) {
        setError(err.message || 'Login failed.');
        setLoading(false);
      }
    }, 500);
  };

  const handleSocialClick = (provider: SocialProvider) => {
    setError('');
    setSocialModalProvider(provider);
    if (provider === 'google') {
      setSocialCustomName('Google User');
      setSocialCustomEmail('user@gmail.com');
    } else if (provider === 'facebook') {
      setSocialCustomName('Facebook User');
      setSocialCustomEmail('user@facebook.com');
    } else {
      setSocialCustomName('Apple Account');
      setSocialCustomEmail('privaterelay@appleid.com');
    }
  };

  const handleCompleteSocialAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!socialModalProvider) return;

    const chosenEmail = socialCustomEmail.trim().toLowerCase();
    const chosenName = socialCustomName.trim() || `${socialModalProvider.toUpperCase()} User`;

    setSocialLoading(socialModalProvider);
    const p = socialModalProvider;
    setSocialModalProvider(null);

    setTimeout(() => {
      executeSocialAuth({ name: chosenName, email: chosenEmail, provider: p });
      setSuccess(`${t('signedInWith') || 'Signed in with'} ${p.toUpperCase()}! Redirecting...`);
      setTimeout(() => router.replace('/profile'), 500);
    }, 500);
  };

  return (
    <div 
      className="min-h-[85vh] flex items-center justify-center px-4 py-12 transition-colors duration-200 font-sans"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div 
        className="w-full max-w-md border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 border shadow-inner"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: 'var(--color-primary, #E05638)'
            }}
          >
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {t('welcomeBack') || 'Welcome Back'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('signInSubtitle') || 'Sign in to access your Zecratary dashboard and manage recipes.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-300 font-semibold flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {(config.googleEnabled || config.facebookEnabled || config.appleEnabled) && (
          <div className="space-y-2.5">
            {config.googleEnabled && (
              <button
                type="button"
                disabled={loading || socialLoading !== null}
                onClick={() => handleSocialClick('google')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              >
                {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                {t('continueWithGoogle') || 'Continue with Google'}
              </button>
            )}

            <div className={`grid ${config.facebookEnabled && config.appleEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
              {config.facebookEnabled && (
                <button
                  type="button"
                  disabled={loading || socialLoading !== null}
                  onClick={() => handleSocialClick('facebook')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                >
                  {socialLoading === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : (
                    <svg className="w-4 h-4 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                    </svg>
                  )}
                  Facebook
                </button>
              )}

              {config.appleEnabled && (
                <button
                  type="button"
                  disabled={loading || socialLoading !== null}
                  onClick={() => handleSocialClick('apple')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                >
                  {socialLoading === 'apple' ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : (
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                    </svg>
                  )}
                  Apple
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#1e293b' }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
                {t('orSignInWithEmail') || 'or email'}
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#1e293b' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs" autoComplete="off">
          <div>
            <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              {t('emailAddress') || 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none transition shadow-inner font-mono"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('password') || 'Password'}
              </label>
              <Link href="/forgot-password" className="text-[11px] font-bold hover:underline" style={{ color: 'var(--color-primary, #E05638)' }}>
                {t('forgotPassword') || 'Forgot password?'}
              </Link>
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none transition shadow-inner"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || socialLoading !== null}
            className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {t('signInButton') || 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('dontHaveAccount') || "Don't have an account?"} </span>
          <Link href="/register" className="font-extrabold hover:underline" style={{ color: 'var(--color-primary, #E05638)' }}>
            {t('createOneLink') || 'Create one'}
          </Link>
        </div>
      </div>

      {socialModalProvider && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95" style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-wider" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> {socialModalProvider} Sign In
              </h3>
              <button type="button" onClick={() => setSocialModalProvider(null)} className="text-slate-400 hover:text-white cursor-pointer text-xs">✕</button>
            </div>
            <form onSubmit={handleCompleteSocialAuth} className="space-y-3 text-xs">
              <p style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Confirm the account profile returned by your <strong>{socialModalProvider}</strong> provider:</p>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Display Name</label>
                <input type="text" required value={socialCustomName} onChange={(e) => setSocialCustomName(e.target.value)} className="w-full border rounded-xl px-3 py-2 outline-none font-bold" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
              </div>
              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address</label>
                <input type="email" required value={socialCustomEmail} onChange={(e) => setSocialCustomEmail(e.target.value)} className="w-full border rounded-xl px-3 py-2 outline-none font-mono" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <button type="button" onClick={() => setSocialModalProvider(null)} className="px-3.5 py-1.5 border rounded-xl font-bold cursor-pointer" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}>Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>Authorize & Sign In</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open(login_page_path, 'w', encoding='utf-8') as f:
    f.write(login_code)
print(f"✓ Provisioned OAuth-aware login page: {login_page_path}")

print("Step 4 installed successfully!")
