// Generated / Updated by AI Collaborator
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDataFilePath(): string {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'data', 'subscription_configs.json'),
    path.join(root, 'apps', 'web', 'data', 'subscription_configs.json'),
    path.join(root, 'src', 'data', 'subscription_configs.json'),
    path.join(root, 'apps', 'web', 'src', 'data', 'subscription_configs.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  const defaultPath = path.join(root, 'data', 'subscription_configs.json');
  const dir = path.dirname(defaultPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return defaultPath;
}

const DEFAULT_PRESET_TASTER = {
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
};

function readServerConfigs(): any[] {
  const filePath = getDataFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : (parsed?.configs || parsed?.plans || []);
      if (Array.isArray(list) && list.length > 0) {
        const hasTaster = list.some((p: any) => p && (p.slug === 'taster' || p.id === 'preset_taster'));
        return hasTaster ? list : [DEFAULT_PRESET_TASTER, ...list];
      }
    }
  } catch (_) {}
  return [DEFAULT_PRESET_TASTER];
}

function writeServerConfigs(configs: any[]): boolean {
  try {
    const filePath = getDataFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(configs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write subscription configs:', err);
    return false;
  }
}

export async function GET() {
  const configs = readServerConfigs();
  return NextResponse.json({
    success: true,
    configs,
    plans: configs
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planId = body.id || 'plan_' + Date.now();
    const slug = (body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || planId).trim();
    const isTaster = planId === 'preset_taster' || slug === 'taster';

    const newConfig = {
      ...body,
      id: planId,
      slug,
      isDefault: isTaster,
    };

    let configs = readServerConfigs();
    const existingIndex = configs.findIndex((c: any) => c.id === planId || c.slug === slug);
    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }

    configs = configs.map((p: any) => ({
      ...p,
      isDefault: p.id === 'preset_taster' || p.slug === 'taster'
    }));

    writeServerConfigs(configs);
    return NextResponse.json({ success: true, configs, plan: newConfig });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error saving plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {}

    const targetId = (id || body.id || '').trim();
    const targetSlug = (slug || body.slug || '').trim();
    const identifier = targetId || targetSlug;

    if (!identifier) {
      return NextResponse.json({ success: false, error: 'Plan identifier is required' }, { status: 400 });
    }

    if (identifier === 'taster' || identifier === 'preset_taster' || targetSlug === 'taster' || targetId === 'preset_taster') {
      return NextResponse.json({ success: false, error: 'The default Taster plan cannot be deleted' }, { status: 403 });
    }

    let configs = readServerConfigs();
    const beforeCount = configs.length;

    configs = configs.filter((c: any) => {
      if (!c) return false;
      const matchId = targetId && (c.id === targetId || c.slug === targetId);
      const matchSlug = targetSlug && (c.slug === targetSlug || c.id === targetSlug);
      return !(matchId || matchSlug);
    });

    configs = configs.map((p: any) => ({
      ...p,
      isDefault: p.id === 'preset_taster' || p.slug === 'taster'
    }));

    writeServerConfigs(configs);

    return NextResponse.json({
      success: true,
      message: 'Plan deleted successfully',
      configs,
      deletedCount: beforeCount - configs.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error deleting plan' }, { status: 500 });
  }
}
