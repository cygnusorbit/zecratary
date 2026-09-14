import os
import glob
import re

# 1. Discover App Router root and lib directory
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

# 2. Patch globals.css with complete Day Mode overrides and auth route frame elimination
css_candidates = [
    os.path.join(app_dir, 'globals.css'),
    os.path.join(base_dir, 'src', 'app', 'globals.css'),
    os.path.join(base_dir, 'styles', 'globals.css'),
    'apps/web/src/app/globals.css',
    'src/app/globals.css',
    'styles/globals.css'
]
css_files = [p for p in set(css_candidates) if os.path.exists(p)]
if not css_files:
    css_files = glob.glob('**/globals.css', recursive=True)
    css_files = [p for p in css_files if 'node_modules' not in p and '.next' not in p]

day_mode_css_rules = """
/* --- Day Mode Universal Background & Border Reset --- */
:root.light, html.light, body.light {
  --color-bg: #f8fafc !important;
  --color-bg-dark: #f8fafc !important;
  --color-card: #ffffff !important;
  --color-card-dark: #ffffff !important;
  --color-inner: #f1f5f9 !important;
  --color-inner-dark: #f1f5f9 !important;
  --color-border: #e2e8f0 !important;
  --color-border-dark: #e2e8f0 !important;
  --border: #e2e8f0 !important;
  --color-text: #0f172a !important;
  --color-text-secondary: #64748b !important;
  background-color: #f8fafc !important;
  color: #0f172a !important;
}

html.light,
html.light body,
html.light #__next,
html.light main,
html.light [class*="bg-[#070b13]"],
html.light [class*="bg-[#0b0f17]"],
html.light [class*="bg-[#0B101D]"],
html.light [class*="bg-[#0e1626]"],
html.light [class*="bg-[#141b2d]"],
html.light [class*="bg-slate-950"],
html.light [class*="bg-slate-900"],
html.light [class*="bg-black"] {
  background-color: #f8fafc !important;
}

html.light [class*="border-[#1e293b]"],
html.light [class*="border-[#0e1626]"],
html.light [class*="border-slate-800"],
html.light [class*="border-slate-900"] {
  border-color: #e2e8f0 !important;
}

/* Eliminate layout wrapper borders, paddings, and rounded frames on Auth pages */
body:has(#login-page-root),
body:has(#register-page-root),
body:has(#forgot-password-page-root) {
  padding: 0 !important;
  margin: 0 !important;
  background-color: var(--color-bg, #070b13) !important;
}

body:has(#login-page-root) main,
body:has(#register-page-root) main,
body:has(#forgot-password-page-root) main {
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  background-color: transparent !important;
}

body:has(#login-page-root) > div,
body:has(#register-page-root) > div,
body:has(#forgot-password-page-root) > div,
body:has(#login-page-root) [class*="h-screen"],
body:has(#register-page-root) [class*="h-screen"] {
  padding: 0 !important;
  gap: 0 !important;
  border: none !important;
}
"""

for cp in set(css_files):
    with open(cp, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'login-page-root' not in content:
        content = content.rstrip() + "\n\n" + day_mode_css_rules + "\n"
        with open(cp, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Injected universal layout reset into: {cp}")

# 3. Patch layout.tsx files to eliminate hardcoded dark background and border utilities
layout_files = glob.glob(f'{app_dir}/**/layout.tsx', recursive=True)
for lp in layout_files:
    if 'node_modules' in lp or '.next' in lp:
        continue

    with open(lp, 'r', encoding='utf-8') as f:
        l_code = f.read()

    original = l_code
    l_code = l_code.replace('bg-[#070b13]', 'bg-[var(--color-bg,#070b13)]')
    l_code = l_code.replace('bg-[#0b0f17]', 'bg-[var(--color-bg,#0b0f17)]')
    l_code = l_code.replace('border-[#1e293b]', 'border-[var(--color-border,#1e293b)]')
    l_code = l_code.replace('border-slate-800', 'border-[var(--color-border,#1e293b)]')

    if l_code != original:
        with open(lp, 'w', encoding='utf-8') as f:
            f.write(l_code)
        print(f"✓ Sanitized background and border classes in layout: {lp}")

# 4. Patch login/page.tsx with root ID and runtime DOM cleanup for parent wrappers
login_files = glob.glob(f'{app_dir}/**/login/page.tsx', recursive=True)
login_files = [p for p in login_files if 'node_modules' not in p and '.next' not in p]

login_code = """'use client';

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

      // Neutralize parent layout padding and borders in the DOM while on login view
      if (typeof document !== 'undefined') {
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.style.border = 'none';
          mainEl.style.borderRadius = '0px';
          mainEl.style.padding = '0px';
          mainEl.style.margin = '0px';
          mainEl.style.backgroundColor = isDay ? '#f8fafc' : 'var(--color-bg, #070b13)';
        }
        const parentDiv = mainEl?.parentElement;
        if (parentDiv) {
          parentDiv.style.backgroundColor = isDay ? '#f8fafc' : 'var(--color-bg, #070b13)';
          parentDiv.style.padding = '0px';
          parentDiv.style.gap = '0px';
          parentDiv.style.border = 'none';
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    applySavedTheme();
    initAuthStorage();

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
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.style.border = '';
          mainEl.style.borderRadius = '';
          mainEl.style.padding = '';
          mainEl.style.margin = '';
          mainEl.style.backgroundColor = '';
        }
        const parentDiv = mainEl?.parentElement;
        if (parentDiv) {
          parentDiv.style.backgroundColor = '';
          parentDiv.style.padding = '';
          parentDiv.style.gap = '';
          parentDiv.style.border = '';
        }
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

  const cPageBg = isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)';
  const cCardBg = isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)';
  const cInputBg = isDayMode ? '#f8fafc' : '#070b13';
  const cBorder = isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)';
  const cText = isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)';
  const cSubText = isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)';
  const cLabel = isDayMode ? '#334155' : '#cbd5e1';

  return (
    <div 
      id="login-page-root"
      className="w-full min-h-screen flex items-center justify-center px-4 py-12 font-sans transition-colors duration-200"
      style={{ backgroundColor: cPageBg, color: cText }}
    >
      <div 
        className="w-full max-w-md border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: cCardBg,
          borderColor: cBorder
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

        <div className="text-center pt-2 border-t text-xs" style={{ borderColor: cBorder }}>
          <span style={{ color: cSubText }}>Don&apos;t have an account? </span>
          <Link href="/register" className="font-bold hover:underline" style={{ color: 'var(--color-primary, #E05638)' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
"""

for lp in set(login_files):
    with open(lp, 'w', encoding='utf-8') as f:
        f.write(login_code)
    print(f"✓ Provisioned borderless Day Mode login view in: {lp}")

print("\n🚀 Outer dark layout border and padding successfully eliminated!")
