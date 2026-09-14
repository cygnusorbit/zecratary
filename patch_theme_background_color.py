import os
import glob
import re

# 1. Locate App Router and lib directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/layout.tsx', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        app_dir = os.path.dirname(matches[0])

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')
os.makedirs(lib_dir, exist_ok=True)

# 2. Update lib/themeConfig.ts to bind background color to CSS variables and DOM
theme_config_path = os.path.join(lib_dir, 'themeConfig.ts')
theme_config_code = """export interface ThemeColors {
  primary?: string;
  primaryColor?: string;
  primaryHover?: string;
  accentEmerald?: string;
  accentColor?: string;
  accent?: string;
  backgroundColor?: string;
  backgroundDark?: string;
  cardBackground?: string;
  cardBorder?: string;
}

export function applyThemeToDocument(colors: ThemeColors | null | undefined): void {
  if (!colors || typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDayMode = localStorage.getItem('zecratary_theme_mode') === 'light';

  const primary = colors.primary || colors.primaryColor;
  const primaryHover = colors.primaryHover;
  const accent = colors.accentEmerald || colors.accentColor || colors.accent;
  const bg = colors.backgroundColor || colors.backgroundDark;

  if (primary) {
    root.style.setProperty('--color-primary', primary);
  }
  if (primaryHover) {
    root.style.setProperty('--color-primary-hover', primaryHover);
  }
  if (accent) {
    root.style.setProperty('--color-emerald', accent);
    root.style.setProperty('--color-accent', accent);
  }
  if (bg && !isDayMode) {
    root.style.setProperty('--color-bg', bg);
    root.style.setProperty('--color-bg-dark', bg);
    if (document.body) {
      document.body.style.backgroundColor = bg;
    }
  }
  if (colors.cardBackground && !isDayMode) {
    root.style.setProperty('--color-card', colors.cardBackground);
    root.style.setProperty('--color-card-dark', colors.cardBackground);
  }
  if (colors.cardBorder && !isDayMode) {
    root.style.setProperty('--color-border', colors.cardBorder);
  }
}

export function saveThemeColors(colors: ThemeColors): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
    localStorage.setItem('zecratary_theme_config', JSON.stringify(colors));
  } catch (_) {}

  applyThemeToDocument(colors);
  window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
  window.dispatchEvent(new CustomEvent('zecratary_theme_updated', { detail: colors }));
  window.dispatchEvent(new Event('storage'));

  try {
    fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColors: colors })
    }).catch(() => {});
  } catch (_) {}
}

export async function fetchAndApplyServerTheme(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const cached = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
    if (cached) {
      applyThemeToDocument(JSON.parse(cached));
    }
  } catch (_) {}

  try {
    const res = await fetch('/api/system-settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings?.themeColors) {
        const colors = data.settings.themeColors;
        localStorage.setItem('zecratary_theme_colors', JSON.stringify(colors));
        applyThemeToDocument(colors);
        window.dispatchEvent(new CustomEvent('zecratary_theme_changed', { detail: colors }));
      }
    }
  } catch (_) {}
}
"""
with open(theme_config_path, 'w', encoding='utf-8') as f:
    f.write(theme_config_code)
print(f"✓ Updated themeConfig helper at: {theme_config_path}")

# 3. Update /admin/page.tsx to expose background color picker and presets
admin_page_path = os.path.join(app_dir, 'admin', 'page.tsx')
admin_page_code = """'use client';

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
  Languages
} from 'lucide-react';
import { getCurrentUser, initAuthStorage, User } from '@/lib/auth';
import { 
  getSiteConfig, 
  saveSiteConfig, 
  updateFavicon, 
  SiteIdentityConfig, 
  DEFAULT_SITE_NAME, 
  DEFAULT_SITE_ICON 
} from '@/lib/siteConfig';
import { applyThemeToDocument, saveThemeColors } from '@/lib/themeConfig';

const PRESET_PALETTES = [
  { name: 'Zecratary Coral', primary: '#E05638', primaryHover: '#c94529', accent: '#10b981', background: '#070b13' },
  { name: 'Emerald Forest', primary: '#10b981', primaryHover: '#059669', accent: '#3b82f6', background: '#06130d' },
  { name: 'Cyber Blue', primary: '#2563eb', primaryHover: '#1d4ed8', accent: '#10b981', background: '#080d1a' },
  { name: 'Royal Purple', primary: '#8b5cf6', primaryHover: '#7c3aed', accent: '#ec4899', background: '#0f081c' },
  { name: 'Amber Gold', primary: '#f59e0b', primaryHover: '#d97706', accent: '#10b981', background: '#120d04' },
  { name: 'Deep Midnight', primary: '#38bdf8', primaryHover: '#0284c7', accent: '#a855f7', background: '#020617' },
];

export default function AdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Site Identity State
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [titlebarEmoji, setTitlebarEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [titlebarImage, setTitlebarImage] = useState<string>('');
  const [faviconEmoji, setFaviconEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [faviconImage, setFaviconImage] = useState<string>('');

  // Theme Color State
  const [primaryColor, setPrimaryColor] = useState<string>('#E05638');
  const [primaryHoverColor, setPrimaryHoverColor] = useState<string>('#c94529');
  const [accentColor, setAccentColor] = useState<string>('#10b981');
  const [backgroundColor, setBackgroundColor] = useState<string>('#070b13');

  const titlebarFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  const applyColorsLocally = (primary: string, hover: string, accent: string, bg: string) => {
    applyThemeToDocument({
      primary,
      primaryHover: hover,
      accentEmerald: accent,
      accentColor: accent,
      backgroundColor: bg,
      backgroundDark: bg
    });
  };

  const syncTheme = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        if (c.primary || c.primaryColor) setPrimaryColor(c.primary || c.primaryColor);
        if (c.primaryHover) setPrimaryHoverColor(c.primaryHover);
        if (c.accentEmerald || c.accentColor || c.accent) setAccentColor(c.accentEmerald || c.accentColor || c.accent);
        if (c.backgroundColor || c.backgroundDark) setBackgroundColor(c.backgroundColor || c.backgroundDark);
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
    setUser(active);

    const cfg = getSiteConfig();
    setSiteName(cfg.siteName);
    setTitlebarEmoji(cfg.titlebarEmoji);
    setTitlebarImage(cfg.titlebarImage);
    setFaviconEmoji(cfg.faviconEmoji);
    setFaviconImage(cfg.faviconImage);

    fetch('/api/system-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.settings?.themeColors) {
          const tc = data.settings.themeColors;
          const p = tc.primary || tc.primaryColor || '#E05638';
          const ph = tc.primaryHover || '#c94529';
          const ac = tc.accentEmerald || tc.accentColor || tc.accent || '#10b981';
          const bg = tc.backgroundColor || tc.backgroundDark || '#070b13';
          setPrimaryColor(p);
          setPrimaryHoverColor(ph);
          setAccentColor(ac);
          setBackgroundColor(bg);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'titlebar' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds the 2MB limit.');
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
    setBackgroundColor(preset.background);
    applyColorsLocally(preset.primary, preset.primaryHover, preset.accent, preset.background);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBranding: SiteIdentityConfig = {
      siteName: siteName.trim() || DEFAULT_SITE_NAME,
      titlebarEmoji: titlebarEmoji.trim() || DEFAULT_SITE_ICON,
      titlebarImage,
      faviconEmoji: faviconEmoji.trim() || DEFAULT_SITE_ICON,
      faviconImage
    };
    saveSiteConfig(updatedBranding);

    const themeColors = {
      primary: primaryColor,
      primaryColor: primaryColor,
      primaryHover: primaryHoverColor,
      accentEmerald: accentColor,
      accentColor: accentColor,
      accent: accentColor,
      backgroundColor: backgroundColor,
      backgroundDark: backgroundColor,
    };

    saveThemeColors(themeColors);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset branding and theme settings to defaults?')) return;

    setSiteName(DEFAULT_SITE_NAME);
    setTitlebarEmoji(DEFAULT_SITE_ICON);
    setTitlebarImage('');
    setFaviconEmoji(DEFAULT_SITE_ICON);
    setFaviconImage('');

    setPrimaryColor('#E05638');
    setPrimaryHoverColor('#c94529');
    setAccentColor('#10b981');
    setBackgroundColor('#070b13');

    saveSiteConfig({
      siteName: DEFAULT_SITE_NAME,
      titlebarEmoji: DEFAULT_SITE_ICON,
      titlebarImage: '',
      faviconEmoji: DEFAULT_SITE_ICON,
      faviconImage: ''
    });

    const defaultColors = {
      primary: '#E05638',
      primaryColor: '#E05638',
      primaryHover: '#c94529',
      accentEmerald: '#10b981',
      accentColor: '#10b981',
      accent: '#10b981',
      backgroundColor: '#070b13',
      backgroundDark: '#070b13'
    };

    saveThemeColors(defaultColors);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isTitlebarImageActive = !!titlebarImage;
  const isFaviconImageActive = !!faviconImage;

  return (
    <div 
      className="max-w-5xl mx-auto space-y-8 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              Site Identity & Branding
            </h1>
          </div>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Configure application name, color themes, background tones, titlebar logo, and browser tab favicon.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Settings Saved & Broadcasted
          </div>
        )}
      </div>

      {/* QUICK ADMIN NAVIGATION CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Link 
          href="/admin/ai-settings" 
          className="p-3 rounded-2xl border transition hover:opacity-80 flex items-center gap-2.5 font-bold"
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <Cpu className="h-4 w-4 text-[var(--color-primary)]" />
          <span>AI Settings</span>
        </Link>
        <Link 
          href="/admin/users" 
          className="p-3 rounded-2xl border transition hover:opacity-80 flex items-center gap-2.5 font-bold"
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <Users className="h-4 w-4 text-[var(--color-primary)]" />
          <span>Users</span>
        </Link>
        <Link 
          href="/admin/plans" 
          className="p-3 rounded-2xl border transition hover:opacity-80 flex items-center gap-2.5 font-bold"
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <CreditCard className="h-4 w-4 text-[var(--color-primary)]" />
          <span>Plans</span>
        </Link>
        <Link 
          href="/admin/social-login-setting" 
          className="p-3 rounded-2xl border transition hover:opacity-80 flex items-center gap-2.5 font-bold"
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <Key className="h-4 w-4 text-[var(--color-primary)]" />
          <span>Social Login</span>
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: SITE NAME */}
        <div 
          className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            Application Name
          </h2>
          <div>
            <label className="block font-bold mb-1" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              Display Name
            </label>
            <input 
              type="text" 
              value={siteName} 
              onChange={(e) => setSiteName(e.target.value)} 
              placeholder="e.g. Zecratary" 
              className="w-full sm:w-1/2 border rounded-xl px-3.5 py-2 font-bold outline-none" 
              style={{ 
                backgroundColor: isDayMode ? '#f8fafc' : '#070b13', 
                borderColor: isDayMode ? '#cbd5e1' : '#1e293b', 
                color: isDayMode ? '#0f172a' : '#ffffff' 
              }} 
            />
          </div>
        </div>

        {/* SECTION 2: THEME COLOR & BACKGROUND SETTING */}
        <div 
          className="border rounded-3xl p-6 shadow-xl space-y-5 text-xs" 
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  Theme Colors & Background Setting
                </h2>
              </div>
              <p className="text-[11px] mt-1" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                Customize the global primary, hover, accent, and application background colors.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Primary:</span>
                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: primaryColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Background:</span>
                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: backgroundColor, borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }} />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="block font-bold text-[11px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
              Color & Background Presets
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
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-700" style={{ backgroundColor: preset.background }} />
                    </div>
                    <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            {/* Primary Color */}
            <div className="space-y-1.5">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    applyColorsLocally(e.target.value, primaryHoverColor, accentColor, backgroundColor);
                  }}
                  className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
                <input 
                  type="text" 
                  value={primaryColor} 
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    applyColorsLocally(e.target.value, primaryHoverColor, accentColor, backgroundColor);
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
                Primary buttons and highlights.
              </span>
            </div>

            {/* Primary Hover Color */}
            <div className="space-y-1.5">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Primary Hover Color
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={primaryHoverColor} 
                  onChange={(e) => {
                    setPrimaryHoverColor(e.target.value);
                    applyColorsLocally(primaryColor, e.target.value, accentColor, backgroundColor);
                  }}
                  className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
                <input 
                  type="text" 
                  value={primaryHoverColor} 
                  onChange={(e) => {
                    setPrimaryHoverColor(e.target.value);
                    applyColorsLocally(primaryColor, e.target.value, accentColor, backgroundColor);
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
                Hover states on primary elements.
              </span>
            </div>

            {/* Accent Color */}
            <div className="space-y-1.5">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={accentColor} 
                  onChange={(e) => {
                    setAccentColor(e.target.value);
                    applyColorsLocally(primaryColor, primaryHoverColor, e.target.value, backgroundColor);
                  }}
                  className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
                <input 
                  type="text" 
                  value={accentColor} 
                  onChange={(e) => {
                    setAccentColor(e.target.value);
                    applyColorsLocally(primaryColor, primaryHoverColor, e.target.value, backgroundColor);
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
                Badges and secondary accents.
              </span>
            </div>

            {/* Background Color */}
            <div className="space-y-1.5">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Theme Background Color
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={backgroundColor} 
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    applyColorsLocally(primaryColor, primaryHoverColor, accentColor, e.target.value);
                  }}
                  className="w-9 h-9 rounded-xl border cursor-pointer p-0.5 bg-transparent shrink-0"
                  style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
                />
                <input 
                  type="text" 
                  value={backgroundColor} 
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    applyColorsLocally(primaryColor, primaryHoverColor, accentColor, e.target.value);
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
                Applies to pages and viewport background.
              </span>
            </div>
          </div>

          {/* Interactive Live Preview */}
          <div className="pt-3 border-t space-y-2" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
            <span className="font-bold text-[11px] block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Preview on Selected Background:
            </span>
            <div 
              className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border transition-colors" 
              style={{ backgroundColor: backgroundColor, borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}
            >
              <button 
                type="button" 
                className="px-4 py-2 rounded-xl text-white font-extrabold shadow-md transition"
                style={{ backgroundColor: primaryColor }}
              >
                Primary Button
              </button>
              <button 
                type="button" 
                className="px-4 py-2 rounded-xl text-white font-extrabold shadow-md transition"
                style={{ backgroundColor: primaryHoverColor }}
              >
                Hover State
              </button>
              <div 
                className="px-3 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5"
                style={{ 
                  backgroundColor: `${accentColor}18`, 
                  borderColor: `${accentColor}40`, 
                  color: accentColor 
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Accent Badge
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: TITLEBAR BRAND ICON */}
        <div 
          className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                Titlebar & Sidebar Brand Icon
              </h2>
              <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
                Upload an image logo. If no image is uploaded or if removed, the system defaults to the emoji below.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
              isTitlebarImageActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isTitlebarImageActive ? 'Active: Uploaded Image' : 'Active: Default Emoji'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Custom Logo Image (PNG, JPG, SVG, WebP)
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
                  <Upload className="h-4 w-4" /> Upload Image
                </button>
                {titlebarImage && (
                  <button
                    type="button"
                    onClick={() => setTitlebarImage('')}
                    className="px-3 py-2 border rounded-xl font-bold text-red-400 border-red-500/30 hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="h-4 w-4" /> Revert to Emoji
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Default Emoji (Fallback)
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
                  Used whenever no custom image is supplied.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
            <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Sidebar & Header Preview:
            </span>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border w-fit" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
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

        {/* SECTION 4: FAVICON */}
        <div 
          className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                Browser Favicon
              </h2>
              <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                Upload an icon for browser tabs (PNG, ICO, SVG). If no image is uploaded, defaults to emoji.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
              isFaviconImageActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isFaviconImageActive ? 'Active: Uploaded Favicon' : 'Active: Default Emoji'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Custom Favicon Image (PNG, ICO, SVG, WebP)
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
                  <Upload className="h-4 w-4" /> Upload Favicon
                </button>
                {faviconImage && (
                  <button
                    type="button"
                    onClick={() => setFaviconImage('')}
                    className="px-3 py-2 border rounded-xl font-bold text-red-400 border-red-500/30 hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="h-4 w-4" /> Revert to Emoji
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-bold" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                Default Favicon Emoji (Fallback)
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
                  Converts dynamically into an SVG favicon if no image is uploaded.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
            <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Browser Tab Appearance Preview:
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

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 border rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition hover:opacity-80"
            style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}
          >
            <RefreshCw className="h-4 w-4" /> Reset to Defaults
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
          >
            <CheckCircle2 className="h-4 w-4" /> Save Branding Settings
          </button>
        </div>
      </form>
    </div>
  );
}
"""

with open(admin_page_path, 'w', encoding='utf-8') as f:
    f.write(admin_page_code)
print(f"✓ Configured theme background picker at: {admin_page_path}")

print("\n🚀 Background color theme configuration installed successfully!")
