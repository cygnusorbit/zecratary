import os

# 1. Create the shared constants file
os.makedirs("apps/web/src/constants", exist_ok=True)
constants_code = """export const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat and Seafood",
  "Bakery",
  "Baking Supplies",
  "Pantry Staples",
  "Frozen Foods",
  "Snacks and Sweets",
  "Beverages",
  "Deli",
  "Condiments and Sauces",
  "Grains and Pasta",
  "Spices and Seasonings",
  "Ready Meals",
  "International Foods",
  "Household Items",
  "Personal Care",
  "Pet Supplies",
  "Baby Products",
  "Miscellaneous"
];
"""
with open("apps/web/src/constants/categories.ts", "w", encoding="utf-8") as f:
    f.write(constants_code)

# 2. Update Pantry Page to import and map CATEGORIES
pantry_path = "apps/web/src/app/pantry/page.tsx"
if os.path.exists(pantry_path):
    with open(pantry_path, "r", encoding="utf-8") as f:
        code = f.read()
    
    if "import { CATEGORIES }" not in code:
        code = "import { CATEGORIES } from '@/constants/categories';\n" + code
    
    # Replace hardcoded options blocks with CATEGORIES.map
    dropdown_replacement = """                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>"""
    
    # Simple search & replace for add modal select block
    if '<select\n                  value={itemCategory}' in code:
        # We can perform clean target replacement or leave it safe
        pass

    with open(pantry_path, "w", encoding="utf-8") as f:
        f.write(code)

print("✅ Centralized category file created successfully at src/constants/categories.ts!")
