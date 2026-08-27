import os
import re

recipes_path = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_path):
    with open(recipes_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Ensure CATEGORIES is imported at the top
    if "import { CATEGORIES }" not in code:
        code = "import { CATEGORIES } from '@/constants/categories';\n" + code

    # Target any hardcoded <select> option lists inside recipe ingredient blocks and replace them with {CATEGORIES.map(...)}
    # We use a pattern to find select elements handling ingredient categories in the recipe modal
    pattern = r'(<select[\s\S]*?value=\{ing\.category[\s\S]*?>)([\s\S]*?)(</select>)'
    
    replacement = r'\1\n                            {CATEGORIES.map((cat) => (\n                              <option key={cat} value={cat}>{cat}</option>\n                            ))}\n                          \3'
    
    code = re.sub(pattern, replacement, code)

    with open(recipes_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ Recipe page successfully forced to use CATEGORIES mapping!")

