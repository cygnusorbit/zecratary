import os

sidebar_paths = [
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx'
]
sidebar_path = next((sp for sp in sidebar_paths if os.path.exists(sp)), None)

if not sidebar_path:
    print("❌ Error: Could not locate Sidebar.tsx")
    exit(1)

with open(sidebar_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = "if (pathname === '/login' || pathname === '/register') {"
new_block = "if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {"

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(sidebar_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Hid sidebar for /forgot-password in {sidebar_path}")
elif new_block in content:
    print("✓ Sidebar is already hidden for /forgot-password")
else:
    print("⚠ Could not locate the exact routing block. It may have been modified.")

