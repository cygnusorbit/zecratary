import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserTokenUsage } from '@/lib/tokenUsage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let email = searchParams.get('email')?.toLowerCase().trim();
    let userId = searchParams.get('userId');

    if (!userId && !email) {
      const cookieHeader = req.cookies.get('zecratary_session')?.value;
      if (cookieHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieHeader));
          userId = parsed.id;
          email = parsed.email?.toLowerCase().trim();
        } catch (_) {}
      }
    }

    let userRow: any = null;
    if (email) {
      const u = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      userRow = u[0];
    } else if (userId) {
      const u = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      userRow = u[0];
    }

    const planSlug = userRow?.subscription_plan || 'taster';
    const planRows = await query('SELECT * FROM subscription_plans WHERE slug = $1 LIMIT 1', [planSlug]);
    const plan = planRows[0] || {
      ai_recipe_limit: 5,
      recipe_library_limit: 25,
      token_limit: 50000,
      token_reimburse_frequency: 'monthly',
      can_view_macros: false,
      allowed_ai_models: 'gemini-1.5-flash'
    };

    const tokenUsage = await getUserTokenUsage(userRow?.id, userRow?.email);

    let recipeCount = 0;
    if (userRow?.id) {
      const countRes = await query('SELECT COUNT(*) AS count FROM saved_recipes WHERE user_id = $1', [userRow.id]);
      recipeCount = parseInt(countRes[0]?.count || '0', 10);
    }

    return NextResponse.json({
      success: true,
      plan: planSlug,
      tokenUsage: {
        ...tokenUsage,
        monthlyLimit: plan.token_limit || 50000,
        reimburseFrequency: plan.token_reimburse_frequency || 'monthly'
      },
      quota: {
        aiRecipeLimit: plan.ai_recipe_limit,
        recipeLibraryLimit: plan.recipe_library_limit,
        recipesSaved: recipeCount,
        tokenLimit: plan.token_limit,
        tokensUsed: tokenUsage.totalTokens,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        requestCount: tokenUsage.requestCount,
        tokenReimburseFrequency: plan.token_reimburse_frequency || 'monthly',
        canViewMacros: Boolean(plan.can_view_macros),
        allowedAiModels: plan.allowed_ai_models || 'gemini-1.5-flash'
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
