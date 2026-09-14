import os
import glob

# 1. Locate App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

# 2. Provision /profile/page.tsx with Social Linking and Account Reconciliation
profile_dir = os.path.join(app_dir, 'profile')
os.makedirs(profile_dir, exist_ok=True)
profile_page_path = os.path.join(profile_dir, 'page.tsx')

profile_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Shield, Award, CheckCircle2, 
  AlertCircle, Link2, Unlink, LogOut, Sparkles, RefreshCw, Key
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { SocialProvider } from '@/lib/socialAuth';
import { useTranslation } from '@/components/LanguageProvider';

interface ExtendedUser extends User {
  linkedProviders?: SocialProvider[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isDayMode, setIsDayMode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [processingProvider, setProcessingProvider] = useState<SocialProvider | null>(null);

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    } catch (_) {}
  }, []);

  const loadActiveUser = useCallback(() => {
    initAuthStorage();
    const active = getCurrentUser() as ExtendedUser | null;
    if (!active) {
      router.replace('/login');
      return;
    }
    
    // Ensure linkedProviders array is initialized
    if (!active.linkedProviders) {
      const initialLinked: SocialProvider[] = [];
      if (active.id.startsWith('usr_google_')) initialLinked.push('google');
      if (active.id.startsWith('usr_facebook_')) initialLinked.push('facebook');
      if (active.id.startsWith('usr_apple_')) initialLinked.push('apple');
      active.linkedProviders = initialLinked;
    }
    setUser(active);
  }, [router]);

  useEffect(() => {
    syncTheme();
    loadActiveUser();

    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_auth_changed', loadActiveUser);
    window.addEventListener('storage', syncTheme);
    window.addEventListener('storage', loadActiveUser);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_auth_changed', loadActiveUser);
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('storage', loadActiveUser);
    };
  }, [syncTheme, loadActiveUser]);

  const persistUserUpdate = (updatedUser: ExtendedUser) => {
    setUser(updatedUser);
    setCurrentUser(updatedUser);

    try {
      const rawUsers = localStorage.getItem('zecratary_users');
      const users: ExtendedUser[] = rawUsers ? JSON.parse(rawUsers) : [];
      const userIndex = users.findIndex(u => u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase());

      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
      } else {
        users.unshift(updatedUser);
      }
      localStorage.setItem('zecratary_users', JSON.stringify(users));

      window.dispatchEvent(new Event('zecratary_users_updated'));
      window.dispatchEvent(new Event('zecratary_auth_changed'));
      window.dispatchEvent(new Event('storage'));
    } catch (_) {}
  };

  const handleToggleLink = (provider: SocialProvider) => {
    if (!user) return;
    setProcessingProvider(provider);
    setStatusMsg(null);

    const isLinked = user.linkedProviders?.includes(provider);

    setTimeout(() => {
      let updatedLinked = [...(user.linkedProviders || [])];

      if (isLinked) {
        // Prevent unlinking if no alternative authentication is available
        if (updatedLinked.length === 1 && !user.password) {
          setStatusMsg({
            text: 'Cannot unlink your only authentication method. Add a password or connect another provider first.',
            success: false
          });
          setProcessingProvider(null);
          return;
        }
        updatedLinked = updatedLinked.filter(p => p !== provider);
        setStatusMsg({ text: `Successfully unlinked ${provider.toUpperCase()} account.`, success: true });
      } else {
        updatedLinked.push(provider);
        setStatusMsg({ text: `Successfully connected and linked ${provider.toUpperCase()}!`, success: true });
      }

      const updatedUser: ExtendedUser = {
        ...user,
        linkedProviders: updatedLinked
      };

      persistUserUpdate(updatedUser);
      setProcessingProvider(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }, 500);
  };

  const handleLogout = () => {
    logoutUser();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <div 
      className="max-w-4xl mx-auto space-y-6 pb-20 px-4 pt-6 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* Header Profile Card */}
      <div 
        className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6"
          style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner font-black text-2xl uppercase"
              style={{
                backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: 'var(--color-primary, #E05638)'
              }}
            >
              {user.name.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {user.name}
                </h1>
                <span 
                  className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)', color: '#ffffff' }}
                >
                  {user.subscriptionTier || 'Taster'}
                </span>
              </div>
              <p className="text-xs font-mono" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(user.role === 'admin' || user.email.includes('admin')) && (
              <Link
                href="/admin/social-login-setting"
                className="px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#0e1626',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#cbd5e1'
                }}
              >
                <Key className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                Admin Settings
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-red-400 hover:text-red-300 border-red-900/40 hover:bg-red-950/20 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {statusMsg && (
          <div 
            className={`p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in ${
              statusMsg.success
                ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}
          >
            {statusMsg.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Account Details Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div 
            className="p-4 border rounded-2xl space-y-1"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            <div className="flex items-center gap-1.5 font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <Shield className="h-3.5 w-3.5 text-blue-400" /> Access Role
            </div>
            <div className="font-extrabold text-sm capitalize" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {user.role}
            </div>
          </div>

          <div 
            className="p-4 border rounded-2xl space-y-1"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            <div className="flex items-center gap-1.5 font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <Award className="h-3.5 w-3.5 text-amber-400" /> Subscription Plan
            </div>
            <div className="font-extrabold text-sm capitalize" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {user.subscriptionPlan || 'Taster'}
            </div>
          </div>

          <div 
            className="p-4 border rounded-2xl space-y-1"
            style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            <div className="flex items-center gap-1.5 font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Registered
            </div>
            <div className="font-extrabold text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
            </div>
          </div>
        </div>

        {/* Linked Social Accounts Section */}
        <div className="space-y-3 pt-2">
          <div className="space-y-0.5">
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              Connected Social Accounts
            </h2>
            <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Link your external identities to enable seamless one-click sign in across Google, Facebook, and Apple.
            </p>
          </div>

          <div className="space-y-3">
            {/* Google Identity */}
            <div 
              className="p-4 border rounded-2xl flex items-center justify-between transition"
              style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <div>
                  <div className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Google Account</div>
                  <div className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {user.linkedProviders?.includes('google') ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={processingProvider !== null}
                onClick={() => handleToggleLink('google')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                  user.linkedProviders?.includes('google')
                    ? 'border border-red-800/60 text-red-400 hover:bg-red-950/20'
                    : 'text-white shadow-md'
                }`}
                style={{
                  backgroundColor: user.linkedProviders?.includes('google') ? 'transparent' : 'var(--color-primary, #E05638)'
                }}
              >
                {processingProvider === 'google' ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : user.linkedProviders?.includes('google') ? (
                  <>
                    <Unlink className="h-3 w-3" /> Unlink
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" /> Link Google
                  </>
                )}
              </button>
            </div>

            {/* Facebook Identity */}
            <div 
              className="p-4 border rounded-2xl flex items-center justify-between transition"
              style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
                <div>
                  <div className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Facebook Account</div>
                  <div className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {user.linkedProviders?.includes('facebook') ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={processingProvider !== null}
                onClick={() => handleToggleLink('facebook')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                  user.linkedProviders?.includes('facebook')
                    ? 'border border-red-800/60 text-red-400 hover:bg-red-950/20'
                    : 'text-white shadow-md'
                }`}
                style={{
                  backgroundColor: user.linkedProviders?.includes('facebook') ? 'transparent' : 'var(--color-primary, #E05638)'
                }}
              >
                {processingProvider === 'facebook' ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : user.linkedProviders?.includes('facebook') ? (
                  <>
                    <Unlink className="h-3 w-3" /> Unlink
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" /> Link Facebook
                  </>
                )}
              </button>
            </div>

            {/* Apple Identity */}
            <div 
              className="p-4 border rounded-2xl flex items-center justify-between transition"
              style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.93 2.73 1.02.08 2.05-.48 2.66-1.23z" />
                </svg>
                <div>
                  <div className="font-bold text-xs" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Apple Account</div>
                  <div className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {user.linkedProviders?.includes('apple') ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={processingProvider !== null}
                onClick={() => handleToggleLink('apple')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                  user.linkedProviders?.includes('apple')
                    ? 'border border-red-800/60 text-red-400 hover:bg-red-950/20'
                    : 'text-white shadow-md'
                }`}
                style={{
                  backgroundColor: user.linkedProviders?.includes('apple') ? 'transparent' : 'var(--color-primary, #E05638)'
                }}
              >
                {processingProvider === 'apple' ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : user.linkedProviders?.includes('apple') ? (
                  <>
                    <Unlink className="h-3 w-3" /> Unlink
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" /> Link Apple
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open(profile_page_path, 'w', encoding='utf-8') as f:
    f.write(profile_code)

print(f"✓ Provisioned Profile Dashboard with Account Linking: {profile_page_path}")
print("Step 5 successfully installed!")
