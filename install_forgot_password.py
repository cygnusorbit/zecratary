import os
import glob

# 1. Discover active Next.js App Router root
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

forgot_dir = os.path.join(app_dir, 'forgot-password')
os.makedirs(forgot_dir, exist_ok=True)
forgot_page_path = os.path.join(forgot_dir, 'page.tsx')

forgot_page_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, KeyRound, Lock, ArrowLeft, ArrowRight, CheckCircle2, 
  AlertCircle, Sparkles, Eye, EyeOff, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { initAuthStorage, DEFAULT_USERS, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncTheme();
    initAuthStorage();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [syncTheme]);

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatusMsg({ text: 'Please enter your registered email address.', success: false });
      return;
    }

    setLoading(true);

    setTimeout(() => {
      initAuthStorage();
      let users: User[] = [];
      try {
        const raw = localStorage.getItem('zecratary_users');
        users = raw ? JSON.parse(raw) : [...DEFAULT_USERS];
      } catch (_) {
        users = [...DEFAULT_USERS];
      }

      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail) ||
        DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);

      if (!existingUser) {
        setStatusMsg({ text: 'No account found matching that email address.', success: false });
        setLoading(false);
        return;
      }

      // Generate a simulated 6-digit reset token
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setExpectedCode(code);
      setStep(2);
      setLoading(false);
      setStatusMsg({ 
        text: `Verification code dispatched! For local testing, your reset code is: ${code}`, 
        success: true 
      });
    }, 600);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (verificationCode.trim() !== expectedCode) {
      setStatusMsg({ text: 'Invalid verification code. Please check and try again.', success: false });
      return;
    }

    if (newPassword.length < 6) {
      setStatusMsg({ text: 'Password must be at least 6 characters long.', success: false });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ text: 'Passwords do not match.', success: false });
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const raw = localStorage.getItem('zecratary_users');
        let users: User[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];

        let index = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
        if (index !== -1) {
          users[index].password = newPassword.trim();
        } else {
          const fallback = DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);
          if (fallback) {
            users.push({ ...fallback, password: newPassword.trim() });
          }
        }

        localStorage.setItem('zecratary_users', JSON.stringify(users));
        window.dispatchEvent(new Event('zecratary_users_updated'));
        window.dispatchEvent(new Event('storage'));

        setStatusMsg({ text: 'Password successfully updated! Redirecting to sign in...', success: true });
        setTimeout(() => router.replace('/login'), 1200);
      } catch (err: any) {
        setStatusMsg({ text: err.message || 'Failed to update password.', success: false });
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
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {step === 1 ? 'Reset Password' : 'Enter Verification Code'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {step === 1 
              ? 'Enter your account email to receive a recovery code.' 
              : `Enter the 6-digit code sent to ${email} and choose a new password.`}
          </p>
        </div>

        {statusMsg && (
          <div 
            className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-start gap-2 shadow-md animate-in fade-in ${
              statusMsg.success
                ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}
          >
            {statusMsg.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />}
            <span className="leading-tight">{statusMsg.text}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono transition shadow-inner"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Send Recovery Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                6-Digit Verification Code
              </label>
              <input
                type="text" required maxLength={6} value={verificationCode} onChange={e => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full border rounded-xl px-3.5 py-2.5 outline-none font-mono text-center tracking-widest text-base font-bold"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full border rounded-xl pl-10 pr-10 py-2.5 outline-none transition"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 outline-none transition"
                  style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Update Password
            </button>

            <button
              type="button" onClick={() => setStep(1)}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-center font-bold text-[11px] cursor-pointer"
            >
              Re-send to a different email
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <Link href="/login" className="inline-flex items-center gap-1 font-bold hover:underline" style={{ color: 'var(--color-primary, #E05638)' }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
"""

with open(forgot_page_path, 'w', encoding='utf-8') as f:
    f.write(forgot_page_code)

print(f"✓ Installed Account Recovery page at: {forgot_page_path}")
print("\n🚀 /forgot-password route installed successfully!")
