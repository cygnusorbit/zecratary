import os
import glob
import re

# 1. Locate App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/profile/page.tsx', recursive=True)
    if matches:
        app_dir = os.path.dirname(os.path.dirname(matches[0]))

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
components_dir = os.path.join(base_dir, 'components')
lib_dir = os.path.join(base_dir, 'lib')
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')

os.makedirs(data_dir, exist_ok=True)
os.makedirs(lib_dir, exist_ok=True)

# 2. Provision /api/system-settings/route.ts
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

function getPlansPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'subscription_configs.json');
}

export async function GET() {
  try {
    const sPath = getSettingsPath();
    let settings: any = {};
    if (fs.existsSync(sPath)) {
      try {
        const raw = fs.readFileSync(sPath, 'utf-8');
        if (raw.trim()) settings = JSON.parse(raw);
      } catch (_) {}
    }

    const pPath = getPlansPath();
    if (fs.existsSync(pPath)) {
      try {
        const pRaw = fs.readFileSync(pPath, 'utf-8');
        if (pRaw.trim()) {
          const parsedPlans = JSON.parse(pRaw);
          if (Array.isArray(parsedPlans) && parsedPlans.length > 0) {
            settings.plans = parsedPlans;
            settings.subscriptionConfigs = parsedPlans;
          }
        }
      } catch (_) {}
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
    let current: any = {};
    if (fs.existsSync(sPath)) {
      try {
        const raw = fs.readFileSync(sPath, 'utf-8');
        if (raw.trim()) current = JSON.parse(raw);
      } catch (_) {}
    }

    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    fs.writeFileSync(sPath, JSON.stringify(updated, null, 2), 'utf-8');

    // Also synchronize plans file if plans were provided
    const incomingPlans = body.plans || body.subscriptionConfigs || body.configs;
    if (Array.isArray(incomingPlans) && incomingPlans.length > 0) {
      const pPath = getPlansPath();
      fs.writeFileSync(pPath, JSON.stringify(incomingPlans, null, 2), 'utf-8');
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(sys_settings_file, 'w', encoding='utf-8') as f:
    f.write(sys_settings_code)
print(f"✓ Provisioned /api/system-settings route at {sys_settings_file}")

# 3. Update /api/admin/plans/route.ts
api_plans_dir = os.path.join(app_dir, 'api', 'admin', 'plans')
os.makedirs(api_plans_dir, exist_ok=True)
api_plans_file = os.path.join(api_plans_dir, 'route.ts')

api_plans_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getPlansPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'subscription_configs.json');
}

export async function GET() {
  try {
    const filePath = getPlansPath();
    let configs: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) configs = JSON.parse(raw);
      } catch (_) {}
    }
    return new NextResponse(JSON.stringify({ success: true, configs, plans: configs }), {
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
    const filePath = getPlansPath();
    const configs = Array.isArray(body) ? body : (body.configs || body.plans || [body]);
    fs.writeFileSync(filePath, JSON.stringify(configs, null, 2), 'utf-8');

    // Sync into system_settings.json
    try {
      const sPath = path.join(path.dirname(filePath), 'system_settings.json');
      let sys: any = {};
      if (fs.existsSync(sPath)) {
        sys = JSON.parse(fs.readFileSync(sPath, 'utf-8') || '{}');
      }
      sys.plans = configs;
      sys.subscriptionConfigs = configs;
      fs.writeFileSync(sPath, JSON.stringify(sys, null, 2), 'utf-8');
    } catch (_) {}

    return NextResponse.json({ success: true, configs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_plans_file, 'w', encoding='utf-8') as f:
    f.write(api_plans_code)
print(f"✓ Provisioned /api/admin/plans route at {api_plans_file}")

# 4. Update lib/siteConfig.ts with server persistence and sync
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

  // Sync to backend API for cross-browser synchronization
  try {
    fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSettings: updated })
    }).catch(() => {});
  } catch (_) {}
}

export async function syncSiteConfigFromServer(): Promise<SiteIdentityConfig | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/system-settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings?.siteSettings) {
        const s = data.settings.siteSettings;
        const current = getSiteConfig();
        const merged: SiteIdentityConfig = {
          siteName: s.siteName || current.siteName,
          titlebarEmoji: s.titlebarEmoji || current.titlebarEmoji,
          titlebarImage: s.titlebarImage !== undefined ? s.titlebarImage : current.titlebarImage,
          faviconEmoji: s.faviconEmoji || current.faviconEmoji,
          faviconImage: s.faviconImage !== undefined ? s.faviconImage : current.faviconImage
        };
        localStorage.setItem('zecratary_site_settings', JSON.stringify(merged));
        window.dispatchEvent(new Event('zecratary_site_settings_changed'));
        updateFavicon(merged.faviconImage || merged.faviconEmoji || merged.titlebarEmoji);
        return merged;
      }
    }
  } catch (_) {}
  return null;
}
"""
with open(site_config_path, 'w', encoding='utf-8') as f:
    f.write(site_config_code)
print(f"✓ Updated {site_config_path}")

# 5. Patch Sidebar.tsx to sync and apply server emoji, theme, and token configs
sidebar_candidates = [
    os.path.join(components_dir, 'Sidebar.tsx'),
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((p for p in sidebar_candidates if os.path.exists(p)), None)

if sidebar_path:
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        s_code = f.read()

    # Inject synchronization hook inside Sidebar
    sync_bridge = """  // Cross-Browser Sync Bridge: Pulls server settings and seeds server with local configurations if missing
  useEffect(() => {
    const reconcileServerAndLocal = async () => {
      try {
        const res = await fetch('/api/system-settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};

          const localSite = localStorage.getItem('zecratary_site_settings');
          const localTheme = localStorage.getItem('zecratary_theme_colors');
          const localPlans = localStorage.getItem('zecratary_subscription_configs');

          // 1. If this browser has local settings that server lacks, upload them
          const uploadPayload: any = {};
          if (localSite && (!s.siteSettings || !s.siteSettings.titlebarEmoji)) {
            try { uploadPayload.siteSettings = JSON.parse(localSite); } catch (_) {}
          }
          if (localTheme && (!s.themeColors || Object.keys(s.themeColors).length === 0)) {
            try { uploadPayload.themeColors = JSON.parse(localTheme); } catch (_) {}
          }
          if (localPlans && (!s.plans || s.plans.length === 0)) {
            try { uploadPayload.plans = JSON.parse(localPlans); } catch (_) {}
          }

          if (Object.keys(uploadPayload).length > 0) {
            await fetch('/api/system-settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(uploadPayload)
            });
          }

          // 2. Apply server settings locally
          const activeSite = s.siteSettings || uploadPayload.siteSettings;
          if (activeSite) {
            localStorage.setItem('zecratary_site_settings', JSON.stringify(activeSite));
            if (activeSite.siteName) setSiteName(activeSite.siteName);
            if (activeSite.titlebarImage || activeSite.titlebarEmoji) {
              setSiteIcon(activeSite.titlebarImage || activeSite.titlebarEmoji);
            }
          }

          const activeColors = s.themeColors || uploadPayload.themeColors;
          if (activeColors) {
            localStorage.setItem('zecratary_theme_colors', JSON.stringify(activeColors));
            const root = document.documentElement;
            if (activeColors.primary) root.style.setProperty('--color-primary', activeColors.primary);
            if (activeColors.primaryHover) root.style.setProperty('--color-primary-hover', activeColors.primaryHover);
            if (activeColors.accentEmerald) root.style.setProperty('--color-emerald', activeColors.accentEmerald);
          }

          const activePlans = s.plans || uploadPayload.plans;
          if (Array.isArray(activePlans) && activePlans.length > 0) {
            localStorage.setItem('zecratary_subscription_configs', JSON.stringify(activePlans));
            window.dispatchEvent(new Event('zecratary_plans_updated'));
          }
        }
      } catch (err) {
        console.error('Sidebar sync bridge error:', err);
      }
    };

    reconcileServerAndLocal();
  }, []);"""

    if 'reconcileServerAndLocal' not in s_code:
        # Place before return
        s_code = re.sub(
            r'(return\s*\(\s*<aside)',
            f"{sync_bridge}\n\n  \\1",
            s_code,
            count=1
        )
        if 'reconcileServerAndLocal' not in s_code:
            s_code = re.sub(
                r'(return\s*\(\s*<div)',
                f"{sync_bridge}\n\n  \\1",
                s_code,
                count=1
            )
        with open(sidebar_path, 'w', encoding='utf-8') as f:
            f.write(s_code)
        print(f"✓ Injected cross-browser sync bridge into {sidebar_path}")

# 6. Patch /admin/plans/page.tsx to push plans directly to server on save
plan_page_candidates = glob.glob(f'{app_dir}/**/plans/page.tsx', recursive=True)
for p_path in plan_page_candidates:
    with open(p_path, 'r', encoding='utf-8') as f:
        p_code = f.read()

    # Hook save function to dispatch POST to /api/admin/plans
    if "fetch('/api/admin/plans'" not in p_code:
        p_code = re.sub(
            r"(localStorage\.setItem\(['\"]zecratary_subscription_configs['\"],\s*JSON\.stringify\(([^)]+)\)\);?)",
            r"""\1
    try {
      fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(\2)
      }).catch(() => {});
    } catch (_) {}""",
            p_code
        )
        with open(p_path, 'w', encoding='utf-8') as f:
            f.write(p_code)
        print(f"✓ Connected server persistence in {p_path}")

# 7. Update profile/page.tsx to accurately read server plans and token limits
profile_files = glob.glob(f'{app_dir}/**/profile/page.tsx', recursive=True)
for pp in profile_files:
    with open(pp, 'r', encoding='utf-8') as f:
        p_code = f.read()

    # Ensure syncPlansFromAdmin reads tokenLimit and features directly from server
    if 'data.configs || data.plans' in p_code:
        p_code = p_code.replace(
            "const serverConfigs = data.configs || data.plans;",
            """const serverConfigs = data.configs || data.plans;
        if (Array.isArray(serverConfigs) && serverConfigs.length > 0) {
          localStorage.setItem('zecratary_subscription_configs', JSON.stringify(serverConfigs));
          window.dispatchEvent(new Event('zecratary_plans_updated'));
        }"""
        )
        with open(pp, 'w', encoding='utf-8') as f:
            f.write(p_code)
        print(f"✓ Patched token sync in {pp}")

print("\n🚀 Cross-browser settings, theme, emoji, and token synchronizer deployed successfully!")
