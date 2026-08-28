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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      name,
      slug,
      description,
      priceCents = 0,
      interval = 'MONTH',
      aiRecipeLimit = 5,
      recipeLibraryLimit = 25,
      socialScrapeLimit = 3,
      canViewMacros = false,
      allowedAiModels = ['gemini-1.5-flash', 'gpt-4o-mini'],
      isFree = false,
    } = data;

    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    const isFreeTier = isFree || priceCents === 0;

    if (!isFreeTier && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('...')) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

        const stripeProduct = await stripe.products.create({
          name,
          description: description || undefined,
          metadata: { slug },
        });

        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: priceCents,
          currency: 'usd',
          recurring: {
            interval: interval.toLowerCase() === 'year' ? 'year' : 'month',
          },
        });

        stripeProductId = stripeProduct.id;
        stripePriceId = stripePrice.id;
      } catch (stripeErr: any) {
        console.warn('⚠️ Stripe sync failed, continuing as local plan:', stripeErr.message);
      }
    }

    const newPlan = await prisma.subscriptionPlan.upsert({
      where: { slug: slug || name.toLowerCase().replace(/\s+/g, '-') },
      update: {
        name,
        description,
        priceCents: isFreeTier ? 0 : priceCents,
        interval: interval.toUpperCase() === 'YEAR' ? 'YEAR' : 'MONTH',
        aiRecipeLimit: parseInt(aiRecipeLimit),
        recipeLibraryLimit: parseInt(recipeLibraryLimit),
        socialScrapeLimit: parseInt(socialScrapeLimit),
        canViewMacros: Boolean(canViewMacros),
        allowedAiModels: Array.isArray(allowedAiModels) ? allowedAiModels : [allowedAiModels],
        stripeProductId: stripeProductId || (isFreeTier ? 'free_tier' : 'manual_override'),
        stripePriceId: stripePriceId || (isFreeTier ? 'free_price' : 'manual_price'),
      },
      create: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        priceCents: isFreeTier ? 0 : priceCents,
        interval: interval.toUpperCase() === 'YEAR' ? 'YEAR' : 'MONTH',
        aiRecipeLimit: parseInt(aiRecipeLimit),
        recipeLibraryLimit: parseInt(recipeLibraryLimit),
        socialScrapeLimit: parseInt(socialScrapeLimit),
        canViewMacros: Boolean(canViewMacros),
        allowedAiModels: Array.isArray(allowedAiModels) ? allowedAiModels : [allowedAiModels],
        stripeProductId: stripeProductId || (isFreeTier ? 'free_tier' : 'manual_override'),
        stripePriceId: stripePriceId || (isFreeTier ? 'free_price' : 'manual_price'),
      },
    });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err: any) {
    console.error('Admin Create Plan Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create subscription package' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Missing plan ID parameter' }, { status: 400 });
    }

    // Check if any active user subscriptions are linked to this plan
    const activeSubCount = await prisma.subscription.count({
      where: { planId },
    });

    if (activeSubCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${activeSubCount} active subscriber(s) are currently attached to this package.` },
        { status: 409 }
      );
    }

    await prisma.subscriptionPlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true, message: 'Package deleted successfully' });
  } catch (err: any) {
    console.error('Admin Delete Plan Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete plan' }, { status: 500 });
  }
}
