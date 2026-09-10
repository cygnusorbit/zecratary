import os
import re

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

# 1. Add Key to lucide-react imports if missing
lucide_pattern = r"(import\s*\{[^}]*?)(\}\s*from\s*['\"]lucide-react['\"];?)"
match = re.search(lucide_pattern, content, re.DOTALL)
if match:
    imports_inner = match.group(1)
    tokens = set(re.findall(r'\b[A-Za-z0-9_]+\b', imports_inner))
    if 'Key' not in tokens:
        updated_import = imports_inner.rstrip() + ",\n  Key\n" + match.group(2)
        content = content[:match.start()] + updated_import + content[match.end():]

# 2. Inject the Social Setting link under Admin Access
if '"/admin/social-settings"' not in content:
    needle = 'href="/admin/ai-settings"'
    if needle in content:
        # Find the closing </Link> for ai-settings
        idx = content.find(needle)
        close_idx = content.find("</Link>", idx)
        if close_idx != -1:
            insert_pos = close_idx + len("</Link>")
            
            link_chunk = """
                <Link href="/admin/social-settings" className={navClass('/admin/social-settings')} title="Social Setting">
                  <Key className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  {!showCollapsed && <span className="truncate whitespace-nowrap">Social Setting</span>}
                </Link>"""
            
            content = content[:insert_pos] + link_chunk + content[insert_pos:]

with open(sidebar_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✓ Installed Step 2: Added 'Social Setting' to Admin Sidebar in {sidebar_path}")
