import os
import re

# 1. Clean next.config.js / next.config.mjs from redirecting /recipes to /saved
config_files = [
    "apps/web/next.config.js",
    "apps/web/next.config.mjs",
    "next.config.js",
    "next.config.mjs"
]

for cfg_path in config_files:
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg_content = f.read()

        # Remove redirect blocks mapping /recipes -> /saved
        cleaned = re.sub(
            r'\{\s*source:\s*[\'"]/recipes[\'"],\s*destination:\s*[\'"]/saved[\'"],\s*permanent:\s*(?:true|false),?\s*\},?',
            '',
            cfg_content,
            flags=re.DOTALL
        )

        with open(cfg_path, "w", encoding="utf-8") as f:
            f.write(cleaned)
        print(f"✅ Cleaned redirect rules from {cfg_path}")

# 2. Update navigation in Layout and Sidebar components to link directly to /recipes
nav_components = [
    "apps/web/src/components/Sidebar.tsx",
    "apps/web/src/app/ClientLayout.tsx",
    "apps/web/src/app/layout.tsx"
]

for nav_path in nav_components:
    if os.path.exists(nav_path):
        with open(nav_path, "r", encoding="utf-8") as f:
            nav_content = f.read()

        # Ensure link href for Recipes points strictly to /recipes
        nav_content = re.sub(
            r'(<Link\s+[^>]*href=["\'])/saved(["\'])',
            r'\1/recipes\2',
            nav_content
        )
        nav_content = re.sub(
            r"href:\s*['\"]/saved['\"]",
            "href: '/recipes'",
            nav_content
        )

        with open(nav_path, "w", encoding="utf-8") as f:
            f.write(nav_content)
        print(f"✅ Ensured direct /recipes navigation in {nav_path}")

# 3. Clean apps/web/src/app/recipes/page.tsx from any internal router redirect to /saved
recipes_page = "apps/web/src/app/recipes/page.tsx"
if os.path.exists(recipes_page):
    with open(recipes_page, "r", encoding="utf-8") as f:
        r_content = f.read()

    r_content = r_content.replace("redirect('/saved')", "// stay on /recipes")
    r_content = r_content.replace('redirect("/saved")', '// stay on /recipes')
    r_content = r_content.replace("router.push('/saved')", "router.push('/recipes')")
    r_content = r_content.replace('router.push("/saved")', 'router.push("/recipes")')

    with open(recipes_page, "w", encoding="utf-8") as f:
        f.write(r_content)
    print("✅ Verified apps/web/src/app/recipes/page.tsx remains strictly on /recipes")

print("\n🚀 Done! The Recipes menu link now opens http://localhost:3000/recipes directly with no redirect.")
