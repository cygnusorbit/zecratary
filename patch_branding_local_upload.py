import os
import glob
import re

# 1. Locate App Router directory
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

print(f"✓ Found App Router root: {app_dir}")

# 2. CREATE SERVER API ROUTE: /api/admin/upload-branding/route.ts
upload_api_dir = os.path.join(app_dir, 'api', 'admin', 'upload-branding')
os.makedirs(upload_api_dir, exist_ok=True)
upload_api_path = os.path.join(upload_api_dir, 'route.ts')

upload_api_code = """import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getUploadDirectories(): string[] {
  const cwd = process.cwd();
  const dirs: string[] = [];

  const candidatePublics = [
    path.join(cwd, 'apps', 'web', 'public'),
    path.join(cwd, 'public'),
    path.resolve(cwd, '..', 'public'),
    path.resolve(cwd, '..', 'apps', 'web', 'public')
  ];

  for (const pub of candidatePublics) {
    if (fs.existsSync(pub)) {
      dirs.push(path.join(pub, 'uploads'));
    }
  }

  if (dirs.length === 0) {
    const fallback = fs.existsSync(path.join(cwd, 'apps', 'web'))
      ? path.join(cwd, 'apps', 'web', 'public', 'uploads')
      : path.join(cwd, 'public', 'uploads');
    dirs.push(fallback);
  }

  return dirs;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetType = (formData.get('type') as string) || 'branding';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const origExt = path.extname(file.name || '').toLowerCase() || '.png';
    const cleanPrefix = targetType === 'favicon' ? 'favicon' : 'titlebar-logo';
    const fileName = `${cleanPrefix}-${Date.now()}${origExt}`;

    const uploadDirs = getUploadDirectories();
    for (const uDir of uploadDirs) {
      if (!fs.existsSync(uDir)) {
        fs.mkdirSync(uDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uDir, fileName), buffer);
    }

    const relativeUrl = `/uploads/${fileName}`;
    return NextResponse.json({
      success: true,
      url: relativeUrl,
      fileName
    });
  } catch (err: any) {
    console.error('Error uploading branding image:', err);
    return NextResponse.json({ success: false, error: err.message || 'Upload failed' }, { status: 500 });
  }
}
"""
with open(upload_api_path, 'w', encoding='utf-8') as f:
    f.write(upload_api_code)
print(f"✓ Provisioned upload handler at: {upload_api_path}")

# 3. UPDATE /admin/page.tsx TO UPLOAD TO PUBLIC DIRECTORY & PREVIEW URL
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
  Image as ImageIcon, 
  Cpu, 
  CreditCard, 
  Users, 
  Key,
  Loader2
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
  const [uploadingTarget, setUploadingTarget] = useState<'titlebar' | 'favicon' | null>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'titlebar' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setUploadingTarget(target);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', target);

      const res = await fetch('/api/admin/upload-branding', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        if (target === 'titlebar') {
          setTitlebarImage(data.url);
        } else {
          setFaviconImage(data.url);
        }
      } else {
        alert('Upload failed: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Error uploading file: ' + (err?.message || 'Network error'));
    } finally {
      setUploadingTarget(null);
      if (e.target) e.target.value = '';
    }
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
            Images are saved to the local public folder (`/uploads/`) with automatic emoji fallback support.
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
                Upload an image to store it into `/public/uploads/`. If removed, the application defaults to the fallback emoji.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
              isTitlebarImageActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isTitlebarImageActive ? 'Active: Local Image' : 'Active: Default Emoji'}
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
                  disabled={uploadingTarget === 'titlebar'}
                  onClick={() => titlebarFileRef.current?.click()}
                  className="px-4 py-2 border rounded-xl font-extrabold flex items-center gap-2 cursor-pointer transition hover:opacity-80 disabled:opacity-50"
                  style={{ 
                    backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', 
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  {uploadingTarget === 'titlebar' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingTarget === 'titlebar' ? 'Uploading...' : 'Upload Image'}
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
              {titlebarImage && (
                <p className="text-[10px] font-mono opacity-60 truncate">
                  Path: {titlebarImage}
                </p>
              )}
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
                  Used whenever no custom image is present.
                </span>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="pt-2 border-t" style={{ borderColor: isDayMode ? '#f1f5f9' : '#1e293b' }}>
            <span className="font-bold text-[11px] block mb-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
              Header / Sidebar Live Preview:
            </span>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border w-fit" style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
              {isTitlebarImageActive ? (
                <img src={titlebarImage} alt="Titlebar Logo" className="w-8 h-8 object-contain rounded shrink-0" />
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
                Upload an icon for browser tabs (saved to `/public/uploads/`). Defaults to emoji SVG if empty.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
              isFaviconImageActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isFaviconImageActive ? 'Active: Local Favicon' : 'Active: Default Emoji'}
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
                  disabled={uploadingTarget === 'favicon'}
                  onClick={() => faviconFileRef.current?.click()}
                  className="px-4 py-2 border rounded-xl font-extrabold flex items-center gap-2 cursor-pointer transition hover:opacity-80 disabled:opacity-50"
                  style={{ 
                    backgroundColor: isDayMode ? '#f1f5f9' : '#141b2d', 
                    borderColor: isDayMode ? '#cbd5e1' : '#1e293b',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  {uploadingTarget === 'favicon' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingTarget === 'favicon' ? 'Uploading...' : 'Upload Favicon'}
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
              {faviconImage && (
                <p className="text-[10px] font-mono opacity-60 truncate">
                  Path: {faviconImage}
                </p>
              )}
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
                  Converts dynamically into an SVG favicon if no file is uploaded.
                </span>
              </div>
            </div>
          </div>

          {/* Browser Tab Preview */}
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
print(f"✓ Updated admin branding page with local upload at: {admin_page_path}")

# 4. FIX SIDEBAR RENDERING TO DISPLAY <img /> INSTEAD OF PRINTING IMAGE STRINGS
sidebar_candidates = [
    os.path.join(components_dir, 'Sidebar.tsx'),
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((p for p in sidebar_candidates if os.path.exists(p)), None)

if sidebar_path:
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        sidebar_code = f.read()

    # Add isImageIcon helper if missing
    if 'const isImageIcon' not in sidebar_code:
        helper_code = """const isImageIcon = (icon?: unknown): icon is string => 
  typeof icon === 'string' && (
    icon.startsWith('/') || 
    icon.startsWith('http://') || 
    icon.startsWith('https://') || 
    icon.startsWith('data:image')
  );\n\n"""
        # Place before component definition
        comp_match = re.search(r'(export\s+default\s+function\s+Sidebar|export\s+function\s+Sidebar)', sidebar_code)
        if comp_match:
            sidebar_code = sidebar_code[:comp_match.start()] + helper_code + sidebar_code[comp_match.start():]
        else:
            sidebar_code = helper_code + sidebar_code

    # Replace all raw text renderings of displayIcon or siteIcon in spans or standalone JSX
    # Pattern 1: <span className="...">...{displayIcon}...</span>
    sidebar_code = re.sub(
        r'<span([^>]*)>\s*\{displayIcon\}\s*</span>',
        r'{isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : <span\1>{displayIcon}</span>}',
        sidebar_code
    )

    # Pattern 2: Naked {displayIcon} without image check
    # Avoid replacing if already guarded by isImageIcon
    naked_display = r'(?<!isImageIcon\(displayIcon\)\s\?\s)<img[^>]*>\s*:\s*\{displayIcon\}|\b(?<!isImageIcon\()\{displayIcon\}'
    
    # Simple check for naked occurrences:
    if '{isImageIcon(displayIcon)' not in sidebar_code:
        sidebar_code = sidebar_code.replace(
            '{displayIcon}',
            '{isImageIcon(displayIcon) ? <img src={displayIcon} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : <span className="text-2xl shrink-0">{displayIcon}</span>}'
        )

    with open(sidebar_path, 'w', encoding='utf-8') as f:
        f.write(sidebar_code)
    print(f"✓ Patched image icon rendering in {sidebar_path}")

print("\n🚀 Patch successfully applied! Uploads will now save locally into public/uploads/ and render as images.")
