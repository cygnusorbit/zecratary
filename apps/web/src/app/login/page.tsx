'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, ArrowRight, Sparkles 
} from 'lucide-react';
import { 
  initAuthStorage, getCurrentUser, setCurrentUser, 
  syncSessionCookie, isSessionCookieValid, authenticateUser, User 
} from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDayMode, setIsDayMode] = useState(false);

  // Synchronize entire page & body background with Day/Night mode
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const root = document.documentElement;
      if (isDay) {
        root.classList.remove('dark');
        root.classList.add('light');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
          document.body.style.color = '#0f172a';
        }
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
          document.body.style.color = '';
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    initAuthStorage();

    // Clean up stale unauthorized_access error flags from browser history
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized_access') {
        localStorage.removeItem('zecratary_current_user');
        localStorage.removeItem('zecratary_user');
        window.history.replaceState({}, document.title, '/login');
        return;
      }

      const active = getCurrentUser();
      const validCookie = isSessionCookieValid();

      // Only redirect if both storage and session cookies are valid
      if (active && validCookie) {
        const dest = active.role === 'admin' ? '/admin' : '/profile';
        window.location.replace(dest);
        return;
      }
    }

    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('storage', applySavedTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
      }
    };
  }, [applySavedTheme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = authenticateUser(email, password);
    if (res.success && res.user) {
      syncSessionCookie(res.user);
      const dest = res.user.role === 'admin' ? '/admin' : '/profile';
      window.location.replace(dest);
    } else {
      setError(res.error || 'Invalid email address or password.');
      setLoading(false);
    }
  };

  // Color tokens aligned with /register, /profile, and /manual Day Mode
  const cPageBg = isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)';
  const cCardBg = isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)';
  const cInputBg = isDayMode ? '#f8fafc' : '#070b13';
  const cBorder = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)';
  const cText = isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)';
  const cSubText = isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)';
  const cLabel = isDayMode ? '#334155' : '#cbd5e1';

  return (
    <div 
      className="w-full min-h-[90vh] flex items-center justify-center px-4 py-10 font-sans transition-colors duration-200"
      style={{ backgroundColor: cPageBg, color: cText }}
    >
      <div 
        className="w-full max-w-md border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: cCardBg,
          borderColor: isDayMode ? '#e2e8f0' : '#1e293b'
        }}
      >
        <div className="space-y-1.5 text-center">
          <div 
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 border shadow-inner"
            style={{
              backgroundColor: cInputBg,
              borderColor: cBorder,
              color: 'var(--color-primary, #E05638)'
            }}
          >
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: cText }}>
            Welcome Back
          </h1>
          <p className="text-xs" style={{ color: cSubText }}>
            Sign in to access recipes, meal plans, and account preferences.
          </p>
        </div>

        {error && (
          <div 
            className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in ${
              isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono transition shadow-inner"
                style={{
                  backgroundColor: cInputBg,
                  borderColor: cBorder,
                  color: cText
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold" style={{ color: cLabel }}>
                Password
              </label>
              <Link 
                href="/forgot-password" 
                className="text-[11px] font-bold hover:underline"
                style={{ color: 'var(--color-primary, #E05638)' }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input 
                type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none transition shadow-inner"
                style={{
                  backgroundColor: cInputBg,
                  borderColor: cBorder,
                  color: cText
                }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Sign In
          </button>
        </form>

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <span style={{ color: cSubText }}>Don&apos;t have an account? </span>
          <Link href="/register" className="font-bold hover:underline" style={{ color: 'var(--color-primary, #E05638)' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
