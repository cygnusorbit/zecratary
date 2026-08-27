import os

recipes_path = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_path):
    with open(recipes_path, "r", encoding="utf-8") as f:
        code = f.read()
    
    # Ensure 'use client'; is at the very top
    code = code.replace("'use client';", "").replace('"use client";', "")
    code = "'use client';\n" + code.strip()

    # Ensure CATEGORIES is imported
    if "import { CATEGORIES }" not in code:
        code = "import { CATEGORIES } from '@/constants/categories';\n" + code

    with open(recipes_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ Recipe page successfully updated with centralized categories!")

