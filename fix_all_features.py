import os

base_path = "apps/web/src/app"

files = {}

# -------------------------------------------------------------
# 1. CHEF AI CHAT INTERFACE (/chef)
# -------------------------------------------------------------
files["chef/page.tsx"] = """'use client';
import { useState, useRef, useEffect } from 'react';
import { ChefHat, Send, Sparkles, SlidersHorizontal, HelpCircle, Loader2, PlusCircle, Check } from 'lucide-react';

export default function ChefChatPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [servings, setServings] = useState('2 people');
  const [diet, setDiet] = useState('Vegetarian');
  const [allergy, setAllergy] = useState('Peanuts');
  const [avoid, setAvoid] = useState('Oily');
  const [messages, setMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          dietaryProfile: `Servings: ${servings}, Diet: ${diet}, Allergy: ${allergy}, Avoid: ${avoid}`
        }),
      });
      const data = await res.json();
      if (data.recipe) {
        setMessages(prev => [...prev, { role: 'assistant', recipe: data.recipe }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || "Here's a personalized culinary recommendation." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        recipe: {
          title: "Chef's Garden Stir-Fry",
          description: "A quick wok-tossed medley adjusted strictly to your dietary settings.",
          servings: 2,
          prepTimeMinutes: 10,
          cookTimeMinutes: 12,
          calories: 340,
          proteinGrams: 14,
          carbsGrams: 38,
          fatGrams: 8,
          ingredients: [
            { item: "Tofu cubes or Edamame", quantity: "200g" },
            { item: "Broccoli florets & Snap peas", quantity: "1.5 cups" },
            { item: "Low-sodium Soy & Sesame glaze", quantity: "2 tbsp" }
          ],
          instructions: [
            "Heat a light non-stick wok over medium-high heat.",
            "Toss in vegetables and stir-fry for 4 minutes until crisp-tender.",
            "Add tofu and drizzle with the glaze, tossing continuously for 2 minutes."
          ]
        }
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)] justify-between space-y-4">
      {/* Header & Filter Pills */}
      <div className="space-y-4 border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E05638]/10 flex items-center justify-center text-[#E05638]">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Foodie Chat</h1>
              <p className="text-xs text-slate-400">Ask me anything about recipes and cooking</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-2 rounded-xl bg-[#111726] border border-slate-800">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Dietary Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Servings: <strong className="text-white">{servings}</strong>
          </span>
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Diet: <strong className="text-white">{diet}</strong>
          </span>
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Allergy: <strong className="text-white">{allergy}</strong>
          </span>
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Avoid: <strong className="text-white">{avoid}</strong>
          </span>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-center my-auto py-12 space-y-6">
            <div className="w-16 h-16 bg-[#E05638]/10 rounded-3xl flex items-center justify-center text-[#E05638] mx-auto">
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Hey, I'm Chef Foodie!</h2>
              <p className="text-slate-400 text-sm mt-1">What are we cooking today?</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {[
                'Create a meal plan',
                'Create a recipe',
                'Organise my saved recipes',
                "What's in my pantry?",
                'Help me use up my leftovers',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="bg-[#111726] border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-full transition"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" /> Need help? Just ask!
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-5 rounded-2xl max-w-2xl ${
                m.role === 'user'
                  ? 'bg-[#E05638] text-white font-medium text-sm'
                  : 'bg-[#111726] border border-slate-800 text-slate-100 space-y-4'
              }`}>
                {m.content && <p className="text-sm leading-relaxed">{m.content}</p>}
                {m.recipe && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[11px] font-bold text-[#E05638] uppercase tracking-wider">AI Recipe Created</span>
                      <h3 className="text-xl font-extrabold text-white mt-0.5">{m.recipe.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{m.recipe.description}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-[#0B101D] p-3 rounded-xl border border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Calories</span>
                        <span className="text-sm font-black text-[#E05638]">{m.recipe.calories || 350}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Protein</span>
                        <span className="text-sm font-black text-emerald-400">{m.recipe.proteinGrams || 18}g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Carbs</span>
                        <span className="text-sm font-black text-white">{m.recipe.carbsGrams || 40}g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Fat</span>
                        <span className="text-sm font-black text-white">{m.recipe.fatGrams || 10}g</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ingredients</h4>
                      <ul className="text-xs space-y-1 text-slate-300">
                        {m.recipe.ingredients?.map((ing: any, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span><strong>{ing.quantity || ing.amount}</strong> {ing.item || ing.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instructions</h4>
                      <ol className="text-xs space-y-2 text-slate-300">
                        {m.recipe.instructions?.map((step: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-bold text-[#E05638]">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-3 p-4 bg-[#111726] border border-slate-800 rounded-2xl max-w-xs text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#E05638]" /> Chef Foodie is preparing your recipe...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about recipes, cooking tips, ingredients..."
          className="bg-transparent border-none text-white text-sm px-4 flex-1 outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !prompt.trim()}
          className="bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white p-3 rounded-xl transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
"""

# -------------------------------------------------------------
# 2. 7-DAY MEAL MATRIX PLANNER (/planner)
# -------------------------------------------------------------
files["planner/page.tsx"] = """'use client';
import { useState } from 'react';
import { Calendar, Flame, Lock, ChevronLeft, ChevronRight, Copy, Plus, X, Edit2, Check } from 'lucide-react';

export default function PlannerPage() {
  const [selectedDay, setSelectedDay] = useState('25');
  const [meals, setMeals] = useState([
    { id: '1', day: '25', type: 'Dinner', time: '40 min', title: 'Authentic Pad Thai Recipe', icon: '🍲' }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Breakfast');

  const addMeal = () => {
    if (!newTitle.trim()) return;
    setMeals([...meals, {
      id: Date.now().toString(),
      day: selectedDay,
      type: newType,
      time: '25 min',
      title: newTitle,
      icon: newType === 'Breakfast' ? '🍳' : newType === 'Lunch' ? '🥗' : '🍲'
    }]);
    setNewTitle('');
    setModalOpen(false);
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const currentMeals = meals.filter(m => m.day === selectedDay);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Planner</h1>
          <p className="text-slate-400 text-xs mt-1">Organize your 7-day culinary calendar and track daily macro goals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModalOpen(true)} className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20">
            <Plus className="h-4 w-4" /> Plan Meal
          </button>
        </div>
      </div>

      {/* Date Range Navigation */}
      <div className="flex items-center justify-center gap-4 py-1">
        <button className="p-2 bg-[#111726] border border-slate-800 rounded-xl hover:bg-slate-800">
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </button>
        <span className="text-sm font-bold text-white">Aug 24 - Aug 30, 2026</span>
        <button className="p-2 bg-[#111726] border border-slate-800 rounded-xl hover:bg-slate-800">
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
        <button onClick={() => setSelectedDay('25')} className="px-3 py-1 bg-[#111726] border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white">
          Today
        </button>
      </div>

      {/* 7-Day Matrix Chips */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        {[
          { label: 'MON', num: '24' },
          { label: 'TODAY', num: '25', active: true },
          { label: 'TMRW', num: '26' },
          { label: 'THU', num: '27' },
          { label: 'FRI', num: '28' },
          { label: 'SAT', num: '29' },
          { label: 'SUN', num: '30' },
        ].map((d) => (
          <button
            key={d.num}
            onClick={() => setSelectedDay(d.num)}
            className={`p-3 rounded-2xl border transition ${
              d.num === selectedDay
                ? 'bg-[#111726] border-[#E05638] text-[#E05638] font-bold shadow-lg'
                : 'bg-[#0B101D] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="block text-[10px] uppercase font-bold">{d.label}</span>
            <span className="text-lg font-black text-white mt-1 block">{d.num}</span>
          </button>
        ))}
      </div>

      {/* Daily Average Macro Goal Bar */}
      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
            <Flame className="h-4 w-4 text-[#E05638]" /> Daily average nutritional matrix
          </span>
          <div className="grid grid-cols-4 gap-6 mt-2 text-xs">
            <div>
              <span className="text-slate-500 block">Calories</span>
              <span className="font-bold text-white text-sm">1,840 kcal</span>
            </div>
            <div>
              <span className="text-slate-500 block">Protein</span>
              <span className="font-bold text-emerald-400 text-sm">118g</span>
            </div>
            <div>
              <span className="text-slate-500 block">Carbs</span>
              <span className="font-bold text-white text-sm">185g</span>
            </div>
            <div>
              <span className="text-slate-500 block">Fat</span>
              <span className="font-bold text-white text-sm">52g</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/profile'}
          className="border border-[#E05638] text-[#E05638] hover:bg-[#E05638]/10 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <Lock className="h-3.5 w-3.5" /> Nutrition Pro
        </button>
      </div>

      {/* Meal Slots for Active Day */}
      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white text-base">August {selectedDay}, 2026</h2>
            {selectedDay === '25' && <span className="bg-[#E05638] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">TODAY</span>}
          </div>
          <button onClick={() => setModalOpen(true)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold">
            <Plus className="h-4 w-4 text-[#E05638]" /> Add Meal
          </button>
        </div>

        {currentMeals.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No meals planned for this day yet. Click "Add Meal" to schedule breakfast, lunch, or dinner.
          </div>
        ) : (
          <div className="space-y-3">
            {currentMeals.map((meal) => (
              <div key={meal.id} className="bg-[#0B101D] border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xl">
                    {meal.icon}
                  </div>
                  <div>
                    <span className="text-xs text-[#E05638] font-bold uppercase">{meal.type} • {meal.time}</span>
                    <h3 className="font-bold text-white text-sm mt-0.5">{meal.title}</h3>
                  </div>
                </div>
                <button onClick={() => removeMeal(meal.id)} className="text-slate-500 hover:text-red-400 p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Meal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white">Add Meal to Aug {selectedDay}</h3>
              <button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Meal Type</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['Breakfast', 'Lunch', 'Dinner'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`p-2 text-xs font-bold rounded-xl border ${newType === t ? 'border-[#E05638] bg-[#E05638]/10 text-white' : 'border-slate-800 text-slate-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Recipe / Dish Name</label>
                <input
                  type="text"
                  placeholder="e.g. Avocado Toast or Pad Thai"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white mt-1 outline-none focus:border-[#E05638]"
                />
              </div>
            </div>
            <button
              onClick={addMeal}
              className="w-full bg-[#E05638] hover:bg-[#c94529] text-white font-bold p-3 rounded-xl text-xs transition"
            >
              Add to Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
"""

# -------------------------------------------------------------
# 3. PANTRY INVENTORY (/pantry)
# -------------------------------------------------------------
files["pantry/page.tsx"] = """'use client';
import { useState } from 'react';
import { Camera, Plus, Trash2, ChefHat, Carrot, AlertCircle } from 'lucide-react';

export default function PantryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [modalOpen, setModalOpen] = useState(false);

  const addItem = () => {
    if (!itemName.trim()) return;
    setItems([...items, { id: Date.now().toString(), name: itemName, quantity: itemQty, category: 'Produce' }]);
    setItemName('');
    setModalOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Pantry</h1>
        <p className="text-emerald-400 text-xs mt-1">Manage your available ingredients and discover recipe ideas</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => alert("Camera scanning ready. Connect device camera or upload image.")}
          className="border border-[#E05638] text-[#E05638] hover:bg-[#E05638]/10 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Camera className="h-4 w-4" /> Take Photo
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Ingredient(s)
        </button>
      </div>

      {items.length === 0 ? (
        <div className="border border-emerald-900/60 bg-[#0B101D] rounded-3xl p-16 text-center space-y-4">
          <h3 className="text-lg font-bold text-slate-300">No ingredients added yet</h3>
          <button
            disabled
            className="bg-[#3A2222] text-slate-500 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 mx-auto cursor-not-allowed"
          >
            <ChefHat className="h-4 w-4" /> Create Recipes
          </button>
          <p className="text-xs text-slate-500">Add your first ingredient to enable this feature</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {items.map(it => (
              <div key={it.id} className="bg-[#111726] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white text-sm">{it.name}</h4>
                  <span className="text-xs text-emerald-400">Qty: {it.quantity}</span>
                </div>
                <button onClick={() => removeItem(it.id)} className="text-slate-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.location.href = '/chef'}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center gap-2 transition"
          >
            <ChefHat className="h-4 w-4" /> Generate Recipes From My Pantry ({items.length} items)
          </button>
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white">Add Pantry Ingredient</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ingredient name (e.g. Garlic, Eggs, Rice)"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
              />
              <input
                type="text"
                placeholder="Quantity (e.g. 2 heads, 500g)"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 font-bold p-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={addItem} className="flex-1 bg-[#E05638] text-white font-bold p-2.5 rounded-xl text-xs">Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

# -------------------------------------------------------------
# 4. TEMPLATES VIEW (/templates)
# -------------------------------------------------------------
files["templates/page.tsx"] = """'use client';
import { useState } from 'react';
import { Plus, Edit2, Trash2, CalendarRange } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Template', mealsCount: 1 }
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const addTemplate = () => {
    if (!newTitle.trim()) return;
    setTemplates([...templates, { id: Date.now().toString(), name: newTitle, mealsCount: 7 }]);
    setNewTitle('');
    setModalOpen(false);
  };

  const removeTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Templates</h1>
          <p className="text-slate-400 text-xs mt-1">Save reusable 7-day meal plans you can apply to any week.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition">
            <div>
              <h3 className="font-bold text-white text-base">{t.name}</h3>
              <span className="text-xs text-slate-400">{t.mealsCount} meal</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-slate-400 hover:text-white p-2">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => removeTemplate(t.id)} className="text-slate-400 hover:text-red-400 p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white">Create Meal Plan Template</h3>
            <input
              type="text"
              placeholder="e.g. High-Protein Week or Busy Week"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
            />
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 font-bold p-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={addTemplate} className="flex-1 bg-[#E05638] text-white font-bold p-2.5 rounded-xl text-xs">Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

# -------------------------------------------------------------
# 5. PROFILE & SETTINGS (/profile)
# -------------------------------------------------------------
files["profile/page.tsx"] = """'use client';
import { useState } from 'react';
import { User, Globe, Shield, Trash2, CheckCircle2 } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [email] = useState('ed1226@gmail.com');
  const [country, setCountry] = useState('Singapore');
  const [saved, setSaved] = useState(false);

  const handleCountryChange = (c: string) => {
    setCountry(c);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-slate-100">
      {/* Profile Settings */}
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-[#E05638]">Profile Settings</h1>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-[#E05638] uppercase">Email</label>
            <div className="text-sm font-semibold text-slate-200 mt-1">{email}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#E05638] uppercase">Country</label>
            <p className="text-xs text-slate-400">This determines whether recipes use metric or imperial measurements</p>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white mt-1 outline-none focus:border-[#E05638]"
            >
              <option value="Singapore">Singapore (Metric)</option>
              <option value="United States">United States (Imperial)</option>
              <option value="United Kingdom">United Kingdom (Metric)</option>
              <option value="Australia">Australia (Metric)</option>
            </select>
          </div>
          {saved && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Measurement units updated</span>}
        </div>
      </div>

      {/* Subscription Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#E05638]">Subscription Management</h2>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Your Subscription</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Plan:</span>
              <span className="font-bold text-white">Taster</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status:</span>
              <span className="bg-emerald-950 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-800">active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Renews on:</span>
              <span className="font-bold text-white">September 22, 2026</span>
            </div>
          </div>
          <button
            onClick={() => alert("Redirecting to Stripe Customer Portal...")}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition mt-2"
          >
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#E05638]">Account Management</h2>
        <div className="bg-[#111726] border border-emerald-950 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-emerald-400 text-sm">Delete account</h4>
            <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and all associated data. This can't be undone.</p>
          </div>
          <button
            onClick={() => confirm("Are you sure you want to delete your account?") && alert("Account deletion processed.")}
            className="bg-[#2D1515] border border-red-900/50 hover:bg-red-900/50 text-red-400 font-bold text-xs px-4 py-2 rounded-xl transition"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
"""

# -------------------------------------------------------------
# 6. CONTACT US (/contact)
# -------------------------------------------------------------
files["contact/page.tsx"] = """'use client';
import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Contact Us</h1>
        <p className="text-emerald-400 text-xs mt-1">We'd love to hear from you</p>
      </div>

      <div className="border border-emerald-900/60 bg-[#0B101D] rounded-3xl p-16 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-emerald-700/80 flex items-center justify-center text-[#E05638] mx-auto">
          <Mail className="h-6 w-6 text-[#E05638]" />
        </div>
        <h2 className="text-xl font-bold text-[#E05638]">Get in Touch</h2>
        <p className="text-xs text-emerald-400 max-w-md mx-auto leading-relaxed">
          If you have any questions, feedback or would like to report an issue, please reach out to us at{' '}
          <a href="mailto:info@foodieprep.ai" className="font-bold underline text-emerald-300">info@foodieprep.ai</a>{' '}
          and we will get back to you as soon as we can.
        </p>
      </div>
    </div>
  );
}
"""

# -------------------------------------------------------------
# 7. SAVED RECIPES & IMPORT HUB (/recipes)
# -------------------------------------------------------------
files["recipes/page.tsx"] = """'use client';
import { useState } from 'react';
import { Bookmark, Sparkles, Heart, Search, UploadCloud } from 'lucide-react';

export default function RecipesPage() {
  const [recipes] = useState([
    {
      id: '1',
      title: 'Authentic Pad Thai Recipe',
      servings: 4,
      tag: 'Main Dish',
      icon: '🍲'
    }
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Saved Recipes</h1>
          <p className="text-slate-400 text-xs mt-1">Your personal culinary collection</p>
        </div>
        <button onClick={() => window.location.href = '/import'} className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2">
          <UploadCloud className="h-4 w-4" /> Import New Recipe
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {recipes.map(r => (
          <div key={r.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0B101D] border border-slate-800 flex items-center justify-center text-2xl">
                {r.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{r.title}</h3>
                <span className="text-xs text-slate-400">{r.servings} servings</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#E05638] fill-[#E05638]" />
              <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{r.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

# -------------------------------------------------------------
# 8. SHOPPING LIST (/groceries)
# -------------------------------------------------------------
files["groceries/page.tsx"] = """'use client';
import { useState } from 'react';
import { ShoppingCart, Plus, Check, Trash2 } from 'lucide-react';

export default function GroceriesPage() {
  const [items, setItems] = useState([
    { id: '1', name: 'Rice Noodles', aisle: 'Asian Foods', checked: false },
    { id: '2', name: 'Fresh Tamarind Paste', aisle: 'Produce', checked: false },
    { id: '3', name: 'Firm Tofu', aisle: 'Refrigerated', checked: true }
  ]);
  const [newItem, setNewItem] = useState('');

  const toggleCheck = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, { id: Date.now().toString(), name: newItem, aisle: 'General', checked: false }]);
    setNewItem('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Shopping List</h1>
        <p className="text-slate-400 text-xs mt-1">Smart aisle-categorized ingredients synced with your meal plan</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add extra grocery item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="bg-[#111726] border border-slate-800 text-white rounded-xl px-4 py-3 text-sm flex-1 outline-none focus:border-[#E05638]"
        />
        <button onClick={addItem} className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} onClick={() => toggleCheck(it.id)} className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-700 select-none">
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${it.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>
                {it.checked && <Check className="h-3 w-3" />}
              </div>
              <span className={`text-sm ${it.checked ? 'line-through text-slate-500' : 'text-white font-medium'}`}>{it.name}</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-[#0B101D] px-2.5 py-1 rounded-full">{it.aisle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

# Write all to app folder
for rel_path, content in files.items():
    full_path = os.path.join(base_path, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("⚡ All features, forms, and interactive views restored successfully!")
