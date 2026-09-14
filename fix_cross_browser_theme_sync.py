import os
import glob
import re

# 1. Discover App Router root and lib directories
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
components_dir = os.path.join(base_dir, 'components')
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')

os.makedirs(lib_dir, exist_ok=True)
os.makedirs(components_dir, exist_ok=True)
os.makedirs(data_dir, exist_ok=True)

# 2. Update /api/system-settings/route.ts to persist and serve themeColors with no-cache headers
sys_settings_dir = os.path.join(app_dir, 'api', 'system-settings')
os.makedirs(sys_settings_dir, exist_ok=True)
sys_settings_file = os.path.join(sys_settings_dir, 'route.ts')

sys_settings_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSettingsPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'system_settings.json');
}

const DEFAULT_SETTINGS = {
  themeMode: 'dark',
  themeColors: {
    primary: '#E05638',
    primaryHover: '#c94529',
    accentEmerald: '#10b981',
    backgroundColor: '#070b13',
    cardBackground: '#0b0f17',
    cardBorder: '#1e293b'
  },
  currency: 'USD',
  currencySymbol: '$',
  brandEmoji: '⚡',
  aiModel: 'gemini-1.5-flash'
};

export async function GET() {
  try {
    const sPath = getSettingsPath();
    let settings = { ...DEFAULT_SETTINGS };
    if (fs.existsSync(sPath)) {
      const raw = fs.readFileSync(sPath, 'utf-8');
      if (raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          settings = { ...DEFAULT_SETTINGS, ...parsed };
          if (parsed.themeColors) {
            settings.themeColors = { ...DEFAULT_SETTINGS.themeColors, ...parsed.themeColors };
          }
        } catch (_) {}
      }
    } else {
      fs.writeFileSync(sPath, JSON.stringify(settings, null, 2), 'utf-8');
    }
    return new NextResponse(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sPath = getSettingsPath();
    let current: any = { ...DEFAULT_SETTINGS };
    if (fs.existsSync(sPath)) {
      try {
        const raw = fs.readFileSync(sPath, 'utf-8');
        if (raw.trim()) current = { ...current, ...JSON.parse(raw) };
      } catch (_) {}
    }
    const updated = {
      ...current,
      ...body,
      themeColors: {
        ...(current.themeColors || DEFAULT_SETTINGS.themeColors),
        ...(body.themeColors || (body.primary || body.primaryColor ? body : {}))
      },
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(sPath, JSON.stringify(updated, null, 2), 'utf-8');
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(sys_settings_file, 'w', encoding='utf-8') as f:
    f.write(sys_settings_code)
print(f"✓ Provisioned /api/system-settings persistence at: {sys_settings_file}")

# 3. Create lib/themeConfig.ts for cross-browser theme persistence and CSS variable injection
theme_config_path = os.path.join(lib_dir, 'themeConfig.ts')
theme_config_code = """export interface ThemeColors {
  primary?: string;
  primaryColor?: string;
  primaryHover?: string;
  accentEmerald?: string;
  accentColor?: string;
  accent?: string;
  backgroundColor?: string;
  cardBackground?: string;
  cardBorder?: string;
}

export function applyThemeToDocument(colors: ThemeColors | null | undefined): void {
  if (!colors || typeof document === 'undefined') return;
  const root = document.documentElement;

  const primary = colors.primary || colors.primaryColor;
  const primaryHover = colors.primaryHover;
  const accent = colors.accentEmerald || colors.accentColor || colors.accent;

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
  if (colors.backgroundColor) {
    root.style.setProperty('--color-bg', colors.backgroundColor);
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
  window.dispatchEvent(new Event('storage'));

  // Disseminate to backend disk storage
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

  // 1. Immediate local cache application to prevent visual flicker
  try {
    const cached = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
    if (cached) {
      applyThemeToDocument(JSON.parse(cached));
    }
  } catch (_) {}

  // 2. Authoritative sync from server
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
print(f"✓ Created theme configuration helper at: {theme_config_path}")

# 4. Create ThemeSync.tsx client component to hydrate theme on root mount across all browsers
theme_sync_path = os.path.join(components_dir, 'ThemeSync.tsx')
theme_sync_code = """'use client';

import { useEffect } from 'react';
import { fetchAndApplyServerTheme, applyThemeToDocument } from '@/lib/themeConfig';

export default function ThemeSync() {
  useEffect(() => {
    fetchAndApplyServerTheme();

    const handleSync = (e: any) => {
      if (e?.detail) {
        applyThemeToDocument(e.detail);
      } else {
        try {
          const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
          if (stored) applyThemeToDocument(JSON.parse(stored));
        } catch (_) {}
      }
    };

    window.addEventListener('zecratary_theme_changed', handleSync);
    window.addEventListener('zecratary_theme_updated', handleSync);
    window.addEventListener('storage', handleSync);

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetchAndApplyServerTheme();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('zecratary_theme_changed', handleSync);
      window.removeEventListener('zecratary_theme_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
"""
with open(theme_sync_path, 'w', encoding='utf-8') as f:
    f.write(theme_sync_code)
print(f"✓ Provisioned ThemeSync component at: {theme_sync_path}")

# 5. Inject ThemeSync into layout.tsx so every browser and page hydrates theme colors automatically
layout_files = glob.glob(f'{app_dir}/**/layout.tsx', recursive=True)
if not layout_files:
    layout_files = glob.glob('**/layout.tsx', recursive=True)
layout_files = [p for p in layout_files if 'node_modules' not in p and '.next' not in p]

for lp in layout_files:
    with open(lp, 'r', encoding='utf-8') as f:
        l_content = f.read()

    # Only patch the root layout containing <body> or <html>
    if '<body' in l_content or '<html' in l_content:
        if 'ThemeSync' not in l_content:
            # Add import
            l_content = "import ThemeSync from '@/components/ThemeSync';\n" + l_content
            # Insert <ThemeSync /> inside body
            if '<body' in l_content:
                l_content = re.sub(
                    r'(<body[^>]*>)',
                    r'\1\n        <ThemeSync />',
                    l_content,
                    count=1
                )
            with open(lp, 'w', encoding='utf-8') as f:
                f.write(l_content)
            print(f"✓ Injected <ThemeSync /> into root layout: {lp}")

# 6. Update profile/page.tsx to remove stale cache blocking and apply server theme directly
profile_files = glob.glob(f'{app_dir}/**/profile/page.tsx', recursive=True)
if not profile_files:
    profile_files = glob.glob('**/profile/page.tsx', recursive=True)
profile_files = [p for p in profile_files if 'node_modules' not in p and '.next' not in p]

for pp in profile_files:
    with open(pp, 'r', encoding='utf-8') as f:
        p_content = f.read()

    # Ensure applySavedTheme does not guard with !localStorage.getItem('zecratary_theme_colors')
    old_guard = "if (s.themeColors && !localStorage.getItem('zecratary_theme_colors'))"
    new_guard = "if (s.themeColors)"
    if old_guard in p_content:
        p_content = p_content.replace(old_guard, new_guard)
        with open(pp, 'w', encoding='utf-8') as f:
            f.write(p_content)
        print(f"✓ Removed stale theme blocking check from: {pp}")

print("\n🚀 Cross-browser theme color synchronization patch applied successfully!")
