import os
import re

files_to_check = [
    "apps/web/src/components/Sidebar.tsx",
    "apps/web/src/app/ClientLayout.tsx",
    "apps/web/src/app/layout.tsx"
]

for file_path in files_to_check:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace multi-span brand name
        content = re.sub(
            r'<span[^>]*>Foodie</span>\s*<span[^>]*>Prep</span>',
            r'<span className="text-white">Zecratary</span>',
            content,
            flags=re.IGNORECASE
        )

        # Replace single text brand name
        content = re.sub(
            r'FoodiePrep|FoodPrep',
            r'Zecratary',
            content,
            flags=re.IGNORECASE
        )

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

print("✅ Sidebar top brand name successfully changed to Zecratary!")
