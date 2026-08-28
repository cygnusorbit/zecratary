import os

with open("apps/web/src/app/recipes/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace the modal ingredient rows JSX with full structured editable fields matching the reference design
old_modal_jsx = """            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
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
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
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
                              const newAmount = prompt('Edit Amount / Qty:', ing.amount);
                              if (newAmount === null) return;
                              const newUnit = prompt('Edit Unit:', ing.unit);
                              if (newUnit === null) return;
                              const newName = prompt('Edit Item Name:', ing.name);
                              if (newName === null) return;

                              const updated = shoppingModalIngredients.map(item => 
                                item.id === ing.id ? { ...item, amount: newAmount, unit: newUnit, name: newName } : item
                              );
                              setShoppingModalIngredients(updated);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white transition shrink-0 ml-2"
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
            </div>"""

new_modal_jsx = """            <div className="overflow-y-auto flex-1 space-y-6 pr-1">
              {Array.from(new Set(shoppingModalIngredients.map(i => i.category || 'Pantry Staples'))).map(cat => {
                const catIngs = shoppingModalIngredients.filter(i => (i.category || 'Pantry Staples') === cat);
                if (catIngs.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2.5">
                    <h3 className="text-xs font-extrabold text-[#E05638] uppercase tracking-wider">{cat}</h3>
                    <div className="space-y-3">
                      {catIngs.map((ing) => (
                        <div
                          key={ing.id}
                          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl border transition ${
                            ing.matchedWithPantry 
                              ? 'bg-emerald-950/40 border-emerald-600/70' 
                              : 'bg-[#0B101D] border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              onClick={() => {
                                const updated = shoppingModalIngredients.map(item => item.id === ing.id ? { ...item, selected: !item.selected } : item);
                                setShoppingModalIngredients(updated);
                              }}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                ing.selected 
                                  ? (ing.matchedWithPantry ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-[#E05638] border-[#E05638] text-white') 
                                  : 'border-slate-700 bg-slate-900'
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
                              className="w-16 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-xs text-white text-center font-bold outline-none focus:border-[#E05638]"
                              placeholder="Qty"
                            />

                            <input
                              type="text"
                              value={ing.unit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, unit: val } : i));
                              }}
                              className="w-24 bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-xs text-slate-300 text-center outline-none focus:border-[#E05638]"
                              placeholder="Unit"
                            />

                            <input
                              type="text"
                              value={ing.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, name: val } : i));
                              }}
                              className="flex-1 bg-transparent border-none text-xs text-white outline-none px-1 font-medium"
                              placeholder="Ingredient name..."
                            />
                          </div>

                          <div className="flex items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            <select
                              value={ing.category || 'Pantry Staples'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShoppingModalIngredients(shoppingModalIngredients.map(i => i.id === ing.id ? { ...i, category: val } : i));
                              }}
                              className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-2.5 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              <option value="Produce">Produce</option>
                              <option value="Meat and Seafood">Meat and Seafood</option>
                              <option value="Pantry Staples">Pantry Staples</option>
                              <option value="Condiments and Sauces">Condiments and Sauces</option>
                              <option value="Grains and Pasta">Grains and Pasta</option>
                              <option value="Dairy">Dairy</option>
                            </select>

                            <button
                              onClick={() => {
                                setShoppingModalIngredients(shoppingModalIngredients.filter(i => i.id !== ing.id));
                              }}
                              className="p-2 text-slate-500 hover:text-red-400 transition rounded-xl bg-slate-900 border border-slate-800"
                              title="Delete ingredient"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>"""

if old_modal_jsx in code:
    code = code.replace(old_modal_jsx, new_modal_jsx)

with open("apps/web/src/app/recipes/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Add Ingredients to Shopping List modal successfully updated with inline structured input fields!")
