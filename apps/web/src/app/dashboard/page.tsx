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

  // Apply and listen for global admin theme updates and Day / Night mode toggling
  const applyGlobalTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    applyGlobalTheme();
    window.addEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_updated', applyGlobalTheme);
    window.addEventListener('storage', applyGlobalTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_updated', applyGlobalTheme);
      window.removeEventListener('storage', applyGlobalTheme);
    };
  }, [applyGlobalTheme]);

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

        const isOwner = user
          ? (item.userId === user.id || item.createdBy === user.email)
          : true;

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

    // 1. Saved Recipes
    const userRecipes = getExactSavedRecipes(user);
    setRecipesCount(userRecipes.length);

    // 2. Recipe Books
    try {
      const booksRaw = localStorage.getItem('zecratary_recipe_books');
      if (booksRaw) {
        const parsedBooks = JSON.parse(booksRaw);
        if (Array.isArray(parsedBooks) && parsedBooks.length > 0) {
          const userBooks = parsedBooks.filter((b: any) => 
            b.userId === user.id || b.createdBy === user.email
          );
          if (userBooks.length > 0) {
            setRecipeBooksCount(userBooks.length);
          } else {
            const categories = new Set(userRecipes.map((r: any) => r.category || r.recipeType || r.tags?.[0] || 'Main Dish'));
            setRecipeBooksCount(userRecipes.length > 0 ? categories.size : 0);
          }
        } else {
          const categories = new Set(userRecipes.map((r: any) => r.category || r.recipeType || r.tags?.[0] || 'Main Dish'));
          setRecipeBooksCount(userRecipes.length > 0 ? categories.size : 0);
        }
      } else {
        const categories = new Set(userRecipes.map((r: any) => r.category || r.recipeType || r.tags?.[0] || 'Main Dish'));
        setRecipeBooksCount(userRecipes.length > 0 ? categories.size : 0);
      }
    } catch {
      setRecipeBooksCount(0);
    }

    // 3. Pantry Stock
    try {
      const pantryRaw = localStorage.getItem('zecratary_pantry_items') || localStorage.getItem('zecratary_pantry');
      if (pantryRaw) {
        const parsedPantry = JSON.parse(pantryRaw);
        if (Array.isArray(parsedPantry)) {
          const userPantry = parsedPantry.filter((p: any) => 
            p.userId === user.id || p.createdBy === user.email
          );
          setPantryStockCount(userPantry.length);
        } else {
          setPantryStockCount(0);
        }
      } else {
        setPantryStockCount(0);
      }
    } catch {
      setPantryStockCount(0);
    }

    // 4. Grocery Items
    try {
      const shopRaw = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_shopping');
      if (shopRaw) {
        const parsedShop = JSON.parse(shopRaw);
        if (Array.isArray(parsedShop)) {
          const userShop = parsedShop.filter((i: any) => 
            (i.userId === user.id || i.createdBy === user.email) && !i.checked
          );
          setGroceryItemsCount(userShop.length);
        } else {
          setGroceryItemsCount(0);
        }
      } else {
        setGroceryItemsCount(0);
      }
    } catch {
      setGroceryItemsCount(0);
    }

    // 5. Upcoming Meal with Photo Thumbnail
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

            const matchingRecipe = userRecipes.find((r: any) => 
              (r.title || r.name)?.toLowerCase() === mealTitle.toLowerCase()
            );

            const imageUrl = mealToDisplay.imageUrl || mealToDisplay.image || matchingRecipe?.imageUrl || matchingRecipe?.image;

            setUpcomingMeal({
              mealType: (mealToDisplay.mealType || 'Dinner').toUpperCase(),
              title: mealTitle,
              timeOrTags: mealToDisplay.time ? `${mealToDisplay.time} • ${t('scheduledLabel') || 'Scheduled'}` : `40 mins • ${t('scheduledLabel') || 'Scheduled'}`,
              notes: mealToDisplay.notes,
              imageUrl
            });
            return;
          }
        }
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
    } catch {
      setUpcomingMeal(null);
    }
  }, [getExactSavedRecipes, t]);

  const handleManualRefresh = () => {
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
    applyGlobalTheme();
    computeMetrics(activeUser);

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('zecratary_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_pantry_updated'));
    window.dispatchEvent(new Event('zecratary_shopping_updated'));
    window.dispatchEvent(new Event('zecratary_meal_plan_updated'));

    setTimeout(() => {
      setLoading(false);
      setRefreshFeedback(true);
      setTimeout(() => setRefreshFeedback(false), 2500);
    }, 600);
  };

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

    const handleSync = () => {
      const active = getCurrentUser();
      if (!active) {
        router.replace('/login');
        return;
      }
      setCurrentUser(active);
      computeMetrics(active);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_pantry_updated', handleSync);
    window.addEventListener('zecratary_shopping_updated', handleSync);
    window.addEventListener('zecratary_meal_plan_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);
    window.addEventListener('zecratary_auth_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_pantry_updated', handleSync);
      window.removeEventListener('zecratary_shopping_updated', handleSync);
      window.removeEventListener('zecratary_meal_plan_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
      window.removeEventListener('zecratary_auth_changed', handleSync);
    };
  }, [computeMetrics, router, t]);

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-8 pb-16 px-2 sm:px-4 transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Heading */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('dashboard') || 'Dashboard'}
          </h1>
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {(t('dashboardWelcomePrefix') || 'Welcome back, {name}!').replace('{name}', currentUser.name)} {t('dashboardSubtitle') || 'Autonomous culinary planning and pantry tracking.'}
          </p>
        </div>

        {/* FUNCTIONAL REFRESH BUTTON */}
        <div className="flex items-center gap-2">
          {refreshFeedback && (
            <span 
              className="text-xs font-bold flex items-center gap-1.5 animate-in fade-in transition duration-300"
              style={{ color: 'var(--color-emerald)' }}
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
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title="Reload live metrics from storage"
          >
            <RefreshCw 
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
              style={{ color: 'var(--color-emerald)' }}
            />
            <span>{loading ? (t('refreshing') || 'Refreshing...') : (t('refresh') || 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stats Metric Cards with Dynamic CSS Theme Variables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saved Recipes */}
        <Link 
          href="/saved" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <span 
            className="text-xs block uppercase font-bold tracking-wider"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('savedRecipes') || 'Saved Recipes'}
          </span>
          <span 
            className="text-3xl font-black mt-1 block"
            style={{ color: 'var(--color-primary)' }}
          >
            {loading ? '...' : recipesCount}
          </span>
        </Link>

        {/* Recipe Books */}
        <Link 
          href="/books" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-emerald)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <span 
            className="text-xs block uppercase font-bold tracking-wider"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('books') || 'Recipe Books'}
          </span>
          <span 
            className="text-3xl font-black mt-1 block"
            style={{ color: 'var(--color-emerald)' }}
          >
            {loading ? '...' : recipeBooksCount}
          </span>
        </Link>

        {/* Pantry Stock */}
        <Link 
          href="/pantry" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <span 
            className="text-xs block uppercase font-bold tracking-wider"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('pantryStock') || 'Pantry Stock'}
          </span>
          <span 
            className="text-3xl font-black mt-1 block"
            style={{ color: 'var(--color-text)' }}
          >
            {loading ? '...' : pantryStockCount}
          </span>
        </Link>

        {/* Grocery Items */}
        <Link 
          href="/shopping" 
          className="p-5 rounded-2xl block border transition shadow-sm group"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-emerald)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <span 
            className="text-xs block uppercase font-bold tracking-wider"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('groceryItems') || 'Grocery Items'}
          </span>
          <span 
            className="text-3xl font-black mt-1 block"
            style={{ color: 'var(--color-text)' }}
          >
            {loading ? '...' : groceryItemsCount}
          </span>
        </Link>
      </div>

      {/* Center 2-Column Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Meal Card with Recipe Photo */}
        <div 
          className="p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div 
            className="flex items-center justify-between border-b pb-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2 
              className="text-base font-bold flex items-center gap-2"
              style={{ color: 'var(--color-text)' }}
            >
              <Calendar className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('upcomingMeal') || 'Upcoming Meal'}
            </h2>
            <Link 
              href="/planner" 
              className="text-xs font-bold hover:underline flex items-center gap-1"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('viewPlanner') || 'View Planner'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center my-2">
            {upcomingMeal ? (
              <div 
                className="p-4 rounded-xl border flex items-center gap-4 shadow-inner"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)'
                }}
              >
                {upcomingMeal.imageUrl ? (
                  <img
                    src={upcomingMeal.imageUrl}
                    alt={upcomingMeal.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border shrink-0 shadow-md"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                ) : (
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border shrink-0 flex items-center justify-center opacity-70"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-inner-dark)'
                    }}
                  >
                    <Utensils className="h-6 w-6 opacity-70" />
                  </div>
                )}

                <div className="space-y-1 flex-1 min-w-0">
                  <span 
                    className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: 'var(--color-emerald)' }}
                  >
                    <Utensils className="h-3 w-3" /> {(t('todayMealPrefix') || 'Today • {mealType}').replace('{mealType}', upcomingMeal.mealType)}
                  </span>
                  <h3 
                    className="font-bold text-base leading-tight mt-1 truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {upcomingMeal.title}
                  </h3>
                  <span 
                    className="text-xs flex items-center gap-1 pt-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Clock className="h-3.5 w-3.5" /> {upcomingMeal.timeOrTags}
                  </span>
                  {upcomingMeal.notes && (
                    <p 
                      className="text-xs italic mt-1 opacity-80 line-clamp-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      "{upcomingMeal.notes}"
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="p-4 rounded-xl border flex items-center justify-between text-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <span>{t('noMealsScheduledToday') || 'No meals scheduled for today.'}</span>
                <Link 
                  href="/planner" 
                  className="text-xs font-bold hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('planMeal') || 'Plan Meal'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div 
          className="p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div 
            className="border-b pb-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2 
              className="text-base font-bold flex items-center gap-2"
              style={{ color: 'var(--color-text)' }}
            >
              <ChefHat className="h-5 w-5" style={{ color: 'var(--color-emerald)' }} /> {t('quickActions') || 'Quick Actions'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-bold my-auto">
            <Link 
              href="/chef" 
              className="p-3.5 rounded-xl text-center flex items-center justify-center gap-2 transition group border"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-emerald)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <ChefHat 
                className="h-4 w-4 group-hover:scale-110 transition" 
                style={{ color: 'var(--color-emerald)' }}
              /> 
              <span>{t('askChefAi') || 'Ask Chef AI'}</span>
            </Link>

            <Link 
              href="/manual" 
              className="p-3.5 rounded-xl text-center flex items-center justify-center gap-2 transition group border"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <Sparkles 
                className="h-4 w-4 group-hover:scale-110 transition" 
                style={{ color: 'var(--color-primary)' }}
              /> 
              <span>{t('createRecipe') || 'Create Recipe'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
