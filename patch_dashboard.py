import os
import sys

# 1. Update /api/dashboard/stats/route.ts with isHighestPlan and grocery items count
API_STATS_CODE = """import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || '';
  const email = searchParams.get('email') || '';

  const fallbackData = {
    recipesCount: 0,
    recipeBooksCount: 0,
    pantryStockCount: 0,
    groceryItemsCount: 0,
    expiringPantryCount: 0,
    tokenBalance: 0,
    walletBalance: 0,
    walletSymbol: '$',
    subscriptionPlan: 'taster',
    isHighestPlan: false,
    upcomingMeal: null
  };

  if (!userId && !email) {
    return NextResponse.json({ success: true, stats: fallbackData }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }

  try {
    const db = (pool as any).default || (pool as any).pool || pool;
    if (!db || typeof db.query !== 'function') {
      return NextResponse.json({ success: true, stats: fallbackData }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // 1. User Assets & Subscription Plan
    let userPlan = 'taster';
    try {
      const uRes = await db.query(
        `SELECT token_balance, wallet_balance, subscription_plan 
         FROM users 
         WHERE id = $1 OR email = $2 
         LIMIT 1`,
        [userId, email]
      );
      if (uRes.rows && uRes.rows.length > 0) {
        const u = uRes.rows[0];
        fallbackData.tokenBalance = Number(u.token_balance) || 0;
        fallbackData.walletBalance = Number(u.wallet_balance) || 0;
        userPlan = (u.subscription_plan || 'taster').toLowerCase();
        fallbackData.subscriptionPlan = userPlan;
      }
    } catch (_) {}

    // 2. Determine Highest Subscription Plan Tier
    try {
      const planRes = await db.query(
        `SELECT slug, name, COALESCE(price, monthly_price, 0) as price_val, sort_order 
         FROM subscription_plans 
         WHERE is_active = true OR is_active IS NULL 
         ORDER BY sort_order DESC, price_val DESC`
      );
      if (planRes.rows && planRes.rows.length > 0) {
        const topPlanSlug = (planRes.rows[0].slug || '').toLowerCase();
        const topPlanName = (planRes.rows[0].name || '').toLowerCase();
        fallbackData.isHighestPlan = (userPlan === topPlanSlug || userPlan === topPlanName);
      } else {
        const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
        fallbackData.isHighestPlan = topTiers.includes(userPlan);
      }
    } catch (_) {
      const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
      fallbackData.isHighestPlan = topTiers.includes(userPlan);
    }

    // 3. Saved Recipes Count
    try {
      const rRes = await db.query(
        `SELECT COUNT(*)::int AS count 
         FROM saved_recipes 
         WHERE user_id = $1 OR created_by = $2`,
        [userId, email]
      );
      if (rRes.rows && rRes.rows.length > 0) {
        fallbackData.recipesCount = Number(rRes.rows[0].count) || 0;
      }
    } catch (_) {
      try {
        const altRRes = await db.query(
          `SELECT COUNT(*)::int AS count 
           FROM recipes 
           WHERE user_id = $1 OR created_by = $2`,
          [userId, email]
        );
        if (altRRes.rows && altRRes.rows.length > 0) {
          fallbackData.recipesCount = Number(altRRes.rows[0].count) || 0;
        }
      } catch (_) {}
    }

    // 4. Recipe Books Count
    try {
      const bRes = await db.query(
        `SELECT COUNT(*)::int AS count 
         FROM recipe_books 
         WHERE user_id = $1 OR created_by = $2`,
        [userId, email]
      );
      if (bRes.rows && bRes.rows.length > 0 && Number(bRes.rows[0].count) > 0) {
        fallbackData.recipeBooksCount = Number(bRes.rows[0].count);
      } else {
        const catRes = await db.query(
          `SELECT COUNT(DISTINCT category)::int AS count 
           FROM saved_recipes 
           WHERE user_id = $1 OR created_by = $2`,
          [userId, email]
        );
        fallbackData.recipeBooksCount = (catRes.rows && catRes.rows[0]) ? Number(catRes.rows[0].count) || 0 : 0;
      }
    } catch (_) {
      fallbackData.recipeBooksCount = 0;
    }

    // 5. Pantry Items & Expiring Soon
    try {
      const pRes = await db.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= (CURRENT_DATE + INTERVAL '3 days') THEN 1 END)::int AS expiring
         FROM pantry_items 
         WHERE user_id = $1 OR created_by = $2`,
        [userId, email]
      );
      if (pRes.rows && pRes.rows.length > 0) {
        fallbackData.pantryStockCount = Number(pRes.rows[0].total) || 0;
        fallbackData.expiringPantryCount = Number(pRes.rows[0].expiring) || 0;
      }
    } catch (_) {}

    // 6. Shopping List / Grocery Items (Unchecked)
    try {
      const gRes = await db.query(
        `SELECT COUNT(*)::int AS count 
         FROM grocery_items 
         WHERE (user_id = $1 OR created_by = $2) AND (checked IS FALSE OR checked IS NULL)`,
        [userId, email]
      );
      if (gRes.rows && gRes.rows.length > 0) {
        fallbackData.groceryItemsCount = Number(gRes.rows[0].count) || 0;
      }
    } catch (_) {}

    // 7. Upcoming Meal from Planner
    try {
      const planRes = await db.query(
        `SELECT id, meal_type, recipe_name, title, meal_date, meal_time, image_url, notes 
         FROM planner_meals 
         WHERE (user_id = $1 OR created_by = $2) AND meal_date >= CURRENT_DATE 
         ORDER BY meal_date ASC, id ASC 
         LIMIT 1`,
        [userId, email]
      );
      if (planRes.rows && planRes.rows.length > 0) {
        const m = planRes.rows[0];
        fallbackData.upcomingMeal = {
          mealType: (m.meal_type || 'Dinner').toUpperCase(),
          title: m.recipe_name || m.title || 'Scheduled Dish',
          timeOrTags: m.meal_time ? `${m.meal_time} • Scheduled` : '40 mins • Scheduled',
          notes: m.notes || undefined,
          imageUrl: m.image_url || undefined,
          date: m.meal_date
        } as any;
      }
    } catch (_) {}

    return NextResponse.json({ success: true, stats: fallbackData }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, stats: fallbackData }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}
"""

# 2. Update apps/web/src/app/dashboard/page.tsx
DASHBOARD_PAGE_CODE = """'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChefHat, 
  Calendar, 
  Sparkles,
  Clock,
  Utensils,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  Package,
  ShoppingCart,
  DownloadCloud,
  AlertCircle,
  Flame,
  Zap
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface UpcomingMealData {
  mealType: string;
  title: string;
  timeOrTags: string;
  notes?: string;
  imageUrl?: string;
  date?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Dynamic Metrics & Subscription Status
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [recipeBooksCount, setRecipeBooksCount] = useState<number>(0);
  const [pantryStockCount, setPantryStockCount] = useState<number>(0);
  const [groceryItemsCount, setGroceryItemsCount] = useState<number>(0);
  const [expiringPantryCount, setExpiringPantryCount] = useState<number>(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('taster');
  const [isHighestPlan, setIsHighestPlan] = useState<boolean>(false);
  const [upcomingMeal, setUpcomingMeal] = useState<UpcomingMealData | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshFeedback, setRefreshFeedback] = useState<boolean>(false);

  // Day / Dark Mode Dynamic Bindings
  const [isDayMode, setIsDayMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      document.documentElement.classList.contains('light') ||
      localStorage.getItem('zecratary_theme_mode') === 'day' ||
      localStorage.getItem('zecratary_theme_mode') === 'light'
    );
  });

  const syncThemeMode = useCallback(() => {
    if (typeof window === 'undefined') return;
    const mode = localStorage.getItem('zecratary_theme_mode');
    const isDay = mode === 'day' || mode === 'light' || document.documentElement.classList.contains('light');
    setIsDayMode(isDay);
  }, []);

  useEffect(() => {
    syncThemeMode();
    window.addEventListener('zecratary_theme_mode_changed', syncThemeMode);
    window.addEventListener('zecratary_theme_changed', syncThemeMode);
    window.addEventListener('zecratary_theme_updated', syncThemeMode);
    window.addEventListener('storage', syncThemeMode);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', syncThemeMode);
      window.removeEventListener('zecratary_theme_changed', syncThemeMode);
      window.removeEventListener('zecratary_theme_updated', syncThemeMode);
      window.removeEventListener('storage', syncThemeMode);
    };
  }, [syncThemeMode]);

  // Client Offline Storage Fallback
  const computeLocalFallbackMetrics = useCallback((user: User | null) => {
    if (!user || typeof window === 'undefined') return;

    // Saved Recipes
    let localRecipes: any[] = [];
    try {
      const raw = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          for (const item of parsed) {
            const key = String(item.id || item.title || item.name || '').trim();
            if (!key || seen.has(key)) continue;
            if (item.userId === user.id || item.createdBy === user.email) {
              seen.add(key);
              localRecipes.push(item);
            }
          }
          setRecipesCount(localRecipes.length);
        }
      }
    } catch (_) {}

    // Recipe Books
    try {
      const booksRaw = localStorage.getItem('zecratary_recipe_books');
      if (booksRaw) {
        const parsedBooks = JSON.parse(booksRaw);
        if (Array.isArray(parsedBooks) && parsedBooks.length > 0) {
          const userBooks = parsedBooks.filter((b: any) => 
            b.userId === user.id || b.createdBy === user.email
          );
          setRecipeBooksCount(userBooks.length > 0 ? userBooks.length : 0);
        }
      } else if (localRecipes.length > 0) {
        const categories = new Set(localRecipes.map((r: any) => r.category || r.recipeType || 'Main Dish'));
        setRecipeBooksCount(categories.size);
      }
    } catch (_) {}

    // Pantry Stock
    try {
      const pantryRaw = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
      if (pantryRaw) {
        const parsedPantry = JSON.parse(pantryRaw);
        if (Array.isArray(parsedPantry)) {
          const userPantry = parsedPantry.filter((p: any) => 
            p.userId === user.id || p.createdBy === user.email
          );
          setPantryStockCount(userPantry.length);
        }
      }
    } catch (_) {}

    // Shopping List (Unchecked items)
    try {
      const shopRaw = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_shopping');
      if (shopRaw) {
        const parsedShop = JSON.parse(shopRaw);
        if (Array.isArray(parsedShop)) {
          const userShop = parsedShop.filter((i: any) => 
            (i.userId === user.id || i.createdBy === user.email) && !i.checked
          );
          setGroceryItemsCount(userShop.length);
        }
      }
    } catch (_) {}

    // Active Plan & Highest Tier Local Evaluation
    const plan = (user.subscriptionPlan || (user as any).plan || 'taster').toLowerCase();
    setSubscriptionPlan(plan);
    const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
    setIsHighestPlan(topTiers.includes(plan));

    // Upcoming Meal
    try {
      const planRaw = localStorage.getItem('zecratary_meal_plan');
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (planRaw) {
        const parsedPlan = JSON.parse(planRaw);
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          const userPlan = parsedPlan.filter((m: any) => 
            m.userId === user.id || m.createdBy === user.email
          );
          if (userPlan.length > 0) {
            const todayMeals = userPlan.filter((m: any) => m.date === todayStr);
            const mealToDisplay = todayMeals.length > 0 ? todayMeals[0] : userPlan[0];
            const mealTitle = mealToDisplay.recipeName || mealToDisplay.title || 'Planned Dish';

            const matchingRecipe = localRecipes.find((r: any) => 
              (r.title || r.name)?.toLowerCase() === mealTitle.toLowerCase()
            );

            setUpcomingMeal({
              mealType: (mealToDisplay.mealType || 'Dinner').toUpperCase(),
              title: mealTitle,
              timeOrTags: mealToDisplay.time ? `${mealToDisplay.time} • ${t('scheduledLabel') || 'Scheduled'}` : `40 mins • ${t('scheduledLabel') || 'Scheduled'}`,
              notes: mealToDisplay.notes,
              imageUrl: mealToDisplay.imageUrl || mealToDisplay.image || matchingRecipe?.imageUrl || matchingRecipe?.image,
              date: mealToDisplay.date
            });
            return;
          }
        }
      }

      if (localRecipes.length > 0) {
        const first = localRecipes[0];
        const prep = parseInt(first.prepTimeMinutes || first.prepTime) || 15;
        const cook = parseInt(first.cookTimeMinutes || first.cookTime) || 20;
        setUpcomingMeal({
          mealType: (first.category || first.recipeType || 'Dinner').toUpperCase(),
          title: first.title || first.name || 'Saved Dish',
          timeOrTags: `${prep + cook} mins • ${first.tags?.[0] || t('favorite') || 'Favorite'}`,
          imageUrl: first.imageUrl || first.image
        });
      }
    } catch (_) {}
  }, [t]);

  // Primary Hydration from Database
  const isFetchingRef = useRef(false);
  const fetchDashboardStats = useCallback(async (activeUser: User | null) => {
    if (!activeUser || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(
        `/api/dashboard/stats?userId=${encodeURIComponent(activeUser.id)}&email=${encodeURIComponent(activeUser.email)}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          const s = data.stats;
          setRecipesCount(s.recipesCount ?? 0);
          setRecipeBooksCount(s.recipeBooksCount ?? 0);
          setPantryStockCount(s.pantryStockCount ?? 0);
          setGroceryItemsCount(s.groceryItemsCount ?? 0);
          setExpiringPantryCount(s.expiringPantryCount ?? 0);
          if (s.subscriptionPlan) setSubscriptionPlan(s.subscriptionPlan);
          if (typeof s.isHighestPlan === 'boolean') {
            setIsHighestPlan(s.isHighestPlan);
          } else {
            const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
            setIsHighestPlan(topTiers.includes((s.subscriptionPlan || '').toLowerCase()));
          }
          if (s.upcomingMeal) {
            setUpcomingMeal(s.upcomingMeal);
          }
        }
      }
    } catch (err) {
      computeLocalFallbackMetrics(activeUser);
    } finally {
      isFetchingRef.current = false;
    }
  }, [computeLocalFallbackMetrics]);

  // Manual Telemetry Refresh
  const handleManualRefresh = async () => {
    if (loading) return;
    setLoading(true);
    setRefreshFeedback(false);

    initAuthStorage();
    const activeUser = getCurrentUser();

    if (!activeUser) {
      router.replace('/login');
      return;
    }

    setCurrentUser(activeUser);
    syncThemeMode();
    await fetchDashboardStats(activeUser);

    window.dispatchEvent(new Event('zecratary_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    window.dispatchEvent(new Event('zecratary_pantry_updated'));
    window.dispatchEvent(new Event('zecratary_shopping_updated'));
    window.dispatchEvent(new Event('zecratary_subscriptions_updated'));

    setTimeout(() => {
      setLoading(false);
      setRefreshFeedback(true);
      setTimeout(() => setRefreshFeedback(false), 2500);
    }, 400);
  };

  // Lifecycle Initialization & Event Synchronization
  useEffect(() => {
    document.title = `${t('dashboard') || 'Dashboard'} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    setCurrentUser(user);
    computeLocalFallbackMetrics(user);
    fetchDashboardStats(user);

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleDebouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const active = getCurrentUser();
        if (active) {
          setCurrentUser(active);
          fetchDashboardStats(active);
        }
      }, 300);
    };

    window.addEventListener('storage', handleDebouncedSync);
    window.addEventListener('zecratary_recipes_updated', handleDebouncedSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleDebouncedSync);
    window.addEventListener('zecratary_planner_updated', handleDebouncedSync);
    window.addEventListener('zecratary_meal_plan_updated', handleDebouncedSync);
    window.addEventListener('zecratary_pantry_updated', handleDebouncedSync);
    window.addEventListener('zecratary_shopping_updated', handleDebouncedSync);
    window.addEventListener('zecratary_subscriptions_updated', handleDebouncedSync);
    window.addEventListener('zecratary_users_updated', handleDebouncedSync);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('storage', handleDebouncedSync);
      window.removeEventListener('zecratary_recipes_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_planner_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_meal_plan_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_pantry_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_shopping_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_subscriptions_updated', handleDebouncedSync);
      window.removeEventListener('zecratary_users_updated', handleDebouncedSync);
    };
  }, [computeLocalFallbackMetrics, fetchDashboardStats, router, t]);

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary, #10b981)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Theme Variables
  const cCardBg = isDayMode ? '#ffffff' : 'var(--color-card, #0f172a)';
  const cInnerBg = isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)';
  const cBorder = isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)';
  const cText = isDayMode ? '#0f172a' : 'var(--color-text, #f8fafc)';
  const cSubText = isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)';
  const cPrimary = 'var(--color-primary, #10b981)';
  const cEmerald = 'var(--color-emerald, #10b981)';

  return (
    <div 
      className="w-full space-y-6 pb-16 px-4 sm:px-6 md:px-8 lg:px-10 transition-colors duration-200"
      style={{ color: cText }}
    >
      {/* Top Heading & Telemetry Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: cPrimary }}>
            <Flame className="h-6 w-6" style={{ color: cPrimary }} />
            {t('dashboard') || 'Dashboard'}
          </h1>
          <p className="text-sm" style={{ color: cSubText }}>
            {t('dashboardSubtitle') || 'Autonomous culinary planning, smart pantry tracking, and recipe intelligence.'}
          </p>
        </div>

        {/* Refresh Action with Live Feedback */}
        <div className="flex items-center gap-3">
          {refreshFeedback && (
            <span 
              className="text-xs font-bold flex items-center gap-1.5 animate-in fade-in transition duration-300"
              style={{ color: cEmerald }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('refreshed') || 'Refreshed'}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="p-2.5 px-4 rounded-xl border transition flex items-center gap-2 text-xs font-bold cursor-pointer disabled:opacity-70 shadow-sm"
            style={{
              backgroundColor: cCardBg,
              borderColor: cBorder,
              color: cText
            }}
            title="Reload live telemetry from database"
          >
            <RefreshCw 
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
              style={{ color: cEmerald }}
            />
            <span>{loading ? (t('refreshing') || 'Refreshing...') : (t('refresh') || 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Task 2: Welcome Box with Active Plan & Upgrade/Change Button */}
      <div 
        className="p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-200"
        style={{
          backgroundColor: cCardBg,
          borderColor: cBorder
        }}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span 
              className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs"
              style={{
                backgroundColor: cInnerBg,
                borderColor: cBorder,
                color: cPrimary
              }}
            >
              {currentUser.role?.toUpperCase() || 'MEMBER'}
            </span>
            {isHighestPlan && (
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> {t('highestTier') || 'VIP Highest Tier'}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: cText }}>
            {(t('dashboardWelcomePrefix') || 'Welcome back, {name}!').replace('{name}', currentUser.name || currentUser.email || 'Chef')}
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: cSubText }}>
            {t('welcomePlanDescription') || 'Your kitchen headquarters for automated meal scheduling, inventory management, and personalized culinary creations.'}
          </p>
        </div>

        {/* Current User: Active Plan Card */}
        <div 
          role="presentation"
          className="w-full md:w-auto p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between sm:justify-start gap-4 sm:gap-6 transition-all duration-200 shrink-0"
          style={{
            backgroundColor: cInnerBg,
            borderColor: cBorder
          }}
        >
          <div className="space-y-1">
            <span 
              className="text-[10px] uppercase font-bold tracking-wider block"
              style={{ color: cSubText }}
            >
              {t('currentUserActivePlan') || 'Current User: Active Plan'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight uppercase" style={{ color: cEmerald }}>
                {subscriptionPlan || 'Taster'}
              </span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: cCardBg,
                  borderColor: cBorder,
                  color: isHighestPlan ? '#f59e0b' : cPrimary
                }}
              >
                {isHighestPlan ? (t('highestPlan') || 'Highest Tier') : (t('active') || 'Active')}
              </span>
            </div>
          </div>

          {/* Upgrade or Change CTA Trigger */}
          {isHighestPlan ? (
            <Link
              href="/subscriptions"
              className="px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer ml-auto md:ml-2"
              style={{
                backgroundColor: cCardBg,
                borderColor: cBorder,
                color: cText
              }}
              title="Change or manage active subscription plan"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('changePlan') || 'Change'}</span>
            </Link>
          ) : (
            <Link
              href="/subscriptions"
              className="px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer text-white ml-auto md:ml-2"
              style={{
                backgroundColor: cPrimary
              }}
              title="Upgrade to unlocked premium plan"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{t('upgradePlan') || 'Upgrade'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Proactive Spoilage Notification */}
      {expiringPantryCount > 0 && (
        <div 
          className="p-3.5 px-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in transition duration-300"
          style={{
            backgroundColor: isDayMode ? '#fffbeb' : 'rgba(245, 158, 11, 0.08)',
            borderColor: isDayMode ? '#fde68a' : 'rgba(245, 158, 11, 0.25)',
            color: isDayMode ? '#92400e' : '#fcd34d'
          }}
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>{expiringPantryCount} {t('pantryItems') || 'pantry item(s)'}</strong> {t('expiringWithin3Days') || 'are expiring within the next 3 days.'}
            </span>
          </div>
          <Link 
            href="/chef"
            className="font-bold underline flex items-center gap-1 shrink-0 text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            {t('askChefToUseThem') || 'Cook with Chef AI'} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Task 3: 4-Way KPI Metric Cards with Shopping List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saved Recipes */}
        <Link 
          href="/saved" 
          className="p-5 rounded-2xl block border transition shadow-sm group hover:scale-[1.01]"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div className="flex items-center justify-between">
            <span 
              className="text-xs uppercase font-bold tracking-wider"
              style={{ color: cSubText }}
            >
              {t('savedRecipes') || 'Saved Recipes'}
            </span>
            <BookOpen className="h-4 w-4 opacity-70 group-hover:scale-110 transition" style={{ color: cPrimary }} />
          </div>
          <span 
            className="text-3xl font-black mt-2 block"
            style={{ color: cPrimary }}
          >
            {loading ? '...' : recipesCount}
          </span>
        </Link>

        {/* Recipe Books */}
        <Link 
          href="/books" 
          className="p-5 rounded-2xl block border transition shadow-sm group hover:scale-[1.01]"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div className="flex items-center justify-between">
            <span 
              className="text-xs uppercase font-bold tracking-wider"
              style={{ color: cSubText }}
            >
              {t('books') || 'Recipe Books'}
            </span>
            <Utensils className="h-4 w-4 opacity-70 group-hover:scale-110 transition" style={{ color: cEmerald }} />
          </div>
          <span 
            className="text-3xl font-black mt-2 block"
            style={{ color: cEmerald }}
          >
            {loading ? '...' : recipeBooksCount}
          </span>
        </Link>

        {/* Pantry Stock */}
        <Link 
          href="/pantry" 
          className="p-5 rounded-2xl block border transition shadow-sm group hover:scale-[1.01]"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div className="flex items-center justify-between">
            <span 
              className="text-xs uppercase font-bold tracking-wider"
              style={{ color: cSubText }}
            >
              {t('pantryStock') || 'Pantry Stock'}
            </span>
            <Package className="h-4 w-4 opacity-70 group-hover:scale-110 transition" style={{ color: cPrimary }} />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span 
              className="text-3xl font-black block"
              style={{ color: cText }}
            >
              {loading ? '...' : pantryStockCount}
            </span>
            {expiringPantryCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                {expiringPantryCount} {t('expiringSoon') || 'expiring'}
              </span>
            )}
          </div>
        </Link>

        {/* Task 3 Replaced Card: Shopping List */}
        <Link 
          href="/shopping" 
          className="p-5 rounded-2xl block border transition shadow-sm group hover:scale-[1.01]"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div className="flex items-center justify-between">
            <span 
              className="text-xs uppercase font-bold tracking-wider"
              style={{ color: cSubText }}
            >
              {t('shoppingList') || 'Shopping List'}
            </span>
            <ShoppingCart className="h-4 w-4 opacity-70 group-hover:scale-110 transition" style={{ color: cEmerald }} />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span 
              className="text-3xl font-black block"
              style={{ color: cText }}
            >
              {loading ? '...' : groceryItemsCount}
            </span>
            {groceryItemsCount > 0 ? (
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.1)',
                  borderColor: isDayMode ? '#a7f3d0' : 'rgba(16, 185, 129, 0.3)',
                  color: cEmerald
                }}
              >
                {groceryItemsCount} {t('itemsNeeded') || 'items to buy'}
              </span>
            ) : (
              <span className="text-[10px] font-semibold opacity-60" style={{ color: cSubText }}>
                {t('allPurchased') || 'All caught up'}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Center 2-Column Section: Upcoming Meal & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Meal Card */}
        <div 
          className="p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between border transition-colors duration-200"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div 
            className="flex items-center justify-between border-b pb-3"
            style={{ borderColor: cBorder }}
          >
            <h3 
              className="text-base font-bold flex items-center gap-2"
              style={{ color: cText }}
            >
              <Calendar className="h-5 w-5" style={{ color: cPrimary }} /> {t('upcomingMeal') || 'Upcoming Meal'}
            </h3>
            <Link 
              href="/planner" 
              className="text-xs font-bold hover:underline flex items-center gap-1"
              style={{ color: cPrimary }}
            >
              {t('viewPlanner') || 'View Planner'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center my-2">
            {upcomingMeal ? (
              <div 
                className="p-4 rounded-xl border flex items-center gap-4 shadow-inner transition-colors duration-200"
                style={{
                  backgroundColor: cInnerBg,
                  borderColor: cBorder
                }}
              >
                {upcomingMeal.imageUrl ? (
                  <img
                    src={upcomingMeal.imageUrl}
                    alt={upcomingMeal.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border shrink-0 shadow-md"
                    style={{ borderColor: cBorder }}
                  />
                ) : (
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border shrink-0 flex items-center justify-center opacity-70"
                    style={{ 
                      borderColor: cBorder,
                      backgroundColor: cCardBg
                    }}
                  >
                    <Utensils className="h-6 w-6 opacity-70" />
                  </div>
                )}

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                      style={{ color: cEmerald }}
                    >
                      <Utensils className="h-3 w-3" /> {(t('todayMealPrefix') || 'Today • {mealType}').replace('{mealType}', upcomingMeal.mealType)}
                    </span>
                    {upcomingMeal.date && (
                      <span className="text-[10px] font-semibold opacity-70" style={{ color: cSubText }}>
                        {upcomingMeal.date}
                      </span>
                    )}
                  </div>
                  <h4 
                    className="font-bold text-base leading-tight mt-1 truncate"
                    style={{ color: cText }}
                  >
                    {upcomingMeal.title}
                  </h4>
                  <span 
                    className="text-xs flex items-center gap-1 pt-0.5"
                    style={{ color: cSubText }}
                  >
                    <Clock className="h-3.5 w-3.5" /> {upcomingMeal.timeOrTags}
                  </span>
                  {upcomingMeal.notes && (
                    <p 
                      className="text-xs italic mt-1 opacity-80 line-clamp-1"
                      style={{ color: cSubText }}
                    >
                      "{upcomingMeal.notes}"
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="p-5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-center sm:text-left"
                style={{
                  backgroundColor: cInnerBg,
                  borderColor: cBorder,
                  color: cSubText
                }}
              >
                <div>
                  <span className="font-semibold block text-sm" style={{ color: cText }}>
                    {t('noMealsScheduledToday') || 'No meals scheduled for today.'}
                  </span>
                  <span className="text-[11px] block mt-0.5">
                    {t('keepKitchenOrganized') || 'Keep your kitchen on track with a planned meal.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    href="/planner" 
                    className="px-3 py-1.5 rounded-lg border font-bold hover:underline transition"
                    style={{ backgroundColor: cCardBg, borderColor: cBorder, color: cPrimary }}
                  >
                    {t('planMeal') || 'Plan Meal'}
                  </Link>
                  <Link 
                    href="/chef" 
                    className="px-3 py-1.5 rounded-lg border font-bold hover:underline transition"
                    style={{ backgroundColor: cCardBg, borderColor: cBorder, color: cEmerald }}
                  >
                    {t('askChefAi') || 'Ask Chef AI'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div 
          className="p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between border transition-colors duration-200"
          style={{
            backgroundColor: cCardBg,
            borderColor: cBorder
          }}
        >
          <div 
            className="border-b pb-3 flex items-center justify-between"
            style={{ borderColor: cBorder }}
          >
            <h3 
              className="text-base font-bold flex items-center gap-2"
              style={{ color: cText }}
            >
              <ChefHat className="h-5 w-5" style={{ color: cEmerald }} /> {t('quickActions') || 'Quick Actions'}
            </h3>
            <span className="text-[11px] font-semibold" style={{ color: cSubText }}>
              {t('culinaryShortcuts') || 'Culinary Shortcuts'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-bold my-auto">
            {/* Ask Chef AI */}
            <Link 
              href="/chef" 
              className="p-3.5 rounded-xl flex items-center gap-2.5 transition group border shadow-sm hover:scale-[1.01]"
              style={{
                backgroundColor: cInnerBg,
                borderColor: cBorder,
                color: cText
              }}
            >
              <div className="p-2 rounded-lg border shrink-0" style={{ backgroundColor: cCardBg, borderColor: cBorder }}>
                <ChefHat className="h-4 w-4 group-hover:scale-110 transition" style={{ color: cEmerald }} />
              </div>
              <div className="truncate text-left">
                <span className="block font-bold">{t('askChefAi') || 'Ask Chef AI'}</span>
                <span className="text-[10px] block opacity-70 font-normal" style={{ color: cSubText }}>
                  {t('smartRecipes') || 'Smart Recipes'}
                </span>
              </div>
            </Link>

            {/* Import Recipe */}
            <Link 
              href="/import" 
              className="p-3.5 rounded-xl flex items-center gap-2.5 transition group border shadow-sm hover:scale-[1.01]"
              style={{
                backgroundColor: cInnerBg,
                borderColor: cBorder,
                color: cText
              }}
            >
              <div className="p-2 rounded-lg border shrink-0" style={{ backgroundColor: cCardBg, borderColor: cBorder }}>
                <DownloadCloud className="h-4 w-4 group-hover:scale-110 transition" style={{ color: cPrimary }} />
              </div>
              <div className="truncate text-left">
                <span className="block font-bold">{t('importRecipe') || 'Import Recipe'}</span>
                <span className="text-[10px] block opacity-70 font-normal" style={{ color: cSubText }}>
                  {t('urlOrText') || 'URL or Photo'}
                </span>
              </div>
            </Link>

            {/* Create Recipe Manually */}
            <Link 
              href="/manual" 
              className="p-3.5 rounded-xl flex items-center gap-2.5 transition group border shadow-sm hover:scale-[1.01]"
              style={{
                backgroundColor: cInnerBg,
                borderColor: cBorder,
                color: cText
              }}
            >
              <div className="p-2 rounded-lg border shrink-0" style={{ backgroundColor: cCardBg, borderColor: cBorder }}>
                <Sparkles className="h-4 w-4 group-hover:scale-110 transition" style={{ color: cPrimary }} />
              </div>
              <div className="truncate text-left">
                <span className="block font-bold">{t('createRecipe') || 'Create Recipe'}</span>
                <span className="text-[10px] block opacity-70 font-normal" style={{ color: cSubText }}>
                  {t('manualEntry') || 'Manual Entry'}
                </span>
              </div>
            </Link>

            {/* Meal Planner */}
            <Link 
              href="/planner" 
              className="p-3.5 rounded-xl flex items-center gap-2.5 transition group border shadow-sm hover:scale-[1.01]"
              style={{
                backgroundColor: cInnerBg,
                borderColor: cBorder,
                color: cText
              }}
            >
              <div className="p-2 rounded-lg border shrink-0" style={{ backgroundColor: cCardBg, borderColor: cBorder }}>
                <Calendar className="h-4 w-4 group-hover:scale-110 transition" style={{ color: cEmerald }} />
              </div>
              <div className="truncate text-left">
                <span className="block font-bold">{t('mealPlanner') || 'Meal Planner'}</span>
                <span className="text-[10px] block opacity-70 font-normal" style={{ color: cSubText }}>
                  {t('weeklyCalendar') || 'Weekly Schedule'}
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

def deploy():
    print("🚀 Applying /dashboard remediation patch...")
    
    # 1. Update API route
    has_apps_web = os.path.exists("apps/web")
    api_dir = "apps/web/src/app/api/dashboard/stats" if has_apps_web else "src/app/api/dashboard/stats"
    os.makedirs(api_dir, exist_ok=True)
    
    api_route_path = os.path.join(api_dir, "route.ts")
    with open(api_route_path, "w", encoding="utf-8") as f:
        f.write(API_STATS_CODE.strip() + "\n")
    print(f"✅ Deployed Dashboard Stats API: {api_route_path}")

    if has_apps_web and os.path.exists("src/app/api"):
        alt_api_dir = "src/app/api/dashboard/stats"
        os.makedirs(alt_api_dir, exist_ok=True)
        with open(os.path.join(alt_api_dir, "route.ts"), "w", encoding="utf-8") as f:
            f.write(API_STATS_CODE.strip() + "\n")
        print(f"✅ Synchronized secondary API route: {alt_api_dir}/route.ts")

    # 2. Update dashboard/page.tsx targets
    targets = []
    for root, dirs, files in os.walk("."):
        if "node_modules" in root or ".next" in root:
            continue
        if "dashboard" in root and "page.tsx" in files:
            targets.append(os.path.join(root, "page.tsx"))
            
    if not targets:
        default_target = "apps/web/src/app/dashboard/page.tsx" if has_apps_web else "src/app/dashboard/page.tsx"
        os.makedirs(os.path.dirname(default_target), exist_ok=True)
        targets = [default_target]

    for target in targets:
        with open(target, "w", encoding="utf-8") as f:
            f.write(DASHBOARD_PAGE_CODE.strip() + "\n")
        print(f"✅ Patched Dashboard View (100% width, Active Plan Box, Shopping List KPI): {target}")

    print("✨ Dashboard Patch Deployed Successfully!")

if __name__ == "__main__":
    deploy()
