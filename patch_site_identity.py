import os
import glob
import re

# 1. Locate active project directories
app_candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in app_candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/siteConfig.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')
components_dir = os.path.join(base_dir, 'components')
os.makedirs(lib_dir, exist_ok=True)

# 2. Update lib/siteConfig.ts
site_config_path = os.path.join(lib_dir, 'siteConfig.ts')
site_config_code = """export const DEFAULT_SITE_NAME = 'Zecratary';
export const DEFAULT_SITE_ICON = '🥑';

export interface SiteIdentityConfig {
  siteName: string;
  titlebarEmoji: string;
  titlebarImage: string;
  faviconEmoji: string;
  faviconImage: string;
}

const DEFAULT_CONFIG: SiteIdentityConfig = {
  siteName: DEFAULT_SITE_NAME,
  titlebarEmoji: DEFAULT_SITE_ICON,
  titlebarImage: '',
  faviconEmoji: DEFAULT_SITE_ICON,
  faviconImage: ''
};

export function getSiteConfig(): SiteIdentityConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem('zecratary_site_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        siteName: parsed.siteName || parsed.name || DEFAULT_SITE_NAME,
        titlebarEmoji: parsed.titlebarEmoji || parsed.icon || DEFAULT_SITE_ICON,
        titlebarImage: parsed.titlebarImage || '',
        faviconEmoji: parsed.faviconEmoji || parsed.titlebarEmoji || parsed.icon || DEFAULT_SITE_ICON,
        faviconImage: parsed.faviconImage || ''
      };
    }
  } catch (_) {}
  return DEFAULT_CONFIG;
}

export function getSiteName(): string {
  return getSiteConfig().siteName;
}

export function getSiteIcon(): string {
  const cfg = getSiteConfig();
  return cfg.titlebarImage || cfg.titlebarEmoji || DEFAULT_SITE_ICON;
}

export function getFavicon(): string {
  const cfg = getSiteConfig();
  return cfg.faviconImage || cfg.faviconEmoji || cfg.titlebarImage || cfg.titlebarEmoji || DEFAULT_SITE_ICON;
}

export function updateFavicon(iconOrUrl?: string) {
  if (typeof window === 'undefined') return;
  const target = iconOrUrl || getFavicon();
  let href = target;

  if (
    !target.startsWith('data:') && 
    !target.startsWith('http://') && 
    !target.startsWith('https://') && 
    !target.startsWith('/')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${target}</text></svg>`;
    href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;

  let shortcut = document.querySelector<HTMLLinkElement>("link[rel~='shortcut icon']");
  if (shortcut) {
    shortcut.href = href;
  }
}

export function saveSiteConfig(config: Partial<SiteIdentityConfig>) {
  if (typeof window === 'undefined') return;
  const current = getSiteConfig();
  const updated: SiteIdentityConfig = { ...current, ...config };
  localStorage.setItem('zecratary_site_settings', JSON.stringify(updated));
  localStorage.setItem('zecratary_site_name', updated.siteName);
  localStorage.setItem('zecratary_site_icon', updated.titlebarImage || updated.titlebarEmoji);
  
  window.dispatchEvent(new Event('zecratary_site_settings_changed'));
  window.dispatchEvent(new Event('storage'));
  updateFavicon(updated.faviconImage || updated.faviconEmoji || updated.titlebarEmoji);
}
"""
with open(site_config_path, 'w', encoding='utf-8') as f:
    f.write(site_config_code)
print(f"✓ Created / updated {site_config_path}")

# 3. Create / Update /admin/page.tsx (Site Identity & Branding)
admin_dir = os.path.join(app_dir, 'admin')
os.makedirs(admin_dir, exist_ok=True)
admin_page_path = os.path.join(admin_dir, 'page.tsx')

admin_page_code = """'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
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

export default function AdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);
  const [titlebarEmoji, setTitlebarEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [titlebarImage, setTitlebarImage] = useState<string>('');
  const [faviconEmoji, setFaviconEmoji] = useState<string>(DEFAULT_SITE_ICON);
  const [faviconImage, setFaviconImage] = useState<string>('');

  const titlebarFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

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
    setUser(active);

    const cfg = getSiteConfig();
    setSiteName(cfg.siteName);
    setTitlebarEmoji(cfg.titlebarEmoji);
    setTitlebarImage(cfg.titlebarImage);
    setFaviconEmoji(cfg.faviconEmoji);
    setFaviconImage(cfg.faviconImage);
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SiteIdentityConfig = {
      siteName: siteName.trim() || DEFAULT_SITE_NAME,
      titlebarEmoji: titlebarEmoji.trim() || DEFAULT_SITE_ICON,
      titlebarImage,
      faviconEmoji: faviconEmoji.trim() || DEFAULT_SITE_ICON,
      faviconImage
    };
    saveSiteConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset branding settings to defaults?')) return;
    setSiteName(DEFAULT_SITE_NAME);
    setTitlebarEmoji(DEFAULT_SITE_ICON);
    setTitlebarImage('');
    setFaviconEmoji(DEFAULT_SITE_ICON);
    setFaviconImage('');
    saveSiteConfig({
      siteName: DEFAULT_SITE_NAME,
      titlebarEmoji: DEFAULT_SITE_ICON,
      titlebarImage: '',
      faviconEmoji: DEFAULT_SITE_ICON,
      faviconImage: ''
    });
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
            Configure application name, titlebar logo, and browser tab favicon with automatic emoji fallbacks.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Branding Saved & Broadcasted
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

      {/* BRANDING FORM */}
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

        {/* SECTION 2: TITLEBAR BRAND ICON */}
        <div 
          className="border rounded-3xl p-6 shadow-xl space-y-4 text-xs" 
          style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                Titlebar & Sidebar Brand Icon
              </h2>
              <p className="text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
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
            {/* Image Upload Box */}
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

            {/* Emoji Fallback Box */}
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

          {/* Live Preview */}
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

        {/* SECTION 3: FAVICON */}
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
            {/* Favicon Upload Box */}
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

            {/* Favicon Emoji Fallback */}
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

          {/* Browser Tab Mockup Preview */}
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
print(f"✓ Created / updated {admin_page_path}")

# 4. Update Sidebar.tsx to handle both image URLs and emojis
sidebar_candidates = [
    os.path.join(components_dir, 'Sidebar.tsx'),
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((p for p in sidebar_candidates if os.path.exists(p)), None)

if sidebar_path:
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        sidebar_code = f.read()

    # Add helper isImageIcon if missing
    if 'isImageIcon' not in sidebar_code:
        insert_marker = "const displayName = mounted ? siteName : DEFAULT_SITE_NAME;"
        helper_def = """  const isImageIcon = (icon: string) => 
    typeof icon === 'string' && (icon.startsWith('data:image') || icon.startsWith('/') || icon.startsWith('http://') || icon.startsWith('https://'));\n\n  """
        if insert_marker in sidebar_code:
            sidebar_code = sidebar_code.replace(insert_marker, helper_def + insert_marker)

        # Replace standard span renderings with image checks
        # Mobile top bar icon
        sidebar_code = sidebar_code.replace(
            '<span className="text-2xl">{displayIcon}</span>',
            '{isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-8 h-8 object-contain rounded shrink-0" /> : <span className="text-2xl shrink-0">{displayIcon}</span>}'
        )

        with open(sidebar_path, 'w', encoding='utf-8') as f:
            f.write(sidebar_code)
        print(f"✓ Updated image rendering support in {sidebar_path}")
    else:
        print(f"✓ Sidebar already supports image icons: {sidebar_path}")

print("\n🚀 Patch successfully installed!")
