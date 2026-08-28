import os

recipes_path = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_path):
    with open(recipes_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Replace the hardcoded option block specifically found in the recipe builder / creator modal
    old_builder_block = """                          <select
                            value={ing.category || 'Pantry Staples'}
                            onChange={(e) => {
                              const updated = [...recipeIngredients];
                              updated[idx].category = e.target.value;
                              setRecipeIngredients(updated);
                            }}
                            className="bg-[#0B101D] border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none cursor-pointer"
                          >
                            <option value="Pantry Staples">Pantry Staples</option>
                            <option value="Produce">Produce</option>
                            <option value="Meat and Seafood">Meat and Seafood</option>
                            <option value="Dairy">Dairy</option>
                            <option value="Grains and Pasta">Grains and Pasta</option>
                            <option value="Condiments & Sauces">Condiments & Sauces</option>
                          </select>"""

    new_builder_block = """                          <select
                            value={ing.category || 'Pantry Staples'}
                            onChange={(e) => {
                              const updated = [...recipeIngredients];
                              updated[idx].category = e.target.value;
                              setRecipeIngredients(updated);
                            }}
                            className="bg-[#0B101D] border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none cursor-pointer"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>"""

    if old_builder_block in code:
        code = code.replace(old_builder_block, new_builder_block)
        with open(recipes_path, "w", encoding="utf-8") as f:
            f.write(code)
        print("✅ Recipe builder dropdown successfully mapped to CATEGORIES!")
    else:
        # Fallback search for any select mapping recipeIngredients categories
        print("⚠️ Exact builder block not found, performing regex replacement...")
        import re
        code = re.sub(
            r'(setRecipeIngredients\(updated\);\s*\}\);\s*className="[^"]+"\s*>\s*)([\s\S]*?)(</select>)',
            r'\1{CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}\3',
            code
        )
        with open(recipes_path, "w", encoding="utf-8") as f:
            f.write(code)
        print("✅ Recipe builder dropdown updated via fallback pattern!")

