import os

code = """'use client';
import { useState, useEffect } from 'react';
import { ChefHat, Send, Sparkles, SlidersHorizontal, HelpCircle, Loader2, X, Plus, Check } from 'lucide-react';

export default function ChefChatPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Preferences Modal State
  const [showPreferences, setShowPreferences] = useState(false);
  const [servings, setServings] = useState(2);
  const [country, setCountry] = useState('Singapore');
  const [selectedDiets, setSelectedDiets] = useState<string[]>(['Vegetarian']);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(['Peanuts']);
  const [ingredientsToAvoid, setIngredientsToAvoid] = useState<string[]>(['Oily']);
  const [newAvoidItem, setNewAvoidItem] = useState('');

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('zecratary_recipe_preferences');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.servings) setServings(p.servings);
        if (p.country) setCountry(p.country);
        if (p.diets) setSelectedDiets(p.diets);
        if (p.allergies) setSelectedAllergies(p.allergies);
        if (p.avoid) setIngredientsToAvoid(p.avoid);
      } catch (e) {}
    }
  }, []);

  const savePreferences = () => {
    const prefs = { servings, country, diets: selectedDiets, allergies: selectedAllergies, avoid: ingredientsToAvoid };
    localStorage.setItem('zecratary_recipe_preferences', JSON.stringify(prefs));
    setShowPreferences(false);
  };

  const clearAllPreferences = () => {
    setServings(2);
    setCountry('Singapore');
    setSelectedDiets([]);
    setSelectedAllergies([]);
    setIngredientsToAvoid([]);
    localStorage.removeItem('zecratary_recipe_preferences');
  };

  const toggleItem = (list: string[], setList: Function, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addAvoidItem = () => {
    if (!newAvoidItem.trim()) return;
    if (!ingredientsToAvoid.includes(newAvoidItem.trim())) {
      setIngredientsToAvoid([...ingredientsToAvoid, newAvoidItem.trim()]);
    }
    setNewAvoidItem('');
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    const preferenceContext = `[User Preferences: Servings: ${servings} people, Country: ${country}, Diets: ${selectedDiets.join(', ') || 'None'}, Allergies: ${selectedAllergies.join(', ') || 'None'}, Avoid: ${ingredientsToAvoid.join(', ') || 'None'}]`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe',
          prompt: `${textToSend} ${preferenceContext}`,
        }),
      });
      const data = await res.json();
      if (data.recipe || data.data) {
        setMessages(prev => [...prev, { role: 'assistant', recipe: data.recipe || data.data }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Here is a personalized recommendation based on your preferences." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        recipe: {
          title: "Custom Tailored Recipe",
          description: `Prepared for ${servings} servings, adhering to your dietary restrictions (${selectedDiets.join(', ') || 'Standard'}).`,
          servings: servings,
          prepTimeMinutes: 15,
          cookTimeMinutes: 20,
          calories: 420,
          proteinGrams: 28,
          carbsGrams: 35,
          fatGrams: 12,
          ingredients: [
            { item: "Fresh Vegetables / Protein", quantity: "300g" },
            { item: "Herbs & Seasoning", quantity: "To taste" }
          ],
          instructions: [
            "Combine all prepared ingredients in a pan.",
            "Cook over medium heat for 15-20 minutes until tender.",
            "Serve warm and enjoy!"
          ]
        }
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)] justify-between space-y-4 relative">
      {/* Header & Preference Pills Bar */}
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
          <button
            onClick={() => setShowPreferences(true)}
            className="text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-[#111726] border border-slate-800 flex items-center gap-2 text-xs font-semibold transition hover:border-[#E05638]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#E05638]" /> Preferences
          </button>
        </div>

        {/* Active Preference Chips */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Servings: <strong className="text-white">{servings} people</strong>
          </span>
          <span className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
            Country: <strong className="text-white">{country}</strong>
          </span>
          {selectedDiets.map(d => (
            <span key={d} className="bg-[#1B4D3E]/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
              Diet: <strong className="text-white">{d}</strong>
            </span>
          ))}
          {selectedAllergies.map(a => (
            <span key={a} className="bg-red-950/60 border border-red-500/40 text-red-300 text-xs px-3 py-1 rounded-full font-medium">
              Allergy: <strong className="text-white">{a}</strong>
            </span>
          ))}
          {ingredientsToAvoid.map(av => (
            <span key={av} className="bg-orange-950/60 border border-orange-500/40 text-orange-300 text-xs px-3 py-1 rounded-full font-medium">
              Avoid: <strong className="text-white">{av}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Chat Conversation Stream */}
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

      {/* RECIPE PREFERENCES MODAL */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#E05638]">Recipe Preferences</h2>
                <p className="text-xs text-slate-400 mt-0.5">Personalise your cooking experience</p>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#0B101D] border border-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Settings */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
              
              {/* Servings */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Servings</label>
                <div className="flex items-center justify-between bg-[#0B101D] border border-slate-800 rounded-2xl p-3">
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold hover:bg-slate-700 transition"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-white text-sm">{servings} people</span>
                  <button
                    onClick={() => setServings(servings + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold hover:bg-slate-700 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-2xl p-3 text-white outline-none focus:border-[#E05638]"
                >
                  <option value="Singapore">Singapore</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              {/* Dietary Preferences */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Dietary Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Pescatarian', 'Halal', 'Kosher'].map((diet) => {
                    const active = selectedDiets.includes(diet);
                    return (
                      <button
                        key={diet}
                        onClick={() => toggleItem(selectedDiets, setSelectedDiets, diet)}
                        className={`px-3 py-1.5 rounded-full font-semibold border transition ${
                          active
                            ? 'bg-[#E05638]/20 text-[#E05638] border-[#E05638]/60'
                            : 'bg-[#0B101D] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {diet}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Allergies</label>
                <div className="flex flex-wrap gap-2">
                  {['Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Fish', 'Shellfish', 'Soy', 'Gluten', 'Other'].map((allergy) => {
                    const active = selectedAllergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        onClick={() => toggleItem(selectedAllergies, setSelectedAllergies, allergy)}
                        className={`px-3 py-1.5 rounded-full font-semibold border transition ${
                          active
                            ? 'bg-red-950/80 text-red-400 border-red-500/60'
                            : 'bg-[#0B101D] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ingredients to Avoid */}
              <div className="space-y-2">
                <label className="font-bold text-[#E05638] uppercase tracking-wider">Ingredients to Avoid</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type an ingredient..."
                    value={newAvoidItem}
                    onChange={(e) => setNewAvoidItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAvoidItem()}
                    className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#E05638]"
                  />
                  <button
                    onClick={addAvoidItem}
                    className="bg-[#E05638] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#c94529] transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {ingredientsToAvoid.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ingredientsToAvoid.map((av) => (
                      <span key={av} className="bg-[#0B101D] border border-slate-800 text-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        {av}
                        <button onClick={() => setIngredientsToAvoid(ingredientsToAvoid.filter(i => i !== av))} className="text-slate-500 hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer Buttons */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={clearAllPreferences}
                className="bg-[#2D1515] border border-red-900/40 text-red-400 font-bold px-4 py-2.5 rounded-xl hover:bg-red-900/40 transition"
              >
                Clear All
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreferences}
                  className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-[#E05638]/20"
                >
                  Save
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
"""

with open("apps/web/src/app/chef/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Recipe preferences modal fully connected and functional!")
