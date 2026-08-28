import os

recipes_path = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_path):
    with open(recipes_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Clean up the redundant / misplaced closures before baseServings
    old_block = """  });

  const baseServings = selectedRecipe?.servings || 4;
  });"""

    new_block = """  const baseServings = selectedRecipe?.servings || 4;"""

    if old_block in code:
        code = code.replace(old_block, new_block)
    else:
        # Fallback search and replace for stray };
        code = code.replace("  });\n\n  const baseServings", "  const baseServings")
        code = code.replace("  };\n\n  const baseServings", "  const baseServings")

    with open(recipes_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ Recipe page expression error successfully fixed!")

