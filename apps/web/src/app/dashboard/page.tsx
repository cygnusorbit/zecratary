'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ShoppingCart
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [recipeBooksCount, setRecipeBooksCount] = useState<number>(0);
  const [pantryStockCount, setPantryStockCount] = useState<number>(0);
  const [groceryItemsCount, setGroceryItemsCount] = useState<number>(0);
  const [upcomingMeal, setUpcomingMeal] = useState<{
    mealType: string;
    title: string;
    timeOrTags: string;
    notes?: string;
    imageUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState(false);

  const getExactSavedRecipes = useCallback((user: User | null): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      const seen = new Set<string>();
      const userList: any[] = [];
      for (const item of list) {
        const key = String(item.id || item.title || item.name || '').trim();
        if (!key || seen.has(key)) continue;
        const isOwner = user ? (item.userId === user.id || item.createdBy === user.email) : true;
        if (isOwner) {
          seen.add(key);
          userList.push(item);
        }
      }
      return userList;
    } catch {
      return [];
    }
  }, []);

  const computeMetrics = useCallback((user: User | null) => {
    if (!user) return;
    const userRecipes = getExactSavedRecipes(user);
    setRecipesCount(userRecipes.length);

    try {
      const booksRaw = localStorage.getItem('zecratary_recipe_books');
      if (booksRaw) {
        const parsedBooks = JSON.parse(booksRaw);
        if (Array.isArray(parsedBooks) && parsedBooks.length > 0) {
          const userBooks = parsedBooks.filter((b: any) => b.userId === user.id || b.createdBy === user.email);
          setRecipeBooksCount(userBooks.length);
        } else {
          setRecipeBooksCount(0);
        }
      }
    } catch {
      setRecipeBooksCount(0);
    }

    try {
      const pantryRaw = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
      if (pantryRaw) {
        const parsedPantry = JSON.parse(pantryRaw);
        if (Array.isArray(parsedPantry)) {
          const userPantry = parsedPantry.filter((p: any) => p.userId === user.id || p.createdBy === user.email);
          setPantryStockCount(userPantry.length);
        }
      }
    } catch {
      setPantryStockCount(0);
    }

    try {
      const shopRaw = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_shopping');
      if (shopRaw) {
        const parsedShop = JSON.parse(shopRaw);
        if (Array.isArray(parsedShop)) {
          const userShop = parsedShop.filter((i: any) => (i.userId === user.id || i.createdBy === user.email) && !i.checked);
          setGroceryItemsCount(userShop.length);
        }
      }
    } catch {
      setGroceryItemsCount(0);
    }

    if (userRecipes.length > 0) {
      const first = userRecipes[0];
      const prep = parseInt(first.prepTimeMinutes || first.prepTime) || 15;
      const cook = parseInt(first.cookTimeMinutes || first.cookTime) || 20;
      setUpcomingMeal({
        mealType: (first.category || first.recipeType || 'Dinner').toUpperCase(),
        title: first.title || first.name || 'Saved Dish',
        timeOrTags: `${prep + cook} mins • ${first.tags?.[0] || 'Favorite'}`,
        imageUrl: first.imageUrl || first.image
      });
    } else {
      setUpcomingMeal(null);
    }
  }, [getExactSavedRecipes]);

  useEffect(() => {
    document.title = `${t('dashboard') || 'Dashboard'} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    computeMetrics(user);
  }, [computeMetrics, router, t]);

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary, #E05638)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-8 pb-16 px-2 sm:px-4 transition-colors duration-200"
      style={{ color: 'var(--color-text, #0f172a)' }}
    >
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            {t('dashboard') || 'Dashboard'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
            {(t('dashboardWelcomePrefix') || 'Welcome back, {name}!').replace('{name}', currentUser?.name || currentUser?.email || 'Chef')} {t('dashboardSubtitle') || 'Autonomous culinary planning and pantry tracking.'}
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl text-xs font-bold border transition hover:opacity-80 flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)', color: 'var(--color-text, #0f172a)' }}
        >
          <span>{t('viewHomepage') || 'View Public Home'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/saved" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <span className="text-xs block uppercase font-bold tracking-wider" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
            {t('savedRecipes') || 'Saved Recipes'}
          </span>
          <span className="text-3xl font-black mt-1 block" style={{ color: 'var(--color-primary, #E05638)' }}>
            {recipesCount}
          </span>
        </Link>

        <Link 
          href="/books" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <span className="text-xs block uppercase font-bold tracking-wider" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
            {t('books') || 'Recipe Books'}
          </span>
          <span className="text-3xl font-black mt-1 block text-emerald-500">
            {recipeBooksCount}
          </span>
        </Link>

        <Link 
          href="/pantry" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <span className="text-xs block uppercase font-bold tracking-wider" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
            {t('pantryStock') || 'Pantry Stock'}
          </span>
          <span className="text-3xl font-black mt-1 block" style={{ color: 'var(--color-text, #0f172a)' }}>
            {pantryStockCount}
          </span>
        </Link>

        <Link 
          href="/shopping" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <span className="text-xs block uppercase font-bold tracking-wider" style={{ color: 'var(--color-subtext, #94a3b8)' }}>
            {t('groceryItems') || 'Grocery Items'}
          </span>
          <span className="text-3xl font-black mt-1 block" style={{ color: 'var(--color-text, #0f172a)' }}>
            {groceryItemsCount}
          </span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div 
          className="p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between border"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text, #0f172a)' }}>
              <Calendar className="h-5 w-5 text-[var(--color-primary)]" /> {t('upcomingMeal') || 'Upcoming Meal'}
            </h2>
            <Link href="/planner" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
              {t('viewPlanner') || 'View Planner'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="my-2">
            {upcomingMeal ? (
              <div 
                className="p-4 rounded-xl border flex items-center gap-4 shadow-inner"
                style={{ backgroundColor: 'var(--color-inner-dark, #f1f5f9)', borderColor: 'var(--color-border, #e2e8f0)' }}
              >
                {upcomingMeal.imageUrl ? (
                  <img src={upcomingMeal.imageUrl} alt={upcomingMeal.title} className="w-16 h-16 rounded-xl object-cover border shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl border shrink-0 flex items-center justify-center bg-black/10">
                    <Utensils className="h-6 w-6 opacity-50" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{upcomingMeal.mealType}</span>
                  <h3 className="font-bold text-sm truncate">{upcomingMeal.title}</h3>
                  <span className="text-xs opacity-75">{upcomingMeal.timeOrTags}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border text-xs opacity-60 text-center">
                {t('noMealsScheduledToday') || 'No meals scheduled for today.'}
              </div>
            )}
          </div>
        </div>

        <div 
          className="p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between border"
          style={{ backgroundColor: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text, #0f172a)' }}>
              <ChefHat className="h-5 w-5 text-emerald-500" /> {t('quickActions') || 'Quick Actions'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-bold my-auto">
            <Link 
              href="/chef" 
              className="p-3.5 rounded-xl text-center flex items-center justify-center gap-2 transition border hover:bg-black/5"
              style={{ backgroundColor: 'var(--color-inner-dark, #f1f5f9)', borderColor: 'var(--color-border, #e2e8f0)' }}
            >
              <ChefHat className="h-4 w-4 text-emerald-500" />
              <span>{t('askChefAi') || 'Ask Chef AI'}</span>
            </Link>

            <Link 
              href="/manual" 
              className="p-3.5 rounded-xl text-center flex items-center justify-center gap-2 transition border hover:bg-black/5"
              style={{ backgroundColor: 'var(--color-inner-dark, #f1f5f9)', borderColor: 'var(--color-border, #e2e8f0)' }}
            >
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              <span>{t('createRecipe') || 'Create Recipe'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
