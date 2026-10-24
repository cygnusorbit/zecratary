// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChefHat, Sparkles, BookOpen, Package, Calendar, Coins, Wallet, 
  ArrowRight, Clock, Users, Flame, Plus, UploadCloud, Utensils, 
  AlertTriangle, CheckCircle2, ChevronRight, Layers, ShieldCheck,
  RefreshCw, TrendingUp
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Live Stats aggregated from PostgreSQL
  const [stats, setStats] = useState({
    savedRecipes: 0,
    scheduledMeals: 0,
    pantryItems: 0,
    tokenBalance: 50,
    walletBalance: 0.00,
    userPlan: 'Taster (Free)',
    expiringItemsCount: 0,
    expiringItemsList: [] as string[],
    upcomingMeal: null as any,
    recentRecipes: [] as any[]
  });

  const loadDashboardData = useCallback(async (user: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';
    const targetEmail = user?.email || 'admin@zecratary.com';
    setLoading(true);

    try {
      const res = await fetch(`/api/dashboard/stats?userId=${encodeURIComponent(targetUserId)}&email=${encodeURIComponent(targetEmail)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats(data.stats);
          return;
        }
      }
    } catch (e) {
      console.warn('[DashboardPage] API load notice:', e);
    } finally {
      setLoading(false);
    }

    // LocalStorage Fallback for offline usage
    if (typeof window !== 'undefined') {
      try {
        const rawRecipes = localStorage.getItem('zecratary_saved_recipes') || '[]';
        const recList = JSON.parse(rawRecipes);
        const rawPantry = localStorage.getItem('zecratary_pantry_items') || '[]';
        const panList = JSON.parse(rawPantry);

        setStats(prev => ({
          ...prev,
          savedRecipes: Array.isArray(recList) ? recList.length : 0,
          pantryItems: Array.isArray(panList) ? panList.length : 0,
          recentRecipes: Array.isArray(recList) ? recList.slice(0, 3) : []
        }));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    loadDashboardData(user);

    const handleSync = () => {
      const u = getCurrentUser();
      if (u) {
        setCurrentUser(u);
        loadDashboardData(u);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_pantry_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);
    window.addEventListener('zecratary_tokens_updated', handleSync);
    window.addEventListener('zecratary_wallet_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
      window.removeEventListener('zecratary_tokens_updated', handleSync);
      window.removeEventListener('zecratary_wallet_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadDashboardData, router]);

  // Safe localized user welcome interpolation (Overload-Safe String Fallback)
  const welcomeText = useMemo(() => {
    const rawTemplate = t('dashboardWelcomePrefix', 'Welcome back, {name}!');
    const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Chef';
    return rawTemplate.replace('{name}', displayName);
  }, [currentUser, t]);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. Welcome Hero & Membership Telemetry Strip */}
      <div 
        className="p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="space-y-2 max-w-xl z-10">
          <div className="flex items-center gap-2">
            <span 
              className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              {t('activeMembership', 'Active Tier')}: {stats.userPlan || 'Taster'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
            {welcomeText}
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('dashboardSubtitle', 'Autonomous culinary planning, inventory tracking, and chef-grade recipes.')}
          </p>
        </div>

        {/* Spendable Asset Badges & Management Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          <div 
            className="p-3.5 rounded-2xl border shadow-xs flex items-center gap-3"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                {t('statsTokensRemaining', 'Tokens Remaining')}
              </span>
              <div className="text-base font-black font-mono">
                {stats.tokenBalance.toLocaleString()} <span className="text-amber-500 text-xs">🪙</span>
              </div>
            </div>
            <Link 
              href="/token"
              className="ml-2 text-[10px] font-bold px-2.5 py-1.5 rounded-xl text-white transition hover:opacity-90 shadow-xs"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {t('topUpTokens', 'Top Up')}
            </Link>
          </div>

          <div 
            className="p-3.5 rounded-2xl border shadow-xs flex items-center gap-3"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                {t('walletCredits', 'Wallet Balance')}
              </span>
              <div className="text-base font-black font-mono text-emerald-400">
                ${stats.walletBalance.toFixed(2)}
              </div>
            </div>
            <Link 
              href="/wallet"
              className="ml-2 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition shadow-xs hover:opacity-80"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {t('addFunds', 'Add Funds')}
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Proactive Pantry Spoilage Warning Alert */}
      {stats.expiringItemsCount > 0 && (
        <div 
          className="p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in transition"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: '#f59e0b',
            color: 'var(--color-text)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-500">
                {t('expiringPantryAlert', 'Pantry Spoilage Alert')}
              </h4>
              <p className="text-xs opacity-80 mt-0.5">
                {(t('expiringPantryDesc', '{count} ingredient(s) are expiring soon in your pantry stock.'))
                  .replace('{count}', String(stats.expiringItemsCount))}
              </p>
            </div>
          </div>

          <Link
            href={`/chef?prompt=${encodeURIComponent(`Cook a delicious recipe with these expiring pantry ingredients: ${stats.expiringItemsList.slice(0, 4).join(', ')}`)}`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm hover:opacity-90 inline-flex items-center justify-center gap-1.5 shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('cookExpiringAction', 'Cook with Chef AI')}</span>
          </Link>
        </div>
      )}

      {/* 3. Primary Metrics Grid (4-Way Live Counter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('statsRecipes', 'Saved Recipes'), value: stats.savedRecipes, icon: BookOpen, href: '/saved', color: 'var(--color-primary)' },
          { label: t('statsMealPlans', 'Scheduled Meals'), value: stats.scheduledMeals, icon: Calendar, href: '/planner', color: '#0ea5e9' },
          { label: t('statsPantryItems', 'Pantry in Stock'), value: stats.pantryItems, icon: Package, href: '/pantry', color: 'var(--color-emerald)' },
          { label: t('statsTokensRemaining', 'Tokens Remaining'), value: stats.tokenBalance, icon: Coins, href: '/token', color: '#f59e0b' }
        ].map((stat, idx) => (
          <Link
            key={idx}
            href={stat.href}
            className="p-5 rounded-3xl border shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3 group"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold opacity-75">{stat.label}</span>
              <div className="p-2 rounded-xl transition group-hover:scale-110" style={{ backgroundColor: 'var(--color-inner-dark)' }}>
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-black font-mono">
              {loading ? '—' : stat.value.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>

      {/* 4. Upcoming Scheduled Meal & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Scheduled Meal Card (1 Col) */}
        <div 
          className="p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                {t('upcomingMeal', 'Upcoming Scheduled Meal')}
              </span>
              <Calendar className="h-4 w-4 opacity-50" />
            </div>

            {stats.upcomingMeal ? (
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border text-emerald-400" style={{ borderColor: 'var(--color-border)' }}>
                    {stats.upcomingMeal.mealType} • {stats.upcomingMeal.date}
                  </span>
                  <h3 className="font-extrabold text-base leading-snug">
                    {stats.upcomingMeal.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs opacity-75 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-400" />
                      {(stats.upcomingMeal.prepMinutes || 15) + (stats.upcomingMeal.cookMinutes || 25)}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {stats.upcomingMeal.servings || 2}
                    </span>
                  </div>
                </div>

                <Link
                  href="/planner"
                  className="w-full py-2.5 rounded-xl border text-xs font-bold text-center block transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  {t('startCooking', 'View Recipe')}
                </Link>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <Utensils className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-xs opacity-70">
                  {t('noUpcomingMeal', 'No meals scheduled for today.')}
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <Link
                    href="/planner"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {t('scheduleNow', 'Plan on Calendar')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Culinary Actions Suite (2 Cols) */}
        <div 
          className="lg:col-span-2 p-6 rounded-3xl border shadow-sm space-y-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
              {t('quickActions', 'Quick Culinary Actions')}
            </h3>
            <Sparkles className="h-4 w-4 opacity-50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { title: t('askChefAction', 'Ask Chef AI'), desc: t('askChefDesc', 'Formulate custom recipes & plans'), icon: ChefHat, href: '/chef', color: 'var(--color-primary)' },
              { title: t('importAction', 'Import Recipe'), desc: t('importDesc', 'From web URL, text, or photos'), icon: UploadCloud, href: '/import', color: '#0ea5e9' },
              { title: t('createAction', 'Create Recipe'), desc: t('createDesc', 'Handmade recipe entry'), icon: Plus, href: '/manual', color: 'var(--color-emerald)' },
              { title: t('planAction', 'Plan Meals'), desc: t('planDesc', 'Schedule your weekly calendar'), icon: Calendar, href: '/planner', color: '#f59e0b' },
            ].map((act, i) => (
              <Link
                key={i}
                href={act.href}
                className="p-4 rounded-2xl border transition shadow-xs hover:shadow-md flex items-start gap-3.5 group cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div className="p-3 rounded-xl border shrink-0 transition group-hover:scale-105" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <act.icon className="h-5 w-5" style={{ color: act.color }} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-bold text-xs flex items-center gap-1 group-hover:text-[var(--color-primary)] transition">
                    <span>{act.title}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-0.5" />
                  </h4>
                  <p className="text-[11px] opacity-70 line-clamp-1">
                    {act.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Recent Recipe Creations Showcase */}
      <div 
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="font-extrabold text-sm" style={{ color: 'var(--color-text)' }}>
              {t('recentRecipes', 'Recent Recipe Creations')}
            </h3>
          </div>
          <Link
            href="/saved"
            className="text-xs font-bold flex items-center gap-1 text-[var(--color-primary)] hover:underline"
          >
            <span>{t('viewAllRecipes', 'View All')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {stats.recentRecipes.length === 0 ? (
          <div className="py-12 text-center text-xs opacity-60">
            {t('noRecentRecipes', 'No saved recipes yet. Create or import your first recipe!')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.recentRecipes.map((rec) => (
              <Link
                key={rec.id}
                href="/saved"
                className="border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
              >
                <div className="relative h-32 w-full overflow-hidden">
                  <img src={rec.imageUrl} alt={rec.title} className="w-full h-full object-cover transition group-hover:scale-105" />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-md">
                    {rec.recipeType}
                  </span>
                </div>
                <div className="p-3.5 space-y-1">
                  <h4 className="font-extrabold text-xs line-clamp-1 group-hover:text-[var(--color-primary)] transition">
                    {rec.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] opacity-75">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-400" />
                      {rec.prepTimeMinutes + rec.cookTimeMinutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {rec.servings}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                      {rec.calories} kcal
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
