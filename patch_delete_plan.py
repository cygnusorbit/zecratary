import os

files = {}

# -------------------------------------------------------------
# 1. Update API Route with DELETE Handler
# -------------------------------------------------------------
files["apps/web/src/app/api/admin/plans/route.ts"] = """import { NextResponse } from 'next/server';
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
      where: { slug: slug || name.toLowerCase().replace(/\\s+/g, '-') },
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
        slug: slug || name.toLowerCase().replace(/\\s+/g, '-'),
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
"""

# -------------------------------------------------------------
# 2. Update Admin UI with Delete Actions & Confirmation
# -------------------------------------------------------------
files["apps/web/src/app/admin/plans/page.tsx"] = """'use client';
import { useState, useEffect } from 'react';
import { PlusCircle, PackageCheck, Zap, Trash2, Sparkles, AlertCircle } from 'lucide-react';

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [form, setForm] = useState({
    name: 'Free Taster',
    slug: 'free-taster',
    description: 'Complimentary kitchen access with basic recipe quotas.',
    priceDollars: 0,
    interval: 'MONTH',
    aiRecipeLimit: 10,
    recipeLibraryLimit: 30,
    socialScrapeLimit: 5,
    canViewMacros: true,
    allowedAiModels: 'gemini-1.5-flash,gpt-4o-mini',
  });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (e) {
      console.error('Could not fetch plans:', e);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          priceCents: isFree ? 0 : Math.round(Number(form.priceDollars) * 100),
          isFree,
          allowedAiModels: form.allowedAiModels.split(',').map((m) => m.trim()),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: `Package "${data.plan.name}" saved successfully!` });
        fetchPlans();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to save package.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Network error saving plan.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    setDeletingId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/plans?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', msg: `Package "${name}" deleted.` });
        fetchPlans();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to delete package.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Network error deleting plan.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638] flex items-center gap-2">
          <Zap className="h-8 w-8 text-[#E05638]" /> Subscription Package Creator
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Create, customize quotas, and delete subscription tiers in real time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Creation Form */}
        <form onSubmit={handleCreatePlan} className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-4 md:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <PlusCircle className="h-5 w-5 text-emerald-400" /> New Package
            </h2>
            <button
              type="button"
              onClick={() => setIsFree(!isFree)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${
                isFree
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isFree ? '⚡ Free (No Stripe)' : '💳 Stripe Paid'}
            </button>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{feedback.msg}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Plan Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/\\s+/g, '-'),
                })
              }
              placeholder="e.g. Free Starter"
              className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-sm mt-1 text-white focus:outline-none focus:border-[#E05638]"
            />
          </div>

          {!isFree ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Price (USD $)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.priceDollars}
                  onChange={(e) => setForm({ ...form, priceDollars: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-sm mt-1 text-white focus:outline-none focus:border-[#E05638]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Interval</label>
                <select
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-sm mt-1 text-white focus:outline-none focus:border-[#E05638]"
                >
                  <option value="MONTH">Monthly</option>
                  <option value="YEAR">Annual</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              🌱 <strong>Zero-Cost Package:</strong> Bypasses Stripe checkout.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-slate-400 font-semibold">AI Quota</label>
              <input
                type="number"
                value={form.aiRecipeLimit}
                onChange={(e) => setForm({ ...form, aiRecipeLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0B101D] border border-slate-700 rounded-lg p-2 mt-1 text-white"
              />
              <span className="text-[10px] text-slate-500">-1 = Unlimited</span>
            </div>
            <div>
              <label className="text-slate-400 font-semibold">Saved Max</label>
              <input
                type="number"
                value={form.recipeLibraryLimit}
                onChange={(e) => setForm({ ...form, recipeLibraryLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0B101D] border border-slate-700 rounded-lg p-2 mt-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold">Scrapes</label>
              <input
                type="number"
                value={form.socialScrapeLimit}
                onChange={(e) => setForm({ ...form, socialScrapeLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0B101D] border border-slate-700 rounded-lg p-2 mt-1 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold">Allowed AI Models</label>
            <input
              type="text"
              value={form.allowedAiModels}
              onChange={(e) => setForm({ ...form, allowedAiModels: e.target.value })}
              className="w-full bg-[#0B101D] border border-slate-700 rounded-xl p-2.5 text-xs mt-1 text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="macros"
              checked={form.canViewMacros}
              onChange={(e) => setForm({ ...form, canViewMacros: e.target.checked })}
              className="rounded bg-slate-800 text-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="macros" className="text-xs text-slate-300 cursor-pointer">
              Unlock Full Macro Nutrition Breakdown
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-xs shadow-lg shadow-[#E05638]/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Saving Package...' : isFree ? 'Publish Free Package' : 'Save & Sync Package'}
          </button>
        </form>

        {/* Active Packages List */}
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl md:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <PackageCheck className="h-5 w-5 text-emerald-400" /> Active System Packages ({plans.length})
          </h2>

          <div className="space-y-3">
            {plans.length === 0 ? (
              <div className="text-slate-500 text-xs py-8 text-center bg-[#0B101D] rounded-xl border border-slate-800">
                No subscription packages in database.
              </div>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-[#0B101D] border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      {p.priceCents === 0 ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          FREE
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#E05638]/20 text-[#E05638] border border-[#E05638]/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          ${(p.priceCents / 100).toFixed(2)} / {p.interval}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.aiRecipeLimit === -1 ? 'Unlimited' : p.aiRecipeLimit} AI recipes • {p.recipeLibraryLimit} saved max • {p.canViewMacros ? 'Macros unlocked' : 'Calories only'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs hidden sm:block">
                      <span className="text-[11px] font-mono text-slate-500">
                        {p.stripePriceId === 'free_price' ? 'No Stripe Sync' : p.stripePriceId || 'Manual'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      onClick={() => handleDeletePlan(p.id, p.name)}
                      className="p-2.5 bg-red-950/40 border border-red-500/20 hover:bg-red-900/50 text-red-400 rounded-xl transition disabled:opacity-50"
                      title="Delete Package"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
"""

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("⚡ Package delete functionality installed!")
