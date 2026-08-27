import os

code = """'use client';
import { useState } from 'react';
import { Check, Sparkles, Box, Shield, Zap } from 'lucide-react';

export default function PackagePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free Starter',
      priceMonthly: 0,
      priceYearly: 0,
      description: 'Essential cooking and recipe management tools for everyday home cooks.',
      features: [
        'Up to 25 Saved Recipes',
        'Basic AI Chef Assistant',
        'Manual Recipe Creator',
        'Standard Shopping List',
      ],
      current: true,
      buttonText: 'Current Plan',
      highlighted: false,
    },
    {
      name: 'Pro Chef',
      priceMonthly: 9.99,
      priceYearly: 7.99,
      description: 'Advanced AI recipe generation, nutritional info, and unlimited storage.',
      features: [
        'Unlimited Saved Recipes',
        'Advanced AI Chef (Gemini & GPT-4o)',
        'Full Nutritional Information Access',
        'URL & Video Recipe Scraping',
        'Meal Planner Integration',
      ],
      current: false,
      buttonText: 'Upgrade to Pro',
      highlighted: true,
    },
    {
      name: 'Household / Family',
      priceMonthly: 19.99,
      priceYearly: 15.99,
      description: 'Collaborative meal planning and shared pantry tools for the whole family.',
      features: [
        'Everything in Pro Chef',
        'Shared Family Cookbook & Pantry',
        'Multi-user Meal Planning',
        'Priority AI Processing',
        'Dedicated Support',
      ],
      current: false,
      buttonText: 'Get Family Plan',
      highlighted: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-slate-100 pb-16">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E05638]/10 text-[#E05638] text-xs font-bold border border-[#E05638]/20">
          <Sparkles className="h-3.5 w-3.5" /> Subscription Tiers
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Choose the Perfect Plan for Your Kitchen
        </h1>
        <p className="text-sm text-slate-400">
          Upgrade your culinary workflow with advanced AI recipes, automated scraping, and unlimited storage.
        </p>

        {/* Billing Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 bg-slate-800 rounded-full p-1 relative transition border border-slate-700"
          >
            <div className={`w-4 h-4 bg-[#E05638] rounded-full transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400'}`}>
            Yearly <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan, idx) => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          return (
            <div
              key={idx}
              className={`bg-[#111726] rounded-3xl p-6 flex flex-col justify-between border transition relative ${
                plan.highlighted ? 'border-[#E05638] shadow-xl shadow-[#E05638]/10 ring-1 ring-[#E05638]/50' : 'border-slate-800'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E05638] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 py-2 border-y border-slate-800/80">
                  <span className="text-3xl font-black text-white">${price}</span>
                  <span className="text-xs text-slate-400 font-medium">/ month {billingCycle === 'yearly' && price > 0 ? '(billed annually)' : ''}</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled={plan.current}
                  onClick={() => alert(`Selected ${plan.name} plan!`)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition shadow-md ${
                    plan.current
                      ? 'bg-slate-800 text-slate-400 cursor-default'
                      : plan.highlighted
                      ? 'bg-[#E05638] hover:bg-[#c94529] text-white shadow-[#E05638]/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"""

os.makedirs("apps/web/src/app/package", exist_ok=True)
with open("apps/web/src/app/package/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Package page successfully created at http://localhost:3000/package!")
