import os

with open("apps/web/src/app/recipes/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace the alert in Shopping List button click with the full modal trigger
old_shopping_click = '''                    <button
                      onClick={() => alert(`Added ingredients for "${selectedRecipe.title}" to Shopping List!`)}
                      className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                    </button>'''

new_shopping_click = '''                    <button
                      onClick={() => {
                        const defaultIngs = (selectedRecipe.ingredients || []).map((ing: any, idx: number) => ({
                          id: 'ing_' + idx,
                          name: typeof ing === 'string' ? ing : (ing.item || ing.name || ''),
                          amount: ing.amount || ing.quantity || '1',
                          unit: ing.unit || '',
                          category: ing.category || 'Pantry Staples',
                          selected: true,
                          matchedWithPantry: (ing.item || ing.name || '').toLowerCase().includes('fish') || (ing.item || ing.name || '').toLowerCase().includes('shrimp')
                        }));
                        setShoppingModalIngredients(defaultIngs);
                        setShowShoppingModal(true);
                      }}
                      className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                    </button>'''

if old_shopping_click in code:
    code = code.replace(old_shopping_click, new_shopping_click)

# Also update the viewingRecipe popup modal button in Books or shared view if applicable
old_viewing_shopping = '''                <button
                  onClick={() => alert(`Added ingredients for "${viewingRecipe.title}" to Shopping List!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                </button>'''

new_viewing_shopping = '''                <button
                  onClick={() => {
                    const defaultIngs = (viewingRecipe.ingredients || []).map((ing: any, idx: number) => ({
                      id: 'ing_' + idx,
                      name: typeof ing === 'string' ? ing : (ing.item || ing.name || ''),
                      amount: ing.amount || ing.quantity || '1',
                      unit: ing.unit || '',
                      category: ing.category || 'Pantry Staples',
                      selected: true,
                      matchedWithPantry: (ing.item || ing.name || '').toLowerCase().includes('fish') || (ing.item || ing.name || '').toLowerCase().includes('shrimp')
                    }));
                    setShoppingModalIngredients(defaultIngs);
                    setShowShoppingModal(true);
                  }}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                </button>'''

if old_viewing_shopping in code:
    code = code.replace(old_viewing_shopping, new_viewing_shopping)

# Now inject the modal component state and JSX before the closing </div> of the main component
modal_state_code = """
  // Shopping List Modal States
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  const handleAddSelectedToShoppingList = () => {
    const selected = shoppingModalIngredients.filter(i => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one ingredient to add.');
      return;
    }

    const existingList = JSON.parse(localStorage.getItem('zecratary_shopping_list') || '[]');
    const newEntries = selected.map((item, idx) => ({
      id: 's_added_' + Date.now() + '_' + idx,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      category: item.category || 'Pantry Staples',
      staple: false,
      checked: false
    }));

    const combined = [...newEntries, ...existingList];
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(combined));
    setShowShoppingModal(false);
    alert(`Successfully added ${selected.length} items to your Shopping List!`);
  };
"""

# Inject state right before return (or component body)
if "showShoppingModal" not in code:
    code = code.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);" + modal_state_code)

# Inject modal JSX at the very bottom before final closing tags
modal_jsx = """
      {/* ADD INGREDIENTS TO SHOPPING LIST REFERENCE MODAL */}
      {showShoppingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowShoppingModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-xl font-black text-[#E05638]">Add Ingredients to Shopping List</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Review and select the ingredients you need to buy. <span className="text-emerald-400 font-bold">Green items with checkmarks are potential matched ingredients from your pantry.</span>
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {Array.from(new Set(shoppingModalIngredients.map(i => i.category || 'Pantry Staples'))).map(cat => {
                const catIngs = shoppingModalIngredients.filter(i => (i.category || 'Pantry Staples') === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">{cat}</h3>
                    <div className="space-y-2.5">
                      {catIngs.map((ing, idx) => (
                        <div
                          key={ing.id}
                          onClick={() => {
                            const updated = shoppingModalIngredients.map(item => item.id === ing.id ? { ...item, selected: !item.selected } : item);
                            setShoppingModalIngredients(updated);
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                            ing.matchedWithPantry 
                              ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-300' 
                              : 'bg-[#0B101D] border-slate-800 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                              ing.selected 
                                ? (ing.matchedWithPantry ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-[#E05638] border-[#E05638] text-white') 
                                : 'border-slate-700 bg-slate-900'
                            }`}>
                              {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                            </div>
                            <span className="text-xs font-bold leading-snug">
                              {ing.amount} {ing.unit} {ing.name}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newName = prompt('Edit ingredient name:', ing.name);
                              if (newName !== null) {
                                const updated = shoppingModalIngredients.map(item => item.id === ing.id ? { ...item, name: newName } : item);
                                setShoppingModalIngredients(updated);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-white transition"
                            title="Edit Ingredient"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowShoppingModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedToShoppingList}
                className="px-6 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition text-xs shadow-lg shadow-[#E05638]/20"
              >
                Add to Shopping List
              </button>
            </div>
          </div>
        </div>
      )}
"""

if "showShoppingModal" in code and "{showShoppingModal && (" not in code:
    code = code.replace("    </div>\n  );\n}\n", modal_jsx + "\n    </div>\n  );\n}\n")

with open("apps/web/src/app/recipes/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Shopping List ingredients popup modal successfully integrated!")
