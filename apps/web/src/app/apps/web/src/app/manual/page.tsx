'use client';
import { useState } from 'react';
import { Edit3, Save, Plus, Trash2 } from 'lucide-react';

export default function ManualRecipePage() {
  const [ingredients, setIngredients] = useState([{ name: '', amount: '' }]);
  const [instructions, setInstructions] = useState(['']);

  const addIngredient = () => setIngredients([...ingredients, { name: '', amount: '' }]);
  const addInstruction = () => setInstructions([...instructions, '']);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638] flex items-center gap-3">
            <Edit3 className="h-8 w-8 text-[#E05638]" /> Manual Entry
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create a custom recipe from scratch.</p>
        </div>
        <button className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2">
          <Save className="h-4 w-4" /> Save Recipe
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-8 space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Basic Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-[#E05638] uppercase">Recipe Title</label>
              <input type="text" placeholder="e.g. Grandma's Apple Pie" className="w-full bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#E05638] uppercase">Prep Time (mins)</label>
              <input type="number" placeholder="15" className="w-full bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#E05638] uppercase">Cook Time (mins)</label>
              <input type="number" placeholder="45" className="w-full bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-lg font-bold text-white">Ingredients</h2>
            <button onClick={addIngredient} className="text-xs text-[#E05638] font-bold flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input type="text" placeholder="Amount (e.g. 2 cups)" className="w-1/3 bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
              <input type="text" placeholder="Ingredient (e.g. Flour)" className="flex-1 bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#E05638]" />
              <button className="p-3 text-slate-500 hover:text-red-400 transition"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-lg font-bold text-white">Instructions</h2>
            <button onClick={addInstruction} className="text-xs text-[#E05638] font-bold flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Add Step
            </button>
          </div>
          {instructions.map((inst, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-8 h-8 shrink-0 bg-[#E05638]/10 text-[#E05638] font-bold rounded-full flex items-center justify-center text-sm">
                {idx + 1}
              </div>
              <textarea placeholder={`Describe step ${idx + 1}...`} className="flex-1 bg-[#0B101D] border border-slate-700 text-white rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:border-[#E05638] resize-y" />
              <button className="p-3 text-slate-500 hover:text-red-400 transition h-fit"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
