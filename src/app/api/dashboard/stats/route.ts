import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim() || 'usr_admin_1';
    const email = searchParams.get('email')?.toLowerCase().trim() || '';

    // 1. Saved Recipes Count
    let savedRecipesCount = 0;
    try {
      const recRes: any = await query(`
        SELECT COUNT(*) as count FROM saved_recipes 
        WHERE user_id = $1 OR created_by = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL;
      `, [userId]);
      const row = Array.isArray(recRes) ? recRes[0] : recRes?.rows?.[0];
      savedRecipesCount = parseInt(row?.count || '0', 10);
    } catch (_) {}

    // 2. Scheduled Meals Count & Upcoming Meal
    let scheduledMealsCount = 0;
    let upcomingMeal: any = null;
    try {
      const planRes: any = await query(`
        SELECT COUNT(*) as count FROM planner_meals 
        WHERE user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL;
      `, [userId]);
      const row = Array.isArray(planRes) ? planRes[0] : planRes?.rows?.[0];
      scheduledMealsCount = parseInt(row?.count || '0', 10);

      const todayStr = new Date().toISOString().split('T')[0];
      const nextMealRes: any = await query(`
        SELECT * FROM planner_meals 
        WHERE (user_id = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL)
          AND date >= $2
        ORDER BY date ASC, time ASC LIMIT 1;
      `, [userId, todayStr]);
      const nextRow = Array.isArray(nextMealRes) ? nextMealRes[0] : nextMealRes?.rows?.[0];
      if (nextRow) {
        upcomingMeal = {
          id: nextRow.id,
          title: nextRow.title || 'Scheduled Dish',
          mealType: nextRow.meal_type || 'Dinner',
          date: nextRow.date,
          time: nextRow.time || '19:00',
          servings: Number(nextRow.servings || 2),
          prepMinutes: Number(nextRow.prep_minutes || 15),
          cookMinutes: Number(nextRow.cook_minutes || 25)
        };
      }
    } catch (_) {}

    // 3. Pantry Count & Expiring Items
    let pantryCount = 0;
    let expiringItemsCount = 0;
    let expiringItemsList: string[] = [];
    try {
      const pRes: any = await query(`
        SELECT * FROM pantry_items 
        WHERE user_id = $1 OR created_by = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL;
      `, [userId]);
      const pRows = Array.isArray(pRes) ? pRes : (pRes?.rows || []);
      pantryCount = pRows.length;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      pRows.forEach((item: any) => {
        if (item.expiry_date) {
          const [y, m, d] = item.expiry_date.split('-').map(Number);
          if (y && m && d) {
            const target = new Date(y, m - 1, d);
            target.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
              expiringItemsCount++;
              if (item.name) expiringItemsList.push(item.name);
            }
          }
        }
      });
    } catch (_) {}

    // 4. Token & Wallet Balances
    let tokenBalance = 100;
    let walletBalance = 0.00;
    let userPlan = 'Taster';
    try {
      const uRes: any = await query(`
        SELECT token_balance, wallet_balance, subscription_plan FROM users 
        WHERE id = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($2)) LIMIT 1;
      `, [userId, email || userId]);
      const uRow = Array.isArray(uRes) ? uRes[0] : uRes?.rows?.[0];
      if (uRow) {
        if (uRow.token_balance !== null && uRow.token_balance !== undefined) tokenBalance = Number(uRow.token_balance);
        if (uRow.wallet_balance !== null && uRow.wallet_balance !== undefined) walletBalance = Number(uRow.wallet_balance);
        if (uRow.subscription_plan) userPlan = uRow.subscription_plan;
      }
    } catch (_) {}

    // 5. Recent 3 Recipes
    let recentRecipes: any[] = [];
    try {
      const recListRes: any = await query(`
        SELECT id, title, description, recipe_type, prep_time_minutes, cook_time_minutes, servings, calories, image_url, image 
        FROM saved_recipes 
        WHERE user_id = $1 OR created_by = $1 OR user_id = 'usr_admin_1' OR user_id IS NULL
        ORDER BY created_at DESC LIMIT 3;
      `, [userId]);
      const rows = Array.isArray(recListRes) ? recListRes : (recListRes?.rows || []);
      recentRecipes = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        recipeType: r.recipe_type || 'Main Dish',
        prepTimeMinutes: Number(r.prep_time_minutes || 15),
        cookTimeMinutes: Number(r.cook_time_minutes || 25),
        servings: Number(r.servings || 2),
        calories: Number(r.calories || 450),
        imageUrl: r.image_url || r.image || '/uploads/recipes/default.jpg'
      }));
    } catch (_) {}

    return NextResponse.json({
      success: true,
      stats: {
        savedRecipes: savedRecipesCount,
        scheduledMeals: scheduledMealsCount,
        pantryItems: pantryCount,
        tokenBalance,
        walletBalance,
        userPlan,
        expiringItemsCount,
        expiringItemsList,
        upcomingMeal,
        recentRecipes
      }
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      stats: {
        savedRecipes: 0,
        scheduledMeals: 0,
        pantryItems: 0,
        tokenBalance: 100,
        walletBalance: 0,
        userPlan: 'Taster',
        expiringItemsCount: 0,
        expiringItemsList: [],
        upcomingMeal: null,
        recentRecipes: []
      }
    });
  }
}
