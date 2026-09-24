import { NextRequest, NextResponse } from 'next/server';
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

    // 1. User Assets (Tokens, Wallet, Subscription)
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
        fallbackData.subscriptionPlan = u.subscription_plan || 'taster';
      }
    } catch (_) {}

    // 2. Saved Recipes Count
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

    // 3. Recipe Books / Categories
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

    // 4. Pantry Stock & Expiring Items
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

    // 5. Grocery Items (Unchecked)
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

    // 6. Upcoming Meal from Planner
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
