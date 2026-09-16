'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles, Zap, Shield, CheckCircle2, RefreshCw, Star, ArrowRight } from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { getEffectiveThemeMode, applyThemeToDocument } from '@/lib/themeConfig';

interface PlanItem {
  id: string;
  name: string;
  slug: string;
  isFree: boolean;
  isDefault?: boolean;
  monthlyPriceDollars: number;
  annualPriceDollars: number;
  monthlyBadge?: string;
  annualBadge?: string;
  trialBadge?: string;
  descriptionMonthly?: string;
  descriptionAnnual?: string;
  buttonText?: string;
  aiRecipeLimit?: number;
  recipeLibraryLimit?: number;
  socialScrapeLimit?: number;
  canViewMacros?: boolean;
  allowedAiModels?: string;
  features?: string[];
  tokenLimit?: number;
  tokenReimburseFrequency?: string;
}

export default function PackagePricingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('annual');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  const syncTheme = useCallback(() => {
    const mode = getEffectiveThemeMode();
    setIsDayMode(mode === 'light');
    applyThemeToDocument();
  }, []);

  useEffect(() => {
    syncTheme();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('zecratary_theme_updated', syncTheme);
    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('zecratary_theme_updated', syncTheme);
    };
  }, [syncTheme]);

  useEffect(() => {
    initAuthStorage();
    setUser(getCurrentUser());

    fetch('/api/admin/plans', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data.plans) ? data.plans : Array.isArray(data) ? data : [];
        setPlans(list);
      })
      .catch(() => {});
  }, []);

  const handleSelectPlan = async (plan: PlanItem) => {
    if (!user) {
      router.push('/login?callbackUrl=/package');
      return;
    }

    setLoadingPlan(plan.id || plan.slug);
    setFeedback(null);

    try {
      const isFree = Boolean(plan.isFree || plan.monthlyPriceDollars === 0);
      const expiry = isFree ? null : new Date(Date.now() + (billingInterval === 'annual' ? 365 : 30) * 86400000).toISOString();
      const amount = isFree ? 0 : (billingInterval === 'annual' ? Number(plan.annualPriceDollars || 0) : Number(plan.monthlyPriceDollars || 0));

      if (!isFree) {
        await fetch('/api/admin/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: user.name,
            customerEmail: user.email,
            planName: `${plan.name} (${billingInterval})`,
            planSlug: plan.slug,
            amount,
            currency: 'USD',
            gateway: 'stripe',
            status: 'succeeded',
            testMode: true,
            expiryDate: expiry
          })
        });
      }

      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscriptionPlan: plan.slug,
          planExpiryDate: expiry
        })
      });

      const updated = { ...user, subscriptionPlan: plan.slug, planExpiryDate: expiry };
      setUser(updated);
      setFeedback({ msg: `Successfully activated ${plan.name}!`, success: true });
      setTimeout(() => router.push('/profile'), 1500);
    } catch (err: any) {
      setFeedback({ msg: err.message || 'Failed to update plan.', success: false });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-10 py-10 px-4 font-sans transition-colors duration-200 min-h-screen"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--color-primary,#E05638)]">
          Simple, Transparent Pricing
        </h1>
        <p className="text-sm" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
          Choose the culinary tier that fits your kitchen goals. Upgrade, downgrade, or cancel anytime.
        </p>

        {/* BILLING INTERVAL SWITCH */}
        <div className="inline-flex p-1 rounded-2xl border shadow-sm" style={{ backgroundColor: isDayMode ? '#f1f5f9' : '#111726', borderColor: isDayMode ? '#cbd5e1' : '#1e293b' }}>
          <button
            type="button"
            onClick={() => setBillingInterval('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              billingInterval === 'monthly' ? 'bg-[var(--color-primary,#E05638)] text-white shadow' : (isDayMode ? 'text-slate-600' : 'text-slate-400')
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('annual')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              billingInterval === 'annual' ? 'bg-[var(--color-primary,#E05638)] text-white shadow' : (isDayMode ? 'text-slate-600' : 'text-slate-400')
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase">Save 35%+</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 max-w-md mx-auto shadow-md ${
          feedback.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {feedback.success ? <CheckCircle2 className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* PLANS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = user?.subscriptionPlan === plan.slug;
          const price = plan.isFree ? 0 : (billingInterval === 'annual' ? Number(plan.annualPriceDollars || 0) : Number(plan.monthlyPriceDollars || 0));
          const badge = billingInterval === 'annual' ? (plan.annualBadge || plan.trialBadge) : plan.monthlyBadge;

          return (
            <div
              key={plan.id || plan.slug}
              className={`border-2 rounded-3xl p-6 flex flex-col justify-between relative shadow-xl transition-all duration-200 ${
                isCurrent ? 'ring-4 ring-emerald-500/30 scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
              style={{
                backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #111726)',
                borderColor: isCurrent ? '#10b981' : isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
              }}
            >
              {badge && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-md bg-[#10b981]">
                  {badge}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    {billingInterval === 'annual' ? (plan.descriptionAnnual || plan.descriptionMonthly) : plan.descriptionMonthly}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[var(--color-primary,#E05638)]">
                      {plan.isFree ? 'Free' : `$${Number(price).toFixed(2)}`}
                    </span>
                    {!plan.isFree && (
                      <span className="text-xs font-bold text-slate-500">
                        /{billingInterval === 'annual' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-xs" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                  {Array.isArray(plan.features) && plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t mt-6" style={{ borderColor: isDayMode ? '#e2e8f0' : '#1e293b' }}>
                <button
                  type="button"
                  disabled={isCurrent || loadingPlan === (plan.id || plan.slug)}
                  onClick={() => handleSelectPlan(plan)}
                  className="w-full py-3 rounded-2xl text-xs font-black text-white transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: isCurrent ? '#10b981' : 'var(--color-primary, #E05638)' }}
                >
                  {loadingPlan === (plan.id || plan.slug) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    plan.buttonText || (plan.isFree ? 'Get Started' : 'Subscribe Now')
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
