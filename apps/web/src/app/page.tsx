import Link from 'next/link';
import { ChefHat, Calendar, ShoppingCart, Carrot, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Autonomous culinary planning and pantry tracking.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Saved Recipes</span>
          <span className="text-3xl font-black text-[#E05638] mt-1 block">18</span>
        </div>
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Recipe Books</span>
          <span className="text-3xl font-black text-emerald-400 mt-1 block">3</span>
        </div>
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Pantry Stock</span>
          <span className="text-3xl font-black text-white mt-1 block">14</span>
        </div>
        <div className="bg-[#111726] border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block uppercase font-bold">Grocery Items</span>
          <span className="text-3xl font-black text-white mt-1 block">6</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#E05638]" /> Upcoming Meal
          </h2>
          <div className="p-4 bg-[#0B101D] border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase">Today • Dinner</span>
              <h3 className="font-bold text-white mt-0.5">Authentic Pad Thai Recipe</h3>
              <span className="text-xs text-slate-400">40 mins • High-Protein</span>
            </div>
            <Link href="/planner" className="text-xs text-[#E05638] font-bold hover:underline">View Planner</Link>
          </div>
        </div>

        <div className="bg-[#111726] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-emerald-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <Link href="/chef" className="p-3 bg-[#0B101D] border border-slate-800 rounded-xl hover:border-slate-700 text-center">
              Ask Chef AI
            </Link>
            <Link href="/recipes" className="p-3 bg-[#0B101D] border border-slate-800 rounded-xl hover:border-slate-700 text-center">
              Import Social URL
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
