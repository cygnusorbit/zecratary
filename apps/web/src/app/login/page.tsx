'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, 
  ArrowRight, Sparkles, ChefHat 
} from 'lucide-react';
import { getCurrentUser, loginUser, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { applyThemeToDocument } from '@/lib/themeConfig';

interface SocialProvidersConfig {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  appleEnabled: boolean;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDayMode, setIsDayMode] = useState(false);

  // Dynamic social provider configuration state (defaulting to false to prevent layout flash)
  const [socialConfig, setSocialConfig] = useState<SocialProvidersConfig>({
    googleEnabled: false,
    facebookEnabled: false,
    appleEnabled: false
  });
  const [socialLoaded, setSocialLoaded] = useState(false);

  // 1. Theme Synchronization
  const syncTheme = useCallback(() => {
    try {
      if (typeof document !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark');
        setIsDayMode(!isDark);
      }
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

  // 2. Fetch Centralized Server-Backed Social Login Settings
  const fetchSocialConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        if (settings && settings.socialLogin) {
          setSocialConfig({
            googleEnabled: Boolean(settings.socialLogin.googleEnabled),
            facebookEnabled: Boolean(settings.socialLogin.facebookEnabled),
            appleEnabled: Boolean(settings.socialLogin.appleEnabled)
          });
          setSocialLoaded(true);
          return;
        }
      }

      // Fallback: Query .env endpoint if server store hasn't initialized
      const envRes = await fetch('/api/admin/social-env', { cache: 'no-store' });
      if (envRes.ok) {
        const envData = await envRes.json();
        if (envData.success && envData.config) {
          setSocialConfig({
            googleEnabled: Boolean(envData.config.googleEnabled),
            facebookEnabled: Boolean(envData.config.facebookEnabled),
            appleEnabled: Boolean(envData.config.appleEnabled)
          });
        }
      }
    } catch (err) {
      console.error('[login] Failed to load dynamic social login settings:', err);
    } finally {
      setSocialLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSocialConfig();
    window.addEventListener('zecratary_social_login_updated', fetchSocialConfig);
    window.addEventListener('zecratary_admin_settings_updated', fetchSocialConfig);
    return () => {
      window.removeEventListener('zecratary_social_login_updated', fetchSocialConfig);
      window.removeEventListener('zecratary_admin_settings_updated', fetchSocialConfig);
    };
  }, [fetchSocialConfig]);

  // 3. User Session Verification
  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (active) {
      const callback = searchParams.get('callbackUrl') || (active.role === 'admin' ? '/admin' : '/profile');
      router.replace(callback);
    }
  }, [router, searchParams]);

  // 4. Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg(t('fillRequiredFields') || 'Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await Promise.resolve(loginUser(email.trim(), password));
      if (user) {
        setSuccessMsg(t('loginSuccess') || 'Signing in...');
        const callback = searchParams.get('callbackUrl') || (user.role === 'admin' ? '/admin' : '/profile');
        setTimeout(() => {
          router.push(callback);
        }, 500);
      } else {
        setErrorMsg(t('invalidCredentials') || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || (t('loginError') || 'Failed to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = (provider: 'google' | 'facebook' | 'apple') => {
    const callback = searchParams.get('callbackUrl') || '/profile';
    window.location.href = `/api/auth/login/${provider}?callbackUrl=${encodeURIComponent(callback)}`;
  };

  const hasAnySocial = socialLoaded && (socialConfig.googleEnabled || socialConfig.facebookEnabled || socialConfig.appleEnabled);

  // Active enabled providers count for flexible grid styling
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
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl shadow-md border mb-2"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
            color: 'var(--color-primary, #E05638)'
          }}
        >
          <ChefHat className="h-6 w-6" />
        </div>
        <h1 
          className="text-2xl sm:text-3xl font-black tracking-tight"
          style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
        >
          {t('signInTitle') || 'Welcome Back'}
        </h1>
        <p 
          className="text-xs sm:text-sm"
          style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}
        >
          {t('signInSubtitle') || 'Enter your credentials to access your meal assistant.'}
        </p>
      </div>

      {/* Card Container */}
      <div 
        className="border rounded-3xl p-6 sm:p-8 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        {/* Status Alerts */}
        {errorMsg && (
          <div 
            className="mb-5 p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in"
            style={{
              backgroundColor: isDayMode ? '#fef2f2' : 'rgba(127, 29, 29, 0.3)',
              borderColor: isDayMode ? '#fca5a5' : '#991b1b',
              color: isDayMode ? '#991b1b' : '#fca5a5'
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div 
            className="mb-5 p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in"
            style={{
              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
              borderColor: isDayMode ? '#a7f3d0' : 'var(--color-emerald, #10b981)',
              color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
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
              className="block font-bold mb-1.5"
              style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
            >
              {t('emailLabel') || 'Email Address'}
            </label>
            <div className="relative">
              <Mail 
                className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none" 
                style={{ color: isDayMode ? '#94a3b8' : '#64748b' }} 
              />
              <input 
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 outline-none font-medium transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label 
                className="block font-bold"
                style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}
              >
                {t('passwordLabel') || 'Password'}
              </label>
              <Link 
                href="/forgot-password"
                className="text-[11px] font-semibold hover:underline"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                {t('forgotPassword') || 'Forgot password?'}
              </Link>
            </div>
            <div className="relative">
              <Lock 
                className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none" 
                style={{ color: isDayMode ? '#94a3b8' : '#64748b' }} 
              />
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none font-mono transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 cursor-pointer hover:opacity-80 transition"
                style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('signInBtn') || 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Dynamic Social Login Section (Only rendered when at least one provider is enabled) */}
        {hasAnySocial && (
          <div className="mt-6 space-y-4">
            <div className="relative flex items-center justify-center">
              <div 
                className="w-full border-t"
                style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
              />
              <span 
                className="absolute px-3 text-[11px] font-bold uppercase tracking-wider"
                style={{ 
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  color: isDayMode ? '#94a3b8' : '#64748b' 
                }}
              >
                {t('orContinueWith') || 'Or continue with'}
              </span>
            </div>

            <div 
              className={`grid gap-2.5 ${
                activeProvidersCount === 1 ? 'grid-cols-1' : activeProvidersCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {/* Google Provider Button */}
              {socialConfig.googleEnabled && (
                <button 
                  type="button"
                  onClick={() => handleSocialClick('google')}
                  className="py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-85 shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  title={t('signInWithGoogle') || 'Sign in with Google'}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
              )}

              {/* Facebook Provider Button */}
              {socialConfig.facebookEnabled && (
                <button 
                  type="button"
                  onClick={() => handleSocialClick('facebook')}
                  className="py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-85 shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  title={t('signInWithFacebook') || 'Sign in with Facebook'}
                >
                  <svg className="w-4 h-4 text-[#1877F2] fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              )}

              {/* Apple Provider Button */}
              {socialConfig.appleEnabled && (
                <button 
                  type="button"
                  onClick={() => handleSocialClick('apple')}
                  className="py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-85 shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  title={t('signInWithApple') || 'Sign in with Apple'}
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76.99.08 2.05-.51 2.68-1.26z" />
                  </svg>
                  <span>Apple</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div 
          className="mt-6 pt-4 border-t text-center text-xs"
          style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <span style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('noAccountPrompt') || "Don't have an account?"}{' '}
          </span>
          <Link 
            href="/register"
            className="font-bold hover:underline"
            style={{ color: 'var(--color-primary, #E05638)' }}
          >
            {t('signUpPrompt') || 'Sign up for free'}
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
            style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }}
          />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
