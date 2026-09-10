import os
import glob

# 1. Dynamically locate the active App Router directory
potential_app_roots = [
    'apps/web/src/app',
    'src/app',
    'apps/web/app',
    'app'
]

app_dir = next((c for c in potential_app_roots if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

# 2. Check for auth route groups (e.g., (auth))
dest_dirs = [os.path.join(app_dir, 'forgot-password')]
if os.path.exists(os.path.join(app_dir, '(auth)')):
    dest_dirs.append(os.path.join(app_dir, '(auth)', 'forgot-password'))

forgot_password_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, Key, CheckCircle2, AlertCircle, ArrowLeft, Loader2
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState('');
  
  // UI State
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

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);

    // Mock API latency for token generation and email dispatch
    setTimeout(() => {
      try {
        const rawUsers = localStorage.getItem('zecratary_users');
        const users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

        const matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail);

        // Standard security practice: Always show success to prevent email enumeration
        if (!matchedUser) {
            console.warn(`Recovery attempted for non-existent email: ${cleanEmail}`);
        } else {
            console.log(`Mock: Password reset token sent to ${cleanEmail}`);
        }

        setSuccess('If an account exists for that email, a password reset link has been sent. Please check your inbox.');
        setLoading(false);
      } catch (err: any) {
        setError('Failed to process recovery request. Please try again later.');
        setLoading(false);
      }
    }, 1200);
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
            <Key className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            Account Recovery
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Enter the email address associated with your account to receive a secure reset link.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-300 font-semibold flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-semibold flex items-start gap-3 shadow-sm leading-relaxed">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
            <Link 
              href="/login"
              className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4 text-xs" autoComplete="off">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Send Reset Link
            </button>
          </form>
        )}

        <div className="text-center pt-4 border-t text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
          <Link href="/login" className="font-bold flex items-center justify-center gap-1.5 hover:underline transition-all" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
    print(f"✓ Installed Step 7: functional /forgot-password page at: {target_path}")

print("Done! If your dev server returns a 404, restart it (Ctrl + C -> npm run dev).")
