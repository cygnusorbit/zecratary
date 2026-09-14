import os
import glob
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
    matches = glob.glob('**/components/Sidebar.tsx', recursive=True)
    if matches:
        sidebar_path = matches[0]

if not sidebar_path:
    print("❌ Error: Could not locate Sidebar.tsx")
    exit(1)

with open(sidebar_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Deduplicate / clean up the isImageIcon helper
helper_regex = r'(?:const\s+isImageIcon\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*(?::\s*[^=]+)?\s*=>\s*\{[\s\S]*?\n\};?\s*|const\s+isImageIcon\s*=\s*\([^)]*\)\s*=>\s*[^;]+;\s*)'
content = re.sub(helper_regex, '', content)

clean_helper = """const isImageIcon = (icon?: unknown): icon is string =>
  typeof icon === 'string' && (
    icon.startsWith('/') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('data:image')
  );\n\n"""

# Inject clean helper right before the component export
match_export = re.search(r'export\s+(?:default\s+)?function\s+Sidebar', content)
if match_export:
    content = content[:match_export.start()] + clean_helper + content[match_export.start():]
else:
    content = clean_helper + content

# 3. Collapse duplicate/nested {isImageIcon(...) ... : {isImageIcon(...) ...}} expressions into a single valid JSX expression
nested_pattern = re.compile(
    r'\{isImageIcon\((\w+)\)[^:]*?:\s*\{isImageIcon\(\1\)[^:]*?:\s*(<span[^>]*>\{\1\}<\/span>)\s*\}\s*\}',
    re.DOTALL
)

content = nested_pattern.sub(
    r'{isImageIcon(\1) ? <img src={\1} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : \2}',
    content
)

# 4. Catch any other nested ternary variations in the JSX for displayIcon / siteIcon
malformed_pattern = re.compile(
    r'\{isImageIcon\((\w+)\)\s*\?\s*<img[^>]*\/>\s*:\s*\{[^}]*<img[^>]*\/>\s*:\s*(<span[^>]*>\{\1\}<\/span>)\s*\}\}',
    re.DOTALL
)
content = malformed_pattern.sub(
    r'{isImageIcon(\1) ? <img src={\1} alt="Logo" className="w-7 h-7 object-contain rounded shrink-0" /> : \2}',
    content
)

# 5. Fix double curly brackets if any remain around isImageIcon
content = content.replace(
    ': {{isImageIcon(displayIcon)',
    ': isImageIcon(displayIcon)'
)

with open(sidebar_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✓ Successfully fixed JSX syntax error in: {sidebar_path}")
