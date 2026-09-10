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

# Locate lucide-react import block
lucide_pattern = r"(import\s*\{[^}]*?)(\}\s*from\s*['\"]lucide-react['\"];?)"
match = re.search(lucide_pattern, content, re.DOTALL)

if match:
    imports_inner = match.group(1)
    tokens = set(re.findall(r'\b[A-Za-z0-9_]+\b', imports_inner))
    if 'Key' not in tokens:
        updated_import = imports_inner.rstrip() + ",\n  Key " + match.group(2)
        content = content[:match.start()] + updated_import + content[match.end():]
        with open(sidebar_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Added Key to lucide-react import in {sidebar_path}")
    else:
        print(f"Key is already present in lucide-react import in {sidebar_path}")
else:
    # Prepend import if no match was found
    content = "import { Key } from 'lucide-react';\n" + content
    with open(sidebar_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Prepended Key import to {sidebar_path}")
