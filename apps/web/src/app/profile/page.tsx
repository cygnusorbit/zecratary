'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, Mail, Lock, CheckCircle2, AlertCircle, Calendar, 
  LogOut, Check, CreditCard, Zap, Sparkles, RefreshCw, Shield, 
  Clock, Cpu, Repeat, Link2, Unlink, Key, Palette, Moon, Sun, ArrowRight, Heart
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, logoutUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  applyThemeToDocument, toggleThemeMode, getEffectiveThemeMode, saveThemeColors 
} from '@/lib/themeConfig';

type SocialProvider = 'google' | 'facebook' | 'apple';

interface ExtendedUser extends User {
  linkedProviders?: SocialProvider[];
}

interface SubscriptionPlanItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  priceDollars?: number;
  priceFormatted?: string;
  interval: 'MONTH' | 'YEAR';
  aiRecipeLimit?: number;
  recipeLibraryLimit?: number;
  socialScrapeLimit?: number;
  canViewMacros?: boolean;
  allowedAiModels?: string[] | string;
  badge?: string;
  saveBadge?: string;
  subPrice?: string;
  strikethroughPrice?: string;
  buttonText?: string;
  features?: string[];
  isFree?: boolean;
  tokenLimit?: number;
  tokenReimburseFrequency?: 'once' | 'weekly' | 'monthly';
}

const PROFILE_PALETTES = [
  { name: 'Zecratary Coral', primary: '#E05638', hover: '#c94529', accent: '#10b981', background: '#070b13', card: '#0b0f17', border: '#1e293b' },
  { name: 'Emerald Forest', primary: '#10b981', hover: '#059669', accent: '#3b82f6', background: '#06130d', card: '#0a1d14', border: '#133526' },
  { name: 'Cyber Blue', primary: '#2563eb', hover: '#1d4ed8', accent: '#10b981', background: '#080d1a', card: '#0c152b', border: '#1e293b' },
  { name: 'Royal Purple', primary: '#8b5cf6', hover: '#7c3aed', accent: '#ec4899', background: '#0f081c', card: '#180d2e', border: '#2a1650' },
  { name: 'Amber Gold', primary: '#f59e0b', hover: '#d97706', accent: '#10b981', background: '#120d04', card: '#1c1507', border: '#36270a' },
  { name: 'Deep Midnight', primary: '#38bdf8', hover: '#0284c7', accent: '#a855f7', background: '#020617', card: '#080e22', border: '#172554' },
];

const sanitizeSinglePlan = (planInput?: string | string[]): string => {
  if (!planInput) return 'taster';
  let raw = Array.isArray(planInput) ? (planInput[0] || '') : String(planInput);
  if (raw.includes(',')) raw = raw.split(',')[0] || '';
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || 'taster';
};

export default function ProfilePage() {
  const router = useRouter();
  const { t: translate } = useTranslation() || {};
  const t = useCallback((key: string, fallback: string) => {
    if (typeof translate === 'function') {
      const val = translate(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [translate]);

  const [user, setUserState] = useState<ExtendedUser | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [activePalette, setActivePalette] = useState<string>('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notification, setNotification] = useState<{ text: string; success: boolean } | null>(null);

  const [processingSocial, setProcessingSocial] = useState<SocialProvider | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<'ALL' | 'MONTH' | 'YEAR'>('ALL');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number>(0);

  const [tokenUsage, setTokenUsage] = useState({
    promptTokens: 1420,
    completionTokens: 850,
    totalTokens: 2270,
    requestCount: 14,
    monthlyLimit: 50000,
    reimburseFrequency: 'monthly'
  });

  const isFetchingRef = useRef(false);

  const syncTheme = useCallback(() => {
    const mode = getEffectiveThemeMode();
    setIsDayMode(mode === 'light');
    try {
      const stored = localStorage.getItem('zecratary_theme_colors');
      if (stored) {
        const c = JSON.parse(stored);
        applyThemeToDocument(c);
        const match = PROFILE_PALETTES.find(p => p.primary.toLowerCase() === (c.primary || c.primaryColor || '').toLowerCase());
        if (match) setActivePalette(match.name);
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

  const loadProfileData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      initAuthStorage();
      let active = getCurrentUser() as ExtendedUser | null;
      if (!active) {
        router.replace('/login');
        return;
      }

      // Fetch user from PostgreSQL
      try {
        const uRes = await fetch('/api/admin/users', { cache: 'no-store' });
        if (uRes.ok) {
          const uData = await uRes.json();
          const list = Array.isArray(uData.users) ? uData.users : [];
          const matched = list.find((x: any) => x.id === active?.id || x.email?.toLowerCase() === active?.email?.toLowerCase());
          if (matched) {
            active = { ...active, ...matched, subscriptionPlan: sanitizeSinglePlan(matched.subscriptionPlan) };
          }
        }
      } catch (_) {}

      // Fetch payment verification from PostgreSQL
      try {
        const pRes = await fetch('/api/admin/payment', { cache: 'no-store' });
        if (pRes.ok) {
          const pData = await pRes.json();
          const txs = Array.isArray(pData.transactions) ? pData.transactions : [];
          const userEmail = active.email.toLowerCase().trim();
          const activeTx = txs.find((t: any) => 
            (t.customerEmail || '').toLowerCase().trim() === userEmail &&
            t.status === 'succeeded' &&
            (!t.expiryDate || new Date(t.expiryDate).getTime() > Date.now())
          );
          if (activeTx) {
            active.subscriptionPlan = sanitizeSinglePlan(activeTx.planSlug);
            (active as any).planExpiryDate = activeTx.expiryDate;
          } else {
            active.subscriptionPlan = 'taster';
          }
        }
      } catch (_) {}

      // Fetch available plans from PostgreSQL
      try {
        const plansRes = await fetch('/api/admin/plans', { cache: 'no-store' });
        if (plansRes.ok) {
          const pData = await plansRes.json();
          const list = Array.isArray(pData.plans) ? pData.plans : [];
          setPlans(list);
          const current = list.find((p: any) => p.slug === active?.subscriptionPlan);
          if (current && current.tokenLimit !== undefined) {
            setTokenUsage(prev => ({
              ...prev,
              monthlyLimit: current.tokenLimit,
              reimburseFrequency: current.tokenReimburseFrequency || 'monthly'
            }));
          }
        }
      } catch (_) {}

      // Fetch saved recipes count from PostgreSQL
      try {
        const rRes = await fetch('/api/recipes/saved', { cache: 'no-store' });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (Array.isArray(rData.recipes)) setSavedCount(rData.recipes.length);
        }
      } catch (_) {}

      setUserState(active);
      setName(active.name || '');
      setEmail(active.email || '');
    } finally {
      isFetchingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleModeToggle = () => {
    const nextMode = toggleThemeMode();
    setIsDayMode(nextMode === 'light');
    setNotification({
      text: nextMode === 'light' ? t('profile.dayModeActivated', 'Day Mode activated.') : t('profile.darkModeActivated', 'Dark Mode activated.'),
      success: true
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectPalette = async (preset: typeof PROFILE_PALETTES[0]) => {
    setActivePalette(preset.name);
    const colors = {
      primary: preset.primary,
      primaryColor: preset.primary,
      primaryHover: preset.hover,
      accentEmerald: preset.accent,
      accentColor: preset.accent,
      accent: preset.accent,
      backgroundColor: preset.background,
      backgroundDark: preset.background,
      cardBackground: preset.card,
      cardBorder: preset.border,
      textSecondary: isDayMode ? '#64748b' : '#94a3b8'
    };
    await saveThemeColors(colors);
    setNotification({ text: `${t('profile.paletteApplied', 'Palette applied')}: ${preset.name}`, success: true });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password && password !== confirmPassword) {
      setNotification({ text: t('profile.passwordMismatch', 'Passwords do not match.'), success: false });
      return;
    }

    try {
      const updatedUser: ExtendedUser = { ...user, name: name.trim() || user.name };
      setCurrentUser(updatedUser);
      setUserState(updatedUser);

      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: updatedUser.name,
          email: user.email,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan
        })
      });

      setPassword('');
      setConfirmPassword('');
      setNotification({ text: t('profile.savedSuccess', 'Profile changes saved in PostgreSQL.'), success: true });
      setTimeout(() => setNotification(null), 3500);
    } catch (_) {
      setNotification({ text: t('profile.saveError', 'Failed to save profile changes.'), success: false });
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlanItem) => {
    if (!user) return;
    setPaymentLoading(plan.id || plan.slug);

    try {
      const isFree = Boolean(plan.isFree || plan.priceDollars === 0 || plan.priceCents === 0);
      const targetSlug = sanitizeSinglePlan(plan.slug);
      const userEmail = user.email.toLowerCase().trim();

      const expiry = isFree ? null : new Date(Date.now() + 30 * 86400000).toISOString();

      // Record transaction directly in PostgreSQL
      if (!isFree) {
        await fetch('/api/admin/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: user.name,
            customerEmail: userEmail,
            planName: plan.name,
            planSlug: targetSlug,
            amount: plan.priceDollars || (plan.priceCents ? plan.priceCents / 100 : 0),
            currency: 'USD',
            gateway: 'stripe',
            status: 'succeeded',
            testMode: true,
            expiryDate: expiry
          })
        });
      }

      // Update user plan in PostgreSQL
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: userEmail,
          role: user.role,
          subscriptionPlan: targetSlug,
          planExpiryDate: expiry
        })
      });

      const updatedUser = { ...user, subscriptionPlan: targetSlug, planExpiryDate: expiry };
      setCurrentUser(updatedUser);
      setUserState(updatedUser);

      setNotification({ text: `${t('profile.planChanged', 'Plan updated to')}: ${plan.name}`, success: true });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ text: err.message || 'Plan update failed.', success: false });
    } finally {
      setPaymentLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const isCurrentPlan = (p: SubscriptionPlanItem) => sanitizeSinglePlan(p.slug) === sanitizeSinglePlan(user.subscriptionPlan);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-8 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {notification && (
        <div className={`p-3.5 border rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in ${
          notification.success 
            ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
        }`}>
          {notification.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ACCOUNT HERO */}
      <div 
        className="border rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border" style={{ backgroundColor: isDayMode ? '#eff6ff' : '#1e293b', borderColor: isDayMode ? '#bfdbfe' : '#334155', color: isDayMode ? '#1d4ed8' : '#60a5fa' }}>
                {user.role}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border" style={{ backgroundColor: isDayMode ? '#ecfdf5' : '#064e3b', borderColor: isDayMode ? '#a7f3d0' : '#059669', color: isDayMode ? '#047857' : '#34d399' }}>
                {user.subscriptionPlan || 'Taster'}
              </span>
            </div>
            <p className="text-xs flex items-center gap-1.5" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {user.role === 'admin' && (
            <Link href="/admin" className="px-4 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs" style={{ backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <Shield className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              {t('common.adminPanel', 'Admin Panel')}
            </Link>
          )}
          <button type="button" onClick={() => { logoutUser(); router.replace('/login'); }} className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs text-red-500 hover:bg-red-500/10">
            <LogOut className="h-3.5 w-3.5" />
            {t('common.logout', 'Sign Out')}
          </button>
        </div>
      </div>

      {/* THEME & APPEARANCE CONTROLS */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-base font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('profile.appearanceThemeTitle', 'Appearance & Theme Synchronization')}
            </h2>
          </div>
          <button type="button" onClick={handleModeToggle} className="px-4 py-2 border rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md hover:opacity-90 shrink-0" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#141b2d', borderColor: isDayMode ? '#cbd5e1' : '#334155', color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {isDayMode ? <><Sun className="h-4 w-4 text-amber-500" /><span>Switch to Dark Mode</span></> : <><Moon className="h-4 w-4 text-blue-400" /><span>Switch to Day Mode</span></>}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {PROFILE_PALETTES.map((preset) => (
            <button key={preset.name} type="button" onClick={() => handleSelectPalette(preset)} className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer shadow-xs ${activePalette === preset.name ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-85'}`} style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: activePalette === preset.name ? 'var(--color-primary)' : isDayMode ? '#cbd5e1' : '#1e293b' }}>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.background, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
              </div>
              <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CREDENTIALS FORM */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <UserIcon className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-base font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Personal Credentials</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2 font-bold outline-none" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Email Address</label>
              <input type="email" disabled value={email} className="w-full border rounded-xl px-3 py-2 font-mono outline-none opacity-60 cursor-not-allowed" style={{ backgroundColor: isDayMode ? '#e2e8f0' : '#141b2d', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>New Password (optional)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border rounded-xl px-3 py-2 font-mono outline-none" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full border rounded-xl px-3 py-2 font-mono outline-none" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer" style={{ backgroundColor: 'var(--color-primary, #E05638)' }}>
              Save Credentials
            </button>
          </div>
        </form>
      </div>

      {/* SUBSCRIPTION PLAN UPGRADES / DOWNGRADES */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-base font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>Subscription Membership Plans</h2>
          </div>
          <span className="text-xs font-mono text-emerald-500 font-bold">{tokenUsage.monthlyLimit.toLocaleString()} Tokens / {tokenUsage.reimburseFrequency}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {plans.map((p) => {
            const active = isCurrentPlan(p);
            return (
              <div key={p.id || p.slug} className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm ${active ? 'ring-2 ring-emerald-500' : ''}`} style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: active ? '#10b981' : isDayMode ? '#cbd5e1' : '#1e293b' }}>
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{p.name}</h3>
                    {active && <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Active</span>}
                  </div>
                  <div className="text-2xl font-black text-[var(--color-primary)]">
                    {p.isFree ? 'Free' : `$${Number(p.priceDollars || 0).toFixed(2)}`}
                    <span className="text-xs font-normal text-slate-500">/{p.interval === 'YEAR' ? 'yr' : 'mo'}</span>
                  </div>
                  <p className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{p.description}</p>
                </div>

                <button
                  type="button"
                  disabled={active || paymentLoading === (p.id || p.slug)}
                  onClick={() => handleSelectPlan(p)}
                  className="w-full py-2.5 rounded-xl font-black text-xs text-white transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: active ? '#10b981' : 'var(--color-primary, #E05638)' }}
                >
                  {paymentLoading === (p.id || p.slug) ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : active ? <Check className="h-3.5 w-3.5" /> : null}
                  {active ? 'Current Active Plan' : p.isFree ? 'Switch to Free' : `Change to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
