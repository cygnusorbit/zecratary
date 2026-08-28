import os
import re

files_to_update = [
    "apps/web/src/components/Sidebar.tsx",
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/ClientLayout.tsx"
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Update Dashboard Link href to "/"
        content = re.sub(
            r'(<Link\s+[^>]*href=["\'])(?:/recipes|/chef|/dashboard)(["\'][^>]*>\s*<[A-Za-z0-9]+\s+[^>]*/>\s*Dashboard\s*</Link>)',
            r'\1/\2',
            content,
            flags=re.IGNORECASE
        )

        # In case navItems array is used
        content = re.sub(
            r"(\{\s*label:\s*['\"]Dashboard['\"],\s*href:\s*['\"])[^'\"]+(['\"])",
            r"\1/\2",
            content
        )

        # Ensure active link highlighting correctly accounts for "/"
        if "pathname === '/'" not in content:
            content = content.replace(
                "const isActive = (path: string) => {",
                "const isActive = (path: string) => {\n    if (path === '/' && pathname === '/') return true;"
            )

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

print("✅ Dashboard menu link updated to http://localhost:3000/ (href='/')!")
