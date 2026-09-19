'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, 
  ArrowRight, ChefHat, ExternalLink 
} from 'lucide-react';
import { getCurrentUser, loginUser, initAuthStorage, setCurrentUser } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { applyThemeToDocument } from '@/lib/themeConfig';

interface SocialProvidersConfig {
  googleEnabled: boolean;
  googleClientId?: string;
  facebookEnabled: boolean;
  appleEnabled: boolean;
}

function persistSessionUniversally(user: any) {
  if (typeof window === 'undefined' || !user) return;
  try {
    if (typeof setCurrentUser === 'function') {
      setCurrentUser(user);
    }
    const raw = JSON.stringify(user);
    const encoded = encodeURIComponent(raw);
    const keys = ['zecratary_session', 'zecratary_current_user', 'zecratary_auth_session', 'currentUser', 'user'];
    for (const k of keys) {
      localStorage.setItem(k, raw);
      document.cookie = `${k}=${encoded}; path=/; max-age=604800; SameSite=Lax`;
    }
  } catch (_) {}
}

function sanitizeDestination(targetUrl: string | null | undefined, userRole?: string): string {
  const fallback = userRole === 'admin' ? '/admin' : '/profile';
  if (!targetUrl) return fallback;

  const trimmed = targetUrl.trim();
  if (!trimmed) return fallback;

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      const path = parsed.pathname.toLowerCase();
      if (
        path === '/login' || 
        path === '/login/' || 
        path.startsWith('/login/') || 
        path === '/register' || 
        path === '/register/' || 
        path.startsWith('/register/')
      ) {
        return fallback;
      }
      if (typeof window !== 'undefined' && parsed.origin !== window.location.origin) {
        return fallback;
      }
      return parsed.pathname + parsed.search;
    }
  } catch (_) {}

  const lower = trimmed.toLowerCase();
  if (
    lower === '/login' ||
    lower === '/login/' ||
    lower.startsWith('/login?') ||
    lower.startsWith('/login/') ||
    lower === '/register' ||
    lower === '/register/' ||
    lower.startsWith('/register?') ||
    lower.startsWith('/register/') ||
    lower === 'login' ||
    lower === 'register' ||
    lower.includes('%2flogin') ||
    lower.includes('%2fregister')
  ) {
    return fallback;
  }

  return trimmed;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langContext = useTranslation();
  const rawT = langContext?.t;
  const currentLangCode = langContext?.locale || langContext?.currentLanguage || 'en';

  // Dynamic server-backed custom dictionary cache
  const [dynamicDict, setDynamicDict] = useState<Record<string, string>>({});
  const [, setRerenderTrigger] = useState(0);

  // Translation helper resolving: PostgreSQL dynamic phrases -> Context t() -> Fallback
  const t = useCallback((key: string, fallback?: string): string => {
    if (dynamicDict && dynamicDict[key]) {
      return dynamicDict[key];
    }
    if (typeof rawT === 'function') {
      const translated = rawT(key, fallback);
      if (translated && translated !== key) {
        return translated;
      }
    }
    return fallback || key;
  }, [dynamicDict, rawT]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isRedirectingRef = useRef(false);
  const hasExchangedCodeRef = useRef(false);
  const isFetchingSocialRef = useRef(false);

  const [socialConfig, setSocialConfig] = useState<SocialProvidersConfig>({
    googleEnabled: false,
    googleClientId: '',
    facebookEnabled: false,
    appleEnabled: false
  });
  const [socialLoaded, setSocialLoaded] = useState(false);

  // 1. Dynamic PostgreSQL Dictionary Hydration
  const loadDynamicDictionary = useCallback(async () => {
    try {
      const activeLocale = currentLangCode || 'en';
      const res = await fetch(`/api/admin/languages?code=${encodeURIComponent(activeLocale)}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.dictionary) {
          setDynamicDict(data.dictionary);
        }
      }
    } catch (_) {}
  }, [currentLangCode]);

  useEffect(() => {
    loadDynamicDictionary();
    const handleDictionarySync = () => {
      loadDynamicDictionary();
      setRerenderTrigger(v => v + 1);
    };

    window.addEventListener('zecratary_languages_updated', handleDictionarySync);
    window.addEventListener('zecratary_dictionary_updated', handleDictionarySync);
    window.addEventListener('zecratary_language_changed', handleDictionarySync);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleDictionarySync);
      window.removeEventListener('zecratary_dictionary_updated', handleDictionarySync);
      window.removeEventListener('zecratary_language_changed', handleDictionarySync);
    };
  }, [loadDynamicDictionary]);

  // 2. Theme Synchronization
  const syncTheme = useCallback(() => {
    try {
      const storedColors = typeof window !== 'undefined'
        ? (localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config'))
        : null;
      if (storedColors) {
        applyThemeToDocument(JSON.parse(storedColors));
      } else {
        applyThemeToDocument(null);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    let debounceTimer: NodeJS.Timeout;
    const handleDebouncedTheme = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncTheme();
      }, 100);
    };

    window.addEventListener('zecratary_theme_mode_changed', handleDebouncedTheme);
    window.addEventListener('zecratary_theme_changed', handleDebouncedTheme);
    window.addEventListener('zecratary_theme_updated', handleDebouncedTheme);
    window.addEventListener('storage', handleDebouncedTheme);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_theme_mode_changed', handleDebouncedTheme);
      window.removeEventListener('zecratary_theme_changed', handleDebouncedTheme);
      window.removeEventListener('zecratary_theme_updated', handleDebouncedTheme);
      window.removeEventListener('storage', handleDebouncedTheme);
    };
  }, [syncTheme]);

  // 3. Google Identity Services (GIS)
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // 4. Automated Code Exchange
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && !hasExchangedCodeRef.current) {
      hasExchangedCodeRef.current = true;
      setLoading(true);
      setSuccessMsg(t('loginSuccessGoogle', 'Signing in with Google...'));
      const target = `/api/auth/callback/google?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
      window.location.replace(target);
    }
  }, [searchParams, t]);

  // 5. Map Error Parameters
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setLoading(false);
      if (err === 'missing_google_client_id') {
        setErrorMsg(t('missingGoogleClientId', 'Google Client ID is not configured. Please add your OAuth Client ID in /admin/social-login-setting.'));
      } else if (err === 'missing_google_client_secret') {
        setErrorMsg(t('missingGoogleClientSecret', 'Google Client Secret is not configured in /admin/social-login-setting. Click Google to sign in directly.'));
      } else if (err === 'google_access_denied') {
        setErrorMsg(t('googleAccessDenied', 'Google sign-in was canceled.'));
      } else if (err === 'token_exchange_failed' || err === 'oauth_handshake_error') {
        setErrorMsg(t('oauthHandshakeError', 'Server OAuth handshake was interrupted. Click below to sign in directly with Google.'));
      } else {
        setErrorMsg(t('loginErrorGeneric', `Authentication error: ${err}`));
      }
    }
  }, [searchParams, t]);

  // 6. Fetch Server Social Settings
  const fetchSocialConfig = useCallback(async () => {
    if (isFetchingSocialRef.current) return;
    isFetchingSocialRef.current = true;
    try {
      const res = await fetch('/api/admin/settings', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        if (settings && settings.socialLogin) {
          const newCfg: SocialProvidersConfig = {
            googleEnabled: Boolean(settings.socialLogin.googleEnabled),
            googleClientId: settings.socialLogin.googleClientId || '',
            facebookEnabled: Boolean(settings.socialLogin.facebookEnabled),
            appleEnabled: Boolean(settings.socialLogin.appleEnabled)
          };
          setSocialConfig(prev => JSON.stringify(prev) === JSON.stringify(newCfg) ? prev : newCfg);
          setSocialLoaded(true);
          return;
        }
      }

      const envRes = await fetch('/api/admin/social-env', { cache: 'no-store' });
      if (envRes.ok) {
        const envData = await envRes.json();
        if (envData.success && envData.config) {
          const newCfg: SocialProvidersConfig = {
            googleEnabled: Boolean(envData.config.googleEnabled),
            googleClientId: envData.config.googleClientId || '',
            facebookEnabled: Boolean(envData.config.facebookEnabled),
            appleEnabled: Boolean(envData.config.appleEnabled)
          };
          setSocialConfig(prev => JSON.stringify(prev) === JSON.stringify(newCfg) ? prev : newCfg);
        }
      }
    } catch (err) {
      console.error('[login] Failed to load dynamic social login settings:', err);
    } finally {
      isFetchingSocialRef.current = false;
      setSocialLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSocialConfig();
    let debounceTimer: NodeJS.Timeout;
    const handleDebouncedSync = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchSocialConfig();
      }, 300);
    };

    window.addEventListener('zecratary_social_login_updated', handleDebouncedSync);
    window.addEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_social_login_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleDebouncedSync);
    };
  }, [fetchSocialConfig]);

  // 7. Session Verification Guard
  const verifySession = useCallback(() => {
    if (isRedirectingRef.current) return;
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) return;

    const err = searchParams.get('error');
    if (err) return;

    const rawCallback = searchParams.get('callbackUrl');
    const dest = sanitizeDestination(rawCallback, active.role);

    if (!dest || dest === '/login' || dest.startsWith('/login?') || dest.startsWith('/login/')) {
      return;
    }

    try {
      const now = Date.now();
      const lastTs = parseInt(sessionStorage.getItem('zec_login_bounce_ts') || '0', 10);
      const count = parseInt(sessionStorage.getItem('zec_login_bounce_count') || '0', 10);
      if (now - lastTs < 3000) {
        if (count >= 2) {
          console.warn('[login] Redirection bounce suppressed.');
          sessionStorage.removeItem('zec_login_bounce_ts');
          sessionStorage.removeItem('zec_login_bounce_count');
          return;
        }
        sessionStorage.setItem('zec_login_bounce_count', String(count + 1));
      } else {
        sessionStorage.setItem('zec_login_bounce_count', '1');
      }
      sessionStorage.setItem('zec_login_bounce_ts', String(now));
    } catch (_) {}

    isRedirectingRef.current = true;
    persistSessionUniversally(active);
    window.location.replace(dest);
  }, [searchParams]);

  useEffect(() => {
    verifySession();
    let debounceTimer: NodeJS.Timeout;
    const handleAuthChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        verifySession();
      }, 250);
    };

    window.addEventListener('zecratary_auth_changed', handleAuthChange);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('zecratary_auth_changed', handleAuthChange);
    };
  }, [verifySession]);

  // 8. Credentials Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg(t('fillRequiredFields', 'Please provide both email and password.'));
      return;
    }

    setLoading(true);
    try {
      const user = await Promise.resolve(loginUser(email.trim(), password));
      if (user) {
        setSuccessMsg(t('loginSuccess', 'Signing in...'));
        persistSessionUniversally(user);
        window.dispatchEvent(new Event('zecratary_auth_changed'));

        const rawCb = searchParams.get('callbackUrl');
        const dest = sanitizeDestination(rawCb, user.role);

        setTimeout(() => {
          window.location.replace(dest);
        }, 300);
      } else {
        setErrorMsg(t('invalidCredentials', 'Invalid email or password.'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('loginError', 'Failed to sign in. Please try again.'));
      setLoading(false);
    }
  };

  // 9. GIS Authentication Trigger
  const handleSocialClick = (provider: 'google' | 'facebook' | 'apple') => {
    const rawCb = searchParams.get('callbackUrl');
    const dest = sanitizeDestination(rawCb, 'user');

    if (provider === 'google' && socialConfig.googleClientId && socialConfig.googleClientId.trim()) {
      const win = typeof window !== 'undefined' ? (window as any) : null;
      if (win && win.google && win.google.accounts && win.google.accounts.oauth2) {
        setLoading(true);
        setErrorMsg('');

        const safetyTimer = setTimeout(() => {
          setLoading(false);
        }, 12000);

        try {
          const client = win.google.accounts.oauth2.initTokenClient({
            client_id: socialConfig.googleClientId.trim(),
            scope: 'openid email profile',
            prompt: 'select_account',
            callback: async (tokenResponse: any) => {
              clearTimeout(safetyTimer);
              if (tokenResponse && tokenResponse.access_token) {
                try {
                  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  const profile = await userRes.json();
                  if (profile && profile.email) {
                    const sessionRes = await fetch('/api/auth/google-session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ profile, callbackUrl: dest })
                    });
                    const sessionData = await sessionRes.json();
                    if (sessionData.success && sessionData.user) {
                      persistSessionUniversally(sessionData.user);
                      window.dispatchEvent(new Event('zecratary_auth_changed'));
                      setSuccessMsg(t('loginSuccess', 'Signing in...'));

                      const finalTarget = sanitizeDestination(sessionData.redirectUrl || dest, sessionData.user.role);

                      setTimeout(() => {
                        window.location.replace(finalTarget);
                      }, 250);
                      return;
                    }
                  }
                } catch (fetchErr: any) {
                  console.error('Failed to establish Google user session:', fetchErr);
                  setErrorMsg(fetchErr.message || t('retrieveGoogleUserError', 'Unable to retrieve user information from Google.'));
                }
              }
              setLoading(false);
            },
            error_callback: (err: any) => {
              clearTimeout(safetyTimer);
              console.warn('GIS popup canceled or failed, using redirect fallback:', err);
              setLoading(false);
              window.location.href = `/api/auth/login/google?callbackUrl=${encodeURIComponent(dest)}`;
            }
          });
          client.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (gisErr) {
          clearTimeout(safetyTimer);
          console.warn('Failed to initiate GIS client:', gisErr);
          setLoading(false);
        }
      }
    }

    window.location.href = `/api/auth/login/${provider}?callbackUrl=${encodeURIComponent(dest)}`;
  };

  const hasAnySocial = socialLoaded && (socialConfig.googleEnabled || socialConfig.facebookEnabled || socialConfig.appleEnabled);

  const activeProvidersCount = [
    socialConfig.googleEnabled, 
    socialConfig.facebookEnabled, 
    socialConfig.appleEnabled
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div 
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl shadow-md border mb-2 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-primary)'
          }}
        >
          <ChefHat className="h-6 w-6" />
        </div>
        <h1 
          className="text-2xl sm:text-3xl font-black tracking-tight transition-colors duration-200"
          style={{ color: 'var(--color-text)' }}
        >
          {t('signInTitle', 'Welcome Back')}
        </h1>
        <p 
          className="text-xs sm:text-sm transition-colors duration-200"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('signInSubtitle', 'Enter your credentials to access your meal assistant.')}
        </p>
      </div>

      {/* Card Container */}
      <div 
        className="border rounded-3xl p-6 sm:p-8 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Status Alerts */}
        {errorMsg && (
          <div 
            className="mb-5 p-3.5 border rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-in fade-in transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444'
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
              {errorMsg.includes('/admin/social-login-setting') && (
                <div className="mt-1.5">
                  <Link 
                    href="/admin/social-login-setting"
                    className="inline-flex items-center gap-1 font-bold underline hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <span>{t('configureGoogleOAuth', 'Configure Google OAuth')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div 
            className="mb-5 p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-emerald)',
              color: 'var(--color-emerald)'
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label 
              className="block font-bold mb-1.5 transition-colors duration-200"
              style={{ color: 'var(--color-text)' }}
            >
              {t('emailLabel', 'Email Address')}
            </label>
            <div className="relative">
              <Mail 
                className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none transition-colors duration-200" 
                style={{ color: 'var(--color-text-secondary)' }} 
              />
              <input 
                type="email"
                required
                autoComplete="email"
                placeholder={t('emailPlaceholder', 'you@example.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 outline-none font-medium transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label 
                className="block font-bold transition-colors duration-200"
                style={{ color: 'var(--color-text)' }}
              >
                {t('passwordLabel', 'Password')}
              </label>
              <Link 
                href="/forgot-password"
                className="text-[11px] font-semibold hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('forgotPassword', 'Forgot password?')}
              </Link>
            </div>
            <div className="relative">
              <Lock 
                className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none transition-colors duration-200" 
                style={{ color: 'var(--color-text-secondary)' }} 
              />
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder={t('passwordPlaceholder', '••••••••••••')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none font-mono transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 cursor-pointer hover:opacity-80 transition"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label={t('togglePasswordVisibility', 'Toggle password visibility')}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('signInBtn', 'Sign In')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Dynamic Social Login Section */}
        {hasAnySocial && (
          <div className="mt-6 space-y-4">
            <div className="relative flex items-center justify-center">
              <div 
                className="w-full border-t transition-colors duration-200"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <span 
                className="absolute px-3 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200"
                style={{ 
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-text-secondary)' 
                }}
              >
                {t('orContinueWith', 'Or continue with')}
              </span>
            </div>

            <div 
              className={`grid gap-2.5 ${
                activeProvidersCount === 1 ? 'grid-cols-1' : activeProvidersCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {socialConfig.googleEnabled && (
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => handleSocialClick('google')}
                  className="py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-85 shadow-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  title={t('signInWithGoogle', 'Sign in with Google')}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>{t('googleProvider', 'Google')}</span>
                </button>
              )}

              {socialConfig.facebookEnabled && (
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => handleSocialClick('facebook')}
                  className="py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-85 shadow-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  title={t('signInWithFacebook', 'Sign in with Facebook')}
                >
                  <svg className="w-4 h-4 text-[#1877F2] fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>{t('facebookProvider', 'Facebook')}</span>
                </button>
              )}

              {socialConfig.appleEnabled && (
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => handleSocialClick('apple')}
                  className="py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-85 shadow-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  title={t('signInWithApple', 'Sign in with Apple')}
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76.99.08 2.05-.51 2.68-1.26z" />
                  </svg>
                  <span>{t('appleProvider', 'Apple')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div 
          className="mt-6 pt-4 border-t text-center text-xs transition-colors duration-200"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span 
            className="transition-colors duration-200"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('noAccountPrompt', "Don't have an account?")}{' '}
          </span>
          <Link 
            href="/register"
            className="font-bold hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('signUpPrompt', 'Sign up for free')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 transition-colors duration-200">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <div 
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
