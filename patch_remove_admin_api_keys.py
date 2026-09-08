import os

admin_page_code = """'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Check, 
  CheckCircle, 
  UserPlus, 
  RotateCcw, 
  Save, 
  Palette, 
  Sparkles, 
  Layers, 
  Eye 
} from 'lucide-react';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  getSiteName, 
  getSiteIcon, 
  saveSiteConfig, 
  DEFAULT_SITE_NAME, 
  DEFAULT_SITE_ICON, 
  PRESET_ICONS, 
  updateFavicon 
} from '@/lib/siteConfig';
import { 
  ThemeColors, 
  DEFAULT_THEME_COLORS, 
  THEME_PRESETS, 
  getStoredTheme, 
  saveStoredTheme, 
  resetStoredTheme, 
  applyCssThemeVariables 
} from '@/lib/theme';

export default function AdminSettingsPage() {
  const { t, version } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'theme'>('general');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  // Site Branding State
  const [siteName, setLocalSiteName] = useState(DEFAULT_SITE_NAME);
  const [siteIcon, setLocalSiteIcon] = useState(DEFAULT_SITE_ICON);
  const [siteNameFeedback, setSiteNameFeedback] = useState('');

  // Global Theme & Colors State
  const [themeColors, setThemeColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [themeFeedback, setThemeFeedback] = useState('');

  // Dynamic Theme Synchronization & Color Inversion
  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const storedTheme = getStoredTheme();
      setThemeColors(storedTheme);
      applyCssThemeVariables(storedTheme);

      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', storedTheme.primary || '#E05638');
        root.style.setProperty('--color-primary-hover', storedTheme.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', storedTheme.accentEmerald || '#10b981');
        root.style.setProperty('--color-accent', storedTheme.accentEmerald || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        root.style.setProperty('--color-primary', storedTheme.primary || '#E05638');
        root.style.setProperty('--color-primary-hover', storedTheme.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', storedTheme.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', storedTheme.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', storedTheme.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', storedTheme.cardBackground || '#111726');
        root.style.setProperty('--color-card', storedTheme.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', storedTheme.innerDark || storedTheme.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', storedTheme.borderColor || '#1e293b');
        root.style.setProperty('--color-emerald', storedTheme.accentEmerald || '#10b981');
        root.style.setProperty('--color-accent', storedTheme.accentEmerald || '#10b981');
        root.style.setProperty('--color-text', storedTheme.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', storedTheme.textSecondary || '#94a3b8');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    document.title = `${t('adminSettingsTitle') || 'Admin Settings'} - Settings`;
    initAuthStorage();
    setCurrentUser(getCurrentUser());
    
    // Load Branding
    const name = getSiteName();
    const icon = getSiteIcon();
    setLocalSiteName(name);
    setLocalSiteIcon(icon);
    updateFavicon(icon);

    applySavedTheme();

    const handleSiteSync = () => {
      setLocalSiteName(getSiteName());
      const updatedIcon = getSiteIcon();
      setLocalSiteIcon(updatedIcon);
      updateFavicon(updatedIcon);
    };

    window.addEventListener('zecratary_site_settings_changed', handleSiteSync);
    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('storage', applySavedTheme);
    window.addEventListener('storage', handleSiteSync);

    return () => {
      window.removeEventListener('zecratary_site_settings_changed', handleSiteSync);
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
      window.removeEventListener('storage', handleSiteSync);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applySavedTheme, t, version]);

  // Branding Handlers
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = siteName.trim() || DEFAULT_SITE_NAME;
    const cleanIcon = siteIcon.trim() || DEFAULT_SITE_ICON;
    saveSiteConfig(cleanName, cleanIcon);
    setLocalSiteName(cleanName);
    setLocalSiteIcon(cleanIcon);
    setSiteNameFeedback(t('brandingUpdatedFeedback') || 'Site branding updated successfully!');
    setTimeout(() => setSiteNameFeedback(''), 3000);
  };

  const handleResetBranding = () => {
    if (confirm(`${t('confirmResetBranding') || 'Are you sure you want to reset site branding to default'} "${DEFAULT_SITE_ICON} ${DEFAULT_SITE_NAME}"?`)) {
      saveSiteConfig(DEFAULT_SITE_NAME, DEFAULT_SITE_ICON);
      setLocalSiteName(DEFAULT_SITE_NAME);
      setLocalSiteIcon(DEFAULT_SITE_ICON);
      setSiteNameFeedback(t('brandingResetFeedback') || 'Site branding reset to default!');
      setTimeout(() => setSiteNameFeedback(''), 3000);
    }
  };

  // Theme Handlers
  const handleColorChange = (key: keyof ThemeColors, val: string) => {
    const updated = { ...themeColors, [key]: val };
    setThemeColors(updated);
    applyCssThemeVariables(updated);
  };

  const handleSelectPreset = (preset: ThemeColors) => {
    setThemeColors(preset);
    applyCssThemeVariables(preset);
  };

  const handleSaveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredTheme(themeColors);
    applyCssThemeVariables(themeColors);
    setThemeFeedback(t('themeColorsSavedFeedback') || 'Theme colors saved and applied successfully!');
    setTimeout(() => setThemeFeedback(''), 3000);
  };

  const handleResetTheme = () => {
    if (confirm(t('confirmResetTheme') || 'Are you sure you want to reset theme colors to default presets?')) {
      resetStoredTheme();
      setThemeColors(DEFAULT_THEME_COLORS);
      applyCssThemeVariables(DEFAULT_THEME_COLORS);
      setThemeFeedback(t('themeColorsResetFeedback') || 'Theme colors reset to default!');
      setTimeout(() => setThemeFeedback(''), 3000);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('adminSettingsTitle') || 'Admin Settings'}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('adminSettingsSubtitle') || 'Manage system configurations, branding, and color themes'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/add-user"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#cbd5e1'
            }}
          >
            <UserPlus className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('addUser') || 'Add User'}
          </Link>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div 
        className="flex border-b gap-3 overflow-x-auto transition-colors duration-200" 
        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <button
          onClick={() => setActiveTab('general')}
          className="flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition shrink-0 cursor-pointer"
          style={activeTab === 'general' ? {
            borderColor: 'var(--color-primary, #E05638)',
            color: 'var(--color-primary, #E05638)'
          } : {
            borderColor: 'transparent',
            color: isDayMode ? '#64748b' : '#94a3b8'
          }}
        >
          <Globe className="h-4 w-4" /> {t('generalBrandingTab') || 'General & Branding'}
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          className="flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition shrink-0 cursor-pointer"
          style={activeTab === 'theme' ? {
            borderColor: 'var(--color-primary, #E05638)',
            color: 'var(--color-primary, #E05638)'
          } : {
            borderColor: 'transparent',
            color: isDayMode ? '#64748b' : '#94a3b8'
          }}
        >
          <Palette className="h-4 w-4" /> {t('themeColorsTab') || 'Theme Colors'}
        </button>
      </div>

      {/* TAB 1: GENERAL & SITE BRANDING */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {siteNameFeedback && (
            <div 
              className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in"
              style={{
                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
              }}
            >
              <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{siteNameFeedback}</span>
            </div>
          )}

          <div 
            className="border rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Globe className="h-5 w-5" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('siteIdentityTitle') || 'Site Identity & Branding'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('siteIdentitySub') || 'Customize your application name, title bar emoji, and favicon branding.'}
              </p>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-6">
              {/* ICON PICKER */}
              <div className="space-y-2">
                <label className="block text-xs font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('siteIconLabel') || 'Site Icon Emoji'}
                </label>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setLocalSiteIcon(emoji)}
                      className="w-11 h-11 text-xl rounded-xl border transition flex items-center justify-center cursor-pointer shadow-xs"
                      style={siteIcon === emoji ? {
                        backgroundColor: 'rgba(224, 86, 56, 0.15)',
                        borderColor: 'var(--color-primary, #E05638)',
                        transform: 'scale(1.05)'
                      } : {
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                      }}
                      title={`Select ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="max-w-xs pt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={4}
                      value={siteIcon}
                      onChange={(e) => setLocalSiteIcon(e.target.value)}
                      placeholder="Custom emoji (e.g. 🍒)"
                      className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition font-bold"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                  <span className="text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('customEmoji') || 'Custom emoji'}</span>
                </div>
              </div>

              {/* SITE NAME INPUT */}
              <div className="max-w-md space-y-2">
                <label className="block text-xs font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('siteNameLabel') || 'Application Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zecratary, FoodiePrep, MyKitchen..."
                  value={siteName}
                  onChange={(e) => setLocalSiteName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition font-bold"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>

              {/* LIVE BRAND PREVIEW */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {t('liveBrandPreview') || 'Live Brand Preview'}
                </span>
                <div 
                  className="inline-flex items-center gap-3 border px-5 py-3 rounded-2xl shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #080C17)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <span className="text-2xl">{siteIcon.trim() || DEFAULT_SITE_ICON}</span>
                  <span 
                    className="text-xl font-black tracking-tight"
                    style={{ color: 'var(--color-primary, #E05638)' }}
                  >
                    {siteName.trim() || DEFAULT_SITE_NAME}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="submit"
                  className="text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  <Save className="h-4 w-4" /> {t('saveBrandingBtn') || 'Save Branding'}
                </button>
                <button
                  type="button"
                  onClick={handleResetBranding}
                  className="border font-bold text-xs px-4 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-card, #111726)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  <RotateCcw className="h-4 w-4" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} /> {t('resetDefaultBtn') || 'Reset Defaults'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL THEME & COLOR SETTINGS */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          {themeFeedback && (
            <div 
              className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in"
              style={{
                backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--color-emerald, #10b981)',
                color: isDayMode ? '#047857' : 'var(--color-emerald, #10b981)'
              }}
            >
              <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald, #10b981)' }} />
              <span>{themeFeedback}</span>
            </div>
          )}

          {/* PALETTE PRESETS */}
          <div 
            className="border rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
            }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('presetPalettesTitle') || 'Preset Color Palettes'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {THEME_PRESETS.map((p) => {
                const isMatch = p.colors.primary === themeColors.primary && p.colors.backgroundColor === themeColors.backgroundColor;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p.colors)}
                    className="p-3.5 rounded-2xl border transition text-left space-y-2 cursor-pointer shadow-xs"
                    style={isMatch ? {
                      backgroundColor: isDayMode ? '#fee2e2' : 'var(--color-inner-dark, #111726)',
                      borderColor: 'var(--color-primary, #E05638)'
                    } : {
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                      borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{p.name}</span>
                      {isMatch && <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-primary, #E05638)' }} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.colors.primary, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.colors.backgroundColor, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.colors.cardBackground, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.colors.accentEmerald, borderColor: isDayMode ? '#cbd5e1' : '#334155' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLOR CONTROLS & LIVE PREVIEW GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form 
              onSubmit={handleSaveTheme} 
              className="lg:col-span-2 border rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200"
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                <Layers className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('elementColorCustomizationTitle') || 'Element & Surface Color Customization'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Primary Color */}
                <div 
                  className="border rounded-2xl p-3.5 space-y-2 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('primaryBrandAccentLabel') || 'Primary Brand Accent'}</label>
                    <span className="font-mono text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{themeColors.primary}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={themeColors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                </div>

                {/* Primary Hover */}
                <div 
                  className="border rounded-2xl p-3.5 space-y-2 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('primaryButtonHoverLabel') || 'Primary Button Hover'}</label>
                    <span className="font-mono text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{themeColors.primaryHover}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={themeColors.primaryHover}
                      onChange={(e) => handleColorChange('primaryHover', e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColors.primaryHover}
                      onChange={(e) => handleColorChange('primaryHover', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                </div>

                {/* App Background */}
                <div 
                  className="border rounded-2xl p-3.5 space-y-2 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('appBgSurfaceLabel') || 'App Background Surface'}</label>
                    <span className="font-mono text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{themeColors.backgroundColor}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={themeColors.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColors.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                </div>

                {/* Card Background */}
                <div 
                  className="border rounded-2xl p-3.5 space-y-2 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('cardModalPanelsLabel') || 'Card & Modal Panels'}</label>
                    <span className="font-mono text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{themeColors.cardBackground}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={themeColors.cardBackground}
                      onChange={(e) => handleColorChange('cardBackground', e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColors.cardBackground}
                      onChange={(e) => handleColorChange('cardBackground', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                </div>

                {/* Border Color */}
                <div 
                  className="border rounded-2xl p-3.5 space-y-2 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('bordersDividersLabel') || 'Borders & Dividers'}</label>
                    <span className="font-mono text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{themeColors.borderColor}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={themeColors.borderColor}
                      onChange={(e) => handleColorChange('borderColor', e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColors.borderColor}
                      onChange={(e) => handleColorChange('borderColor', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                </div>

                {/* Secondary Accent */}
                <div 
                  className="border rounded-2xl p-3.5 space-y-2 transition"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{t('secondaryStatusAccentLabel') || 'Secondary / Status Accent'}</label>
                    <span className="font-mono text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{themeColors.accentEmerald}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={themeColors.accentEmerald}
                      onChange={(e) => handleColorChange('accentEmerald', e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColors.accentEmerald}
                      onChange={(e) => handleColorChange('accentEmerald', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                <button
                  type="submit"
                  className="text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
                >
                  <Save className="h-4 w-4" /> {t('saveThemeColorsBtn') || 'Save Theme Colors'}
                </button>
                <button
                  type="button"
                  onClick={handleResetTheme}
                  className="border font-bold text-xs px-4 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #111726)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#334155' : '#cbd5e1'
                  }}
                >
                  <RotateCcw className="h-4 w-4" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }} /> {t('resetDefaultBtn') || 'Reset Defaults'}
                </button>
              </div>
            </form>

            {/* Live Element Preview */}
            <div className="space-y-4">
              <div 
                className="border rounded-3xl p-5 space-y-4 shadow-sm sticky top-6 transition-colors duration-200"
                style={{
                  backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
                  borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  <Eye className="h-4 w-4" style={{ color: 'var(--color-primary, #E05638)' }} /> {t('liveElementPreview') || 'Live Element Preview'}
                </h3>

                <div 
                  className="p-5 rounded-2xl border space-y-3.5 transition-all shadow-inner"
                  style={{
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.borderColor,
                    color: themeColors.textColor
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                      style={{ 
                        backgroundColor: `${themeColors.accentEmerald}20`, 
                        borderColor: `${themeColors.accentEmerald}50`, 
                        color: themeColors.accentEmerald 
                      }}
                    >
                      {t('activeStatusBadge') || 'Active Status'}
                    </span>
                    <span className="text-[11px]" style={{ color: themeColors.textSecondary }}>30 mins</span>
                  </div>

                  <h4 className="text-base font-extrabold" style={{ color: themeColors.primary }}>
                    Thai Basil Chicken Deluxe
                  </h4>

                  <p className="text-xs leading-relaxed" style={{ color: themeColors.textSecondary }}>
                    Preview showing how your colors adapt to typography, cards, buttons, and status tags in real time.
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border, #1e293b)' }}>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer"
                      style={{ backgroundColor: themeColors.primary }}
                    >
                      {t('actionButtonPreview') || 'Primary Action'}
                    </button>
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer"
                      style={{ 
                        borderColor: themeColors.borderColor, 
                        color: themeColors.primary,
                        backgroundColor: themeColors.backgroundColor
                      }}
                    >
                      {t('secondaryButtonPreview') || 'Secondary'}
                    </button>
                  </div>
                </div>

                <div 
                  className="p-3 border rounded-xl text-[11px] leading-relaxed"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#64748b' : '#94a3b8'
                  }}
                >
                  {t('themeSettingsPersistNote') || 'Theme settings instantly update CSS variables across all pages and persist in local storage.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

admin_candidates = [
    "apps/web/src/app/admin/page.tsx",
    "src/app/admin/page.tsx",
    "apps/web/src/app/(app)/admin/page.tsx",
    "src/app/(app)/admin/page.tsx"
]

patched = False
for path in admin_candidates:
    if os.path.exists(path) or os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(admin_page_code)
        print(f"✅ Removed API Keys tab & related code from: {path}")
        patched = True
        break

if not patched:
    fallback = admin_candidates[0]
    os.makedirs(os.path.dirname(fallback), exist_ok=True)
    with open(fallback, "w", encoding="utf-8") as f:
        f.write(admin_page_code)
    print(f"✅ Created fallback without API Keys tab at: {fallback}")

print("🎉 API Keys tab and all related logic successfully purged from /admin!")
