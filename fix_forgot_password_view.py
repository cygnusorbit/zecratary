import os
import glob
import re

# 1. Discover App Router root and components directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)

# 2. Update Sidebar.tsx to hide sidebar on /forgot-password
sidebar_candidates = [
    os.path.join(base_dir, 'components', 'Sidebar.tsx'),
    os.path.join(base_dir, 'src', 'components', 'Sidebar.tsx'),
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_files = [p for p in set(sidebar_candidates) if os.path.exists(p)]
if not sidebar_files:
    sidebar_files = glob.glob('**/Sidebar.tsx', recursive=True)
    sidebar_files = [p for p in sidebar_files if 'node_modules' not in p and '.next' not in p]

for sp in sidebar_files:
    with open(sp, 'r', encoding='utf-8') as f:
        content = f.read()

    # Expand any existing auth route checks
    if "pathname === '/forgot-password'" not in content:
        content = re.sub(
            r"if\s*\(\s*pathname\s*===\s*['\"]/login['\"]\s*\|\|\s*pathname\s*===\s*['\"]/register['\"]\s*\)",
            "if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password')",
            content
        )
        content = re.sub(
            r"(\['/login',\s*'/register')(\])",
            r"\1, '/forgot-password'\2",
            content
        )

    with open(sp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Hid sidebar on /forgot-password in: {sp}")

# 3. Locate all /forgot-password/page.tsx files
dest_dirs = [os.path.join(app_dir, 'forgot-password')]
if os.path.exists(os.path.join(app_dir, '(auth)')):
    dest_dirs.append(os.path.join(app_dir, '(auth)', 'forgot-password'))

forgot_password_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, Key, CheckCircle2, AlertCircle, ArrowLeft, Loader2,
  Lock, Eye, EyeOff, ShieldCheck, Check, RefreshCw
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User, DEFAULT_USERS } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDayMode, setIsDayMode] = useState(false);

  // Synchronize entire viewport body background to eliminate dark borders
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

    const active = getCurrentUser();
    if (active) {
      router.replace(active.role === 'admin' ? '/admin' : '/profile');
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
  }, [router, applySavedTheme]);

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
        initAuthStorage();
        const rawUsers = localStorage.getItem('zecratary_users');
        const users: User[] = rawUsers ? JSON.parse(rawUsers) : [...DEFAULT_USERS];
        const matched = users.find(u => u.email.toLowerCase() === cleanEmail) ||
          DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);

        if (!matched) {
          setError('No account found with this email address.');
          setLoading(false);
          return;
        }

        const simulatedToken = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedToken(simulatedToken);
        setTokenInput(simulatedToken);

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
        let users: User[] = rawUsers ? JSON.parse(rawUsers) : [...DEFAULT_USERS];
        const cleanEmail = email.trim().toLowerCase();

        const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
        if (userIndex !== -1) {
          users[userIndex].password = newPassword.trim();
        } else {
          const fallback = DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);
          if (fallback) {
            users.push({ ...fallback, password: newPassword.trim() });
          }
        }

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

  const cPageBg = isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)';
  const cCardBg = isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)';
  const cInputBg = isDayMode ? '#f8fafc' : '#070b13';
  const cBorder = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)';
  const cText = isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)';
  const cSubText = isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)';
  const cLabel = isDayMode ? '#334155' : '#cbd5e1';

  return (
    <div 
      className="w-full min-h-screen flex items-center justify-center px-4 py-12 font-sans transition-colors duration-200"
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
            <Key className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: cText }}>
            {step === 1 ? 'Password Recovery' : 'Create New Password'}
          </h1>
          <p className="text-xs" style={{ color: cSubText }}>
            {step === 1 
              ? 'Enter your registered email to generate a secure reset token.' 
              : `Enter the code and create a new password for ${email}`}
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

        {success && (
          <div 
            className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in ${
              isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="space-y-4 text-xs" autoComplete="off">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: cLabel }}>
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
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono transition shadow-inner"
                  style={{
                    backgroundColor: cInputBg,
                    borderColor: cBorder,
                    color: cText
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Send Reset Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs" autoComplete="off">
            <div>
              <label className="block font-bold mb-1" style={{ color: cLabel }}>
                6-Digit Security Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="123456"
                className="w-full border rounded-xl px-3.5 py-2.5 outline-none font-mono font-bold tracking-widest text-center text-sm transition shadow-inner"
                style={{
                  backgroundColor: cInputBg,
                  borderColor: cBorder,
                  color: cText
                }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: cLabel }}>
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

            <div>
              <label className="block font-bold mb-1" style={{ color: cLabel }}>
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
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none transition shadow-inner"
                  style={{
                    backgroundColor: cInputBg,
                    borderColor: cBorder,
                    color: cText
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Set New Password
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-center font-bold text-[11px] cursor-pointer"
            >
              Re-send to a different email
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <Link 
            href="/login" 
            className="font-bold inline-flex items-center gap-1.5 hover:underline"
            style={{ color: 'var(--color-primary, #E05638)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
"""

for d in set(dest_dirs):
    os.makedirs(d, exist_ok=True)
    target_path = os.path.join(d, 'page.tsx')
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(forgot_password_code)
    print(f"✓ Provisioned full-width bright Day Mode recovery page at: {target_path}")

print("\n🚀 /forgot-password sidebar removal and bright Day Mode styling completed!")
