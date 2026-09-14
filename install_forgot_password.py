import os
import glob

# 1. Locate active App Router root
candidates = [
    'apps/web/src/app',
    'src/app',
    'apps/web/app',
    'app'
]
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

# 2. Provision /forgot-password/page.tsx
dest_dirs = [os.path.join(app_dir, 'forgot-password')]
if os.path.exists(os.path.join(app_dir, '(auth)')):
    dest_dirs.append(os.path.join(app_dir, '(auth)', 'forgot-password'))

forgot_password_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, Key, CheckCircle2, AlertCircle, ArrowLeft, Loader2,
  Lock, Eye, EyeOff, ShieldCheck, Check
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Step state: 1 = Request Token, 2 = Set New Password
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDayMode, setIsDayMode] = useState(false);

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
    if (active) {
      router.replace('/profile');
    }
  }, [router]);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const rawUsers = localStorage.getItem('zecratary_users');
        const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];
        const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

        if (!matched) {
          setError('No account found with this email address.');
          setLoading(false);
          return;
        }

        const simulatedToken = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedToken(simulatedToken);
        setTokenInput(simulatedToken); // Auto-filled for frictionless development testing

        setSuccess(`Reset code generated for ${cleanEmail}. Enter code to set a new password.`);
        setStep(2);
      } catch (err: any) {
        setError('Failed to process recovery request.');
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (tokenInput.trim() !== generatedToken.trim()) {
      setError('Invalid or expired security code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const rawUsers = localStorage.getItem('zecratary_users');
        const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];
        const cleanEmail = email.trim().toLowerCase();

        const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
        if (userIndex === -1) {
          setError('User account could not be found.');
          setLoading(false);
          return;
        }

        users[userIndex].password = newPassword;
        localStorage.setItem('zecratary_users', JSON.stringify(users));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('storage'));

        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => router.replace('/login'), 1200);
      } catch (err: any) {
        setError('Failed to update password.');
        setLoading(false);
      }
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
          <div 
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 border shadow-inner"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: 'var(--color-primary, #E05638)'
            }}
          >
            <Key className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {step === 1 ? 'Password Recovery' : 'Create New Password'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {step === 1 
              ? 'Enter your registered email to generate a secure reset token.' 
              : `Enter the code and create a new password for ${email}`}
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

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="space-y-4 text-xs" autoComplete="off">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Email Address *
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Send Reset Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs" autoComplete="off">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                6-Digit Security Code *
              </label>
              <div className="relative">
                <Key className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="123456"
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono font-bold tracking-widest text-center text-sm"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                New Password *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
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

            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Set New Password
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <Link 
            href="/login" 
            className="font-bold inline-flex items-center gap-1.5 hover:underline"
            style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
"""

for d in dest_dirs:
    os.makedirs(d, exist_ok=True)
    target_path = os.path.join(d, 'page.tsx')
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(forgot_password_code)
    print(f"✓ Provisioned recovery flow: {target_path}")

print("Account recovery installation complete!")
