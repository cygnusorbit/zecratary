import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDataPaths(filename: string): string[] {
  return [
    path.join(process.cwd(), 'apps/web/data', filename),
    path.join(process.cwd(), 'data', filename)
  ];
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) as T;
      } catch (_) {}
    }
  }
  return fallback;
}

function writeJsonFile<T>(filename: string, data: T): void {
  const paths = getDataPaths(filename);
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

const DEFAULT_PLANS = [
  {
    id: 'preset_taster',
    name: 'Taster',
    slug: 'taster',
    isFree: true,
    isDefault: true,
    monthlyPriceDollars: 0,
    annualPriceDollars: 0,
    monthlyBadge: '',
    annualBadge: '',
    trialBadge: '',
    descriptionMonthly: 'Free tier with limited features',
    descriptionAnnual: 'Free tier with limited features',
    buttonText: 'Manage',
    aiRecipeLimit: 5,
    recipeLibraryLimit: 25,
    socialScrapeLimit: 5,
    canViewMacros: false,
    allowedAiModels: 'gemini-3.5-flash-lite,gpt-3.5-turbo',
    featuresText: 'Create up to 5 AI-powered recipes per month\nPersonal recipe library (25 total recipes)\nSmart ingredient repurposing\nAutomated shopping list creation\nDirect online grocery shopping links\nMeal planner\nIngredient photo recognition',
    features: [
      'Create up to 5 AI-powered recipes per month',
      'Personal recipe library (25 total recipes)',
      'Smart ingredient repurposing',
      'Automated shopping list creation',
      'Direct online grocery shopping links',
      'Meal planner',
      'Ingredient photo recognition'
    ],
    tokenLimit: 50000,
    tokenReimburseFrequency: 'monthly'
  },
  {
    id: 'preset_nutrition_pro',
    name: 'Nutrition Pro',
    slug: 'nutrition-pro',
    isFree: false,
    isDefault: false,
    monthlyPriceDollars: 8.99,
    annualPriceDollars: 59.99,
    monthlyBadge: 'Billed Immediately',
    annualBadge: 'Save 44%',
    trialBadge: '7-Day Free Trial',
    descriptionMonthly: 'Full premium access, billed monthly',
    descriptionAnnual: 'Best value - all premium features, billed annually',
    buttonText: 'Choose Plan',
    aiRecipeLimit: -1,
    recipeLibraryLimit: -1,
    socialScrapeLimit: -1,
    canViewMacros: true,
    allowedAiModels: 'gemini-3.6-flash,gpt-4o',
    featuresText: 'Unlimited AI-powered recipe generation\nUnlimited recipe library\nComprehensive nutritional analysis (calories, protein, fat, fiber, sugar, sodium, cholesterol, carbohydrates)',
    features: [
      'Unlimited AI-powered recipe generation',
      'Unlimited recipe library',
      'Comprehensive nutritional analysis (calories, protein, fat, fiber, sugar, sodium, cholesterol, carbohydrates)'
    ],
    tokenLimit: 1000000,
    tokenReimburseFrequency: 'monthly'
  }
];

export async function GET() {
  let plans = readJsonFile('subscription_plans.json', [] as any[]);
  if (!Array.isArray(plans) || plans.length === 0) {
    const adminSettings = readJsonFile('admin_settings.json', {} as any);
    if (Array.isArray(adminSettings.subscriptionPlans) && adminSettings.subscriptionPlans.length > 0) {
      plans = adminSettings.subscriptionPlans;
    } else {
      plans = DEFAULT_PLANS;
    }
  }

  return NextResponse.json({
    success: true,
    packages: plans,
    plans: plans,
    configs: plans
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let currentPlans = readJsonFile('subscription_plans.json', [] as any[]);
    if (!Array.isArray(currentPlans) || currentPlans.length === 0) {
      currentPlans = [...DEFAULT_PLANS];
    }

    const planId = body.id || 'plan_' + Date.now();
    const planSlug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const updatedPlan = {
      ...body,
      id: planId,
      slug: planSlug,
      isDefault: planSlug === 'taster' || planId === 'preset_taster',
      updatedAt: new Date().toISOString()
    };

    const existingIdx = currentPlans.findIndex((p: any) => p.id === planId || p.slug === planSlug);
    if (existingIdx >= 0) {
      currentPlans[existingIdx] = updatedPlan;
    } else {
      currentPlans.push(updatedPlan);
    }

    // Persist across dual JSON stores
    writeJsonFile('subscription_plans.json', currentPlans);

    const adminSettings = readJsonFile('admin_settings.json', {} as any);
    adminSettings.subscriptionPlans = currentPlans;
    writeJsonFile('admin_settings.json', adminSettings);

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      packages: currentPlans
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to save plan' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let slug = searchParams.get('slug');

    if (!id && !slug) {
      try {
        const body = await req.json();
        id = body.id;
        slug = body.slug;
      } catch (_) {}
    }

    if (slug === 'taster' || id === 'preset_taster') {
      return NextResponse.json({ success: false, error: 'Taster plan cannot be deleted' }, { status: 400 });
    }

    let currentPlans = readJsonFile('subscription_plans.json', [] as any[]);
    const updated = currentPlans.filter((p: any) => {
      const matchId = id && (p.id === id || p.slug === id);
      const matchSlug = slug && (p.slug === slug || p.id === slug);
      return !(matchId || matchSlug);
    });

    writeJsonFile('subscription_plans.json', updated);

    const adminSettings = readJsonFile('admin_settings.json', {} as any);
    adminSettings.subscriptionPlans = updated;
    writeJsonFile('admin_settings.json', adminSettings);

    return NextResponse.json({ success: true, packages: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete plan' }, { status: 500 });
  }
}
