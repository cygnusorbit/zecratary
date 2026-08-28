import os

# 1. Update Pantry Page
pantry_path = "apps/web/src/app/pantry/page.tsx"
if os.path.exists(pantry_path):
    with open(pantry_path, "r", encoding="utf-8") as f:
        code = f.read()
    
    if "import { CATEGORIES }" not in code:
        code = "import { CATEGORIES } from '@/constants/categories';\n" + code
    
    # Replace hardcoded options in Add/Edit modals with CATEGORIES.map
    old_options_block = """                  <option value="Produce">Produce</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Baking Supplies">Baking Supplies</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Frozen Foods">Frozen Foods</option>
                  <option value="Snacks and Sweets">Snacks and Sweets</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Deli">Deli</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Spices and Seasonings">Spices and Seasonings</option>
                  <option value="Ready Meals">Ready Meals</option>
                  <option value="International Foods">International Foods</option>
                  <option value="Household Items">Household Items</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Pet Supplies">Pet Supplies</option>
                  <option value="Baby Products">Baby Products</option>
                  <option value="Miscellaneous">Miscellaneous</option>"""

    new_map_block = """{CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}"""

    if old_options_block in code:
        code = code.replace(old_options_block, new_map_block)
        with open(pantry_path, "w", encoding="utf-8") as f:
            f.write(code)
        print("✅ Pantry page updated to use CATEGORIES mapping!")

# 2. Update Shopping Page
shopping_path = "apps/web/src/app/shopping/page.tsx"
if os.path.exists(shopping_path):
    with open(shopping_path, "r", encoding="utf-8") as f:
        s_code = f.read()
    
    if "import { CATEGORIES }" not in s_code:
        s_code = "import { CATEGORIES } from '@/constants/categories';\n" + s_code

    if old_options_block in s_code:
        s_code = s_code.replace(old_options_block, new_map_block)
        with open(shopping_path, "w", encoding="utf-8") as f:
            f.write(s_code)
        print("✅ Shopping List page updated to use CATEGORIES mapping!")

print("✨ All pages successfully mapped to the centralized category list!")
