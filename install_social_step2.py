import os
import re

# 1. Locate Sidebar.tsx
candidates = [
    'apps/web/src/components/Sidebar.tsx',
    'src/components/Sidebar.tsx',
    'apps/web/components/Sidebar.tsx',
    'components/Sidebar.tsx'
]
sidebar_path = next((p for p in candidates if os.path.exists(p)), None)

if not sidebar_path:
    print("❌ Error: Could not locate Sidebar.tsx")
    exit(1)

with open(sidebar_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Ensure Key icon is imported from lucide-react
lucide_match = re.search(r"(import\s*\{[^}]*?)(\}\s*from\s*['\"]lucide-react['\"];?)", content, re.DOTALL)
if lucide_match:
    imports_block = lucide_match.group(1)
    tokens = set(re.findall(r'\b[A-Za-z0-9_]+\b', imports_block))
    if 'Key' not in tokens:
        updated_imports = imports_block.rstrip() + ",\n  Key\n" + lucide_match.group(2)
        content = content[:lucide_match.start()] + updated_imports + content[lucide_match.end():]

# 3. Inject Social Login link into Admin Access navigation
link_target = '/admin/social-login-setting'

if link_target not in content:
    nav_item = f"""
                <Link 
                  href="{link_target}" 
                  className={{navClass('{link_target}')}} 
                  title="Social Login"
                >
                  <Key className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {{!showCollapsed && <span className="truncate whitespace-nowrap">Social Login</span>}}
                </Link>"""

    # Look for common anchor points in the Admin section
    anchors = [
        'href="/admin/payment"',
        'href="/admin/ai-settings"',
        'href="/admin/users"',
        'href="/admin"'
    ]

    injected = False
    for anchor in anchors:
        if anchor in content:
            idx = content.find(anchor)
            close_tag = "</Link>"
            close_idx = content.find(close_tag, idx)
            if close_idx != -1:
                insert_pos = close_idx + len(close_tag)
                content = content[:insert_pos] + nav_item + content[insert_pos:]
                injected = True
                break

    if not injected:
        print("⚠ Notice: Could not locate default anchor in Admin section. Appending to nav block.")
        nav_close = "</nav>"
        idx = content.rfind(nav_close)
        if idx != -1:
            content = content[:idx] + nav_item + "\n              " + content[idx:]
            injected = True

    with open(sidebar_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Successfully updated Sidebar at: {sidebar_path}")
else:
    print(f"✓ Sidebar already contains {link_target}")

print("Step 2 completed successfully!")
