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
import { 
  executeSocialAuth, 
  getSocialLoginConfig, 
  SocialProvider, 
  SocialLoginConfig, 
  DEFAULT_SOCIAL_CONFIG 
} from '@/lib/socialAuth';

export default function RegisterPage() {
  const router = useRouter();

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

  const [socialConfig, setSocialConfig] = useState<SocialLoginConfig>(DEFAULT_SOCIAL_CONFIG);

  const [socialModalProvider, setSocialModalProvider] = useState<SocialProvider | null>(null);
  const [socialName, setSocialName] = useState('');
  const [socialEmail, setSocialEmail] = useState('');

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  const syncSocialConfig = useCallback(() => {
    setSocialConfig(getSocialLoginConfig());
  }, []);

  useEffect(() => {
    // Initial read on mount
    syncTheme();
    syncSocialConfig();

    // BroadcastChannel for cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('zecratary_social_channel');
      channel.onmessage = (evt) => {
        if (evt.data?.type === 'CONFIG_UPDATED') {
          syncSocialConfig();
        }
      };
    } catch (_) {}

    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_social_login_updated', syncSocialConfig);
    window.addEventListener('storage', syncSocialConfig);
    window.addEventListener('focus', syncSocialConfig);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_social_login_updated', syncSocialConfig);
      window.removeEventListener('storage', syncSocialConfig);
      window.removeEventListener('focus', syncSocialConfig);
    };
  }, [syncTheme, syncSocialConfig]);

  useEffect(() => {
    initAuthStorage();
    if (getCurrentUser()) router.replace('/profile');
  }, [router]);

  // Strict boolean checks
  const isGoogleActive = socialConfig.googleEnabled === true;
  const isFacebookActive = socialConfig.facebookEnabled === true;
  const isGrokActive = socialConfig.grokEnabled === true;
  const hasAnySocial = isGoogleActive || isFacebookActive || isGrokActive;

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
    if (provider === 'google' && !isGoogleActive) return setError('Google login is disabled.');
    if (provider === 'facebook' && !isFacebookActive) return setError('Facebook login is disabled.');
    if (provider === 'grok' && !isGrokActive) return setError('Grok login is disabled.');

    setSocialModalProvider(provider);
    if (provider === 'google') {
      setSocialName('Google User');
      setSocialEmail('user@gmail.com');
    } else if (provider === 'facebook') {
      setSocialName('Facebook User');
      setSocialEmail('user@facebook.com');
    } else {
      setSocialName('Grok User');
      setSocialEmail('user@x.ai');
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

        {/* Dynamic Buttons */}
        {hasAnySocial && (
          <div className="space-y-2.5">
            {isGoogleActive && (
              <button
                type="button"
                disabled={loading || socialLoading !== null}
                onClick={() => startSocialAuth('google')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              >
                {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                Continue with Google
              </button>
            )}

            {(isFacebookActive || isGrokActive) && (
              <div className={`grid ${isFacebookActive && isGrokActive ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                {isFacebookActive && (
                  <button
                    type="button"
                    disabled={loading || socialLoading !== null}
                    onClick={() => startSocialAuth('facebook')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  >
                    {socialLoading === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <svg className="w-4 h-4 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                    Facebook
                  </button>
                )}

                {isGrokActive && (
                  <button
                    type="button"
                    disabled={loading || socialLoading !== null}
                    onClick={() => startSocialAuth('grok')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: isDayMode ? '#f8fafc' : '#0e1626', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                  >
                    {socialLoading === 'grok' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    )}
                    Grok (xAI)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {hasAnySocial && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#1e293b' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDayMode ? '#94a3b8' : '#64748b' }}>
              or register with email
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#1e293b' }} />
          </div>
        )}

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
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
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
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
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
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500">
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
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-500">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 accent-[var(--color-primary)] cursor-pointer" />
            <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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

      {/* Social Modal */}
      {socialModalProvider && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            style={{ backgroundColor: isDayMode ? '#ffffff' : '#0b0f17', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                {socialModalProvider} Registration
              </h3>
              <button type="button" onClick={() => setSocialModalProvider(null)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={completeSocialAuth} className="space-y-3 text-xs">
              <p style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                Confirm profile details for <strong>{socialModalProvider.toUpperCase()}</strong>:
              </p>
              <div>
                <label className="block font-bold mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-bold"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-mono"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <button type="button" onClick={() => setSocialModalProvider(null)} className="px-3.5 py-1.5 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-white font-extrabold rounded-xl shadow-md" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>Authorize & Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
