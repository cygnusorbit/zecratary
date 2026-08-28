import os

exact_code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChefHat, Plus, Search, Trash2, Edit3, X, Save, 
  ShoppingCart, Users, ArrowRight, CheckSquare, Sparkles 
} from 'lucide-react';
import { CATEGORIES } from '@/constants/categories';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);

  // Form states
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeServings, setRecipeServings] = useState('4');
  const [recipePrepTime, setRecipePrepTime] = useState('30 mins');
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([
    { id: 'ri_1', name: '', amount: '', unit: '', category: 'Produce' }
  ]);
  const [recipeSteps, setRecipeSteps] = useState<string[]>(['']);

  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Saved Recipes - FoodiePrep';
    const local = localStorage.getItem('zecratary_recipes');
    if (local) {
      const parsed = JSON.parse(local);
      setRecipes(parsed);
      if (parsed.length > 0) setSelectedRecipe(parsed[0]);
    } else {
      const defaultRecipes = [
        {
          id: 'rec_1',
          name: 'Pad Thai',
          description: 'Authentic street-style stir-fried rice noodles with tofu and shrimp.',
          servings: 2,
          prepTime: '25 mins',
          ingredients: [
            { id: 'i_1', name: 'cloves garlic', amount: '3', unit: '', category: 'Produce', selected: true },
            { id: 'i_2', name: 'roughly chopped shallots', amount: '¼', unit: 'cup', category: 'Produce', selected: true },
            { id: 'i_3', name: 'pressed tofu', amount: '3', unit: 'oz', category: 'Meat and Seafood', selected: true }
          ],
          steps: [
            'Mince garlic and finely chop shallots.',
            'Heat wok and sauté aromatics until fragrant.',
            'Add noodles, sauce, and toss thoroughly.'
          ]
        }
      ];
      setRecipes(defaultRecipes);
      setSelectedRecipe(defaultRecipes[0]);
      localStorage.setItem('zecratary_recipes', JSON.stringify(defaultRecipes));
    }
  }, []);

  const saveRecipes = (updated: any[]) => {
    setRecipes(updated);
    localStorage.setItem('zecratary_recipes', JSON.stringify(updated));
  };

  const handleCreateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;

    const newRecipe = {
      id: 'rec_' + Date.now(),
      name: recipeName.trim(),
      description: recipeDescription.trim(),
      servings: parseInt(recipeServings) || 4,
      prepTime: recipePrepTime || '30 mins',
      ingredients: recipeIngredients.filter(i => i.name.trim()).map(i => ({ ...i, selected: true })),
      steps: recipeSteps.filter(s => s.trim())
    };

    const updated = [newRecipe, ...recipes];
    saveRecipes(updated);
    setSelectedRecipe(newRecipe);
    setRecipeName('');
    setRecipeDescription('');
    setRecipeServings('4');
    setRecipePrepTime('30 mins');
    setRecipeIngredients([{ id: 'ri_1', name: '', amount: '', unit: '', category: 'Produce' }]);
    setRecipeSteps(['']);
    setShowCreateModal(false);
  };

  const handleDeleteRecipe = (id: string) => {
    const updated = recipes.filter(r => r.id !== id);
    saveRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe(updated.length > 0 ? updated[0] : null);
    }
  };

  const openShoppingModal = () => {
    if (!selectedRecipe) return;
    const items = selectedRecipe.ingredients.map((ing: any) => ({
      ...ing,
      selected: true
    }));
    setShoppingModalIngredients(items);
    setShowShoppingModal(true);
  };

  const handleAddToShoppingList = () => {
    const selectedIngs = shoppingModalIngredients.filter(i => i.selected);
    if (selectedIngs.length === 0) {
      alert('Please select at least one ingredient.');
      return;
    }

    const localShopping = localStorage.getItem('zecratary_shopping_list');
    let currentShopping = localShopping ? JSON.parse(localShopping) : [];

    const newItems = selectedIngs.map((ing: any) => ({
      id: 's_' + Date.now() + Math.random(),
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      category: ing.category || 'Pantry Staples',
      staple: false,
      checked: false
    }));

    localStorage.setItem('zecratary_shopping_list', JSON.stringify([...newItems, ...currentShopping]));
    setShowShoppingModal(false);
    alert(`Successfully added ${newItems.length} ingredients to your Shopping List!`);
  };

  const filteredRecipes = recipes.filter(r => 
    !search.trim() || r.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const baseServings = selectedRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Saved Recipes</h1>
          <p className="text-xs text-slate-400">Manage your culinary collection, scale ingredients, and plan meals.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/25"
        >
          <Plus className="h-4 w-4" /> Create Recipe
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECIPES LIST SIDEBAR */}
        <div className="lg:col-span-4 bg-[#111726] border border-emerald-950 rounded-3xl p-5 space-y-4 shadow-md">
          <div className="relative">
            <Search className="h-4 w-4 text-emerald-500 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0B101D] border border-emerald-950 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
            />
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setServingsMultiplier(1);
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  selectedRecipe?.id === recipe.id
                    ? 'bg-[#1a2338] border-[#E05638]'
                    : 'bg-[#0B101D] border-emerald-950/80 hover:border-emerald-800'
                }`}
              >
                <div>
                  <h3 className="font-extrabold text-sm text-white">{recipe.name}</h3>
                  <span className="text-xs text-slate-400 font-medium">{recipe.ingredients?.length || 0} ingredients • {recipe.servings} servings</span>
                </div>
                <ChefHat className={`h-5 w-5 ${selectedRecipe?.id === recipe.id ? 'text-[#E05638]' : 'text-slate-600'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* RECIPE DETAILS MAIN VIEW */}
        <div className="lg:col-span-8 bg-[#111726] border border-emerald-950 rounded-3xl p-6 space-y-6 shadow-md">
          {selectedRecipe ? (
            <div className="space-y-6">
              
              <div className="flex items-start justify-between border-b border-emerald-950 pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white">{selectedRecipe.name}</h2>
                  <p className="text-xs text-slate-400">{selectedRecipe.description}</p>
                  <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-emerald-400">
                    <span>Prep: {selectedRecipe.prepTime || '30 mins'}</span>
                    <span>•</span>
                    <span>Base Servings: {selectedRecipe.servings}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openShoppingModal}
                    className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
                  >
                    <ShoppingCart className="h-4 w-4" /> Shopping List
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                    className="p-2.5 text-slate-500 hover:text-red-400 transition bg-[#0B101D] rounded-xl border border-slate-800"
                    title="Delete recipe"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* SERVINGS MULTIPLIER */}
              <div className="flex items-center justify-between bg-[#0B101D] p-4 rounded-2xl border border-emerald-950">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#E05638]" />
                  <span className="text-xs font-bold text-white">Servings: {currentTotalServings}</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0.5, 1, 1.5, 2].map((mult) => (
                    <button
                      key={mult}
                      onClick={() => setServingsMultiplier(mult)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        servingsMultiplier === mult
                          ? 'bg-[#E05638] text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {mult}x
                    </button>
                  ))}
                </div>
              </div>

              {/* INGREDIENTS & STEPS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">Ingredients</h3>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {selectedRecipe.ingredients?.map((ing: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-[#0B101D] p-3 rounded-2xl border border-emerald-950/80 text-xs">
                        <span className="font-bold text-white capitalize">{ing.name}</span>
                        <span className="text-slate-400 font-medium">
                          {ing.amount ? Number(ing.amount) * servingsMultiplier : ''} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">Steps</h3>
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {selectedRecipe.steps?.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-3 bg-[#0B101D] p-3 rounded-2xl border border-emerald-950/80 text-xs">
                        <span className="font-extrabold text-[#E05638]">{idx + 1}.</span>
                        <p className="text-slate-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-24 text-center space-y-2">
              <ChefHat className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No recipe selected</h3>
              <p className="text-xs text-slate-400">Select a recipe from the sidebar or create a new one.</p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE RECIPE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E05638]" /> Create New Recipe
            </h2>
            <form onSubmit={handleCreateRecipe} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Recipe Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garlic Butter Pasta..."
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief summary..."
                  value={recipeDescription}
                  onChange={(e) => setRecipeDescription(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Servings</label>
                  <input
                    type="number"
                    value={recipeServings}
                    onChange={(e) => setRecipeServings(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Prep Time</label>
                  <input
                    type="text"
                    value={recipePrepTime}
                    onChange={(e) => setRecipePrepTime(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#E05638] uppercase tracking-wider">Ingredients</label>
                  <button
                    type="button"
                    onClick={() => setRecipeIngredients([...recipeIngredients, { id: 'ri_' + Date.now(), name: '', amount: '', unit: '', category: 'Produce' }])}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    + Add Ingredient
                  </button>
                </div>
                {recipeIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Amt"
                      value={ing.amount}
                      onChange={(e) => {
                        const updated = [...recipeIngredients];
                        updated[idx].amount = e.target.value;
                        setRecipeIngredients(updated);
                      }}
                      className="w-16 bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-white text-center outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => {
                        const updated = [...recipeIngredients];
                        updated[idx].unit = e.target.value;
                        setRecipeIngredients(updated);
                      }}
                      className="w-20 bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-slate-300 text-center outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Name..."
                      value={ing.name}
                      onChange={(e) => {
                        const updated = [...recipeIngredients];
                        updated[idx].name = e.target.value;
                        setRecipeIngredients(updated);
                      }}
                      className="flex-1 bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                    />
                    <select
                      value={ing.category || 'Produce'}
                      onChange={(e) => {
                        const updated = [...recipeIngredients];
                        updated[idx].category = e.target.value;
                        setRecipeIngredients(updated);
                      }}
                      className="bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-slate-300 outline-none cursor-pointer text-xs"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20"
                >
                  Save Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHOPPING LIST MODAL */}
      {showShoppingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowShoppingModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#E05638]" /> Add Ingredients to Shopping List
            </h2>
            <p className="text-xs text-slate-400">Review and select the ingredients you need to buy.</p>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {shoppingModalIngredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-2 p-3 rounded-2xl border bg-[#0B101D] border-slate-800">
                  <div
                    onClick={() => {
                      const updated = shoppingModalIngredients.map(item => item.id === ing.id ? { ...item, selected: !item.selected } : item);
                      setShoppingModalIngredients(updated);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer ${
                      ing.selected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                  </div>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, amount: val } : i));
                    }}
                    className="w-14 bg-slate-900 border border-slate-800 rounded-xl py-2 px-1 text-xs text-white text-center font-bold outline-none shrink-0"
                    placeholder="Qty"
                  />

                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, unit: val } : i));
                    }}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-xl py-2 px-1 text-xs text-slate-300 text-center outline-none shrink-0"
                    placeholder="Unit"
                  />

                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, name: val } : i));
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none font-medium min-w-0"
                    placeholder="Ingredient name..."
                  />

                  <select
                    value={ing.category || 'Pantry Staples'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, category: val } : i));
                    }}
                    className="w-32 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-[11px] text-slate-300 outline-none cursor-pointer shrink-0"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setShoppingModalIngredients(shoppingModalIngredients.filter(i => i.id !== ing.id));
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 transition rounded-xl bg-slate-900 border border-slate-800 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowShoppingModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddToShoppingList}
                className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition text-xs shadow-lg shadow-[#E05638]/20"
              >
                Add to Shopping List
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
"""

os.makedirs("apps/web/src/app/recipes", exist_ok=True)
with open("apps/web/src/app/recipes/page.tsx", "w", encoding="utf-8") as f:
    f.write(exact_code)

print("✅ Saved Recipes page successfully restored to your exact reference layout!")
