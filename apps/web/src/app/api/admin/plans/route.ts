import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@zecratary/database';

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceCents: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.warn('DB Fetch fallback, returning empty or error:', error.message);
    return NextResponse.json({ success: true, plans: [] });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      name,
      slug,
      descriptionMonthly = '',
      descriptionAnnual = '',
      monthlyPriceDollars = 0,
      annualPriceDollars = 0,
      monthlyBadge = '',
      annualBadge = '',
      trialBadge = '',
      buttonText = 'Choose Plan',
      aiRecipeLimit = -1,
      recipeLibraryLimit = -1,
      socialScrapeLimit = -1,
      canViewMacros = true,
      allowedAiModels = ['gemini-1.5-flash', 'gpt-4o-mini'],
      isFree = false,
      features = [],
    } = data;

    const baseSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    const isFreeTier = isFree || (monthlyPriceDollars === 0 && annualPriceDollars === 0);

    const commonData = {
      aiRecipeLimit: parseInt(aiRecipeLimit) || 0,
      recipeLibraryLimit: parseInt(recipeLibraryLimit) || 0,
      socialScrapeLimit: parseInt(socialScrapeLimit) || 0,
      canViewMacros: Boolean(canViewMacros),
      allowedAiModels: Array.isArray(allowedAiModels) ? allowedAiModels : [allowedAiModels],
    };

    const createdPlans = [];

    if (isFreeTier) {
      const freePlan = await prisma.subscriptionPlan.upsert({
        where: { slug: baseSlug },
        update: {
          name,
          slug: baseSlug,
          description: descriptionMonthly || 'Free tier with limited features',
          priceCents: 0,
          interval: 'MONTH',
          stripeProductId: 'free_tier',
          stripePriceId: 'free_price',
          ...commonData,
        },
        create: {
          name,
          slug: baseSlug,
          description: descriptionMonthly || 'Free tier with limited features',
          priceCents: 0,
          interval: 'MONTH',
          stripeProductId: 'free_tier',
          stripePriceId: 'free_price',
          ...commonData,
        },
      });
      createdPlans.push(freePlan);
    } else {
      const monthlyPlan = await prisma.subscriptionPlan.upsert({
        where: { slug: `${baseSlug}-monthly` },
        update: {
          name: `${name} (Monthly)`,
          slug: `${baseSlug}-monthly`,
          description: descriptionMonthly || 'Full premium access, billed monthly',
          priceCents: Math.round(Number(monthlyPriceDollars) * 100),
          interval: 'MONTH',
          stripeProductId: 'manual_override',
          stripePriceId: 'manual_price_monthly',
          ...commonData,
        },
        create: {
          name: `${name} (Monthly)`,
          slug: `${baseSlug}-monthly`,
          description: descriptionMonthly || 'Full premium access, billed monthly',
          priceCents: Math.round(Number(monthlyPriceDollars) * 100),
          interval: 'MONTH',
          stripeProductId: 'manual_override',
          stripePriceId: 'manual_price_monthly',
          ...commonData,
        },
      });

      const annualPlan = await prisma.subscriptionPlan.upsert({
        where: { slug: `${baseSlug}-annual` },
        update: {
          name: `${name} (Annual)`,
          slug: `${baseSlug}-annual`,
          description: descriptionAnnual || 'Best value - all premium features, billed annually',
          priceCents: Math.round(Number(annualPriceDollars) * 100),
          interval: 'YEAR',
          stripeProductId: 'manual_override',
          stripePriceId: 'manual_price_annual',
          ...commonData,
        },
        create: {
          name: `${name} (Annual)`,
          slug: `${baseSlug}-annual`,
          description: descriptionAnnual || 'Best value - all premium features, billed annually',
          priceCents: Math.round(Number(annualPriceDollars) * 100),
          interval: 'YEAR',
          stripeProductId: 'manual_override',
          stripePriceId: 'manual_price_annual',
          ...commonData,
        },
      });

      createdPlans.push(monthlyPlan, annualPlan);
    }

    return NextResponse.json({
      success: true,
      plans: createdPlans,
      config: {
        id: 'plan_' + Date.now(),
        name,
        slug: baseSlug,
        isFree: isFreeTier,
        monthlyPriceDollars: Number(monthlyPriceDollars) || 0,
        annualPriceDollars: Number(annualPriceDollars) || 0,
        monthlyBadge,
        annualBadge,
        trialBadge,
        descriptionMonthly,
        descriptionAnnual,
        buttonText,
        features,
        ...commonData,
      },
    });
  } catch (err: any) {
    console.error('Admin Create Plan Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save subscription packages' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planIdentifier = searchParams.get('id');

    if (!planIdentifier) {
      return NextResponse.json({ error: 'Missing plan identifier' }, { status: 400 });
    }

    await prisma.subscriptionPlan.deleteMany({
      where: {
        OR: [
          { id: planIdentifier },
          { slug: planIdentifier },
          { slug: `${planIdentifier}-monthly` },
          { slug: `${planIdentifier}-annual` }
        ]
      }
    }).catch(() => null);

    return NextResponse.json({ success: true, message: 'Package removed successfully' });
  } catch (err: any) {
    console.error('Admin Delete Plan Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete plan' }, { status: 500 });
  }
}
