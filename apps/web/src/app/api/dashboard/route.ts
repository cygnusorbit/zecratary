import { NextResponse } from 'next/server';
import { prisma } from '@zecratary/database';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 1. Query live database counts and upcoming schedules from Prisma
    const [
      savedRecipesCount,
      pantryStockCount,
      groceryItemsCount,
      recipesWithTags,
      upcomingMealPlan
    ] = await Promise.all([
      prisma.recipe.count(),
      prisma.pantryItem.count(),
      prisma.groceryListItem.count({ where: { checked: false } }).catch(() => 0),
      prisma.recipe.findMany({ select: { tags: true } }),
      prisma.mealPlanItem.findFirst({
        where: {
          dayOfWeek: dayOfWeek,
        },
        include: {
          recipe: true,
        },
      }).catch(async () => {
        return await prisma.recipe.findFirst({
          orderBy: { createdAt: 'desc' },
        });
      }),
    ]);

    const uniqueTags = new Set(recipesWithTags.flatMap((r) => r.tags || []));
    const recipeBooksCount = uniqueTags.size > 0 ? uniqueTags.size : 0;

    let upcomingMeal = null;
    if (upcomingMealPlan) {
      if ('recipe' in upcomingMealPlan && upcomingMealPlan.recipe) {
        const r = upcomingMealPlan.recipe;
        upcomingMeal = {
          title: r.title,
          mealType: upcomingMealPlan.mealType || 'DINNER',
          prepCookTime: `${(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 25)} mins`,
          tag: r.tags?.[0] || 'Scheduled',
        };
      } else if ('title' in upcomingMealPlan) {
        const r = upcomingMealPlan as any;
        upcomingMeal = {
          title: r.title,
          mealType: 'DINNER',
          prepCookTime: `${(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 25)} mins`,
          tag: r.tags?.[0] || 'Saved Dish',
        };
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        savedRecipes: savedRecipesCount,
        recipeBooks: recipeBooksCount,
        pantryStock: pantryStockCount,
        groceryItems: groceryItemsCount,
      },
      upcomingMeal,
    });
  } catch (error: any) {
    console.error('Database fetch error in /api/dashboard:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stats: {
        savedRecipes: 0,
        recipeBooks: 0,
        pantryStock: 0,
        groceryItems: 0,
      },
      upcomingMeal: null,
    });
  }
}
