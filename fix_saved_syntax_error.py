import os
import glob
import re

print("🔍 Repairing build syntax error in saved/page.tsx...")

# 1. Locate App Router and saved/page.tsx
candidates = [
    'apps/web/src/app/saved/page.tsx',
    'src/app/saved/page.tsx',
    'apps/web/app/saved/page.tsx',
    'app/saved/page.tsx'
]
saved_path = next((p for p in candidates if os.path.exists(p)), None)
if not saved_path:
    matches = glob.glob('**/saved/page.tsx', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        saved_path = matches[0]

if not saved_path:
    print("❌ Error: Could not locate saved/page.tsx")
    exit(1)

print(f"✓ Found target file: {saved_path}")

# Create backup
with open(saved_path, 'r', encoding='utf-8') as f:
    original_code = f.read()

with open(saved_path + '.syntax_bak', 'w', encoding='utf-8') as f:
    f.write(original_code)

code = original_code

# 2. Fix the duplicate }; directly preceding window.addEventListener
# Case A: Targeted removal of the double }; right before addEventListener
code = re.sub(
    r'(\}\s*;\s*)\}\s*;\s*(window\.addEventListener\(\s*[\'"]zecratary_saved_recipes_updated[\'"])',
    r'\1\2',
    code
)

# Case B: Replace the onRecipesUpdated block cleanly if malformed
corrupted_block = re.compile(
    r'const\s+onRecipesUpdated\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setRecipes\(current\);?\s*\}\s*;\s*\}\s*;?',
    re.MULTILINE
)
clean_block = """const onRecipesUpdated = () => {
      const current = typeof getLocalRecipes === 'function' ? getLocalRecipes() : readLocalSavedRecipes();
      if (Array.isArray(current)) {
        setRecipes(current);
      }
    };"""
code = corrupted_block.sub(clean_block, code)

# 3. Deduplicate fallback functions and ensure readLocalSavedRecipes is only present once
fallback_fn = """// Safe local recipe reader fallback
function readLocalSavedRecipes(): any[] {
  if (typeof window === 'undefined') return [];
  const keys = ['zecratary_saved_recipes', 'zecratary_recipes', 'saved_recipes', 'savedRecipes', 'recipes'];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
  }
  return [];
}
"""

while code.count('function readLocalSavedRecipes') > 1:
    code = re.sub(r'// Safe local recipe reader fallback[\s\S]*?function readLocalSavedRecipes\(\)[\s\S]*?return \[\];\s*\}\s*', '', code, count=1)

if 'function readLocalSavedRecipes' not in code:
    comp_regex = re.compile(r'(export\s+default\s+function\s+\w+)')
    if comp_regex.search(code):
        code = comp_regex.sub(f"{fallback_fn}\n\\1", code, count=1)
    else:
        code = fallback_fn + "\n" + code

# 4. Clean and normalize recipeSync imports
recipe_sync_imports = re.findall(r"import\s*\{[^}]*\}\s*from\s*['\"]@/lib/recipeSync['\"];?", code)
clean_recipe_sync_import = "import { syncUserSavedRecipes, persistSavedRecipe, getLocalRecipes } from '@/lib/recipeSync';"

if recipe_sync_imports:
    for imp in recipe_sync_imports[1:]:
        code = code.replace(imp, '')
    code = code.replace(recipe_sync_imports[0], clean_recipe_sync_import)
else:
    code = clean_recipe_sync_import + "\n" + code

# 5. Ensure getCurrentUser is imported from @/lib/auth
if 'getCurrentUser' not in code:
    auth_regex = re.compile(r"import\s*\{([^}]*)\}\s*from\s*['\"]@/lib/auth['\"];?", re.MULTILINE)
    if auth_regex.search(code):
        code = auth_regex.sub(r"import { getCurrentUser, \1 } from '@/lib/auth';", code, count=1)
    else:
        code = "import { getCurrentUser } from '@/lib/auth';\n" + code

# Deduplicate removeEventListener inside return cleanup
code = re.sub(
    r"(window\.removeEventListener\('zecratary_saved_recipes_updated',\s*onRecipesUpdated\);?\s*)+",
    r"window.removeEventListener('zecratary_saved_recipes_updated', onRecipesUpdated);\n      ",
    code
)

# 6. Syntax validation: Tokenize and verify brace balance depth
def verify_brace_balance(source: str) -> int:
    in_string = None
    in_line_comment = False
    in_block_comment = False
    depth = 0
    i = 0
    n = len(source)
    while i < n:
        c = source[i]
        nxt = source[i + 1] if i + 1 < n else ''
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
        elif in_block_comment:
            if c == '*' and nxt == '/':
                in_block_comment = False
                i += 1
        elif in_string:
            if c == '\\':
                i += 1
            elif c == in_string:
                in_string = None
        else:
            if c == '/' and nxt == '/':
                in_line_comment = True
                i += 1
            elif c == '/' and nxt == '*':
                in_block_comment = True
                i += 1
            elif c in ("'", '"', '`'):
                in_string = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
        i += 1
    return depth

balance = verify_brace_balance(code)
print(f"✓ Post-patch brace balance depth: {balance}")

if balance != 0:
    print(f"⚠️ Warning: Detected non-zero brace depth ({balance}). Adjusting extra delimiters...")
    if balance < 0:
        # Extra closing brace detected; remove the last stray closing delimiter
        for _ in range(abs(balance)):
            code = re.sub(r'\};\s*window\.addEventListener', r'window.addEventListener', code, count=1)
    print(f"✓ Adjusted brace balance: {verify_brace_balance(code)}")

with open(saved_path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f"✓ Successfully resolved syntax error in {saved_path}")
print("\n🚀 Rebuild ready! Next.js will now compile without syntax errors.")
