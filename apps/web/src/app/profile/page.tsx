'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Award, 
  Calendar, 
  Moon, 
  Sun, 
  Palette, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  LogOut, 
  ArrowRight, 
  Sparkles, 
  ChefHat, 
  BookOpen, 
  Heart,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { getCurrentUser, logout, setCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  applyThemeToDocument, 
  toggleThemeMode, 
  getEffectiveThemeMode, 
  saveThemeColors 
} from '@/lib/themeConfig';

const PROFILE_PALETTES = [
  { 
    name: 'Zecratary Coral', 
    primary: '#E05638', 
    hover: '#c94529', 
    accent: '#10b981', 
    background: '#070b13', 
    card: '#0b0f17', 
    border: '#1e293b' 
  },
  { 
    name: 'Emerald Forest', 
    primary: '#10b981', 
    hover: '#059669', 
    accent: '#3b82f6', 
    background: '#06130d', 
    card: '#0a1d14', 
    border: '#133526' 
  },
  { 
    name: 'Cyber Blue', 
    primary: '#2563eb', 
    hover: '#1d4ed8', 
    accent: '#10b981', 
    background: '#080d1a', 
    card: '#0c152b', 
    border: '#1e293b' 
  },
  { 
    name: 'Royal Purple', 
    primary: '#8b5cf6', 
    hover: '#7c3aed', 
    accent: '#ec4899', 
    background: '#0f081c', 
    card: '#180d2e', 
    border: '#2a1650' 
  },
  { 
    name: 'Amber Gold', 
    primary: '#f59e0b', 
    hover: '#d97706', 
    accent: '#10b981', 
    background: '#120d04', 
    card: '#1c1507', 
    border: '#36270a' 
  },
  { 
    name: 'Deep Midnight', 
    primary: '#38bdf8', 
    hover: '#0284c7', 
    accent: '#a855f7', 
    background: '#020617', 
    card: '#080e22', 
    border: '#172554' 
  },
];

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

  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [activePalette, setActivePalette] = useState<string>('');
  const [savedCount, setSavedCount] = useState<number>(0);
  const [notification, setNotification] = useState<{ text: string; success: boolean } | null>(null);

  // Edit Profile Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [dietPreference, setDietPreference] = useState<string>('none');
  const [cookingLevel, setCookingLevel] = useState<string>('intermediate');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  const syncTheme = useCallback(() => {
    try {
      const mode = getEffectiveThemeMode();
      const day = mode === 'light';
      setIsDayMode(day);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        applyThemeToDocument(c);
        const match = PROFILE_PALETTES.find(
          p => p.primary.toLowerCase() === (c.primary || c.primaryColor || '').toLowerCase()
        );
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

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    if (!active) {
      router.replace('/login');
      return;
    }
    setUser(active);
    setDisplayName(active.name || '');

    fetch('/api/saved-recipes', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.recipes && Array.isArray(data.recipes)) {
          setSavedCount(data.recipes.length);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleModeToggle = () => {
    const nextMode = toggleThemeMode();
    setIsDayMode(nextMode === 'light');
    setNotification({
      text: nextMode === 'light' 
        ? t('profile.dayModeActivated', 'Day Mode activated.') 
        : t('profile.darkModeActivated', 'Dark Mode activated.'),
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
    setNotification({
      text: `${t('profile.paletteApplied', 'Palette applied')}: ${preset.name}`,
      success: true
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);

    try {
      const updatedUser: User = {
        ...user,
        name: displayName.trim() || user.name
      };
      setCurrentUser(updatedUser);
      setUser(updatedUser);

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

      setNotification({ text: t('profile.savedSuccess', 'Profile details updated successfully.'), success: true });
      setTimeout(() => setNotification(null), 3500);
    } catch (_) {
      setNotification({ text: t('profile.saveError', 'Failed to save profile changes.'), success: false });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setNotification({ text: t('profile.passwordMismatch', 'New passwords do not match.'), success: false });
      return;
    }
    if (newPassword.length < 6) {
      setNotification({ text: t('profile.passwordLength', 'Password must be at least 6 characters.'), success: false });
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      newPassword && setNewPassword('');
      confirmPassword && setConfirmPassword('');
      setNotification({ text: t('profile.passwordSuccess', 'Password updated successfully.'), success: true });
      setTimeout(() => setNotification(null), 3500);
    }, 600);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const roleLabel = user.role === 'admin' ? t('common.administrator', 'Administrator') : t('common.member', 'Member');
  const planLabel = (user.subscriptionPlan || 'taster').toUpperCase();

  return (
    <div 
      className="max-w-5xl mx-auto space-y-8 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* NOTIFICATION BANNER */}
      {notification && (
        <div 
          className={`p-3.5 border rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in ${
            notification.success
              ? isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : isDayMode ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {notification.success ? (
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
          ) : (
            <AlertCircle className={`h-4 w-4 shrink-0 ${isDayMode ? 'text-red-600' : 'text-red-400'}`} />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* HEADER WITH ACCOUNT HERO */}
      <div 
        className="border rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                {user.name}
              </h1>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border"
                style={{ 
                  backgroundColor: isDayMode ? '#eff6ff' : '#1e293b', 
                  borderColor: isDayMode ? '#bfdbfe' : '#334155',
                  color: isDayMode ? '#1d4ed8' : '#60a5fa'
                }}
              >
                {roleLabel}
              </span>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border"
                style={{ 
                  backgroundColor: isDayMode ? '#ecfdf5' : '#064e3b', 
                  borderColor: isDayMode ? '#a7f3d0' : '#059669',
                  color: isDayMode ? '#047857' : '#34d399'
                }}
              >
                {planLabel} {t('common.plan', 'Plan')}
              </span>
            </div>
            <p className="text-xs flex items-center gap-1.5" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
          </div>
        </div>

        {/* TOP QUICK ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {user.role === 'admin' && (
            <Link
              href="/admin"
              className="px-4 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 hover:opacity-80 shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              <Shield className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              {t('common.adminPanel', 'Admin Panel')}
            </Link>
          )}

          <Link
            href="/package"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('profile.upgradePlan', 'Upgrade Plan')}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#fef2f2' : '#2a1215',
              borderColor: isDayMode ? '#fecaca' : '#5c1d24',
              color: isDayMode ? '#dc2626' : '#f87171'
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('common.logout', 'Sign Out')}
          </button>
        </div>
      </div>

      {/* METRIC / USAGE TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div 
          className="border rounded-2xl p-4 shadow-md space-y-1 transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <span className="font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            <Heart className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            {t('profile.savedRecipes', 'Saved Recipes')}
          </span>
          <div className="text-2xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {savedCount}
          </div>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-md space-y-1 transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <span className="font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            <ChefHat className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            {t('profile.activePlanTier', 'Active Tier')}
          </span>
          <div className="text-2xl font-black capitalize" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {user.subscriptionPlan || 'Taster'}
          </div>
        </div>

        <div 
          className="border rounded-2xl p-4 shadow-md space-y-1 transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          <span className="font-bold flex items-center gap-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
            <Palette className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            {t('profile.currentMode', 'Display Mode')}
          </span>
          <div className="text-2xl font-black capitalize" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {isDayMode ? t('profile.dayMode', 'Day Mode') : t('profile.darkMode', 'Dark Mode')}
          </div>
        </div>
      </div>

      {/* SECTION 1: APPEARANCE, DAY/DARK MODE & COLOR THEME CONTROLS */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-[var(--color-primary)]" />
              <h2 className="text-base font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                {t('profile.appearanceThemeTitle', 'Appearance & Theme Synchronization')}
              </h2>
            </div>
            <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
              {t('profile.appearanceThemeDesc', 'Toggle between Day (Light) and Dark (Night) mode or switch your coordinated theme color palette.')}
            </p>
          </div>

          {/* DAY/DARK MODE TOGGLE BUTTON */}
          <button
            type="button"
            onClick={handleModeToggle}
            className="px-4 py-2.5 border rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-md hover:opacity-90 shrink-0"
            style={{
              backgroundColor: isDayMode ? '#f8fafc' : '#141b2d',
              borderColor: isDayMode ? '#cbd5e1' : '#334155',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            {isDayMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span>{t('profile.switchToDark', 'Switch to Dark Mode')}</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-blue-400" />
                <span>{t('profile.switchToDay', 'Switch to Day Mode')}</span>
              </>
            )}
          </button>
        </div>

        {/* COOPERATIVE COLOR PALETTE PICKER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              {t('profile.quickPalettes', 'Coordinated Color Palettes:')}
            </span>
            {user.role === 'admin' && (
              <Link 
                href="/admin" 
                className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <span>{t('profile.fullCustomizer', 'Open Full Hex Customizer')}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {PROFILE_PALETTES.map((preset) => {
              const isSelected = activePalette === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPalette(preset)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer shadow-xs ${
                    isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-85'
                  }`}
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                    borderColor: isSelected ? 'var(--color-primary)' : isDayMode ? '#cbd5e1' : '#1e293b'
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.background, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
                  </div>
                  <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: EDIT PROFILE & PREFERENCES */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <UserIcon className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-base font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {t('profile.accountDetails', 'Personal Details & Preferences')}
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.displayNameLabel', 'Full Name')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 font-bold outline-none transition"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.emailLabel', 'Email Address (Account ID)')}
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none opacity-60 cursor-not-allowed"
                style={{
                  backgroundColor: isDayMode ? '#e2e8f0' : '#141b2d',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.dietaryPreference', 'Dietary Preference')}
              </label>
              <select
                value={dietPreference}
                onChange={(e) => setDietPreference(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              >
                <option value="none">{t('diet.none', 'No Restrictions / Omnivore')}</option>
                <option value="vegetarian">{t('diet.vegetarian', 'Vegetarian')}</option>
                <option value="vegan">{t('diet.vegan', 'Vegan')}</option>
                <option value="keto">{t('diet.keto', 'Ketogenic (Low Carb)')}</option>
                <option value="gluten-free">{t('diet.glutenFree', 'Gluten-Free')}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.cookingExperience', 'Cooking Experience Level')}
              </label>
              <select
                value={cookingLevel}
                onChange={(e) => setCookingLevel(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              >
                <option value="beginner">{t('experience.beginner', 'Beginner / Home Cook')}</option>
                <option value="intermediate">{t('experience.intermediate', 'Intermediate Foodie')}</option>
                <option value="advanced">{t('experience.advanced', 'Advanced Culinary Enthusiast')}</option>
                <option value="pro">{t('experience.pro', 'Professional Chef')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {isSavingProfile ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('profile.saveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: SECURITY & PASSWORD UPDATE */}
      <div 
        className="border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <Lock className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-base font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {t('profile.securityTitle', 'Security & Password')}
          </h2>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.currentPassword', 'Current Password')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.newPassword', 'New Password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('profile.confirmPassword', 'Confirm New Password')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border rounded-xl px-3 py-2 font-mono outline-none"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 border rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:opacity-80"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d',
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                color: isDayMode ? '#0f172a' : '#ffffff'
              }}
            >
              {isUpdatingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              {t('profile.updatePasswordBtn', 'Update Password')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
