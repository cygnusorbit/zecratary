import { NextRequest, NextResponse } from 'next/server';

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
