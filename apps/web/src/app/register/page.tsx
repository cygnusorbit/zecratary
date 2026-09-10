'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle2, 
  AlertCircle, ArrowRight, Sparkles, Eye, EyeOff,
  ShieldCheck, Loader2
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { executeSocialAuth, SocialProvider } from '@/lib/socialAuth';
import { useTranslation } from '@/components/LanguageProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDayMode, setIsDayMode] = useState(false);

  // Social modal state
  const [socialModalProvider, setSocialModalProvider] = useState<SocialProvider | null>(null);
  const [socialName, setSocialName] = useState('');
  const [socialEmail, setSocialEmail] = useState('');

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
    if (getCurrentUser()) router.replace('/profile');
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) return setError('Please provide your full name.');
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError('Please enter a valid email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!agreeTerms) return setError('Please accept the Terms of Service.');

    setLoading(true);

    try {
      const rawUsers = localStorage.getItem('zecratary_users');
      const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        setLoading(false);
        return setError('An account with this email already exists. Please log in.');
      }

      const newUser: User = {
        id: 'usr_' + Date.now().toString(36),
        name: cleanName,
        email: cleanEmail,
        password,
        role: 'user',
        subscriptionPlan: 'taster',
        subscriptionTier: 'taster',
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('zecratary_users', JSON.stringify([newUser, ...users]));
      setCurrentUser(newUser);

      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('zecratary_auth_changed'));
      window.dispatchEvent(new Event('storage'));

      setSuccess('Account created! Redirecting to profile...');
      setTimeout(() => router.replace('/profile'), 700);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setLoading(false);
    }
  };

  const startSocialAuth = (provider: SocialProvider) => {
    setError('');
    setSocialModalProvider(provider);
    if (provider === 'google') {
      setSocialName('Google User');
      setSocialEmail('user@gmail.com');
    } else if (provider === 'github') {
      setSocialName('GitHub Developer');
      setSocialEmail('developer@github.com');
    } else {
      setSocialName('Apple Account');
      setSocialEmail('apple.id@icloud.com');
    }
  };

  const completeSocialAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialModalProvider) return;
    if (!socialEmail || !socialEmail.includes('@')) return setError('Valid email is required.');

    setSocialLoading(socialModalProvider);
    const chosenProvider = socialModalProvider;
    setSocialModalProvider(null);

    setTimeout(() => {
      executeSocialAuth({
        provider: chosenProvider,
        name: socialName,
        email: socialEmail,
      });
      setSuccess(`Signed in with ${chosenProvider.toUpperCase()}! Redirecting...`);
      setTimeout(() => router.replace('/profile'), 500);
    }, 600);
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
            Create an Account
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Join Zecratary to unlock AI meal planning and nutrition analytics.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-300 font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Social Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loading || socialLoading !== null}
            onClick={() => startSocialAuth('google')}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#0e1626',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading || socialLoading !== null}
              onClick={() => startSocialAuth('github')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              {socialLoading === 'github' ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              GitHub
            </button>

            <button
              type="button"
              disabled={loading || socialLoading !== null}
              onClick={() => startSocialAuth('apple')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : '#0e1626',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              {socialLoading === 'apple' ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                </svg>
              )}
              Apple
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#1e293b' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
            or register with email
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#1e293b' }} />
        </div>

        {/* Email Form */}
        <form onSubmit={handleRegister} className="space-y-4 text-xs" autoComplete="off">
          <div>
            <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Full Name *</label>
            <div className="relative">
              <UserIcon className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address *</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Password *</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Confirm Password *</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded accent-[var(--color-primary)] cursor-pointer"
            />
            <span className="text-[11px] leading-snug" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || socialLoading !== null}
            className="w-full py-3 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Create Free Account
          </button>
        </form>

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <span style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Already have an account? </span>
          <Link href="/login" className="font-extrabold hover:underline" style={{ color: 'var(--color-primary, #E05638)' }}>
            Sign In
          </Link>
        </div>
      </div>

      {/* Social Provider Consent Modal */}
      {socialModalProvider && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-wider" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                {socialModalProvider} Sign In
              </h3>
              <button
                type="button"
                onClick={() => setSocialModalProvider(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={completeSocialAuth} className="space-y-3 text-xs">
              <p style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                Confirm the account profile returned by <strong>{socialModalProvider.toUpperCase()}</strong>:
              </p>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Display Name</label>
                <input
                  type="text"
                  required
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none font-bold"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none font-mono"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <button
                  type="button"
                  onClick={() => setSocialModalProvider(null)}
                  className="px-3.5 py-1.5 border rounded-xl font-bold cursor-pointer"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  Authorize & Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
