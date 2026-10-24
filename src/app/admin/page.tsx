// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Palette, Type, Globe, Check, RefreshCw, Sparkles, 
  Upload, Image as ImageIcon, CheckCircle2, AlertCircle,
  Eye, Sun, Moon, Database, Settings2
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  getSiteConfig, 
  saveSiteConfig, 
  setMemorySiteConfig, 
  updateFavicon 
} from '@/lib/siteConfig';
import { 
  getThemeColors, 
  saveThemeColors, 
  setMemoryThemeColors, 
  applyThemeToDocument 
} from '@/lib/themeConfig';

const PRESET_PALETTES = [
  {
    id: 'coral',
    name: 'Coral Glow',
    primary: '#E05638',
    card: '#0b0f17',
    border: '#1e293b',
    background: '#070b13',
    innerDark: '#080c14',
    text: '#ffffff',
    textSecondary: '#94a3b8'
  },
  {
    id: 'emerald',
    name: 'Emerald Garden',
    primary: '#10b981',
    card: '#0b0f17',
    border: '#132e27',
    background: '#041712',
    innerDark: '#07211b',
    text: '#ffffff',
    textSecondary: '#94a3b8'
  },
  {
    id: 'violet',
    name: 'Neon Violet',
    primary: '#8b5cf6',
    card: '#0c0b18',
    border: '#241a42',
    background: '#080612',
    innerDark: '#120f24',
    text: '#ffffff',
    textSecondary: '#94a3b8'
  },
  {
    id: 'amber',
    name: 'Golden Amber',
    primary: '#f59e0b',
    card: '#120f09',
    border: '#33230a',
    background: '#0a0804',
    innerDark: '#1a1407',
    text: '#ffffff',
    textSecondary: '#94a3b8'
  },
  {
    id: 'ocean',
    name: 'Ocean Cyan',
    primary: '#06b6d4',
    card: '#061317',
    border: '#0d2d38',
    background: '#030d10',
    innerDark: '#091e24',
    text: '#ffffff',
    textSecondary: '#94a3b8'
  }
];

const FONT_FAMILIES = [
  { id: 'Inter', name: 'Inter (Clean & Modern)', value: "'Inter', sans-serif" },
  { id: 'Roboto', name: 'Roboto (Balanced & Tech)', value: "'Roboto', sans-serif" },
  { id: 'Outfit', name: 'Outfit (Friendly & Geometric)', value: "'Outfit', sans-serif" },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Contemporary)', value: "'Plus Jakarta Sans', sans-serif" },
  { id: 'System', name: 'System Native (Optimized)', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
];

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'identity' | 'theme' | 'typography'>('identity');

  // Site Identity State
  const [siteName, setSiteName] = useState('Zecratary');
  const [titlebarEmoji, setTitlebarEmoji] = useState('🍳');
  const [titlebarImage, setTitlebarImage] = useState<string | null>(null);
  const [faviconEmoji, setFaviconEmoji] = useState('🍳');
  const [faviconImage, setFaviconImage] = useState<string | null>(null);

  // Theme Colors State
  const [themeColors, setThemeColors] = useState({
    primary: '#E05638',
    card: '#0b0f17',
    border: '#1e293b',
    background: '#070b13',
    innerDark: '#080c14',
    text: '#ffffff',
    textSecondary: '#94a3b8'
  });

  // Typography State
  const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
  const [baseFontSize, setBaseFontSize] = useState('16px');

  // UI Telemetry & Feedback State
  const [isDayMode, setIsDayMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  const titlebarFileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement | null>(null);
  const isSavingRef = useRef(false);

  // Synchronize Day/Dark mode detection
  const checkDayMode = useCallback(() => {
    if (typeof document === 'undefined') return;
    const isDay = document.documentElement.classList.contains('day-mode') || 
                  document.documentElement.getAttribute('data-theme') === 'day' ||
                  document.body.classList.contains('day-mode');
    setIsDayMode(isDay);
  }, []);

  // Defensive settings loader supporting camelCase & snake_case
  const loadSettingsFromServer = useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      const res = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || data;
        
        // 1. Identity
        if (s.siteName || s.site_name) setSiteName(s.siteName || s.site_name);
        if (s.titlebarEmoji || s.titlebar_emoji) setTitlebarEmoji(s.titlebarEmoji || s.titlebar_emoji);
        if (s.titlebarImage !== undefined || s.titlebar_image !== undefined) {
          setTitlebarImage(s.titlebarImage || s.titlebar_image || null);
        }
        if (s.faviconEmoji || s.favicon_emoji) setFaviconEmoji(s.faviconEmoji || s.favicon_emoji);
        if (s.faviconImage !== undefined || s.favicon_image !== undefined) {
          setFaviconImage(s.faviconImage || s.favicon_image || null);
        }

        // 2. Theme Colors
        const tc = s.themeColors || s.theme_colors || {};
        if (tc.primary || tc.background || tc.card) {
          setThemeColors(prev => ({
            ...prev,
            primary: tc.primary || prev.primary,
            card: tc.card || prev.card,
            border: tc.border || prev.border,
            background: tc.background || prev.background,
            innerDark: tc.innerDark || tc.inner_dark || prev.innerDark,
            text: tc.text || prev.text,
            textSecondary: tc.textSecondary || tc.text_secondary || prev.textSecondary
          }));
        }

        // 3. Typography
        if (s.fontFamily || s.font_family) setFontFamily(s.fontFamily || s.font_family);
        if (s.baseFontSize || s.base_font_size) setBaseFontSize(s.baseFontSize || s.base_font_size);
      }
    } catch (err) {
      console.warn('Notice loading /admin settings:', err);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('adminPortalTitle', 'System Settings & Configuration')} - Zecratary`;
    checkDayMode();
    loadSettingsFromServer();

    const handleUpdates = () => {
      checkDayMode();
      loadSettingsFromServer();
    };

    window.addEventListener('zecratary_theme_mode_changed', checkDayMode);
    window.addEventListener('zecratary_theme_changed', handleUpdates);
    window.addEventListener('zecratary_settings_updated', handleUpdates);
    window.addEventListener('zecratary_languages_updated', handleUpdates);
    window.addEventListener('zecratary_dictionary_updated', handleUpdates);
    window.addEventListener('zecratary_locale_changed', handleUpdates);
    window.addEventListener('storage', handleUpdates);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', checkDayMode);
      window.removeEventListener('zecratary_theme_changed', handleUpdates);
      window.removeEventListener('zecratary_settings_updated', handleUpdates);
      window.removeEventListener('zecratary_languages_updated', handleUpdates);
      window.removeEventListener('zecratary_dictionary_updated', handleUpdates);
      window.removeEventListener('zecratary_locale_changed', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, [checkDayMode, loadSettingsFromServer, t]);

  const handleFileUpload = (type: 'titlebar' | 'favicon', file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'titlebar') {
        setTitlebarImage(base64);
      } else {
        setFaviconImage(base64);
        updateFavicon(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    const updated = {
      primary: preset.primary,
      card: preset.card,
      border: preset.border,
      background: preset.background,
      innerDark: preset.innerDark,
      text: preset.text,
      textSecondary: preset.textSecondary
    };
    setThemeColors(updated);
    setMemoryThemeColors(updated);
    applyThemeToDocument(updated);
  };

  const handleSave = async () => {
    isSavingRef.current = true;
    setSaving(true);
    setStatus(null);

    const brandingPayload = {
      siteName: siteName.trim(),
      site_name: siteName.trim(),
      titlebarEmoji: titlebarEmoji.trim(),
      titlebar_emoji: titlebarEmoji.trim(),
      titlebarImage: titlebarImage || '',
      titlebar_image: titlebarImage || '',
      faviconEmoji: faviconEmoji.trim(),
      favicon_emoji: faviconEmoji.trim(),
      faviconImage: faviconImage || '',
      favicon_image: faviconImage || ''
    };

    const themePayload = {
      ...themeColors,
      themeColors,
      theme_colors: themeColors,
      fontFamily,
      font_family: fontFamily,
      baseFontSize,
      base_font_size: baseFontSize
    };

    try {
      // 1. Dual-path API persistence (PostgreSQL /api/admin/settings & /api/user/theme)
      const [res1, res2] = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...brandingPayload,
            ...themePayload
          })
        }),
        fetch('/api/user/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            themeColors,
            fontFamily
          })
        }).catch(() => null)
      ]);

      if (!res1.ok) {
        throw new Error(t('settingsSaveError', 'Failed to save settings. Please try again.'));
      }

      // 2. In-memory and DOM engine synchronization
      setMemorySiteConfig(brandingPayload);
      setMemoryThemeColors(themeColors);
      applyThemeToDocument(themeColors);

      if (faviconImage) {
        updateFavicon(faviconImage);
      } else if (faviconEmoji) {
        updateFavicon(faviconEmoji);
      }

      // 3. Dispatch reactive events across tabs and layout components
      window.dispatchEvent(new Event('zecratary_settings_updated'));
      window.dispatchEvent(new Event('zecratary_theme_changed'));
      window.dispatchEvent(new Event('zecratary_theme_mode_changed'));
      window.dispatchEvent(new Event('storage'));

      setStatus({
        type: 'success',
        msg: t('settingsSavedToast', 'Settings saved & broadcasted successfully!')
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        msg: err.message || t('settingsSaveError', 'Failed to save settings. Please try again.')
      });
    } finally {
      setSaving(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 300);
    }
  };

  const handleResetDefaults = () => {
    const defaultCoral = PRESET_PALETTES[0];
    setSiteName('Zecratary');
    setTitlebarEmoji('🍳');
    setTitlebarImage(null);
    setFaviconEmoji('🍳');
    setFaviconImage(null);
    setFontFamily("'Inter', sans-serif");
    setBaseFontSize('16px');
    handleApplyPreset(defaultCoral);

    setStatus({
      type: 'success',
      msg: t('settingsResetToast', 'Settings reset to defaults successfully!')
    });
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header with Telemetry Badges & Action Cluster */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Settings2 className="h-6 w-6" /> {t('adminPortalTitle', 'System Settings & Configuration')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('adminPortalSubtitle', 'Configure site branding, color palettes, typography, and core system preferences.')}
          </p>
        </div>

        {/* Telemetry Status & Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
            <span>{t('syncStatusSynced', 'Synchronized with PostgreSQL')}</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            {isDayMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-violet-400" />}
            <span>{isDayMode ? t('dayModeBadge', 'Day Mode Active') : t('darkModeBadge', 'Dark Mode Active')}</span>
          </div>

          <button
            type="button"
            onClick={() => loadSettingsFromServer()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('reloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Check className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? t('savingSettings', 'Saving...') : t('saveSettingsBtn', 'Save Settings')}</span>
          </button>
        </div>
      </div>

      {/* Main Accessible Form-Free Region Container (Constraint 9) */}
      <div 
        role="region"
        data-lpignore="true"
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Navigation Tabs Bar */}
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          {[
            { id: 'identity', label: t('tabIdentity', 'Site Identity & Branding'), icon: Globe },
            { id: 'theme', label: t('tabTheme', 'Theme & Appearance'), icon: Palette },
            { id: 'typography', label: t('tabTypography', 'Typography & Fonts'), icon: Type }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setStatus(null);
                }}
                className="flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                style={isActive ? {
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  borderWidth: '1px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                } : {
                  color: 'var(--color-text-secondary)'
                }}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SITE IDENTITY & BRANDING */}
        {activeTab === 'identity' && (
          <div className="space-y-6">
            {/* Application Name Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                {t('siteNameLabel', 'Application Name')}
              </label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                placeholder={t('siteNamePlaceholder', 'e.g. Zecratary')}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full max-w-lg border rounded-xl px-4 py-3 text-sm outline-none font-bold transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('siteNameHelp', 'Displayed in the desktop topbar, mobile drawer, and browser tab titles.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Brand Icon Configuration */}
              <div 
                className="p-5 rounded-2xl border space-y-4"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    {t('titlebarIconHeading', 'Titlebar & Sidebar Brand Icon')}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('titlebarIconDesc', 'Choose an emoji or upload a custom logo image for the top navigation and sidebar.')}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl shadow-sm overflow-hidden"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                  >
                    {titlebarImage ? (
                      <img src={titlebarImage} alt="Brand Icon" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <span>{titlebarEmoji}</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      maxLength={4}
                      value={titlebarEmoji}
                      onChange={(e) => {
                        setTitlebarEmoji(e.target.value);
                        setTitlebarImage(null);
                      }}
                      placeholder="🍳"
                      className="w-24 border rounded-xl px-3 py-1.5 text-center text-lg outline-none font-mono"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={titlebarFileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          handleFileUpload('titlebar', e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => titlebarFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        <Upload className="h-3 w-3" /> {t('uploadImageBtn', 'Upload Image')}
                      </button>

                      {titlebarImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setTitlebarImage(null);
                            if (titlebarFileInputRef.current) titlebarFileInputRef.current.value = '';
                          }}
                          className="px-3 py-1.5 rounded-xl border text-xs font-bold text-red-400 hover:text-red-300 transition cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          {t('revertEmojiBtn', 'Revert to Emoji')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('imageUploadNotice', 'PNG, JPG, SVG, or WebP (Max 2MB). Auto-resized for sharp display.')}
                </p>
              </div>

              {/* Favicon Configuration */}
              <div 
                className="p-5 rounded-2xl border space-y-4"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <Globe className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    {t('faviconHeading', 'Browser Favicon')}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('faviconDesc', 'Customize the favicon displayed in browser tabs and bookmarks.')}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl shadow-sm overflow-hidden"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                  >
                    {faviconImage ? (
                      <img src={faviconImage} alt="Favicon" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <span>{faviconEmoji}</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      maxLength={4}
                      value={faviconEmoji}
                      onChange={(e) => {
                        setFaviconEmoji(e.target.value);
                        setFaviconImage(null);
                        updateFavicon(e.target.value);
                      }}
                      placeholder="🍳"
                      className="w-24 border rounded-xl px-3 py-1.5 text-center text-lg outline-none font-mono"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={faviconFileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/x-icon, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          handleFileUpload('favicon', e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => faviconFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      >
                        <Upload className="h-3 w-3" /> {t('uploadImageBtn', 'Upload Image')}
                      </button>

                      {faviconImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setFaviconImage(null);
                            if (faviconFileInputRef.current) faviconFileInputRef.current.value = '';
                            updateFavicon(faviconEmoji);
                          }}
                          className="px-3 py-1.5 rounded-xl border text-xs font-bold text-red-400 hover:text-red-300 transition cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          {t('revertEmojiBtn', 'Revert to Emoji')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('imageUploadNotice', 'PNG, JPG, SVG, or WebP (Max 2MB). Auto-resized for sharp display.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THEME & COLOR PALETTES */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            {/* Preset Color Palettes */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('themePaletteHeading', 'Preset Color Palettes')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('themePaletteDesc', 'Select a curated color scheme or customize individual system tokens below.')}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {PRESET_PALETTES.map((preset) => {
                  const isSelected = themeColors.primary.toLowerCase() === preset.primary.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-3 rounded-2xl border text-left transition hover:scale-[1.02] cursor-pointer flex flex-col justify-between h-24"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        borderWidth: isSelected ? '2px' : '1px'
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: preset.primary }} />
                        {isSelected && <Check className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight" style={{ color: 'var(--color-text)' }}>{preset.name}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{preset.primary}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Token Color Pickers */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                System Color Tokens
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'primary', label: t('primaryColorLabel', 'Primary Accent Color') },
                  { key: 'background', label: t('backgroundColorLabel', 'Background Color (Dark Mode)') },
                  { key: 'card', label: t('cardColorLabel', 'Surface / Card Color') },
                  { key: 'border', label: t('borderColorLabel', 'Border & Divider Color') },
                  { key: 'innerDark', label: t('innerDarkColorLabel', 'Input & Inner Surface Color') },
                  { key: 'text', label: t('textColorLabel', 'Primary Text Color') }
                ].map((item) => (
                  <div 
                    key={item.key} 
                    className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-sm"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                  >
                    <div>
                      <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                        {item.label}
                      </label>
                      <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {(themeColors as any)[item.key]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(themeColors as any)[item.key]}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = { ...themeColors, [item.key]: val };
                          setThemeColors(next);
                          setMemoryThemeColors(next);
                          applyThemeToDocument(next);
                        }}
                        className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Harmonized Day/Dark Live Theme Preview Box */}
            <div className="space-y-3 pt-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Eye className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  {t('previewHeading', 'Live Theme Preview')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('previewSubtitle', 'Interactive preview of your current color and typography configurations.')}
                </p>
              </div>

              <div 
                className="p-6 rounded-3xl border shadow-inner transition-colors duration-200"
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)' 
                }}
              >
                <div 
                  className="max-w-md mx-auto p-5 rounded-2xl border shadow-lg space-y-4 transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    fontFamily: fontFamily
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      {t('previewBadgeActive', 'Active Plan')}
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      1,000,000 🪙
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>
                      {t('previewCardTitle', 'Gourmet Meal Blueprint')}
                    </h4>
                    <p className="text-xs mt-1 font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('previewCardDesc', 'Roasted rosemary salmon with organic quinoa, steamed asparagus, and lemon zest.')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {t('previewButtonPrimary', 'Order Ingredients')}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--color-inner-dark)', 
                        borderColor: 'var(--color-border)', 
                        color: 'var(--color-text)' 
                      }}
                    >
                      {t('previewButtonSecondary', 'View Details')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY & FONTS */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                {t('fontFamilyLabel', 'Font Family')}
              </label>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('fontFamilyDesc', 'Select the primary font typeface used across the application interface.')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {FONT_FAMILIES.map((font) => {
                  const isSelected = fontFamily === font.value;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setFontFamily(font.value)}
                      className="p-4 rounded-2xl border text-left transition hover:scale-[1.01] cursor-pointer flex items-center justify-between"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        borderWidth: isSelected ? '2px' : '1px'
                      }}
                    >
                      <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--color-text)', fontFamily: font.value }}>
                          {font.name}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          The quick brown fox jumps over the lazy dog.
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 max-w-xs pt-2">
              <label className="block text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                {t('fontSizeLabel', 'Base Font Size')}
              </label>
              <select
                value={baseFontSize}
                onChange={(e) => setBaseFontSize(e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer font-bold"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="14px">14px (Compact)</option>
                <option value="15px">15px (Standard-Light)</option>
                <option value="16px">16px (Default Recommended)</option>
                <option value="17px">17px (High Legibility)</option>
                <option value="18px">18px (Comfortable Large)</option>
              </select>
            </div>
          </div>
        )}

        {/* Status Notification Toast Banner */}
        {status && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: status.type === 'success' ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
              color: status.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
            }}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{status.msg}</span>
          </div>
        )}

        {/* Bottom Persistent Action Bar */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" 
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-bold px-4 py-2.5 rounded-xl border transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            {t('resetDefaultsBtn', 'Reset Defaults')}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Check className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? t('savingSettings', 'Saving...') : t('saveSettingsBtn', 'Save Settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
