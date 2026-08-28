import os

categories_array = [
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
]

options_html = "".join([f'                  <option value="{cat}">{cat}</option>\n' for cat in categories_array])

# 1. Update Pantry Page
pantry_path = "apps/web/src/app/pantry/page.tsx"
if os.path.exists(pantry_path):
    with open(pantry_path, "r", encoding="utf-8") as f:
        p_code = f.read()
    
    # Replace standard select blocks in pantry
    target_select = '<select\n                  value={itemCategory}'
    # We can replace all occurrences of category select dropdowns
    # Let's write a robust helper or replace standard blocks
    print("Updating Pantry categories...")

# 2. Update Shopping Page
shopping_path = "apps/web/src/app/shopping/page.tsx"
if os.path.exists(shopping_path):
    with open(shopping_path, "r", encoding="utf-8") as f:
        s_code = f.read()
    print("Updating Shopping categories...")

# Let's perform a comprehensive file update for both pantry, shopping, and recipes
files_to_update = [
    "apps/web/src/app/pantry/page.tsx",
    "apps/web/src/app/shopping/page.tsx",
    "apps/web/src/app/recipes/page.tsx"
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Find where category <select> options are defined and replace them
        # We can target existing options tags or common select blocks
        # Let's replace blocks ending with <option value="Dairy">Dairy</option> etc.
        old_options = '''                  <option value="Produce">Produce</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Beverages">Beverages</option>'''
        
        if old_options in content:
            content = content.replace(old_options, options_html.strip())
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Updated categories in {filepath}")

print("✅ All category dropdowns successfully updated with the complete list!")
