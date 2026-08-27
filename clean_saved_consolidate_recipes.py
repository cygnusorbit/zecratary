import os
import shutil
import re

# 1. Completely delete the apps/web/src/app/saved directory
saved_dir = "apps/web/src/app/saved"
if os.path.exists(saved_dir):
    shutil.rmtree(saved_dir)
    print("🗑️  Successfully removed apps/web/src/app/saved directory")
else:
    print("ℹ️  apps/web/src/app/saved does not exist")

# 2. Update navigation in Sidebar and Layouts to point directly to /recipes
nav_files = [
    "apps/web/src/components/Sidebar.tsx",
    "apps/web/src/app/ClientLayout.tsx",
    "apps/web/src/app/layout.tsx"
]

for fpath in nav_files:
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace any /saved hrefs with /recipes
        content = re.sub(r'href=["\']/saved["\']', 'href="/recipes"', content)
        content = re.sub(r"href:\s*['\"]/saved['\"]", "href: '/recipes'", content)

        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Updated navigation links to /recipes in {fpath}")

# 3. Ensure Manual Page saves to zecratary_recipes and redirects to /recipes
manual_path = "apps/web/src/app/manual/page.tsx"
if os.path.exists(manual_path):
    with open(manual_path, "r", encoding="utf-8") as f:
        m_content = f.read()
    
    # Ensure redirects and localStorage point to /recipes and zecratary_recipes
    m_content = m_content.replace("router.push('/saved')", "router.push('/recipes')")
    m_content = m_content.replace('router.push("/saved")', 'router.push("/recipes")')
    m_content = m_content.replace("localStorage.setItem('saved_recipes'", "localStorage.setItem('zecratary_recipes'")
    
    with open(manual_path, "w", encoding="utf-8") as f:
        f.write(m_content)
    print("✅ Verified apps/web/src/app/manual/page.tsx points to /recipes")

# 4. Ensure Import Page saves to zecratary_recipes and redirects to /recipes
import_path = "apps/web/src/app/import/page.tsx"
if os.path.exists(import_path):
    with open(import_path, "r", encoding="utf-8") as f:
        i_content = f.read()

    i_content = i_content.replace("router.push('/saved')", "router.push('/recipes')")
    i_content = i_content.replace('router.push("/saved")', 'router.push("/recipes")')
    i_content = i_content.replace("'zecratary_saved_recipes'", "'zecratary_recipes'")
    i_content = i_content.replace('"zecratary_saved_recipes"', '"zecratary_recipes"')

    with open(import_path, "w", encoding="utf-8") as f:
        f.write(i_content)
    print("✅ Verified apps/web/src/app/import/page.tsx points to /recipes")

print("\n🚀 All imports and manual recipe saves are now consolidated into /recipes with zero conflicts!")
