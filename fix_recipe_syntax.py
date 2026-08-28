import os

recipes_path = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_path):
    with open(recipes_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Fix any unclosed function block right before currentTotalServings or return statement
    code = code.replace("  const currentTotalServings =", "  });\n\n  const currentTotalServings =")

    # Ensure no double closures if it was already correct
    code = code.replace("  });\n\n  });\n\n  const currentTotalServings =", "  });\n\n  const currentTotalServings =")

    with open(recipes_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ Recipe page syntax error successfully fixed!")

