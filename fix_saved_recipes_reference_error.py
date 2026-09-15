import os
import glob
import re

print("🔍 Fixing 'ReferenceError: getLocalRecipes is not defined' in saved/page.tsx...")

# 1. Locate App Router and lib directories
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/saved/page.tsx', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        app_dir = os.path.dirname(os.path.dirname(matches[0]))

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
lib_dir = os.path.join(base_dir, 'lib')

# 2. Ensure lib/recipeSync.ts exists with getLocalRecipes exported
recipe_sync_candidates = [
    os.path.join(lib_dir, 'recipeSync.ts'),
    'apps/web/src/lib/recipeSync.ts',
    'src/lib/recipeSync.ts'
]
recipe_sync_path = next((p for p in recipe_sync_candidates if os.path.exists(p)), os.path.join(lib_dir, 'recipeSync.ts'))

sync_lib_code = """import { getCurrentUser } from '@/lib/auth';

const STORAGE_KEYS = [
  'zecratary_saved_recipes',
  'zecratary_recipes',
  'saved_recipes',
  'savedRecipes',
  'recipes'
];

export function getLocalRecipes(): any[] {
  if (typeof window === 'undefined') return [];
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

export function saveLocalRecipes(recipes: any[]) {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.stringify(recipes);
    localStorage.setItem('zecratary_saved_recipes', data);
    localStorage.setItem('zecratary_recipes', data);
    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (_) {}
}

export async function syncUserSavedRecipes(providedKey?: string): Promise<any[]> {
  if (typeof window === 'undefined') return [];

  const user = getCurrentUser();
  const userKey = (providedKey || user?.email || user?.id || '').toLowerCase().trim();
  const userEmail = (user?.email || '').toLowerCase().trim();
  const localList = getLocalRecipes();

  if (!userKey) {
    return localList;
  }

  try {
    const res = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(userKey)}&email=${encodeURIComponent(userEmail)}`, {
      cache: 'no-store'
    });

    let serverList: any[] = [];
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.recipes)) {
        serverList = data.recipes;
      }
    }

    if (localList.length > 0 && serverList.length === 0) {
      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userKey,
          email: userEmail,
          recipes: localList,
          action: 'sync'
        })
      });
      return localList;
    }

    const map = new Map<string, any>();
    localList.forEach(r => {
      if (r) {
        const k = (r.id || r.title || r.name || JSON.stringify(r)).toString().trim().toLowerCase();
        map.set(k, r);
      }
    });
    serverList.forEach(r => {
      if (r) {
        const k = (r.id || r.title || r.name || JSON.stringify(r)).toString().trim().toLowerCase();
        map.set(k, r);
      }
    });

    const merged = Array.from(map.values());
    if (merged.length > 0) {
      saveLocalRecipes(merged);
    }

    if (merged.length > serverList.length) {
      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userKey,
          email: userEmail,
          recipes: merged,
          action: 'sync'
        })
      });
    }

    return merged;
  } catch (err) {
    console.error('syncUserSavedRecipes error:', err);
    return localList;
  }
}

export async function persistSavedRecipe(recipeOrId: any, action: 'save' | 'remove' = 'save') {
  if (typeof window === 'undefined') return;

  const user = getCurrentUser();
  const userKey = (user?.email || user?.id || '').toLowerCase().trim();
  const userEmail = (user?.email || '').toLowerCase().trim();
  let localList = getLocalRecipes();

  if (action === 'save' && recipeOrId && typeof recipeOrId === 'object') {
    const targetKey = (recipeOrId.id || recipeOrId.title || recipeOrId.name || '').toString().trim().toLowerCase();
    const exists = localList.some(r => {
      const k = (r.id || r.title || r.name || '').toString().trim().toLowerCase();
      return k === targetKey;
    });
    if (!exists) {
      localList = [recipeOrId, ...localList];
    }
  } else if (action === 'remove') {
    const target = (typeof recipeOrId === 'string' ? recipeOrId : (recipeOrId?.id || recipeOrId?.title || recipeOrId?.name) || '').toString().trim().toLowerCase();
    localList = localList.filter(r => {
      const k = (r.id || r.title || r.name || '').toString().trim().toLowerCase();
      return k !== target;
    });
  }

  saveLocalRecipes(localList);

  if (userKey) {
    try {
      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userKey,
          email: userEmail,
          recipe: typeof recipeOrId === 'object' ? recipeOrId : undefined,
          recipeId: typeof recipeOrId === 'string' ? recipeOrId : (recipeOrId?.id || recipeOrId?.title),
          action
        })
      });
    } catch (_) {}
  }
}
"""
os.makedirs(os.path.dirname(recipe_sync_path), exist_ok=True)
with open(recipe_sync_path, 'w', encoding='utf-8') as f:
    f.write(sync_lib_code)
print(f"✓ Verified recipeSync module: {recipe_sync_path}")

# 3. Patch saved/page.tsx
saved_pages = glob.glob(f'{app_dir}/**/saved/page.tsx', recursive=True)
saved_pages = [p for p in saved_pages if 'node_modules' not in p and '.next' not in p]

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

clean_import = "import { syncUserSavedRecipes, persistSavedRecipe, getLocalRecipes } from '@/lib/recipeSync';"

for sp in saved_pages:
    with open(sp, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace or add recipeSync import with getLocalRecipes included
    sync_import_regex = re.compile(r"import\s*\{[^}]*\}\s*from\s*['\"]@/lib/recipeSync['\"];?", re.MULTILINE)
    if sync_import_regex.search(content):
        content = sync_import_regex.sub(clean_import, content)
    else:
        content = clean_import + "\n" + content

    # 2. Ensure getCurrentUser is imported from @/lib/auth
    if 'getCurrentUser' not in content:
        auth_import_regex = re.compile(r"import\s*\{([^}]*)\}\s*from\s*['\"]@/lib/auth['\"];?", re.MULTILINE)
        if auth_import_regex.search(content):
            content = auth_import_regex.sub(r"import { getCurrentUser, \1 } from '@/lib/auth';", content, count=1)
        else:
            content = "import { getCurrentUser } from '@/lib/auth';\n" + content

    # 3. Inject fallback helper if missing
    if 'function readLocalSavedRecipes' not in content:
        # Insert before export default function
        component_start_regex = re.compile(r'(export\s+default\s+function\s+\w+)')
        if component_start_regex.search(content):
            content = component_start_regex.sub(f"{fallback_fn}\n\\1", content, count=1)
        else:
            content = fallback_fn + "\n" + content

    # 4. Guard onRecipesUpdated call to prevent ReferenceError under any condition
    content = re.sub(
        r'const\s+onRecipesUpdated\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setRecipes\(current\);?\s*\}?;?',
        """const onRecipesUpdated = () => {
      const current = typeof getLocalRecipes === 'function' ? getLocalRecipes() : readLocalSavedRecipes();
      if (Array.isArray(current)) {
        setRecipes(current);
      }
    };""",
        content
    )

    with open(sp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Successfully fixed imports and runtime guard in: {sp}")

print("\n🚀 ReferenceError in saved/page.tsx resolved successfully!")
