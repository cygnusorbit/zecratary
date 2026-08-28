import os

target_files = [
    "apps/web/src/app/pantry/page.tsx",
    "apps/web/src/app/shopping/page.tsx"
]

for filepath in target_files:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        
        # Remove any misplaced use client strings
        code = code.replace("'use client';", "")
        code = code.replace('"use client";', "")
        
        # Prepend 'use client'; cleanly at the very top
        clean_code = "'use client';\n" + code.strip()
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(clean_code)
        print(f"✅ Fixed 'use client' directive order in {filepath}")

