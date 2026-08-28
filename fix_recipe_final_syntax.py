import os

recipes_path = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_path):
    with open(recipes_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Ensure there is a closing brace for the main function component before return statement if missing
    # Let's inspect around currentTotalServings and place a closing brace before return if needed
    code = code.replace("  const currentTotalServings =", "    });\n\n  const currentTotalServings =")
    
    # Clean up any potential double brace issues
    code = code.replace("    });\n\n    });", "    });")

    with open(recipes_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ Recipe page syntax successfully normalized!")

