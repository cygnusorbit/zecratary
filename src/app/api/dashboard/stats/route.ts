// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function executeQuery(db: any, queryText: string, params: any[] = []): Promise<any[]> {
  const isMySql = Boolean(db?.format || db?.escape || (db?.pool && db.pool?.format));
  const normalizedSql = isMySql ? queryText.replace(/\$\d+/g, '?') : queryText;
  
  const res = await db.query(normalizedSql, params);
  if (Array.isArray(res)) {
    return Array.isArray(res[0]) ? res[0] : res;
  }
  return res?.rows || [];
}

const sanitizeSlug = (s: string) => {
  return (s || '').toLowerCase()
    .replace(/^preset_/, '')
    .replace(/^plan_/, '')
    .replace(/-(monthly|annual)$/, '')
    .replace(/[_\s-]+/g, '_')
    .trim();
};

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
    planDisplayName: 'Taster',
    planInterval: '',
    planExpiryDate: null,
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

    let userPlan = 'taster';
    let planDisplayName = 'Taster';
    let planInterval = '';
    let planExpiryDate: string | null = null;
    let isHighestPlan = false;

    // 1. Fetch User Record
    try {
      const uRows = await executeQuery(
        db,
        `SELECT token_balance, wallet_balance, subscription_plan, plan_expiry_date 
         FROM users 
         WHERE id = $1 OR email = $2 
         LIMIT 1`,
        [userId, email]
      );
      if (uRows.length > 0) {
        const u = uRows[0];
        fallbackData.tokenBalance = Number(u.token_balance) || 0;
        fallbackData.walletBalance = Number(u.wallet_balance) || 0;
        userPlan = (u.subscription_plan || 'taster').toLowerCase();
        if (u.plan_expiry_date) {
          planExpiryDate = new Date(u.plan_expiry_date).toISOString();
        }
      }
    } catch (_) {}

    // 2. Fetch Latest Payment Transaction to detect billing interval & expiry date
    try {
      const txRows = await executeQuery(
        db,
        `SELECT plan_name, plan_slug, amount, expiry_date, status 
         FROM payment_transactions 
         WHERE (customer_email = $1 OR customer_name = $2) 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [email, userId]
      );
      if (txRows.length > 0) {
        const tx = txRows[0];
        if (tx.expiry_date && (!planExpiryDate || new Date(tx.expiry_date) > new Date(planExpiryDate))) {
          planExpiryDate = new Date(tx.expiry_date).toISOString();
        }
        const txSlug = (tx.plan_slug || tx.plan_name || '').toLowerCase();
        if (txSlug.includes('annual') || txSlug.includes('year')) {
          planInterval = 'Annual';
        } else if (txSlug.includes('month')) {
          planInterval = 'Monthly';
        }
      }
    } catch (_) {}

    const cleanUserPlan = sanitizeSlug(userPlan);

    // 3. Query Active Subscription Plans to dynamically resolve display name & highest tier
    try {
      const planRows = await executeQuery(
        db,
        `SELECT id, name, slug, 
                COALESCE(monthly_price_dollars, price_monthly, price, 0) as price_val,
                COALESCE(annual_price_dollars, price_annual, 0) as annual_val,
                sort_order, is_active, is_default, is_free 
         FROM subscription_plans 
         WHERE is_active = true OR is_active IS NULL 
         ORDER BY sort_order DESC, price_val DESC`
      );

      if (planRows.length > 0) {
        const matched = planRows.find((p: any) => {
          const pSlug = sanitizeSlug(p.slug || p.id);
          const pName = sanitizeSlug(p.name);
          return pSlug === cleanUserPlan || pName === cleanUserPlan;
        });

        if (matched) {
          planDisplayName = matched.name;
        } else {
          planDisplayName = cleanUserPlan
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }

        const topPlan = planRows[0];
        const topSlug = sanitizeSlug(topPlan.slug || topPlan.id);
        const topPrice = Number(topPlan.price_val) || 0;
        const matchedPrice = matched ? Number(matched.price_val) || 0 : 0;

        if (cleanUserPlan === topSlug || (matchedPrice > 0 && matchedPrice >= topPrice)) {
          isHighestPlan = true;
        } else {
          const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
          isHighestPlan = topTiers.some(t => cleanUserPlan.includes(t));
        }
      } else {
        const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
        isHighestPlan = topTiers.some(t => cleanUserPlan.includes(t));
        planDisplayName = cleanUserPlan
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    } catch (_) {
      const topTiers = ['gourmet', 'enterprise', 'master_chef', 'master', 'pro_chef'];
      isHighestPlan = topTiers.some(t => cleanUserPlan.includes(t));
      planDisplayName = cleanUserPlan
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    if (!planInterval) {
      if (userPlan.includes('annual') || userPlan.includes('year')) {
        planInterval = 'Annual';
      } else if (userPlan.includes('month')) {
        planInterval = 'Monthly';
      }
    }

    fallbackData.subscriptionPlan = userPlan;
    fallbackData.planDisplayName = planDisplayName || 'Taster';
    fallbackData.planInterval = planInterval;
    fallbackData.planExpiryDate = planExpiryDate;
    fallbackData.isHighestPlan = isHighestPlan;

    // 4. Saved Recipes Count
    try {
      const rRows = await executeQuery(
        db,
        `SELECT COUNT(*) AS count 
         FROM saved_recipes 
         WHERE user_id = $1 OR created_by = $2`,
        [userId, email]
      );
      if (rRows.length > 0) {
        fallbackData.recipesCount = Number(rRows[0].count) || 0;
      }
    } catch (_) {
      try {
        const altRRows = await executeQuery(
          db,
          `SELECT COUNT(*) AS count 
           FROM recipes 
           WHERE user_id = $1 OR created_by = $2`,
          [userId, email]
        );
        if (altRRows.length > 0) {
          fallbackData.recipesCount = Number(altRRows[0].count) || 0;
        }
      } catch (_) {}
    }

    // 5. Recipe Books Count
    try {
      const bRows = await executeQuery(
        db,
        `SELECT COUNT(*) AS count 
         FROM recipe_books 
         WHERE user_id = $1 OR created_by = $2`,
        [userId, email]
      );
      if (bRows.length > 0 && Number(bRows[0].count) > 0) {
        fallbackData.recipeBooksCount = Number(bRows[0].count);
      } else {
        const catRows = await executeQuery(
          db,
          `SELECT COUNT(DISTINCT category) AS count 
           FROM saved_recipes 
           WHERE user_id = $1 OR created_by = $2`,
          [userId, email]
        );
        fallbackData.recipeBooksCount = catRows.length > 0 ? Number(catRows[0].count) || 0 : 0;
      }
    } catch (_) {
      fallbackData.recipeBooksCount = 0;
    }

    // 6. Pantry Items & Expiring Soon within 3 days
    try {
      const in3DaysStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      const pRows = await executeQuery(
        db,
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= $3 THEN 1 END) AS expiring
         FROM pantry_items 
         WHERE user_id = $1 OR created_by = $2`,
        [userId, email, in3DaysStr]
      );
      if (pRows.length > 0) {
        fallbackData.pantryStockCount = Number(pRows[0].total) || 0;
        fallbackData.expiringPantryCount = Number(pRows[0].expiring) || 0;
      }
    } catch (_) {}

    // 7. Unchecked Grocery Items
    try {
      const gRows = await executeQuery(
        db,
        `SELECT COUNT(*) AS count 
         FROM grocery_items 
         WHERE (user_id = $1 OR created_by = $2) AND (checked = false OR checked = 0 OR checked IS NULL)`,
        [userId, email]
      );
      if (gRows.length > 0) {
        fallbackData.groceryItemsCount = Number(gRows[0].count) || 0;
      }
    } catch (_) {}

    // 8. Upcoming Meal from Planner
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const planRows = await executeQuery(
        db,
        `SELECT id, meal_type, recipe_name, title, meal_date, meal_time, image_url, notes 
         FROM planner_meals 
         WHERE (user_id = $1 OR created_by = $2) AND meal_date >= $3 
         ORDER BY meal_date ASC, id ASC 
         LIMIT 1`,
        [userId, email, todayStr]
      );
      if (planRows.length > 0) {
        const m = planRows[0];
        fallbackData.upcomingMeal = {
          mealType: (m.meal_type || 'Dinner').toUpperCase(),
          title: m.recipe_name || m.title || 'Scheduled Dish',
          timeOrTags: m.meal_time ? `${m.meal_time} • Scheduled` : '40 mins • Scheduled',
          notes: m.notes || undefined,
          imageUrl: m.image_url || undefined,
          date: m.meal_date
        };
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
