import os

with open("apps/web/src/app/layout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add metadata export if not already present
metadata_code = """
export const metadata = {
  title: 'FoodiePrep - AI Culinary Assistant & Meal Planner',
  description: 'Organize recipes, manage pantry inventory, and plan meals with AI.',
};
"""

if "export const metadata" not in content:
    content = metadata_code + content
    with open("apps/web/src/app/layout.tsx", "w", encoding="utf-8") as f:
        f.write(content)

print("✅ Page title and description successfully added to root layout!")
