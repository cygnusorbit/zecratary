import os

dashboard_code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChefHat, Calendar, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [recipeBooksCount, setRecipeBooksCount] = useState<number>(0);
  const [pantryStockCount, setPantryStockCount] = useState<number>(0);
  const [groceryItemsCount, setGroceryItemsCount] = useState<number>(0);
  const [upcomingMeal, setUpcomingMeal] = useState<{
    mealType: string;
    title: string;
    timeOrTags: string;
  } | null>(null);

  const syncDashboardData = () => {
    // 1. Saved Recipes Count
    try {
      const saved = localStorage.getItem('zecratary_recipes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setRecipesCount(parsed.length);
      } else {
        setRecipesCount(0);
      }
    } catch {
      setRecipesCount(0);
    }

    // 2. Recipe Books Count
    try {
      const books = localStorage.getItem('zecratary_recipe_books');
      if (books) {
        const parsed = JSON.parse(books);
        if (Array.isArray(parsed)) setRecipeBooksCount(parsed.length);
      } else {
        // Fallback: count distinct categories from saved recipes
        const saved = localStorage.getItem('zecratary_recipes');
        if (saved) {
          const parsed = JSON.parse(saved);
          const categories = new Set(parsed.map((r: any) => r.category || 'General'));
          setRecipeBooksCount(categories.size || 0);
        } else {
          setRecipeBooksCount(0);
        }
      }
    } catch {
      setRecipeBooksCount(0);
    }

    // 3. Pantry Stock Count
    try {
      const pantry = localStorage.getItem('zecratary_pantry');
      if (pantry) {
        const parsed = JSON.parse(pantry);
        if (Array.isArray(parsed)) setPantryStockCount(parsed.length);
      } else {
        setPantryStockCount(0);
      }
    } catch {
      setPantryStockCount(0);
    }

    // 4. Grocery Items Count (Pending / Unchecked items)
    try {
      const list = localStorage.getItem('zecratary_shopping_list') || localStorage.getItem('zecratary_groceries');
      if (list) {
        const parsed = JSON.parse(list);
        if (Array.isArray(parsed)) {
          const unbought = parsed.filter((item: any) => !item.checked);
          setGroceryItemsCount(unbought.length);
        }
      } else {
        setGroceryItemsCount(0);
      }
    } catch {
      setGroceryItemsCount(0);
    }

    // 5. Upcoming Meal
    try {
      const plan = localStorage.getItem('zecratary_meal_plan');
      if (plan) {
        const parsedPlan = JSON.parse(plan);
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          const firstMeal = parsedPlan[0];
          setUpcomingMeal({
            mealType: (firstMeal.mealType || 'Dinner').toUpperCase(),
            title: firstMeal.recipeName || firstMeal.title || 'Authentic Pad Thai Recipe',
            timeOrTags: firstMeal.time ? `${firstMeal.time} • Planned` : '40 mins • High-Protein'
          });
          return;
        }
      }
      setUpcomingMeal(null);
    } catch {
      setUpcomingMeal(null);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard - FoodiePrep';
    syncDashboardData();

    // Listen for cross-page live updates
    const handleUpdate = () => syncDashboardData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('zecratary_recipes_updated', handleUpdate);
    window.addEventListener('zecratary_pantry_updated', handleUpdate);
    window.addEventListener('zecratary_shopping_updated', handleUpdate);
    window.addEventListener('zecratary_planner_updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('zecratary_recipes_updated', handleUpdate);
      window.removeEventListener('zecratary_pantry_updated', handleUpdate);
      window.removeEventListener('zecratary_shopping_updated', handleUpdate);
      window.removeEventListener('zecratary_planner_updated', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Autonomous culinary planning and pantry tracking.</p>
      </div>

      {/* Metric Cards matching layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/recipes" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Saved Recipes</span>
          <span className="text-3xl font-black text-[#E05638] mt-1 block">{recipesCount}</span>
        </Link>
        <Link href="/books" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Recipe Books</span>
          <span className="text-3xl font-black text-emerald-400 mt-1 block">{recipeBooksCount}</span>
        </Link>
        <Link href="/pantry" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Pantry Stock</span>
          <span className="text-3xl font-black text-white mt-1 block">{pantryStockCount}</span>
        </Link>
        <Link href="/groceries" className="bg-[#111726] border border-slate-800 p-5 rounded-2xl block hover:border-slate-700 transition">
          <span className="text-xs text-slate-400 block uppercase font-bold">Grocery Items</span>
          <span className="text-3xl font-black text-white mt-1 block">{groceryItemsCount}</span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Meal Section */}
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#E05638]" /> Upcoming Meal
          </h2>
          {upcomingMeal ? (
            <div className="p-4 bg-[#0B101D] border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase">Today • {upcomingMeal.mealType}</span>
                <h3 className="font-bold text-white mt-0.5">{upcomingMeal.title}</h3>
                <span className="text-xs text-slate-400">{upcomingMeal.timeOrTags}</span>
              </div>
              <Link href="/planner" className="text-xs text-[#E05638] font-bold hover:underline">View Planner</Link>
            </div>
          ) : (
            <div className="p-4 bg-[#0B101D] border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span>No meals scheduled for today.</span>
              <Link href="/planner" className="text-xs text-[#E05638] font-bold hover:underline">Plan Meal</Link>
            </div>
          )}
        </div>

        {/* Quick Actions Section */}
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-emerald-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <Link href="/chef" className="p-3 bg-[#0B101D] border border-slate-800 hover:border-slate-700 text-white rounded-xl text-center flex items-center justify-center gap-2 transition">
              <ChefHat className="h-4 w-4 text-emerald-400" /> Ask Chef AI
            </Link>
            <Link href="/import" className="p-3 bg-[#0B101D] border border-slate-800 hover:border-slate-700 text-white rounded-xl text-center flex items-center justify-center gap-2 transition">
              <Sparkles className="h-4 w-4 text-[#E05638]" /> Import Social URL
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open("apps/web/src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(dashboard_code)

print("✅ Dashboard page metrics updated to dynamic live counts!")
