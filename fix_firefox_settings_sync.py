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
data_dir = os.path.join(os.path.dirname(base_dir), 'data') if os.path.basename(base_dir) == 'src' else os.path.join(base_dir, 'data')
os.makedirs(data_dir, exist_ok=True)

# 2. Provision server-backed system settings endpoint at /api/system-settings/route.ts
sys_settings_dir = os.path.join(app_dir, 'api', 'system-settings')
os.makedirs(sys_settings_dir, exist_ok=True)
sys_settings_file = os.path.join(sys_settings_dir, 'route.ts')

sys_settings_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    const filePath = getSettingsPath();
    let settings = { ...DEFAULT_SETTINGS };
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } else {
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    }
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = getSettingsPath();
    let current = { ...DEFAULT_SETTINGS };
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) current = { ...current, ...JSON.parse(raw) };
    }
    const updated = { ...current, ...body };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(sys_settings_file, 'w', encoding='utf-8') as f:
    f.write(sys_settings_code)
print(f"✓ Provisioned system settings API at {sys_settings_file}")

# 3. Ensure /api/admin/plans/route.ts persists and returns plans with token limits
api_plans_dir = os.path.join(app_dir, 'api', 'admin', 'plans')
os.makedirs(api_plans_dir, exist_ok=True)
api_plans_file = os.path.join(api_plans_dir, 'route.ts')

api_plans_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getPlansPath() {
  const rootDir = process.cwd();
  const dir = path.join(rootDir, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const cfgPath = path.join(dir, 'subscription_configs.json');
  return cfgPath;
}

const DEFAULT_CONFIGS = [
  {
    id: 'taster',
    name: 'Taster',
    slug: 'taster',
    isFree: true,
    monthlyPriceDollars: 0,
    annualPriceDollars: 0,
    tokenLimit: 50000,
    tokenReimburseFrequency: 'monthly',
    description: 'Free tier with standard features'
  },
  {
    id: 'nutrition-pro',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro',
    isFree: false,
    monthlyPriceDollars: 8.99,
    annualPriceDollars: 59.99,
    tokenLimit: 1000000,
    tokenReimburseFrequency: 'monthly',
    description: 'Full premium access'
  }
];

export async function GET() {
  try {
    const filePath = getPlansPath();
    let configs = [...DEFAULT_CONFIGS];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) configs = JSON.parse(raw);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(configs, null, 2), 'utf-8');
    }
    return NextResponse.json({ success: true, configs, plans: configs });
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
    return NextResponse.json({ success: true, configs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_plans_file, 'w', encoding='utf-8') as f:
    f.write(api_plans_code)
print(f"✓ Provisioned /api/admin/plans at {api_plans_file}")

# 4. Patch apps/web/src/app/profile/page.tsx to fetch server-side settings and plans
profile_paths = [
    os.path.join(app_dir, 'profile', 'page.tsx'),
    'apps/web/src/app/profile/page.tsx',
    'src/app/profile/page.tsx'
]
profile_file = next((p for p in profile_paths if os.path.exists(p)), None)

if not profile_file:
    print("❌ Error: Could not locate profile/page.tsx")
    exit(1)

with open(profile_file, 'r', encoding='utf-8') as f:
    p_code = f.read()

# Enhance applySavedTheme to query /api/system-settings when unpopulated
server_theme_sync = """  // Dynamic Theme & Day/Night Mode Synchronization
  const applySavedTheme = useCallback(async () => {
    try {
      // 1. Fetch server-persisted theme and branding configuration
      try {
        const res = await fetch('/api/system-settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            if (s.themeMode && !localStorage.getItem('zecratary_theme_mode')) {
              localStorage.setItem('zecratary_theme_mode', s.themeMode);
            }
            if (s.themeColors && !localStorage.getItem('zecratary_theme_colors')) {
              localStorage.setItem('zecratary_theme_colors', JSON.stringify(s.themeColors));
            }
            if (s.currency && !localStorage.getItem('zecratary_currency')) {
              localStorage.setItem('zecratary_currency', s.currency);
            }
          }
        }
      } catch (_) {}

      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      if (stored) {
        const c = JSON.parse(stored);
        const root = document.documentElement;
        if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
        if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
        if (c.accentEmerald || c.accentColor) {
          root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);
          root.style.setProperty('--color-accent', c.accentEmerald || c.accentColor);
        }
      }

      const curr = localStorage.getItem('zecratary_currency') || 'USD';
      setCurrencyCode(curr);
      const symbols: Record<string, string> = {
        USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
        JPY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', THB: '฿'
      };
      setCurrencySymbol(symbols[curr] || '$');

      const aiConfigRaw = localStorage.getItem('zecratary_chef_ai_settings') || localStorage.getItem('zecratary_engine_config');
      if (aiConfigRaw) {
        const aiCfg = JSON.parse(aiConfigRaw);
        if (aiCfg.model) setActiveModelName(aiCfg.model);
      }
    } catch (e) {}
  }, []);"""

# Enhance syncPlansFromAdmin to fetch server packages from /api/admin/plans
server_plans_sync = """  const syncPlansFromAdmin = useCallback(async () => {
    const plansMap = new Map<string, SubscriptionPlanItem>();

    // 1. Fetch live system plan configuration from server
    try {
      const res = await fetch('/api/admin/plans', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const serverConfigs = data.configs || data.plans;
        if (Array.isArray(serverConfigs) && serverConfigs.length > 0) {
          localStorage.setItem('zecratary_subscription_configs', JSON.stringify(serverConfigs));
        }
      }
    } catch (_) {}

    try {
      const rawConfigs = localStorage.getItem('zecratary_subscription_configs');
      if (rawConfigs) {
        const configs = JSON.parse(rawConfigs);
        if (Array.isArray(configs) && configs.length > 0) {
          configs.forEach((cfg: any) => {
            const rawSlug = (cfg.slug || cfg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
            if (rawSlug === 'pro-unlimited') return;

            const cleanBaseSlug = rawSlug.replace(/-(monthly|annual|free)$/i, '');
            const isFree = cfg.isFree || (Number(cfg.monthlyPriceDollars || 0) === 0 && Number(cfg.annualPriceDollars || 0) === 0);
            
            let planFeatures = Array.isArray(cfg.features) && cfg.features.length > 0 ? cfg.features : null;
            if (!planFeatures || planFeatures.length < (isFree ? 7 : 3)) {
              planFeatures = isFree ? DEFAULT_TASTER_FEATURES : DEFAULT_PRO_FEATURES;
            }

            const tokenLimit = cfg.tokenLimit !== undefined ? Number(cfg.tokenLimit) : (isFree ? 50000 : 1000000);
            const tokenReimburseFrequency = cfg.tokenReimburseFrequency || 'monthly';

            if (isFree) {
              const freeSlug = cleanBaseSlug.includes('taster') ? 'taster' : cleanBaseSlug;
              plansMap.set(freeSlug, {
                id: cfg.id || freeSlug,
                name: cfg.name,
                slug: freeSlug,
                description: cfg.description || 'Free tier with standard features',
                priceCents: 0,
                priceFormatted: 'Free',
                interval: 'MONTH',
                isFree: true,
                badge: cfg.badge || '',
                saveBadge: '',
                buttonText: cfg.buttonText || (t('switchToFreeBtn') || 'Switch to Free'),
                buttonTheme: 'orange',
                features: planFeatures,
                aiRecipeLimit: cfg.aiRecipeLimit,
                recipeLibraryLimit: cfg.recipeLibraryLimit,
                socialScrapeLimit: cfg.socialScrapeLimit,
                canViewMacros: cfg.canViewMacros,
                tokenLimit,
                tokenReimburseFrequency,
              });
            } else {
              if (cfg.monthlyPriceDollars !== undefined && cfg.monthlyPriceDollars !== null && Number(cfg.monthlyPriceDollars) > 0) {
                const monthlySlug = `${cleanBaseSlug}-monthly`;
                const mPrice = Number(cfg.monthlyPriceDollars);
                plansMap.set(monthlySlug, {
                  id: `${cfg.id || cleanBaseSlug}-monthly`,
                  name: cfg.name,
                  slug: monthlySlug,
                  description: cfg.description || `Full access to ${cfg.name}, billed monthly`,
                  priceCents: Math.round(mPrice * 100),
                  priceFormatted: `${currencySymbol}${mPrice.toFixed(2)}/mo`,
                  interval: 'MONTH',
                  isFree: false,
                  badge: cfg.monthlyBadge || cfg.badge || 'Billed Monthly',
                  saveBadge: '',
                  buttonText: cfg.buttonText || (t('choosePlanBtn') || 'Choose Plan'),
                  buttonTheme: 'green',
                  features: planFeatures,
                  aiRecipeLimit: cfg.aiRecipeLimit,
                  recipeLibraryLimit: cfg.recipeLibraryLimit,
                  socialScrapeLimit: cfg.socialScrapeLimit,
                  canViewMacros: cfg.canViewMacros,
                  tokenLimit,
                  tokenReimburseFrequency,
                });
              }

              if (cfg.annualPriceDollars !== undefined && cfg.annualPriceDollars !== null && Number(cfg.annualPriceDollars) > 0) {
                const annualSlug = `${cleanBaseSlug}-annual`;
                const aPrice = Number(cfg.annualPriceDollars);
                const mEquivalent = (aPrice / 12).toFixed(2);
                plansMap.set(annualSlug, {
                  id: `${cfg.id || cleanBaseSlug}-annual`,
                  name: cfg.name,
                  slug: annualSlug,
                  description: cfg.description || `Best value - all ${cfg.name} features, billed annually`,
                  priceCents: Math.round(aPrice * 100),
                  priceFormatted: `${currencySymbol}${aPrice.toFixed(2)}/yr`,
                  interval: 'YEAR',
                  isFree: false,
                  badge: cfg.annualBadge || 'Best Value',
                  saveBadge: cfg.saveBadge || 'Save 44%',
                  subPrice: `${currencySymbol}${mEquivalent}/month`,
                  strikethroughPrice: cfg.monthlyPriceDollars ? `${currencySymbol}${Number(cfg.monthlyPriceDollars).toFixed(2)}/month` : undefined,
                  buttonText: cfg.buttonText || (t('choosePlanBtn') || 'Choose Plan'),
                  buttonTheme: 'green',
                  features: planFeatures,
                  aiRecipeLimit: cfg.aiRecipeLimit,
                  recipeLibraryLimit: cfg.recipeLibraryLimit,
                  socialScrapeLimit: cfg.socialScrapeLimit,
                  canViewMacros: cfg.canViewMacros,
                  tokenLimit,
                  tokenReimburseFrequency,
                });
              }
            }
          });
        }
      }
    } catch (e) {}

    if (plansMap.size === 0) {
      DEFAULT_PLANS.forEach(p => plansMap.set(p.slug, p));
    }

    const mergedPlans = Array.from(plansMap.values());
    plansRef.current = mergedPlans;
    setPlans(mergedPlans);
  }, [currencySymbol, t]);"""

# Replace existing theme & plan synchronizer hooks in profile/page.tsx
theme_pattern = re.compile(r'const\s+applySavedTheme\s*=\s*useCallback\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[.*?\]\);', re.MULTILINE)
plans_pattern = re.compile(r'const\s+syncPlansFromAdmin\s*=\s*useCallback\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[.*?\]\);', re.MULTILINE)

if theme_pattern.search(p_code):
    p_code = theme_pattern.sub(server_theme_sync, p_code, count=1)
    print("✓ Injected server theme synchronization into profile/page.tsx")

if plans_pattern.search(p_code):
    p_code = plans_pattern.sub(server_plans_sync, p_code, count=1)
    print("✓ Injected server plan & token synchronization into profile/page.tsx")

with open(profile_file, 'w', encoding='utf-8') as f:
    f.write(p_code)

print("\n🚀 Cross-browser settings synchronization patch applied successfully!")
