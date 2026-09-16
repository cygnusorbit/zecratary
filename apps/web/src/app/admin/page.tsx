'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Palette,
  Image as ImageIcon, 
  Smile, 
  Globe, 
  Cpu, 
  CreditCard, 
  Wallet, 
  Users, 
  Utensils, 
  Tag, 
  Key,
  Languages,
  LayoutGrid,
  BookOpen
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { 
  getSiteConfig, 
  saveSiteConfig, 
  setMemorySiteConfig,
  updateFavicon, 
  SiteIdentityConfig, 
  DEFAULT_SITE_NAME, 
  DEFAULT_SITE_ICON 
} from '@/lib/siteConfig';
import { 
  applyThemeToDocument, 
  saveThemeColors, 
  setMemoryThemeColors 
} from '@/lib/themeConfig';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

const PRESET_PALETTES = [
  { 
    name: 'Zecratary Coral', 
    primary: '#E05638', 
    primaryHover: '#c94529', 
    accent: '#10b981', 
    sidebarIcon: '#10b981',
    background: '#070b13',
    card: '#0b0f17',
    border: '#1e293b',
    textSecondary: '#94a3b8'
  },
  { 
    name: 'Emerald Forest', 
    primary: '#10b981', 
    primaryHover: '#059669', 
    accent: '#3b82f6', 
    sidebarIcon: '#10b981',
    background: '#06130d',
    card: '#0a1d14',
    border: '#133526',
    textSecondary: '#86efac'
  },
  { 
    name: 'Cyber Blue', 
    primary: '#2563eb', 
    primaryHover: '#1d4ed8', 
    accent: '#10b981', 
    sidebarIcon: '#38bdf8',
    background: '#080d1a',
    card: '#0c152b',
    border: '#1e293b',
    textSecondary: '#93c5fd'
  },
  { 
    name: 'Royal Purple', 
    primary: '#8b5cf6', 
    primaryHover: '#7c3aed', 
    accent: '#ec4899', 
    sidebarIcon: '#c084fc',
    background: '#0f081c',
    card: '#180d2e',
    border: '#2a1650',
    textSecondary: '#d8b4fe'
  },
  { 
    name: 'Amber Gold', 
    primary: '#f59e0b', 
    primaryHover: '#d97706', 
    accent: '#10b981', 
    sidebarIcon: '#fbbf24',
    background: '#120d04',
    card: '#1c1507',
    border: '#36270a',
    textSecondary: '#fcd34d'
  },
  { 
    name: 'Deep Midnight', 
    primary: '#38bdf8', 
    primaryHover: '#0284c7', 
    accent: '#a855f7', 
    sidebarIcon: '#38bdf8',
    background: '#020617',
    card: '#080e22',
    border: '#172554',
    textSecondary: '#7dd3fc'
  },
];

export default function AdminSettingsPage() {
  const langContext = useTranslation();
  const translate = langContext?.t;
  const t = useCallback((key: string, fallback: string) => {
    if (typeof translate === 'function') {
      const val = translate(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }, [translate]);

  const [activeTab, setActiveTab] = useState<'branding' | 'theme'>('branding');
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Site Identity State
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [titlebarEmoji, setTitlebarEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [titlebarImage, setTitlebarImage] = useState<string>('');
  const [faviconEmoji, setFaviconEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [faviconImage, setFaviconImage] = useState<string>('');

  // Extended Theme Color State
  const [primaryColor, setPrimaryColor] = useState<string>('#E05638');
  const [primaryHoverColor, setPrimaryHoverColor] = useState<string>('#c94529');
  const [accentColor, setAccentColor] = useState<string>('#10b981');
  const [sidebarIconColor, setSidebarIconColor] = useState<string>('#10b981');
  const [backgroundColor, setBackgroundColor] = useState<string>('#070b13');
  const [cardBackgroundColor, setCardBackgroundColor] = useState<string>('#0b0f17');
  const [cardBorderColor, setCardBorderColor] = useState<string>('#1e293b');
  const [secondaryTextColor, setSecondaryTextColor] = useState<string>('#94a3b8');

  const titlebarFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  // Decoupled state reference to avoid stale closures in listeners
  const colorsRef = useRef({
    primary: primaryColor,
    primaryHover: primaryHoverColor,
    accent: accentColor,
    sidebarIcon: sidebarIconColor,
    background: backgroundColor,
    card: cardBackgroundColor,
    border: cardBorderColor,
    textSecondary: secondaryTextColor,
  });

  useEffect(() => {
    colorsRef.current = {
      primary: primaryColor,
      primaryHover: primaryHoverColor,
      accent: accentColor,
      sidebarIcon: sidebarIconColor,
      background: backgroundColor,
      card: cardBackgroundColor,
      border: cardBorderColor,
      textSecondary: secondaryTextColor,
    };
  }, [primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor]);

  const applyColorsLocally = (
    primary: string, 
    hover: string, 
    accent: string, 
    sidebarIcon: string,
    bg: string,
    card: string,
    border: string,
    textSec: string
  ) => {
    applyThemeToDocument({
      primary,
      primaryColor: primary,
      primaryHover: hover,
      accentEmerald: accent,
      accentColor: accent,
      accent: accent,
      sidebarIconColor: sidebarIcon,
      sidebarIcon: sidebarIcon,
      backgroundColor: bg,
      backgroundDark: bg,
      cardBackground: card,
      cardBorder: border,
      textSecondary: textSec
    });
  };

  // Load Settings Exclusively from Server Storage (Zero LocalStorage)
  const loadSettingsFromServer = useCallback(async () => {
    setIsLoading(true);
    purgeLegacyBrowserAdminStorage();
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData) {
        if (serverData.siteName) setSiteName(serverData.siteName);
        if (serverData.titlebarEmoji) setTitlebarEmoji(serverData.titlebarEmoji);
        if (serverData.titlebarImage !== undefined) setTitlebarImage(serverData.titlebarImage);
        if (serverData.faviconEmoji) setFaviconEmoji(serverData.faviconEmoji);
        if (serverData.faviconImage !== undefined) setFaviconImage(serverData.faviconImage);

        const tc = serverData.themeColors || {};
        const p = tc.primary || tc.primaryColor || '#E05638';
        const ph = tc.primaryHover || '#c94529';
        const ac = tc.accentEmerald || tc.accentColor || tc.accent || '#10b981';
        const sbi = tc.sidebarIconColor || tc.sidebarIcon || ac || '#10b981';
        const bg = tc.backgroundColor || tc.backgroundDark || '#070b13';
        const card = tc.cardBackground || '#0b0f17';
        const border = tc.cardBorder || '#1e293b';
        const textSec = tc.textSecondary || '#94a3b8';

        setPrimaryColor(p);
        setPrimaryHoverColor(ph);
        setAccentColor(ac);
        setSidebarIconColor(sbi);
        setBackgroundColor(bg);
        setCardBackgroundColor(card);
        setCardBorderColor(border);
        setSecondaryTextColor(textSec);

        applyColorsLocally(p, ph, ac, sbi, bg, card, border, textSec);
      }
    } catch (err) {
      console.error('[AdminSettingsPage] Error loading settings from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuthStorage();
    const active = getCurrentUser();
    setUser(active);

    loadSettingsFromServer();

    const handleServerUpdate = () => {
      loadSettingsFromServer();
    };

    window.addEventListener('zecratary_admin_settings_updated', handleServerUpdate);
    return () => {
      window.removeEventListener('zecratary_admin_settings_updated', handleServerUpdate);
    };
  }, [loadSettingsFromServer]);

  // Dynamic Theme mode change listener
  useEffect(() => {
    const handleModeChange = () => {
      try {
        const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
        const day = mode === 'light' || mode === 'day';
        setIsDayMode(day);
        const cur = colorsRef.current;
        applyThemeToDocument({
          primary: cur.primary,
          primaryHover: cur.primaryHover,
          accentEmerald: cur.accent,
          accentColor: cur.accent,
          accent: cur.accent,
          sidebarIconColor: cur.sidebarIcon,
          sidebarIcon: cur.sidebarIcon,
          backgroundColor: cur.background,
          backgroundDark: cur.background,
          cardBackground: cur.card,
          cardBorder: cur.border,
          textSecondary: cur.textSecondary,
        });
      } catch (_) {}
    };

    handleModeChange();
    window.addEventListener('zecratary_theme_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleModeChange);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'titlebar' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t('admin.fileSizeError', 'File size exceeds the 2MB limit.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        if (target === 'titlebar') {
          setTitlebarImage(result);
        } else {
          setFaviconImage(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setPrimaryColor(preset.primary);
    setPrimaryHoverColor(preset.primaryHover);
    setAccentColor(preset.accent);
    setSidebarIconColor(preset.sidebarIcon || preset.accent);
    setBackgroundColor(preset.background);
    setCardBackgroundColor(preset.card);
    setCardBorderColor(preset.border);
    setSecondaryTextColor(preset.textSecondary);

    applyColorsLocally(
      preset.primary, 
      preset.primaryHover, 
      preset.accent, 
      preset.sidebarIcon || preset.accent,
      preset.background,
      preset.card,
      preset.border,
      preset.textSecondary
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBranding: SiteIdentityConfig = {
      siteName: siteName.trim() || DEFAULT_SITE_NAME,
      titlebarEmoji: titlebarEmoji.trim() || DEFAULT_SITE_ICON,
      titlebarImage,
      faviconEmoji: faviconEmoji.trim() || DEFAULT_SITE_ICON,
      faviconImage
    };

    setMemorySiteConfig(updatedBranding);
    if (faviconImage) {
      updateFavicon(faviconImage);
    } else if (faviconEmoji) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${faviconEmoji}</text></svg>`;
      updateFavicon(`data:image/svg+xml,${encodeURIComponent(svg)}`);
    }

    const themeColors = {
      primary: primaryColor,
      primaryColor: primaryColor,
      primaryHover: primaryHoverColor,
      accentEmerald: accentColor,
      accentColor: accentColor,
      accent: accentColor,
      sidebarIconColor: sidebarIconColor,
      sidebarIcon: sidebarIconColor,
      backgroundColor: backgroundColor,
      backgroundDark: backgroundColor,
      cardBackground: cardBackgroundColor,
      cardBorder: cardBorderColor,
      textSecondary: secondaryTextColor,
    };

    setMemoryThemeColors(themeColors);
    applyColorsLocally(
      primaryColor,
      primaryHoverColor,
      accentColor,
      sidebarIconColor,
      backgroundColor,
      cardBackgroundColor,
      cardBorderColor,
      secondaryTextColor
    );

    // Save directly to server API with Zero LocalStorage writes
    await persistServerAdminSettings({
      siteName: updatedBranding.siteName,
      titlebarEmoji: updatedBranding.titlebarEmoji,
      titlebarImage: updatedBranding.titlebarImage || '',
      faviconEmoji: updatedBranding.faviconEmoji,
      faviconImage: updatedBranding.faviconImage || '',
      themeColors
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zecratary_site_config_updated', { detail: updatedBranding }));
      window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: themeColors }));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = async () => {
    if (!confirm(t('admin.confirmReset', 'Reset branding and theme settings to defaults?'))) return;

    const defaultName = DEFAULT_SITE_NAME;
    const defaultIcon = DEFAULT_SITE_ICON;
    const defaultPrimary = '#E05638';
    const defaultPrimaryHover = '#c94529';
    const defaultAccent = '#10b981';
    const defaultSidebarIcon = '#10b981';
    const defaultBg = '#070b13';
    const defaultCard = '#0b0f17';
    const defaultBorder = '#1e293b';
    const defaultTextSec = '#94a3b8';

    setSiteName(defaultName);
    setTitlebarEmoji(defaultIcon);
    setTitlebarImage('');
    setFaviconEmoji(defaultIcon);
    setFaviconImage('');

    setPrimaryColor(defaultPrimary);
    setPrimaryHoverColor(defaultPrimaryHover);
    setAccentColor(defaultAccent);
    setSidebarIconColor(defaultSidebarIcon);
    setBackgroundColor(defaultBg);
    setCardBackgroundColor(defaultCard);
    setCardBorderColor(defaultBorder);
    setSecondaryTextColor(defaultTextSec);

    const defaultBranding = {
      siteName: defaultName,
      titlebarEmoji: defaultIcon,
      titlebarImage: '',
      faviconEmoji: defaultIcon,
      faviconImage: ''
    };

    const defaultColors = {
      primary: defaultPrimary,
      primaryColor: defaultPrimary,
      primaryHover: defaultPrimaryHover,
      accentEmerald: defaultAccent,
      accentColor: defaultAccent,
      accent: defaultAccent,
      sidebarIconColor: defaultSidebarIcon,
      sidebarIcon: defaultSidebarIcon,
      backgroundColor: defaultBg,
      backgroundDark: defaultBg,
      cardBackground: defaultCard,
      cardBorder: defaultBorder,
      textSecondary: defaultTextSec
    };

    setMemorySiteConfig(defaultBranding);
    setMemoryThemeColors(defaultColors);

    applyColorsLocally(
      defaultPrimary,
      defaultPrimaryHover,
      defaultAccent,
      defaultSidebarIcon,
      defaultBg,
      defaultCard,
      defaultBorder,
      defaultTextSec
    );

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${defaultIcon}</text></svg>`;
    updateFavicon(`data:image/svg+xml,${encodeURIComponent(svg)}`);

    // Persist directly to server storage
    await persistServerAdminSettings({
      ...defaultBranding,
      themeColors: defaultColors
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zecratary_site_config_updated', { detail: defaultBranding }));
      window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: defaultColors }));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isTitlebarImageActive = !!titlebarImage;
  const isFaviconImageActive = !!faviconImage;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* HEADER */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              {t('admin.siteIdentity', 'Site Identity & Branding')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            {t('admin.siteIdentityDesc', 'Configure application name, comprehensive color themes, backgrounds, titlebar logo, and browser tab favicon.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadSettingsFromServer}
            disabled={isLoading}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#334155' : '#cbd5e1'
            }}
            title="Reload settings from server store"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary, #E05638)' }} />
            <span>Reload</span>
          </button>

          {saved && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isDayMode 
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <CheckCircle2 className="h-4 w-4" /> {t('admin.settingsSaved', 'Settings Saved & Broadcasted')}
            </div>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div 
        className="flex items-center gap-2 border-b pb-3" 
        style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border shadow-xs"
          style={{
            backgroundColor: activeTab === 'branding' 
              ? (isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)') 
              : 'transparent',
            borderColor: activeTab === 'branding' 
              ? (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)') 
              : 'transparent',
            color: activeTab === 'branding' 
              ? 'var(--color-primary, #E05638)' 
              : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{t('admin.tabBranding', 'Site Identity & Branding')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border shadow-xs"
          style={{
            backgroundColor: activeTab === 'theme' 
              ? (isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)') 
              : 'transparent',
            borderColor: activeTab === 'theme' 
              ? (isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)') 
              : 'transparent',
            color: activeTab === 'theme' 
              ? 'var(--color-primary, #E05638)' 
              : (isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)')
          }}
        >
          <Palette className="h-4 w-4" />
          <span>{t('admin.tabTheme', 'Theme')}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BRANDING */}
        <div className={activeTab === 'branding' ? 'space-y-6' : 'hidden'}>
          {/* APPLICATION NAME */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {t('admin.appName', 'Application Name')}
            </h2>
            <div>
              <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('admin.displayName', 'Display Name')}
              </label>
              <input 
                type="text" 
                value={siteName} 
                onChange={(e) => setSiteName(e.target.value)} 
                placeholder="e.g. Zecratary" 
                className="w-full sm:w-1/2 border rounded-xl px-3.5 py-2 font-bold outline-none transition" 
                style={{ 
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                  color: isDayMode ? '#0f172a' : '#ffffff' 
                }} 
              />
            </div>
          </div>

          {/* TITLEBAR BRAND ICON */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {t('admin.titlebarIcon', 'Titlebar & Sidebar Brand Icon')}
                </h2>
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('admin.titlebarIconDesc', 'Upload an image logo. If no image is uploaded or if removed, the system defaults to the emoji below.')}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
                isTitlebarImageActive 
                  ? (isDayMode ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')
                  : (isDayMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400')
              }`}>
                {isTitlebarImageActive ? t('admin.activeUploadedImage', 'Active: Uploaded Image') : t('admin.activeDefaultEmoji', 'Active: Default Emoji')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.customLogoImage', 'Custom Logo Image (PNG, JPG, SVG, WebP)')}
                </label>
                <input 
                  type="file" 
                  ref={titlebarFileRef} 
                  onChange={(e) => handleFileUpload(e, 'titlebar')} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => titlebarFileRef.current?.click()}
                    className="px-4 py-2 border rounded-xl font-extrabold flex items-center gap-2 cursor-pointer transition hover:opacity-80"
                    style={{ 
                      backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <Upload className="h-4 w-4" /> {t('common.uploadImage', 'Upload Image')}
                  </button>
                  {titlebarImage && (
                    <button
                      type="button"
                      onClick={() => setTitlebarImage('')}
                      className={`px-3 py-2 border rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        isDayMode 
                          ? 'text-red-600 border-red-300 hover:bg-red-50' 
                          : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" /> {t('admin.revertToEmoji', 'Revert to Emoji')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.defaultEmojiFallback', 'Default Emoji (Fallback)')}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={titlebarEmoji} 
                    onChange={(e) => setTitlebarEmoji(e.target.value)} 
                    maxLength={4} 
                    className="w-20 text-center text-xl border rounded-xl py-1.5 font-bold outline-none" 
                    style={{ 
                      backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                      color: isDayMode ? '#0f172a' : '#ffffff' 
                    }} 
                  />
                  <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.defaultEmojiDesc', 'Used whenever no custom image is supplied.')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('admin.sidebarHeaderPreview', 'Sidebar & Header Preview:')}
              </span>
              <div 
                className="flex items-center gap-2.5 p-3 rounded-2xl border w-fit" 
                style={{ 
                  backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                  borderColor: isDayMode ? '#e2e8f0' : '#1e293b' 
                }} 
              >
                {isTitlebarImageActive ? (
                  <img src={titlebarImage} alt="Titlebar Logo" className="w-7 h-7 object-contain rounded" />
                ) : (
                  <span className="text-2xl">{titlebarEmoji || DEFAULT_SITE_ICON}</span>
                )}
                <span className="text-base font-black tracking-tight text-[var(--color-primary)]">
                  {siteName || DEFAULT_SITE_NAME}
                </span>
              </div>
            </div>
          </div>

          {/* FAVICON */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {t('admin.browserFavicon', 'Browser Favicon')}
                </h2>
                <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                  {t('admin.browserFaviconDesc', 'Upload an icon for browser tabs (PNG, ICO, SVG). If no image is uploaded, defaults to emoji.')}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
                isFaviconImageActive 
                  ? (isDayMode ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')
                  : (isDayMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400')
              }`}>
                {isFaviconImageActive ? t('admin.activeUploadedFavicon', 'Active: Uploaded Favicon') : t('admin.activeDefaultEmoji', 'Active: Default Emoji')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.customFaviconImage', 'Custom Favicon Image (PNG, ICO, SVG, WebP)')}
                </label>
                <input 
                  type="file" 
                  ref={faviconFileRef} 
                  onChange={(e) => handleFileUpload(e, 'favicon')} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => faviconFileRef.current?.click()}
                    className="px-4 py-2 border rounded-xl font-extrabold flex items-center gap-2 cursor-pointer transition hover:opacity-80"
                    style={{ 
                      backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <Upload className="h-4 w-4" /> {t('common.uploadFavicon', 'Upload Favicon')}
                  </button>
                  {faviconImage && (
                    <button
                      type="button"
                      onClick={() => setFaviconImage('')}
                      className={`px-3 py-2 border rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        isDayMode 
                          ? 'text-red-600 border-red-300 hover:bg-red-50' 
                          : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" /> {t('admin.revertToEmoji', 'Revert to Emoji')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                  {t('admin.defaultFaviconEmoji', 'Default Favicon Emoji (Fallback)')}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={faviconEmoji} 
                    onChange={(e) => setFaviconEmoji(e.target.value)} 
                    maxLength={4} 
                    className="w-20 text-center text-xl border rounded-xl py-1.5 font-bold outline-none" 
                    style={{ 
                      backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                      borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                      color: isDayMode ? '#0f172a' : '#ffffff' 
                    }} 
                  />
                  <span className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.defaultFaviconDesc', 'Converts dynamically into an SVG favicon if no image is uploaded.')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('admin.browserTabPreview', 'Browser Tab Appearance Preview:')}
              </span>
              <div 
                className="max-w-xs border rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm"
                style={{ 
                  backgroundColor: isDayMode ? '#e2e8f0' : '#141b2d', 
                  borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  {isFaviconImageActive ? (
                    <img src={faviconImage} alt="Favicon Preview" className="w-4 h-4 object-contain rounded shrink-0" />
                  ) : (
                    <span className="text-sm shrink-0">{faviconEmoji || titlebarEmoji || DEFAULT_SITE_ICON}</span>
                  )}
                  <span className="text-xs font-bold truncate">
                    {siteName || DEFAULT_SITE_NAME}
                  </span>
                </div>
                <span className="text-xs opacity-50">✕</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: THEME */}
        <div className={activeTab === 'theme' ? 'space-y-6' : 'hidden'}>
          {/* THEME COLOR & PALETTE SETTINGS */}
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-6 text-xs" 
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', 
              borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                    {t('admin.themeSettings', 'Complete Theme Color & Palette Settings')}
                  </h2>
                </div>
                <p className="text-[11px] mt-1" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                  {t('admin.themeSettingsDesc', 'Customize primary accents, interactive hovers, navigation icons, surfaces, borders, and typography.')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.primary', 'Primary')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: primaryColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.accent', 'Accent')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: accentColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.sidebarIcon', 'Sidebar Icon')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: sidebarIconColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.bg', 'Bg')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: backgroundColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{t('admin.card', 'Card')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: cardBackgroundColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block font-bold text-[11px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                {t('admin.coordinatedPalettes', 'Coordinated Palettes & Tones')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {PRESET_PALETTES.map((preset) => {
                  const isSelected = primaryColor.toLowerCase() === preset.primary.toLowerCase() && backgroundColor.toLowerCase() === preset.background.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${
                        isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isSelected ? 'var(--color-primary)' : isDayMode ? '#cbd5e1' : '#1e293b'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.sidebarIcon || preset.accent }} />
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

            {/* Brand & Interaction Colors */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>
                {t('admin.brandColors', 'Brand & Interaction Colors')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Primary Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.primaryBrandColor', 'Primary Brand Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryColor(val);
                        applyColorsLocally(val, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(val, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#E05638"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.primaryBrandColorDesc', 'Brand highlights, buttons, and headers.')}
                  </span>
                </div>

                {/* Primary Hover Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.primaryHoverColor', 'Primary Hover Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryHoverColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryHoverColor(val);
                        applyColorsLocally(primaryColor, val, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={primaryHoverColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryHoverColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, val, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#c94529"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.primaryHoverColorDesc', 'Hover and focus states for buttons.')}
                  </span>
                </div>

                {/* Accent Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.accentColor', 'Accent / Success Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccentColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, val, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={accentColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccentColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, val, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#10b981"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.accentColorDesc', 'Badges, success alerts, and secondary accents.')}
                  </span>
                </div>

                {/* Sidebar & Nav Icon Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.sidebarIconColor', 'Sidebar Icon Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={sidebarIconColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSidebarIconColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, val, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={sidebarIconColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSidebarIconColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, val, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#10b981"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.sidebarIconColorDesc', 'Icons for navigation and categories in the sidebar.')}
                  </span>
                </div>
              </div>
            </div>

            {/* Surfaces & Container Colors Group */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>
                {t('admin.surfacesBordersTypography', 'Surfaces, Borders & Typography')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Background Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.pageBackground', 'Page Background')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={backgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setBackgroundColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, val, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={backgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setBackgroundColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, val, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#070b13"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.pageBackgroundDesc', 'Root viewport background in night mode.')}
                  </span>
                </div>

                {/* Card / Surface Background */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.cardBackground', 'Card / Surface Background')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={cardBackgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBackgroundColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, val, cardBorderColor, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={cardBackgroundColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBackgroundColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, val, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      placeholder="#0b0f17"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.cardBackgroundDesc', 'Cards, modals, and container panels.')}
                  </span>
                </div>

                {/* Card / Container Border Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.containerBorderColor', 'Container Border Color')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={cardBorderColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBorderColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, val, secondaryTextColor);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={cardBorderColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardBorderColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, val, secondaryTextColor);
                        }
                      }}
                      placeholder="#1e293b"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.containerBorderColorDesc', 'Borders, dividers, and outlines.')}
                  </span>
                </div>

                {/* Secondary Subtitle Text Color */}
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    {t('admin.mutedSubtitleText', 'Muted / Subtitle Text')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={secondaryTextColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSecondaryTextColor(val);
                        applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, val);
                      }}
                      className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                      style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      value={secondaryTextColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSecondaryTextColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, val);
                        }
                      }}
                      placeholder="#94a3b8"
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : '#070b13',
                        borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {t('admin.mutedSubtitleTextDesc', 'Descriptions and helper captions.')}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Live Component Preview */}
            <div className="pt-3 border-t space-y-3" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              <span className="font-bold text-[11px] block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                {t('admin.previewTitle', 'Full Interactive Component Preview:')}
              </span>
              <div 
                className="p-5 rounded-3xl border transition-colors space-y-3" 
                style={{ 
                  backgroundColor: isDayMode ? '#f8fafc' : backgroundColor, 
                  borderColor: isDayMode ? '#cbd5e1' : cardBorderColor 
                }}
              >
                {/* Surface Card Preview */}
                <div 
                  className="p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                  style={{ 
                    backgroundColor: isDayMode ? '#ffffff' : cardBackgroundColor, 
                    borderColor: isDayMode ? '#e2e8f0' : cardBorderColor 
                  }}
                >
                  <div className="space-y-0.5">
                    <div className="font-black text-sm" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {t('admin.surfaceCardPreview', 'Surface Card Preview')}
                    </div>
                    <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : secondaryTextColor }}>
                      {t('admin.surfaceCardPreviewDesc', 'This demonstrates your secondary text color, card surface, and card border.')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div 
                      className="px-2.5 py-1 rounded-xl border text-[10px] font-extrabold flex items-center gap-1"
                      style={{ 
                        backgroundColor: `${accentColor}18`, 
                        borderColor: `${accentColor}40`, 
                        color: accentColor 
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> {t('common.active', 'Active')}
                    </div>
                    <button 
                      type="button" 
                      className="px-3.5 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = primaryHoverColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = primaryColor)}
                    >
                      {t('common.actionButton', 'Action Button')}
                    </button>
                  </div>
                </div>

                {/* Sidebar Navigation Item Live Preview */}
                <div 
                  className="p-3.5 rounded-2xl border transition-colors flex items-center justify-between gap-3 shadow-sm"
                  style={{ 
                    backgroundColor: isDayMode ? '#ffffff' : cardBackgroundColor, 
                    borderColor: isDayMode ? '#e2e8f0' : cardBorderColor 
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-xl flex items-center justify-center transition-colors shadow-xs"
                      style={{ 
                        backgroundColor: `${sidebarIconColor}18`,
                        border: `1px solid ${sidebarIconColor}33`,
                        color: sidebarIconColor 
                      }}
                    >
                      <Utensils className="h-4 w-4" style={{ color: sidebarIconColor }} />
                    </div>
                    <div>
                      <div className="text-xs font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                        {t('admin.sidebarIconPreview', 'Sidebar Icon Color Preview')}
                      </div>
                      <p className="text-[10px]" style={{ color: isDayMode ? '#64748b' : secondaryTextColor }}>
                        {t('admin.sidebarIconPreviewDesc', 'Reflects live on Dashboard, Chef, Pantry, and Plan icons.')}
                      </p>
                    </div>
                  </div>
                  <span 
                    className="text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold"
                    style={{ 
                      backgroundColor: `${sidebarIconColor}18`, 
                      color: sidebarIconColor,
                      border: `1px solid ${sidebarIconColor}33` 
                    }}
                  >
                    {sidebarIconColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 border rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition hover:opacity-80 shadow-xs"
            style={{ 
              backgroundColor: isDayMode ? '#ffffff' : '#0b0f17',
              borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
              color: isDayMode ? '#334155' : '#e2e8f0'
            }}
          >
            <RefreshCw className="h-4 w-4" /> {t('admin.resetDefaults', 'Reset to Defaults')}
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <CheckCircle2 className="h-4 w-4" /> {activeTab === 'theme' ? t('admin.saveThemeSettings', 'Save Theme Settings') : t('admin.saveBrandingSettings', 'Save Branding Settings')}
          </button>
        </div>
      </form>
    </div>
  );
}
