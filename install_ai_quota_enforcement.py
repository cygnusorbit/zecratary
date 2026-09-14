import os
import glob
import re

# 1. Discover application directory
candidates = [
    'apps/web/src/app',
    'src/app',
    'apps/web/app',
    'app'
]
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
components_dir = os.path.join(base_dir, 'components')
os.makedirs(components_dir, exist_ok=True)

# 2. Provision /api/ai/quota/route.ts (Server-side validation endpoint)
quota_api_dir = os.path.join(app_dir, 'api', 'ai', 'quota')
os.makedirs(quota_api_dir, exist_ok=True)
quota_api_path = os.path.join(quota_api_dir, 'route.ts')

quota_api_code = """import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getSessionUser(req: NextRequest) {
  const sessionCookie = req.cookies.get('zecratary_session')?.value;
  if (!sessionCookie) return null;
  try {
    return JSON.parse(decodeURIComponent(sessionCookie));
  } catch (_) {
    try {
      return JSON.parse(sessionCookie);
    } catch (_) {
      return null;
    }
  }
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  const plan = (user?.subscriptionPlan || user?.subscriptionTier || 'taster').toLowerCase();
  const isAdmin = Boolean(user?.role === 'admin' || user?.email?.toLowerCase().includes('admin'));
  const isPro = isAdmin || plan.includes('pro') || plan.includes('annual') || plan.includes('monthly');

  return NextResponse.json({
    authenticated: Boolean(user),
    plan,
    isUnlimited: isPro,
    monthlyRecipeLimit: isPro ? -1 : 5,
  });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  const plan = (user?.subscriptionPlan || user?.subscriptionTier || 'taster').toLowerCase();
  const isAdmin = Boolean(user?.role === 'admin' || user?.email?.toLowerCase().includes('admin'));
  const isPro = isAdmin || plan.includes('pro') || plan.includes('annual') || plan.includes('monthly');

  const body = await req.json().catch(() => ({}));
  const currentCount = Number(body.currentCount || 0);

  if (!isPro && currentCount >= 5) {
    return NextResponse.json({
      allowed: false,
      error: 'Monthly quota reached. Free Taster tier is limited to 5 AI recipe generations per month.',
      upgradeRequired: true,
      currentCount,
      limit: 5
    }, { status: 403 });
  }

  return NextResponse.json({
    allowed: true,
    isUnlimited: isPro,
    remaining: isPro ? -1 : Math.max(0, 5 - (currentCount + 1)),
  });
}
"""

with open(quota_api_path, 'w', encoding='utf-8') as f:
    f.write(quota_api_code)
print(f"✓ Provisioned Server Quota API: {quota_api_path}")

# 3. Provision components/AiQuotaBar.tsx
quota_bar_path = os.path.join(components_dir, 'AiQuotaBar.tsx')
quota_bar_code = """'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, Zap, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function AiQuotaBar() {
  const [quotaInfo, setQuotaInfo] = useState<{ plan: string; isUnlimited: boolean; monthlyRecipeLimit: number } | null>(null);
  const [usedCount, setUsedCount] = useState(0);
  const [isDayMode, setIsDayMode] = useState(false);

  const syncState = useCallback(() => {
    try {
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');

      // Count recipes generated this calendar month
      const rawRecipes = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      if (rawRecipes) {
        const list = JSON.parse(rawRecipes);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthAiCount = list.filter((r: any) => {
          const d = r.createdAt ? new Date(r.createdAt) : new Date();
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (r.isAiGenerated || r.generatedWithAi);
        }).length;
        setUsedCount(monthAiCount);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncState();
    fetch('/api/ai/quota')
      .then(res => res.json())
      .then(data => setQuotaInfo(data))
      .catch(() => {});

    window.addEventListener('zecratary_theme_mode_changed', syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncState);
      window.removeEventListener('storage', syncState);
    };
  }, [syncState]);

  if (!quotaInfo) return null;

  const isUnlimited = quotaInfo.isUnlimited;
  const limit = quotaInfo.monthlyRecipeLimit;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((usedCount / limit) * 100));
  const isLimitReached = !isUnlimited && usedCount >= limit;

  return (
    <div 
      className="p-3.5 rounded-2xl border mb-4 shadow-sm text-xs transition-colors duration-200"
      style={{
        backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
        borderColor: isLimitReached 
          ? (isDayMode ? '#fca5a5' : '#7f1d1d') 
          : (isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)')
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {isUnlimited ? (
            <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : isLimitReached ? (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 text-orange-400 shrink-0" />
          )}

          <div>
            <span className="font-extrabold" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
              {isUnlimited ? 'Unlimited AI Recipes' : `Monthly Quota: ${usedCount} / ${limit} Recipes Used`}
            </span>
            <span className="ml-2 font-mono text-[10px] uppercase font-bold text-slate-500">
              ({quotaInfo.plan})
            </span>
          </div>
        </div>

        {!isUnlimited && (
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 font-bold text-[11px] hover:underline"
            style={{ color: 'var(--color-primary, #E05638)' }}
          >
            Upgrade for Unlimited <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {!isUnlimited && (
        <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor: isLimitReached ? '#ef4444' : 'var(--color-primary, #E05638)'
            }}
          />
        </div>
      )}
    </div>
  );
}
"""

with open(quota_bar_path, 'w', encoding='utf-8') as f:
    f.write(quota_bar_code)
print(f"✓ Provisioned Quota Indicator: {quota_bar_path}")

# 4. Safely inject AiQuotaBar into chef/page.tsx without altering existing features
chef_candidates = [
    os.path.join(app_dir, 'chef', 'page.tsx'),
    'apps/web/src/app/chef/page.tsx',
    'src/app/chef/page.tsx'
]
chef_path = next((p for p in chef_candidates if os.path.exists(p)), None)

if chef_path:
    with open(chef_path, 'r', encoding='utf-8') as f:
        chef_content = f.read()

    if 'AiQuotaBar' not in chef_content:
        # Inject import statement
        import_stmt = "import AiQuotaBar from '@/components/AiQuotaBar';\n"
        if "'use client';" in chef_content or '"use client";' in chef_content:
            chef_content = re.sub(r"((['\"])use client\2;?\r?\n)", r"\1" + import_stmt, chef_content, count=1)
        else:
            chef_content = import_stmt + chef_content

        # Locate first top container opening (typically <div className="max-w-...)
        container_pattern = re.compile(r'(<div[^>]*className=["\'][^"\']*(?:max-w-|min-h-|container)[^"\']*["\'][^>]*>)', re.IGNORECASE)
        match = container_pattern.search(chef_content)
        if match:
            pos = match.end()
            chef_content = chef_content[:pos] + "\n      <AiQuotaBar />" + chef_content[pos:]
            with open(chef_path, 'w', encoding='utf-8') as f:
                f.write(chef_content)
            print(f"✓ Non-destructively mounted AiQuotaBar in: {chef_path}")
        else:
            print(f"⚠ Notice: Could not locate container tag in {chef_path}. Component created and ready for manual placement.")
    else:
        print(f"✓ AiQuotaBar already present in: {chef_path}")
else:
    print("Notice: chef/page.tsx not found in standard paths; API and Component are provisioned.")

print("\nOption 2 installed successfully!")
