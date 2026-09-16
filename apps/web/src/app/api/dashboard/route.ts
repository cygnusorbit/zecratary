import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recipeCountRes = await query('SELECT COUNT(*) AS count FROM saved_recipes');
    const userCountRes = await query('SELECT COUNT(*) AS count FROM users');
    const revenueRes = await query("SELECT COALESCE(SUM(amount), 0) AS total FROM payment_transactions WHERE status = 'succeeded'");
    const activeSubRes = await query("SELECT COUNT(*) AS count FROM payment_transactions WHERE status = 'succeeded' AND (expiry_date IS NULL OR expiry_date > NOW())");

    const recentRecipes = await query('SELECT id, title, recipe_type AS "recipeType", created_at AS "createdAt" FROM saved_recipes ORDER BY created_at DESC LIMIT 5');
    const recentTransactions = await query('SELECT id, customer_name AS "customerName", plan_name AS "planName", amount, currency, status, created_at AS "createdAt" FROM payment_transactions ORDER BY created_at DESC LIMIT 5');

    return NextResponse.json({
      success: true,
      stats: {
        totalRecipes: parseInt(recipeCountRes[0]?.count || '0', 10),
        totalUsers: parseInt(userCountRes[0]?.count || '0', 10),
        totalRevenue: parseFloat(revenueRes[0]?.total || '0'),
        activeSubscriptions: parseInt(activeSubRes[0]?.count || '0', 10),
      },
      recentRecipes,
      recentTransactions
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
