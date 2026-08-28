import os

full_options_jsx = """
                  <option value="Produce">Produce</option>
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
                  <option value="Miscellaneous">Miscellaneous</option>
"""

target_files = [
    "apps/web/src/app/pantry/page.tsx",
    "apps/web/src/app/shopping/page.tsx",
    "apps/web/src/app/recipes/page.tsx"
]

for filepath in target_files:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        
        # Replace existing category select inner options with full options
        # We look for common select blocks
        if "<select" in code and "Produce" in code:
            # Let's replace any block of options inside select elements
            # Or we can write a clean replacement if we find standard options strings
            # Let's inspect/replace known partial option blocks
            parts = code.split('<select')
            new_parts = [parts[0]]
            for part in parts[1:]:
                if 'value={itemCategory}' in part or 'value={editingItem.category}' in part or 'value={ing.category}' in part or 'value={newItemCategory}' in part or 'value={item.category}' in part:
                    # Find closing select index
                    closing_idx = part.find('</select>')
                    if closing_idx != -1:
                        select_tag_end = part.indexOf('>') if hasattr(part, 'indexOf') else part.find('>')
                        # Rebuild select inner content
                        prefix = part[:select_tag_end + 1]
                        suffix = part[closing_idx:]
                        new_part = prefix + full_options_jsx + '\n                ' + suffix
                        new_parts.append(new_part)
                    else:
                        new_parts.append(part)
                else:
                    new_parts.append(part)
            
            code = '<select'.join(new_parts)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(code)
            print(f"✅ Updated category dropdowns in {filepath}")

print("✨ All category dropdowns updated successfully!")
