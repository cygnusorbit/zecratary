// @ts-nocheck
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
  AlertCircle,
  Utensils,
  Type
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
  setMemoryThemeColors,
  getMemoryThemeColors,
  applyGlobalFont,
  AVAILABLE_FONTS
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

const FONT_OPTIONS = [
  { id: 'Inter', name: 'Inter', family: "'Inter', system-ui, -apple-system, sans-serif", description: 'Clean, modern, optimized for screens' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', system-ui, sans-serif", description: 'Geometric, stylish, high legibility' },
  { id: 'Outfit', name: 'Outfit', family: "'Outfit', system-ui, sans-serif", description: 'Contemporary, smooth, elegant curves' },
  { id: 'Poppins', name: 'Poppins', family: "'Poppins', system-ui, sans-serif", description: 'Friendly, geometric, distinctive accents' },
  { id: 'Roboto', name: 'Roboto', family: "'Roboto', system-ui, sans-serif", description: 'Neutral, neo-grotesque, highly versatile' },
  { id: 'System Default', name: 'System Default', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", description: 'Native operating system typography' },
];

const FONT_SIZES = [
  { id: '14px', label: 'Compact', scaleDesc: 'High information density' },
  { id: '16px', label: 'Standard', scaleDesc: 'Default balanced readability' },
  { id: '18px', label: 'Comfortable', scaleDesc: 'Relaxed, enhanced legibility' },
];

const LETTER_SPACINGS = [
  { id: '-0.025em', label: 'Tight' },
  { id: '0em', label: 'Normal' },
  { id: '0.025em', label: 'Wide' },
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

  const [activeTab, setActiveTab] = useState<'branding' | 'theme' | 'font'>('branding');
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isSavingRef = useRef<boolean>(false);

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

  // Font Setting State
  const [fontFamily, setFontFamily] = useState<string>('Inter');
  const [fontSize, setFontSize] = useState<string>('16px');
  const [fontLetterSpacing, setFontLetterSpacing] = useState<string>('0em');

  const titlebarFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

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

  const applyFontLocally = (fontName: string, sz: string = fontSize, spacing: string = fontLetterSpacing) => {
    applyGlobalFont(fontName, sz, spacing);
  };

  const loadSettingsFromServer = useCallback(async () => {
    if (isSavingRef.current) return;
    setIsLoading(true);
    purgeLegacyBrowserAdminStorage();
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData) {
        const payload: any = serverData.settings || serverData;

        if (payload.siteName) setSiteName(payload.siteName);
        if (payload.titlebarEmoji) setTitlebarEmoji(payload.titlebarEmoji);
        if (payload.titlebarImage !== undefined) setTitlebarImage(payload.titlebarImage);
        if (payload.faviconEmoji) setFaviconEmoji(payload.faviconEmoji);
        if (payload.faviconImage !== undefined) setFaviconImage(payload.faviconImage);

        const tc = payload.themeColors || serverData.themeColors || getMemoryThemeColors() || {};
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

        const ff = payload.fontFamily || payload.font_family || 'Inter';
        const fs = payload.fontSize || payload.font_size || '16px';
        const fls = payload.fontLetterSpacing || payload.letter_spacing || '0em';

        setFontFamily(ff);
        setFontSize(fs);
        setFontLetterSpacing(fls);

        applyColorsLocally(p, ph, ac, sbi, bg, card, border, textSec);
        applyFontLocally(ff, fs, fls);
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
      if (!isSavingRef.current) {
        loadSettingsFromServer();
      }
    };

    window.addEventListener('zecratary_admin_settings_updated', handleServerUpdate);
    return () => {
      window.removeEventListener('zecratary_admin_settings_updated', handleServerUpdate);
    };
  }, [loadSettingsFromServer]);

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

  const handleFontSelect = (selectedId: string) => {
    setFontFamily(selectedId);
    applyFontLocally(selectedId, fontSize, fontLetterSpacing);
  };

  const handleFontSizeSelect = (selectedSize: string) => {
    setFontSize(selectedSize);
    applyFontLocally(fontFamily, selectedSize, fontLetterSpacing);
  };

  const handleLetterSpacingSelect = (selectedSpacing: string) => {
    setFontLetterSpacing(selectedSpacing);
    applyFontLocally(fontFamily, fontSize, selectedSpacing);
  };

  const handleSave = async (e?: React.SyntheticEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setIsSaving(true);
    isSavingRef.current = true;
    setSaveError('');

    try {
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
      applyFontLocally(fontFamily, fontSize, fontLetterSpacing);

      await saveThemeColors(themeColors);

      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_font_family', fontFamily);
        localStorage.setItem('zecratary_font_size', fontSize);
        localStorage.setItem('zecratary_font_spacing', fontLetterSpacing);
      }

      const success = await persistServerAdminSettings({
        siteName: updatedBranding.siteName,
        titlebarEmoji: updatedBranding.titlebarEmoji,
        titlebarImage: updatedBranding.titlebarImage || '',
        faviconEmoji: updatedBranding.faviconEmoji,
        faviconImage: updatedBranding.faviconImage || '',
        themeColors,
        fontFamily,
        font_family: fontFamily,
        fontSize,
        font_size: fontSize,
        fontLetterSpacing,
        letter_spacing: fontLetterSpacing
      });

      if (!success) {
        throw new Error(t('admin.saveFailed', 'Failed to commit settings to database endpoint.'));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_site_config_updated', { detail: updatedBranding }));
        window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: themeColors }));
        window.dispatchEvent(new CustomEvent('zecratary_font_updated', { detail: { fontFamily, fontSize, fontLetterSpacing } }));
        window.dispatchEvent(new Event('zecratary_theme_changed'));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('[AdminSettingsPage] Save failure:', err);
      setSaveError(err?.message || 'Failed to save settings to server store');
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      const target = e.target as HTMLInputElement;
      if (target.type !== 'file') {
        e.preventDefault();
        handleSave();
      }
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm(t('admin.confirmReset', 'Reset branding, theme, and font settings to defaults?'))) return;
    setIsSaving(true);
    isSavingRef.current = true;
    setSaveError('');

    try {
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
      const defaultFont = 'Inter';
      const defaultSize = '16px';
      const defaultSpacing = '0em';

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

      setFontFamily(defaultFont);
      setFontSize(defaultSize);
      setFontLetterSpacing(defaultSpacing);

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
      applyFontLocally(defaultFont, defaultSize, defaultSpacing);

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${defaultIcon}</text></svg>`;
      updateFavicon(`data:image/svg+xml,${encodeURIComponent(svg)}`);

      if (typeof window !== 'undefined') {
        localStorage.setItem('zecratary_font_family', defaultFont);
        localStorage.setItem('zecratary_font_size', defaultSize);
        localStorage.setItem('zecratary_font_spacing', defaultSpacing);
      }

      await saveThemeColors(defaultColors);
      await persistServerAdminSettings({
        ...defaultBranding,
        themeColors: defaultColors,
        fontFamily: defaultFont,
        font_family: defaultFont,
        fontSize: defaultSize,
        font_size: defaultSize,
        fontLetterSpacing: defaultSpacing,
        letter_spacing: defaultSpacing
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zecratary_site_config_updated', { detail: defaultBranding }));
        window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: defaultColors }));
        window.dispatchEvent(new CustomEvent('zecratary_font_updated', { detail: { fontFamily: defaultFont, fontSize: defaultSize, fontLetterSpacing: defaultSpacing } }));
        window.dispatchEvent(new Event('zecratary_theme_changed'));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to reset settings');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 600);
    }
  };

  const isTitlebarImageActive = !!titlebarImage;
  const isFaviconImageActive = !!faviconImage;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* HEADER */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              {t('admin.siteIdentity', 'Site Identity & Branding')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('admin.siteIdentityDesc', 'Configure application name, comprehensive color themes, typography fonts, titlebar logo, and browser tab favicon.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadSettingsFromServer}
            disabled={isLoading || isSaving}
            className="border font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title={t('admin.reloadTitle', 'Reload settings from server store')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('admin.reloadBtn', 'Reload')}</span>
          </button>

          {saved && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-emerald)',
                color: 'var(--color-emerald)'
              }}
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('admin.settingsSaved', 'Settings Saved & Broadcasted')}
            </div>
          )}

          {saveError && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#ef4444'
              }}
            >
              <AlertCircle className="h-4 w-4 text-red-500" /> {saveError}
            </div>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div 
        className="flex items-center gap-2 border-b pb-3 flex-wrap" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border shadow-xs"
          style={{
            backgroundColor: activeTab === 'branding' 
              ? 'var(--color-card)' 
              : 'transparent',
            borderColor: activeTab === 'branding' 
              ? 'var(--color-border)' 
              : 'transparent',
            color: activeTab === 'branding' 
              ? 'var(--color-primary)' 
              : 'var(--color-text-secondary)'
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
              ? 'var(--color-card)' 
              : 'transparent',
            borderColor: activeTab === 'theme' 
              ? 'var(--color-border)' 
              : 'transparent',
            color: activeTab === 'theme' 
              ? 'var(--color-primary)' 
              : 'var(--color-text-secondary)'
          }}
        >
          <Palette className="h-4 w-4" />
          <span>{t('admin.tabTheme', 'Theme')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('font')}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border shadow-xs"
          style={{
            backgroundColor: activeTab === 'font' 
              ? 'var(--color-card)' 
              : 'transparent',
            borderColor: activeTab === 'font' 
              ? 'var(--color-border)' 
              : 'transparent',
            color: activeTab === 'font' 
              ? 'var(--color-primary)' 
              : 'var(--color-text-secondary)'
          }}
        >
          <Type className="h-4 w-4" />
          <span>{t('admin.tabFont', 'Font Setting')}</span>
        </button>
      </div>

      {/* SETTINGS CONTAINER */}
      <div onKeyDown={handleKeyDown} className="space-y-6">
        {/* TAB 1: BRANDING */}
        <div className={activeTab === 'branding' ? 'space-y-6' : 'hidden'}>
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t('admin.appName', 'Application Name')}
            </h2>
            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.displayName', 'Display Name')}
              </label>
              <input 
                type="text" 
                id="site_display_name_setting"
                name="site_display_name_setting"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                value={siteName} 
                onChange={(e) => setSiteName(e.target.value)} 
                placeholder="e.g. Zecratary" 
                className="w-full sm:w-1/2 border rounded-xl px-3.5 py-2 font-bold outline-none transition" 
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)', 
                  color: 'var(--color-text)' 
                }} 
              />
            </div>
          </div>

          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('admin.titlebarIcon', 'Titlebar & Sidebar Brand Icon')}
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.titlebarIconDesc', 'Upload an image logo. If no image is uploaded or if removed, the system defaults to the emoji below.')}
                </p>
              </div>
              <span 
                className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: isTitlebarImageActive ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: isTitlebarImageActive ? 'var(--color-emerald)' : 'var(--color-primary)'
                }}
              >
                {isTitlebarImageActive ? t('admin.activeUploadedImage', 'Active: Uploaded Image') : t('admin.activeDefaultEmoji', 'Active: Default Emoji')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      backgroundColor: 'var(--color-inner-dark)', 
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Upload className="h-4 w-4" /> {t('common.uploadImage', 'Upload Image')}
                  </button>
                  {titlebarImage && (
                    <button
                      type="button"
                      onClick={() => setTitlebarImage('')}
                      className="px-3 py-2 border rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition text-red-500 border-red-500/30 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> {t('admin.revertToEmoji', 'Revert to Emoji')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.defaultEmojiFallback', 'Default Emoji (Fallback)')}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    id="site_titlebar_emoji_setting"
                    name="site_titlebar_emoji_setting"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={titlebarEmoji} 
                    onChange={(e) => setTitlebarEmoji(e.target.value)} 
                    maxLength={4} 
                    className="w-20 text-center text-xl border rounded-xl py-1.5 font-bold outline-none" 
                    style={{ 
                      backgroundColor: 'var(--color-inner-dark)', 
                      borderColor: 'var(--color-border)', 
                      color: 'var(--color-text)' 
                    }} 
                  />
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('admin.defaultEmojiDesc', 'Used whenever no custom image is supplied.')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-[11px] block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.sidebarHeaderPreview', 'Sidebar & Header Preview:')}
              </span>
              <div 
                className="flex items-center gap-2.5 p-3 rounded-2xl border w-fit" 
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)' 
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

          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {t('admin.browserFavicon', 'Browser Favicon')}
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.browserFaviconDesc', 'Upload an icon for browser tabs (PNG, ICO, SVG). If no image is uploaded, defaults to emoji.')}
                </p>
              </div>
              <span 
                className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: isFaviconImageActive ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: isFaviconImageActive ? 'var(--color-emerald)' : 'var(--color-primary)'
                }}
              >
                {isFaviconImageActive ? t('admin.activeUploadedFavicon', 'Active: Uploaded Favicon') : t('admin.activeDefaultEmoji', 'Active: Default Emoji')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      backgroundColor: 'var(--color-inner-dark)', 
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <Upload className="h-4 w-4" /> {t('common.uploadFavicon', 'Upload Favicon')}
                  </button>
                  {faviconImage && (
                    <button
                      type="button"
                      onClick={() => setFaviconImage('')}
                      className="px-3 py-2 border rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition text-red-500 border-red-500/30 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> {t('admin.revertToEmoji', 'Revert to Emoji')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.defaultFaviconEmoji', 'Default Favicon Emoji (Fallback)')}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    id="site_favicon_emoji_setting"
                    name="site_favicon_emoji_setting"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={faviconEmoji} 
                    onChange={(e) => setFaviconEmoji(e.target.value)} 
                    maxLength={4} 
                    className="w-20 text-center text-xl border rounded-xl py-1.5 font-bold outline-none" 
                    style={{ 
                      backgroundColor: 'var(--color-inner-dark)', 
                      borderColor: 'var(--color-border)', 
                      color: 'var(--color-text)' 
                    }} 
                  />
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('admin.defaultFaviconDesc', 'Converts dynamically into an SVG favicon if no image is uploaded.')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-[11px] block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.browserTabPreview', 'Browser Tab Appearance Preview:')}
              </span>
              <div 
                className="max-w-xs border rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm"
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
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
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-6 text-xs" 
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    {t('admin.themeSettings', 'Complete Theme Color & Palette Settings')}
                  </h2>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.themeSettingsDesc', 'Customize primary accents, interactive hovers, navigation icons, surfaces, borders, and typography.')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.primary', 'Primary')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: primaryColor, borderColor: 'var(--color-border)' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.accent', 'Accent')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: accentColor, borderColor: 'var(--color-border)' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.sidebarIcon', 'Sidebar Icon')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: sidebarIconColor, borderColor: 'var(--color-border)' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.bg', 'Bg')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: backgroundColor, borderColor: 'var(--color-border)' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.card', 'Card')}:</span>
                  <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: cardBackgroundColor, borderColor: 'var(--color-border)' }} />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block font-bold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
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
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.sidebarIcon || preset.accent }} />
                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: preset.background, borderColor: 'var(--color-border)' }} />
                      </div>
                      <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: 'var(--color-text)' }}>
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Colors */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.brandColors', 'Brand & Interaction Colors')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <input 
                      type="text" 
                      id="theme_primary_color"
                      name="theme_primary_color"
                      value={primaryColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(val, primaryHoverColor, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <input 
                      type="text" 
                      id="theme_primary_hover_color"
                      name="theme_primary_hover_color"
                      value={primaryHoverColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrimaryHoverColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, val, accentColor, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <input 
                      type="text" 
                      id="theme_accent_color"
                      name="theme_accent_color"
                      value={accentColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccentColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, val, sidebarIconColor, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <input 
                      type="text" 
                      id="theme_sidebar_icon_color"
                      name="theme_sidebar_icon_color"
                      value={sidebarIconColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSidebarIconColor(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          applyColorsLocally(primaryColor, primaryHoverColor, accentColor, val, backgroundColor, cardBackgroundColor, cardBorderColor, secondaryTextColor);
                        }
                      }}
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Surfaces & Container Colors */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.surfacesBordersTypography', 'Surfaces, Borders & Typography')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      style={{ borderColor: 'var(--color-border)' }}
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
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('admin.cardBackground', 'Card Background')}
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
                      style={{ borderColor: 'var(--color-border)' }}
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
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('admin.containerBorderColor', 'Container Border')}
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
                      style={{ borderColor: 'var(--color-border)' }}
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
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold" style={{ color: 'var(--color-text-secondary)' }}>
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
                      style={{ borderColor: 'var(--color-border)' }}
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
                      className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 3: FONT SETTING */}
        <div className={activeTab === 'font' ? 'space-y-6' : 'hidden'}>
          <div 
            className="border rounded-3xl p-6 shadow-xl space-y-6 text-xs" 
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    {t('admin.globalTypographySettings', 'Global Typography & Font Settings')}
                  </h2>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.globalTypographyDesc', 'Select your site-wide typography font family, base scaling, and heading tracking. Changes apply across the entire project.')}
                </p>
              </div>
              <div 
                className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5"
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-primary)'
                }}
              >
                <span>{t('admin.activeFont', 'Active Font')}:</span>
                <span className="font-extrabold">{fontFamily}</span>
              </div>
            </div>

            {/* Font Family Selection Cards */}
            <div className="space-y-2.5">
              <label className="block font-bold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.fontFamilyOptions', 'Font Family Selection')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {FONT_OPTIONS.map((font) => {
                  const isSelected = fontFamily.toLowerCase() === font.id.toLowerCase();
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => handleFontSelect(font.id)}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                        isSelected ? 'ring-2 ring-[var(--color-primary)] shadow-md' : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        fontFamily: font.family
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                          {font.name}
                        </span>
                        {isSelected && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1"
                            style={{ 
                              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                              color: 'var(--color-emerald)',
                              border: '1px solid var(--color-emerald)'
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" /> {t('common.selected', 'Selected')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mb-3 opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                        {font.description}
                      </p>
                      <div 
                        className="text-xs font-medium truncate pt-2 border-t"
                        style={{ 
                          borderColor: 'var(--color-border)', 
                          color: 'var(--color-text)' 
                        }}
                      >
                        ABCDEFGHIJKLM 1234567890
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizing & Letter Spacing Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {/* Base Font Size */}
              <div className="space-y-2">
                <label className="block font-bold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.baseFontSize', 'Base Font Size Scaling')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_SIZES.map((size) => {
                    const isSelected = fontSize === size.id;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => handleFontSizeSelect(size.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                          isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                        }}
                      >
                        <span className="font-extrabold text-xs" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {size.label}
                        </span>
                        <span className="text-[10px] opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                          {size.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Letter Spacing */}
              <div className="space-y-2">
                <label className="block font-bold text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.letterSpacing', 'Heading Letter Spacing (Tracking)')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LETTER_SPACINGS.map((spacing) => {
                    const isSelected = fontLetterSpacing === spacing.id;
                    return (
                      <button
                        key={spacing.id}
                        type="button"
                        onClick={() => handleLetterSpacingSelect(spacing.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                          isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                        }}
                      >
                        <span className="font-extrabold text-xs" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {spacing.label}
                        </span>
                        <span className="text-[10px] opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                          {spacing.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Interactive Typography Preview */}
            <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-[11px] block" style={{ color: 'var(--color-text-secondary)' }}>
                {t('admin.liveFontPreview', 'Live Typography Sandbox Preview:')}
              </span>
              <div 
                className="p-5 rounded-3xl border transition-colors space-y-4 shadow-inner"
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)' 
                }}
              >
                <div className="space-y-1">
                  <div 
                    className="text-2xl font-black tracking-tight"
                    style={{ 
                      color: 'var(--color-primary)',
                      letterSpacing: fontLetterSpacing
                    }}
                  >
                    Heading 1: Culinary Innovation Powered by AI
                  </div>
                  <div 
                    className="text-lg font-bold"
                    style={{ 
                      color: 'var(--color-text)',
                      letterSpacing: fontLetterSpacing
                    }}
                  >
                    Heading 2: Tailored Weekly Meal Plans & Automated Nutrition
                  </div>
                </div>

                <p 
                  className="leading-relaxed"
                  style={{ 
                    color: 'var(--color-text-secondary)',
                    fontSize: fontSize 
                  }}
                >
                  This live preview box demonstrates paragraph text rendered using your chosen font ({fontFamily}), base size ({fontSize}), and heading tracking ({fontLetterSpacing}). All buttons, badges, tables, and navigation drawers across the application immediately inherit these font rules.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button 
                    type="button" 
                    className="px-4 py-2 rounded-xl text-white font-extrabold text-xs shadow-md transition"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {t('admin.samplePrimaryBtn', 'Primary Action')}
                  </button>
                  <div 
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold"
                    style={{ 
                      backgroundColor: 'var(--color-card)', 
                      borderColor: 'var(--color-border)', 
                      color: accentColor 
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> {t('admin.sampleBadge', 'Active Preset Badge')}
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    $1,249.00 / mo
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
            disabled={isSaving}
            className="px-4 py-2.5 border rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition hover:opacity-80 shadow-xs disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className="h-4 w-4" /> {t('admin.resetDefaults', 'Reset to Defaults')}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t('admin.saving', 'Saving...')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {activeTab === 'theme' 
                    ? t('admin.saveThemeSettings', 'Save Theme Settings') 
                    : activeTab === 'font'
                    ? t('admin.saveFontSettings', 'Save Font Settings')
                    : t('admin.saveBrandingSettings', 'Save Branding Settings')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
